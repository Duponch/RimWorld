import { expect,test } from 'vitest';
import { createWorld,applyCommand,stepWorld,refreshStock,addGroundMaterial,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { queryOrderOptions } from '../src/sim/player-orders';
import { startTravel } from '../src/sim/movement';
import type { Cell,World } from '../src/sim/types';

function camp():World {
  const w=createWorld(42,32,32);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.stockpiles=[];w.growingZones=[];w.pawns=w.pawns.slice(0,1);
  const p=w.pawns[0]!;p.x=12;p.z=16;p.hunger=p.rest=100;p.schedule.fill('anything');p.recreation.level=100;
  for(const key of Object.keys(p.priorities)as (keyof typeof p.priorities)[])p.priorities[key]=0;
  refreshStock(w);return w;
}
function area(w:World,from?:Cell,to=from):number {
  const id=w.nextId;expect(applyCommand(w,{type:'allowed-area-create',label:'Atelier'}).ok).toBe(true);
  if(from&&to)expect(applyCommand(w,{type:'allowed-area-paint',areaId:id,enabled:true,from,to}).ok).toBe(true);
  return id;
}
function tick(w:World,n=1){for(let i=0;i<n;i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}}

test('unassigned and empty-area actors keep the exact ordinary continuation and RNG',()=>{
  const w=camp(),id=area(w),copy=deserializeWorld(serializeWorld(w));
  expect(applyCommand(w,{type:'assign-allowed-area',pawnId:w.pawns[0]!.id,areaId:id}).ok).toBe(true);
  // Assignment wakes the planner by design; compare from the same wake state.
  copy.pawns[0]!.planCooldown=w.pawns[0]!.planCooldown;copy.pawns[0]!.needCooldown=w.pawns[0]!.needCooldown;
  tick(w,40);tick(copy,40);delete w.pawns[0]!.allowedAreaId;expect(w).toEqual(copy);
});
test('an idle colon returns physically, saves during the edge, and deleting the area keeps that edge',()=>{
  const w=camp(),p=w.pawns[0]!,id=area(w,{x:16,z:16});
  expect(applyCommand(w,{type:'assign-allowed-area',pawnId:p.id,areaId:id}).ok).toBe(true);tick(w);
  expect(p.allowedAreaReturn?.target).toEqual({x:16,z:16});expect(p.motion?.end).toBeGreaterThan(w.tick);
  const saved=serializeWorld(w),copy=deserializeWorld(saved);expect(serializeWorld(copy)).toBe(saved);
  tick(w,25);tick(copy,25);expect(w).toEqual(copy);expect(p).toMatchObject({x:16,z:16});expect(p.allowedAreaReturn).toBeUndefined();
  const moving=deserializeWorld(saved),actor=moving.pawns[0]!,edge=structuredClone(actor.motion);
  expect(applyCommand(moving,{type:'allowed-area-delete',areaId:id}).ok).toBe(true);
  expect(actor.motion).toEqual(edge);expect(actor.allowedAreaReturn).toBeUndefined();expect(actor.allowedAreaId).toBeUndefined();expect(validateWorld(moving)).toEqual([]);tick(moving,8);
});
test('direct work outside is refused in the preview and command while an inside target remains playable',()=>{
  const w=camp(),p=w.pawns[0]!;p.priorities.gather=1;
  for(const x of [11,22]){w.resources.push({id:w.nextId++,kind:'tree',x,z:17,amount:12});expect(applyCommand(w,{type:'designate',kind:'chop',x,z:17}).ok).toBe(true);}
  const id=area(w,{x:10,z:15},{x:14,z:19});expect(applyCommand(w,{type:'assign-allowed-area',pawnId:p.id,areaId:id}).ok).toBe(true);
  const out=w.jobs.find(j=>j.x===22)!,inside=w.jobs.find(j=>j.x===11)!;
  const before=serializeWorld(w);expect(queryOrderOptions(w,p.id,out)[0]).toMatchObject({enabled:false,reason:expect.stringMatching(/Hors zone/)});
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:out.id,queue:false})).toMatchObject({ok:false,reason:expect.stringMatching(/Hors zone/)});expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:inside.id,queue:false}).ok).toBe(true);
  for(let i=0;i<400&&w.jobs.some(j=>j.id===inside.id);i++)tick(w);
  expect(w.resources.some(r=>r.x===11)).toBe(false);expect(w.resources.some(r=>r.x===22)).toBe(true);expect(w.jobs.some(j=>j.id===out.id)).toBe(true);
});
test('restricting an engaged material delivery keeps its actual object and active edge',()=>{
  const w=camp(),p=w.pawns[0]!;p.priorities.haul=1;
  addGroundMaterial(w,'wood',20,{x:13,z:16});const input=w.piles[0]!;
  expect(applyCommand(w,{type:'stockpile',x:20,z:16,enabled:true}).ok).toBe(true);
  const id=area(w,{x:10,z:14},{x:22,z:18});expect(applyCommand(w,{type:'assign-allowed-area',pawnId:p.id,areaId:id}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:input.id},queue:false}).ok).toBe(true);
  for(let i=0;i<20&&p.haul?.phase!=='deliver';i++)tick(w);
  expect(p.haul?.phase).toBe('deliver');const carried=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)!;
  if(!p.motion||p.motion.end<=w.tick)startTravel(w,p,{x:p.x+1,z:p.z});
  const edge=structuredClone(p.motion),identity=carried.id,total=w.piles.reduce((n,i)=>n+i.quantity,0);
  expect(applyCommand(w,{type:'allowed-area-paint',areaId:id,enabled:false,from:{x:20,z:16},to:{x:20,z:16}}).ok).toBe(true);
  expect(p.motion).toEqual(edge);expect(p.haul).toBeNull();expect(w.piles.find(i=>i.id===identity)?.owner.type).toBe('ground');expect(w.piles.reduce((n,i)=>n+i.quantity,0)).toBe(total);expect(validateWorld(w)).toEqual([]);
});
