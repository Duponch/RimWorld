import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Original GenStep950 adaptation using the caller's real generation stream. */
import {captureActualLocalDistricts256,type ActualStartMap256} from './actual-local-districts-256.ts';
import {findLocalNotEdgeCell256,assertLocalDimensions256} from './local-cell-selection-256.ts';
import {localIrregularOreLump256} from './local-ore-scattering-256.ts';
import {caveRadialPattern256} from './local-cave-radial-256.ts';
import {isRoadFloor256} from './road-ground-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import {geyserCells256,type LocalGeysers256,type NaturalGeyser256} from './local-geyser-state-256.ts';
import type {World} from './types.ts';
const f=Math.fround;
const specialRadius=(radius:number,w:number,h:number)=>{const half=f(f(Math.sqrt(w*w+h*h))/2);return f(f(radius+half)+half);};
const even=(v:number)=>{const n=Math.floor(v),r=v-n;return r===.5?n+n%2:Math.round(v);};
export type GeyserGenerationMap256=ActualStartMap256&Pick<World,'tick'|'nextId'>&{geysers?:LocalGeysers256};
export interface GeyserGenerationContext256 {
 waterCovered:boolean;
 /** Actual Core-only factors, supplied from the real tile/biome owner. */
 biomeFactor:number;mutatorFactors:readonly number[];
 layoutRects:readonly {minX:number;minZ:number;maxX:number;maxZ:number}[];
 usedRects:readonly {minX:number;minZ:number;maxX:number;maxZ:number}[];
 /** Actual special Things: Core ancient casket (30) only when present.
  * Geysers already present in this generation are owned by the state itself. */
 ancientCaskets:readonly {id:number;x:number;z:number;width:number;height:number}[];
 /** Required true creation flag; never use on imported/played Worlds. */
 mapInitializing:true;
 /** Resolve and preflight REAL edifice identities only if the true clear-lump
  * contains one. A terrain-only placeholder has no ID and must refuse here. */
 planEdificeRemoval(cell:number):{id:number;commit():void}|null;
}
export interface GeyserPlacementPlan256 {readonly geyser:NaturalGeyser256;readonly clearCells:readonly number[];readonly removedPlantIds:readonly number[]}
export function geyserCount256(width:number,rate:number,biomeFactor:number,mutatorFactors:readonly number[]):number {
 if(!Number.isInteger(width)||width<1||width>400||!Number.isFinite(rate)||rate<=0||!Number.isFinite(biomeFactor)||biomeFactor<0||mutatorFactors.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid actual geyser count factors');
 const divisor=even(f(10000/f(rate))),base=even(f(f(width*width)/divisor));let factor=f(biomeFactor);for(const v of mutatorFactors)factor=f(factor*f(v));const result=even(f(base*factor));if(!Number.isSafeInteger(result)||result<0||result>width*width)throw Error('Actual geyser count exceeds the physical map');return result;
}
/** Generates real local owners and vanishes only actual overlapping plants.
 * ClearSpace uses the existing exact radial-pruning lump, not a dry disk.
 * Never grants resources for vanished generation plants/edifices. */
export function generateLocalGeysers256(map:GeyserGenerationMap256,context:GeyserGenerationContext256,random:WorldGenerationRandom):{requested:number;exhausted:boolean;placements:GeyserPlacementPlan256[];random:Readonly<{seed:number;counter:number}>} {
 assertLocalDimensions256(map.width,map.height);
 if(!isSchema256Or257(map.schemaVersion)||map.site?.revision!==3||'geysers' in map||context.mapInitializing!==true||typeof context.waterCovered!=='boolean'||typeof context.planEdificeRemoval!=='function'||!Number.isSafeInteger(map.nextId)||map.nextId<1||map.nextId>2147483647)throw Error('Geysers require a fresh actual Site3 generation owner');
 for(const rect of [...context.layoutRects,...context.usedRects])if(![rect.minX,rect.minZ,rect.maxX,rect.maxZ].every(Number.isInteger)||rect.minX>rect.maxX||rect.minZ>rect.maxZ)throw Error('Invalid actual layout rectangle');
 if(context.ancientCaskets.some(g=>!Number.isSafeInteger(g.id)||g.id<1||![g.x,g.z,g.width,g.height].every(Number.isInteger)||g.width<1||g.height<1))throw Error('Invalid actual special Thing');
 // Validate factor inputs even if water-covered, but consume no generation draw.
 geyserCount256(map.width,.7,context.biomeFactor,context.mutatorFactors);
 const items:NaturalGeyser256[]=[],placements:GeyserPlacementPlan256[]=[];
 if(context.waterCovered){map.geysers={revision:1,atTick:map.tick,items};return {requested:0,exhausted:false,placements,random:random.state};}
 const requested=geyserCount256(map.width,random.float(.7,1),context.biomeFactor,context.mutatorFactors),used:number[]=[];let exhausted=false,nextId=map.nextId;const allRemovals=new Map<number,{id:number;commit():void}>(),allPlants=new Set<number>();
 if(requested===0){map.geysers={revision:1,atTick:map.tick,items};return {requested,exhausted:false,placements,random:random.state};}
 const physical=captureActualLocalDistricts256(map);
 const valid=(c:number)=>c>=0&&c<map.tiles.length;
 const road=(c:number)=>{const t=map.tiles[c]!;return !t.bridge&&(t.floor!==undefined?isRoadFloor256(t.floor):t.terrain==='packed-dirt');};
 const around=caveRadialPattern256(4),inRect=(x:number,z:number,r:GeyserGenerationContext256['usedRects'][number])=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ;
 const terrainFrames=new Set(map.jobs.filter(j=>(j.kind==='lay-floor'||j.kind==='build-bridge')&&j.construction!==undefined).map(j=>j.z*map.width+j.x));
 for(let n=0;n<requested;n++){
  const center=findLocalNotEdgeCell256(map.width,map.height,5,cell=>{
   const x=cell%map.width,z=Math.floor(cell/map.width);if(x<14||z<14||x>=map.width-14||z>=map.height-14||context.layoutRects.some(r=>inRect(x,z,r))||!physical.normalWalkable(cell)||used.some(c=>(c%map.width-x)**2+(Math.floor(c/map.width)-z)**2<=625))return false;
   // Actual Heavy/no-edifice rectangle9x9, not a radial approximation.
   for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++){const c=(z+dz)*map.width+x+dx;if(!physical.heavy(c)||physical.edifice(c))return false;}
   if(context.ancientCaskets.some(g=>(g.x-x)**2+(g.z-z)**2<f(specialRadius(30,g.width,g.height)**2))||items.some(g=>(g.x-x)**2+(g.z-z)**2<f(specialRadius(3,2,2)**2)))return false;
   if(context.usedRects.some(r=>x<=r.maxX&&x+5>=r.minX&&z<=r.maxZ&&z+5>=r.minZ))return false;
   // IsRotationValid chooses the one North rotation even during validation;
   // Core RandomElement of a singleton consumes Range(0,1), not zero draws.
   const footprint=geyserCells256(map.width,{x,z});if(footprint.some(c=>!valid(c)||terrainFrames.has(c)))return false;
   random.integer(0,1);
   for(let i=0;i<around.count;i++){const [dx,dz]=around.offsets[i]!,nx=x+dx,nz=z+dz;if(nx>=0&&nz>=0&&nx<map.width&&nz<map.height&&road(nz*map.width+nx))return false;}return true;
  },random);
  if(center===null){exhausted=true;break;}
  random.integer(0,1); // ScatterAt revalidates/selects North once more.
  const clearCells=localIrregularOreLump256(map.width,map.height,center,30,()=>true,random),removals:{id:number;commit():void}[]=[];
  for(const cell of clearCells)if(physical.edifice(cell)){const removal=context.planEdificeRemoval(cell);if(!removal||!Number.isSafeInteger(removal.id)||removal.id<=0)throw Error('Actual Mineable identity/removal preflight is unavailable');if(!removals.some(r=>r.id===removal.id))removals.push(removal);}
  if(nextId>=2147483647)throw Error('Geyser identity frontier exhausted');
  const g:NaturalGeyser256={id:nextId++,x:center%map.width,z:Math.floor(center/map.width),ticksUntilSpray:500,sprayTicksLeft:0},occupied=new Set(geyserCells256(map.width,g));
  const plants=map.resources.filter(r=>occupied.has(r.z*map.width+r.x));
  if(plants.some(r=>r.kind==='rock')||map.jobs.some(j=>j.plantTarget&&plants.some(r=>r.id===j.plantTarget!.resourceId)))throw Error('Generation plant owner has an unresolved live claim');
  for(const removal of removals)allRemovals.set(removal.id,removal);
  const ids=new Set(plants.map(r=>r.id));for(const id of ids)allPlants.add(id);
  items.push(g);used.push(center);placements.push({geyser:g,clearCells,removedPlantIds:[...ids]});
 }
 // The caller owns this fresh private generation map. Every real identity is
 // preflighted before the first commit; a callback commit must be infallible.
 for(const removal of allRemovals.values())removal.commit();
 if(allPlants.size)map.resources=map.resources.filter(r=>!allPlants.has(r.id));
 map.nextId=nextId;map.geysers={revision:1,atTick:map.tick,items};return {requested,exhausted,placements,random:random.state};
}
