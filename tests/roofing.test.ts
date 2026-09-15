import { expect, test } from 'vitest';
import { applyCommand, stepWorld } from '../src/sim/engine';
import { serializeWorld, deserializeWorld, validateWorld } from '../src/sim/serialization';
import { RoofContext, isRoofJob, isRoofed } from '../src/sim/roof-rules';
import { plantGrowth } from '../src/sim/plants';
import { queryOrderOptions } from '../src/sim/player-orders';
import { roomCamp } from './scenarios/rooms';
import { deconstructionCamp, fixtureBuilding } from './scenarios/deconstruction';
import type { AreaAction, World } from '../src/sim/types';

function area(w:World,action:AreaAction,x:number,z:number,xx=x,zz=z) {
  expect(applyCommand(w,{type:'area',action,from:{x,z},to:{x:xx,z:zz}})).toMatchObject({ok:true});
}
function until(w:World,predicate:()=>boolean,max=6000) {
  for(let i=0;i<max&&!predicate();i++){stepWorld(w);if(i%25===0)expect(validateWorld(w),JSON.stringify({tick:w.tick,jobs:w.jobs,p:w.pawns})).toEqual([]);}
  expect(predicate(),JSON.stringify({tick:w.tick,roof:w.roofing,jobs:w.jobs,p:w.pawns})).toBe(true);
}

