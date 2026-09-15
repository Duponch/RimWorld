import { expect, test } from 'vitest';
import { applyCommand, stepWorld, serializeWorld, deserializeWorld, validateWorld, addGroundMaterial, refreshStock } from '../src/sim/index';
import { queryOrderOptions } from '../src/sim/player-orders';
import { groundCapacity } from '../src/sim/ground-placement';
import { deconstructionCamp, fixtureBuilding } from './scenarios/deconstruction';
import { woodAccount } from './scenarios/colony-player';
import type { StructureKind, World } from '../src/sim/types';

function parcel(w:World,kind:StructureKind,x:number,z:number) {
  const building=fixtureBuilding(w,kind,x,z);w.structures.pop();const pack={building,owner:{type:'ground' as const,x,z}};w.packed.push(pack);return pack;
}
function until(w:World,condition:()=>boolean,limit=1000) {
  for(let i=0;i<limit&&!condition();i++){stepWorld(w);expect(validateWorld(w),JSON.stringify({tick:w.tick,jobs:w.jobs,packed:w.packed,pawns:w.pawns})).toEqual([]);}
  expect(condition(),JSON.stringify({jobs:w.jobs,packed:w.packed,pawns:w.pawns})).toBe(true);
}
function zone(w:World,x:number,z:number,priority=2) {
  expect(applyCommand(w,{type:'stockpile',x,z,enabled:true,filters:{wood:false,food:false,furniture:true},priority,capacity:1}).ok).toBe(true);
  return w.stockpiles.find(s=>s.x===x&&s.z===z)!;
}

test('whole parcels reserve exclusive sources and floor slots, queue through player commands and resume without copying their identities',()=>{
  const w=deconstructionCamp(2),p=w.pawns[0]!,other=w.pawns[1]!;p.priorities={craft:2,mine:2,build:0,haul:1,gather:0,grow:0,cook:0};other.priorities.build=0;
  const a=parcel(w,'bed',14,16),b=parcel(w,'stool',16,16),one=zone(w,24,16),two=zone(w,25,16),initial=woodAccount(w);p.bedId=a.building.id;
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'furniture',structureId:a.building.id},queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'furniture',structureId:b.building.id},queue:true}).ok).toBe(true);
  expect(p.orders.queue).toHaveLength(1);expect(groundCapacity(w,one,'wood')).toBe(0);expect(groundCapacity(w,two,'wood')).toBe(0);
  other.priorities.haul=1;expect(applyCommand(w,{type:'order-haul',pawnId:other.id,target:{type:'furniture',structureId:a.building.id},queue:false}).ok).toBe(false);
  until(w,()=>p.haul?.phase==='deliver');const snapshot=serializeWorld(w),copy=deserializeWorld(snapshot);
  const corrupt=JSON.parse(snapshot);corrupt.pawns[0].orders.queue[0].destination.stockpileId=one.id;expect(validateWorld(corrupt).length).toBeGreaterThan(0);
  until(w,()=>!p.haul&&!p.orders.queue.length&&w.packed.every(p=>p.owner.type==='ground'&&[24,25].includes(p.owner.x)));stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  expect(w.packed.map(p=>p.building.id).sort()).toEqual([a.building.id,b.building.id].sort());expect(p.bedId).toBe(a.building.id);expect(woodAccount(w)).toBe(initial);expect(w.piles).toEqual([]);
});

test('filter changes and removal release cargo at the carrier; equal priority never causes shuffling and a full floor refuses interruption atomically',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!;p.priorities.build=0;p.priorities.haul=1;
  const pack=parcel(w,'table',14,16),target=zone(w,28,24);until(w,()=>p.haul?.phase==='deliver');
  const before={x:p.x,z:p.z};expect(applyCommand(w,{type:'stockpile',x:target.x,z:target.z,enabled:false}).ok).toBe(true);expect(pack.owner).toEqual({type:'ground',...before});expect(p.haul).toBeNull();
  const replacement=zone(w,23,19);zone(w,24,19);until(w,()=>!p.haul&&pack.owner.type==='ground'&&pack.owner.x===replacement.x);const owner={...pack.owner};stepWorld(w,200);expect(pack.owner).toEqual(owner);
  const higher=zone(w,29,29,4);until(w,()=>p.haul?.phase==='deliver');
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(x!==higher.x||z!==higher.z)w.piles.push({id:w.nextId++,item:'wood',kind:'wood',quantity:75,owner:{type:'ground',x,z}});
  // The only empty slot is too far from the carrier for an interruption deposit.
  p.x=1;p.z=1;p.path=[];p.motion=null;p.moveCooldown=0;
  refreshStock(w);const full=serializeWorld(w);expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'haul',value:0}).ok).toBe(false);expect(serializeWorld(w)).toBe(full);
  expect(pack.owner.type).toBe('pawn');
});

