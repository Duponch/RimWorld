import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Original Core-only initial snow calculation on a fresh real geographic
 * landscape. Physical depths use the existing Tile/SnowState authority. */
import {createWorldPerlin} from './world-coherent-noise.ts';
import {caveRadialPattern256} from './local-cave-radial-256.ts';
import {geographicLongitudeOffsetCore256,geographicSeasonTemperature256,type ClimateDefinition} from './site-climate.ts';
import {roofCells} from './roof-rules.ts';
import {snowFullCells,terrainRetainsSnow,setSnowDepth,initializeGeographicSnowSurface256} from './snow-surface.ts';
import {isNaturalTerrain256} from './local-terrain-definitions-256.ts';
import {FLOOR_DEFINITIONS} from './flooring.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {World,Tile} from './types.ts';
const f=Math.fround;
export const INITIAL_SNOW_SEED_PART_256=306693816;
const YEAR_CORE=3600000,TWELFTH_CORE=300000;
export type InitialSnowLandscape256=Pick<World,'tick'|'width'|'height'|'tiles'|'structures'|'roofing'|'snow'>&{schemaVersion:number;site?:{revision:number;tileId?:number};climate?:World['climate']};
export interface InitialSnowSeason256 {readonly twelfth:number;readonly coldTwelfths:number;readonly baseAmount:number;readonly seasonalTemperature:number;readonly averages:readonly number[]}
export interface InitialSnowPlan256 extends InitialSnowSeason256 {readonly depths:Float32Array;readonly noiseSeed:number|null;readonly random:Readonly<{seed:number;counter:number}>}
const roundEven=(v:number)=>{const a=Math.floor(v),part=v-a;return part<.5?a:part>.5?a+1:a%2===0?a:a+1;};
/** Seasonal-only120 hourly samples, including Core float accumulation. No
 * current weather, sun-cycle/day noise, condition or latitude preset enters. */
export function initialSnowTwelfthMean256(definition:ClimateDefinition,twelfth:number):number {
 if(!Number.isInteger(twelfth)||twelfth<0||twelfth>11)throw Error('Invalid actual snow twelfth');
 let sum=0;
 for(let hour=0;hour<120;hour++){const tick=twelfth*TWELFTH_CORE+30000+roundEven(f(f(hour/120)*TWELFTH_CORE));sum=f(sum+geographicSeasonTemperature256(definition,tick));}
 return f(sum/120);
}
export function initialSnowSeason256(definition:ClimateDefinition,localCoreTick:number,absoluteCoreTick:number):InitialSnowSeason256 {
 if(!Number.isSafeInteger(localCoreTick)||!Number.isSafeInteger(absoluteCoreTick)||![definition.meanTemperature,definition.amplitude,definition.latitude,definition.longitude,definition.rainfall].every(Number.isFinite))throw Error('Invalid actual snow climate/clock');
 const twelfth=Math.floor(((localCoreTick%YEAR_CORE)+YEAR_CORE)%YEAR_CORE/TWELFTH_CORE),averages:number[]=[];
 let coldTwelfths=0;
 for(let offset=-2;offset<=0;offset++){const which=(twelfth+offset+12)%12,average=initialSnowTwelfthMean256(definition,which);averages.push(average);if(average<0)coldTwelfths++;}
 const seasonalTemperature=geographicSeasonTemperature256(definition,absoluteCoreTick);
 let baseAmount=coldTwelfths===0?0:coldTwelfths===1?f(.3):coldTwelfths===2?f(.7):1;
 if(seasonalTemperature>0)baseAmount=f(baseAmount*f(.4));
 return {twelfth,coldTwelfths,baseAmount,seasonalTemperature,averages};
}
/** All actual Core terrain/floor/bridge definitions delivered here inherit
 * meltSnowRadius=0: no Core XML override exists. This is an explicit bounded
 * admission, not an all-clear fallback for an unknown future terrain. */
export function initialTerrainMeltSnowRadius256(tile:Pick<Tile,'terrain'|'bridge'|'floor'>):number {
 if(tile.terrain!=='rock'&&tile.terrain!=='packed-dirt'&&!isNaturalTerrain256(tile.terrain))throw Error('Initial snow requires an actual resolved Core terrain');
 if(tile.floor&&!Object.hasOwn(FLOOR_DEFINITIONS,tile.floor))throw Error('Unresolved initial snow floor');return 0;
}
/** Same physical AddDepth clamp/epsilon. A small changed delta consumes the
 * visual-dirty chance draw even though this product never renders on RNG. */
