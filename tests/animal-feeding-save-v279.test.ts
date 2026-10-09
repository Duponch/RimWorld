import {expect,test} from 'vitest';
import {domesticColony} from './scenarios/domestic-colony.ts';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validDomesticTasksTransport,validateDomesticAnimals} from '../src/sim/domestic-save.ts';
import {addResolvedInjury,createMedicalRecord} from '../src/sim/injury-state.ts';
import {addMaterial,refreshStock,reservedSource} from '../src/sim/materials.ts';
import {enableBiomeWildlife} from '../src/sim/wildlife.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import type {AnimalSpeciesId} from '../src/sim/animal-species.ts';
import {SCHEMA_VERSION,type Pawn,type World} from '../src/sim/types.ts';

function feeding(species:AnimalSpeciesId='deer',phase:'pickup'|'deliver'|'feed'='pickup'){
  const w=domesticColony(),a=w.wildlife!.animals[1]!,doctor=w.pawns[0]!;
  delete w.wildlife;enableBiomeWildlife(w,'temperate-forest');w.wildlife!.animals=[a];
  a.species=species;a.sex='male';a.ageTicks=adultAgeTicks(species);a.state='sleeping';a.path=[];a.food=.05;
  a.health={...createMedicalRecord(w.tick),body:species};
  addResolvedInjury(a.health,'left-front-leg','cut',900,()=>.999999);
  a.domestic={since:w.tick,care:'none',tameness:5,nextDecay:w.tick+45000,...(species==='muffalo'?{productFullness:0}:{})};
  w.piles=[];addMaterial(w,'food',2,{type:'ground',x:10,z:11},'berries');
  const pile=w.piles[0]!;doctor.x=10;doctor.z=12;doctor.path=[];doctor.state=phase==='feed'?'working':'moving';
  doctor.animalFeed={animalId:a.id,spot:{x:10,z:12},sourcePileId:pile.id,carryPileId:phase==='pickup'?null:pile.id,quantity:2,phase,progress:0};
  if(phase!=='pickup')pile.owner={type:'pawn',pawnId:doctor.id};
  refreshStock(w);return {w,a,doctor,pile};
}
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function refused(v:ReturnType<typeof feeding>){
  expect(validDomesticTasksTransport(v.w,v.w.schemaVersion)).toBe(false);
  expect(validateDomesticAnimals(v.w,v.w.schemaVersion).length).toBeGreaterThan(0);
  expect(checkpoint(v.w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(v.w))).toThrow();
}

test.each(['hare','deer','gazelle','muffalo','dromedary'] as const)('%s assisted feeding retains real food, anatomy and task through save and Decoder',species=>{
  const {w,a,doctor}=feeding(species);expect(validateWorld(w)).toEqual([]);
  expect(validDomesticTasksTransport(w,214)).toBe(true);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const result=checkpoint(w);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Missing snapshot');
  expect(result.world.pawns[0]!.animalFeed).toEqual(doctor.animalFeed);
  expect(result.world.wildlife!.animals[0]!.health!.body).toBe(species);expect(result.world.wildlife!.animals[0]!.id).toBe(a.id);
});

test.each(['deliver','feed'] as const)('%s has exactly one carried food owner and preserves retained snapshot views',phase=>{
  const {w,doctor,pile}=feeding('muffalo',phase);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Missing snapshot');const retained=structuredClone(first.world);
  doctor.animalFeed!.quantity=1;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('resync');expect(first.world).toEqual(retained);
  pile.quantity=1;refreshStock(w);
  const repaired=decoder.adopt(structuredClone(encoder.encode(w,0,1,true)));
  expect(repaired.status).toBe('applied');expect(first.world).toEqual(retained);
  if(repaired.status==='applied')expect(repaired.world.pawns[0]!.animalFeed!.quantity).toBe(1);
});

