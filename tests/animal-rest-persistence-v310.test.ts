import { expect,test } from 'vitest';
import { herdCareCamp } from './helpers/veterinary-v277.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { validAnimalRestTransport,validAnimalCarrierMotion } from '../src/sim/animal-rest-save.ts';
import { releaseAnimalRescue,syncCarriedAnimals } from '../src/sim/animal-rest-state.ts';
import { reconcileAnimalRescues } from '../src/sim/animal-rescue.ts';
import { reconcileAnimalRest } from '../src/sim/animal-rest.ts';
import { applyAnimalSpotMedical } from '../src/sim/animal-sleeping-spot.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health.ts';
import { startTravel } from '../src/sim/movement.ts';
import { travelEnd } from '../src/sim/travel-timing.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { validateScoutRegistry } from '../src/sim/caravan-save.ts';
import type { AnimalSpeciesId } from '../src/sim/animal-species.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

function prepared(species:AnimalSpeciesId='muffalo',phase:'approach'|'carry'='approach',medical=false){
  const f=herdCareCamp(species),w=f.world,a=w.wildlife!.animals[0]!,p=w.pawns[0]!;
  a.health!.bloodLoss=Math.round(BLOOD_UNIT*.7);reconcileAnimalHealth(w,a);
  p.x=a.x-1;p.z=a.z;p.path=[];p.motion=null;p.moveCooldown=0;p.state='moving';
  const spot={id:w.nextId++,kind:'animal-sleeping-spot' as const,x:p.x-3,z:p.z,orientation:0 as const,footprint:'standard' as const,...medical?{medical:true as const}:{}};
  w.structures.push(spot);if(!medical)a.domestic!.bedId=spot.id;
  p.animalRescue={animalId:a.id,spotId:spot.id,phase};if(phase==='carry')syncCarriedAnimals(w,p);
  return {w,a,p,spot};
}
type Fixture=ReturnType<typeof prepared>;
function historical220(w:World):World {
  // Modern fixture defaults include V316 kibble; old diets did not gain it.
  for(const policy of w.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!=='kibble');
  w.schemaVersion=220 as World['schemaVersion'];return w;
}
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function exact(w:World){
  expect(validateWorld(w)).toEqual([]);expect(validAnimalRestTransport(w,w.schemaVersion)).toBe(true);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const r=checkpoint(w);expect(r.status).toBe('applied');if(r.status==='applied')expect(r.world).toEqual(w);
}
function refused(f:Fixture){
  expect(validAnimalRestTransport(f.w,f.w.schemaVersion)).toBe(false);
  expect(checkpoint(f.w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(f.w))).toThrow();
}
function resting(f:Fixture){
  delete f.p.animalRescue;f.p.state='idle';f.a.x=f.spot.x;f.a.z=f.spot.z;
  f.a.animalRest={spotId:f.spot.id,phase:'sleep'};
}

test.each(['hare','deer','gazelle','muffalo','dromedary'] as const)('%s rescue approach, carry and actual rest preserve identity, medical record and RNG exactly',species=>{
  for(const phase of ['approach','carry'] as const){const f=prepared(species,phase),before=structuredClone(f.w);exact(f.w);expect(f.w).toEqual(before);}
  const f=prepared(species,'carry',true);resting(f);expect(f.a.state).toBe('downed');expect(f.a.domestic?.bedId).toBeUndefined();exact(f.w);
});