function addDepth(depths:Float32Array,cell:number,delta:number,retains:(cell:number)=>boolean,random:WorldGenerationRandom):void {
 const before=depths[cell]!;delta=f(delta);
 if(before<=0&&delta<0||before>=f(.999)&&delta>1)return;
 if(!retains(cell)){depths[cell]=0;return;}
 const after=f(Math.max(0,Math.min(1,f(before+delta)))),difference=f(after-before);
 if(Math.abs(difference)<=f(.0001))return;
 depths[cell]=after;if(Math.abs(difference)<=f(.15))random.value();
}
/** Initial Terrain.meltSnowRadius uses depthâˆ’1 with radial linear falloff,
 * exact shared radial order and no roof test. Current Core calls none (r=0).
 * Exported for a genuinely resolved nonzero terrain, never invented by caller. */
export function addInitialSnowRadial256(input:{width:number;height:number;depths:Float32Array;center:number;radius:number;retains(cell:number):boolean},random:WorldGenerationRandom):void {
 const {width,height,depths,center}=input,radius=f(input.radius);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>400||height>400||depths.length!==width*height||!Number.isInteger(center)||center<0||center>=depths.length||!Number.isFinite(radius)||radius<=0)throw Error('Invalid actual initial snow radial');
 const {count,offsets}=caveRadialPattern256(radius);if(radius>offsets[offsets.length-1]![2])throw Error('Initial snow radius exceeds the real radial pattern');
 const x=center%width,z=Math.floor(center/width);
 for(let i=0;i<count;i++){
  const [dx,dz,distance]=offsets[i]!,nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=width||nz>=height)continue;
  const factor=f(1-f(distance/radius));addDepth(depths,nz*width+nx,f(-factor),input.retains,random);
 }
}
/** Read real climate4 and physical owners. Preparation has no World writes;
 * terminal RNG is the supplied GenStep stream. Call only at initial creation,
 * not on migration, import, reload or selection of an already-created map. */
export function prepareInitialSnow256(map:InitialSnowLandscape256,random:WorldGenerationRandom):InitialSnowPlan256 {
 const {width,height}=map,n=width*height,climate=map.climate;
 if(!isSchema256Or257(map.schemaVersion)||map.site?.revision!==3||!climate||climate.revision!==4||climate.tileId!==map.site.tileId||climate.adoptedAt!==map.tick||!Number.isSafeInteger(map.tick)||map.tick<0||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>400||height>400||map.tiles.length!==n||map.snow!==undefined||map.tiles.some(t=>'snowDepth' in t))throw Error('Initial snow requires a fresh real geographic map and its actual climate');
 const civil=climate.calendarOrigin+map.tick-climate.adoptedAt,localCore=civil*10,absoluteCore=localCore-geographicLongitudeOffsetCore256(climate.definition.longitude);
 const season=initialSnowSeason256(climate.definition,localCore,absoluteCore),depths=new Float32Array(n),roofs=roofCells(map),full=snowFullCells(map),radii=new Float32Array(n);
 for(let i=0;i<n;i++)radii[i]=initialTerrainMeltSnowRadius256(map.tiles[i]!);
 const retains=(i:number)=>terrainRetainsSnow(map.tiles[i]!.terrain,!!map.tiles[i]!.bridge)&&map.tiles[i]!.terrain!=='rock'&&!map.tiles[i]!.collapsedRock&&!full.has(i);
 let noiseSeed:number|null=null,noise:ReturnType<typeof createWorldPerlin>|undefined;
 // C# compares float baseAmount converted to DOUBLE against literal0.4.
 // Thus f32(1*.4)>.4 is true, deliberately retained here.
 if(season.baseAmount>.4)for(let i=0;i<n;i++)if(!roofs.has(i)){
  if(!noise){noiseSeed=random.integer(0,651431);noise=createWorldPerlin({frequency:0.03999999910593033,lacunarity:2,persistence:.5,octaves:5,seed:noiseSeed,quality:'medium'});}
  const value=Math.max(.5,f(f(f(noise(i%width,0,Math.floor(i/width)))+1)*f(.5))),amount=f(season.baseAmount*value);
  addDepth(depths,i,amount,retains,random);
 }
 // ColdTwelfths=0 returns from GenStep before the terrain-radius loop.
 if(season.coldTwelfths)for(let i=0;i<n;i++)if(radii[i]!>0)addInitialSnowRadial256({width,height,depths,center:i,radius:radii[i]!,retains},random);
 return {...season,depths,noiseSeed,random:random.state};
}
/** Synchronous creation-only commit through the existing physical writer.
 * No shadow snow grid/state or historical progress is installed. */
export function initializeGeographicInitialSnow256(world:World,random:WorldGenerationRandom):InitialSnowPlan256 {
 const plan=prepareInitialSnow256(world,random);initializeGeographicSnowSurface256(world);
 for(let i=0;i<plan.depths.length;i++)if(plan.depths[i]!>0)setSnowDepth(world,i,plan.depths[i]!);
 return plan;
}
