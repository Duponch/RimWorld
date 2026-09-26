import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect,test } from 'vitest';
import { applyCommand,createWorld,deserializeWorld,serializeWorld,validateWorld } from '../src/sim/index';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { createMachiningFixture,prepareCompletedResearch } from './scenarios/machining-v101';
import { newCookingBill } from '../src/sim/cooking-bills';
import { newPowerState } from '../src/sim/power-rules';
import { withoutArt } from './scenarios/legacy-skills';

test('immutable V90 colony migrates neutrally through V91, V101 and V103 to V104',()=>{
  const text=gunzipSync(readFileSync('tests/fixtures/colony-v90.json.gz')).toString('utf8');
  const old=JSON.parse(text),world=deserializeWorld(text);
  expect(world).toEqual({...old,schemaVersion:105,pawns:old.pawns.map((p:Record<string,unknown>)=>({...p,priorities:{...(p.priorities as object),art:0}}))});
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
  const base=JSON.parse(serializeWorld(createWorld(17,16,16)));
  for(const schemaVersion of [91,101]){
    const broken=structuredClone(base);broken.schemaVersion=schemaVersion;
    broken.research={points:0,project:'machining',machining:{points:1}};
    expect(()=>deserializeWorld(JSON.stringify(broken))).toThrow();
  }
  const legacy=withoutArt({...structuredClone(base),schemaVersion:91});
  expect(deserializeWorld(JSON.stringify(legacy))).toEqual({...base,pawns:base.pawns.map((p:Record<string,unknown>)=>({...p,priorities:{...(p.priorities as object),art:0}}))});
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
