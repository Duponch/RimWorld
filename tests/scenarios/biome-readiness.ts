import type { BiomeId } from '../../src/sim/biome-flora';
import { generateStartingWorld, resolveStartingSite, startingSiteChoices } from '../../src/sim/starting-world';

export const READINESS_BIOMES = ['temperate-forest', 'boreal-forest', 'arid-shrubland'] as const;
export const READINESS_SEEDS = [271828, 314159] as const;
export const BIOME_READINESS_CASES = READINESS_SEEDS.flatMap(seed => READINESS_BIOMES.map(biome => ({ seed, biome })));

/** Fixed rule, no favorable reroll: first accessible non-home tile of this biome.
 * A missing biome is a failed case, never a skipped/replaced seed. */
export function biomeReadinessSite(seed: number, biome: BiomeId) {
  const planet = generateStartingWorld(seed);
  const tile = startingSiteChoices(planet).find(id => id !== 0 && planet.tiles[id]!.biome === biome);
  if (tile === undefined) throw Error('No admissible non-home tile for fixed case ' + seed + '/' + biome);
  const choice = { version: 1 as const, seed, tile };
  return { choice, resolved: resolveStartingSite(choice) };
}
