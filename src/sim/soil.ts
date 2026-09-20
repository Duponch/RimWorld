import type { Terrain } from './types.ts';

/** `soil` retains its historical 70% fertility. New sites use grassy ordinary
 * soil, rich soil and gravel for the three distinct Core terrain definitions. */
export function soilFertility(terrain:Terrain):number {
  return terrain==='grass'?1:terrain==='rich-soil'?1.4:terrain==='soil'||terrain==='gravel'?.7:0;
}

export const isGrowingTerrain=(terrain:Terrain):boolean=>soilFertility(terrain)>0;
