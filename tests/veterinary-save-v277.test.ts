import {expect,test} from 'vitest';
import {domesticColony} from './scenarios/domestic-colony.ts';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validVeterinaryCareTransport,validateDomesticAnimals} from '../src/sim/domestic-save.ts';
import {veterinaryCareSpeciesAllowed} from '../src/sim/veterinary-rules.ts';
import {createMedicalRecord,addResolvedInjury} from '../src/sim/injury-state.ts';
import {addMaterial,refreshStock,reservedSource} from '../src/sim/materials.ts';
import {enableBiomeWildlife} from '../src/sim/wildlife.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {medicineClaims} from '../src/sim/medicine-logistics.ts';
import type {AnimalSpeciesId} from '../src/sim/animal-species.ts';
import {SCHEMA_VERSION,type Pawn,type World} from '../src/sim/types.ts';

function care(species:AnimalSpeciesId='deer',phase:'pickup'|'approach'|'treat'='pickup'){
  const w=domesticColony(),a=w.wildlife!.animals[1]!,doctor=w.pawns[0]!;
  delete w.wildlife;enableBiomeWildlife(w,'temperate-forest');w.wildlife!.animals=[a];
  a.species=species;a.sex='male';a.ageTicks=adultAgeTicks(species);a.state='sleeping';a.path=[];
  a.health={...createMedicalRecord(w.tick),body:species};
  addResolvedInjury(a.health,'left-front-leg','cut',900,()=>.999999);
  a.domestic={since:w.tick,care:'industrial',tameness:5,nextDecay:w.tick+45000,...(species==='muffalo'?{productFullness:0}:{})};
  w.piles=[];addMaterial(w,'medicine',3,{type:'ground',x:10,z:11},'medicine');refreshStock(w);
  const pile=w.piles[0]!;doctor.x=10;doctor.z=12;doctor.path=[];doctor.state=phase==='treat'?'working':'moving';
  doctor.animalCare={animalId:a.id,spot:{x:10,z:12},phase,progress:0,...(phase==='treat'?{duration:60}:{}),
    medicine:{item:'medicine',sourcePileId:pile.id,carryPileId:phase==='pickup'?null:pile.id,quantity:phase==='pickup'?1:3}};
  if(phase!=='pickup')pile.owner={type:'pawn',pawnId:doctor.id};
  return {w,a,doctor,pile};
}
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));

test.each(['hare','deer','gazelle','muffalo','dromedary'] as const)('%s care keeps its real anatomy, dose and identity through save and Decoder',species=>{
  const {w,a,doctor}=care(species);
  expect(validateWorld(w)).toEqual([]);expect(validVeterinaryCareTransport(w,212)).toBe(true);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);const view=checkpoint(w);
  expect(view.status).toBe('applied');if(view.status!=='applied')throw Error('Missing snapshot');
  expect(view.world.wildlife!.animals[0]!.health!.body).toBe(species);
  expect(view.world.pawns[0]!.animalCare).toEqual(doctor.animalCare);expect(view.world.wildlife!.animals[0]!.id).toBe(a.id);
});

test('211 migration is neutral and preserves historical hare intent and private RNG',()=>{
  const {w}=care('hare');w.schemaVersion=211 as World['schemaVersion'];const before=structuredClone(w);
  expect(validVeterinaryCareTransport(w,211)).toBe(true);
  expect(deserializeWorld(JSON.stringify(w))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(before);
  for(const species of ['deer','gazelle','muffalo','dromedary'] as const){
    const v=care(species).w;v.schemaVersion=211 as World['schemaVersion'];
    expect(validVeterinaryCareTransport(v,211)).toBe(false);expect(checkpoint(v).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(v))).toThrow();
  }
});

test('unowned patients, unsupported species and malformed domestic authority are refused',()=>{
  for(const mutate of [(v:ReturnType<typeof care>)=>{delete v.a.domestic;},
    (v:ReturnType<typeof care>)=>{v.a.domestic={} as never;},
    (v:ReturnType<typeof care>)=>{v.a.species='snow-hare';},
    (v:ReturnType<typeof care>)=>{v.a.species='red-fox';},
    (v:ReturnType<typeof care>)=>{v.doctor.animalCare!.animalId=v.w.nextId;}]){
    const v=care();mutate(v);expect(validVeterinaryCareTransport(v.w,212)).toBe(false);expect(checkpoint(v.w).status).toBe('resync');expect(validateWorld(v.w).length).toBeGreaterThan(0);
  }
  expect(veterinaryCareSpeciesAllowed('hare',106)).toBe(true);expect(veterinaryCareSpeciesAllowed('hare',105)).toBe(false);
});

