import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { validSpikeTrapBuildingShape,validSpikeTrapCommand,validSpikeTrapStateShape,validSpikeTrapTransport } from '../src/sim/spike-trap-save.ts';
import { startTravel } from '../src/sim/movement.ts';
import { validCapturedTravelDelay } from '../src/sim/captured-travel-delay.ts';
import { MAX_PAWN_DELAY_V87,MAX_PAWN_DELAY_V226,MIN_PAWN_SPEED_V87 } from '../src/sim/travel-validation.ts';
import { travelEnd } from '../src/sim/travel-timing.ts';
import { validatePawnRecordShape } from '../src/sim/pawn-record-save.ts';
import { refreshStock,addMaterial } from '../src/sim/materials.ts';
import { enableWildlife } from '../src/sim/wildlife.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { exitVisitor } from '../src/sim/visitors.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { fixtureMechanoid } from './scenarios/mechanoid-combat-v213.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';
import { medicalCamp } from './scenarios/health.ts';
import { SCHEMA_VERSION,type Structure,type World } from '../src/sim/types.ts';

function prepared(material:Structure['material']='wood'){
  const w=medicalCamp(2),p=w.pawns[0]!;
  const trap:Structure={id:w.nextId++,kind:'spike-trap',x:16,z:16,orientation:0,footprint:'standard',material,spikeTrap:{autoRebuild:false,touching:[]}};
  w.structures.push(trap);Object.assign(p,{x:trap.x,z:trap.z,state:'idle',path:[],motion:null,moveCooldown:0});
  return {w,p,trap};
}
function prepareWildlife(w:World){
  w.resources.push({id:w.nextId++,kind:'berries',x:10,z:10,amount:10,growth:1,growthTick:w.tick});enableWildlife(w,1);
}
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function exact(w:World){
  const before=structuredClone(w);expect(validSpikeTrapTransport(w,w.schemaVersion)).toBe(true);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);const result=checkpoint(w);expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
  expect(w).toEqual(before);
}
function refused(w:World,file=true){
  const before=structuredClone(w);expect(validSpikeTrapTransport(w,w.schemaVersion)).toBe(false);expect(checkpoint(w).status).toBe('resync');
  if(file)expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();expect(w).toEqual(before);
}

test.each(['wood','steel','granite-blocks','limestone-blocks','marble-blocks','sandstone-blocks','slate-blocks'] as const)('226 %s trap recharges exactly without redefaulting its switch or contacts',material=>{
  const f=prepared(material);f.trap.spikeTrap!.autoRebuild=true;f.trap.spikeTrap!.touching=[`pawn:${f.p.id}`];f.trap.damage=1;
  const rng=f.w.rng;exact(f.w);expect(f.w.rng).toBe(rng);expect(f.trap.spikeTrap!.autoRebuild).toBe(true);
});

test('pawn, animal and mech namespaces identify actual living map contacts',()=>{
  const {w,p,trap}=prepared();prepareWildlife(w);const a=w.wildlife!.animals[0]!,m=fixtureMechanoid(w,trap.x,trap.z);
  Object.assign(a,{x:trap.x,z:trap.z,path:[],state:'idle'});delete a.motion;delete a.meal;
  trap.spikeTrap!.touching=[`pawn:${p.id}`,`animal:${a.id}`,`mech:${m.id}`];exact(w);
  for(const value of [`animal:${p.id}`,`pawn:${a.id}`,`mech:${p.id}`,`pawn:${w.nextId}`,`pawn:0`,`pawn:0${p.id}`,`pawn:+${p.id}`,`pawn:${p.id}.0`,`future:${p.id}`]){
    trap.spikeTrap!.touching=[value as never];refused(w);
  }
});

test('an engaged edge retains physical source contact and refuses an anticipated destination',()=>{
  const f=prepared();f.trap.spikeTrap!.touching=[`pawn:${f.p.id}`];f.p.state='moving';f.p.draft={lastActiveTick:f.w.tick,target:null,queue:[]};
  expect(startTravel(f.w,f.p,{x:f.trap.x+1,z:f.trap.z})).toBe(true);expect(f.p.x).not.toBe(f.trap.x);exact(f.w);
  const entering=prepared();entering.p.x=entering.trap.x-1;entering.p.state='moving';entering.p.draft={lastActiveTick:entering.w.tick,target:null,queue:[]};
  expect(startTravel(entering.w,entering.p,entering.trap)).toBe(true);entering.trap.spikeTrap!.touching=[`pawn:${entering.p.id}`];refused(entering.w);
  entering.trap.spikeTrap!.touching=[];exact(entering.w);
});

