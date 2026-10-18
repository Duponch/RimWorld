/** Original wrapper around the delivered coherent-noise mathematics. Surface
 * tile/date alone own this field: no World, gameplay random draw or clock. */
import {createWorldPerlin} from './world-coherent-noise.ts';
import {combineWorldSeed} from './world-generation-random.ts';
import {surfaceTileHash} from './world-site-geography.ts';
export const IRREGULAR_TEMPERATURE_FREQUENCY_262=4.999999873689376E-06;
const f=Math.fround;
type Entry={noise:(x:number,y:number,z:number)=>number;samples:Map<number,number>};
/** Complete key is actual tile-derived seed plus absolute60Core sample. Fixed
 * algorithm parameters belong to this version. No terrain/climate/World key. */
const bySeed=new Map<number,Entry>(),MAX_TILES=64,MAX_SAMPLES=4;
export function irregularTemperatureSeed262(tileId:number):number{return combineWorldSeed(surfaceTileHash(tileId),199372327);}
export function irregularTemperatureOffset262(tileId:number,absoluteCore:number):number {
 if(!Number.isSafeInteger(absoluteCore)||absoluteCore<0)throw Error('Irregular temperature requires the actual nonnegative absolute Core clock');
 const seed=irregularTemperatureSeed262(tileId),sample=absoluteCore-absoluteCore%60;
 let entry=bySeed.get(seed);if(!entry){entry={noise:createWorldPerlin({frequency:IRREGULAR_TEMPERATURE_FREQUENCY_262,lacunarity:2,persistence:.5,octaves:3,quality:'medium',seed}),samples:new Map()};bySeed.set(seed,entry);if(bySeed.size>MAX_TILES)bySeed.delete(bySeed.keys().next().value!);}
 const cached=entry.samples.get(sample);if(cached!==undefined)return cached;
 // The outdoor producer treats absolute0 as1. Cast BEFORE multiplying; no
 // clamp, absolute value, normalization or sign loss on negative noise.
 const result=f(f(entry.noise(sample===0?1:sample,0,0))*7);entry.samples.set(sample,result);if(entry.samples.size>MAX_SAMPLES)entry.samples.delete(entry.samples.keys().next().value!);return result;
}
/** Exact optional true marker. Old schemas reject it before their neutral
 * migration; accessors, inherited/hidden/undefined/false markers never admit. */
export function validIrregularClimateMarker262(value:object,version:number):boolean {
 const d=Object.getOwnPropertyDescriptor(value,'irregular262');return d?version===262&&d.enumerable===true&&Object.hasOwn(d,'value')&&d.value===true:!('irregular262'in value);
}
