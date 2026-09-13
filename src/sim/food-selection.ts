import { interactionGoals, routeCost, routeToJob, type Reachability } from './pathfinding.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import type { Cell, MaterialPile, Pawn, World } from './types.ts';

/** Neutral adult, fresh items only. Reference mood curve maps raw-food -7 to
 * -82 optimality; survival packs have a -5 definition offset. Other modifiers
 * belong here when freshness, traits and food policies become real systems. */
const FOOD_OFFSETS: Readonly<Record<ItemId, number>> = {
  wood: -Infinity, berries: 0, rice: -82, 'survival-meal': -5, 'legacy-portion': 0,
};
export function foodScore(item: ItemId, distance: number): number {
  return FOOD_OFFSETS[item] - distance;
}
export function foodSearchGoals(world: World, pawn: Pawn, sources: readonly MaterialPile[]): Set<number> {
  if (world.foodRules === 'legacy') return interactionGoals(world, sources.flatMap(p => p.owner.type === 'ground' ? [p.owner] : []));
  let best: MaterialPile | undefined, score = -Infinity;
  for (const pile of sources) {
    if (pile.owner.type !== 'ground') continue;
    const rank = foodScore(pile.item, Math.abs(pawn.x-pile.owner.x)+Math.abs(pawn.z-pile.owner.z));
    if (rank > score || (rank === score && (!best || pile.id < best.id))) { best=pile; score=rank; }
  }
  // If this target is unreachable, the flood exhausts the connected component:
  // selectFood can then find the best accessible fallback without another search.
  return interactionGoals(world, best?.owner.type === 'ground' ? [best.owner] : []);
}
export function selectFood(world: World, pawn: Pawn, sources: readonly MaterialPile[], reachable: Reachability): { id: number; path: Cell[]; score: number } | undefined {
  let best: { id: number; path: Cell[]; score: number } | undefined;
  for (const pile of sources) {
    if (pile.owner.type !== 'ground' || !ITEM_DEFINITIONS[pile.item].nutrition) continue;
    // Reference map search uses Manhattan distance for ranking, independently
    // of the Euclidean travel duration and actual reachability of the item.
    const distance = Math.abs(pawn.x - pile.owner.x) + Math.abs(pawn.z - pile.owner.z);
    const score = foodScore(pile.item, distance);
    if (world.foodRules !== 'legacy' && best && score < best.score) continue;
    const path = routeToJob(world, pile.owner, reachable, true);
    if (!path) continue;
    const cost = routeCost(world, path, reachable);
    const rank = world.foodRules === 'legacy' ? -cost : score;
    if (!best || rank > best.score || (rank === best.score && pile.id < best.id)) best = { id: pile.id, path, score: rank };
  }
  return best;
}
