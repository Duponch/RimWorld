import { expect,test } from 'vitest';
import { PathFrontier } from '../src/sim/PathFrontier.ts';
import { WeightedSearch } from '../src/sim/weighted-search.ts';
import { EMPTY_NAVIGATION_COSTS } from '../src/sim/navigation-costs.ts';
import { blockedCells,canStep,reachableCells,routeToCell } from '../src/sim/pathfinding.ts';
import { candidateAccess } from '../src/sim/candidate-access.ts';
import { captureAllowedArea,OUTSIDE_ALLOWED_AREA_SEARCH_COST } from '../src/sim/allowed-area-state.ts';
import { processReturnToAllowedArea,reconcileAllowedAreaReturn } from '../src/sim/allowed-area-navigation.ts';
import { searchAllowed } from '../src/sim/work-planner.ts';
import { startTravel } from '../src/sim/movement.ts';
import { updateNeeds } from '../src/sim/needs.ts';
import { medicalCamp } from './scenarios/health.ts';

function camp(){const w=medicalCamp(1,32),p=w.pawns[0]!;w.structures=[];w.jobs=[];w.resources=[];w.piles=[];w.tiles=w.tiles.map(()=>({terrain:'soil'}));p.x=5;p.z=5;return {w,p};}
test('indexed Dial ring preserves LIFO, decrease key and wrap against the baseline queue',()=>{
  const a=new Float64Array(9),b=new Float64Array(9),plain=new PathFrontier(a,21414),indexed=new PathFrontier(b,21414,true);
  const push=(id:number,cost:number)=>{a[id]=cost;b[id]=cost;plain.push(id);indexed.push(id);};
  push(0,0);push(1,0);push(2,20000);push(3,20000);push(4,21414);push(2,15000);
  for(let i=0;i<3;i++)expect(indexed.pop()).toBe(plain.pop());
  push(5,25000);push(6,25000);push(7,30000);push(8,35000);push(7,26000);
  for(let i=0;i<6;i++)expect(indexed.pop()).toBe(plain.pop());expect(indexed.pop()).toBeUndefined();
});
test('unlimited and empty-area floods and lazy candidate routes are exact baseline',()=>{
  const {w,p}=camp(),target={x:9,z:8},blocked=blockedCells(w),base=reachableCells(w,p,blocked,new Set());
  const path=routeToCell(w,target,base);w.allowedAreas=[{id:w.nextId++,label:'Vide',color:1,cells:[]}];p.allowedAreaId=w.allowedAreas[0]!.id;
  const empty=reachableCells(w,p,blocked,new Set());expect(empty.parents).toEqual(base.parents);expect(empty.costs).toEqual(base.costs);expect(empty.visited).toBe(base.visited);
  expect(routeToCell(w,target,candidateAccess(w,p,blocked,new Set()))).toEqual(path);
});
test('outside additive cost remains active between repeaters and is paid per entered cell',()=>{
  const penalty={maximum:OUTSIDE_ALLOWED_AREA_SEARCH_COST,has:(i:number)=>i!==0,get:(i:number)=>i===0?0:OUTSIDE_ALLOWED_AREA_SEARCH_COST};
  const field=new WeightedSearch(3,1,0,new Uint8Array(3),EMPTY_NAVIGATION_COSTS,new Set([0,1,2]),EMPTY_NAVIGATION_COSTS,new Set(),penalty).finish();
  expect([...field.costs]).toEqual([0,21000,42000]);
});
test('interior detour wins; an exterior corridor remains passable without longer physical edges',()=>{
  const {w,p}=camp(),target={x:7,z:5};const cells=[{x:5,z:5},{x:5,z:6},{x:6,z:6},{x:7,z:6},target];
  w.allowedAreas=[{id:w.nextId++,label:'Détour',color:2,cells:cells.map(c=>c.z*w.width+c.x).sort((a,b)=>a-b)}];p.allowedAreaId=w.allowedAreas[0]!.id;
  let reach=reachableCells(w,p,blockedCells(w),new Set()),path=routeToCell(w,target,reach)!;
  expect(path.some(c=>c.x===6&&c.z===5)).toBe(false);
  w.allowedAreas[0]!.cells=[p.z*w.width+p.x,target.z*w.width+target.x];
  reach=reachableCells(w,p,blockedCells(w),new Set());path=routeToCell(w,target,reach)!;expect(path).toEqual([{x:6,z:5},target]);
  expect(canStep(w,p,path[0]!,blockedCells(w),new Set())).toBe(true);expect(startTravel(w,p,path[0]!)).toBe(true);expect(p.motion!.end-p.motion!.start).toBeLessThan(10);
});
test('return uses one shared search, settled-layer cell-id tie and strict edge arrival',()=>{
  const {w,p}=camp(),a={x:4,z:5},b={x:6,z:5};w.allowedAreas=[{id:w.nextId++,label:'Deux cases',color:3,cells:[a.z*w.width+a.x,b.z*w.width+b.x]}];p.allowedAreaId=w.allowedAreas[0]!.id;
  p.social={rng:1,memories:[]};p.tactics={targetId:null,post:null,reviewAtCore:0};p.shooting={order:null,stance:null};p.melee={order:null,strike:null};
  const policy=captureAllowedArea(w,p)!,budget={remaining:1,pairs:100};
  const route=searchAllowed(w,p,blockedCells(w),new Set(),budget,policy);expect(route.kind).toBe('found');expect(budget.remaining).toBe(0);if(route.kind!=='found')throw Error('Return route');expect(route.target).toEqual(a);
  expect(searchAllowed(w,p,blockedCells(w),new Set(),budget,policy)).toEqual({kind:'deferred'});
  const context={searchAllowed:()=>route,search:()=>null,move:()=>{},release:()=>true,event:()=>{}};
  expect(processReturnToAllowedArea(w,p,context)).toBe(true);p.x=a.x;p.z=a.z;p.path=[];p.motion={from:{x:5,z:5},to:a,start:w.tick,end:w.tick+1};
  expect(processReturnToAllowedArea(w,p,context)).toBe(true);w.tick++;expect(processReturnToAllowedArea(w,p,context)).toBe(false);expect(p.allowedAreaReturn).toBeUndefined();
  p.allowedAreaReturn={target:a};p.path=[a];p.equipmentDropPending=true;reconcileAllowedAreaReturn(w,p);expect(p.allowedAreaReturn).toBeUndefined();
});
test('critical hunger without an admitted portion can return while its ordinary hunger keeps depleting',()=>{
  const {w,p}=camp(),target={x:6,z:5};w.allowedAreas=[{id:w.nextId++,label:'Foyer',color:4,cells:[target.z*w.width+target.x]}];p.allowedAreaId=w.allowedAreas[0]!.id;p.hunger=1;p.state='hungry';
  const before=p.hunger;updateNeeds(w,p);expect(p.hunger).toBeLessThan(before);
  const ctx={searchAllowed:()=>searchAllowed(w,p,blockedCells(w),new Set(),{remaining:1,pairs:100},captureAllowedArea(w,p)!),search:()=>null,move:()=>{},release:()=>true,event:()=>{}};
  expect(processReturnToAllowedArea(w,p,ctx)).toBe(true);expect(p.allowedAreaReturn?.target).toEqual(target);expect(p.state).toBe('moving');expect(p.need).toBeNull();expect(w.piles).toEqual([]);expect(p.hunger).toBeLessThan(before);
});
