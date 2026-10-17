/** Original nearby-cell sampler over the actual fresh generation regions.
 * Call capture once after physical edits; spawned Pawns do not change regions. */
import {captureGeographicGenerationReachability256,type ActualGenerationRegion256} from './geographic-generation-reachability-256.ts';
import type {ActualStartMap256} from './actual-local-districts-256.ts';
import {footprintCells} from './definitions.ts';
import {START_STRUCTURE_PHYSICS_256} from './player-start-physics-256.ts';
import {WILD_PLANT_GENERATION_FACTS_256} from './wild-plant-generation-data-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
type Rectangle=Readonly<{minX:number;maxX:number;minZ:number;maxZ:number}>;
export type RandomClosewalkCapture256=ReturnType<typeof captureRandomClosewalk256>;
/** No ordering of distinct ThingGrid owners is invented. Equal rectangles give
 * the same adjustment regardless of their registration order; distinct ones
 * explicitly refuse if this exceptional non-Standable root is requested. */
export function captureRandomClosewalk256(map:ActualStartMap256,reachability=captureGeographicGenerationReachability256(map)){
 if(map.width!==reachability.physical.width||map.height!==reachability.physical.height||map.schemaVersion!==256||map.site?.revision!==3)throw Error('Closewalk requires its actual fresh Site3 capture');
 const width=map.width,height=map.height,n=width*height,blocking=new Map<number,Rectangle|null>();
 const valid=(c:number)=>Number.isInteger(c)&&c>=0&&c<n;
 const rectangle=(cells:readonly {x:number;z:number}[]):Rectangle=>Object.freeze({minX:Math.min(...cells.map(c=>c.x)),maxX:Math.max(...cells.map(c=>c.x)),minZ:Math.min(...cells.map(c=>c.z)),maxZ:Math.max(...cells.map(c=>c.z))});
 const same=(a:Rectangle,b:Rectangle)=>a.minX===b.minX&&a.maxX===b.maxX&&a.minZ===b.minZ&&a.maxZ===b.maxZ;
 const add=(cells:readonly {x:number;z:number}[])=>{const box=rectangle(cells);for(const cell of cells){const i=cell.z*width+cell.x;if(!valid(i)||cell.x<0||cell.x>=width||cell.z<0||cell.z>=height)throw Error('Actual blocking footprint outside map');const old=blocking.get(i);blocking.set(i,old===undefined?box:old===null||!same(old,box)?null:old);}};
 for(let i=0;i<n;i++)if(map.tiles[i]!.terrain==='rock'||map.tiles[i]!.collapsedRock)add([{x:i%width,z:Math.floor(i/width)}]);
 for(const thing of map.structures){const fact=START_STRUCTURE_PHYSICS_256[thing.kind];if(!fact)throw Error('Missing actual edifice passability');if(fact.passability!==0)add(footprintCells(thing));}
 for(const frame of map.jobs)if(frame.construction==='frame'&&frame.kind!=='lay-floor'&&frame.kind!=='build-bridge'){
  const kind=frame.furniture?.kind??frame.kind,fact=Object.entries(START_STRUCTURE_PHYSICS_256).find(([k])=>k===kind)?.[1];if(!fact)throw Error('Missing actual frame passability');if(fact.passability!==0)add(footprintCells(frame));
 }
 const plants=new Map<string,string>(Object.values(WILD_PLANT_GENERATION_FACTS_256).map(f=>[f.species,f.passability]));
 for(const plant of map.resources)if(plant.species!==undefined&&plants.get(plant.species)==='PassThroughOnly')add([plant]);
 for(const pile of map.piles)if(pile.kind==='chunk'&&pile.owner.type==='ground')add([pile.owner]);
 // No World, object list, animals or raw grids are retained by this reader.
 return Object.freeze({width,height,physical:reachability.physical,regions:reachability.regions,regionAt:reachability.regionAt,
  adjustNonStandableRoot(cell:number):number {
   const box=blocking.get(cell);if(box===null)throw Error('Ambiguous first non-Standable ThingGrid owner; actual spawn order is required');if(!box)return cell;
   const minX=box.minX-1,maxX=box.maxX+1,minZ=box.minZ-1,maxZ=box.maxZ+1;
   const candidate=(x:number,z:number)=>x>=0&&z>=0&&x<width&&z<height&&reachability.physical.standable(z*width+x)?z*width+x:null;
   for(let x=minX;x<=maxX;x++){const c=candidate(x,minZ);if(c!==null)return c;}
   for(let z=minZ+1;z<=maxZ;z++){const c=candidate(maxX,z);if(c!==null)return c;}
   for(let x=maxX-1;x>=minX;x--){const c=candidate(x,maxZ);if(c!==null)return c;}
   for(let z=maxZ-1;z>minZ;z--){const c=candidate(minX,z);if(c!==null)return c;}
   return cell;
  },
 });
}
function boundsDistanceSquared(box:Rectangle,x:number,z:number):number {const dx=x<box.minX?box.minX-x:x>box.maxX?x-box.maxX:0,dz=z<box.minZ?box.minZ-z:z>box.maxZ?z-box.maxZ:0;return Math.fround(dx*dx+dz*dz);}
function regionRandomCell(capture:RandomClosewalkCapture256,region:ActualGenerationRegion256,random:Pick<WorldGenerationRandom,'value'|'integer'|'float'>):number {
 const b=region.bounds;for(let attempt=0;attempt<1000;attempt++){const x=b.minX===b.maxX?b.minX:random.integer(b.minX,b.maxX+1),z=b.minZ===b.maxZ?b.minZ:random.integer(b.minZ,b.maxZ+1),cell=z*capture.width+x;if(capture.regionAt(cell)===region)return cell;}
 // Cells enumerates actual ownership in z-then-x order; no extra random draw.
 return region.cells[0]!;
}
function weighted(regions:readonly ActualGenerationRegion256[],random:Pick<WorldGenerationRandom,'value'|'integer'|'float'>):ActualGenerationRegion256 {
 let total=0;for(const r of regions)total=Math.fround(total+r.cellCount);if(total<=0)throw Error('Invalid empty region weight');if(regions.length===1)return regions[0]!;
 const value=Math.fround(random.value()*total);let sum=0;for(const r of regions){sum=Math.fround(sum+r.cellCount);if(sum>=value)return r;}throw Error('Unresolved closewalk weighted region');
}
/** Nullable Try boundary; the convenience wrapper below returns the ORIGINAL
 * root on failure, even if its local search origin was adjusted to a Thing edge. */
