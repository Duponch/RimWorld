import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { gainRecreation,initialRecreation,RECREATION_GAIN,recreationKind,updateRecreation,type RecreationTask } from '../src/sim/recreation-rules.ts';
import { availableTelevisions,clearThrow,recreationSiteValid,recreationSpace,standableRecreationCell } from '../src/sim/recreation-space.ts';
import { isTelevisionCell,televisionWatchCells,tvActive } from '../src/sim/television-recreation.ts';
import { RoomTopologyCache } from '../src/sim/room-topology.ts';
import { reservedServiceCells } from '../src/sim/service-reservations.ts';
import { colonyExpectation } from '../src/sim/colony-economy.ts';
import { damageStructure } from '../src/sim/thing-damage.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { pawnBody } from '../src/sim/health-rules.ts';
import { controlledInjury } from './scenarios/health.ts';
import { processRecreation } from '../src/sim/recreation.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { search } from '../src/sim/work-planner.ts';
import { TICKS_PER_DAY,type Orientation,type World } from '../src/sim/types.ts';
import { prepareTelevisionWorld } from './scenarios/television-v208.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';

// Engineering fixtures precede player commands. Every viewing transition below
// uses ordinary simulation travel; no actor, joy, fuel or seat is moved in flight.
function prepared(count=1,seats=count,powered=true):World {
  const w=prepareTelevisionWorld(count,seats,powered);
  for(const p of w.pawns){p.recreation.level=10;p.comfort=0;}
  return w;
}
function start(w:World,count=w.pawns.length):void {
  for(const p of w.pawns.slice(0,count))expect(applyCommand(w,{type:'schedule-replace',pawnId:p.id,assignments:Array.from({length:24},()=> 'recreation' as const)}).ok).toBe(true);
}
function until(w:World,predicate:()=>boolean,limit=1500):void {
  for(let i=0;i<limit&&!predicate();i++)stepWorld(w);
  expect(predicate()).toBe(true);
}
const watchers=(w:World)=>w.pawns.filter(p=>p.recreation.task?.activity==='watch-television');
const active=(w:World)=>watchers(w).filter(p=>p.recreation.task!.phase==='active');
const tv=(w:World)=>w.structures.find(s=>s.kind==='tube-television')!;
function queryTask(w:World,seatId:number):RecreationTask {
  const seat=w.structures.find(s=>s.id===seatId)!;
  return {activity:'watch-television',buildingId:tv(w).id,seatId,target:{x:seat.x,z:seat.z},phase:'travel',elapsed:0};
}

test('TV has fifteen frontal cells in each rotation, excluding near, far and lateral cells',()=>{
  for(const orientation of [0,1,2,3] as Orientation[]){
    const screen={x:12,z:12,orientation},cells=televisionWatchCells(screen);
    expect(cells).toHaveLength(15);expect(new Set(cells.map(c=>`${c.x},${c.z}`)).size).toBe(15);
    for(let z=6;z<=18;z++)for(let x=6;x<=18;x++)expect(isTelevisionCell(screen,{x,z})).toBe(cells.some(c=>c.x===x&&c.z===z));
    expect(isTelevisionCell(screen,{x:12.5,z:15})).toBe(false);
  }
});

test('the fifth family uses ordinary tolerance hysteresis and leaves historical four-key needs intact',()=>{
  const w=prepared(),p=w.pawns[0]!;
  p.recreation=initialRecreation(10);expect(recreationKind('watch-television')).toBe('television');
  p.recreation.tolerance.television=50;
  const gain=gainRecreation(p.recreation,'television',RECREATION_GAIN*1.2);
  expect(gain).toBeCloseTo(.0864,12);expect(p.recreation.bored.television).toBe(true);
  p.recreation.tolerance.television=30;updateRecreation(p,undefined,.01);
  expect(p.recreation.bored.television).toBe(false);
  delete (p.recreation.tolerance as Partial<typeof p.recreation.tolerance>).television;
  delete (p.recreation.bored as Partial<typeof p.recreation.bored>).television;
  updateRecreation(p);
  expect(Object.keys(p.recreation.tolerance).sort()).toEqual(['cerebral','dexterity','social','solitary']);
  expect(Object.keys(p.recreation.bored).sort()).toEqual(['cerebral','dexterity','social','solitary']);
  expect(Object.values(p.recreation.tolerance).every(Number.isFinite)).toBe(true);
});

