import {actualAnimalProfile256,actualAnimalMoveSpeedFactor256} from './actual-animal-profile-256.ts';
import {naturalTerrainWalkable256} from './natural-terrain-movement-256.ts';
import {duckTerrainWalkable256,duckTerrainOverride256} from './duck-water-256.ts';
import {duckFlightMoveFactor256} from './duck-flight-runtime-256.ts';
import {duckFlying256} from './duck-flight-state-256.ts';
import {animalCore256,animalLifeStageData256,isAnimalSpecies256} from './animal-core-v256.ts';
import {finishSnowStep} from './snow-surface.ts';
import {animalBodySize} from './animal-life.ts';
import { mergeSlowIntervals,travelEnd } from './travel-timing.ts';
import { weatherMoveFactor } from './weather-exposure.ts';
import { routeToCell,hasReachableCell,inBounds } from './pathfinding.ts';
import { jobBlocksTransit } from './construction-rules.ts';
import { footprintCells } from './definitions.ts';
import { captureStandability,navigationCosts,furnitureDelay } from './furniture-travel.ts';
import { doorOpenness,isPassageDoor } from './door-rules.ts';
import { WeightedSearch } from './weighted-search.ts';
import { scaleNavigationCosts } from './navigation-costs.ts';
import { meleeContact } from './melee-space.ts';
import {START_STRUCTURE_PHYSICS_256} from './player-start-physics-256.ts';
import {animalHaulDoorPassable282} from './animal-haul-door-282.ts';
import {isSchema282OrLater} from './schema-compatibility-257.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { animalSpecies } from './animal-species.ts';
import {captureStructureNavigation,type StructureNavigationGeometry} from './structure-navigation.ts';
import type { Cell,World } from './types.ts';
/** Ranked food candidates resume a single frontier. Group once rather than
 * rescanning thousands of plant contacts for every distinct food score. */
function rankedFood(world:World,cells:Cell[],search:WeightedSearch,rank:(c:Cell)=>number):Cell|undefined {
  const groups=new Map<number,Cell[]>();
  for(const cell of cells){const priority=rank(cell),group=groups.get(priority);if(group)group.push(cell);else groups.set(priority,[cell]);}
  for(const [,group] of [...groups].sort(([a],[b])=>a-b)){
    const reach=search.advance(new Set(group.map(c=>c.z*world.width+c.x)));
    const target=group.filter(c=>hasReachableCell(reach,c.z*world.width+c.x)).sort((a,b)=>reach.costs[a.z*world.width+a.x]!-reach.costs[b.z*world.width+b.x]!)[0];
    if(target)return target;
  }
}
/** Short-lived capture: no world mutation may interleave its searches/steps. */
/** `allowClosedGate` is for planning a handler-led route only. Physical steps
 * must use the default navigation after the handler opens each passage. */
