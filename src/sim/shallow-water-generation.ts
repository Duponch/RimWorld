import {siteNoise} from './site-noise.ts';
/** Original prospective 2D field, independent of mutable PRNG. Frequency and
 * threshold are Core data; offsets/octaves/shapes and omitted fringes are our
 * explicit adaptation. No generation is run on historical load. */
export const shallowWaterPatchValue=(seed:number,x:number,z:number):number=>.5+.5*siteNoise(seed,x+613,z+297,.015,3,2600);
export const shallowWaterPatchAt=(seed:number,x:number,z:number):boolean=>shallowWaterPatchValue(seed,x,z)>=.76;
