/** Independent coherent gradient/octave mathematics. The public-domain
 * gradient data is separately attributed; no proprietary executable method
 * or third-party implementation is copied. No gameplay or ambient RNG. */
import {WORLD_NOISE_GRADIENTS as vectors} from './world-noise-gradients.ts';
export type NoiseQuality='low'|'medium'|'high';
export interface WorldNoiseOptions {frequency:number;lacunarity:number;persistence?:number;octaves:number;quality:NoiseQuality;seed:number}
const interpolate=(a:number,b:number,t:number)=>(1-t)*a+t*b;
function smooth(t:number,quality:NoiseQuality):number {
 if(quality==='low')return t;
 if(quality==='medium')return t*t*(3-2*t);
 const cube=t*t*t,fourth=cube*t,fifth=fourth*t;
 return 6*fifth-15*fourth+10*cube;
}
function gradient(x:number,y:number,z:number,ix:number,iy:number,iz:number,seed:number):number {
 const mixed=(Math.imul(ix,1619)+Math.imul(iy,31337)+Math.imul(iz,6971)+Math.imul(seed,1013))>>>0;
 const offset=((mixed^(mixed>>>8))&255)*4;
 return ((vectors[offset]!*(x-ix)+vectors[offset+1]!*(y-iy))+vectors[offset+2]!*(z-iz))*2.12;
}
export function coherentWorldNoise(x:number,y:number,z:number,seed:number,quality:NoiseQuality='high'):number {
 const ix=x>0?Math.trunc(x):Math.trunc(x)-1,iy=y>0?Math.trunc(y):Math.trunc(y)-1,iz=z>0?Math.trunc(z):Math.trunc(z)-1;
 const tx=smooth(x-ix,quality),ty=smooth(y-iy,quality),tz=smooth(z-iz,quality);
 const a=interpolate(gradient(x,y,z,ix,iy,iz,seed),gradient(x,y,z,ix+1,iy,iz,seed),tx);
 const b=interpolate(gradient(x,y,z,ix,iy+1,iz,seed),gradient(x,y,z,ix+1,iy+1,iz,seed),tx);
 const c=interpolate(gradient(x,y,z,ix,iy,iz+1,seed),gradient(x,y,z,ix+1,iy,iz+1,seed),tx);
 const d=interpolate(gradient(x,y,z,ix,iy+1,iz+1,seed),gradient(x,y,z,ix+1,iy+1,iz+1,seed),tx);
 return interpolate(interpolate(a,b,ty),interpolate(c,d,ty),tz);
}
function nearestEven(value:number):number {
 const floor=Math.floor(value),part=value-floor;
 return part<.5?floor:part>.5?floor+1:floor%2===0?floor:floor+1;
}
export function worldNoiseCoordinate(value:number):number {
 const bound=1073741824;
 if(value<bound&&value> -bound)return value;
 const remainder=value-nearestEven(value/bound)*bound;
 return 2*remainder+(value>=bound?-bound:bound);
}
function validateOptions(o:WorldNoiseOptions):number {
 if(!Number.isFinite(o.frequency)||o.frequency<=0||!Number.isFinite(o.lacunarity)||o.lacunarity<=0||!Number.isFinite(o.octaves)||!Number.isInteger(o.octaves)||!['low','medium','high'].includes(o.quality)||!Number.isInteger(o.seed))throw Error('Invalid world noise options');
 return Math.max(1,Math.min(30,o.octaves));
}
export function createWorldPerlin(o:WorldNoiseOptions):(x:number,y:number,z:number)=>number {
 const octaves=validateOptions(o),persistence=o.persistence??.5,{frequency,lacunarity,seed,quality}=o;
 if(!Number.isFinite(persistence))throw Error('Invalid world noise persistence');
 return (x,y,z)=>{
  x*=frequency;y*=frequency;z*=frequency;let result=0,amplitude=1;
  for(let octave=0;octave<octaves;octave++){
   result+=amplitude*coherentWorldNoise(worldNoiseCoordinate(x),worldNoiseCoordinate(y),worldNoiseCoordinate(z),(seed+octave)|0,quality);
   x*=lacunarity;y*=lacunarity;z*=lacunarity;amplitude*=persistence;
  }
  return result;
 };
}
export function createWorldRidged(o:WorldNoiseOptions):(x:number,y:number,z:number)=>number {
 const octaves=validateOptions(o),{frequency:initialFrequency,lacunarity,seed,quality}=o,weights=new Float64Array(octaves);let frequency=1;
 for(let octave=0;octave<octaves;octave++){weights[octave]=frequency**-1;frequency*=lacunarity;}
 return (x,y,z)=>{
  x*=initialFrequency;y*=initialFrequency;z*=initialFrequency;let result=0,feedback=1;
  for(let octave=0;octave<octaves;octave++){
   let signal=1-Math.abs(coherentWorldNoise(worldNoiseCoordinate(x),worldNoiseCoordinate(y),worldNoiseCoordinate(z),((seed+octave)|0)&2147483647,o.quality));
   signal=signal*signal*feedback;feedback=Math.max(0,Math.min(1,signal*2));result+=signal*weights[octave]!;
   x*=lacunarity;y*=lacunarity;z*=lacunarity;
  }
  return result*1.25-1;
 };
}
