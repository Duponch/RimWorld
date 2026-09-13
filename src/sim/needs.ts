import { adjacent, routeToCell, routeToJob } from './pathfinding.ts';
import type { Reachability } from './pathfinding.ts';
import { reservedSource } from './materials.ts';
import { footprintCells } from './definitions.ts';
import type { Cell, Pawn, World } from './types.ts';

// Existing portion/day units are retained across V2 migration. This delivery
// corrects actions and ownership; numerical food catalogue calibration is separate.
export const HUNGER_PER_TICK = 0.015;
export const REST_PER_TICK = 0.008;
export const PORTION_NUTRITION = 35;
export const INGEST_TICKS = 50;
export const BED_REST_PER_TICK = 100 / (6000 * 10.5 / 24);
export const GROUND_REST_PER_TICK = BED_REST_PER_TICK * 0.8;
const NEED_INTERVAL = 20;
const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.z === b.z;

export interface NeedContext {
  search(ignorePawns?: boolean): Reachability | null;
  move(target: Cell, exact: boolean): void;
  release(): void;
  event(message: string): void;
}

/** Needs never grant nutrition for a reservation or rest for a nearby bed.
 * All phases use the same movement/search budget and material owners as work.
 */
export function processNeeds(world: World, pawn: Pawn, context: NeedContext): boolean {
  pawn.hunger = Math.max(0, pawn.hunger - HUNGER_PER_TICK);
  if (pawn.state !== 'sleeping') pawn.rest = Math.max(0, pawn.rest - REST_PER_TICK);
  if (pawn.needCooldown > 0) pawn.needCooldown--;
  const canPlan = pawn.needCooldown === 0;
  pawn.mood = Math.round(pawn.hunger * 0.6 + pawn.rest * 0.4);
  if (pawn.bedId !== null && !world.structures.some(bed => bed.id === pawn.bedId && bed.kind === 'bed')) pawn.bedId = null;

  // Collapse is an emergency interruption, including travel with a meal in hand.
  if (pawn.rest === 0 && pawn.need?.kind !== 'sleep') {
    context.release();
    pawn.need = { kind: 'sleep', phase: 'sleep', bedId: null, target: { x: pawn.x, z: pawn.z } };
    pawn.state = 'sleeping';
    context.event(`${pawn.name} s’effondre de fatigue au sol.`);
  }

  // Sleep only ends for hunger if a physically reachable portion can be reserved.
  const wantsFood = pawn.hunger <= (pawn.need?.kind === 'sleep' ? 12.5 : 30);
  let reach: Reachability | null | undefined;
  if (pawn.need?.kind !== 'eat' && wantsFood && canPlan && pawn.rest > (pawn.need?.kind === 'sleep' ? 5 : 0)) {
    const sources = world.piles.filter(pile => pile.kind === 'food' && pile.owner.type === 'ground' && pile.quantity > reservedSource(world, pile.id));
    // A hungry hauler already holding food may retain one portion for ingestion.
    const held = world.piles.find(pile => pile.owner.type === 'pawn' && pile.owner.pawnId === pawn.id && pile.kind === 'food');
    if (sources.length || held) {
      reach = context.search();
      if (!reach) return true; // Budget exhaustion must not be mistaken for inaccessibility.
      let best: { id: number; path: Cell[] } | undefined;
      for (const pile of sources) {
        if (pile.owner.type !== 'ground') continue;
        const path = routeToJob(world, pile.owner, reach, true);
        if (path && (!best || path.length < best.path.length || (path.length === best.path.length && pile.id < best.id))) best = { id: pile.id, path };
      }
      if (held || best) {
        context.release(); // Deposits cargo at the actor, preserving its identity.
        pawn.need = { kind: 'eat', phase: 'pickup', sourcePileId: held?.id ?? best!.id, carryPileId: null, progress: 0 };
        pawn.path = held ? [] : best!.path;
        pawn.state = 'moving'; pawn.planCooldown = 0;
      }
    }
    pawn.needCooldown = NEED_INTERVAL;
  }

  if (pawn.need?.kind === 'eat') {
    const task = pawn.need;
    const pile = world.piles.find(item => item.id === (task.phase === 'pickup' ? task.sourcePileId : task.carryPileId));
    if (!pile || pile.kind !== 'food') { context.release(); return true; }
    if (task.phase === 'pickup') {
      if (pile.owner.type !== 'ground' || reservedSource(world, pile.id) > pile.quantity) { context.release(); return true; }
      if (!same(pawn, pile.owner) && !adjacent(pawn, pile.owner)) { context.move(pile.owner, false); return true; }
      // Transfer a whole pile without allocating. A split is checked before mutation.
      if (pile.quantity === 1) {
        pile.owner = { type: 'pawn', pawnId: pawn.id }; task.carryPileId = pile.id;
      } else {
        if (world.piles.length >= 32768 || !Number.isSafeInteger(world.nextId + 1)) { context.release(); return true; }
        pile.quantity--;
        task.carryPileId = world.nextId++;
        world.piles.push({ id: task.carryPileId, kind: 'food', quantity: 1, owner: { type: 'pawn', pawnId: pawn.id } });
      }
      task.phase = 'ingest'; pawn.path = []; pawn.state = 'eating'; return true;
    }
    if (pile.owner.type !== 'pawn' || pile.owner.pawnId !== pawn.id || pile.quantity !== 1) { context.release(); return true; }
    pawn.state = 'eating';
    if (++task.progress >= INGEST_TICKS) {
      world.piles.splice(world.piles.indexOf(pile), 1);
      pawn.hunger = Math.min(100, pawn.hunger + PORTION_NUTRITION);
      pawn.need = null; pawn.state = 'idle'; pawn.planCooldown = 0; pawn.needCooldown = 0;
      context.event(`${pawn.name} a mangé une portion.`);
    }
    return true;
  }

  if (!pawn.need && pawn.rest <= 30 && canPlan) {
    // A transient occupant must not make an assigned, structurally reachable bed
    // disappear. Movement still respects real occupancy on every step.
    reach = context.search(true);
    if (!reach) return true;
    const owners = new Map(world.pawns.filter(other => other.bedId !== null).map(other => [other.bedId, other.id]));
    const reserved = new Set(world.pawns.filter(other => other.id !== pawn.id && other.need?.kind === 'sleep').map(other => other.need?.kind === 'sleep' ? other.need.bedId : null));
    let best: { id: number; path: Cell[]; target: Cell; owned: boolean } | undefined;
    for (const bed of world.structures) {
      if (bed.kind !== 'bed' || reserved.has(bed.id) || (owners.has(bed.id) && owners.get(bed.id) !== pawn.id)) continue;
      const path = routeToCell(world, bed, reach);
      const owned = pawn.bedId === bed.id;
      if (path && (!best || (owned && !best.owned) || (owned === best.owned && (path.length < best.path.length || (path.length === best.path.length && bed.id < best.id))))) best = { id: bed.id, path, target: { x: bed.x, z: bed.z }, owned };
    }
    context.release();
    if (best) {
      pawn.bedId = best.id;
      pawn.need = { kind: 'sleep', phase: 'travel', bedId: best.id, target: best.target };
      pawn.path = best.path; pawn.state = 'moving'; pawn.planCooldown = 0;
    } else {
      let target: Cell = { x: pawn.x, z: pawn.z }, path: Cell[] = [];
      const bedCells = new Set(world.structures.filter(item => item.kind === 'bed').flatMap(item => footprintCells(item).map(cell => cell.z * world.width + cell.x)));
      if (bedCells.has(pawn.z * world.width + pawn.x)) {
        const candidates = [ { x: pawn.x, z: pawn.z - 1 }, { x: pawn.x + 1, z: pawn.z }, { x: pawn.x, z: pawn.z + 1 }, { x: pawn.x - 1, z: pawn.z } ];
        const free = candidates.find(cell => !bedCells.has(cell.z * world.width + cell.x) && !world.pawns.some(other => same(other, cell)) && routeToCell(world, cell, reach!) !== null);
        if (!free) { pawn.needCooldown = NEED_INTERVAL; return true; }
        target = free; path = routeToCell(world, target, reach)!;
      }
      pawn.need = { kind: 'sleep', phase: path.length ? 'travel' : 'sleep', bedId: null, target };
      pawn.path = path; pawn.planCooldown = 0; pawn.state = path.length ? 'moving' : 'sleeping';
      context.event(`${pawn.name} dort au sol : aucun lit disponible et accessible.`);
    }
  }
  if (pawn.need?.kind === 'sleep') {
    const task = pawn.need;
    const bed = task.bedId === null ? null : world.structures.find(item => item.id === task.bedId && item.kind === 'bed');
    if (task.bedId !== null && (!bed || pawn.bedId !== bed.id || !same(bed, task.target))) { context.release(); return true; }
    if (!same(pawn, task.target)) { context.move(task.target, true); return true; }
    if (task.phase === 'travel') context.event(`${pawn.name} s’allonge ${bed ? 'dans son lit' : 'au sol'}.`);
    task.phase = 'sleep'; pawn.path = []; pawn.state = 'sleeping';
    pawn.rest = Math.min(100, pawn.rest + (bed ? BED_REST_PER_TICK : GROUND_REST_PER_TICK));
    if (pawn.rest >= 100) { pawn.need = null; pawn.state = 'idle'; pawn.planCooldown = 0; pawn.needCooldown = 0; }
    return true;
  }
  if (pawn.hunger <= 20) {
    const job = world.jobs.find(candidate => candidate.id === pawn.jobId);
    if ((job && job.kind !== 'harvest') || pawn.haul) context.release();
    if (pawn.jobId === null) pawn.state = 'hungry';
  } else if (pawn.state === 'hungry') pawn.state = 'idle';
  return false;
}
