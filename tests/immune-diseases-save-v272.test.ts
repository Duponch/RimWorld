import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {acquireImmuneDisease,tendImmuneDisease} from '../src/sim/immune-diseases-state.ts';
import {validImmuneDiseases} from '../src/sim/immune-diseases-save.ts';
import {createMedicalRecord,reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

function patient():World {
  const w=deconstructionCamp();w.growingZones=[];w.stockpiles=[];
  const p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);
  acquireImmuneDisease(p.health,'malaria',900_000);acquireImmuneDisease(p.health,'plague',1_100_000);
  return w;
}
const valid=(value:unknown,version=207)=>validateMedicalRecord(value,true,true,true,true,false,false,true,true,true,true,true,version,true);

test('two distinct diseases, tending and residual immunity roundtrip without aliasing',()=>{
  const w=patient(),h=w.pawns[0]!.health!;
  expect(tendImmuneDisease(h,'malaria',1200)).toBe(true);
  h.immuneDiseases!.plague!.severity=0;h.immuneDiseases!.plague!.immunity=700_000_000;
  expect(validateWorld(w)).toEqual([]);
  const restored=deserializeWorld(serializeWorld(w));expect(restored).toEqual(w);
  restored.pawns[0]!.health!.immuneDiseases!.malaria!.tend!.quality=10;
  expect(h.immuneDiseases!.malaria!.tend!.quality).toBe(1200);
  restored.pawns[0]!.health!.immuneDiseases!.plague!.immunity--;
  expect(h.immuneDiseases!.plague!.immunity).toBe(700_000_000);
});

test('schema206 migration is neutral and rejects future fields before migration',()=>{
  const old=deconstructionCamp();old.schemaVersion=206 as World['schemaVersion'];
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  const future=patient();future.schemaVersion=206 as World['schemaVersion'];
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow('Invalid version 206 save');
  expect(valid(future.pawns[0]!.health,206)).not.toBeNull();
});

test('episode values, names and treatment clocks are strictly bounded',()=>{
  const h=patient().pawns[0]!.health!;
  for(const patch of [{bornAt:1},{severity:-1},{severity:1_000_000_001},{severity:.1},
    {immunity:-1},{immunity:1_000_000_001},{luck:799_999},{luck:1_200_001},{extra:1},
    {tend:{quality:1301,expiresAtCore:37500}},{tend:{quality:1000,expiresAtCore:37499}},
    {tend:{quality:1000,expiresAtCore:45000}}]){
    const raw=structuredClone(h);Object.assign(raw.immuneDiseases!.malaria!,patch);
    expect(valid(raw)).not.toBeNull();
  }
  for(const value of [null,[],{}, {unknown:h.immuneDiseases!.malaria}, {malaria:undefined},
    {malaria:{...h.immuneDiseases!.malaria,severity:0,immunity:0}},
    {malaria:{...h.immuneDiseases!.malaria,severity:0,immunity:1,tend:{quality:1000,expiresAtCore:37500}}}])
    expect(validImmuneDiseases(value,h,207)).toBe(false);
});

test('malaria vomiting may outlive severity but plague cannot carry that physical state',()=>{
  const h=createMedicalRecord(10);acquireImmuneDisease(h,'malaria',1_000_000);
  h.immuneDiseases!.malaria!.severity=0;
  h.immuneDiseases!.malaria!.vomit={remainingCore:899,cell:{x:3,z:4}};
  expect(valid(h)).toBeNull();
  const wrong=structuredClone(h);wrong.immuneDiseases={plague:wrong.immuneDiseases!.malaria};
  expect(valid(wrong)).not.toBeNull();
  for(const patch of [{remainingCore:900},{remainingCore:0},{cell:{x:-1,z:4}},{cell:{x:3,z:4,extra:0}}]){
    const raw=structuredClone(h);Object.assign(raw.immuneDiseases!.malaria!.vomit!,patch);expect(valid(raw)).not.toBeNull();
  }
});

test('systemic diseases cannot be attached to animal or mechanical bodies',()=>{
  const h=patient().pawns[0]!.health!;
  expect(validImmuneDiseases(h.immuneDiseases,{...h,body:'hare'},207)).toBe(false);
  expect(validImmuneDiseases(h.immuneDiseases,{...h,body:'scyther'},207)).toBe(false);
});

test('frozen death dossiers retain their actual lethal disease and reject false causes',()=>{
  for(const kind of ['malaria','plague'] as const){
    const h=createMedicalRecord(20);acquireImmuneDisease(h,kind,1_000_000);
    h.immuneDiseases![kind]!.severity=1_000_000_000;reconcileMedicalDeath(h);
    expect(h.death).toEqual({tick:20,cause:kind});expect(valid(h)).toBeNull();
    const wrong=structuredClone(h);wrong.death!.cause=kind==='malaria'?'plague':'malaria';
    expect(valid(wrong)).not.toBeNull();expect(valid(h,206)).not.toBeNull();
  }
});

test('decoder keeps confirmed medical snapshots intact and resyncs invalid disease deltas atomically',()=>{
  const w=patient(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('checkpoint');const before=structuredClone(first.world);
  const state=w.pawns[0]!.health!.immuneDiseases!.malaria!;state.immunity=123;
  const second=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(second.status).toBe('applied');
  expect(first.world).toEqual(before);
  state.luck=0;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6))).status).toBe('resync');
  if(second.status!=='applied')throw Error('delta');expect(second.world.pawns[0]!.health!.immuneDiseases!.malaria!.luck).toBe(900_000);
  state.luck=900_000;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6,true))).status).toBe('applied');expect(first.world).toEqual(before);
});

test('decoder refuses future episodes, out-of-map vomiting and conflicting episode ownership',()=>{
  for(const mutate of [
    (w:World)=>{w.schemaVersion=206 as World['schemaVersion'];},
    (w:World)=>{w.pawns[0]!.health!.immuneDiseases!.malaria!.vomit={remainingCore:100,cell:{x:w.width,z:0}};},
    (w:World)=>{const h=w.pawns[0]!.health!;h.immuneDiseases!.malaria!.vomit={remainingCore:100,cell:{x:0,z:0}};
      h.flu={bornAt:0,severity:1,immunity:0,luck:1_000_000,vomit:{remainingCore:100,cell:{x:0,z:0}}};},
  ]){const w=patient();mutate(w);expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,6))).status).toBe('resync');}
});

test('save/reload preserves simultaneous evolution and all private medical state',()=>{
  const a=patient();const b=deserializeWorld(serializeWorld(a));
  for(let i=0;i<80;i++){stepWorld(a,1);stepWorld(b,1);}
  expect(b).toEqual(a);expect(validateWorld(a)).toEqual([]);
});
