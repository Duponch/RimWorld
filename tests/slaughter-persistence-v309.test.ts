import { expect,test } from 'vitest';
import { herdCareCamp } from './helpers/veterinary-v277.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { validDomesticTasksTransport,validSlaughterTransport,validateDomesticAnimals } from '../src/sim/domestic-save.ts';
import { SLAUGHTER_WORK_TICKS,designateSlaughter,processSlaughter } from '../src/sim/animal-slaughter.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { advanceCorpses } from '../src/sim/corpses.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health.ts';
import { validateMedicalRecord } from '../src/sim/injury-validation.ts';
import { addResolvedInjury,assessMedical,createMedicalRecord,remainingPartHealth,medicalStatus } from '../src/sim/injury-state.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { reconcileDomesticWork } from '../src/sim/domestic-reconcile.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { jobDuration } from '../src/sim/farming.ts';
import { startTravel } from '../src/sim/movement.ts';
import type { AnimalSpeciesId } from '../src/sim/animal-species.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import { SCHEMA_VERSION,type Pawn,type World } from '../src/sim/types.ts';

function prepared(species:AnimalSpeciesId='muffalo',phase:'approach'|'interact'='approach') {
  const f=herdCareCamp(species),w=f.world,a=w.wildlife!.animals[0]!,p=w.pawns[0]!;
  p.priorities.handle=1;p.skills.animals={level:0,xp:0,dailyXp:0,passion:0};
  p.x=a.x-1;p.z=a.z;p.path=[];p.motion=null;p.moveCooldown=0;
  p.state=phase==='interact'?'working':'moving';a.domestic!.slaughter=true;
  p.animalHandling={animalId:a.id,kind:'slaughter',phase,sourcePileId:0,carryPileId:null,quantity:0,step:0,progress:0};
  return {w,a,p};
}
type Fixture=ReturnType<typeof prepared>;
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function refused(f:Fixture){
  expect(validSlaughterTransport(f.w,f.w.schemaVersion)).toBe(false);
  expect(validDomesticTasksTransport(f.w,f.w.schemaVersion)).toBe(false);
  expect(validateDomesticAnimals(f.w,f.w.schemaVersion).length).toBeGreaterThan(0);
  expect(checkpoint(f.w).status).toBe('resync');
  expect(()=>deserializeWorld(JSON.stringify(f.w))).toThrow();
}
const context=(w:World,p:Pawn):NeedContext=>({search:()=>null,move:()=>{},release:()=>releaseWork(w,p),event:message=>w.events.push({tick:w.tick,type:'need',message})});

test.each(['hare','deer','gazelle','muffalo','dromedary'] as const)('%s slaughter intent and approach preserve original owners, anatomy and RNG through file and Decoder',species=>{
  const {w,a,p}=prepared(species),frozen=structuredClone(w);
  expect(validateWorld(w)).toEqual([]);expect(validDomesticTasksTransport(w,w.schemaVersion)).toBe(true);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const result=checkpoint(w);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Missing slaughter checkpoint');
  expect(result.world).toEqual(w);expect(result.world.wildlife!.animals[0]!.id).toBe(a.id);
  expect(result.world.pawns[0]!.animalHandling).toEqual(p.animalHandling);expect(w).toEqual(frozen);
});

test('219 migration changes only the schema number, retaining jobs, herd, quantities, skills and random streams',()=>{
  const {w,a,p}=prepared();delete a.domestic!.slaughter;delete p.animalHandling;p.state='idle';
  w.schemaVersion=219 as World['schemaVersion'];const before=structuredClone(w),text=JSON.stringify(w);
  expect(validDomesticTasksTransport(w,219)).toBe(true);
  expect(deserializeWorld(text)).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(before);
});

test('219 rejects future designation and slaughter task before migration, even with an explicitly undefined future property',()=>{
  for(const owner of ['designation','task','undefined-designation'] as const){
    const f=prepared();f.w.schemaVersion=219 as World['schemaVersion'];
    if(owner!=='task'){delete f.p.animalHandling;f.p.state='idle';}
    if(owner==='task')delete f.a.domestic!.slaughter;
    if(owner==='undefined-designation')Object.assign(f.a.domestic!,{slaughter:undefined});
    expect(validSlaughterTransport(f.w,219)).toBe(false);expect(checkpoint(f.w).status).toBe('resync');
    if(owner!=='undefined-designation')expect(()=>deserializeWorld(JSON.stringify(f.w))).toThrow(/version 219/);
    // JSON omits undefined; the in-memory transport still refuses its future key.
  }
});

