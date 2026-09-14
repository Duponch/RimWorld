import { expect, test } from 'vitest';
import { createWorld, applyCommand, addGroundMaterial, refreshStock, stepWorld, serializeWorld, deserializeWorld, validateWorld } from '../src/sim/index';
import { blockedCells, reachableCells, routeToCell } from '../src/sim/pathfinding';
import { startTravel } from '../src/sim/movement';
import { constructionObstruction, constructionObstructions, constructionSiteFree } from '../src/sim/construction-rules';
import { rotAge } from '../src/sim/food-preservation';
import type { World } from '../src/sim/types';

function camp(count=1) {
  const w=createWorld(42,32,32);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.pawns=w.pawns.slice(0,count);
  w.pawns.forEach((p,i)=>{p.x=8+i;p.z=10;p.hunger=100;p.rest=100;p.schedule.fill('anything');p.priorities={build:1,haul:0,gather:0,grow:0,cook:0};});refreshStock(w);return w;
}
function until(w:World,predicate:()=>boolean,limit=1200) {
  for(let i=0;i<limit&&!predicate();i++){stepWorld(w);expect(validateWorld(w),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns})).toEqual([]);}
  expect(predicate(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns})).toBe(true);
}

test('a builder clears a typed pile physically, preserves freshness and cargo on cancellation, supplies a frame and completes it',()=>{
  const w=camp();addGroundMaterial(w,'wood',5,{x:7,z:10},'wood');addGroundMaterial(w,'food',23,{x:12,z:10},'rice');
  expect(applyCommand(w,{type:'designate',kind:'wall',x:12,z:10}).ok).toBe(true);
  expect(w.jobs[0]!.construction).toBe('blueprint');expect(blockedCells(w)[332]).toBe(0);
  until(w,()=>w.pawns[0]!.haul?.destination.type==='aside'&&w.pawns[0]!.haul.phase==='deliver');
  const checkpoint=serializeWorld(w),copy=deserializeWorld(checkpoint),cancelled=deserializeWorld(checkpoint);
  expect(cancelled.pawns[0]!.haul?.quantity).toBe(10);
  expect(applyCommand(cancelled,{type:'cancel',x:12,z:10}).ok).toBe(true);expect(validateWorld(cancelled)).toEqual([]);
  expect(cancelled.pawns[0]!.haul).toBeNull();expect(cancelled.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(23);
  until(w,()=>w.jobs[0]?.construction==='frame');expect(w.jobs[0]!.escrow.wood).toBe(5);expect(blockedCells(w)[332]).toBe(0);
  until(w,()=>w.structures.length===1);expect(w.jobs).toHaveLength(0);expect(w.stock.wood).toBe(0);
  expect(w.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(23);
  for(const pile of w.piles.filter(p=>p.item==='rice'))expect(rotAge(pile,w.tick)).toBeCloseTo(w.tick,8);
  stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);expect(blockedCells(w)[332]).toBe(1);
});

test('plant clearing respects a rotated footprint, saves mid-cut, and transport-only actors can supply but cannot finish a frame',()=>{
  const w=camp();w.resources.push({id:w.nextId++,kind:'tree',x:12,z:10,amount:12},{id:w.nextId++,kind:'berries',x:13,z:10,amount:10,growth:.2,growthTick:0});
  w.resources.push({id:w.nextId++,kind:'tree',x:8,z:9,amount:5});w.pawns[0]!.priorities.gather=4;
  expect(applyCommand(w,{type:'designate',kind:'bed',orientation:1,x:12,z:10}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'chop',x:8,z:9}).ok).toBe(true);
  expect(constructionObstructions(w).get(w.jobs[0]!.id)).toEqual(constructionObstruction(w,w.jobs[0]!));
  until(w,()=>!!w.jobs[0]?.clearance&&w.jobs[0].clearance.progress>10);
  expect(w.resources.find(r=>r.x===8&&r.z===9)?.amount).toBe(5);
  const saved=deserializeWorld(serializeWorld(w));until(w,()=>w.structures.length===1);
  expect(w.resources).toHaveLength(1);expect(w.stock.wood).toBe(4);expect(w.stock.food).toBe(0);stepWorld(saved,w.tick-saved.tick);expect(saved).toEqual(w);
  const shipping=camp();shipping.pawns[0]!.priorities={build:0,haul:1,gather:0,grow:0,cook:0};addGroundMaterial(shipping,'wood',8,{x:7,z:10},'wood');
  expect(applyCommand(shipping,{type:'designate',kind:'bed',x:12,z:10}).ok).toBe(true);
  until(shipping,()=>shipping.jobs[0]?.escrow.wood===8);stepWorld(shipping,50);expect(shipping.jobs[0]!.progress).toBe(0);expect(shipping.jobs[0]!.construction).toBe('frame');
  expect(applyCommand(shipping,{type:'priority',pawnId:shipping.pawns[0]!.id,work:'build',value:1}).ok).toBe(true);until(shipping,()=>shipping.structures.length===1);
});

