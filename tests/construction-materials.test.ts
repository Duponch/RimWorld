import { expect, test } from 'vitest';
import { applyCommand, stepWorld, serializeWorld, deserializeWorld, validateWorld, addGroundMaterial, refreshStock } from '../src/sim/index';
import { addMaterial } from '../src/sim/materials';
import { constructionRecipe, deliveredMaterial, requiredMaterial } from '../src/sim/construction-materials';
import { finishDeconstruction } from '../src/sim/deconstruction';
import { planHaulOrder } from '../src/sim/player-hauling';
import { deconstructionCamp } from './scenarios/deconstruction';
import type { World } from '../src/sim/types';

function until(w:World, done:()=>boolean, limit=1600) {
  for(let i=0;i<limit&&!done();i++) { stepWorld(w); expect(validateWorld(w),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns})).toEqual([]); }
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns})).toBe(true);
}
const steelAccount = (w:World) => w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)
  + w.structures.reduce((n,s)=>n+requiredMaterial(s,'steel'),0)
  + w.packed.reduce((n,p)=>n+requiredMaterial(p.building,'steel'),0) + (w.deconstructed.lostSteel??0);

test('typed deliveries reserve only requested ingredients, survive cancellation/replay and never substitute wood for steel',()=>{
  const w=deconstructionCamp(2);
  for(const p of w.pawns) {p.priorities.build=0;p.priorities.haul=1;}
  addGroundMaterial(w,'wood',45,{x:10,z:16},'wood');
  applyCommand(w,{type:'designate',kind:'bed',material:'steel',x:17,z:16});
  const steel=w.jobs[0]!;
  expect(planHaulOrder(w,w.pawns[0]!,{type:'job',jobId:steel.id}).task).toBeUndefined();
  stepWorld(w,15);expect(steel.construction).toBe('blueprint');expect(w.stock.wood).toBe(45);
  addGroundMaterial(w,'steel',45,{x:11,z:17},'steel');
  applyCommand(w,{type:'designate',kind:'bed',material:'wood',x:17,z:19});
  expect(applyCommand(w,{type:'order-haul',pawnId:w.pawns[0]!.id,target:{type:'job',jobId:steel.id},queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-haul',pawnId:w.pawns[1]!.id,target:{type:'job',jobId:steel.id},queue:false}).ok).toBe(true);
  until(w,()=>w.pawns.some(p=>p.haul?.phase==='deliver'));
  const cancelled=deserializeWorld(serializeWorld(w));
  expect(applyCommand(cancelled,{type:'cancel',x:steel.x,z:steel.z}).ok).toBe(true);
  expect(steelAccount(cancelled)).toBe(45);expect(validateWorld(cancelled)).toEqual([]);
  until(w,()=>deliveredMaterial(w,steel,'steel')===45&&deliveredMaterial(w,w.jobs[1]!,'wood')===45);
  expect(steel.progress).toBe(0);expect(steel.escrow).toEqual({wood:0,food:0});
  const saved=serializeWorld(w);
  for(const corrupt of ['wrong-item','excess','blueprint'] as const) {
    const bad=JSON.parse(saved),pile=bad.piles.find((p:any)=>p.owner.type==='job'&&p.owner.jobId===steel.id);
    if(corrupt==='wrong-item'){pile.item='wood';pile.kind='wood';bad.jobs[0].escrow.wood=pile.quantity;}
    else if(corrupt==='excess')pile.quantity++;
    else bad.jobs[0].construction='blueprint';
    expect(()=>deserializeWorld(JSON.stringify(bad)),corrupt).toThrow();
  }
  for(const p of w.pawns) applyCommand(w,{type:'priority',pawnId:p.id,work:'build',value:1});
  const copy=deserializeWorld(serializeWorld(w));until(w,()=>w.structures.length===2);
  stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  expect(w.structures.map(s=>s.material).sort()).toEqual(['steel','wood']);expect(steelAccount(w)).toBe(45);expect(w.stock.wood).toBe(0);
});

test('steel furniture retains its material and owner through packing/reinstallation; blocked odd refunds are atomic',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!;
  addGroundMaterial(w,'steel',45,{x:12,z:16},'steel');
  applyCommand(w,{type:'designate',kind:'bed',material:'steel',x:17,z:16});
  until(w,()=>w.structures.length===1);const bed=w.structures[0]!;p.bedId=bed.id;
  applyCommand(w,{type:'install',structureId:bed.id,x:20,z:20,orientation:1});
  until(w,()=>w.packed[0]?.owner.type==='pawn');expect(w.packed[0]!.building.material).toBe('steel');expect(steelAccount(w)).toBe(45);
  const copy=deserializeWorld(serializeWorld(w));until(w,()=>!w.jobs.length);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  expect(w.structures[0]).toBe(bed);expect(p.bedId).toBe(bed.id);
  applyCommand(w,{type:'designate',kind:'deconstruct',x:21,z:20});const job=w.jobs[0]!;
  expect(job.deconstruction?.material).toBe('steel');
  const allocator=w.nextId;w.nextId=Number.MAX_SAFE_INTEGER;
  const full=serializeWorld(w);expect(finishDeconstruction(w,p,job)).toBe(false);expect(serializeWorld(w)).toBe(full);
  w.nextId=allocator;refreshStock(w);
  expect(finishDeconstruction(w,p,job)).toBe(true);expect(steelAccount(w)).toBe(45);expect(w.stock.wood).toBe(0);expect(p.bedId).toBeNull();
  expect([22,23]).toContain(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0));
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('V29 keeps its eight-wood bed and existing work while V30 new beds require 45; future material and incompatible recipes are rejected',()=>{
  const w=deconstructionCamp();applyCommand(w,{type:'designate',kind:'bed',x:17,z:16});
  const job=w.jobs[0]!;delete job.material;job.construction='frame';addMaterial(w,'wood',8,{type:'job',jobId:job.id},'wood');
  const raw=JSON.parse(serializeWorld(w));raw.schemaVersion=29;
  const loaded=deserializeWorld(JSON.stringify(raw));expect(loaded.jobs[0]!.material).toBeUndefined();
  expect(constructionRecipe(loaded.jobs[0]!)).toMatchObject({work:120,ingredients:[{item:'wood',quantity:8}]});
  until(loaded,()=>loaded.structures.length===1);expect(loaded.structures[0]!.material).toBeUndefined();
  applyCommand(loaded,{type:'designate',kind:'bed',x:20,z:20});expect(requiredMaterial(loaded.jobs[0]!,'wood')).toBe(45);
  for(const material of ['steel','wood']) {raw.jobs[0].material=material;expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/version 29/);}
  const before=serializeWorld(loaded);
  expect(applyCommand(loaded,{type:'designate',kind:'campfire',material:'steel',x:22,z:22}).ok).toBe(false);
  expect(serializeWorld(loaded)).toBe(before);
  expect(constructionRecipe({kind:'bed',material:'wood'}).work).toBe(56);
  expect(constructionRecipe({kind:'bed',material:'steel'}).work).toBe(80);
});