test('pending explicit designation has no handler or material reservation and remains optional',()=>{
  const {w,a,p}=prepared();delete p.animalHandling;p.state='idle';
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(checkpoint(w).status).toBe('applied');
  delete a.domestic!.slaughter;expect(validateWorld(w)).toEqual([]);expect(checkpoint(w).status).toBe('applied');
  for(const value of [false,null,1,'yes',undefined]){
    Object.assign(a.domestic!,{slaughter:value});expect(validSlaughterTransport(w,w.schemaVersion)).toBe(false);expect(checkpoint(w).status).toBe('resync');
  }
});

test('slaughter work shape has no food, ropes, equipment, fractional progress or completed pending interaction',()=>{
  const changes:((f:Fixture)=>void)[]=[
    f=>{Object.assign(f.p.animalHandling!,{markerId:f.w.nextId-1});},
    f=>{f.p.animalHandling!.sourcePileId=f.w.piles[0]!.id;},
    f=>{f.p.animalHandling!.carryPileId=f.w.piles[0]!.id;},
    f=>{f.p.animalHandling!.quantity=1;},f=>{f.p.animalHandling!.step=1;},
    f=>{f.p.animalHandling!.progress=.5;},f=>{f.p.animalHandling!.progress=1;},
    f=>{f.p.animalHandling!.phase='pickup';},f=>{f.p.animalHandling!.animalId=f.w.nextId;},
    f=>{delete f.a.domestic!.slaughter;},f=>{delete f.a.domestic;},
  ];
  for(const change of changes){const f=prepared();change(f);refused(f);}
  const completed=prepared('muffalo','interact');completed.p.animalHandling!.progress=SLAUGHTER_WORK_TICKS;refused(completed);
});

test('slaughter ownership cannot share the animal with a second handler, doctor, feeder, milk or shear task',()=>{
  for(const kind of ['slaughter','care','feed','lead','milk','shear'] as const){
    const f=prepared(),other=structuredClone(f.p);other.id=f.w.nextId++;delete other.animalHandling;
    if(kind==='care')other.animalCare={animalId:f.a.id,spot:{x:f.a.x+1,z:f.a.z},phase:'approach',progress:0};
    else if(kind==='feed')other.animalFeed={animalId:f.a.id,spot:{x:f.a.x+1,z:f.a.z},sourcePileId:1,carryPileId:null,quantity:1,phase:'pickup',progress:0};
    else other.animalHandling={...f.p.animalHandling!,kind};
    f.w.pawns.push(other);refused(f);
  }
});

test('handler admission requires Handling and violence, but no minimum Animals level; carried goods and other services conflict',()=>{
  const changes:((f:Fixture)=>void)[]=[
    f=>{f.p.priorities.handle=0;},f=>{f.p.background={childhood:'quiet-child'};},
    f=>{f.p.interruptedCargo=true;},f=>{f.p.research={deskId:1} as never;},
    f=>{f.p.orders.active='cook';},f=>{f.p.surgery={phase:'pickup'} as never;},
    f=>{addMaterial(f.w,'wood',1,{type:'pawn',pawnId:f.p.id},'wood');},
  ];
  for(const change of changes){const f=prepared();change(f);refused(f);}
  const f=prepared();expect(f.p.skills.animals!.level).toBe(0);expect(validSlaughterTransport(f.w,f.w.schemaVersion)).toBe(true);
});

test('interact requires stationary physical contact; a living downed animal remains a valid target',()=>{
  const f=prepared('muffalo','interact');expect(validateWorld(f.w)).toEqual([]);
  f.a.health!.bloodLoss=Math.round(BLOOD_UNIT*.65);reconcileAnimalHealth(f.w,f.a);expect(f.a.state).toBe('downed');
  expect(validateWorld(f.w)).toEqual([]);expect(deserializeWorld(serializeWorld(f.w))).toEqual(f.w);expect(checkpoint(f.w).status).toBe('applied');
  for(const change of [(f:Fixture)=>{f.p.x-=3;},(f:Fixture)=>{f.p.moveCooldown=1;},
    (f:Fixture)=>{f.p.state='moving';},(f:Fixture)=>{f.p.path=[{x:f.p.x-1,z:f.p.z}];},
    (f:Fixture)=>{f.a.state='dead';}]){const bad=prepared('muffalo','interact');change(bad);refused(bad);}
});

test('diagonal slaughter interaction requires a real open flank in both save and Decoder boundaries',()=>{
  const f=prepared('muffalo','interact');f.p.z=f.a.z-1;
  const wall=(x:number,z:number)=>({id:f.w.nextId++,kind:'wall' as const,x,z,orientation:0 as const,footprint:'standard' as const,material:'wood' as const});
  f.w.structures.push(wall(f.p.x,f.a.z));
  expect(validateWorld(f.w)).toEqual([]);expect(checkpoint(f.w).status).toBe('applied');
  f.w.structures.push(wall(f.a.x,f.p.z));refused(f);
});

