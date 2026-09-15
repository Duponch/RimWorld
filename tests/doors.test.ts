import { withoutPawnSkills, withMigratedSkills } from './scenarios/legacy-skills';
import { expect, test } from 'vitest';
import { applyCommand, stepWorld } from '../src/sim/engine';
import { addGroundMaterial, addMaterial, refreshStock } from '../src/sim/materials';
import { serializeWorld, deserializeWorld, validateWorld } from '../src/sim/serialization';
import { constructionRecipe } from '../src/sim/construction-materials';
import { CONSTRUCTION_MATERIALS } from '../src/sim/building-materials';
import { newDoorState, doorOpenness, doorOpenTicks, doorOrientation } from '../src/sim/door-rules';
import { updateDoors } from '../src/sim/doors';
import { startTravel } from '../src/sim/movement';
import { blockedCells, canStep, reachableCells, routeToCell, cellIndex } from '../src/sim/pathfinding';
import { candidateAccess } from '../src/sim/candidate-access';
import { clearThrow, recreationSpace } from '../src/sim/recreation-space';
import { deconstructionCamp, fixtureBuilding } from './scenarios/deconstruction';
import type { Structure, World } from '../src/sim/types';

function door(w:World,material:Structure['material']='wood',x=16,z=16):Structure {
  const s:Structure={id:w.nextId++,kind:'door',material,x,z,orientation:0,footprint:'standard',door:newDoorState(w.tick)};w.structures.push(s);return s;
}
function until(w:World,predicate:()=>boolean,limit=5000):void {
  for(let i=0;i<limit&&!predicate();i++){stepWorld(w);if(i%50===0)expect(validateWorld(w)).toEqual([]);}
  expect(predicate(),JSON.stringify({tick:w.tick,pawns:w.pawns,jobs:w.jobs,structures:w.structures})).toBe(true);
}
function tickTravel(w:World):void {w.tick++;for(const p of w.pawns)p.moveCooldown=Math.max(0,(p.motion?.end??0)-w.tick);updateDoors(w);}

test('seven material doors build from delivered items, retain policy/save state and deconstruct without becoming furniture',()=>{
  for(const material of CONSTRUCTION_MATERIALS) {
    const w=deconstructionCamp(),item=material==='wood'?'wood':material==='steel'?'steel':'blocks';
    addGroundMaterial(w,item,24,{x:12,z:16},material);
    expect(applyCommand(w,{type:'designate',kind:'door',material,x:17,z:16}).ok).toBe(true);
    expect(constructionRecipe(w.jobs[0]!).ingredients).toEqual([{item:material,quantity:25}]);
    // Independent numbers are checked by material below, rather than catalogue order.
    const work=material==='wood'?60:material==='steel'?85:material==='sandstone-blocks'?439:material==='marble-blocks'?482:524;
    expect(constructionRecipe(w.jobs[0]!).work).toBe(work);
    stepWorld(w,100);expect(w.structures.length).toBe(0);
    addGroundMaterial(w,item,1,{x:12,z:16},material);until(w,()=>w.structures.length===1);
    const s=w.structures[0]!;expect(s.door).toEqual(newDoorState(w.tick));
    expect(applyCommand(w,{type:'designate',kind:'uninstall',x:s.x,z:s.z}).ok).toBe(false);
    applyCommand(w,{type:'door-policy',structureId:s.id,setting:'holdOpen',value:true});stepWorld(w,20);expect(s.door!.open).toBe(false);
    const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);
    expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:s.x,z:s.z}).ok).toBe(true);until(w,()=>!w.structures.length);
    expect(w.piles.filter(p=>p.item===material).reduce((n,p)=>n+p.quantity,0)).toBeGreaterThanOrEqual(12);
    expect(validateWorld(w)).toEqual([]);
  }
  const obstructed=deconstructionCamp();addMaterial(obstructed,'steel',1,{type:'ground',x:17,z:16},'steel');addGroundMaterial(obstructed,'wood',25,{x:12,z:16},'wood');
  applyCommand(obstructed,{type:'designate',kind:'door',material:'wood',x:17,z:16});until(obstructed,()=>obstructed.structures.length===1);stepWorld(obstructed,30);
  expect(obstructed.structures[0]!.door!.open).toBe(true);expect(obstructed.piles.find(p=>p.item==='steel')!.owner).toEqual({type:'ground',x:17,z:16});
});