test('builders and growers clear whole objects before finishing while a table keeps its compatible floor object',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!;p.priorities.grow=2;
  const a=parcel(w,'stool',15,16),b=parcel(w,'bed',18,16),c=parcel(w,'horseshoes',22,16);addGroundMaterial(w,'wood',50,{x:12,z:15});const initial=woodAccount(w);
  zone(w,29,29,4); // Clearing must not detour to this distant best stockpile.
  expect(applyCommand(w,{type:'designate',kind:'wall',x:15,z:16}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'table',x:22,z:16}).ok).toBe(true);
  expect(applyCommand(w,{type:'area',action:'growing',from:{x:18,z:16},to:{x:18,z:16}}).ok).toBe(true);
  until(w,()=>w.structures.length===2&&w.resources.some(r=>r.kind==='rice'));
  expect(a.owner).not.toEqual({type:'ground',x:15,z:16});expect(b.owner).not.toEqual({type:'ground',x:18,z:16});expect(c.owner).toEqual({type:'ground',x:22,z:16});expect(woodAccount(w)).toBe(initial);
  expect(a.owner.type==='ground'&&Math.hypot(a.owner.x-15,a.owner.z-16)).toBeLessThanOrEqual(2);
  expect(b.owner.type==='ground'&&Math.hypot(b.owner.x-18,b.owner.z-16)).toBeLessThanOrEqual(2);
  expect(w.packed).toHaveLength(3);expect(w.pawns.every(p=>!p.haul)).toBe(true);
});

test('a hauler alone can reinstall the same bed; accepted work survives disabled priority and V25 migration rejects future fields',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,bed=fixtureBuilding(w,'bed',14,16);p.bedId=bed.id;p.priorities.build=0;p.priorities.haul=1;
  const legacy=JSON.parse(serializeWorld(w));legacy.schemaVersion=25;for(const a of legacy.pawns){delete a.priorities.mine;delete a.priorities.craft;}expect(deserializeWorld(JSON.stringify(legacy))).toEqual(w);
  legacy.stockpiles=[{id:legacy.nextId++,x:20,z:20,priority:2,capacity:1,filters:{wood:false,food:false,furniture:true}}];expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow();
  expect(applyCommand(w,{type:'install',structureId:bed.id,x:24,z:20,orientation:1}).ok).toBe(true);const job=w.jobs[0]!;
  expect(queryOrderOptions(w,p.id,job)[0]!.enabled).toBe(true);expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok).toBe(true);expect(job.installationWork).toBe('haul');
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'haul',value:0}).ok).toBe(true);until(w,()=>w.packed.length===1);const copy=deserializeWorld(serializeWorld(w));
  until(w,()=>w.jobs.length===0);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);expect(w.structures[0]).toBe(bed);expect(bed.x).toBe(24);expect(p.bedId).toBe(bed.id);
  expect(p.priorityWork?.work??'haul').toBe('haul');
  p.priorities.haul=1;expect(applyCommand(w,{type:'install',structureId:bed.id,x:20,z:20,orientation:0}).ok).toBe(true);
  until(w,()=>w.jobs.length===0);expect(bed.x).toBe(20);expect(p.priorities.build).toBe(0);
  p.priorities.build=1;p.priorities.haul=0;
  const extra=fixtureBuilding(w,'stool',14,22);
  for(const id of [bed.id,extra.id])expect(applyCommand(w,{type:'install',structureId:id,x:id===bed.id?24:20,z:24,orientation:0}).ok).toBe(true);
  const [first,second]=w.jobs;
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:first!.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:second!.id,queue:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'build',value:0}).ok).toBe(true);
  until(w,()=>p.jobId===second!.id);expect(second!.installationWork).toBe('build');expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  until(w,()=>w.jobs.length===0);
});

test('reinstalling preempts an uncollected storage claim; cancelling the source or clearing parent releases every whole-object reservation',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!;p.priorities.haul=1;
  const a=parcel(w,'stool',14,16),storage=zone(w,14,15),initial=woodAccount(w);
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'furniture',structureId:a.building.id},queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'install',structureId:a.building.id,x:24,z:21,orientation:0}).ok).toBe(true);
  expect(p.haul).toBeNull();expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  expect(applyCommand(w,{type:'area',action:'cancel',from:{x:14,z:16},to:{x:14,z:16}}).ok).toBe(true);expect(w.jobs).toEqual([]);
  expect(applyCommand(w,{type:'designate',kind:'wall',x:14,z:16}).ok).toBe(true);
  until(w,()=>p.haul?.phase==='deliver');expect(p.haul?.destination).toMatchObject({type:'aside',x:storage.x,z:storage.z});
  expect(applyCommand(w,{type:'cancel',x:14,z:16}).ok).toBe(true);expect(p.haul).toBeNull();expect(a.owner.type).toBe('ground');
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  if(a.owner.type!=='ground')throw new Error('Parcel lost');
  expect(applyCommand(w,{type:'designate',kind:'wall',x:a.owner.x,z:a.owner.z}).ok).toBe(true);
  until(w,()=>p.haul?.phase==='deliver');
  const d=p.haul!.destination;if(d.type!=='aside')throw new Error('Missing clearing parent');
  expect(applyCommand(w,{type:'stockpile',x:d.x,z:d.z,enabled:true,filters:{wood:true,food:false,furniture:false},priority:2,capacity:75}).ok).toBe(true);
  expect(p.haul).toBeNull();expect(a.owner.type).toBe('ground');expect(woodAccount(w)).toBe(initial);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
