/** Original prospective mineral scattering. Called inside the RocksFromGrid
 * stream (SeedPart1182952823), before Terrain; never reseed to the nested
 * scatterer's SeedPart. Historical site-ores generation is unchanged. */
import type {WorldGenerationRandom} from './world-generation-random.ts';
import {caveRadialPattern256} from './local-cave-radial-256.ts';
import {assertLocalDimensions256,findLocalNotEdgeCell256} from './local-cell-selection-256.ts';
const f=Math.fround;
export const LOCAL_ORE_ROWS_256=Object.freeze([
 {id:'steel',weight:1,min:30,max:40,hp:1500,yield:40,item:'steel',value:1.9},
 {id:'silver',weight:.1,min:4,max:12,hp:1500,yield:40,item:'silver',value:1},
 {id:'gold',weight:.07,min:2,max:8,hp:1500,yield:40,item:'gold',value:10},
 {id:'uranium',weight:.12,min:6,max:12,hp:4000,yield:40,item:'uranium',value:6},
 {id:'plasteel',weight:.05,min:2,max:8,hp:8000,yield:40,item:'plasteel',value:9},
 {id:'jade',weight:.065,min:2,max:8,hp:1500,yield:40,item:'jade',value:5},
 {id:'machinery',weight:1,min:3,max:6,hp:2000,yield:2,item:'component',value:32},
].map(row=>Object.freeze(row)) as readonly {readonly id:LocalOre256;readonly weight:number;readonly min:number;readonly max:number;readonly hp:number;readonly yield:number;readonly item:string;readonly value:number}[]);
export type LocalOre256='steel'|'silver'|'gold'|'uranium'|'plasteel'|'jade'|'machinery';
export interface LocalOrePlacement256 {readonly cell:number;readonly ore:LocalOre256}
export function localRoundEven256(value:number):number {
 if(!Number.isFinite(value))throw Error('Non-finite generation count');
 const lower=Math.floor(value),fraction=value-lower;return fraction<.5?lower:fraction>.5?lower+1:lower%2===0?lower:lower+1;
}
export function localOreCount256(width:number,hilliness:1|2|3|4|5,nomadicFactor=1):number {
 if(!Number.isInteger(width)||width<1||width>400||![1,2,3,4,5].includes(hilliness)||!Number.isFinite(nomadicFactor)||nomadicFactor<=0)throw Error('Invalid mineable-density provenance');
 const rate=f(f([0,4,8,11,15,16][hilliness]!)*f(nomadicFactor)),denominator=localRoundEven256(f(10000/rate));
 if(denominator<=0)throw Error('Unsupported mineable-density divisor');
 // The installed count helper uses Size.x squared, including rectangular maps.
 return localRoundEven256(f(f(width*width)/denominator));
}
export function chooseLocalOre256(random:WorldGenerationRandom,maxValue=3.4028234663852886e38):LocalOre256|null {
 if(!Number.isFinite(maxValue)||maxValue<0)throw Error('Invalid mineral value limit');
 const weights=LOCAL_ORE_ROWS_256.map(row=>f(row.value)>f(maxValue)?0:f(row.weight));let total=0;for(const weight of weights)total=f(total+weight);if(total===0)return null;
 let remaining=f(total*random.value());for(let index=0;index<weights.length;index++){const weight=weights[index]!;if(weight===0)continue;remaining=f(remaining-weight);if(remaining<=0)return LOCAL_ORE_ROWS_256[index]!.id;}
 // Core falls through into enumeration here, whose zero-weight Def entries
 // also consume draws. Do not fabricate that unknown global Def order.
 throw Error('Weighted-list roundoff requires actual full Def enumeration');
}
/** Initial radial insertion order is retained through removals, matching the
 * installed Mono HashSet slot enumeration for this no-reinsert operation. */
