import {siteNoise} from './site-noise.ts';
/** Original 2D field reuses our existing gradient noise, never Core code or
 * RNG. Frequency/threshold are reference data, octave3 and offsets local.
 * This field is sampled only on new tundra lowland, not on historical load. */
export const marshPatchValue=(seed:number,x:number,z:number):number=>.5+.5*siteNoise(seed,x+419,z+173,.015,3,2400);
export const marshPatchAt=(seed:number,x:number,z:number):boolean=>marshPatchValue(seed,x,z)>=.83;