test('two viewers travel to distinct reserved seats, gain only at contact, then replay exactly without TV XP',()=>{
  const w=prepared(2,2);start(w);
  until(w,()=>watchers(w).length===2);
  for(const p of watchers(w)){
    expect(p.recreation.task).toMatchObject({phase:'travel',elapsed:0});
    expect(p.recreation.level).toBeLessThanOrEqual(10);expect(p.recreation.tolerance.television).toBe(0);expect(p.comfort).toBe(0);
    const task=p.recreation.task!;
    expect(reservedServiceCells(w,w.pawns.find(other=>other!==p)!.id).has(task.target.z*w.width+task.target.x)).toBe(true);
  }
  expect(new Set(watchers(w).map(p=>p.recreation.task!.seatId)).size).toBe(2);
  const resumed=deserializeWorld(serializeWorld(w));
  until(w,()=>active(w).length===2&&active(w).every(p=>p.moveCooldown===0));
  while(resumed.tick<w.tick)stepWorld(resumed);
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
  const p=active(w)[0]!,level=p.recreation.level,tolerance=p.recreation.tolerance.television,skills=structuredClone(p.skills);
  const fall=(colonyExpectation(w,p)?.joyToleranceDropPerDay??.18)*100/TICKS_PER_DAY;
  stepWorld(w);stepWorld(resumed);
  expect(p.recreation.level-level).toBeCloseTo(RECREATION_GAIN*1.2*(1-Math.max(0,tolerance-fall)/100),10);
  expect(p.skills).toEqual(skills);expect(p.comfort).toBeGreaterThan(0);
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));
});

test('reachable seats facing the screen are preferred and another orientation remains usable',()=>{
  const preferred=prepared(1,2),seats=preferred.structures.filter(s=>s.kind==='stool');
  seats[0]!.orientation=0;seats[1]!.orientation=2;start(preferred);
  until(preferred,()=>active(preferred).length===1);
  expect(preferred.pawns[0]!.recreation.task!.seatId).toBe(seats[1]!.id);
  const fallback=prepared(1,1);fallback.structures.find(s=>s.kind==='stool')!.orientation=0;start(fallback);
  until(fallback,()=>active(fallback).length===1);
  expect(fallback.pawns[0]!.recreation.task!.seatId).toBe(fallback.structures.find(s=>s.kind==='stool')!.id);
  expect(validateWorld(fallback)).toEqual([]);
});

test('an inaccessible facing chair falls back to a reachable other orientation using the ordinary route',()=>{
  const w=prepared(1,2),seats=w.structures.filter(s=>s.kind==='stool');
  seats[0]!.orientation=0;
  // Prepared inaccessible island: water blocks movement while preserving TV
  // sight and the room identity. The chair remains a valid viewing candidate.
  Object.assign(seats[1]!,{x:17,z:16,orientation:2});
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(dx||dz)w.tiles[(16+dz)*w.width+17+dx]={terrain:'water'};
  expect(recreationSiteValid(w,queryTask(w,seats[1]!.id))).toBe(true);
  start(w);
  const p=w.pawns[0]!,budget={remaining:1,pairs:0};let searches=0;
  expect(processRecreation(w,p,{
    search:goals=>{searches++;expect(goals).toEqual(new Set([seats[1]!.z*w.width+seats[1]!.x]));return search(w,p,blockedCells(w),new Set(),budget,goals);},
    move:()=>{throw new Error('Admission must plan a route, never move an actor.');},release:()=>false,event:()=>{},
  })).toBe(true);
  expect(searches).toBe(1);expect(budget.remaining).toBe(0);
  expect(p.recreation.task).toMatchObject({phase:'travel',seatId:seats[0]!.id});
  expect(p.path.every(cell=>w.tiles[cell.z*w.width+cell.x]!.terrain!=='water')).toBe(true);
  until(w,()=>active(w).length===1);
  expect(w.pawns[0]!.recreation.task!.seatId).toBe(seats[0]!.id);
  expect(validateWorld(w)).toEqual([]);
});

test('no power or no chair admits no viewer and grants no television joy',()=>{
  for(const w of [prepared(1,1,false),prepared(1,0,true)]){
    start(w);stepWorld(w,100);
    expect(watchers(w)).toHaveLength(0);expect(w.pawns[0]!.recreation.tolerance.television).toBe(0);
    expect(w.pawns[0]!.recreation.level).toBeLessThanOrEqual(10);expect(validateWorld(w)).toEqual([]);
  }
});