test('captured known-trap delays preserve historical costs and admit only prospective exact sums',()=>{
  for(const base of [0,.1,.2,1.4,2,3,4.2,5]){
    const delay=base+4;expect(validCapturedTravelDelay(delay,226)).toBe(true);
    expect(validCapturedTravelDelay(delay,225)).toBe(delay===4.2);
  }
  for(const value of [0,4.01,4.3,5.5,6.1,7.1,8.3,9.1,NaN,Infinity,'4',null])expect(validCapturedTravelDelay(value,226)).toBe(false);
  expect(validCapturedTravelDelay(undefined,226)).toBe(true);
  expect(validCapturedTravelDelay(.1,88)).toBe(false);expect(validCapturedTravelDelay(.1,89)).toBe(true);
  expect(validCapturedTravelDelay(2,118)).toBe(false);expect(validCapturedTravelDelay(2,119)).toBe(true);
});

test('V226 slow diagonal and stun retain the paid trap surcharge without opening old cooldown bounds',()=>{
  const {w,p}=prepared();p.state='moving';p.draft={lastActiveTick:w.tick,target:null,queue:[]};
  p.motion={from:{x:p.x-1,z:p.z-1},to:{x:p.x,z:p.z},start:w.tick,end:0,speedFactor:MIN_PAWN_SPEED_V87,terrainDelay:9,stuns:[{start:w.tick,end:w.tick+4.5}]};
  p.motion.end=travelEnd(p.motion);p.moveCooldown=p.motion.end-w.tick;
  expect(p.moveCooldown).toBeGreaterThan(MAX_PAWN_DELAY_V87);expect(p.moveCooldown).toBeLessThanOrEqual(MAX_PAWN_DELAY_V226);exact(w);
  const shape=(version:number)=>validatePawnRecordShape(p as unknown as Record<string,unknown>,w,version);
  expect(shape(225)).toContain('Invalid pawn state.');
  for(const version of [225,226]){
    const limit=version===225?MAX_PAWN_DELAY_V87:MAX_PAWN_DELAY_V226;
    p.moveCooldown=limit;expect(shape(version)).not.toContain('Invalid pawn state.');
    p.moveCooldown=limit+.001;expect(shape(version)).toContain('Invalid pawn state.');
  }
});

test('contact guard excludes dead and carried patients without inventing a second presence',()=>{
  const {w,p,trap}=prepared(),carrier=w.pawns[1]!;trap.spikeTrap!.touching=[`pawn:${p.id}`];
  p.state='dead';expect(validSpikeTrapTransport(w)).toBe(false);p.state='idle';
  // Ownership query only: the separate rescue guard owns the clinical task.
  carrier.rescue={patientId:p.id,bedId:0,phase:'carry'};expect(validSpikeTrapTransport(w)).toBe(false);delete carrier.rescue;
  prepareWildlife(w);const animal=w.wildlife!.animals[0]!;Object.assign(animal,{x:trap.x,z:trap.z});delete animal.motion;
  trap.spikeTrap!.touching=[`animal:${animal.id}`];carrier.animalRescue={animalId:animal.id,spotId:0,phase:'carry'};
  const before=structuredClone(w);expect(validSpikeTrapTransport(w)).toBe(false);expect(w).toEqual(before);
});

test('same-tick contact and switch updates are deep exact in ordinary and sparse Decoder captures',()=>{
  for(const sparse of [false,true]){
    const f=prepared(),encoder=new SnapshotEncoder({structureDelta:sparse}),decoder=new SnapshotDecoder();
    const initial=decoder.adopt(structuredClone(encoder.encode(f.w,0,1)));expect(initial.status).toBe('applied');if(initial.status!=='applied')throw Error('Missing initial world');
    const retained=structuredClone(initial.world),rng=f.w.rng;
    f.trap.spikeTrap!.autoRebuild=true;f.trap.spikeTrap!.touching=[`pawn:${f.p.id}`];
    const update=decoder.adopt(structuredClone(encoder.encode(f.w,0,1)));expect(update.status).toBe('applied');if(update.status==='applied')expect(update.world).toEqual(f.w);
    expect(initial.world).toEqual(retained);expect(f.w.rng).toBe(rng);exact(f.w);
    f.trap.spikeTrap!.touching.push(`pawn:${f.p.id}`);expect(decoder.adopt(structuredClone(encoder.encode(f.w,0,1))).status).toBe('resync');
  }
});

