import { isAnimalMeat } from './biome-items.ts';
import { interactionGoals, routeCost, routeToJob, type Reachability } from './pathfinding.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import { ticksUntilRot } from './food-preservation.ts';
import { allowedFood, type FoodItemId } from './food-policy.ts';
import { selfAllowedFood,selfFoodAccessible,assistedFoodAccessible } from './prison-food.ts';
import { capturePrisonTopology } from './prison-space.ts';
import type { RoomTopology } from './room-topology.ts';
import { TICKS_PER_DAY } from './types.ts';
import type { Cell, MaterialPile, Pawn, World } from './types.ts';

/** Neutral adult. Reference mood curve maps raw-food -7 to
 * -82 optimality; survival packs have a -5 definition offset. The +12 bonus
 * for imminent spoilage is applied to physical piles; traits remain open. */
const FOOD_OFFSETS: Readonly<Partial<Record<ItemId, number>>> = {
  wood: -Infinity, 'simple-meal': 16, berries: 0, rice: -82, potato: -82, corn: -82, 'hare-meat': -82, 'survival-meal': -5, 'legacy-portion': 0,
};
export function foodScore(item: ItemId, distance: number): number {
  return (FOOD_OFFSETS[item] ?? (isAnimalMeat(item)||item==='agave-fruit'?-82:-Infinity)) - distance;
}
export function pileFoodScore(world: World, pile: MaterialPile, distance: number): number {
  return foodScore(pile.item, distance) + (ticksUntilRot(pile, world.tick) < TICKS_PER_DAY / 2 ? 12 : 0);
}
export function foodSearchGoals(world: World, pawn: Pawn, sources: readonly MaterialPile[], topology?:RoomTopology): Set<number> {
  if(!topology&&(pawn.prisoner||world.structures.some(s=>s.prisoner)))topology=capturePrisonTopology(world);
  const allowed = selfAllowedFood(world, pawn); sources = sources.filter(p => allowed.includes(p.item as FoodItemId)&&selfFoodAccessible(world,pawn,p,topology));
  if (world.foodRules === 'legacy') return interactionGoals(world, sources.flatMap(p => p.owner.type === 'ground' ? [p.owner] : []));
  let best: MaterialPile | undefined, score = -Infinity;
  for (const pile of sources) {
    if (pile.owner.type !== 'ground') continue;
    const rank = pileFoodScore(world, pile, Math.abs(pawn.x-pile.owner.x)+Math.abs(pawn.z-pile.owner.z));
    if (rank > score || (rank === score && (!best || pile.id < best.id))) { best=pile; score=rank; }
  }
  // If this target is unreachable, the flood exhausts the connected component:
  // selectFood can then find the best accessible fallback without another search.
  return interactionGoals(world, best?.owner.type === 'ground' ? [best.owner] : []);
}
export function selectFood(world: World, pawn: Pawn, sources: readonly MaterialPile[], reachable: Reachability, eater: Pawn = pawn, topology?:RoomTopology): { id: number; path: Cell[]; score: number } | undefined {
  const allowed = eater===pawn?selfAllowedFood(world,pawn):allowedFood(world,eater);
  if(!topology&&(pawn.prisoner||eater.prisoner||world.structures.some(s=>s.prisoner)))topology=capturePrisonTopology(world);
  let best: { id: number; path: Cell[]; score: number } | undefined;
  for (const pile of sources) {
    if (pile.owner.type !== 'ground' || !ITEM_DEFINITIONS[pile.item].nutrition || !allowed.includes(pile.item as FoodItemId)) continue;
    if(!(eater===pawn?selfFoodAccessible(world,pawn,pile,topology):assistedFoodAccessible(world,pawn,eater,pile,topology)))continue;
    // Reference map search uses Manhattan distance for ranking, independently
    // of the Euclidean travel duration and actual reachability of the item.
    const distance = Math.abs(pawn.x - pile.owner.x) + Math.abs(pawn.z - pile.owner.z);
    const score = pileFoodScore(world, pile, distance);
    if (world.foodRules !== 'legacy' && best && score < best.score) continue;
    const path = routeToJob(world, pile.owner, reachable, true);
    if (!path) continue;
    const cost = routeCost(world, path, reachable);
    const rank = world.foodRules === 'legacy' ? -cost : score;
    if (!best || rank > best.score || (rank === best.score && pile.id < best.id)) best = { id: pile.id, path, score: rank };
  }
  return best;
}