test('plans and frames remain traversable with calibrated edge delay, completion protects active corners, and V15 migration is strict',()=>{
  const w=camp(2);expect(applyCommand(w,{type:'designate',kind:'wall',x:11,z:10}).ok).toBe(true);const job=w.jobs[0]!;
  addGroundMaterial(w,'wood',5,{x:7,z:10},'wood');until(w,()=>job.construction==='frame');
  const path=reachableCells(w,{x:10,z:10},blockedCells(w),new Set());expect(path.costs[331]).toBe(1467);expect(routeToCell(w,{x:11,z:10},path)).toEqual([{x:11,z:10}]);
  const entrant=camp();Object.assign(entrant.pawns[0]!,{x:10,z:10});entrant.jobs=[{...structuredClone(job),id:entrant.nextId++,reservedBy:null,status:'pending',progress:0,escrow:{wood:0,food:0}}];
  startTravel(entrant,entrant.pawns[0]!,{x:11,z:10});expect(entrant.pawns[0]!.motion!.end-entrant.pawns[0]!.motion!.start).toBeCloseTo(4.4,9);
  const mid=deserializeWorld(serializeWorld(entrant));expect(mid.pawns[0]!.motion!.terrainDelay).toBe(1.4);
  const builder=w.pawns[0]!,passer=w.pawns[1]!;
  for(const p of w.pawns){p.jobId=null;p.path=[];p.haul=null;p.state='idle';p.motion=null;p.moveCooldown=0;p.needCooldown=0;}
  Object.assign(builder,{x:12,z:10,jobId:job.id,state:'working'});Object.assign(job,{progress:69,reservedBy:builder.id,status:'active'});
  Object.assign(passer,{x:10,z:10,priorities:{build:0,haul:0,gather:0,grow:0,cook:0}});startTravel(w,passer,{x:11,z:11});
  expect(constructionSiteFree(w,job,builder.id)).toBe(false);stepWorld(w);expect(w.structures).toHaveLength(0);expect(validateWorld(w)).toEqual([]);
  until(w,()=>w.structures.length===1);expect(passer).toMatchObject({x:11,z:11});
  const old=camp();applyCommand(old,{type:'designate',kind:'wall',x:12,z:10});const raw=JSON.parse(serializeWorld(old));raw.schemaVersion=15;for(const pawn of raw.pawns)delete pawn.orders;raw.jobs.forEach((j:any)=>delete j.construction);
  const loaded=deserializeWorld(JSON.stringify(raw));expect(loaded.jobs[0]!.construction).toBe('blueprint');expect(loaded.rng).toBe(old.rng);expect(loaded.pawns).toEqual(old.pawns);
  raw.pawns[0].x=12;raw.pawns[0].z=10;expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/version 15/);
  const invalid=JSON.parse(serializeWorld(loaded));invalid.jobs[0].construction='finished';expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/phase/);
  const rock=deserializeWorld(serializeWorld(loaded));rock.resources.push({id:rock.nextId++,kind:'rock',x:12,z:10,amount:1});
  expect(validateWorld(rock)).toContain('Construction overlaps existing content.');
  const sow=deserializeWorld(serializeWorld(loaded)),sowJob=sow.jobs[0]!;sow.jobs=[];
  expect(applyCommand(sow,{type:'area',action:'growing',from:{x:12,z:10},to:{x:12,z:10}}).ok).toBe(true);
  Object.assign(sowJob,{kind:'sow',construction:undefined,growingZoneId:sow.growingZones[0]!.id});sow.jobs=[sowJob];sow.resources.push({id:sow.nextId++,kind:'tree',x:12,z:10,amount:1});
  expect(validateWorld(sow)).toContain('Construction overlaps existing content.');
  // A meal place already reserved by an approaching colonist remains valid
  // after a blueprint is placed there; delivery waits until ingestion ends.
  const dining=camp(2),eater=dining.pawns[1]!;eater.hunger=20;eater.priorities.build=0;
  dining.structures.push({id:dining.nextId++,kind:'bed',x:9,z:10,orientation:0,footprint:'standard'});
  addGroundMaterial(dining,'food',1,{x:9,z:10},'survival-meal');addGroundMaterial(dining,'wood',5,{x:7,z:10},'wood');
  until(dining,()=>eater.need?.kind==='eat'&&eater.need.phase==='travel');
  if(eater.need?.kind!=='eat'||!eater.need.dining)throw new Error('Missing dining place');
  const target=eater.need.dining.target;
  expect(applyCommand(dining,{type:'designate',kind:'wall',...target}).ok).toBe(true);
  expect(constructionSiteFree(dining,dining.jobs[0]!,dining.pawns[0]!.id)).toBe(false);
  const diningCopy=deserializeWorld(serializeWorld(dining));
  until(dining,()=>dining.pawns.some(p=>p.memories.length>0)||eater.need===null);
  expect(dining.jobs[0]!.construction).toBe('blueprint');
  stepWorld(diningCopy,dining.tick-diningCopy.tick);expect(diningCopy).toEqual(dining);
});
