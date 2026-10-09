import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';

/** Shared with the constructed floor placements, whose bottom is .024. */
export const FLOOR_SURFACE_Y = .062;
export const FILTH_SURFACE_OFFSET = .009;
export type FilthSurface = Pick<World, 'width' | 'height' | 'tiles'>;
export interface SurfaceBounds { minX: number; minZ: number; maxX: number; maxZ: number }
export interface SurfacePatch extends SurfaceBounds { height: number }

/** TerrainLayer builds horizontal land at zero and water at waterSurface.
 * Constructed floors cover their complete cell and take precedence. */
export function surfaceHeightAtCell(surface: FilthSurface, x: number, z: number): number | undefined {
  if (x < 0 || z < 0 || x >= surface.width || z >= surface.height) return undefined;
  const tile = surface.tiles[z * surface.width + x];
  return tile ? tile.floor ? FLOOR_SURFACE_Y : tile.terrain === 'water' ? WORLD_SCALE.waterSurface : 0 : undefined;
}

/** Use the same Float32 pose and shape that the resident GPU attributes use.
 * A small conservative margin includes rounding at a neighbouring cell edge;
 * the original rotated quad still defines the stain's exact coverage. */
export function filthDecalBounds(decal: { x: number; z: number; width: number; height: number; rotation: number }): SurfaceBounds {
  const x = Math.fround(decal.x), z = Math.fround(decal.z), angle = Math.fround(decal.rotation);
  const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
  const halfX = (c * Math.fround(decal.width) + s * Math.fround(decal.height)) / 2 + .0001;
  const halfZ = (s * Math.fround(decal.width) + c * Math.fround(decal.height)) / 2 + .0001;
  return { minX: x - halfX, minZ: z - halfZ, maxX: x + halfX, maxZ: z + halfZ };
}

/** Disjoint rectangles cover the supported footprint. Merge runs across cells
 * and rows so a uniform region remains one instance per physical filth layer.
 * Only changed surface heights introduce clipping; no atlas or alpha changes. */
export function filthSurfacePatches(surface: FilthSurface, bounds: SurfaceBounds): SurfacePatch[] {
  const minX = Math.max(bounds.minX, -.5), minZ = Math.max(bounds.minZ, -.5);
  const maxX = Math.min(bounds.maxX, surface.width - .5), maxZ = Math.min(bounds.maxZ, surface.height - .5);
  if (minX >= maxX || minZ >= maxZ) return [];
  const firstX = Math.max(0, Math.floor(minX + .5)), lastX = Math.min(surface.width - 1, Math.floor(maxX + .5));
  const firstZ = Math.max(0, Math.floor(minZ + .5)), lastZ = Math.min(surface.height - 1, Math.floor(maxZ + .5));
  const patches: SurfacePatch[] = [];
  let previousRow = new Map<string, SurfacePatch>();
  for (let z = firstZ; z <= lastZ; z++) {
    const lowZ = Math.max(minZ, z - .5), highZ = Math.min(maxZ, z + .5);
    if (lowZ >= highZ) continue;
    const row: SurfacePatch[] = [];
    for (let x = firstX; x <= lastX; x++) {
      const lowX = Math.max(minX, x - .5), highX = Math.min(maxX, x + .5), height = surfaceHeightAtCell(surface, x, z);
      if (lowX >= highX || height === undefined) continue;
      const previous = row.at(-1);
      if (previous && previous.height === height && previous.maxX === lowX) previous.maxX = highX;
      else row.push({ minX: lowX, minZ: lowZ, maxX: highX, maxZ: highZ, height });
    }
    const nextRow = new Map<string, SurfacePatch>();
    for (const patch of row) {
      const key = `${patch.minX}:${patch.maxX}:${patch.height}`, previous = previousRow.get(key);
      if (previous && previous.maxZ === patch.minZ) { previous.maxZ = patch.maxZ; nextRow.set(key, previous); }
      else { patches.push(patch); nextRow.set(key, patch); }
    }
    previousRow = nextRow;
  }
  return patches;
}
