import { float, instanceIndex, uv, varying, vec2 } from 'three/tsl';

// Crop different regions of the same painted map. Staying inside [0, 1]
// avoids a visible wrapping seam on the broad faces of planks and furniture.
export const PATTERN_SPAN = 0.68;
const PHASE_SPAN = 1 - PATTERN_SPAN;

/** Calculate the shifted UV in the vertex stage and interpolate it, so the
 * fragment shader still performs just one texture lookup and no extra math.
 * The instance index is already available in the existing instanced draw. */
export function instancedPatternUv() {
  const seed = float(instanceIndex);
  return varying(uv().mul(PATTERN_SPAN).add(vec2(
    seed.mul(0.61803398875).fract(),
    seed.mul(0.41421356237).fract(),
  ).mul(PHASE_SPAN)));
}
