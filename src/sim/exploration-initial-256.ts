import {invalidateTerrainJournal} from './terrain-mutation-journal.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Original initial fog, exact physical roots and explicit reachability.
 * Initial-cell RNG belongs to the caller's actual GenStep stream. */
import {caveRadialPattern256} from './local-cave-radial-256.ts';
import {assertExplorationDimensions256,validExplorationCell256,type ExplorationMap256} from './exploration-state-256.ts';
import {floodUnfog256,type ExplorationEffects256,type FogReveal256} from './exploration-flood-256.ts';
import type {FogPhysicalReaders256} from './exploration-physical-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
export const INITIAL_FOG_SEED_PART_256=1568957891;
export interface FogInitialReaders256 {
 standable(cell:number):boolean;roofed(cell:number):boolean;
 /** Actual Reachability.CanReachMapEdge(NoPassClosedDoorsOrWater), NOT an
  * A*.Found/district equality/dry-terrain flood. Required on invalid-start path. */
 canReachMapEdgeNoPassClosedDoorsOrWater?(cell:number):boolean;
}
/** Ephemeral CellFinder ordering only, shared with the real generation context
 * if already used. No persisted grid, register, clock or global hidden cache. */
export interface FogEdgeSelectionContext256 {width:number;height:number;edgeCells:number[]}
function shuffle(values:number[],random:WorldGenerationRandom):void {for(let i=values.length-1;i>0;i--){const j=random.integer(0,i+1),a=values[i]!;values[i]=values[j]!;values[j]=a;}}
function near(map:ExplorationMap256,allows:(cell:number)=>boolean,random:WorldGenerationRandom):number|null {
 const cx=Math.floor(map.width/2),cz=Math.floor(map.height/2),x0=Math.max(0,cx-30),z0=Math.max(0,cz-30),x1=Math.min(map.width,cx+30),z1=Math.min(map.height,cz+30);
 // Current inclusive upper bounds deliberately admit x==width/z==height as
 // rejected samples; do not alias those coordinates to another row's index.
 const accepts=(x:number,z:number)=>x<map.width&&z<map.height&&allows(z*map.width+x),inclusive=(a:number,b:number)=>b<=a?a:random.integer(a,b+1);
 for(let i=0;i<20;i++){const x=inclusive(x0,x1),z=inclusive(z0,z1);if(accepts(x,z))return z*map.width+x;}
 const xs=Array.from({length:x1-x0+1},(_,i)=>x0+i),zs=Array.from({length:z1-z0+1},(_,i)=>z0+i);shuffle(xs,random);shuffle(zs,random);
 for(const x of xs)for(const z of zs)if(accepts(x,z))return z*map.width+x;return null;
}
function canonicalEdge(map:ExplorationMap256):FogEdgeSelectionContext256 {
 const {width,height}=map,edgeCells:number[]=[];
 for(let x=0;x<width;x++)edgeCells.push(x);for(let z=1;z<height;z++)edgeCells.push(z*width+width-1);for(let x=width-2;x>=0;x--)edgeCells.push((height-1)*width+x);for(let z=height-2;z>0;z--)edgeCells.push(z*width);
 return {width,height,edgeCells};
}
function edge(map:ExplorationMap256,allows:(cell:number)=>boolean,random:WorldGenerationRandom,previous:FogEdgeSelectionContext256|undefined):{root:number|null;context?:FogEdgeSelectionContext256} {
 // Native lazy static is created only AFTER all100 quick samples fail.
 for(let i=0;i<100;i++){
  const vertical=random.value()<.5,first=random.value()<.5;
  const cell=vertical?random.integer(0,map.height)*map.width+(first?0:map.width-1):(first?0:map.height-1)*map.width+random.integer(0,map.width);
  if(allows(cell))return {root:cell,...previous?{context:previous}:{}};
 }
 const context=previous??canonicalEdge(map);
 shuffle(context.edgeCells,random);for(const cell of context.edgeCells)if(allows(cell))return {root:cell,context};return {root:null,context};
}
function any(map:ExplorationMap256,allows:(cell:number)=>boolean,random:WorldGenerationRandom):number|null {
 const randomCell=()=>{const x=random.integer(0,map.width),z=random.integer(0,map.height);return z*map.width+x;};
 for(let i=0;i<1000;i++){const cell=randomCell();if(allows(cell))return cell;}
 const valid:number[]=[];for(let x=0;x<map.width;x++)for(let z=0;z<map.height;z++){const cell=z*map.width+x;if(allows(cell))valid.push(cell);}
 if(!valid.length){randomCell();return null;}return valid[random.integer(0,valid.length)]!;
}
export interface InitialExplorationResult256 {readonly root:number|null;readonly reveal:FogReveal256;readonly random:Readonly<{seed:number;counter:number}>;readonly edgeContext?:FogEdgeSelectionContext256}
/** Actual initial creation only, once. No default all-clear, cleanup, reset of
 * an imported map or fake CanReach is allowed. Root invalid and no admission
 * genuinely leaves all fogged, apart from any explicit real rootsToUnfog. */