test('a builder closing the last diagonal flank after the handler is reconciled before the end-of-tick snapshot',()=>{
  const {w,a,p}=prepared('muffalo','interact');p.z=a.z-1;p.animalHandling!.progress=5;
  a.health={...createMedicalRecord(w.tick),body:a.species};
  w.structures.push({id:w.nextId++,kind:'wall',x:p.x,z:a.z,orientation:0,footprint:'standard',material:'wood'});
  const builder=structuredClone(p);builder.id=w.nextId++;builder.name='Constructeur';delete builder.animalHandling;
  builder.x=a.x+1;builder.z=p.z;builder.priorities.handle=0;builder.priorities.doctor=0;builder.priorities.build=1;
  w.pawns.push(builder);expect(w.tick%2).toBe(0); // Handler first in this actual tick's actor rotation.
  expect(applyCommand(w,{type:'designate',kind:'wall',material:'wood',x:a.x,z:p.z}).ok).toBe(true);
  const job=w.jobs[0]!;job.construction='frame';addMaterial(w,'wood',5,{type:'job',jobId:job.id},'wood');
  job.progress=jobDuration(w,job)-1;job.workRemainder=9000;builder.jobId=job.id;job.reservedBy=builder.id;job.status='active';refreshStock(w);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),initial=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(initial.status).toBe('applied');if(initial.status!=='applied')throw Error('Initial corner checkpoint');
  const retained=structuredClone(initial.world),rng=w.rng,filth=structuredClone(w.filth);
  stepWorld(w);
  expect(w.jobs).not.toContain(job);expect(w.structures.some(s=>s.kind==='wall'&&s.x===a.x&&s.z===p.z)).toBe(true);
  expect(p.animalHandling).toMatchObject({kind:'slaughter',phase:'approach',progress:0});expect(a.domestic!.slaughter).toBe(true);
  expect(a.health!.death).toBeUndefined();expect(w.rng).toBe(rng);expect(w.filth).toEqual(filth);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const last=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(last.status).toBe('applied');
  if(last.status==='applied')expect(last.world).toEqual(w);expect(initial.world).toEqual(retained);
});

test('same-tick physical segment reconciliation retains intent and travel without blood, RNG or old Decoder view changes',()=>{
  const {w,a,p}=prepared('muffalo','interact');p.animalHandling!.progress=7;
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),initial=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(initial.status).toBe('applied');if(initial.status!=='applied')throw Error('Initial segment checkpoint');
  const retained=structuredClone(initial.world),tick=w.tick,rng=w.rng,filth=structuredClone(w.filth),animal=structuredClone(a);
  expect(startTravel(w,p,{x:p.x,z:p.z-1})).toBe(true);p.state='moving';
  const motion=structuredClone(p.motion),cooldown=p.moveCooldown;
  expect(validSlaughterTransport(w,w.schemaVersion)).toBe(false);
  reconcileDomesticWork(w);
  expect(p.animalHandling).toMatchObject({kind:'slaughter',phase:'approach',progress:0});expect(p.motion).toEqual(motion);expect(p.moveCooldown).toBe(cooldown);
  expect(a).toEqual(animal);expect(w.tick).toBe(tick);expect(w.rng).toBe(rng);expect(w.filth).toEqual(filth);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const last=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(last.status).toBe('applied');
  if(last.status==='applied')expect(last.world).toEqual(w);expect(initial.world).toEqual(retained);
});

