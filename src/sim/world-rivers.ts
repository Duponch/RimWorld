/** Independent generation drainage. Geometry is immutable, roots and links
 * use the graph's recorded cyclic order. No continuing fluid simulation. */
import {evaluateClimateCurve} from './world-climate-settings.ts';
import {WorldGenerationRandom,combineWorldSeed} from './world-generation-random.ts';
import type {WorldRelief} from './world-climate-evaluation.ts';
export type WorldRiverId='huge-river'|'large-river'|'river'|'creek';
export interface WorldRiverLink {neighbour:number;river:WorldRiverId}
export interface DrainageTile {neighbours:readonly number[];biome:string;elevation:number;hilliness:WorldRelief;rainfall:number;meanTemperature:number}
interface RiverDefinition {spawn:number;chance:number;degrade:number;child:WorldRiverId|null;widthWorld:number;widthMap:number;branches:readonly {flow:number;river:WorldRiverId;chance:number}[]}
export const WORLD_RIVERS:Readonly<Record<WorldRiverId,RiverDefinition>>={
 'huge-river':{spawn:1000000,chance:1,degrade:500000,child:'large-river',widthWorld:.8,widthMap:30,branches:[{flow:750000,river:'huge-river',chance:.6},{flow:125000,river:'large-river',chance:.3},{flow:75000,river:'river',chance:.3}]},
 'large-river':{spawn:500000,chance:.75,degrade:250000,child:'river',widthWorld:.6,widthMap:14,branches:[{flow:100000,river:'river',chance:.3}]},
 river:{spawn:100000,chance:.5,degrade:50000,child:'creek',widthWorld:.4,widthMap:6,branches:[{flow:50000,river:'creek',chance:.3}]},
 creek:{spawn:-1,chance:1,degrade:20000,child:null,widthWorld:.2,widthMap:4,branches:[]},
};
const RIVER_ORDER:readonly WorldRiverId[]=['huge-river','large-river','river','creek'];
const RELIEF_HEIGHT:Readonly<Record<WorldRelief,number>>={flat:0,'small-hills':15,'large-hills':250,mountainous:500,impassable:1000};
const ELEVATION_COST=[[-1000,50],[-100,100],[0,400],[0,5000],[100,50000],[1000,50000]] as const;
const f=Math.fround;
export function roundWorldInteger(value:number):number {
 const lower=Math.floor(value),part=value-lower;
 return part<.5?lower:part>.5?lower+1:lower%2===0?lower:lower+1;
}
/** Four-ary heap: equal priorities neither bubble nor displace replacement.
 * A FIFO tie breaker would alter the drainage tree. */
