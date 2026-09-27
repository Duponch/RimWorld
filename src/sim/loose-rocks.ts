import type { World } from './types.ts';

/** Old colonies stored inert ground pebbles as resources. Keep existing
 * physical chunks intact, but never turn decorations into free haulable stone. */
export function consolidateLooseRocks(world: World): void {
  if (world.resources.some(resource => resource.kind === 'rock'))
    world.resources = world.resources.filter(resource => resource.kind !== 'rock');
}