test.each(['approach','treat'] as const)('%s checkpoint retains carried quantity and nested task independently',phase=>{
  const {w,doctor,pile}=care('muffalo',phase);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Missing snapshot');
  const retained=structuredClone(first.world);doctor.animalCare!.medicine!.quantity=2;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('resync');expect(first.world).toEqual(retained);
  pile.quantity=2;const repaired=decoder.adopt(structuredClone(encoder.encode(w,0,1,true)));
  expect(repaired.status).toBe('applied');expect(first.world).toEqual(retained);
});

test('medicine ownership, progress, source quantity and cargo conflicts share the same boundary',()=>{
  for(const mutate of [(v:ReturnType<typeof care>)=>{v.doctor.animalCare!.medicine!.quantity=4;},
    (v:ReturnType<typeof care>)=>{v.doctor.animalCare!.medicine!.carryPileId=v.pile.id;},
    (v:ReturnType<typeof care>)=>{v.doctor.animalCare!.progress=1;},
    (v:ReturnType<typeof care>)=>{v.doctor.interruptedCargo=true;},
    (v:ReturnType<typeof care>)=>{v.doctor.surgery={phase:'pickup'} as never;},
    (v:ReturnType<typeof care>)=>{v.doctor.animalCare!.spot.x=-1;},
    (v:ReturnType<typeof care>)=>{Object.assign(v.doctor.animalCare!,{unexpected:1});}]){
    const v=care();mutate(v);expect(validVeterinaryCareTransport(v.w,212)).toBe(false);expect(validateDomesticAnimals(v.w,212).length).toBeGreaterThan(0);expect(checkpoint(v.w).status).toBe('resync');
  }
  const v=care('deer','approach');addMaterial(v.w,'wood',1,{type:'pawn',pawnId:v.doctor.id},'wood');
  expect(validVeterinaryCareTransport(v.w,212)).toBe(false);expect(checkpoint(v.w).status).toBe('resync');
});

test('a second doctor or grouped leading reservation cannot borrow the patient',()=>{
  for(const leading of [false,true]){
    const {w,doctor,a}=care();const other:Pawn=structuredClone(doctor);other.id=w.nextId++;
    if(leading){delete other.animalCare;other.animalHandling={animalId:a.id,kind:'lead',markerId:w.nextId++,phase:'lead',sourcePileId:0,carryPileId:null,quantity:0,step:0,progress:0,ropees:[a.id]};}
    w.pawns.push(other);expect(validVeterinaryCareTransport(w,212)).toBe(false);expect(checkpoint(w).status).toBe('resync');
  }
});

test('shared medicine claims include amputation and implant sources, separately from total quantity',()=>{
  const {w,doctor,pile}=care();pile.quantity=25;
  for(let i=0;i<9;i++){
    const other:Pawn=structuredClone(doctor);other.id=w.nextId++;delete other.animalCare;
    other.surgery={phase:'pickup',medicine:{item:'medicine',sourcePileId:pile.id,carryPileId:null,quantity:1}} as never;w.pawns.push(other);
  }
  expect(medicineClaims(w,pile.id)).toBe(10);expect(reservedSource(w,pile.id)).toBe(10);expect(validVeterinaryCareTransport(w,212)).toBe(true);
  const implant:Pawn=structuredClone(doctor);implant.id=w.nextId++;delete implant.animalCare;
  implant.surgery={phase:'pickup',ingredients:[{pileId:pile.id,item:'medicine',quantity:2,stage:'source',cell:{x:9,z:12}}]} as never;w.pawns.push(implant);
  expect(medicineClaims(w,pile.id)).toBe(11);expect(reservedSource(w,pile.id)).toBe(12);expect(validVeterinaryCareTransport(w,212)).toBe(false);
});
