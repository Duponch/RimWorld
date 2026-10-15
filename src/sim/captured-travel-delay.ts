/** Captured edge costs outlive their source. Do not recompute them from the
 * current furniture/floor: those may change while the admitted edge finishes. */
export function validCapturedTravelDelay(value: unknown, version: number): boolean {
  if (value === undefined) return true;
  if (typeof value !== 'number' || !Number.isFinite(value) || version < 16) return false;
  // Snow captures survive removal of their source, as do known-trap additions.
  if (version >= 239 && [.4, .8, 1.2, 4.4, 4.8, 5.2].includes(value)) return true;
  // V226 captures the known-trap delay in addition to the historical cost.
  if (version >= 226 && [4, 4.1, 4.2, 5.4, 6, 7, 8.2, 9].includes(value)) return true;
  if (version < 22) return value === 1.4;
  if (value === .1) return version >= 89; // Burned wooden floor, pathCost 1 Core.
  if (value === 2) return version >= 119; // Fence, pathCost 20 Core.
  return (version >= 31 ? [.2, 1.4, 3, 4.2, 5] : version >= 28 ? [.2, 1.4, 3, 4.2] : [1.4, 3, 4.2]).includes(value);
}