export function animalNavigation(world:World,allowClosedGate=false,fencePassable=false,actor?:WildAnimal,capturedFlight=false,providedGeometry?:StructureNavigationGeometry) {
  const duck=world.schemaVersion>=256&&actor?.species==='duck'?actor:undefined,override=duck&&duckTerrainOverride256(world,duck),flying=!!duck&&(capturedFlight||duckFlying256(duck.flight));
  const terrainFree=(terrain:unknown)=>naturalTerrainWalkable256(terrain)||flying&&terrain==='water-deep';
  const geometry=providedGeometry??captureStructureNavigation(world);
  const solids=new Set<number>(),corners=geometry.corners,stand=captureStandability(world,geometry),width=world.width;
  const add=(s:Parameters<typeof footprintCells>[0])=>{for(const c of footprintCells(s))solids.add(c.z*width+c.x);};
  for(const {structure:s,cells} of geometry.entries) {
    if(s.kind==='vent'||s.kind==='wall'||s.kind==='cooler'||s.kind==='fence'&&!fencePassable&&!flying||world.schemaVersion<22&&s.kind==='table')for(const i of cells)solids.add(i);
    if(isPassageDoor(s.kind)&&(s.door?.forbidden||!allowClosedGate&&(!s.door?.open||doorOpenness(s,world.tick)<1-1e-9)))solids.add(s.z*width+s.x);
  }
  for(const j of world.jobs)if(jobBlocksTransit(world,j))add(j);
  const blockedAt=(index:number)=>solids.has(index)||!terrainFree(world.tiles[index]?.terrain);
  const free=(c:Cell)=>inBounds(world,c.x,c.z)&&(stand(c)||flying&&world.tiles[c.z*width+c.x]?.terrain==='water-deep')&&!blockedAt(c.z*width+c.x);
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
    if(!blocked){blocked=new Uint8Array(width*world.height);for(let i=0;i<world.tiles.length;i++){const t=world.tiles[i]!.terrain;if(!terrainFree(t))blocked[i]=1;}for(const i of solids)blocked[i]=1;}
    return blocked;
  };
  // Haul uses OnCell, not Standability: a partial shelf or a chunk can be the
  // actual pickup/deposit cell. This separate sparse capture leaves all old
  // food/free/step/route behavior untouched, including their existing masks.
  let haulSolids:ReadonlySet<number>|undefined;
  const haulStaticSolids=()=>{
    if(!haulSolids){const captured=new Set<number>();
      for(const {structure:s,cells} of geometry.entries)if(START_STRUCTURE_PHYSICS_256[s.kind].passability===2)for(const i of cells)captured.add(i);
      for(const j of world.jobs)if(jobBlocksTransit(world,j))for(const c of footprintCells(j))captured.add(c.z*width+c.x);
      haulSolids=captured;
    }
    return haulSolids;
  };
  const haulActor=(a:WildAnimal)=>isSchema282OrLater(world.schemaVersion)&&!!a.domestic&&a.state!=='dead'&&a.shipCryptosleepHeldAt277===undefined;
  // The shared base navigation's caller option is not actor provenance.
  // Read this animal's real race; all admitted Advanced haulers pass fences.
  const haulFenceBlocked=(a:WildAnimal)=>isAnimalSpecies256(a.species)?animalCore256(a.species).race.roamMtbDays!==null:
    a.species==='deer'||a.species==='gazelle'||a.species==='muffalo'||a.species==='dromedary';
  const haulPoint=(a:WildAnimal,c:Cell,planning:boolean)=>{
    if(!haulActor(a)||!inBounds(world,c.x,c.z)||!naturalTerrainWalkable256(world.tiles[c.z*width+c.x]?.terrain)||haulStaticSolids().has(c.z*width+c.x))return false;
    for(const s of geometry.at(c)){
      if(START_STRUCTURE_PHYSICS_256[s.kind].fence&&haulFenceBlocked(a))return false;
      if(isPassageDoor(s.kind)&&!animalHaulDoorPassable282(world,a,s,planning))return false;
    }
    return true;
  };
  const haulStep=(a:WildAnimal,to:Cell)=>{
    const dx=to.x-a.x,dz=to.z-a.z;
    if(Math.max(Math.abs(dx),Math.abs(dz))!==1||!haulPoint(a,to,false))return false;
    if(!dx||!dz)return true;
    const xSide={x:to.x,z:a.z},zSide={x:a.x,z:to.z};
    return haulPoint(a,xSide,false)&&haulPoint(a,zSide,false)&&!corners.has(xSide.z*width+xSide.x)&&!corners.has(zSide.z*width+zSide.x);
  };
  function findRoute(a:Cell,goals:Cell[],exitFallback=false,rank?:(c:Cell)=>number):{kind:'food'|'exit';path:Cell[]}|undefined {
    const cells=goals.filter(free),indices=new Set(cells.map(c=>c.z*world.width+c.x));
    if(!indices.size&&!exitFallback)return;
    const edges:Cell[]=[];
    if(exitFallback){
      for(let x=0;x<world.width;x++)edges.push({x,z:0},{x,z:world.height-1});
      for(let z=1;z<world.height-1;z++)edges.push({x:0,z},{x:world.width-1,z});
    }
    const exits=edges.filter(free);
    if(!indices.size&&!exits.length)return;
    const n=navigationCosts(world,a,override,geometry);
    // Food travel uses the species' pace. Convert common furniture costs from
    // human base-3 units into hare base-1 units; no human movement capacity.
    const search=new WeightedSearch(world.width,world.height,a.z*world.width+a.x,routeGrid(),scaleNavigationCosts(n.costs,3),n.repeaters,scaleNavigationCosts(n.floors,3),corners);
    if(rank){
      // Stop at a reachable preferred group, not the closest lower-priority
      // goal. An unreachable group exhausts this same frontier; fallbacks then
      // reuse its settled field without launching another search.
      const target=rankedFood(world,cells,search,rank);
      if(target){const path=routeToCell(world,target,search.finish(new Set([target.z*width+target.x])));return path?{kind:'food',path}:undefined;}
      if(!exitFallback)return;
    }
    const reach=search.finish(indices.size?indices:new Set(exits.map(c=>c.z*world.width+c.x)));
    const target=cells.filter(c=>hasReachableCell(reach,c.z*world.width+c.x)).sort((a,b)=>reach.costs[a.z*world.width+a.x]!-reach.costs[b.z*world.width+b.x]!)[0];
    if(target){const path=routeToCell(world,target,reach);return path?{kind:'food',path}:undefined;}
    // An unsuccessful food flood exhausted its frontier. Its complete field
    // already contains reachable edge cells: do not launch a second flood.
    const exit=exits.filter(c=>hasReachableCell(reach,c.z*world.width+c.x)).sort((a,b)=>reach.costs[a.z*world.width+a.x]!-reach.costs[b.z*world.width+b.x]!)[0];
    const path=exit&&routeToCell(world,exit,reach);
    return path?{kind:'exit',path}:undefined;
  }
  return {free,geometry,
    haulStep,
    /** ROOT grants one search quota. All source and destination questions
     * resume THIS frontier from this original animal, never flood per pile. */
    haulSearch(a:WildAnimal):{canReach(c:Cell):boolean;pathTo(c:Cell):Cell[]|undefined}{
      if(!haulActor(a)||!inBounds(world,a.x,a.z))return {canReach:()=>false,pathTo:()=>undefined};
      const unavailable=new Uint8Array(width*world.height);
      for(let i=0;i<world.tiles.length;i++)if(!naturalTerrainWalkable256(world.tiles[i]?.terrain))unavailable[i]=1;
      for(const i of haulStaticSolids())unavailable[i]=1;
      for(const {structure:s,cells} of geometry.entries){
        if(START_STRUCTURE_PHYSICS_256[s.kind].fence&&haulFenceBlocked(a)||isPassageDoor(s.kind)&&!animalHaulDoorPassable282(world,a,s,true))for(const i of cells)unavailable[i]=1;
      }
      const n=navigationCosts(world,a,undefined,geometry),search=new WeightedSearch(width,world.height,a.z*width+a.x,unavailable,scaleNavigationCosts(n.costs,3),n.repeaters,scaleNavigationCosts(n.floors,3),corners);
      return {
        canReach(c:Cell){if(!haulPoint(a,c,true))return false;const i=c.z*width+c.x;return hasReachableCell(search.advance(new Set([i])),i);},
        pathTo(c:Cell){if(!haulPoint(a,c,true))return;const i=c.z*width+c.x,reach=search.advance(new Set([i]));return hasReachableCell(reach,i)?routeToCell(world,c,reach)??undefined:undefined;},
      };
    },
    /** One quota-granted frontier shared by all confusion destination tickets. */
    wanderSearch(a:Cell){
      const n=navigationCosts(world,a,override,geometry),search=new WeightedSearch(width,world.height,a.z*width+a.x,routeGrid(),scaleNavigationCosts(n.costs,3),n.repeaters,scaleNavigationCosts(n.floors,3),corners);
      return {canReach(c:Cell){if(!inBounds(world,c.x,c.z)||!free(c))return false;const i=c.z*width+c.x;return hasReachableCell(search.advance(new Set([i])),i);},pathTo(c:Cell){if(!inBounds(world,c.x,c.z)||!free(c))return;const i=c.z*width+c.x,reach=search.advance(new Set([i]));return hasReachableCell(reach,i)?routeToCell(world,c,reach)??undefined:undefined;}};
    },occupy:(c:Cell)=>inBounds(world,c.x,c.z)&&!blockedAt(c.z*width+c.x),step,route:(a:Cell,goals:Cell[],rank?:(c:Cell)=>number)=>findRoute(a,goals,false,rank)?.path,
    humanPursuitRoute(a:Cell,targets:readonly (Cell&{id:number})[],physical:Uint8Array,retainFirst=false):{path:Cell[];targetId:number}|undefined {
      const groups=targets.map(target=>{
        const contacts:Cell[]=[];
        for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(dx||dz){
          const c={x:target.x+dx,z:target.z+dz};if(free(c)&&meleeContact(world,c,target,physical))contacts.push(c);
        }
        return {target,contacts};
      });
      if(!groups.some(g=>g.contacts.length))return;
      const n=navigationCosts(world,a,override,geometry),search=new WeightedSearch(width,world.height,a.z*width+a.x,routeGrid(),scaleNavigationCosts(n.costs,3),n.repeaters,scaleNavigationCosts(n.floors,3),corners);
      const pick=(list:typeof groups)=>{
        const goals=new Set(list.flatMap(g=>g.contacts.map(c=>c.z*width+c.x))),reach=search.advance(goals);
        const found=list.flatMap(g=>g.contacts.filter(c=>hasReachableCell(reach,c.z*width+c.x)).map(c=>({target:g.target,cell:c,cost:reach.costs[c.z*width+c.x]!})))
          .sort((a,b)=>a.cost-b.cost||a.target.id-b.target.id||a.cell.z*width+a.cell.x-(b.cell.z*width+b.cell.x))[0];
        if(!found)return;
        const path=routeToCell(world,found.cell,search.finish(goals));
        return path?{path,targetId:found.target.id}:undefined;
      };
      if(retainFirst&&groups[0]!.contacts.length){const first=pick(groups.slice(0,1));if(first)return first;}
      return pick(groups);
    },
    foodOrExitRoute:(a:Cell,goals:Cell[],rank?:(c:Cell)=>number)=>findRoute(a,goals,true,rank),
    foodPreyOrExitRoute(a:Cell,goals:Cell[],prey:readonly (Cell&{id:number})[],exitFallback=false,rank?:(c:Cell)=>number):{kind:'food'|'prey'|'exit';path:Cell[];targetId?:number}|undefined {
      const cells=goals.filter(free),indices=new Set(cells.map(c=>c.z*width+c.x));
      if(!indices.size&&!prey.length&&!exitFallback)return;
      const n=navigationCosts(world,a,override,geometry),search=new WeightedSearch(width,world.height,a.z*width+a.x,routeGrid(),scaleNavigationCosts(n.costs,3),n.repeaters,scaleNavigationCosts(n.floors,3),corners);
      if(indices.size){
        const reach=rank?undefined:search.advance(indices),food=rank?rankedFood(world,cells,search,rank):cells.filter(c=>hasReachableCell(reach!,c.z*width+c.x)).sort((a,b)=>reach!.costs[a.z*width+a.x]!-reach!.costs[b.z*width+b.x]!)[0];
        if(food){const path=routeToCell(world,food,search.finish(indices));return path?{kind:'food',path}:undefined;}
      }
      // Biological rank comes before travel distance. Resume the same field
      // for each candidate; settled equal-cost layers retain full-flood parents.
      for(const target of prey){
        const contacts=[target,{x:target.x-1,z:target.z},{x:target.x+1,z:target.z},{x:target.x,z:target.z-1},{x:target.x,z:target.z+1}]
          .filter(free);
        if(!contacts.length)continue;
        const reach=search.advance(new Set(contacts.map(c=>c.z*width+c.x)));
        const contact=contacts.filter(c=>hasReachableCell(reach,c.z*width+c.x)).sort((a,b)=>reach.costs[a.z*width+a.x]!-reach.costs[b.z*width+b.x]!)[0];
        const path=contact&&routeToCell(world,contact,reach);if(path)return {kind:'prey',path,targetId:target.id};
      }
      if(!exitFallback)return;
      const reach=search.finish();
      const edges:Cell[]=[];
      for(let x=0;x<width;x++)edges.push({x,z:0},{x,z:world.height-1});
      for(let z=1;z<world.height-1;z++)edges.push({x:0,z},{x:width-1,z});
      const edge=edges.filter(c=>free(c)&&hasReachableCell(reach,c.z*width+c.x)).sort((a,b)=>reach.costs[a.z*width+a.x]!-reach.costs[b.z*width+b.x]!)[0];
      const path=edge&&routeToCell(world,edge,reach);return path?{kind:'exit',path}:undefined;
    }};
}
export function moveAnimal(world:World,a:WildAnimal,step:(a:Cell,b:Cell)=>boolean,moving=1,geometry?:StructureNavigationGeometry):boolean {
  const next=a.path[0];if(!next)return false;
  if(!step(a,next)){a.path=[];delete a.meal;a.state='idle';a.nextDecision=world.tick+10;return false;}
  const flight=duckFlightMoveFactor256(world,a),species=actualAnimalProfile256(a),pace=(a.meal||a.flee||a.retaliation||a.predation||a.manhunter||a.burning||a.haul&&a.haul.phase!=='holding'?species.moveTicks:species.walkTicks)/(moving*weatherMoveFactor(world,a)*actualAnimalMoveSpeedFactor256(a))/flight,delay=furnitureDelay(world,a,next,duckTerrainOverride256(world,a),geometry)/flight,start=a.motion&&a.motion.end>=world.tick-1?a.motion.end:world.tick;
  if(next.x!==a.x||next.z!==a.z)delete a.arrivalRotation;
  a.motion={...(flight>1?{animalFlight:true as const}:{}),from:{x:a.x,z:a.z},to:{...next},start,end:start+Math.hypot(next.x-a.x,next.z-a.z)*pace+delay,speedFactor:3/pace,terrainDelay:delay};
  if(a.stagger&&a.stagger.untilCore/10>start){a.motion.stagger=mergeSlowIntervals([{start:Math.max(start,a.stagger.sinceCore/10),end:a.stagger.untilCore/10}]);a.motion.end=travelEnd(a.motion);}
  if(world.snow&&animalBodySize(a)>.9)a.motion.snowEntryPending=true;
  a.x=next.x;a.z=next.z;a.path.shift();a.state='moving';finishSnowStep(world,a,animalBodySize(a));return true;
}
