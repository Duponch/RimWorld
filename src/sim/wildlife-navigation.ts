import { mergeSlowIntervals,travelEnd } from './travel-timing.ts';
import { weatherMoveFactor } from './weather-exposure.ts';
import { routeToCell,hasReachableCell,inBounds } from './pathfinding.ts';
import { jobBlocksTransit } from './construction-rules.ts';
import { footprintCells } from './definitions.ts';
import { captureStandability,navigationCosts,furnitureDelay } from './furniture-travel.ts';
import { doorCorners,doorOpenness } from './door-rules.ts';
import { WeightedSearch } from './weighted-search.ts';
import { scaleNavigationCosts } from './navigation-costs.ts';
import { HARE,type WildAnimal } from './wildlife-state.ts';
import type { Cell,World } from './types.ts';
/** Short-lived capture: no world mutation may interleave its searches/steps. */
export function animalNavigation(world:World) {
  const solids=new Set<number>(),corners=doorCorners(world),stand=captureStandability(world),width=world.width;
  const add=(s:Parameters<typeof footprintCells>[0])=>{for(const c of footprintCells(s))solids.add(c.z*width+c.x);};
  for(const s of world.structures) {
    if(s.kind==='wall'||s.kind==='cooler'||world.schemaVersion<22&&s.kind==='table')add(s);
    if(s.kind==='door'&&(!s.door?.open||doorOpenness(s,world.tick)<1-1e-9))solids.add(s.z*width+s.x);
  }
  for(const j of world.jobs)if(jobBlocksTransit(world,j))add(j);
  const blockedAt=(index:number)=>solids.has(index)||world.tiles[index]?.terrain==='water'||world.tiles[index]?.terrain==='rock';
  const free=(c:Cell)=>stand(c)&&!blockedAt(c.z*width+c.x);
  // Animal origins deliberately have no Pawn identity in canStep. The same
  // solid/door corner rule can use point queries without a map-sized mask.
  const step=(a:Cell,b:Cell)=>{
    const dx=b.x-a.x,dz=b.z-a.z;
    if(!inBounds(world,b.x,b.z)||Math.max(Math.abs(dx),Math.abs(dz))!==1)return false;
    const xSide=a.z*width+b.x,zSide=b.z*width+a.x;
    return !blockedAt(b.z*width+b.x)&&(!dx||!dz||!blockedAt(xSide)&&!blockedAt(zSide)&&!corners.has(xSide)&&!corners.has(zSide));
  };
  let blocked:Uint8Array|undefined;
  const routeGrid=()=>{
    if(!blocked){blocked=new Uint8Array(width*world.height);for(let i=0;i<world.tiles.length;i++){const t=world.tiles[i]!.terrain;if(t==='water'||t==='rock')blocked[i]=1;}for(const i of solids)blocked[i]=1;}
    return blocked;
  };
  return {free,step,route(a:Cell,goals:Cell[]):Cell[]|undefined {
    const cells=goals.filter(free),indices=new Set(cells.map(c=>c.z*world.width+c.x));if(!indices.size)return;
    const n=navigationCosts(world);
    // Food travel uses the species' pace. Convert common furniture costs from
    // human base-3 units into hare base-1 units; no human movement capacity.
    const reach=new WeightedSearch(world.width,world.height,a.z*world.width+a.x,routeGrid(),scaleNavigationCosts(n.costs,3),n.repeaters,scaleNavigationCosts(n.floors,3),corners).finish(indices);
    const target=cells.filter(c=>hasReachableCell(reach,c.z*world.width+c.x)).sort((a,b)=>reach.costs[a.z*world.width+a.x]!-reach.costs[b.z*world.width+b.x]!)[0];
    return target?routeToCell(world,target,reach)??undefined:undefined;
  }};
}
export function moveAnimal(world:World,a:WildAnimal,step:(a:Cell,b:Cell)=>boolean,moving=1):boolean {
  const next=a.path[0];if(!next)return false;
  if(!step(a,next)){a.path=[];delete a.meal;a.state='idle';a.nextDecision=world.tick+10;return false;}
  const pace=(a.meal||a.flee||a.retaliation||a.burning?HARE.moveTicks:HARE.walkTicks)/(moving*weatherMoveFactor(world,a)),delay=furnitureDelay(world,a,next),start=a.motion&&a.motion.end>=world.tick-1?a.motion.end:world.tick;
  a.motion={from:{x:a.x,z:a.z},to:{...next},start,end:start+Math.hypot(next.x-a.x,next.z-a.z)*pace+delay,speedFactor:3/pace,terrainDelay:delay};
  if(a.stagger&&a.stagger.untilCore/10>start){a.motion.stagger=mergeSlowIntervals([{start:Math.max(start,a.stagger.sinceCore/10),end:a.stagger.untilCore/10}]);a.motion.end=travelEnd(a.motion);}
  a.x=next.x;a.z=next.z;a.path.shift();a.state='moving';return true;
}