test('packed ground and interrupted carrier preserve the same damaged object with no contacts',()=>{
  for(const carried of [false,true]){
    const {w,p,trap}=prepared('steel');trap.damage=7;trap.spikeTrap!.autoRebuild=true;w.structures=[];
    if(carried)p.interruptedCargo=true;
    w.packed=[{building:trap,owner:carried?{type:'pawn',pawnId:p.id}:{type:'ground',x:24,z:24}}];exact(w);
    trap.spikeTrap!.touching=[`pawn:${p.id}`];refused(w);trap.spikeTrap!.touching=[];
    delete trap.spikeTrap;refused(w);
  }
});

test('installation intent uses the unchanged packed ID and cannot rotate a trap',()=>{
  const {w,trap}=prepared();w.structures=[];w.packed=[{building:trap,owner:{type:'ground',x:24,z:24}}];
  expect(applyCommand(w,{type:'install',structureId:trap.id,x:20,z:20,orientation:0}).ok).toBe(true);exact(w);
  expect(w.jobs[0]!.furniture!.structureId).toBe(trap.id);w.jobs[0]!.orientation=1;refused(w);
});

test('exact state keys, material and building shape reject malformed and future presence',()=>{
  const changes:((f:ReturnType<typeof prepared>)=>void)[]=[
    f=>{delete f.trap.spikeTrap;},f=>Object.assign(f.trap,{spikeTrap:null}),f=>Object.assign(f.trap.spikeTrap!,{autoRebuild:1}),
    f=>Object.assign(f.trap.spikeTrap!,{extra:true}),f=>Object.assign(f.trap.spikeTrap!,{touching:[{kind:'pawn',id:f.p.id}]}),
    f=>{f.trap.spikeTrap!.touching=[`pawn:${f.p.id}`,`pawn:${f.p.id}`];},f=>{f.p.x++;f.trap.spikeTrap!.touching=[`pawn:${f.p.id}`];},
    f=>{delete f.trap.material;},f=>{f.trap.material='cloth';},f=>{f.trap.orientation=1;},f=>{f.trap.footprint='legacy-single';},
    f=>{f.trap.damage=40;},f=>{f.trap.quality='normal';},f=>{f.trap.power={} as never;},f=>{f.trap.medical=true;},
  ];
  for(const change of changes){const f=prepared();change(f);refused(f.w);}
  for(const field of ['spikeTrap','quality','art','fuel','bills','power','medical','prisoner']){const f=prepared();Object.assign(f.trap,{[field]:undefined});refused(f.w,false);}
  const sparse=new Array(1);Object.assign(sparse,{extra:'pawn:1'});expect(validSpikeTrapStateShape({autoRebuild:false,touching:sparse},226)).toBe(false);
});

test('construction and plain furniture never own trap state, including undefined',()=>{
  for(const where of ['structure','packed','blueprint','frame','descriptor'] as const){
    const w=medicalCamp(),bed=fixtureBuilding(w,'bed',16,16);
    let target:object=bed;
    if(where==='packed'){w.structures=[];w.packed=[{building:bed,owner:{type:'ground',x:24,z:24}}];}
    if(where==='blueprint'||where==='frame'){
      w.structures=[];expect(applyCommand(w,{type:'designate',kind:'spike-trap',x:16,z:16,material:'wood'}).ok).toBe(true);
      target=w.jobs[0]!;if(where==='frame')w.jobs[0]!.construction='frame';
    }
    if(where==='descriptor'){expect(applyCommand(w,{type:'install',structureId:bed.id,x:24,z:24,orientation:0}).ok).toBe(true);target=w.jobs[0]!.furniture!;}
    Object.assign(target,{spikeTrap:undefined});refused(w,false);Object.assign(target,{spikeTrap:{autoRebuild:false,touching:[]}});refused(w);
  }
});

