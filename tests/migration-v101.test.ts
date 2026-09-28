import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect,test } from 'vitest';
import { applyCommand,createWorld,deserializeWorld,serializeWorld,validateWorld } from '../src/sim/index';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { createMachiningFixture,prepareCompletedResearch } from './scenarios/machining-v101';
import { newCookingBill } from '../src/sim/cooking-bills';
import { newPowerState } from '../src/sim/power-rules';
import { SCHEMA_VERSION } from '../src/sim/types';

const publishedV90Colony=()=>gunzipSync(readFileSync(new URL('./fixtures/colony-v90.json.gz',import.meta.url))).toString('utf8');

test('immutable V90 colony migrates neutrally through V91, V101 and later schemas',()=>{
  const text=publishedV90Colony();
  const old=JSON.parse(text),world=deserializeWorld(text);
  expect(old.schemaVersion).toBe(90);
  expect(world.schemaVersion).toBe(SCHEMA_VERSION);
  expect([world.seed,world.rng,world.tick,world.nextId]).toEqual([old.seed,old.rng,old.tick,old.nextId]);
  expect(world.research).toEqual(old.research);
  expect(world.piles.map(p=>[p.id,p.item,p.quantity])).toEqual(old.piles.map((p:{id:number;item:string;quantity:number})=>[p.id,p.item,p.quantity]));
  expect(world.pawns.map(p=>[p.id,p.name,p.x,p.z,p.hunger,p.rest,p.mood])).toEqual(old.pawns.map((p:{id:number;name:string;x:number;z:number;hunger:number;rest:number;mood:number})=>[p.id,p.name,p.x,p.z,p.hunger,p.rest,p.mood]));
  expect(world.pawns.every(p=>p.priorities.art===0&&p.priorities.handle===0)).toBe(true);
  expect(world.research?.autodoors).toBeUndefined();
  expect(world.structures.some(s=>s.kind==='autodoor')).toBe(false);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
});

test('fine storage filters are atomic, optional, persisted and carried by worker snapshots',()=>{
  const w=createWorld(101,16,16);w.resources=[];w.jobs=[];w.structures=[];w.stockpiles=[];
  expect(applyCommand(w,{type:'stockpile',x:8,z:8,enabled:true,filters:{food:true,wood:false},items:{rice:true}}).ok).toBe(true);
  const before=serializeWorld(w);
  expect(applyCommand(w,{type:'stockpile',x:8,z:8,enabled:true,items:{unknown:true}} as never).ok).toBe(false);
  expect(serializeWorld(w)).toBe(before);
  expect(deserializeWorld(before)).toEqual(w);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');
  expect(applyCommand(w,{type:'stockpile',x:8,z:8,enabled:true,items:{berries:true}}).ok).toBe(true);
  const decoded=decoder.adopt(structuredClone(encoder.encode(w,0,0)));
  expect(decoded.status).toBe('applied');if(decoded.status==='applied')expect(decoded.world.stockpiles).toEqual(w.stockpiles);
  const old=JSON.parse(serializeWorld(w));old.schemaVersion=91;
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
  expect(applyCommand(w,{type:'stockpile',x:8,z:8,enabled:true,items:undefined}).ok).toBe(true);
  expect(w.stockpiles[0]!.items).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
});

test('V91 rejects future research and V101 rejects broken prerequisites',()=>{
  const base=JSON.parse(publishedV90Colony());
  for(const schemaVersion of [91,101]){
    const broken=structuredClone(base);broken.schemaVersion=schemaVersion;
    broken.research={points:0,project:'machining',machining:{points:1}};
    expect(()=>deserializeWorld(JSON.stringify(broken))).toThrow(/Invalid research project/);
  }
  const legacy={...base,schemaVersion:91};
  const restored=deserializeWorld(JSON.stringify(legacy));
  expect(restored.schemaVersion).toBe(SCHEMA_VERSION);
  expect(restored.research).toEqual(legacy.research);
  expect(restored.research?.autodoors).toBeUndefined();
  expect(validateWorld(restored)).toEqual([]);
});

test('V101 refuses fabricated gun bills without Armurerie while an empty unlocked table remains valid',()=>{
  const {world}=createMachiningFixture();prepareCompletedResearch(world);
  const table={id:world.nextId++,kind:'machining-table' as const,x:14,z:12,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,power:newPowerState('machining-table'),bills:[newCookingBill(world.nextId++,'make-revolver')]};
  world.structures.push(table);
  expect(validateWorld(world)).toEqual([]);
  delete world.research!.gunsmithing;
  expect(()=>deserializeWorld(serializeWorld(world))).toThrow('Locked gunsmithing production.');
  table.bills=[];
  expect(validateWorld(world)).toEqual([]);
});
