/** Lisière art contract, not a claim about RimWorld's physical units.
 * The simulation remains a planar cell grid; visual height adds no walkable floor.
 */
export const WORLD_SCALE = Object.freeze({
  lampHeight:1.5, generatorHeight:1.3,
  passiveCoolerHeight: .85,
  metersPerCell: 1,
  humanHeight: 1.75,
  wallHeight: 2.8,
  roofThickness: 0.12,
  wallCutawayHeight: 0.72,
  futureDoorClearance: 2.15,
  stonecutterHeight: 0.85,
  stonecutterWidth: 2.9,
  stonecutterDepth: 0.9,
  tableHeight: 0.76,
  tableWidth: 0.94,
  tableLength: 1.94,
  horseshoeHeight: 0.6,
  stoolHeight: 0.45,
  stoolWidth: 0.42,
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
  // One merged render batch covers a 64-cell square. This is presentation-only:
  // the simulation, cell coordinates and terrain/foliage silhouettes are unchanged.
  chunkSize: 64,
});

/** Original procedural rig top is 1.405 units; scale all bind parts together. */
export const PAWN_MODEL_SCALE = WORLD_SCALE.humanHeight / 1.405;
