import {attribute,float,uv,varying,vec2}from'three/tsl';
import {PATTERN_SPAN}from'./texture-variation';

/** Keep the canonical placement's texture phase when spatial batches give it
 * a different local instanceIndex. Float32 represents these integer ordinals
 * exactly; all other operations match instancedPatternUv. */
export function timberPatternUv(){
 const seed=float(attribute('timberOrdinal','float'));
 return varying(uv().mul(PATTERN_SPAN).add(vec2(seed.mul(.61803398875).fract(),seed.mul(.41421356237).fract()).mul(1-PATTERN_SPAN)));
}
