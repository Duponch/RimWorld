import { annualNaturalLight } from './environment.ts';
import { isRoofed } from './roof-rules.ts';
import type { Structure, World } from './types.ts';

export const SOLAR_MAX_OUTPUT = 1700;

/** Fixed four-by-four footprint, anchored at its minimum x/z. The roof query
 * shares the authoritative roofing state; decorative shadows are irrelevant. */
export function solarUnroofedCells(world: World, structure: Structure): number {
  if (structure.kind !== 'solar-generator') return 0;
  let open = 0;
  for (let z = structure.z; z < structure.z + 4; z++) {
    for (let x = structure.x; x < structure.x + 4; x++) {
      if (!isRoofed(world, z * world.width + x)) open++;
    }
  }
  return open;
}

/** Potential output in watts. Power dispatch separately applies the plant's
 * active state. No weather or latitude beyond the current fixed-site profile. */
export function solarPowerOutput(world: World, structure: Structure): number {
  return SOLAR_MAX_OUTPUT * annualNaturalLight(world) * solarUnroofedCells(world, structure) / 16;
}