export function localIrregularOreLump256(width:number,height:number,center:number,size:number,allows:(cell:number)=>boolean,random:WorldGenerationRandom):number[] {
 assertLocalDimensions256(width,height);if(!Number.isInteger(center)||center<0||center>=width*height||!Number.isInteger(size)||size<1||size>10000)throw Error('Invalid actual mineral lump');
 const offsets=caveRadialPattern256(0).offsets;if(size*2>offsets.length)throw Error('Excessive radial prefix');
 const x=center%width,z=Math.trunc(center/width),cells=new Set<number>();
 for(let i=0;i<size*2;i++){const offset=offsets[i]!,nx=x+offset[0],nz=z+offset[1];if(nx>=0&&nz>=0&&nx<width&&nz<height){const cell=nz*width+nx;if(allows(cell))cells.add(cell);}}
 const neighbors=(cell:number)=>{const cx=cell%width;let count=0;if(cell>=width&&cells.has(cell-width))count++;if(cx+1<width&&cells.has(cell+1))count++;if(cell+width<width*height&&cells.has(cell+width))count++;if(cx>0&&cells.has(cell-1))count++;return count;};
 while(cells.size>size){let fewest=5;for(const cell of cells)fewest=Math.min(fewest,neighbors(cell));const candidates:number[]=[];for(const cell of cells)if(neighbors(cell)===fewest)candidates.push(cell);cells.delete(candidates[random.integer(0,candidates.length)]!);}
 return [...cells];
}
export interface LocalOreScatteringInputs256 {
 /** Called at each real spawn, including successive replacements. No RNG. */
 onOreSpawn?(cell:number,ore:LocalOre256):void;
 readonly width:number;readonly height:number;readonly hilliness:1|2|3|4|5;readonly waterCovered:boolean;
 readonly naturalEdifices:Uint8Array;readonly caves:Float32Array;
 /** Actual UsedRects union, supplied before this step, not arrival clearing. */
 readonly usedRectCells:ReadonlySet<number>;readonly isStartingMap:boolean;
 /** Required only off the starting map; no implicit difficulty value. */
 readonly nomadicFactor?:number;readonly mapInitializing:boolean;readonly tutorial:boolean;
 readonly maxValue?:number;readonly forcedOre?:LocalOre256;readonly forcedSize?:number;readonly count?:number;
}
export function scatterLocalOres256(input:LocalOreScatteringInputs256,random:WorldGenerationRandom){
 const {width,height,naturalEdifices,caves}=input;assertLocalDimensions256(width,height);const n=width*height;
 if(naturalEdifices.length!==n||caves.length!==n||naturalEdifices.some(value=>value!==0&&value!==1)||caves.some(value=>!Number.isFinite(value)||value<0)||!(input.usedRectCells instanceof Set)||[...input.usedRectCells].some(cell=>!Number.isInteger(cell)||cell<0||cell>=n)||typeof input.waterCovered!=='boolean'||typeof input.isStartingMap!=='boolean'||typeof input.mapInitializing!=='boolean'||typeof input.tutorial!=='boolean'||input.forcedOre!==undefined&&!LOCAL_ORE_ROWS_256.some(row=>row.id===input.forcedOre)||input.forcedSize!==undefined&&(!Number.isInteger(input.forcedSize)||input.forcedSize<0||input.forcedSize>10000)||input.count!==undefined&&(!Number.isSafeInteger(input.count)||input.count<0))throw Error('Invalid actual mineral-scattering inputs');
 const edifices=naturalEdifices.slice(),ores:(LocalOre256|null)[]=Array(n).fill(null),placements:LocalOrePlacement256[]=[],centers:number[]=[];
 if(input.waterCovered)return {edifices,ores,placements,centers,requested:0,exhausted:false,random:random.state};
 if(!input.isStartingMap&&(!Number.isFinite(input.nomadicFactor)||input.nomadicFactor!<=0))throw Error('Missing actual nomadic difficulty factor');
 const requested=input.count??localOreCount256(width,input.hilliness,input.isStartingMap?1:input.nomadicFactor!),maximum=input.maxValue??3.4028234663852886e38;
 if(!Number.isFinite(maximum)||maximum<0)throw Error('Invalid mineral value limit');let exhausted=false;
 for(let lump=0;lump<requested;lump++){
  const center=findLocalNotEdgeCell256(width,height,5,cell=>{if(edifices[cell]!==1)return false;const x=cell%width,z=Math.trunc(cell/width);return !centers.some(prior=>{const dx=prior%width-x,dz=Math.trunc(prior/width)-z;return dx*dx+dz*dz<=25;});},random);
  if(center===null){exhausted=true;break;}centers.push(center);
  if(input.mapInitializing&&input.tutorial)continue;
  const ore=input.forcedOre??chooseLocalOre256(random,maximum);if(ore===null)continue;const row=LOCAL_ORE_ROWS_256.find(value=>value.id===ore)!;
  const size=input.forcedSize&&input.forcedSize>0?input.forcedSize:random.integer(row.min,row.max+1);
  for(const cell of localIrregularOreLump256(width,height,center,size,cell=>!input.usedRectCells.has(cell)&&(!input.mapInitializing||caves[cell]===0),random)){
   input.onOreSpawn?.(cell,ore);edifices[cell]=1;ores[cell]=ore;placements.push({cell,ore});
  }
 }
 return {edifices,ores,placements,centers,requested,exhausted,random:random.state};
}
