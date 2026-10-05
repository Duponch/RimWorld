/** Persisted route execution; medical/person ownership remains separate. */
import type { PlanetState } from './planet-state.ts';
import type { GroupState, GroupStop } from './group-state.ts';
import type { AwayGroup, GroupTravelCapture } from './group-capture.ts';
import { findPlanetRoute, planetEdgeCost, tileHour, validPlanetRoute, type PlanetCostContext, type PlanetSearchBudget } from './planet-navigation.ts';

export type GroupRouteAdvance={state:GroupState;event:'arrived'|null};
const boundary=(group:AwayGroup)=>group.segment?.to??group.tile;
/** Finishes the captured segment first. Replanning occurs ONLY on a command.
 * Insufficient shared quota leaves all group state/RNG untouched. */
export function prepareGroupRedirection(planet:PlanetState,group:AwayGroup,destination:number,context:PlanetCostContext,budget:PlanetSearchBudget):
  |{kind:'ready';state:AwayGroup}|{kind:'deferred'}|{kind:'refused';reason:string} {
  if(destination===group.destination)return {kind:'ready',state:group};
  const route=findPlanetRoute(planet,boundary(group),destination,context,budget);
  if(route.kind==='deferred')return {kind:'deferred'};
  if(route.kind!=='found')return {kind:'refused',reason:'unreachable'};
  return {kind:'ready',state:{...group,destination,route:route.tiles,phase:'travelling',stop:null}};
}
function stopped(group:AwayGroup,stop:GroupStop):GroupRouteAdvance {
  return {state:{...group,stop},event:null};
}
/** One owner pass per supplied Core, after personal pass. No medical tick,
 * private clock, Thing allocation, arrival purchase, or implicit route search. */
export function advanceGroupRoute(planet:PlanetState,group:AwayGroup,context:PlanetCostContext,capture:GroupTravelCapture):GroupRouteAdvance {
  if(context.mass!==capture.mass)throw new Error('Route/overload must share one actual mass capture');
  // Arrival changes phase when adopted. Subsequent owner passes emit no event.
  if(group.phase!=='travelling')return {state:group,event:null};
  if(group.paused)return stopped(group,{kind:'paused'});
  if(capture.incapableIds.length)return stopped(group,{kind:'incapacity',pawnIds:[...capture.incapableIds]});
  if(capture.mass.grams>capture.mass.capacityGrams)return stopped(group,{kind:'overload',grams:capture.mass.grams,capacityGrams:capture.mass.capacityGrams});
  if(!validPlanetRoute(planet,group.route,boundary(group),group.destination))return stopped(group,{kind:'unreachable',destination:group.destination});
  const arrival=(at:AwayGroup):GroupRouteAdvance=>{
    const home=at.tile===planet.homeTile;
    return {state:{...at,phase:home?'awaiting-entry':'at-site',stop:{kind:home?'awaiting-entry':'at-site'},segment:null,route:[at.tile]},event:'arrived'};
  };
  if(!group.segment&&group.tile===group.destination)return arrival(group);
  const finalPush=!!group.segment&&group.segment.to===group.destination
    &&[planet.homeTile,planet.civilianTile].includes(group.destination)&&group.segment.remainingCore<=10000;
  const hour=tileHour(planet,group.tile,context.homeCivilCore);
  if(capture.anyRestNeed&&(hour<6||hour>22)&&!finalPush)return stopped(group,{kind:'night'});
  if(group.segment&&group.segment.remainingCore>0)return {
    state:{...group,stop:null,segment:{...group.segment,remainingCore:group.segment.remainingCore-1}},event:null};
  // Remaining0 is a legitimate checkpoint at from; entry occurs next pass.
  // The persisted route already starts at engaged segment.to, so entry does NOT
  // consume another route cell; starting its successor consumes its own from.
  const next:AwayGroup=group.segment?{...group,tile:group.segment.to,segment:null,stop:null}:group;
  if(next.tile===next.destination)return arrival(next);
  const to=next.route[1],cost=to===undefined?undefined:planetEdgeCost(planet,next.tile,to,context);
  if(to===undefined||cost===undefined)return stopped(next,{kind:'unreachable',destination:next.destination});
  return {state:{...next,route:next.route.slice(1),stop:null,segment:{from:next.tile,to,totalCore:cost,remainingCore:cost}},event:null};
}

/** Explicit read-only UI estimate: committed rest + future edges in saved tail.
 * No Dijkstra and no promise about nights, incapacity, pause or future weight. */
export function estimateGroupRoute(planet:PlanetState,group:AwayGroup,context:PlanetCostContext):number|undefined {
  if(!validPlanetRoute(planet,group.route,boundary(group),group.destination))return undefined;
  let total=group.segment?.remainingCore??0;
  for(let i=1;i<group.route.length;i++){
    const cost=planetEdgeCost(planet,group.route[i-1]!,group.route[i]!,context);if(cost===undefined)return undefined;total+=cost;
  }
  return Number.isSafeInteger(total)?total:undefined;
}

// Root adopts returned state once per Core, then handles the single arrival
// event. At-site is a halt at the chosen terrestrial destination, not an
// invented map/settlement. Trade separately requires tile===civilianTile.
// At-site/paused/awaiting-entry still run Sim physiology/needs/tending.
// Return placement is a separate all-member root transaction; it never treats
// an arrived marker as reinsertion or drops goods from this pure route kernel.
