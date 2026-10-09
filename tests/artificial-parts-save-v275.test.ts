import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {installWoodenPart} from '../src/sim/artificial-parts.ts';
import {WOODEN_PARTS} from '../src/sim/artificial-parts-rules.ts';
import type {WoodenPartKind,WoodenPartSite} from '../src/sim/artificial-parts-types.ts';
import {validArtificialParts} from '../src/sim/artificial-parts-save.ts';
import {validArtificialPartTransport,validArtificialPartsWorldTransport} from '../src/sim/health-save.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {createMedicalRecord,addResolvedInjury} from '../src/sim/injury-state.ts';
import {administerAnesthetic} from '../src/sim/anesthetic.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {validSurgeryRequestShape,validSurgeryTaskShape,validateSurgeries} from '../src/sim/surgery-save.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age.ts';
import type {MedicalRecord} from '../src/sim/injury-types.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {medicalCamp} from './scenarios/health.ts';

const medical=(r:unknown,version=210)=>validateMedicalRecord(r,true,true,true,true,false,false,true,true,true,true,true,version,version>=127);
function installed(kind:WoodenPartKind='peg-leg',part:WoodenPartSite='left-leg'){
  const w=medicalCamp(),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);
  p.health.missing=[{part,bornAt:w.tick}];expect(installWoodenPart(p.health,part,kind)).toBe(true);
  reconcilePawnHealth(w,p);return w;
}
function operation(phase:'pickup'|'approach'|'placed'|'work'='pickup'){
  const w=medicalCamp(2),[d,p]=w.pawns;w.piles=[];
  Object.assign(d!,{x:8,z:9,state:'moving'});d!.priorities.doctor=1;d!.skills.medicine.level=8;
  p!.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  p!.health=createMedicalRecord(w.tick);p!.health.missing=[{part:'left-leg',bornAt:w.tick}];
  const bed=fixtureBuilding(w,'bed',8,10);Object.assign(bed,{medical:true});
  Object.assign(p!,{x:8,z:10,state:'resting',medicalCare:'best'});p!.priorities.patient=1;p!.priorities.bedrest=3;
  p!.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:8,z:10},medical:'patient'};
  p!.surgeryRequest={part:'left-leg',requestedAt:w.tick,implant:'peg-leg'};
  const wood=w.nextId++,medicine=w.nextId++;
  w.piles.push({id:wood,item:'wood',kind:'wood',quantity:1,owner:{type:'ground',x:6,z:6}},
    {id:medicine,item:'medicine',kind:'medicine',quantity:2,owner:{type:'ground',x:6,z:7}});
  d!.surgery={patientId:p!.id,part:'left-leg',bedId:bed.id,spot:{x:8,z:9},implant:'peg-leg',phase:'pickup',progress:0,workCore:0,
    ingredients:[{pileId:wood,item:'wood',quantity:1,stage:'source',cell:{x:7,z:9}},
      {pileId:medicine,item:'medicine',quantity:2,stage:'source',cell:{x:8,z:8}}]};
  if(phase==='approach'){
    d!.surgery.phase='approach';d!.surgery.ingredients![0]!.stage='held';w.piles[0]!.owner={type:'pawn',pawnId:d!.id};
  }
  if(phase==='placed'){
    d!.surgery.phase='approach';
    for(const i of d!.surgery.ingredients!){i.stage='placed';w.piles.find(p=>p.id===i.pileId)!.owner={type:'ground',...i.cell};}
  }
  if(phase==='work'){
    expect(administerAnesthetic(p!.health!,()=>.5)).toBe(true);reconcilePawnHealth(w,p!);
    w.piles=[];delete d!.surgery.ingredients;d!.surgery.phase='work';d!.surgery.consumedMedicine='medicine';
    d!.surgery.progress=8.8;d!.surgery.workCore=10;d!.state='working';
  }
  refreshStock(w);return w;
}

test('schema209 migration is neutral and adds no prosthesis, wound marker or surgical ingredient',()=>{
  const old=medicalCamp();old.schemaVersion=209 as World['schemaVersion'];const before=structuredClone(old);
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(old).toEqual(before);
});

test('all three wooden kinds and their six sites preserve their actual medical records on save/reload',()=>{
  for(const kind of Object.keys(WOODEN_PARTS) as WoodenPartKind[])for(const site of WOODEN_PARTS[kind].sites){
    const w=installed(kind,site),record=w.pawns[0]!.health!;
    expect(medical(record)).toBeNull();expect(validArtificialParts(record,210)).toBe(true);
    expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
    expect(medical(record,209)).not.toBeNull();
  }
});

