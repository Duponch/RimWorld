/** Original scalar composition of the Core4871 local elevation/fertility
 * noise graph. No World, mutable terrain, game PRNG or arrival clearing.
 * Each map-generation step owns its independently seeded stream. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import {localGenerationStepSeed} from './world-site-geography.ts';
import {createWorldPerlin} from './world-coherent-noise.ts';
import type {WorldRelief} from './world-climate-evaluation.ts';
type Field=(x:number,z:number)=>number;
const f=Math.fround;
const ELEVATION_FACTOR:Readonly<Record<WorldRelief,number>>={flat:f(.8),'small-hills':f(.9),'large-hills':1,mountainous:f(1.1),impassable:f(1.2)};
const perlin=(frequency:number,octaves:number,seed:number,quality:'medium'|'high'):Field=>{const n=createWorldPerlin({frequency,lacunarity:2,persistence:.5,octaves,seed,quality});return (x,z)=>n(x,0,z);};
function displace(base:Field,frequency:number,strength:number,octaves:number,seed:number):Field {
 const a=perlin(frequency,octaves,seed,'medium'),b=perlin(frequency,octaves,(seed+1)|0,'medium');
 return (x,z)=>base(x+a(x,z)*strength,z+b(x,z)*strength);
}
const stretchX=(base:Field,factor:number):Field=>(x,z)=>base(x*factor,z);
function turn(base:Field,degrees:number):Field {const angle=degrees*(Math.PI/180),cos=Math.cos(angle),sin=Math.sin(angle);return (x,z)=>base(cos*x+sin*z,-sin*x+cos*z);}
export interface LocalSurfaceFieldSettings {mapSeed:number;hilliness:WorldRelief;waterCovered:boolean;preventNaturalElevation?:boolean}
export interface LocalNoiseDisplacement256 {frequency:number;strength:number;octaves:number;seed:number}
export interface LocalSurfaceNoisePlan256 {
 stepSeed:number;randomState:Readonly<{seed:number;counter:number}>;waterCovered:boolean;factor:number;fertilitySeed:number;
 height:null|{frequency:number;seed:number;detail:LocalNoiseDisplacement256;preStretch:number;firstTurn:number;warp:LocalNoiseDisplacement256;postStretch:number;lastTurn:number};
}
/** Scalar construction plan also supports independent comparison with the
 * installed managed noise primitives, without executing a World or Unity. */
export function localSurfaceNoisePlan256(settings:LocalSurfaceFieldSettings):LocalSurfaceNoisePlan256 {
 if(!Number.isInteger(settings.mapSeed)||settings.mapSeed< -2147483648||settings.mapSeed>0xffffffff||!Object.hasOwn(ELEVATION_FACTOR,settings.hilliness)||typeof settings.waterCovered!=='boolean'||settings.preventNaturalElevation!==undefined&&typeof settings.preventNaturalElevation!=='boolean')throw Error('Invalid actual local surface provenance');
 const stepSeed=localGenerationStepSeed(settings.mapSeed,826504671,0),random=new WorldGenerationRandom(stepSeed);
 const displacement=(lowFrequency:number,highFrequency:number,lowStrength:number,highStrength:number,lowOctaves:number,highOctaves:number):LocalNoiseDisplacement256=>({frequency:random.float(lowFrequency,highFrequency),strength:random.float(lowStrength,highStrength),octaves:random.integer(lowOctaves,highOctaves+1),seed:random.integerValue()});
 const height=settings.preventNaturalElevation?null:{frequency:random.float(.015,.0225),seed:random.integer(0,2147483647),detail:displacement(.03,.06,5,10,4,5),preStretch:random.float(1,1.15),firstTurn:random.float(0,180),warp:displacement(.01,.02,0,15,3,4),postStretch:random.float(1,1.15),lastTurn:random.float(0,180)};
 const fertilitySeed=random.integer(0,2147483647);
 return {stepSeed,randomState:random.state,waterCovered:settings.waterCovered,factor:ELEVATION_FACTOR[settings.hilliness],fertilitySeed,height};
}
export function createLocalSurfaceFields256(settings:LocalSurfaceFieldSettings){
 const plan=localSurfaceNoisePlan256(settings);let elevation:Field=()=>0;
 if(plan.height){const p=plan.height;let base=perlin(p.frequency,3,p.seed,'high');
  base=displace(base,p.detail.frequency,p.detail.strength,p.detail.octaves,p.detail.seed);
  base=turn(stretchX(base,p.preStretch),p.firstTurn);
  base=displace(base,p.warp.frequency,p.warp.strength,p.warp.octaves,p.warp.seed);
  base=turn(stretchX(base,p.postStretch),p.lastTurn);const shape=base;
  elevation=(x,z)=>{const value=f((shape(x,z)*.5+.5)*plan.factor);return plan.waterCovered?Math.min(value,0):value;};
 }
 const fertilityNoise=perlin(f(.021),6,plan.fertilitySeed,'high');
 return {stepSeed:plan.stepSeed,randomState:plan.randomState,sample(x:number,z:number){if(!Number.isInteger(x)||!Number.isInteger(z))throw Error('Local field samples require actual cells');return {elevation:elevation(x,z),fertility:f(fertilityNoise(x,z)*.5+.5)};}};
}
export function generateLocalSurfaceFields256(settings:LocalSurfaceFieldSettings,width:number,height:number):{elevation:Float32Array;fertility:Float32Array}{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>400||height>400)throw Error('Invalid prospective map dimensions');
 const sample=createLocalSurfaceFields256(settings),elevation=new Float32Array(width*height),fertility=new Float32Array(width*height);
 for(let z=0;z<height;z++)for(let x=0;x<width;x++){const value=sample.sample(x,z),index=z*width+x;elevation[index]=value.elevation;fertility[index]=value.fertility;}
 return {elevation,fertility};
}