test('225 migration changes only the schema and rejects prospective installed, packed and referenced traps',()=>{
  const w=medicalCamp(2);fixtureBuilding(w,'bed',17,16);w.schemaVersion=225 as World['schemaVersion'];const before=structuredClone(w);
  expect(deserializeWorld(JSON.stringify(w))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(before);
  for(const packed of [false,true]){const f=prepared();f.w.schemaVersion=225 as World['schemaVersion'];if(packed){f.w.structures=[];f.w.packed=[{building:f.trap,owner:{type:'ground',x:24,z:24}}];}refused(f.w);}
  for(const field of [undefined,{autoRebuild:false,touching:[]}]){Object.assign(w.structures[0]!,{spikeTrap:field});refused(w,field!==undefined);}
  for(const descriptor of ['furniture','deconstruction'] as const){
    const old=medicalCamp(),bed=fixtureBuilding(old,'bed',16,16);
    const result=applyCommand(old,descriptor==='furniture'?{type:'install',structureId:bed.id,x:24,z:24,orientation:0}:{type:'designate',kind:'deconstruct',x:16,z:16});expect(result.ok).toBe(true);
    old.jobs[0]![descriptor]!.kind='spike-trap';old.schemaVersion=225 as World['schemaVersion'];refused(old);
  }
});

test('historical genuine scout remains exact and cannot become a hidden building owner',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!;Object.assign(p,{x:0,z:3,state:'idle',path:[],moveCooldown:0});delete p.motion;
  addMaterial(w,'food',2,{type:'inventory',pawnId:p.id},'survival-meal');const food=w.piles.pop()!;w.pawns=w.pawns.filter(q=>q!==p);refreshStock(w);
  w.scout={phase:'travelling',pawn:p,items:[food],foodPileId:food.id,quantity:2,startedAt:w.tick,departedAt:w.tick,returnAt:w.tick+1500,consumed:0,entry:{x:0,z:3}};exact(w);
  const trap=prepared().trap;Object.assign(w.scout,{packed:[{building:trap,owner:{type:'inventory',pawnId:p.id}}]});
  expect(checkpoint(w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
});

test('frozen genuine visitor sculpture rejects prospective state without creating a second building domain',()=>{
  const {world:w,traderId}=visitorTradeFixture(),trader=w.pawns.find(p=>p.id===traderId)!;
  const sculpture:Structure={id:w.nextId++,kind:'small-sculpture',x:0,z:5,orientation:0,footprint:'standard',material:'wood',quality:'normal',art:{authorId:w.pawns[0]!.id,createdAt:w.tick}};
  w.packed.push({building:sculpture,owner:{type:'inventory',pawnId:traderId}});Object.assign(trader,{x:0,z:5,state:'idle',path:[],motion:null,moveCooldown:0});trader.visitor!.phase='leaving';trader.visitor!.goal=null;
  expect(exitVisitor(w,trader)).toBe(true);exact(w);const archived=w.visitors!.departed[0]!.packed!.find(p=>p.building.id===sculpture.id)!;
  Object.assign(archived.building,{spikeTrap:undefined});refused(w,false);Object.assign(archived.building,{spikeTrap:{autoRebuild:false,touching:[]}});refused(w);
  delete archived.building.spikeTrap;w.schemaVersion=225 as World['schemaVersion'];Object.assign(archived.building,{spikeTrap:{autoRebuild:false,touching:[]}});refused(w);
});

test('toggle command accepts only an exact positive ID and Boolean, and shape guard is pure',()=>{
  const f=prepared(),command={type:'spike-trap-auto-rebuild',structureId:f.trap.id,on:true};expect(validSpikeTrapCommand(command)).toBe(true);
  for(const bad of [{...command,extra:undefined},{...command,on:1},{...command,on:undefined},{...command,structureId:0},{...command,structureId:1.2},{...command,type:'flick'},null,[]])expect(validSpikeTrapCommand(bad)).toBe(false);
  const before=structuredClone(f.w);expect(validSpikeTrapBuildingShape(f.trap,226)).toBe(true);expect(validSpikeTrapBuildingShape(f.trap,225)).toBe(false);expect(f.w).toEqual(before);
});