export function tryRandomClosewalkCellNear256(capture:RandomClosewalkCapture256,rootCell:number,radius:number,random:Pick<WorldGenerationRandom,'value'|'integer'|'float'>,extraValidator?:(cell:number)=>boolean,actualRegionAllows?:(region:ActualGenerationRegion256)=>boolean):number|null {
 if(!Number.isSafeInteger(rootCell)||rootCell<0||rootCell>=capture.width*capture.height||!Number.isInteger(radius)||radius<0||radius>2147483647)throw Error('Invalid closewalk root or radius');
 const root=capture.physical.standable(rootCell)?rootCell:capture.adjustNonStandableRoot(rootCell),first=capture.regionAt(root);
 if(!first||!['normal','portal','fence'].includes(first.type))return null;
 const x=root%capture.width,z=Math.floor(root/capture.width),square=Math.fround(Math.fround(radius)*Math.fround(radius)),seen=new Set<number>([first.id]),queue=[first],working:ActualGenerationRegion256[]=[];
 // Entry predicate is NOT applied to the starting region in RegionTraverser.
 for(let head=0;head<queue.length;head++){
  const r=queue[head]!;working.push(r);
  for(const id of r.links){if(seen.has(id))continue;const next=capture.regions[id];if(!next)throw Error('Actual region link is missing');if((actualRegionAllows?!actualRegionAllows(next):next.type!=='normal')||radius<=1000&&boundsDistanceSquared(next.bounds,x,z)>square)continue;seen.add(id);queue.push(next);}
 }
 const allowed=(cell:number)=>{const dx=cell%capture.width-x,dz=Math.floor(cell/capture.width)-z;return Math.fround(dx*dx+dz*dz)<=square&&capture.physical.standable(cell)&&(!extraValidator||extraValidator(cell));};
 while(working.length){
  const r=weighted(working,random);
  for(let attempt=0;attempt<10;attempt++){const cell=regionRandomCell(capture,r,random);if(allowed(cell))return cell;}
  const cells=[...r.cells];for(let count=cells.length;count>1;){count--;const at=random.integer(0,count+1),last=cells[count]!;cells[count]=cells[at]!;cells[at]=last;}
  for(const cell of cells)if(allowed(cell))return cell;
  regionRandomCell(capture,r,random); // Primary failed Try still consumes this draw.
  working.splice(working.indexOf(r),1);
 }
 return null;
}
export function randomClosewalkCellNear256(capture:RandomClosewalkCapture256,rootCell:number,radius:number,random:Pick<WorldGenerationRandom,'value'|'integer'|'float'>,extraValidator?:(cell:number)=>boolean):number {return tryRandomClosewalkCellNear256(capture,rootCell,radius,random,extraValidator)??rootCell;}
