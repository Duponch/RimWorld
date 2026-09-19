import { blockedCells,canStep,routeToCell,hasReachableCell } from './pathfinding.ts';
import { captureStandability,navigationCosts,furnitureDelay } from './furniture-travel.ts';
import { doorCorners,doorOpenness } from './door-rules.ts';
import { WeightedSearch } from './weighted-search.ts';
import { HARE,type WildAnimal } from './wildlife-state.ts';
import type { Cell,World } from './types.ts';
const empty:ReadonlySet<number>=new Set();
/** Short-lived capture: no world mutation may interleave its searches/steps. */
export function animalNavigation(world:World) {
  const blocked=blockedCells(world,true),corners=doorCorners(world),stand=captureStandability(world);
  for(const d of world.structures)if(d.kind==='door'&&(!d.door?.open||doorOpenness(d,world.tick)<1-1e-9))blocked[d.z*world.width+d.x]=1;
  const free=(c:Cell)=>stand(c)&&!blocked[c.z*world.width+c.x];
  const step=(a:Cell,b:Cell)=>canStep(world,{x:a.x,z:a.z},b,blocked,empty);
  return {free,step,route(a:Cell,goals:Cell[]):Cell[]|undefined {
    const cells=goals.filter(free),indices=new Set(cells.map(c=>c.z*world.width+c.x));if(!indices.size)return;
    const n=navigationCosts(world);
    // Food travel uses the species' pace. Convert common furniture costs from
    // human base-3 units into hare base-1 units; no human movement capacity.
    const scale=(m:ReadonlyMap<number,number>|undefined)=>m?new Map([...m].map(([i,v])=>[i,v*3])):undefined;
    const reach=new WeightedSearch(world.width,world.height,a.z*world.width+a.x,blocked,scale(n.costs),n.repeaters,scale(n.floors),corners).finish(indices);
    const target=cells.filter(c=>hasReachableCell(reach,c.z*world.width+c.x)).sort((a,b)=>reach.costs[a.z*world.width+a.x]!-reach.costs[b.z*world.width+b.x]!)[0];
    return target?routeToCell(world,target,reach)??undefined:undefined;
  }};
}
export function moveAnimal(world:World,a:WildAnimal,step:(a:Cell,b:Cell)=>boolean):boolean {
  const next=a.path[0];if(!next)return false;
  if(!step(a,next)){a.path=[];delete a.meal;a.state='idle';a.nextDecision=world.tick+10;return false;}
  const pace=a.meal?HARE.moveTicks:HARE.walkTicks,delay=furnitureDelay(world,a,next),start=a.motion&&a.motion.end>=world.tick-1?a.motion.end:world.tick;
  a.motion={from:{x:a.x,z:a.z},to:{...next},start,end:start+Math.hypot(next.x-a.x,next.z-a.z)*pace+delay,speedFactor:3/pace,terrainDelay:delay};
  a.x=next.x;a.z=next.z;a.path.shift();a.state='moving';return true;
}
