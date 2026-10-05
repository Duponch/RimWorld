/** Shared planetary edge costs and bounded route searches. */
import type { PlanetState } from './planet-state.ts';
import type { World } from './types.ts';
import type { GroupMassCapture } from './group-capture.ts';
import { calendarTick } from './calendar.ts';
import { seasonTemperature } from './site-climate.ts';
import { tileCoordinates } from './planet-generation.ts';

export interface PlanetCostContext { homeCivilCore:number; mass:GroupMassCapture }
export interface PlanetSearchBudget { nodes:number; arcs:number }
export type PlanetRouteResult =
  | {kind:'found';tiles:number[];estimatedCore:number;nodes:number;arcs:number}
  | {kind:'unreachable';nodes:number;arcs:number}
  | {kind:'deferred';nodes:0;arcs:0};
export const PLANET_QUERY_NODES=162,PLANET_QUERY_ARCS=960;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const mod=(x:number,n:number)=>((x%n)+n)%n;
const inverse=(a:number,b:number,x:number)=>clamp((x-a)/(b-a),0,1);
export function roundEven(x:number):number {const lower=Math.floor(x),fraction=x-lower;
  return fraction<.5?lower:fraction>.5?lower+1:lower%2===0?lower:lower+1;}
const longitudeOffsetCore=(longitude:number)=>roundEven(longitude/15)*2500;
/** One actual mass capture reused by UI, overload and edge cost. No climate adoption. */
export function planetCostContext(world:World,mass:GroupMassCapture):PlanetCostContext {
  return {homeCivilCore:calendarTick(world)*10,mass};
}
export function tileCivilCore(planet:PlanetState,id:number,homeCivilCore:number):number {
  const tile=planet.tiles[id],home=planet.tiles[planet.homeTile];if(!tile||!home)throw new Error('Unknown planet tile');
  return homeCivilCore+longitudeOffsetCore(tileCoordinates(tile).longitude)-longitudeOffsetCore(tileCoordinates(home).longitude);
}
export function tileHour(planet:PlanetState,id:number,homeCivilCore:number):number {
  const ticks=mod(tileCivilCore(planet,id,homeCivilCore),60000);return (ticks===0?1:ticks)/2500;
}
const curve:readonly (readonly [number,number])[]=[[-.042500004,0],[.042500004,1],[.2075,1],[.29250002,2],
  [.45749998,2],[.5425,3],[.7075,3],[.7925,4],[.9575,4],[1.0425,5]];
function seasonalWinter(year:number):number {
  const pair=curve.findIndex((point,i)=>i>0&&year<=point[0]),i=pair<1?1:pair,a=curve[i-1]!,b=curve[i]!;
  const season=a[1]+(b[1]-a[1])*(year-a[0])/(b[0]-a[0]);
  return season<=1?1-season:season<=3?0:season<=4?season-3:1-(season-4);
}
/** Certified piecewise SeasonUtility; Normal15/75 is the represented preset. */
export function winterWeights(latitude:number,yearFraction:number):{winter:number;permanentWinter:number} {
  const abs=Math.abs(latitude);let equatorial=0,seasonal=0,polar=0;
  if(abs<=15)equatorial=1;
  else if(abs<=75){equatorial=inverse(20,15,abs);polar=inverse(70,75,abs);seasonal=Math.min(1-equatorial,1-polar);
    const total=equatorial+seasonal+polar;equatorial/=total;seasonal/=total;polar/=total;}
  else polar=1;
  const year=clamp(yearFraction,0,1),north=inverse(-2.5,2.5,latitude);
  return {winter:(north*seasonalWinter(year)+(1-north)*seasonalWinter(mod(year+.5,1)))*seasonal,permanentWinter:polar};
}
export function planetDifficulty(planet:PlanetState,id:number,context:PlanetCostContext):number {
  const tile=planet.tiles[id];if(!tile)throw new Error('Unknown planet tile');if(tile.biome==='ocean')return 1000;
  const {latitude}=tileCoordinates(tile),year=mod(tileCivilCore(planet,id,context.homeCivilCore),3600000)/3600000;
  const {winter,permanentWinter}=winterWeights(latitude,year);
  // Shared LOCAL-tick kernel. Global thermal phase vs local season longitude is explicit.
  const temperature=seasonTemperature(latitude,tile.meanTemperature,context.homeCivilCore/10);
  const fraction=(winter+permanentWinter)*inverse(5,0,temperature);
  return 1+({flat:0,'small-hills':.5,'large-hills':1.5,mountainous:3}[tile.hilliness])+(fraction>.01?2*fraction:0);
}
export function groupTicksPerMove(mass:GroupMassCapture):number {
  if(!Number.isSafeInteger(mass.grams)||!Number.isSafeInteger(mass.capacityGrams)||mass.grams<0||mass.capacityGrams<0)throw new Error('Invalid captured mass');
  const factor=mass.capacityGrams<=0?1:2-clamp(mass.grams/mass.capacityGrams,0,1);
  return Math.max(roundEven(4420/factor),1);
}
export function planetEdgeCost(planet:PlanetState,from:number,to:number,context:PlanetCostContext):number|undefined {
  if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to))return undefined;
  const a=planet.tiles[from],b=planet.tiles[to];if(!a||!b||a.biome==='ocean'||b.biome==='ocean')return undefined;
  if(from===to)return 0;if(!a.neighbours.includes(to))return undefined;
  // No road field exists in root type: absence has Core factor1, not1.5.
  return clamp(Math.trunc(groupTicksPerMove(context.mass)*planetDifficulty(planet,to,context)),1,30000);
}

