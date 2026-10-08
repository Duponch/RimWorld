import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {validStorageSettings} from '../src/sim/designation.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {validatePileRecordShape} from '../src/sim/material-record-save.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

function laboratory():World {
  const w=deconstructionCamp(0,24);w.growingZones=[];w.stockpiles=[];w.packed=[];
  w.research={points:0,project:null,drugProduction:{points:500_000_000,completedAt:0},
    microelectronics:{points:3_000_000_000,completedAt:0},medicineProduction:{points:1_500_000_000,completedAt:0}};
  const id=w.nextId++,bill=newCookingBill(w.nextId++,'make-medicine');
  w.structures.push({id,kind:'drug-lab',material:'steel',x:8,z:8,orientation:0,footprint:'standard',bills:[bill]});
  addMaterial(w,'neutroamine',150,{type:'ground',x:4,z:4},'neutroamine');return w;
}

test('pharmaceutical state roundtrips exactly with neutral schema205 migration',()=>{
  const w=laboratory();expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const old=deconstructionCamp(0,24);old.schemaVersion=205 as World['schemaVersion'];
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  const future=laboratory();future.schemaVersion=205 as World['schemaVersion'];
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow('Invalid version 205 save');
});

test('neutroamine stack150 has a strict prospective item/category boundary',()=>{
  const w=laboratory(),pile=w.piles.find(p=>p.item==='neutroamine')!;
  expect(validatePileRecordShape(pile as unknown as Record<string,unknown>,w,206)).toEqual([]);
  for(const patch of [{quantity:151},{quantity:0},{kind:'medicine'},{kind:'food'},{quantity:'150'}])
    expect(validatePileRecordShape({...pile,...patch},w,206).length).toBeGreaterThan(0);
  expect(validatePileRecordShape(pile as unknown as Record<string,unknown>,w,205).length).toBeGreaterThan(0);
});

test('storage item and category filters require206 and stay distinct from medicine',()=>{
  const settings={filters:{wood:false,food:false,medicine:true,neutroamine:true},items:{neutroamine:true}};
  expect(validStorageSettings(settings,206)).toBe(true);expect(validStorageSettings(settings,205)).toBe(false);
  expect(validStorageSettings({...settings,filters:{...settings.filters,neutroamine:'yes'}} as never,206)).toBe(false);
  const w=laboratory();w.stockpiles.push({id:w.nextId++,x:5,z:5,...settings,priority:2,capacity:150});
  expect(validateWorld(w)).toEqual([]);
  w.schemaVersion=205 as World['schemaVersion'];expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
});

test('lab acquisition and manufacturing research are separate strict gates',()=>{
  const base=laboratory();
  for(const corrupt of [
    (w:World)=>{delete w.research!.drugProduction;},
    (w:World)=>{delete w.research!.medicineProduction;},
    (w:World)=>{delete w.research!.microelectronics;},
    (w:World)=>{w.research!.medicineProduction!.completedAt=w.tick+1;},
    (w:World)=>{w.structures[0]!.bills![0]!.filters.neutroamine=undefined as never;},
    (w:World)=>{w.structures[0]!.bills![0]!.recipe='simple-meal';},
  ]){const w=structuredClone(base);corrupt(w);expect(validateWorld(w).length).toBeGreaterThan(0);}
});

test('decoder rejects corrupt stack deltas atomically and can resync a valid checkpoint',()=>{
  const w=laboratory(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('checkpoint');const before=structuredClone(first.world);
  w.piles.find(p=>p.item==='neutroamine')!.quantity=151;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6))).status).toBe('resync');expect(first.world).toEqual(before);
  w.piles.find(p=>p.item==='neutroamine')!.quantity=149;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6,true))).status).toBe('applied');expect(first.world).toEqual(before);
});

test('decoder refuses future packed labs, research and bill recipes before adoption',()=>{
  for(const corrupt of [
    (w:World)=>{w.research={points:0,project:null,drugProduction:{points:0}};},
    (w:World)=>{const lab=laboratory().structures[0]!;w.nextId=Math.max(w.nextId,lab.id+3);w.packed.push({building:lab,owner:{type:'ground',x:6,z:6}});},
    (w:World)=>{w.structures=laboratory().structures;w.nextId=Math.max(w.nextId,w.structures[0]!.bills![0]!.id+1);},
    (w:World)=>{w.stockpiles.push({id:w.nextId++,x:5,z:5,filters:{wood:false,food:false,neutroamine:true},priority:1,capacity:150});},
  ]){
    const w=deconstructionCamp(0,24);corrupt(w);w.schemaVersion=205 as World['schemaVersion'];
    const decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(new SnapshotEncoder().encode(w,0,6))).status).toBe('resync');
  }
});

test('older ledgers cannot retain future neutroamine after their physical pile is gone',()=>{
  const w=deconstructionCamp(0,24);w.schemaVersion=205 as World['schemaVersion'];
  w.destroyed={count:0,lost:{},items:{neutroamine:1}};
  expect(validateWorld(w).length).toBeGreaterThan(0);
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,6))).status).toBe('resync');
});
