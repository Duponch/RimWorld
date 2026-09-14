import { deconstructionReserved } from './deconstruction-rules.ts';
import { canStandAt } from './furniture-travel.ts';
import { routeCost, routeToCell, type Reachability } from './pathfinding.ts';
import { footprintCells } from './definitions.ts';
import { BED_REST_PER_TICK, GROUND_REST_PER_TICK } from './rest.ts';
import { scheduleWakes, wantsSleep } from './schedule.ts';
import { reservedServiceCells } from './service-reservations.ts';
import type { NeedContext } from './needs.ts';
import type { Cell, Pawn, World } from './types.ts';

const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.z === b.z;
const NEED_INTERVAL = 20;

/** Ownership, accessibility and rest gain all depend on the actual sleeping cell. */
export function processSleeping(world: World, pawn: Pawn, context: NeedContext, canPlan: boolean): boolean {
  let reach: Reachability | null;
  if (!pawn.need && wantsSleep(world, pawn) && canPlan && (world.restRules === 'legacy' || (pawn.jobId === null && !pawn.haul && !pawn.cooking))) {
    // Transit does not claim bed ownership; only a sleep reservation excludes another sleeper.
    const ownedBed = world.structures.find(item => item.id === pawn.bedId && item.kind === 'bed');
    reach = context.search( ownedBed ? new Set([ownedBed.z * world.width + ownedBed.x]) : undefined);
    if (!reach) return true;
    const owners = new Map(world.pawns.filter(other => other.bedId !== null).map(other => [other.bedId, other.id]));
    const reserved = new Set(world.pawns.filter(other => other.id !== pawn.id && other.need?.kind === 'sleep').map(other => other.need?.kind === 'sleep' ? other.need.bedId : null));
    const services = reservedServiceCells(world,pawn.id);
    let best: { id: number; path: Cell[]; target: Cell; owned: boolean } | undefined;
    for (const bed of world.structures) {
      if (bed.kind !== 'bed' || deconstructionReserved(world,bed.id,pawn.id) || reserved.has(bed.id) || services.has(bed.z*world.width+bed.x) || (owners.has(bed.id) && owners.get(bed.id) !== pawn.id)) continue;
      const path = routeToCell(world, bed, reach);
      const owned = pawn.bedId === bed.id;
      if (path && (!best || (owned && !best.owned) || (owned === best.owned && (routeCost(world,path,reach) < routeCost(world,best.path,reach) || (routeCost(world,path,reach) === routeCost(world,best.path,reach) && bed.id < best.id))))) best = { id: bed.id, path, target: { x: bed.x, z: bed.z }, owned };
    }
    if (!context.release()) return true;
    if (best) {
      pawn.bedId = best.id;
      pawn.need = { kind: 'sleep', phase: 'travel', bedId: best.id, target: best.target };
      pawn.path = best.path; pawn.state = 'moving'; pawn.planCooldown = 0;
    } else {
      let target: Cell = { x: pawn.x, z: pawn.z }, path: Cell[] = [];
      const bedCells = new Set(world.structures.filter(item => item.kind === 'bed').flatMap(item => footprintCells(item).map(cell => cell.z * world.width + cell.x)));
      if (bedCells.has(pawn.z * world.width + pawn.x)||world.schemaVersion>=22&&!canStandAt(world,pawn)) {
        const candidates = [ { x: pawn.x, z: pawn.z - 1 }, { x: pawn.x + 1, z: pawn.z }, { x: pawn.x, z: pawn.z + 1 }, { x: pawn.x - 1, z: pawn.z } ];
        const free = candidates.find(cell => !bedCells.has(cell.z * world.width + cell.x) && canStandAt(world,cell) && !world.pawns.some(other => same(other, cell)) && routeToCell(world, cell, reach!) !== null);
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
    if (scheduleWakes(world, pawn) || (world.restRules === 'adult' && task.phase === 'travel' && pawn.hunger <= 0)) { context.release(); pawn.needCooldown = 0; pawn.planCooldown = 0; return false; }
    const bed = task.bedId === null ? null : world.structures.find(item => item.id === task.bedId && item.kind === 'bed');
    if (task.bedId !== null && (!bed || pawn.bedId !== bed.id || !same(bed, task.target))) { if (!context.release()) return true; return true; }
    if (!same(pawn, task.target)) { context.move(task.target, true); return true; }
    if (task.phase === 'travel') context.event(`${pawn.name} s’allonge ${bed ? 'dans son lit' : 'au sol'}.`);
    task.phase = 'sleep'; pawn.path = []; pawn.state = 'sleeping'; pawn.collapsePending = false; pawn.restZeroTicks = 0;
    pawn.rest = Math.min(100, pawn.rest + (bed ? BED_REST_PER_TICK : GROUND_REST_PER_TICK));
    if (pawn.rest >= 100) { pawn.need = null; pawn.state = 'idle'; pawn.planCooldown = 0; pawn.needCooldown = 0; }
    return true;
  }
  return false;
}
