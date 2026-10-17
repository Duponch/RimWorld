import {isNaturalTerrain256,NATURAL_TERRAIN_DEFINITIONS_256} from './local-terrain-definitions-256.ts';
import type { Terrain } from './types.ts';

/** `soil` retains its historical 70% fertility. New sites use grassy ordinary
 * soil, rich soil and gravel for the three distinct Core terrain definitions. */
export function soilFertility(terrain:Terrain):number {
  if(isNaturalTerrain256(terrain))return NATURAL_TERRAIN_DEFINITIONS_256[terrain].fertility;
  return terrain==='grass'?1:terrain==='soil'?.7:0;
}

export const isGrowingTerrain=(terrain:Terrain):boolean=>soilFertility(terrain)>0;