/** A query is admitted ONLY with enough remaining quota for the whole graph.
 * Insufficient admission consumes nothing: unknown/deferred, not unreachable.
 * Once admitted, charge actual work; no retrying partial prefix or hidden budget. */
export function findPlanetRoute(planet:PlanetState,from:number,to:number,context:PlanetCostContext,budget:PlanetSearchBudget):PlanetRouteResult {
  if(planet.tiles.length!==162||planet.tiles.reduce((n,t)=>n+t.neighbours.length,0)!==960)throw new Error('Unvalidated planet topology');
  if(!Number.isSafeInteger(budget.nodes)||!Number.isSafeInteger(budget.arcs)||budget.nodes<0||budget.arcs<0)throw new Error('Invalid planet quota');
  if(budget.nodes<PLANET_QUERY_NODES||budget.arcs<PLANET_QUERY_ARCS)return {kind:'deferred',nodes:0,arcs:0};
  let nodes=0,arcs=0;
  const a=planet.tiles[from],b=planet.tiles[to];
  if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||!a||!b||a.biome==='ocean'||b.biome==='ocean')return {kind:'unreachable',nodes,arcs};
  const costs=Array<number>(162).fill(Infinity),parents=Array<number>(162).fill(-1),settled=Array<boolean>(162).fill(false);costs[from]=0;
  while(true){
    let best=-1;for(let i=0;i<162;i++)if(!settled[i]&&Number.isFinite(costs[i])&&(best<0||costs[i]!<costs[best]!||costs[i]===costs[best]&&i<best))best=i;
    if(best<0)return {kind:'unreachable',nodes,arcs};
    budget.nodes--;nodes++;settled[best]=true;
    if(best===to){const tiles=[to];for(let p=to;p!==from;){p=parents[p]!;tiles.push(p);}
      return {kind:'found',tiles:tiles.reverse(),estimatedCore:costs[to]!,nodes,arcs};}
    for(const n of planet.tiles[best]!.neighbours){budget.arcs--;arcs++;
      if(settled[n])continue;const edge=planetEdgeCost(planet,best,n,context);if(edge===undefined)continue;
      const total=costs[best]!+edge;if(total<costs[n]!){costs[n]=total;parents[n]=best;}
    }
  }
}

/** Existing persisted path is used at boundaries, never silently replaced. */
export function validPlanetRoute(planet:PlanetState,route:readonly number[],from:number,to:number):boolean {
  return route.length>0&&route.length<=162&&route[0]===from&&route.at(-1)===to&&new Set(route).size===route.length
    &&route.every((id,i)=>Number.isSafeInteger(id)&&!!planet.tiles[id]&&planet.tiles[id]!.biome!=='ocean'
      &&(i===0||planet.tiles[route[i-1]!]!.neighbours.includes(id)));
}