test('a prepared blind person cannot watch even with a powered TV and a free chair',()=>{
  const w=prepared(),p=w.pawns[0]!;
  controlledInjury(w,p,'left-eye',100000,'cut');controlledInjury(w,p,'right-eye',100000,'cut');
  expect(pawnBody(p).capacities.sight).toBe(0);start(w);stepWorld(w,100);
  expect(watchers(w)).toHaveLength(0);expect(p.recreation.tolerance.television).toBe(0);
  expect(p.recreation.level).toBeLessThanOrEqual(10);expect(validateWorld(w)).toEqual([]);
});

test('eight users reserve the TV while a ninth waits despite fifteen physically available chairs',()=>{
  const w=prepared(9,15);start(w);until(w,()=>watchers(w).length===8);
  expect(availableTelevisions(w,w.pawns.find(p=>!p.recreation.task)!.id)).toEqual([]);
  expect(new Set(watchers(w).map(p=>p.recreation.task!.seatId)).size).toBe(8);
  until(w,()=>active(w).length===8);
  expect(watchers(w)).toHaveLength(8);expect(validateWorld(w)).toEqual([]);
});

test('a physical switch operation stops seated viewers, releases places and replays the power-loss boundary',()=>{
  const w=prepared(3,2),worker=w.pawns[2]!;worker.priorities.basic=3;start(w,2);
  until(w,()=>active(w).length===2);
  expect(applyCommand(w,{type:'power-flick',structureId:tv(w).id,on:false}).ok).toBe(true);
  expect(tvActive(tv(w))).toBe(true);
  until(w,()=>tv(w).power!.switchOn===false);
  const resumed=deserializeWorld(serializeWorld(w)),tolerances=w.pawns.slice(0,2).map(p=>p.recreation.tolerance.television);
  stepWorld(w);stepWorld(resumed);
  expect(tvActive(tv(w))).toBe(false);expect(watchers(w)).toHaveLength(0);
  for(const [i,p] of w.pawns.slice(0,2).entries())expect(p.recreation.tolerance.television).toBeLessThanOrEqual(tolerances[i]!);
  expect(reservedServiceCells(w,worker.id).size).toBe(0);
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
});

test('destruction of an occupied chair releases its watcher without joy at a missing seat',()=>{
  const w=prepared();start(w);until(w,()=>active(w).length===1);
  const p=w.pawns[0]!,seat=w.structures.find(s=>s.id===p.recreation.task!.seatId)!,level=p.recreation.level;
  expect(damageStructure(w,seat,10000)).toBe(true);
  expect(w.structures.some(s=>s.id===seat.id)).toBe(false);expect(p.recreation.task).toBeNull();
  expect(p.recreation.level).toBe(level);expect(reservedServiceCells(w,0).size).toBe(0);
  expect(validateWorld(w)).toEqual([]);
});

test('one decision shares its room topology across fifteen seats; an open doorway keeps rooms distinct',()=>{
  const w=prepared(1,15),topology=new RoomTopologyCache().read(w);let calls=0;
  const space=recreationSpace(w,undefined,false,()=>{calls++;return topology;});
  expect(calls).toBe(0);
  for(const seat of w.structures.filter(s=>s.kind==='stool')){
    const task=queryTask(w,seat.id);expect(recreationSiteValid(w,task,space)).toBe(true);
    expect(recreationSiteValid(w,task,undefined,()=>topology)).toBe(true);
  }
  expect(calls).toBe(1);expect(standableRecreationCell(w,tv(w),space)).toBe(false);
  // Separate prepared query fixture: the doorway passes sight, not room identity.
  const divided=prepared(1,3),screen=tv(divided),seat=divided.structures.find(s=>s.kind==='stool'&&s.x===screen.x)!;
  for(let x=0;x<divided.width;x++)if(x!==seat.x)fixtureBuilding(divided,'wall',x,13);
  const door={...fixtureBuilding(divided,'door',seat.x,13),material:'wood' as const,door:{...newDoorState(divided.tick),open:true,holdOpen:true,from:1}};
  divided.structures[divided.structures.length-1]=door;
  expect(clearThrow(divided,screen,seat)).toBe(true);
  expect(recreationSiteValid(divided,queryTask(divided,seat.id))).toBe(false);
  door.door.open=false;
  expect(clearThrow(divided,screen,seat)).toBe(false);
});