test('same-tick progress and death/corpse replacement retain exact earlier snapshot views and original identity',()=>{
  const {w,a,p}=prepared('deer','interact'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Initial checkpoint');
  const frozen=structuredClone(first.world),tick=w.tick;p.animalHandling!.progress=SLAUGHTER_WORK_TICKS-1;
  const middle=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(middle.status).toBe('applied');expect(first.world).toEqual(frozen);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  processSlaughter(w,p,p.animalHandling! as Parameters<typeof processSlaughter>[2],context(w,p));advanceCorpses(w);refreshStock(w);
  expect(w.tick).toBe(tick);expect(p.animalHandling).toBeUndefined();expect(w.wildlife!.animals.some(other=>other.id===a.id)).toBe(false);
  expect(w.piles.find(pile=>pile.id===a.id)?.corpse?.animalId).toBe(a.id);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const last=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(last.status).toBe('applied');if(last.status==='applied')expect(last.world).toEqual(w);
  expect(first.world).toEqual(frozen);
});

test('same-tick cancellation clears only the explicit intent and handler, preserves the living animal and saves exactly',()=>{
  const {w,a,p}=prepared('hare','interact'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  p.animalHandling!.progress=3;const initial=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(initial.status).toBe('applied');if(initial.status!=='applied')throw Error('Initial checkpoint');
  const retained=structuredClone(initial.world),tick=w.tick,animal=structuredClone(a),rng=w.rng,goods=structuredClone(w.piles);
  expect(designateSlaughter(w,{type:'slaughter',animalId:a.id,enabled:false}).ok).toBe(true);
  expect(w.tick).toBe(tick);expect(w.rng).toBe(rng);expect(w.piles).toEqual(goods);
  delete animal.domestic!.slaughter;
  expect(p.animalHandling).toBeUndefined();expect(a).toEqual(animal);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const result=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
  expect(initial.world).toEqual(retained);
});

test('mobile animal execution requires the real terminal neck wound in 220 and is rejected as future in strict 219',()=>{
  const {w,a,p}=prepared('deer','interact');p.animalHandling!.progress=SLAUGHTER_WORK_TICKS-1;
  processSlaughter(w,p,p.animalHandling! as Parameters<typeof processSlaughter>[2],context(w,p));advanceCorpses(w);refreshStock(w);
  const corpse=w.piles.find(pile=>pile.id===a.id)!,record=corpse.corpse!.health;
  const medical=(value:unknown,version:number,animal=true)=>validateMedicalRecord(value,true,true,false,false,animal,true,true,true,true,true,true,version,false);
  expect(record.injuries.some(i=>i.kind==='execution-cut'&&i.part==='neck'&&i.bornAt===record.tick)).toBe(true);
  expect(medical(record,220)).toBeNull();expect(medical(record,219)).not.toBeNull();
  const past={...structuredClone(w),schemaVersion:219};expect(()=>deserializeWorld(JSON.stringify(past))).toThrow(/version 219/);
  const withoutWound=structuredClone(record);withoutWound.injuries=withoutWound.injuries.filter(i=>i.kind!=='execution-cut');
  expect(medical(withoutWound,220)).not.toBeNull();
  const wrongPart=structuredClone(record);wrongPart.injuries.find(i=>i.kind==='execution-cut')!.part='left-front-leg';expect(medical(wrongPart,220)).not.toBeNull();
  const earlier=structuredClone(record);earlier.injuries.find(i=>i.kind==='execution-cut')!.bornAt--;expect(medical(earlier,220)).not.toBeNull();
  const human=structuredClone(record);delete human.body;expect(medical(human,220,false)).not.toBeNull();
  expect(validateWorld(w)).toEqual([]);expect(checkpoint(w).status).toBe('applied');
});

test('one neck HP is already fatal for every owned species; the living two-HP hare retains its neck on slaughter',()=>{
  for(const species of ['hare','deer','gazelle','muffalo','dromedary'] as const){
    const record={...createMedicalRecord(3000),body:species};
    addResolvedInjury(record,'neck','bruise',remainingPartHealth(record,'neck')-1000,()=>.999999);
    expect(remainingPartHealth(record,'neck')).toBe(1000);
    expect(assessMedical(record).capacities.breathing).toBe(0);
    expect(record.death?.cause).toBe('vital-failure');expect(medicalStatus(record)).toBe('dead');
  }
  const {w,a,p}=prepared('hare','interact');
  a.health={...createMedicalRecord(w.tick),body:'hare'};
  addResolvedInjury(a.health,'neck','bruise',remainingPartHealth(a.health,'neck')-2000,()=>.999999);
  expect(remainingPartHealth(a.health,'neck')).toBe(2000);expect(medicalStatus(a.health)).toBe('mobile');
  expect(assessMedical(a.health).capacities.breathing).toBeGreaterThan(0);
  p.animalHandling!.progress=SLAUGHTER_WORK_TICKS-1;
  processSlaughter(w,p,p.animalHandling! as Parameters<typeof processSlaughter>[2],context(w,p));advanceCorpses(w);refreshStock(w);
  const corpse=w.piles.find(pile=>pile.id===a.id)!;
  expect(corpse.corpse!.health.injuries.find(i=>i.kind==='execution-cut')).toMatchObject({part:'neck',severity:1000});
  expect(remainingPartHealth(corpse.corpse!.health,'neck')).toBe(1000);
  expect(corpse.corpse!.health.death?.cause).toBe('vital-failure');
  expect(corpse.corpse!.health.missing).toEqual([]);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(checkpoint(w).status).toBe('applied');
});

test('refused same-tick slaughter delta retains decoder authority and accepts the unmodified valid packet',()=>{
  const {w,p}=prepared('deer','interact'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const initial=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(initial.status).toBe('applied');if(initial.status!=='applied')throw Error('Initial checkpoint');
  const retained=structuredClone(initial.world);p.animalHandling!.progress=2;
  const good=structuredClone(encoder.encode(w,0,1)),bad=structuredClone(good);bad.world.pawns[0]!.animalHandling!.quantity=1;
  expect(decoder.adopt(bad).status).toBe('resync');expect(initial.world).toEqual(retained);
  const repaired=decoder.adopt(good);expect(repaired.status).toBe('applied');if(repaired.status==='applied')expect(repaired.world).toEqual(w);
  expect(initial.world).toEqual(retained);
});
