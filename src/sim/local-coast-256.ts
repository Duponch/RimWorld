/** Original Core4871 coastal scalar composition and ordered terrain pass.
 * The caller supplies the actual mutator-init RNG; no guessed map-component
 * draw count, second gameplay RNG or independently rerolled coast is used. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import {createWorldPerlin} from './world-coherent-noise.ts';
import {NATURAL_TERRAIN_DEFINITIONS_256,type NaturalTerrainId256} from './local-terrain-definitions-256.ts';
const f=Math.fround;
type Field=(x:number,z:number)=>number;
export interface LocalCoastPlan256 {width:number;height:number;angle:number;offset:number;macroSeed:number;detailSeed:number}
function validDimensions(width:number,height:number){return Number.isInteger(width)&&Number.isInteger(height)&&width>=8&&height>=8&&width<=400&&height<=400;}
export function localCoastPlan256(width:number,height:number,angle:number,random:WorldGenerationRandom):LocalCoastPlan256 {
 if(!validDimensions(width,height)||!Number.isFinite(angle)||angle<0||angle>=360)throw Error('Invalid actual ocean coast');
 return {width,height,angle:f(angle),offset:random.float(.1,.2),macroSeed:random.integerValue(),detailSeed:random.integerValue()};
}
function displace(base:Field,frequency:number,strength:number,octaves:number,seed:number):Field {
 const a=createWorldPerlin({frequency:f(frequency),lacunarity:2,persistence:.5,octaves,quality:'medium',seed}),b=createWorldPerlin({frequency:f(frequency),lacunarity:2,persistence:.5,octaves,quality:'medium',seed:(seed+1)|0});
 return (x,z)=>base(x+a(x,0,z)*strength,z+b(x,0,z)*strength);
}
export function createLocalCoastField256(plan:LocalCoastPlan256):Field {
 const {width,height,angle,offset,macroSeed,detailSeed}=plan;
 if(!validDimensions(width,height)||!Number.isFinite(angle)||angle<0||angle>=360||!Number.isFinite(offset)||offset<f(.1)||offset>f(.2)||![macroSeed,detailSeed].every(n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647))throw Error('Invalid coast generation plan');
 const radians=angle*(Math.PI/180),cos=Math.cos(radians),sin=Math.sin(radians),translate=f(width*f(.5-offset)),span=f(width/2);
 const falloff:Field=(x,z)=>{x+=f(-width/2);z+=f(-height/2);return ((cos*x+sin*z+translate)/span)*.5+.5;};
 const displaced=displace(displace(falloff,.006,30,2,macroSeed),.015,25,4,detailSeed);
 return (x,z)=>f(displaced(x,z));
}
export function coastalTerrain256(existing:NaturalTerrainId256,hasRockEdifice:boolean,value:number,roles:{deep:NaturalTerrainId256;shallow:NaturalTerrainId256;beach:NaturalTerrainId256}):NaturalTerrainId256|undefined {
 if(!Number.isFinite(value))throw Error('Invalid coast sample');const definition=NATURAL_TERRAIN_DEFINITIONS_256[existing];
 const chosen=value<f(.4)?roles.deep:value<f(.5)?roles.shallow:value<f(.6)&&!definition.water&&!definition.ice?roles.beach:undefined;
 if(chosen===undefined)return undefined;
 return !definition.stone||!hasRockEdifice&&NATURAL_TERRAIN_DEFINITIONS_256[chosen].water?chosen:undefined;
}
/** Before rock generation, only the deep strip zeroes elevation. Shallow and
 * beach do not flatten mountains to manufacture a successful arrival. */
export function coastalElevation256(elevation:number,value:number):number {
 if(!Number.isFinite(elevation)||!Number.isFinite(value))throw Error('Invalid coastal elevation');return value<f(.4)?0:elevation;
}