class DrainageQueue {
 #ids:number[]=[];#costs:number[]=[];
 get size(){return this.#ids.length;}
 push(id:number,cost:number){
  let at=this.#ids.length;this.#ids.push(id);this.#costs.push(cost);
  while(at>0){const parent=Math.floor((at-1)/4);if(this.#costs[parent]!<=cost)break;this.#ids[at]=this.#ids[parent]!;this.#costs[at]=this.#costs[parent]!;at=parent;}
  this.#ids[at]=id;this.#costs[at]=cost;
 }
 pop():readonly [number,number] {
  if(!this.size)throw Error('Empty drainage frontier');
  const result=[this.#ids[0]!,this.#costs[0]!] as const,id=this.#ids.pop()!,cost=this.#costs.pop()!;
  if(!this.size)return result;
  let at=0;
  while(at*4+1<this.size){
   let best=at*4+1;
   for(let i=best+1;i<Math.min(at*4+5,this.size);i++)if(this.#costs[i]!<this.#costs[best]!)best=i;
   if(cost<=this.#costs[best]!)break;
   this.#ids[at]=this.#ids[best]!;this.#costs[at]=this.#costs[best]!;at=best;
  }
  this.#ids[at]=id;this.#costs[at]=cost;return result;
 }
}
export interface WorldDrainage {roots:number[];parent:Int32Array;firstChild:Int32Array;nextSibling:Int32Array;closed:Uint8Array}
export function worldRiverEvaporation(temperature:number,flow:number):number {
 const exponent=f(f(f(18.678)-f(temperature/f(234.5)))*f(temperature/f(f(257.14)+temperature)));
 const constant=f(f(f(.61121)*f(Math.exp(exponent)))/f(temperature+273));
 return f(f(constant*f(Math.pow(flow,.5)))*250);
}
export function buildWorldDrainage(tiles:readonly DrainageTile[]):WorldDrainage {
 const count=tiles.length,roots:number[]=[],parent=new Int32Array(count).fill(-1),costs=new Int32Array(count),closed=new Uint8Array(count),implied=new Float32Array(count),lowest=new Int32Array(count).fill(-1);
 for(let id=0;id<count;id++)implied[id]=f(tiles[id]!.elevation+RELIEF_HEIGHT[tiles[id]!.hilliness]);
 for(let id=0;id<count;id++){
  const tile=tiles[id]!;let minimum=Infinity;
  for(const next of tile.neighbours){if(next<0||next>=count||next===id)throw Error('Invalid drainage graph');if(implied[next]!<minimum){minimum=implied[next]!;lowest[id]=next;}}
  if(tile.biome==='ocean'&&tile.neighbours.some(n=>tiles[n]!.biome!=='ocean'))roots.push(id);
 }
 const frontier=new DrainageQueue();for(const root of roots){parent[root]=root;frontier.push(root,0);}
 while(frontier.size){
  const [id,cost]=frontier.pop();if(closed[id]||costs[id]!==cost)continue;
  for(const next of tiles[id]!.neighbours){
   if(closed[next]||tiles[next]!.elevation<=0)continue;
   const multiplier=lowest[next]===id?1:2,edge=roundWorldInteger(f(multiplier*evaluateClimateCurve(ELEVATION_COST,f(implied[id]!-implied[next]!)))),candidate=(cost+edge)|0;
   if(parent[next]!==-1&&candidate>=costs[next]!)continue;
   parent[next]=id;costs[next]=candidate;frontier.push(next,candidate);
  }
  closed[id]=1;
 }
 const firstChild=new Int32Array(count).fill(-1),nextSibling=new Int32Array(count).fill(-1);
 for(let id=count-1;id>=0;id--){const p=parent[id]!;if(!closed[id]||p===id||p<0)continue;nextSibling[id]=firstChild[p]!;firstChild[p]=id;}
 return {roots,parent,firstChild,nextSibling,closed};
}
function accumulateBasinFlow(tiles:readonly DrainageTile[],drainage:WorldDrainage,root:number,flow:Float32Array):void {
 const order:number[]=[],stack=[root];
 while(stack.length){const id=stack.pop()!;order.push(id);for(let child=drainage.firstChild[id]!;child>=0;child=drainage.nextSibling[child]!)stack.push(child);}
 for(let i=order.length-1;i>=0;i--){const id=order[i]!;let total=f(tiles[id]!.rainfall);for(let child=drainage.firstChild[id]!;child>=0;child=drainage.nextSibling[child]!)total=f(total+flow[child]!);flow[id]=Math.max(0,f(total-worldRiverEvaporation(tiles[id]!.meanTemperature,total)));}
}

export function generateWorldRivers(tiles:readonly DrainageTile[],rootSeed:number,drainage=buildWorldDrainage(tiles)):{links:WorldRiverLink[][];riverDistance:Int32Array;flow:Float32Array} {
 const links:WorldRiverLink[][]=Array.from({length:tiles.length},()=>[]),riverDistance=new Int32Array(tiles.length),random=new WorldGenerationRandom(combineWorldSeed(rootSeed,605014749)),flow=new Float32Array(tiles.length);
 const overlay=(from:number,to:number,river:WorldRiverId)=>{
  const index=links[from]!.findIndex(link=>link.neighbour===to),old=index<0?undefined:links[from]![index]!.river;
  if(old&&(old===river||WORLD_RIVERS[old].degrade>=WORLD_RIVERS[river].degrade))return;
  if(index>=0){
   const reverse=links[to]!.findIndex(link=>link.neighbour===from);if(reverse<0)throw Error('Non-reciprocal existing river');
   links[from]!.splice(index,1);links[to]!.splice(reverse,1);
  }
  links[from]!.push({neighbour:to,river});links[to]!.push({neighbour:from,river});
  riverDistance[to]=Math.max(riverDistance[to]!,riverDistance[from]!+1);
 };
 type Extension={from:number;to:number;river:WorldRiverId};
 const extend=(start:Extension)=>{
  // Explicit frames preserve recursive main-child-before-branches order.
  const frames:{node:number;incoming:WorldRiverId;main:number;next:number;started:boolean}[]=[{node:start.to,incoming:start.river,main:-1,next:-1,started:false}];
  while(frames.length){
   const frame=frames[frames.length-1]!,definition=WORLD_RIVERS[frame.incoming];
   if(!frame.started){
    frame.started=true;let maximum=-Infinity;
    for(let c=drainage.firstChild[frame.node]!;c>=0;c=drainage.nextSibling[c]!)if(flow[c]!>maximum){maximum=flow[c]!;frame.main=c;}
    frame.next=drainage.firstChild[frame.node]!;
    if(frame.main>=0){let river:WorldRiverId|null=frame.incoming;while(river&&WORLD_RIVERS[river].degrade>flow[frame.main]!)river=WORLD_RIVERS[river].child;
     if(river){overlay(frame.node,frame.main,river);frames.push({node:frame.main,incoming:river,main:-1,next:-1,started:false});continue;}}
   }
   let branchAdded=false;
   while(frame.next>=0){
    const child=frame.next;frame.next=drainage.nextSibling[child]!;if(child===frame.main)continue;
    let branch:RiverDefinition['branches'][number]|undefined;
    for(const candidate of definition.branches)if(candidate.flow<=flow[child]!&&(!branch||candidate.flow>branch.flow))branch=candidate;
    if(branch&&random.value()<f(branch.chance)){overlay(frame.node,child,branch.river);frames.push({node:child,incoming:branch.river,main:-1,next:-1,started:false});branchAdded=true;break;}
   }
   if(!branchAdded)frames.pop();
  }
 };
 for(const root of drainage.roots){
  // Flow of later coastal basins remains zero until their own turn. The
  // emission scans all geometric neighbours, including other ocean roots.
  accumulateBasinFlow(tiles,drainage,root,flow);
  for(const next of tiles[root]!.neighbours){
  let river:WorldRiverId|undefined;
  for(const candidate of RIVER_ORDER){const def=WORLD_RIVERS[candidate];if(def.spawn>0&&def.spawn<=flow[next]!&&(!river||def.spawn>WORLD_RIVERS[river].spawn))river=candidate;}
  if(river&&random.value()<f(WORLD_RIVERS[river].chance)){overlay(root,next,river);extend({from:root,to:next,river});}
 }
 }
 return {links,riverDistance,flow};
}