export function initializeExploration256(map:ExplorationMap256,input:{start:number|null;rootsToUnfog:readonly number[];readers:FogInitialReaders256;edgeContext?:FogEdgeSelectionContext256},physical:FogPhysicalReaders256,random:WorldGenerationRandom,effects:ExplorationEffects256={}):InitialExplorationResult256 {
 assertExplorationDimensions256(map);
 if(!isSchema256Or257(map.schemaVersion)||map.site?.revision!==3||'exploration' in map||map.tiles.some(t=>'fogged' in t)||input.start!==null&&!validExplorationCell256(map,input.start)||input.rootsToUnfog.some(c=>!validExplorationCell256(map,c)))throw Error('Exploration requires an actual fresh Site3 map and roots');
 if(input.start===null&&typeof input.readers.canReachMapEdgeNoPassClosedDoorsOrWater!=='function')throw Error('Actual fog fallback MapEdge reachability is unavailable');
 let context=input.edgeContext;
 if(context&&(context.width!==map.width||context.height!==map.height||context.edgeCells.some(c=>!validExplorationCell256(map,c)||c%map.width!==0&&c%map.width!==map.width-1&&Math.floor(c/map.width)!==0&&Math.floor(c/map.width)!==map.height-1)))throw Error('Invalid actual CellFinder edge context');
 if(context){const expected=canonicalEdge(map).edgeCells,counts=new Map<number,number>();for(const c of expected)counts.set(c,(counts.get(c)??0)+1);for(const c of context.edgeCells)counts.set(c,(counts.get(c)??0)-1);if(expected.length!==context.edgeCells.length||[...counts.values()].some(v=>v!==0))throw Error('Incomplete actual CellFinder edge order');}
 let root=input.start;
 if(root!==null&&physical.makeFog(root)){
  const x=root%map.width,z=Math.floor(root/map.width),{count,offsets}=caveRadialPattern256(5);let found:number|null=null;
  for(let i=0;i<count;i++){const [dx,dz]=offsets[i]!,nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=map.width||nz>=map.height)continue;const cell=nz*map.width+nx;if(!input.readers.roofed(cell)&&input.readers.standable(cell)){found=cell;break;}}root=found;
 }else if(root===null){
  const accepts=(cell:number)=>input.readers.standable(cell)&&!input.readers.roofed(cell)&&input.readers.canReachMapEdgeNoPassClosedDoorsOrWater!(cell);
  root=near(map,accepts,random);if(root===null){const picked=edge(map,accepts,random,context);root=picked.root;context=picked.context;}if(root===null)root=any(map,accepts,random);
 }
 // Preflight selection/dependencies before changing the actual map.
 map.exploration={revision:1};for(const tile of map.tiles)tile.fogged=true;invalidateTerrainJournal(map.tiles);
 const reveal=floodUnfog256(map,root,physical,effects);
 for(const cell of input.rootsToUnfog){const extra=floodUnfog256(map,cell,physical,effects);for(const c of extra.changedCells)reveal.changedCells.push(c);for(const c of extra.interiorCells)reveal.interiorCells.push(c);reveal.lastFloodInteriorCells=extra.interiorCells;
  // GenStep explicitly Unfog(root) even when a Full root cannot flood.
  const visited=new Set<number>([cell,...physical.fullFootprint(cell)]);for(const c of visited)if(map.tiles[c]!.fogged){delete map.tiles[c]!.fogged;invalidateTerrainJournal(map.tiles);reveal.changedCells.push(c);effects.cellUnfogged?.(c);}
 }
 return {root,reveal,random:random.state,...context?{edgeContext:context}:{}};
}