test('roof support requires a connected 6.9-radius path, separated from areas, and strict V34 migration rejects future data',()=>{
  const w=deconstructionCamp();fixtureBuilding(w,'wall',10,16);
  w.roofing={constructed:[],build:[],remove:[],cursor:0};
  expect(new RoofContext(w).supported(16*32+11)).toBe(true);
  expect(new RoofContext(w).supported(16*32+12)).toBe(false); // Nearby support behind an unroofed gap.
  w.roofing.constructed=Array.from({length:6},(_,i)=>16*32+11+i);
  expect(new RoofContext(w).supported(16*32+16)).toBe(true);
  expect(new RoofContext(w).supported(16*32+17)).toBe(false);
  expect(validateWorld(w)).toEqual([]);
  const legacy=structuredClone(w) as unknown as Record<string,unknown>;legacy.schemaVersion=34;
  expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow(/version 34/);
  delete legacy.roofing;const migrated=deserializeWorld(JSON.stringify(legacy));
  expect(migrated.schemaVersion).toBe(35);expect(migrated.roofing).toBeUndefined();
  for(const change of [(x:World)=>x.roofing!.constructed.push(16*32+16),(x:World)=>x.roofing!.constructed.push(999999),(x:World)=>{x.roofing!.build=[1];x.roofing!.remove=[1];},(x:World)=>x.roofing!.cursor=-1]) {
    const bad=structuredClone(w);change(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const blocked=deconstructionCamp();
  for(let z=5;z<=9;z++)for(let x=5;x<=9;x++)fixtureBuilding(blocked,'wall',x,z);
  fixtureBuilding(blocked,'wall',16,16);
  area(blocked,'build-roof',7,7,7,8);area(blocked,'build-roof',16,15);
  until(blocked,()=>isRoofed(blocked,15*32+16));
  expect(blocked.roofing!.constructed).toEqual([15*32+16]);
});

test('builders physically roof a camp, clear a tree, preserve ceiling/floor coexistence and resume interrupted work exactly',()=>{
  const w=roomCamp();w.resources.push({id:w.nextId++,kind:'tree',x:12,z:14,amount:12});
  w.resources.push({id:w.nextId++,kind:'rice',x:13,z:14,amount:6,growth:.1,growthTick:w.tick});
  area(w,'build-roof',10,10,20,20);
  expect(w.roofing!.constructed).toEqual([]);
  expect(applyCommand(w,{type:'stockpile',x:13,z:13,enabled:true}).ok).toBe(true);
  until(w,()=>w.jobs.some(j=>isRoofJob(j)&&j.reservedBy!==null));
  const replay=deserializeWorld(serializeWorld(w));
  // Area cancellation must release accepted queued work as well as its worker.
  const interrupted=deconstructionCamp();fixtureBuilding(interrupted,'wall',16,16);
  area(interrupted,'build-roof',15,15,17,17);
  until(interrupted,()=>interrupted.jobs.some(j=>isRoofJob(j)&&j.reservedBy!==null));
  const worker=interrupted.pawns[0]!;
  const waiting=interrupted.jobs.find(j=>isRoofJob(j)&&j.reservedBy===null&&queryOrderOptions(interrupted,worker.id,j,true).some(o=>o.jobId===j.id&&o.enabled))!;
  expect(waiting).toBeDefined();
  expect(applyCommand(interrupted,{type:'designate',kind:'stool',x:waiting.x,z:waiting.z}).ok).toBe(true);
  const options=queryOrderOptions(interrupted,worker.id,waiting,true);
  expect(options.filter(o=>!o.haulTarget).map(o=>o.label).sort()).toEqual(['Construire le tabouret','Poser le toit']);
  expect(applyCommand(interrupted,{type:'order-job',pawnId:worker.id,jobId:waiting.id,queue:true}).ok).toBe(true);
  area(interrupted,'ignore-roof',10,10,20,20);
  expect(interrupted.jobs.filter(isRoofJob)).toEqual([]);expect(worker.orders.queue).toEqual([]);
  expect(validateWorld(interrupted)).toEqual([]);
  until(w,()=>w.roofing!.constructed.length===121);
  stepWorld(replay,w.tick-replay.tick);expect(replay).toEqual(w);
  expect(w.resources.some(r=>r.kind==='tree')).toBe(false);
  expect(w.piles.filter(p=>p.kind==='wood').reduce((n,p)=>n+p.quantity,0)).toBe(12);
  const rice=w.resources.find(r=>r.kind==='rice')!,growth=plantGrowth(w,rice);
  area(w,'ignore-roof',10,10,20,20);stepWorld(w,600);
  expect(plantGrowth(w,w.resources.find(r=>r.id===rice.id)!)).toBe(growth);
  expect(w.roofing!.constructed.length).toBe(121);
  area(w,'remove-roof',13,14);until(w,()=>!isRoofed(w,14*32+13));
  const exposed=w.resources.find(r=>r.id===rice.id)!;expect(plantGrowth(w,exposed)).toBe(growth);
  stepWorld(w,300);expect(plantGrowth(w,exposed)).toBeGreaterThan(growth);
  expect(validateWorld(w)).toEqual([]);
});

test('support destruction collapses coverage; voluntary removal preserves connected detours outside the build radius',()=>{
  const w=deconstructionCamp();fixtureBuilding(w,'wall',16,16);
  area(w,'build-roof',14,14,18,18);until(w,()=>w.roofing!.constructed.length===25);
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:16,z:16}).ok).toBe(true);
  until(w,()=>!w.structures.length);
  expect(w.roofing!.constructed).toEqual([]);
  expect(w.events.some(e=>e.message.startsWith('Effondrement'))).toBe(true);
  expect(w.jobs.filter(isRoofJob)).toEqual([]);
  expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,100);stepWorld(copy,100);expect(copy).toEqual(w);

  const mined=deconstructionCamp();mined.tiles[16*32+16]={terrain:'rock',stone:'granite'};
  area(mined,'build-roof',15,15,17,17);until(mined,()=>mined.roofing!.constructed.length===9);
  expect(applyCommand(mined,{type:'designate',kind:'mine',x:16,z:16}).ok).toBe(true);
  until(mined,()=>mined.tiles[16*32+16]!.terrain==='rough-stone');
  expect(mined.roofing!.constructed).toEqual([]);expect(validateWorld(mined)).toEqual([]);

  const detour=deconstructionCamp();fixtureBuilding(detour,'wall',10,16);fixtureBuilding(detour,'wall',10,23);
  const ring:number[]=[];
  for(let z=16;z<=23;z++)for(let x=11;x<=16;x++)if(x===11||x===16||z===16||z===23)ring.push(z*32+x);
  detour.roofing={constructed:ring,build:[],remove:[],cursor:0};
  expect(ring.every(i=>new RoofContext(detour).supported(i))).toBe(true);
  area(detour,'remove-roof',13,16);until(detour,()=>!isRoofed(detour,16*32+13));
  expect(new RoofContext(detour).supported(16*32+16)).toBe(false);
  expect(detour.roofing.constructed.length).toBe(ring.length-1);
  expect(detour.events.some(e=>e.message.startsWith('Effondrement'))).toBe(false);
  expect(deserializeWorld(serializeWorld(detour))).toEqual(detour);
  fixtureBuilding(detour,'stool',14,15);
  expect(applyCommand(detour,{type:'designate',kind:'deconstruct',x:14,z:15}).ok).toBe(true);
  until(detour,()=>!detour.structures.some(s=>s.kind==='stool'));
  expect(detour.roofing.constructed.length).toBe(ring.length-1);
});
