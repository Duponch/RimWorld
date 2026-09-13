/** Lisière art contract, not a claim about RimWorld's physical units.
 * The simulation remains a planar cell grid; visual height adds no walkable floor.
 */
export const WORLD_SCALE = Object.freeze({
  metersPerCell: 1,
  humanHeight: 1.75,
  wallHeight: 2.8,
  wallCutawayHeight: 0.72,
  futureDoorClearance: 2.15,
  bedWidth: 0.84,
  bedLength: 1.9,
  bedFrameHeight: 0.36,
  bedSurfaceHeight: 0.5,
  pileWidth: 0.74,
  pileMaxHeight: 0.48,
  carriedHeight: 1.02,
  carriedForward: 0.37,
  treeMinHeight: 5,
  treeMaxHeight: 7,
  waterSurface: -0.12,
  cameraSpan: 32,
  chunkSize: 16,
});

/** Original procedural rig top is 1.405 units; scale all bind parts together. */
export const PAWN_MODEL_SCALE = WORLD_SCALE.humanHeight / 1.405;