test('opening waits before travel; concurrent bodies, items, hold and forbid preserve physical passages and replay',()=>{
  for(const material of ['wood','steel','granite-blocks'] as const) {
    const w=deconstructionCamp(2),s=door(w,material),p=w.pawns[0]!,other=w.pawns[1]!;
    p.x=15;p.z=16;other.x=16;other.z=15;
    expect(doorOpenTicks(s)).toBe(material==='wood'?3.8:material==='steel'?4.5:10);
    expect(startTravel(w,p,s)).toBe(false);expect(p.x).toBe(15);expect(p.motion).toBeFalsy();
    const began=w.tick;
    for(let t=1;t<Math.ceil(doorOpenTicks(s));t++){tickTravel(w);expect(startTravel(w,p,s)).toBe(false);expect(startTravel(w,other,s)).toBe(false);}
    tickTravel(w);expect(startTravel(w,p,s)).toBe(true);expect(startTravel(w,other,s)).toBe(true);
    expect(p.motion!.start).toBeGreaterThanOrEqual(began+doorOpenTicks(s));expect(p.motion!.end-p.motion!.start).toBe(3/.8);
    expect(applyCommand(w,{type:'door-policy',structureId:s.id,setting:'forbidden',value:true}).ok).toBe(true);
    expect(validateWorld(w)).toEqual([]);const saved=serializeWorld(w),copy=deserializeWorld(saved);expect(copy).toEqual(w);
    for(let i=0;i<4;i++)tickTravel(w);
    expect(startTravel(w,p,{x:17,z:16})).toBe(true);expect(startTravel(w,other,{x:16,z:17})).toBe(true);
    const exit=p.motion!.end;
    while(w.tick<=exit){expect(s.door!.open).toBe(true);tickTravel(w);}
    // A stack obstructs closing even after all bodies have cleared.
    addMaterial(w,'wood',1,{type:'ground',x:s.x,z:s.z},'wood');refreshStock(w);for(let i=0;i<30;i++)tickTravel(w);expect(s.door!.open).toBe(true);
    w.piles=[];refreshStock(w);tickTravel(w);expect(s.door!.open).toBe(false);
    // Forbidden remains a path restriction even while the leaves are visible.
    expect(blockedCells(w)[cellIndex(w,s.x,s.z)]).toBe(1);
    expect(startTravel(w,p,s)).toBe(false);
    tickTravel(w);
    applyCommand(w,{type:'door-policy',structureId:s.id,setting:'forbidden',value:false});
    applyCommand(w,{type:'door-policy',structureId:s.id,setting:'holdOpen',value:true});
    expect(startTravel(w,p,s)).toBe(false);while(!startTravel(w,p,s))tickTravel(w);
    while(p.moveCooldown>0)tickTravel(w);startTravel(w,p,{x:17,z:16});for(let i=0;i<40;i++)tickTravel(w);
    expect(s.door!.open).toBe(true);expect(s.door!.closeAt).toBeNull();
    applyCommand(w,{type:'door-policy',structureId:s.id,setting:'holdOpen',value:false});for(let i=0;i<20;i++)tickTravel(w);expect(s.door!.open).toBe(true);
    expect(startTravel(w,p,s)).toBe(true);while(p.moveCooldown>0)tickTravel(w);startTravel(w,p,{x:17,z:16});for(let i=0;i<25;i++)tickTravel(w);expect(s.door!.open).toBe(false);
    expect(doorOpenness(s,w.tick)).toBe(0);
  }
});

test('a sleeping colonist crosses a real closed corridor door; navigation, solid corners, migration and corrupt saves agree',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,s=door(w,'granite-blocks');
  for(let z=0;z<32;z++)if(z!==16)fixtureBuilding(w,'wall',16,z);
  const bed=fixtureBuilding(w,'bed',20,16);p.bedId=bed.id;p.rest=8;
  expect(doorOrientation(w,s)).toBe(1);
  const blocked=blockedCells(w),goal={x:20,z:16},reach=reachableCells(w,p,blocked,new Set()),access=candidateAccess(w,p,blocked,new Set());
  expect(routeToCell(w,goal,reach)?.some(c=>c.x===s.x&&c.z===s.z)).toBe(true);expect(access.has(cellIndex(w,goal.x,goal.z))).toBe(true);
  until(w,()=>s.door!.open&&doorOpenness(s,w.tick)<1);
  const saved=serializeWorld(w),copy=deserializeWorld(saved);until(w,()=>p.state==='sleeping');stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  stepWorld(w,25);expect(s.door!.open).toBe(false);expect(p.rest).toBeGreaterThan(8);
  applyCommand(w,{type:'door-policy',structureId:s.id,setting:'forbidden',value:true});
  const locked=blockedCells(w);expect(routeToCell(w,{x:13,z:16},reachableCells(w,p,locked,new Set()))).toBeNull();
  const open=deconstructionCamp();door(open);expect(canStep(open,{x:15,z:16},{x:16,z:15},blockedCells(open),new Set())).toBe(false);
  const pin={x:14,z:16},thrower={x:19,z:16};expect(clearThrow(open,pin,thrower)).toBe(false);expect(clearThrow(open,pin,thrower,recreationSpace(open))).toBe(false);
  open.structures[0]!.door!.open=true;expect(clearThrow(open,pin,thrower)).toBe(true);expect(clearThrow(open,pin,thrower,recreationSpace(open))).toBe(true);
  const path=routeToCell(open,{x:16,z:15},reachableCells(open,{x:15,z:16},blockedCells(open),new Set()));expect(path?.length).toBe(2);
  const legacy=deconstructionCamp();const old=JSON.parse(serializeWorld(legacy));(old.schemaVersion=33,withoutPawnSkills(old));expect(deserializeWorld(JSON.stringify(old))).toEqual(withMigratedSkills(legacy));
  const future=JSON.parse(saved);(future.schemaVersion=33,withoutPawnSkills(future));expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/version 33/);
  for(const data of [null,[],{}, {...s.door,closeAt:Infinity},{...s.door,changedAt:w.tick+1},{...s.door,lastTouch:w.tick+1}]){const bad=JSON.parse(saved);bad.structures.find((s:Structure)=>s.kind==='door').door=data;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
});
