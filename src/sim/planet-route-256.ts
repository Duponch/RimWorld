/** Prospective caravan query. Geometry workspace is prepared explicitly at
 * the generated/restored exact-owner boundary, never by an accessor or tick. */
import type {GeographicPlanetState} from './planet-state.ts';
import type {CampaignGeography256} from './world-geography-owner-256.ts';
import {planetGeography256} from './planet-geography-256.ts';
import {worldSurfaceAverageTileSize,worldSurfaceApproxDistance} from './world-surface-distances.ts';
import {evaluateClimateCurve} from './world-climate-settings.ts';
import {roundWorldInteger} from './world-rivers.ts';
import {geographicPlanetEdgeSearchCost256,planetTicksPerMove,type PlanetCostContext,type PlanetSearchBudget,type PlanetRouteResult} from './planet-navigation.ts';
const geometry=new WeakMap<CampaignGeography256,{average:number;arcs:number}>();
/** One immutable owner scan. Call at cold load/draft adoption before admission;
 * no clock, RNG, mutable World, climate capture or faction is retained. */
export function preparePlanetNavigation256(planet:GeographicPlanetState):void {
 const owner=planetGeography256(planet);if(geometry.has(owner))return;
 const average=worldSurfaceAverageTileSize(owner.surface.tiles);let arcs=0;for(const t of owner.surface.tiles)arcs+=t.neighbours.length;
 geometry.set(owner,Object.freeze({average,arcs}));
}
export function geographicPlanetQueryBudget256(planet:GeographicPlanetState):PlanetSearchBudget {
 const owner=planetGeography256(planet),prepared=geometry.get(owner);if(!prepared)throw Error('Geographic navigation was not prepared at its cold boundary');return {nodes:owner.surface.tiles.length,arcs:prepared.arcs};
}
/** Same prepared immutable geometry used by caravan draw/proximity. */
export function geographicAverageTileSize256(planet:GeographicPlanetState):number {
 const prepared=geometry.get(planetGeography256(planet));if(!prepared)throw Error('Geographic navigation was not prepared at its cold boundary');return prepared.average;
}
/** Equal priority keeps parent/first minimum child; no tile-ID sorting. */
class Frontier {
 private ids:number[]=[];private priorities:number[]=[];
 get size():number{return this.ids.length;}
 push(id:number,cost:number):void {let at=this.size;this.ids.push(id);this.priorities.push(cost);while(at>0){const parent=Math.floor((at-1)/4);if(this.priorities[parent]!<=cost)break;this.ids[at]=this.ids[parent]!;this.priorities[at]=this.priorities[parent]!;at=parent;}this.ids[at]=id;this.priorities[at]=cost;}
 pop():readonly[number,number] {const answer=[this.ids[0]!,this.priorities[0]!] as const,id=this.ids.pop()!,cost=this.priorities.pop()!;if(!this.size)return answer;let at=0;while(at*4+1<this.size){let child=at*4+1;for(let i=child+1;i<Math.min(at*4+5,this.size);i++)if(this.priorities[i]!<this.priorities[child]!)child=i;if(cost<=this.priorities[child]!)break;this.ids[at]=this.ids[child]!;this.priorities[at]=this.priorities[child]!;at=child;}this.ids[at]=id;this.priorities[at]=cost;return answer;}
}
interface Node {known:number;heuristic:number;priority:number;parent:number;closed:boolean}
/** Core4871 WorldPathing.FindPath facts: ordered neighbours, four-ary
 * priorities, initial-node heuristic0, previous stored heuristic in priority,
 * float costs and search-limit500000. Sparse workspace is our allocation
 * adaptation; no bulk geography/difficulty pass runs for a request. */
export function findGeographicPlanetRoute256(planet:GeographicPlanetState,from:number,to:number,context:PlanetCostContext,budget:PlanetSearchBudget):PlanetRouteResult {
 const owner=planetGeography256(planet),prepared=geometry.get(owner);if(!prepared)throw Error('Geographic navigation requires explicit cold preparation');
 if(!Number.isSafeInteger(budget.nodes)||!Number.isSafeInteger(budget.arcs)||budget.nodes<0||budget.arcs<0)throw Error('Invalid geographic query quota');
 const tiles=owner.surface.tiles,count=tiles.length;
 if(budget.nodes<count||budget.arcs<prepared.arcs)return {kind:'deferred',nodes:0,arcs:0};
 const passable=(id:number)=>Number.isSafeInteger(id)&&id>=0&&id<count&&tiles[id]!.biome!=='ocean'&&tiles[id]!.biome!=='lake'&&tiles[id]!.hilliness!=='impassable';
 if(!passable(from)||!passable(to))return {kind:'unreachable',nodes:0,arcs:0};
 const f=Math.fround,distance=(a:number,b:number)=>worldSurfaceApproxDistance(tiles[a]!.center,tiles[b]!.center,prepared.average),strength=roundWorldInteger(evaluateClimateCurve([[30,1],[40,1.3],[130,2]],distance(from,to))),ticks=planetTicksPerMove(context);
 const frontier=new Frontier(),states=new Map<number,Node>();states.set(from,{known:0,heuristic:0,priority:0,parent:from,closed:false});frontier.push(from,0);let nodes=0,arcs=0,processed=0;
 while(frontier.size){const [id,priority]=frontier.pop(),current=states.get(id)!;if(current.closed||current.priority!==priority)continue;
  nodes++;budget.nodes--;
  if(id===to){const route=[id];let cursor=id;while(cursor!==from){cursor=states.get(cursor)!.parent;route.push(cursor);if(route.length>count)throw Error('Geographic route parent cycle');}route.reverse();return {kind:'found',tiles:route,estimatedCore:current.known,nodes,arcs};}
  // A search-bound hit is unknown/deferred, never a proof of no route.
  if(processed>500000)return {kind:'deferred',nodes,arcs};
  for(const next of tiles[id]!.neighbours){arcs++;budget.arcs--;const previous=states.get(next);if(previous?.closed||!passable(next))continue;
   const known=(current.known+geographicPlanetEdgeSearchCost256(planet,id,next,context))|0;if(previous&&known>=previous.known)continue;
   const oldHeuristic=previous?.heuristic??0,heuristic=previous?.heuristic??roundWorldInteger(f(f(f(ticks*distance(next,to))*strength)*.5)),cost=(known+oldHeuristic)|0;
   states.set(next,{known,heuristic,priority:cost,parent:id,closed:false});frontier.push(next,cost);
  }
  processed++;current.closed=true;
 }
 return {kind:'unreachable',nodes,arcs};
}
