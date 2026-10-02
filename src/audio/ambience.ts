import { listenerPose, type AudioCamera } from './spatial.ts';
import type { World } from '../sim/types.ts';
import { plantGrowth } from '../sim/plants.ts';
import { plantLeafless } from '../sim/plant-life.ts';

/** Global weather follows the map camera but softens as the listener rises. */
export function ambientCameraGain(camera: AudioCamera): number {
  const height = listenerPose(camera).y;
  return Math.max(0.15, 1 / (1 + Math.max(0, height - 2) / 32));
}

const FOLIAGE_CELL = 8;
const FOLIAGE_RADIUS = 28;

/** Snapshot-only canopy census. Bilinear deposition keeps the listening field
 * continuous across cells; camera queries visit a bounded neighbourhood, never
 * resources. This controls one existing rustle loop, not one voice per tree. */
export class FoliageAmbience {
  private density = new Float32Array(0);
  private columns = 0;
  private rows = 0;

  adopt(world: World): void {
    const columns = Math.ceil(world.width / FOLIAGE_CELL) + 1;
    const rows = Math.ceil(world.height / FOLIAGE_CELL) + 1;
    if (columns !== this.columns || rows !== this.rows) {
      this.columns = columns; this.rows = rows;
      this.density = new Float32Array(columns * rows);
    } else this.density.fill(0);
    for (const plant of world.resources) {
      if (plant.kind !== 'tree' && plant.kind !== 'berries') continue;
      if (plant.species === 'saguaro' || plantLeafless(world, plant)) continue;
      const growth = plantGrowth(world, plant);
      const weight = (plant.kind === 'tree' ? 1 : .15) * growth * growth;
      const gx = plant.x / FOLIAGE_CELL, gz = plant.z / FOLIAGE_CELL;
      const x = Math.floor(gx), z = Math.floor(gz), fx = gx - x, fz = gz - z;
      // Resource coordinates are validated by simulation/save boundaries.
      this.density[z * columns + x]! += weight * (1 - fx) * (1 - fz);
      this.density[z * columns + x + 1]! += weight * fx * (1 - fz);
      this.density[(z + 1) * columns + x]! += weight * (1 - fx) * fz;
      this.density[(z + 1) * columns + x + 1]! += weight * fx * fz;
    }
  }

  gain(x: number, z: number): number {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    const radius2 = FOLIAGE_RADIUS * FOLIAGE_RADIUS;
    const minX = Math.max(0, Math.ceil((x - FOLIAGE_RADIUS) / FOLIAGE_CELL));
    const maxX = Math.min(this.columns - 1, Math.floor((x + FOLIAGE_RADIUS) / FOLIAGE_CELL));
    const minZ = Math.max(0, Math.ceil((z - FOLIAGE_RADIUS) / FOLIAGE_CELL));
    const maxZ = Math.min(this.rows - 1, Math.floor((z + FOLIAGE_RADIUS) / FOLIAGE_CELL));
    let canopy = 0;
    for (let iz = minZ; iz <= maxZ; iz++) for (let ix = minX; ix <= maxX; ix++) {
      const d2 = (ix * FOLIAGE_CELL - x) ** 2 + (iz * FOLIAGE_CELL - z) ** 2;
      const weight = Math.max(0, 1 - d2 / radius2);
      canopy += this.density[iz * this.columns + ix]! * weight * weight;
    }
    return 1 - Math.exp(-canopy / 24);
  }
}