test('strict 220 migration changes only schema, without assigning places, moving patients or reseeding streams',()=>{
  const {w,a,p}=prepared();delete a.domestic!.bedId;delete p.animalRescue;w.structures=[];p.state='idle';
  historical220(w);const before=structuredClone(w);
  expect(deserializeWorld(JSON.stringify(w))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(before);
});

test('220 refuses all future animal-rest fields and spot kind before migration',()=>{
  for(const kind of ['bed','rest','rescue','spot','undefined-rest'] as const){
    const f=prepared();delete f.a.domestic!.bedId;delete f.p.animalRescue;f.w.structures=[];f.p.state='idle';historical220(f.w);
    if(kind==='bed')f.a.domestic!.bedId=f.w.nextId-1;
    if(kind==='rest')f.a.animalRest={spotId:f.w.nextId-1,phase:'sleep'};
    if(kind==='rescue')f.p.animalRescue={animalId:f.a.id,spotId:f.w.nextId-1,phase:'approach'};
    if(kind==='spot')f.w.structures.push(f.spot);
    if(kind==='undefined-rest')Object.assign(f.a,{animalRest:undefined});
    expect(validAnimalRestTransport(f.w,220)).toBe(false);expect(checkpoint(f.w).status).toBe('resync');
    if(kind!=='undefined-rest')expect(()=>deserializeWorld(JSON.stringify(f.w))).toThrow(/220/);
  }
});

test('rescue shape, destination and patient ownership are shared strict file/Decoder boundaries',()=>{
  const changes:((f:Fixture)=>void)[]=[
    f=>Object.assign(f.p.animalRescue!,{progress:0}),f=>{f.p.animalRescue!.phase='sleep' as never;},
    f=>{f.p.animalRescue!.animalId=f.w.nextId;},f=>{f.p.animalRescue!.spotId=f.w.nextId;},
    f=>{delete f.a.domestic;},f=>{f.a.domestic!.slaughter=true;},f=>{f.a.state='idle';},
    f=>{f.p.priorities.doctor=0;},f=>{f.p.draft={lastActiveTick:f.w.tick,target:null,queue:[]};},f=>{f.a.domestic!.bedId=f.w.nextId;},
    f=>{f.spot.medical=true;f.a.domestic!.care='none';delete f.a.domestic!.bedId;},
    f=>{f.p.path=[{x:1,z:1}];f.p.animalRescue!.phase='carry';syncCarriedAnimals(f.w,f.p);},
    f=>{f.p.animalRescue!.phase='carry';syncCarriedAnimals(f.w,f.p);f.a.path=[{x:1,z:1}];},
  ];
  for(const change of changes){const f=prepared();change(f);refused(f);}
});

test('one patient and one destination cannot be claimed by competing rescue, handling or bedside care owners',()=>{
  for(const kind of ['rescue','care','handling','spot'] as const){
    const f=prepared(),other=structuredClone(f.p);other.id=f.w.nextId++;delete other.animalRescue;
    if(kind==='rescue')other.animalRescue={...f.p.animalRescue!};
    if(kind==='care')other.animalCare={animalId:f.a.id,spot:{x:f.a.x+1,z:f.a.z},phase:'approach',progress:0};
    if(kind==='handling')other.animalHandling={animalId:f.a.id,kind:'slaughter',phase:'approach',sourcePileId:0,carryPileId:null,quantity:0,step:0,progress:0};
    if(kind==='spot'){const a=structuredClone(f.a);a.id=f.w.nextId++;a.domestic!.bedId=f.spot.id;f.w.wildlife!.animals.push(a);other.animalRescue={animalId:a.id,spotId:f.spot.id,phase:'approach'};}
    f.w.pawns.push(other);refused(f);
  }
});

test('normal assignments are distinct from occupation; rest requires real stationary position or route endpoint',()=>{
  const f=prepared();resting(f);exact(f.w);
  for(const change of [(g:Fixture)=>{g.a.x++;},(g:Fixture)=>{g.a.animalRest!.phase='travel';},(g:Fixture)=>{g.a.path=[{x:1,z:1}];},(g:Fixture)=>Object.assign(g.a.animalRest!,{future:true}),
    (g:Fixture)=>{g.spot.medical=true;},(g:Fixture)=>{g.a.domestic!.bedId=undefined;}] as const){const g=prepared();resting(g);change(g);refused(g);}
});

test('same-tick carrier edge and interruption preserve captured stagger/stuns, blood, assignment and random streams',()=>{
  const {w,a,p,spot}=prepared('deer','carry'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const initial=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(initial.status).toBe('applied');if(initial.status!=='applied')throw Error('Missing initial capture');
  const old=structuredClone(initial.world),blood=a.health!.bloodLoss,rng=w.rng;
  expect(startTravel(w,p,{x:p.x-1,z:p.z})).toBe(true);
  p.motion!.stagger=[{start:w.tick,end:w.tick+.5}];p.motion!.stuns=[{start:w.tick,end:w.tick+.2}];p.motion!.end=travelEnd(p.motion!);p.moveCooldown=p.motion!.end-w.tick;
  syncCarriedAnimals(w,p);expect(a.motion).toEqual(p.motion);expect(a.motion).not.toBe(p.motion);expect(a.motion!.stuns).not.toBe(p.motion!.stuns);exact(w);
  const middle=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(middle.status).toBe('applied');expect(initial.world).toEqual(old);
  const edge=structuredClone(a.motion);p.priorities.doctor=0;reconcileAnimalRescues(w);
  expect(p.animalRescue).toBeUndefined();expect(a.motion).toEqual(edge);expect(a.health!.bloodLoss).toBe(blood);expect(a.domestic!.bedId).toBe(spot.id);expect(w.rng).toBe(rng);exact(w);
  const last=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(last.status).toBe('applied');if(last.status==='applied')expect(last.world).toEqual(w);
});

test('divergent copied edge and concurrent cargo reject, while recovery after release retains the admitted human edge',()=>{
  const f=prepared('hare','carry');expect(startTravel(f.w,f.p,{x:f.p.x-1,z:f.p.z})).toBe(true);syncCarriedAnimals(f.w,f.p);
  const bad=structuredClone(f.w);bad.wildlife!.animals[0]!.motion!.end+=.1;refused({...f,w:bad});
  addMaterial(f.w,'wood',1,{type:'pawn',pawnId:f.p.id});refreshStock(f.w);refused(f);
  f.w.piles=f.w.piles.filter(i=>i.owner.type!=='pawn');refreshStock(f.w);releaseAnimalRescue(f.w,f.p);
  f.a.health!.bloodLoss=0;reconcileAnimalHealth(f.w,f.a);expect(f.a.state).toBe('idle');
  // The runtime waits for this inherited edge before its next decision.
  expect(validAnimalCarrierMotion(f.w,f.a,221)).toBe(true);exact(f.w);
});

test('same-tick normal/medical switch and marker removal clear bindings without health or PRNG mutation',()=>{
  const f=prepared('gazelle');resting(f);const before=structuredClone(f.a.health),rng=f.w.rng;
  expect(applyAnimalSpotMedical(f.w,{type:'animal-spot-medical',spotId:f.spot.id,enabled:true}).ok).toBe(true);
  expect(f.a.domestic!.bedId).toBeUndefined();expect(f.a.animalRest).toEqual({spotId:f.spot.id,phase:'sleep'});expect(f.a.state).toBe('downed');exact(f.w);
  f.w.structures=[];reconcileAnimalRest(f.w);expect(f.a.animalRest).toBeUndefined();expect(f.a.health).toEqual(before);expect(f.w.rng).toBe(rng);exact(f.w);
});

test('marker shape is strict but ground possessions including chunks remain legal independently of usage',()=>{
  const f=prepared();delete f.p.animalRescue;f.p.state='idle';delete f.a.domestic!.bedId;
  addMaterial(f.w,'wood',2,{type:'ground',x:f.spot.x,z:f.spot.z});refreshStock(f.w);exact(f.w);
  for(const change of [(g:Fixture)=>Object.assign(g.spot,{quality:'normal'}),(g:Fixture)=>Object.assign(g.spot,{medical:false}),
    (g:Fixture)=>Object.assign(g.spot,{orientation:1}),(g:Fixture)=>{g.w.tiles[g.spot.z*g.w.width+g.spot.x]!.terrain='water';}] as const){const g=prepared();change(g);refused(g);}
});

test('malformed direct rescue and medical-place commands are atomic',()=>{
  const witness=prepared();delete witness.p.animalRescue;witness.p.state='idle';
  expect(applyCommand(witness.w,{type:'order-animal-rescue',pawnId:witness.p.id,animalId:witness.a.id}).ok).toBe(true);
  const commands:((f:Fixture)=>unknown)[]=[
    f=>({type:'order-animal-rescue',pawnId:NaN,animalId:f.a.id}),
    f=>({type:'order-animal-rescue',pawnId:f.p.id,animalId:0}),
    f=>({type:'order-animal-rescue',pawnId:f.p.id,animalId:f.a.id,extra:true}),
    f=>({type:'animal-spot-medical',spotId:f.spot.id,enabled:'yes'}),
    f=>({type:'animal-spot-medical',spotId:Infinity,enabled:true}),
    f=>({type:'animal-spot-medical',spotId:f.spot.id,enabled:true,extra:0}),
  ];
  for(const command of commands){
    const f=prepared();delete f.p.animalRescue;f.p.state='idle';const before=structuredClone(f.w);
    expect(applyCommand(f.w,command(f) as never).ok).toBe(false);expect(f.w).toEqual(before);
  }
});

test('an off-map scout cannot retain even a well-shaped animal-rescue task hidden outside map pawns',()=>{
  const f=prepared(),task={...f.p.animalRescue!};delete f.p.animalRescue;
  f.p.x=0;f.p.state='idle';delete f.p.motion;f.p.path=[];f.p.moveCooldown=0;
  addMaterial(f.w,'food',2,{type:'inventory',pawnId:f.p.id},'survival-meal');
  const food=f.w.piles.find(i=>i.item==='survival-meal')!;
  f.w.piles=f.w.piles.filter(i=>i!==food);f.w.pawns=[];
  f.w.scout={phase:'travelling',pawn:f.p,items:[food],foodPileId:food.id,quantity:2,startedAt:f.w.tick,departedAt:f.w.tick,returnAt:f.w.tick+1500,consumed:0,entry:{x:0,z:f.p.z}};
  refreshStock(f.w);expect(validateScoutRegistry(f.w,221)).toEqual([]);
  f.p.animalRescue=task;
  expect(validateScoutRegistry(f.w,221)).toContain('Off-map scout retains a map task or duplicate owner.');
  expect(checkpoint(f.w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(f.w))).toThrow();
});
