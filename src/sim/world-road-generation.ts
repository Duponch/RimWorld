/** Generation stages for physical world roads. Site/name/faction creation
 * owns its separate step and stream; this module never invents those draws. */
import {WorldGenerationRandom,combineWorldSeed} from './world-generation-random.ts';
import {worldSphericalHeading} from './world-spherical-heading.ts';
import {createWorldRoadPathing,overlayWorldRoad,type WorldRoadId,type WorldRoadLink,type WorldRoadProspect} from './world-roads.ts';
import type {WorldSurfaceTile} from './world-surface-geography.ts';
const f=Math.fround;
const ORDINARY_ROADS:readonly WorldRoadId[]=['dirt-path','dirt-road','stone-road'];
function roundedDraw(value:number,random:WorldGenerationRandom):number {const whole=Math.trunc(value);return whole+(random.value()<f(value-whole)?1:0);}
export interface WorldRoadProgress {phase:'ancient-roads'|'road-endpoints'|'road-prospects'|'road-drawing';completed:number;total:number}
/** Ancient sites are already selected by their own step. Their coordinates
 * remain anchors, not settlements or generated local maps. */
export function* generateAncientWorldRoads(tiles:readonly WorldSurfaceTile[],difficulty:Float32Array,anchors:readonly number[],roads:WorldRoadLink[][]):Generator<WorldRoadProgress,void,void>{
 const pathing=createWorldRoadPathing(tiles,difficulty,roads),chains:number[][]=[];
 for(const first of anchors)for(const second of anchors){
  const chain=[first];let remaining=[...anchors],current=first,bearing=worldSphericalHeading(tiles[first]!.center,tiles[second]!.center);
  while(remaining.length){let chosen=-1,nearest=Infinity;
   // Every iteration permanently narrows the previous candidate list.
   remaining=remaining.filter(next=>next!==current&&Math.abs(f(worldSphericalHeading(tiles[current]!.center,tiles[next]!.center)-bearing))<15);
   for(let i=0;i<remaining.length;i++){const next=remaining[i]!,distance=pathing.distance(current,next);if(distance<nearest){chosen=i;nearest=distance;}}
   if(chosen<0)break;const next=remaining[chosen]!;bearing=worldSphericalHeading(tiles[current]!.center,tiles[next]!.center);chain.push(next);current=next;
  }
  chains.push(chain);
 }
 // Source comparison has no secondary ID tie key. Stable JS equal-key order
 // is an explicitly unqualified boundary of complete native output parity.
 chains.sort((a,b)=>b.length-a.length);const used=new Set<number>();let processed=0;
 for(const chain of chains){if(chain.length<4)break;if(chain.some(id=>used.has(id)))continue;for(const id of chain)used.add(id);
  for(let i=1;i<chain.length;i++){const from=chain[i-1]!,to=chain[i]!,distance=pathing.distance(from,to),path=pathing.path(from,to,f(f(distance*f(1.5))*12000));
   if(!path||path.nodesReversed.length>f(distance*f(1.5)))continue;
   for(let at=1;at<path.nodesReversed.length;at++){const a=path.nodesReversed[at-1]!,b=path.nodesReversed[at]!;
    overlayWorldRoad(tiles,roads,a,b,roads[a]!.some(link=>link.neighbour===b)?'ancient-asphalt-highway':'ancient-asphalt-road');}
  }
  processed++;yield {phase:'ancient-roads',completed:processed,total:chains.length};
 }
}
/** chooseTile uses the same deferred weighted settlement selector and this
 * exact RNG. It must not consume naming/faction work for an extra anchor. */
export function selectOrdinaryRoadEndpoints(tiles:readonly WorldSurfaceTile[],difficulty:Float32Array,roads:WorldRoadLink[][],rootSeed:number,worldObjects:readonly {tile:number;onSurface:boolean}[],chooseTile:(random:WorldGenerationRandom)=>number):number[]{
 const random=new WorldGenerationRandom(combineWorldSeed(rootSeed,1538475135)),endpoints:number[]=[];
 for(const object of worldObjects)if(random.value()>f(.05)&&object.onSurface)endpoints.push(object.tile);
 const additional=roundedDraw(f(f(tiles.length/100000)*random.float(30,50)),random);
 for(let i=0;i<additional;i++)endpoints.push(chooseTile(random));
 const pathing=createWorldRoadPathing(tiles,difficulty,roads),components=pathing.components(),result:number[]=[],seen=new Set<number>();
 for(const original of endpoints){let next=original;const steps=Math.max(0,random.integer(-4,5));for(let i=0;i<steps;i++){const neighbours=tiles[next]?.neighbours;if(!neighbours?.length)break;next=neighbours[random.integer(0,neighbours.length)]!;}
  const admitted=components[original]!==undefined&&components[original]!>=0&&components[original]===components[next]?next:original;
  if(!seen.has(admitted)){seen.add(admitted);result.push(admitted);}
 }
 return result;
}
/** Yield between endpoint searches and final paths. The RNG is reset to the
 * literal root hash for the network stage, independently of endpoint draws. */
export function* generateOrdinaryWorldRoads(tiles:readonly WorldSurfaceTile[],difficulty:Float32Array,roads:WorldRoadLink[][],rootSeed:number,endpoints:readonly number[]):Generator<WorldRoadProgress,void,void>{
 const pathing=createWorldRoadPathing(tiles,difficulty,roads),set=new Set(endpoints),prospects:WorldRoadProspect[]=[];
 for(let i=0;i<endpoints.length;i++){prospects.push(...pathing.prospects(endpoints[i]!,set,8));yield {phase:'road-prospects',completed:i+1,total:endpoints.length};}
 prospects.sort((a,b)=>f(a.cost)-f(b.cost));
 const roots=new Int32Array(tiles.length);for(let id=0;id<roots.length;id++)roots[id]=id;
 const find=(id:number)=>{let root=id;while(roots[root]!==root)root=roots[root]!;while(roots[id]!==id){const parent=roots[id]!;roots[id]=root;id=parent;}return root;};
 const random=new WorldGenerationRandom(rootSeed),drawn=new Set<string>(),final:WorldRoadProspect[]=[];
 for(const branch of prospects){const a=find(branch.from),b=find(branch.to),connected=a===b;
  if(connected&&(random.value()>f(.015)||drawn.has(`${branch.to}:${branch.from}`)))continue;
  if(random.value()>f(.1)){final.push(branch);drawn.add(`${branch.from}:${branch.to}`);}
  if(!connected)roots[a]=b;
 }
 // Selection consumes its complete stream before any road-type draw.
 for(let i=0;i<final.length;i++){const branch=final[i]!,path=pathing.path(branch.from,branch.to),road=ORDINARY_ROADS[random.integer(0,ORDINARY_ROADS.length)]!;
  if(path)for(let at=1;at<path.nodesReversed.length;at++)overlayWorldRoad(tiles,roads,path.nodesReversed[at-1]!,path.nodesReversed[at]!,road);
  yield {phase:'road-drawing',completed:i+1,total:final.length};
 }
}