test('strict anatomy refuses future, unknown, duplicate, overlapping and incomplete artificial roots',()=>{
  const record=installed().pawns[0]!.health!;
  const mutations:((r:MedicalRecord)=>void)[]=[
    r=>{r.artificialParts=[];},r=>{r.artificialParts![0]!.kind='unknown' as never;},
    r=>{r.artificialParts![0]!.kind='wooden-hand';},r=>{r.artificialParts![0]!.installedAt++;},
    r=>{r.artificialParts!.push({...r.artificialParts![0]!});},
    r=>{r.artificialParts!.push(r.artificialParts![0]!);},
    r=>{r.artificialParts!.push({part:'left-foot',kind:'wooden-foot',installedAt:r.tick});},
    r=>{r.missing.pop();},r=>{r.missing[0]!.bornAt--;},
    r=>{r.missing.push({part:'left-leg',bornAt:r.tick,nonFresh:true});},
    r=>{Object.assign(r.artificialParts![0]!,{extra:true});},
    r=>{r.injuries.push({id:r.nextInjuryId++,part:'left-leg',kind:'cut',severity:1,bornAt:r.tick,scar:{threshold:1}});},
    r=>{r.injuries.push({id:r.nextInjuryId++,part:'left-leg',kind:'cut',severity:1,bornAt:r.tick,infection:undefined});},
  ];
  for(const mutate of mutations){const bad=structuredClone(record);mutate(bad);expect(()=>medical(bad)).not.toThrow();expect(medical(bad)).not.toBeNull();}
  expect(medical({...record,artificialParts:undefined})).not.toBeNull();
  expect(medical({...record,body:'hare'})).not.toBeNull();
});

test('nonFresh is confined to synthetic children or a destroyed wooden site and never admits tending',()=>{
  const record=installed().pawns[0]!.health!;
  for(const mutate of [(r:MedicalRecord)=>{r.missing[0]!.nonFresh=false as never;},
    (r:MedicalRecord)=>{r.missing[0]!.tended=true;},
    (r:MedicalRecord)=>{r.missing.push({part:'right-thumb',bornAt:r.tick,nonFresh:true});}]){
    const bad=structuredClone(record);mutate(bad);expect(medical(bad)).not.toBeNull();
  }
  addResolvedInjury(record,'left-leg','cut',100000,()=>.99);
  expect(record.artificialParts).toBeUndefined();expect(record.missing).toContainEqual({part:'left-leg',bornAt:record.tick,nonFresh:true});
  expect(medical(record)).toBeNull();expect(medical(record,209)).not.toBeNull();
});

test('surgical shapes enforce new kinds/sites, same-item double dose, ownership stages and recipe work bounds',()=>{
  const w=operation(),t=w.pawns[0]!.surgery!,request=w.pawns[1]!.surgeryRequest!;
  expect(validSurgeryRequestShape(request,210,w.tick)).toBe(true);expect(validSurgeryRequestShape(request,209,w.tick)).toBe(false);
  expect(validSurgeryTaskShape(t,210,w)).toBe(true);expect(validSurgeryTaskShape(t,209,w)).toBe(false);
  for(const mutate of [(v:typeof t)=>{v.ingredients![1]!.quantity=1;},
    (v:typeof t)=>{v.ingredients![0]!.cell={...v.ingredients![1]!.cell};},
    (v:typeof t)=>{v.ingredients![0]!.pileId=v.ingredients![1]!.pileId;},
    (v:typeof t)=>{v.ingredients![0]!.stage='held';},
    (v:typeof t)=>{v.ingredients![0]!.cell={x:10,z:11};},
    (v:typeof t)=>{v.medicine={item:'medicine',sourcePileId:1,carryPileId:null,quantity:1};},
    (v:typeof t)=>{v.consumedMedicine='medicine';},
    (v:typeof t)=>{v.part='left-hand';}]){const bad=structuredClone(t);mutate(bad);expect(validSurgeryTaskShape(bad,210,w)).toBe(false);}
  const worked=operation('work').pawns[0]!.surgery!;
  expect(validSurgeryTaskShape({...worked,progress:1500},210,w)).toBe(false);
  expect(validSurgeryTaskShape({...worked,ingredients:undefined},210,w)).toBe(false);
  expect(validSurgeryTaskShape({...worked,implant:'wooden-foot',part:'left-foot',progress:1000},210,w)).toBe(false);
  const staged=operation('placed').pawns[0]!.surgery!;
  expect(validSurgeryTaskShape(staged,210,w)).toBe(true);
  expect(validSurgeryTaskShape({...staged,phase:'pickup'},210,w)).toBe(false);
});

test('pickup, held, staged and administered operations preserve their exclusive physical owners',()=>{
  for(const phase of ['pickup','approach','placed','work'] as const){
    const w=operation(phase);expect(validateSurgeries(w,210)).toEqual([]);expect(validateWorld(w)).toEqual([]);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  }
});

test('shared transport rejects anatomy corruption atomically and retains earlier deep medical snapshots',()=>{
  const w=installed(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(validArtificialPartTransport(w.pawns[0]!,210,w.tick-1)).toBe(false);
  expect(validArtificialPartTransport(w.pawns[0]!,210,w.tick+1)).toBe(true);
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('checkpoint');const previous=structuredClone(first.world);
  w.pawns[0]!.health!.artificialParts![0]!.installedAt++;
  expect(validArtificialPartsWorldTransport(w)).toBe(false);
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('resync');expect(first.world).toEqual(previous);
  w.pawns[0]!.health!.artificialParts![0]!.installedAt--;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1,true))).status).toBe('applied');expect(first.world).toEqual(previous);
  const old=structuredClone(w);old.schemaVersion=209 as World['schemaVersion'];
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow('Invalid version 209 save');
});