test('213 migration adds no animal feeding, health, food or RNG and rejects future tasks before migration',()=>{
  const historical=feeding();delete historical.doctor.animalFeed;historical.doctor.state='idle';historical.w.schemaVersion=213 as World['schemaVersion'];
  const before=structuredClone(historical.w);expect(deserializeWorld(JSON.stringify(historical.w))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(historical.w).toEqual(before);
  const future=feeding();future.w.schemaVersion=213 as World['schemaVersion'];refused(future);
  delete future.doctor.animalFeed;Object.assign(future.doctor,{animalFeed:undefined});expect(validDomesticTasksTransport(future.w,213)).toBe(false);
});

test('task fields, stage progress, item identity and pickup cargo have a strict shared boundary',()=>{
  for(const mutate of [(v:ReturnType<typeof feeding>)=>{Object.assign(v.doctor.animalFeed!,{duration:75});},
    (v:ReturnType<typeof feeding>)=>{v.doctor.animalFeed!.progress=.5;},
    (v:ReturnType<typeof feeding>)=>{v.doctor.animalFeed!.progress=1;},
    (v:ReturnType<typeof feeding>)=>{v.doctor.animalFeed!.progress=75;},
    (v:ReturnType<typeof feeding>)=>{v.doctor.animalFeed!.carryPileId=v.pile.id;},
    (v:ReturnType<typeof feeding>)=>{v.doctor.animalFeed!.quantity=3;},
    (v:ReturnType<typeof feeding>)=>{v.pile.kind='wood';v.pile.item='wood';},
    (v:ReturnType<typeof feeding>)=>{v.doctor.animalFeed!.sourcePileId=v.w.nextId;}]){const v=feeding();mutate(v);refused(v);}
  const held=feeding('deer','deliver');addMaterial(held.w,'wood',1,{type:'pawn',pawnId:held.doctor.id},'wood');refused(held);
});

test('food source claims are quantitative and shared with existing haul and human feeding',()=>{
  for(const competing of ['haul','feed'] as const){
    const v=feeding(),other:Pawn=structuredClone(v.doctor);other.id=v.w.nextId++;delete other.animalFeed;
    if(competing==='haul')other.haul={phase:'pickup',sourcePileId:v.pile.id,quantity:1} as never;
    else other.feed={patientId:v.doctor.id,spot:{x:10,z:12},sourcePileId:v.pile.id,carryPileId:null,quantity:1,phase:'pickup',progress:0};
    v.w.pawns.push(other);expect(reservedSource(v.w,v.pile.id)).toBe(3);refused(v);
  }
});

test('foreign wildlife, unsupported species and unowned animals cannot acquire the care mandate',()=>{
  for(const mutate of [(v:ReturnType<typeof feeding>)=>{delete v.a.domestic;},
    (v:ReturnType<typeof feeding>)=>{v.a.domestic={} as never;},
    (v:ReturnType<typeof feeding>)=>{v.a.species='snow-hare';},
    (v:ReturnType<typeof feeding>)=>{v.a.species='red-fox';},
    (v:ReturnType<typeof feeding>)=>{v.doctor.animalFeed!.animalId=v.w.nextId;}]){const v=feeding();mutate(v);refused(v);}
});

test('care, leading, milk, shear and another feeder cannot share the physical animal',()=>{
  for(const kind of ['care','lead','milk','shear','feed'] as const){
    const v=feeding('muffalo'),other:Pawn=structuredClone(v.doctor);other.id=v.w.nextId++;delete other.animalFeed;
    if(kind==='care')other.animalCare={animalId:v.a.id,spot:{x:12,z:12},phase:'approach',progress:0};
    else if(kind==='feed')other.animalFeed={...v.doctor.animalFeed!,spot:{x:12,z:12}};
    else other.animalHandling={animalId:v.a.id,kind,markerId:v.w.nextId++,phase:'approach',sourcePileId:0,carryPileId:null,quantity:0,step:0,progress:0} as never;
    v.w.pawns.push(other);refused(v);
  }
});

test('doctor mandate and feeding contact cannot borrow other services or movement',()=>{
  for(const mutate of [(v:ReturnType<typeof feeding>)=>{v.doctor.priorities.doctor=0;},
    (v:ReturnType<typeof feeding>)=>{v.doctor.interruptedCargo=true;},
    (v:ReturnType<typeof feeding>)=>{v.doctor.surgery={phase:'pickup'} as never;},
    (v:ReturnType<typeof feeding>)=>{v.doctor.orders.active='feed';},
    (v:ReturnType<typeof feeding>)=>{v.doctor.animalFeed!.spot={x:9,z:12};}]){const v=feeding();mutate(v);refused(v);}
  for(const mutate of [(v:ReturnType<typeof feeding>)=>{v.doctor.x--;},
    (v:ReturnType<typeof feeding>)=>{v.doctor.moveCooldown=1;},
    (v:ReturnType<typeof feeding>)=>{v.doctor.path=[{x:10,z:13}];},
    (v:ReturnType<typeof feeding>)=>{v.doctor.state='moving';}]){const v=feeding('deer','feed');mutate(v);refused(v);}
});

test('feed progress deltas retain every primitive and never alias an earlier view',()=>{
  const {w,doctor}=feeding('deer','feed'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Missing snapshot');
  const retained=structuredClone(first.world);doctor.animalFeed!.progress=37;
  const second=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(second.status).toBe('applied');expect(first.world).toEqual(retained);
  if(second.status==='applied')expect(second.world.pawns[0]!.animalFeed!.progress).toBe(37);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
