import {unpublishedAncientGeneration256} from './ancient-generation-frontier-256.ts';
/** Specific Core-only GenStep750 placement. No monument, owner or terrain is
 * synthesized here. Call on the SAME fresh physical map after phase700. */
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {World,Tile} from './types.ts';
import {findLocalNotEdgeCell256,assertLocalDimensions256} from './local-cell-selection-256.ts';
import {START_STRUCTURE_PHYSICS_256} from './player-start-physics-256.ts';
import {NATURAL_MINEABLE_DEFS_256} from './local-mineable-owner-256.ts';
import {isRoadFloor256} from './road-ground-256.ts';
import {terrainSupportsAffordance256,naturalPlantSubstrate256} from './natural-terrain-runtime-256.ts';
export type AncientStep256='ruins'|'shrines';
export interface AncientRect256 {minX:number;minZ:number;maxX:number;maxZ:number}
export const ANCIENT_STEP_SEEDS_256={ruins:1348417666,shrines:1801222485} as const;
export const RUIN_DESTROY_CHANCE_EXP_256=Math.fround(1.32);
export const ANCIENT_STEP_DEFINITIONS_256={ruins:{defName:'ScatterRuinsSimple',order:750,seedPart:1348417666,rate:[0,3],ignoreUsedRectsPadding:true,canBeOnEdge:true},shrines:{defName:'ScatterShrines',order:750,seedPart:1801222485,rate:[.12,.25],ignoreUsedRectsPadding:false,canBeOnEdge:false}} as const;
const f=Math.fround,int=(v:number,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const round=(x:number)=>{const n=Math.floor(x),p=x-n;return p===.5?n+(n%2):Math.round(x);};
const overlap=(a:AncientRect256,b:AncientRect256)=>a.minX<=b.maxX&&b.minX<=a.maxX&&a.minZ<=b.maxZ&&b.minZ<=a.maxZ;
export function ancientRect256(cell:number,width:number,sizeX:number,sizeZ:number):AncientRect256 {if(!int(cell)||!int(width,1,400)||!int(sizeX,1,30)||!int(sizeZ,1,30))throw Error('Invalid actual ancient rectangle');const x=cell%width-Math.trunc(sizeX/2),z=Math.floor(cell/width)-Math.trunc(sizeZ/2);return {minX:x,minZ:z,maxX:x+sizeX-1,maxZ:z+sizeZ-1};}
export function clipAncientRect256(r:AncientRect256,width:number,height:number):AncientRect256 {return {minX:Math.max(0,r.minX),minZ:Math.max(0,r.minZ),maxX:Math.min(width-1,r.maxX),maxZ:Math.min(height-1,r.maxZ)};}
/** Core rounds the reciprocal density FIRST and uses map.width squared. */
export function ancientCount256(width:number,rate:number):number {if(!int(width,1,400)||!Number.isFinite(rate)||rate<0||rate>3)throw Error('Invalid actual ancient density');if(rate===0)return 0;return round(f(f(width*width)/round(f(10000/f(rate)))));}
/** Same two-draw trapezoid sampling, with Core float operations. Not rejection
 * sampling, an inverse-CDF approximation or a new PRNG stream. */
export function sampleRuinSize256(random:Pick<WorldGenerationRandom,'float'>):number {
 const points=[[f(6),0],[f(6.001),4],[10,1],[30,0]] as const,areas:number[]=[];let total=0;
 for(let i=0;i<3;i++){const a=points[i]!,b=points[i+1]!,area=f(f(b[0]-a[0])*f(a[1]+b[1]));areas.push(area);total=f(total+area);}
 let selected=random.float(0,total);
 for(let i=0;i<3;i++){const area=areas[i]!;if(area<selected){selected=f(selected-area);continue;}const a=points[i]!,b=points[i+1]!,span=f(b[0]-a[0]),sum=f(a[1]+b[1]);let offset=f(selected/sum);const t=Math.max(0,Math.min(1,f(offset/span))),height=f(a[1]+f(f(b[1]-a[1])*t));if(random.float(0,f(sum/2))>height)offset=f(span-offset);return round(f(offset+a[0]));}
 throw Error('Ancient size stream did not select its actual curve');
}
/** Shrine override draws two axes, then its base ALSO draws the ruin size.
 * The latter result is unused by EffectiveRectAt but consumes its real draws. */
export function sampleAncientExtent256(kind:AncientStep256,random:Pick<WorldGenerationRandom,'integer'|'float'>):readonly [number,number] {if(kind==='ruins'){const n=sampleRuinSize256(random);return [n,n];}if(kind!=='shrines')throw Error('Unknown ancient step');const x=random.integer(15,21),z=random.integer(15,21);sampleRuinSize256(random);return [x,z];}
/** Core ordering is order THEN Def.index. Require those actual indices instead
 * of guessing an alphabetical or inherited-list order for equal750 steps. */
export function ancientStepOrder256(indices:Readonly<Record<AncientStep256,number>>):readonly AncientStep256[] {if(!int(indices.ruins)||!int(indices.shrines)||indices.ruins===indices.shrines)throw Error('Missing distinct actual GenStep Def indices');return indices.ruins<indices.shrines?['ruins','shrines']:['shrines','ruins'];}
export interface AncientPlacementContext256 {startingMap:boolean;waterCovered:boolean;mapInitializing:true;layoutRects:readonly AncientRect256[];usedRects:AncientRect256[]}
function admitted(w:World,context:AncientPlacementContext256):void {assertLocalDimensions256(w.width,w.height);if(w.schemaVersion!==256||w.site?.revision!==3||w.planet?.revision!==3||context.mapInitializing!==true||typeof context.startingMap!=='boolean'||typeof context.waterCovered!=='boolean'||!unpublishedAncientGeneration256(w,context.mapInitializing))throw Error('Ancient placement requires the true fresh750 frontier');for(const r of [...context.layoutRects,...context.usedRects])if(![r.minX,r.minZ,r.maxX,r.maxZ].every(Number.isInteger)||r.minX>r.maxX||r.minZ>r.maxZ)throw Error('Invalid actual generation rectangle');}
/** Current CanBuildOnTerrain(Wall, stuff=null) tests Wall.Heavy; planned wall
 * Stuff is evaluated separately by the actual spawn transaction. */
export const ancientGenerationGround256=(tile:Tile):Tile=>tile.mineable?{...tile,terrain:tile.mineable.terrain}:tile;
export function ancientRangeAllowed256(w:World,r:AncientRect256,used:readonly AncientRect256[]):boolean {
 if(used.some(u=>overlap(u,r)))return false;
 for(let z=r.minZ;z<=r.maxZ;z++)for(let x=r.minX;x<=r.maxX;x++){if(x<0||z<0||x>=w.width||z>=w.height)return false;const cell=z*w.width+x,t=ancientGenerationGround256(w.tiles[cell]!);const tags=naturalPlantSubstrate256(t).tags;if(tags.includes('River')||tags.includes('Road')||t.floor!==undefined&&isRoadFloor256(t.floor))return false;if(!terrainSupportsAffordance256(t,'Heavy',w))return false;if(w.structures.some(b=>{const def=START_STRUCTURE_PHYSICS_256[b.kind];if(!def)throw Error('Ancient placement encountered an unresolved real edifice');return def.edifice&&importedContains(b,x,z);}))return false;}
 return true;
}
import {footprintCells} from './definitions.ts';
const importedContains=(b:World['structures'][number],x:number,z:number)=>footprintCells(b).some(c=>c.x===x&&c.z===z);
export interface AncientScatterResult256 {requested:number;scattered:number;skipped:boolean;exhausted:boolean}
/** Resolver must create+commit real contents on this World using this SAME
 * stream; it may report an actual ScatterAt no-op, never an empty substitute.
 * A missing resolver refuses BEFORE stream or map mutation. Failure leaves an
 * unpublished generation map; caller must discard it, never publish a prefix. */
export function scatterAncient750256(w:World,kind:AncientStep256,context:AncientPlacementContext256,random:WorldGenerationRandom,resolve:(rect:AncientRect256,random:WorldGenerationRandom)=>'committed'|'scatter-noop'):AncientScatterResult256 {
 admitted(w,context);if(kind!=='ruins'&&kind!=='shrines'||typeof resolve!=='function')throw Error('Actual ancient layout resolver unavailable');
 if(kind==='ruins'?context.waterCovered:!context.startingMap&&random.value()<.75)return {requested:0,scattered:0,skipped:true,exhausted:false};
 const count=ancientCount256(w.width,kind==='ruins'?random.float(0,3):random.float(.12,.25)),spots:number[]=[];let scattered=0;
 for(let i=0;i<count;i++){const [sx,sz]=sampleAncientExtent256(kind,random);const cell=findLocalNotEdgeCell256(w.width,w.height,5,c=>{
  const x=c%w.width,z=Math.floor(c/w.width);if(context.layoutRects.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ)||spots.some(p=>(p%w.width-x)**2+(Math.floor(p/w.width)-z)**2<=100)||!terrainSupportsAffordance256(ancientGenerationGround256(w.tiles[c]!),'Heavy',w))return false;
  const r=clipAncientRect256(ancientRect256(c,w.width,sx,sz),w.width,w.height);if(!ancientRangeAllowed256(w,r,context.usedRects))return false;
  if(kind==='shrines'){const full=ancientRect256(c,w.width,sx,sz);if(context.usedRects.some(u=>overlap(full,{minX:u.minX-2,minZ:u.minZ-2,maxX:u.maxX+2,maxZ:u.maxZ+2})))return false;let rock=false;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,nz=z+dz;if(nx>=0&&nz>=0&&nx<w.width&&nz<w.height&&(()=>{const t=w.tiles[nz*w.width+nx]!;return t.mineable&&t.stone&&t.mineable.def===NATURAL_MINEABLE_DEFS_256[t.stone];})())rock=true;}if(!rock)return false;}return true;
 },random);
  if(cell===null)return {requested:count,scattered,skipped:false,exhausted:true};spots.push(cell);const full=ancientRect256(cell,w.width,sx,sz),rect=clipAncientRect256(full,w.width,w.height);
  if(kind==='shrines'&&(rect.minX!==full.minX||rect.minZ!==full.minZ||rect.maxX!==full.maxX||rect.maxZ!==full.maxZ))continue;
  if(!ancientRangeAllowed256(w,rect,context.usedRects))continue;
  if(kind==='shrines')context.usedRects.push(rect);
  const result=resolve(rect,random);if(result!=='committed'&&result!=='scatter-noop')throw Error('Actual ancient resolver did not account for its output');if(result==='committed')scattered++;
 }
 return {requested:count,scattered,skipped:false,exhausted:false};
}
