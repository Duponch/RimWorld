import type { Reachability } from './pathfinding.ts';
import { clearQueuedOrders } from './player-orders.ts';
import { reservedSource } from './materials.ts';
import { mealQuantity, adultHungerFactor } from './items.ts';
import { TICKS_PER_DAY } from './types.ts';
import { processEating } from './eating.ts';
import { pileFoodScore, foodSearchGoals, selectFood } from './food-selection.ts';
import { updateWellbeing } from './wellbeing.ts';
import { processSleeping } from './sleeping.ts';
import { updateRecreation } from './recreation-rules.ts';
import { updateRest } from './rest.ts';
import { allowedFood, type FoodItemId } from './food-policy.ts';
import type { Cell, Pawn, World } from './types.ts';

// Baseline adult: 1.6 nutrition/day; 100 meter points = one nutrition.
export const HUNGER_PER_TICK = 160 / TICKS_PER_DAY;
export { REST_PER_TICK, BED_REST_PER_TICK, GROUND_REST_PER_TICK } from './rest.ts';
export { PORTION_NUTRITION } from './eating.ts';
export { INGEST_TICKS } from './eating.ts';
const NEED_INTERVAL = 20;

export interface NeedContext {
  search(goals?: ReadonlySet<number>): Reachability | null;
  move(target: Cell, exact: boolean): void;
  release(): boolean;
  event(message: string): void;
}

/** Needs never grant nutrition for a reservation or rest for a nearby bed.
 * All phases use the same movement/search budget and material owners as work.
 */
export function processNeeds(world: World, pawn: Pawn, context: NeedContext): boolean {
  const canPlan = pawn.needCooldown === 0;
  if (pawn.bedId !== null && !world.structures.some(bed => bed.id === pawn.bedId && bed.kind === 'bed')) pawn.bedId = null;

  // Collapse is an emergency interruption, including travel with a meal in hand.
  if ((world.restRules === 'legacy' ? pawn.rest === 0 : pawn.collapsePending) && pawn.need?.kind !== 'sleep') {
    if (!context.release()) return true;
    clearQueuedOrders(world,pawn);
    pawn.need = { kind: 'sleep', phase: 'sleep', bedId: null, target: { x: pawn.x, z: pawn.z } };
    pawn.state = 'sleeping'; pawn.collapsePending = false; pawn.restZeroTicks = 0;
    context.event(`${pawn.name} s’effondre de fatigue au sol.`);
  }

  // A direct player job postpones ordinary needs and schedules; depletion and
  // emergency collapse still run. Queuing behind a need does not interrupt it.
  if(pawn.orders.active!==null)return false;

  // Sleep only ends for hunger if a physically reachable portion can be reserved.
  const wantsFood = pawn.hunger <= (pawn.need?.kind === 'sleep' ? 12.5 : 30);
  let reach: Reachability | null | undefined;
  if (pawn.need?.kind !== 'eat' && wantsFood && canPlan && (world.restRules === 'adult' || pawn.rest > (pawn.need?.kind === 'sleep' ? 5 : 0))) {
    // Its old haul will be released atomically if this replacement is selected.
    const allowed = allowedFood(world, pawn);
    const sources = world.piles.filter(pile => pile.kind === 'food' && allowed.includes(pile.item as FoodItemId) && pile.owner.type === 'ground' && pile.quantity > reservedSource(world, pile.id, pawn.id));
    // A hungry hauler already holding food may reserve a meal quantity for ingestion.
    const held = world.piles.find(pile => pile.owner.type === 'pawn' && pile.owner.pawnId === pawn.id && pile.kind === 'food' && allowed.includes(pile.item as FoodItemId));
    if (sources.length || held) {
      reach = context.search( foodSearchGoals(world, pawn, sources));
      if (!reach) return true; // Budget exhaustion must not be mistaken for inaccessibility.
      const best = selectFood(world, pawn, sources, reach);
      if (held || best) {
        const useHeld = !!held && (!best || world.foodRules === 'legacy' || pileFoodScore(world, held, 0) >= best.score);
        const selected = useHeld ? held! : sources.find(pile => pile.id === best!.id)!;
        const quantity = mealQuantity(pawn, selected, selected.quantity - reservedSource(world, selected.id, pawn.id));
        if (!context.release()) return true; // Deposits cargo at the actor, preserving its identity.
        pawn.need = { kind: 'eat', phase: 'pickup', sourcePileId: selected.id, carryPileId: null, quantity, progress: 0, dining: null };
        pawn.path = useHeld ? [] : best!.path;
        pawn.state = 'moving'; pawn.planCooldown = 0;
      }
    }
    pawn.needCooldown = NEED_INTERVAL;
  }

  if (pawn.need?.kind === 'eat') { processEating(world, pawn, context); return true; }

  if (processSleeping(world, pawn, context, canPlan)) return true;
  if (pawn.hunger <= 20) {
    const job = world.jobs.find(candidate => candidate.id === pawn.jobId);
    if ((job && job.kind !== 'harvest') || pawn.haul) if (!context.release()) return true;
    // Cooking may still provide food for others even under a restrictive diet.
    // Its processor can wait for a navigation budget while keeping its product;
    // do not overwrite the active task's state during that wait.
    if (pawn.jobId === null && pawn.haul === null && !pawn.cooking) pawn.state = 'hungry';
  } else if (pawn.state === 'hungry') pawn.state = 'idle';
  return false;
}

export function updateNeeds(world: World, pawn: Pawn): void {
  pawn.hunger = Math.max(0, pawn.hunger - (world.foodRules === 'legacy' ? 0.015 : HUNGER_PER_TICK * adultHungerFactor(pawn.hunger)));
  updateRest(world, pawn);
  updateRecreation(pawn);
  if (pawn.needCooldown > 0) pawn.needCooldown--;
  updateWellbeing(world, pawn);
}
