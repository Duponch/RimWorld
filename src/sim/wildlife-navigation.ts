import { mergeSlowIntervals,travelEnd } from './travel-timing.ts';
import { weatherMoveFactor } from './weather-exposure.ts';
import { routeToCell,hasReachableCell,inBounds } from './pathfinding.ts';
import { jobBlocksTransit } from './construction-rules.ts';
import { footprintCells } from './definitions.ts';
import { captureStandability,navigationCosts,furnitureDelay } from './furniture-travel.ts';
import { doorCorners,doorOpenness,isPassageDoor } from './door-rules.ts';
import { WeightedSearch } from './weighted-search.ts';
import { scaleNavigationCosts } from './navigation-costs.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { animalSpecies } from './animal-species.ts';
import type { Cell,World } from './types.ts';
/** Short-lived capture: no world mutation may interleave its searches/steps. */
/** `allowClosedGate` is for planning a handler-led route only. Physical steps
 * must use the default navigation after the handler opens each passage. */
export function animalNavigation(world:World,allowClosedGate=false,fencePassable=false) {
  const solids=new Set<number>(),corners=doorCorners(world),stand=captureStandability(world),width=world.width;
  const add=(s:Parameters<typeof footprintCells>[0])=>{for(const c of footprintCells(s))solids.add(c.z*width+c.x);};
  for(const s of world.structures) {
    if(s.kind==='wall'||s.kind==='cooler'||s.kind==='fence'&&!fencePassable||world.schemaVersion<22&&s.kind==='table')add(s);
    if(isPassageDoor(s.kind)&&(s.door?.forbidden||!allowClosedGate&&(!s.door?.open||doorOpenness(s,world.tick)<1-1e-9)))solids.add(s.z*width+s.x);
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
  function findRoute(a:Cell,goals:Cell[],exitFallback=false):{kind:'food'|'exit';path:Cell[]}|undefined {
    const cells=goals.filter(free),indices=new Set(cells.map(c=>c.z*world.width+c.x));
    if(!indices.size&&!exitFallback)return;
    const edges:Cell[]=[];
    if(exitFallback){
      for(let x=0;x<world.width;x++)edges.push({x,z:0},{x,z:world.height-1});
      for(let z=1;z<world.height-1;z++)edges.push({x:0,z},{x:world.width-1,z});
    }
    const exits=edges.filter(free);
    if(!indices.size&&!exits.length)return;
    const n=navigationCosts(world);
    // Food travel uses the species' pace. Convert common furniture costs from
    // human base-3 units into hare base-1 units; no human movement capacity.
    const reach=new WeightedSearch(world.width,world.height,a.z*world.width+a.x,routeGrid(),scaleNavigationCosts(n.costs,3),n.repeaters,scaleNavigationCosts(n.floors,3),corners)
      .finish(indices.size?indices:new Set(exits.map(c=>c.z*world.width+c.x)));
    const target=cells.filter(c=>hasReachableCell(reach,c.z*world.width+c.x)).sort((a,b)=>reach.costs[a.z*world.width+a.x]!-reach.costs[b.z*world.width+b.x]!)[0];
    if(target){const path=routeToCell(world,target,reach);return path?{kind:'food',path}:undefined;}
    // An unsuccessful food flood exhausted its frontier. Its complete field
    // already contains reachable edge cells: do not launch a second flood.
    const exit=exits.filter(c=>hasReachableCell(reach,c.z*world.width+c.x)).sort((a,b)=>reach.costs[a.z*world.width+a.x]!-reach.costs[b.z*world.width+b.x]!)[0];
    const path=exit&&routeToCell(world,exit,reach);
    return path?{kind:'exit',path}:undefined;
  }
  return {free,step,route:(a:Cell,goals:Cell[])=>findRoute(a,goals)?.path,
    foodOrExitRoute:(a:Cell,goals:Cell[])=>findRoute(a,goals,true),
    foodPreyOrExitRoute(a:Cell,goals:Cell[],prey:readonly (Cell&{id:number})[],exitFallback=false):{kind:'food'|'prey'|'exit';path:Cell[];targetId?:number}|undefined {
      const cells=goals.filter(free),indices=new Set(cells.map(c=>c.z*width+c.x));
      if(!indices.size&&!prey.length&&!exitFallback)return;
      const n=navigationCosts(world),search=new WeightedSearch(width,world.height,a.z*width+a.x,routeGrid(),scaleNavigationCosts(n.costs,3),n.repeaters,scaleNavigationCosts(n.floors,3),corners);
      if(indices.size){
        const reach=search.advance(indices),food=cells.filter(c=>hasReachableCell(reach,c.z*width+c.x)).sort((a,b)=>reach.costs[a.z*width+a.x]!-reach.costs[b.z*width+b.x]!)[0];
        if(food){const path=routeToCell(world,food,search.finish(indices));return path?{kind:'food',path}:undefined;}
      }
      // Food failure already exhausted the field. Without food, complete it
      // before comparing every prey by biological score, not path distance.
      const reach=search.finish();
      for(const target of prey){
        const contacts=[target,{x:target.x-1,z:target.z},{x:target.x+1,z:target.z},{x:target.x,z:target.z-1},{x:target.x,z:target.z+1}]
          .filter(c=>free(c)&&hasReachableCell(reach,c.z*width+c.x)).sort((a,b)=>reach.costs[a.z*width+a.x]!-reach.costs[b.z*width+b.x]!);
        const path=contacts[0]&&routeToCell(world,contacts[0],reach);if(path)return {kind:'prey',path,targetId:target.id};
      }
      if(!exitFallback)return;
      const edges:Cell[]=[];
      for(let x=0;x<width;x++)edges.push({x,z:0},{x,z:world.height-1});
      for(let z=1;z<world.height-1;z++)edges.push({x:0,z},{x:width-1,z});
      const edge=edges.filter(c=>free(c)&&hasReachableCell(reach,c.z*width+c.x)).sort((a,b)=>reach.costs[a.z*width+a.x]!-reach.costs[b.z*width+b.x]!)[0];
      const path=edge&&routeToCell(world,edge,reach);return path?{kind:'exit',path}:undefined;
    }};
}
export function moveAnimal(world:World,a:WildAnimal,step:(a:Cell,b:Cell)=>boolean,moving=1):boolean {
  const next=a.path[0];if(!next)return false;
  if(!step(a,next)){a.path=[];delete a.meal;a.state='idle';a.nextDecision=world.tick+10;return false;}
  const species=animalSpecies(a.species),pace=(a.meal||a.flee||a.retaliation||a.predation||a.burning?species.moveTicks:species.walkTicks)/(moving*weatherMoveFactor(world,a)),delay=furnitureDelay(world,a,next),start=a.motion&&a.motion.end>=world.tick-1?a.motion.end:world.tick;
  a.motion={from:{x:a.x,z:a.z},to:{...next},start,end:start+Math.hypot(next.x-a.x,next.z-a.z)*pace+delay,speedFactor:3/pace,terrainDelay:delay};
  if(a.stagger&&a.stagger.untilCore/10>start){a.motion.stagger=mergeSlowIntervals([{start:Math.max(start,a.stagger.sinceCore/10),end:a.stagger.untilCore/10}]);a.motion.end=travelEnd(a.motion);}
  a.x=next.x;a.z=next.z;a.path.shift();a.state='moving';return true;
}
