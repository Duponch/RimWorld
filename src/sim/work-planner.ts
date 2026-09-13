import { mayImproveStorage } from './idle-logistics.ts';
import { startTravel } from './movement.ts';
import { storageCapacity } from './ground-placement.ts';
import { legacyItem, type ItemId } from './items.ts';
import { CARRY_CAPACITY, footprintCells, JOB_WOOD_COST } from './definitions.ts';
import { deliveredStock, groundQuantity, reservedDestination } from './materials.ts';
import { cellIndex, inBounds, reachableCells, routeToJob } from './pathfinding.ts';
import type { Reachability } from './pathfinding.ts';
import type { Cell, HaulDestination, Job, JobKind, MaterialKind, Pawn, WorkType, World } from './types.ts';
export const PLAN_INTERVAL=20;
export interface SearchBudget { remaining:number; pairs:number }
export type NavigationGrid=()=>Uint8Array;
export const workType=(kind:JobKind):WorkType=>kind==='chop'||kind==='harvest'?'gather':'build';
const sameCell=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;

export function search(world: World, pawn: Pawn, blocked: Uint8Array, occupied: Set<number>, budget: SearchBudget, goals?: ReadonlySet<number>): Reachability | null {
  if (budget.remaining === 0) return null;
  budget.remaining--; return reachableCells(world, pawn, blocked, occupied, goals);
}
/** Deterministic sidestep; active and sleeping agents are never teleported or overlapped. */
export function yieldIdleBlocker(world: World, requester: Pawn, target: Cell, blocked: Uint8Array, occupied: Set<number>, reachable: Reachability, allowTarget = false): boolean {
  const route = routeToJob(world, target, reachable, allowTarget);
  if (route === null) return false;
  const routeIndices = new Map(route.map((cell, index) => [cellIndex(world, cell.x, cell.z), index]));
  for (let pathIndex = 0; pathIndex < route.length; pathIndex++) {
    const cell = route[pathIndex]!;
    const blocker = world.pawns.find(pawn => pawn.id !== requester.id && sameCell(pawn, cell));
    if (!blocker) continue;
    if (blocker.jobId !== null || blocker.haul !== null || blocker.need !== null || blocker.state === 'sleeping' || blocker.moveCooldown > 0) return false;
    const choices = [{ x: blocker.x, z: blocker.z - 1 }, { x: blocker.x + 1, z: blocker.z }, { x: blocker.x, z: blocker.z + 1 }, { x: blocker.x - 1, z: blocker.z }]
      .filter(next => { const index = cellIndex(world, next.x, next.z); const position = routeIndices.get(index); return inBounds(world, next.x, next.z) && !blocked[index] && !occupied.has(index) && (position === undefined || position > pathIndex); });
    choices.sort((a, b) => Number(routeIndices.has(cellIndex(world, a.x, a.z))) - Number(routeIndices.has(cellIndex(world, b.x, b.z))));
    const next = choices[0]; if (!next) return false;
    startTravel(world, blocker, next); occupied.add(cellIndex(world, blocker.x, blocker.z)); return true;
  }
  return false;
}
export function destinationCell(world: World, destination: HaulDestination): (Cell & { kind?: JobKind }) | null {
  return destination.type === 'job' ? world.jobs.find(job => job.id === destination.jobId) ?? null : world.stockpiles.find(zone => zone.id === destination.stockpileId) ?? null;
}
function destinationCapacity(world: World, destination: HaulDestination, kind: MaterialKind, exceptPawn?: number, item: ItemId = legacyItem(kind)): number {
  if (destination.type === 'job') {
    const job = world.jobs.find(item => item.id === destination.jobId);
    return job && kind === 'wood' ? Math.max(0, JOB_WOOD_COST[job.kind] - deliveredStock(world, job.id).wood - reservedDestination(world, destination, exceptPawn)) : 0;
  }
  const zone = world.stockpiles.find(item => item.id === destination.stockpileId);
  return zone ? storageCapacity(world, zone, item, exceptPawn) : 0;
}
export function destinationValid(world: World, pawn: Pawn): boolean {
  const task = pawn.haul; if (!task) return false;
  const pile = world.piles.find(item => item.id === (task.phase === 'pickup' ? task.sourcePileId : task.carryPileId));
  return !!pile && destinationCapacity(world, task.destination, pile.kind, pawn.id, pile.item) >= task.quantity;
}
interface Candidate { priority: number; rank: number; distance: number; id: number; job?: Job; sourceId?: number; quantity?: number; destination?: HaulDestination; target: Cell }
function compareCandidate(a: Candidate, b: Candidate): number { return a.priority - b.priority || a.rank - b.rank || a.distance - b.distance || a.id - b.id; }
function canReach(world: World, target: Cell & { kind?: JobKind }, reachable: Reachability, allowTarget: boolean): boolean {
  const cells = target.kind ? footprintCells(target as Job) : [target];
  if (allowTarget && reachable.parents[cellIndex(world, target.x, target.z)] !== -2) return true;
  for (const cell of cells) for (const next of [{ x: cell.x, z: cell.z - 1 }, { x: cell.x + 1, z: cell.z }, { x: cell.x, z: cell.z + 1 }, { x: cell.x - 1, z: cell.z }]) {
    if (inBounds(world, next.x, next.z) && !cells.some(own => sameCell(own, next)) && reachable.parents[cellIndex(world, next.x, next.z)] !== -2) return true;
  }
  return false;
}
export function planWork(world: World, pawn: Pawn, getBlocked: NavigationGrid, occupied: Set<number>, budget: SearchBudget): void {
  // Never enumerate logistics after another colonist exhausted the shared search budget.
  if (budget.remaining === 0 || budget.pairs === 0) return;
  if (!world.jobs.length && (!world.stockpiles.length || !world.piles.length || pawn.priorities.haul === 0)) { pawn.planCooldown = PLAN_INTERVAL; return; }
  if (!world.jobs.length && !mayImproveStorage(world)) {pawn.planCooldown=PLAN_INTERVAL;return;}
  const blocked = getBlocked();
  const reachable = search(world, pawn, blocked, occupied, budget); if (!reachable) return;
  pawn.planCooldown = PLAN_INTERVAL;
  const delivered = new Map<number, number>(); const ground = new Map<number, number>();
  const sourceReserved = new Map<number, number>(); const jobReserved = new Map<number, number>(); const zoneReserved = new Map<number, number>();
  const outbound = new Map<number, number>(); const pileById = new Map(world.piles.map(pile => [pile.id, pile]));
  for (const pile of world.piles) {
    if (pile.owner.type === 'job' && pile.kind === 'wood') delivered.set(pile.owner.jobId, (delivered.get(pile.owner.jobId) ?? 0) + pile.quantity);
    if (pile.owner.type === 'ground') { const key = cellIndex(world, pile.owner.x, pile.owner.z); ground.set(key, (ground.get(key) ?? 0) + pile.quantity); }
  }
  for (const worker of world.pawns) if (worker.need?.kind === 'eat' && worker.need.phase === 'pickup') sourceReserved.set(worker.need.sourcePileId, (sourceReserved.get(worker.need.sourcePileId) ?? 0) + worker.need.quantity);
  for (const worker of world.pawns) if (worker.haul) {
    const task = worker.haul;
    if (task.phase === 'pickup') {
      sourceReserved.set(task.sourcePileId, (sourceReserved.get(task.sourcePileId) ?? 0) + task.quantity);
      const source = pileById.get(task.sourcePileId);
      if (source?.owner.type === 'ground') { const key = cellIndex(world, source.owner.x, source.owner.z); outbound.set(key, (outbound.get(key) ?? 0) + task.quantity); }
    }
    const map = task.destination.type === 'job' ? jobReserved : zoneReserved;
    const id = task.destination.type === 'job' ? task.destination.jobId : task.destination.stockpileId;
    map.set(id, (map.get(id) ?? 0) + task.quantity);
  }
  let best: Candidate | null = null;
  const blockedTargets: { target: Cell; allow: boolean }[] = [];
  for (const job of world.jobs) {
    const work = workType(job.kind);
    if (job.reservedBy !== null || pawn.priorities[work] === 0 || (delivered.get(job.id) ?? 0) < JOB_WOOD_COST[job.kind] || (pawn.hunger <= 20 && job.kind !== 'harvest')) continue;
    const candidate: Candidate = { priority: pawn.priorities[work], rank: work === 'gather' ? 0 : 1, distance: Math.abs(job.x - pawn.x) + Math.abs(job.z - pawn.z), id: job.id, job, target: job };
    if (canReach(world, job, reachable, false)) { if (!best || compareCandidate(candidate, best) < 0) best = candidate; }
    else if (blockedTargets.length < 16) blockedTargets.push({ target: job, allow: false });
  }
  if (pawn.priorities.haul > 0 && pawn.hunger > 20 && (!best || best.priority >= pawn.priorities.haul)) {
    const zonesByCell = new Map(world.stockpiles.map(zone => [cellIndex(world, zone.x, zone.z), zone]));
    const sources = world.piles.filter(pile => pile.owner.type === 'ground' && pile.quantity > (sourceReserved.get(pile.id) ?? 0));
    const destinations: { destination: HaulDestination; target: Cell & { kind?: JobKind }; priority: number; wood: number; food: number; reachable: boolean }[] = [];
    for (const job of world.jobs) {
      const capacity = JOB_WOOD_COST[job.kind] - (delivered.get(job.id) ?? 0) - (jobReserved.get(job.id) ?? 0);
      if (capacity > 0) destinations.push({ destination: { type: 'job', jobId: job.id }, target: job, priority: 5, wood: capacity, food: 0, reachable: canReach(world, job, reachable, false) });
    }
    for (const zone of world.stockpiles) {
      const capacity = zone.capacity - (ground.get(cellIndex(world, zone.x, zone.z)) ?? 0) - (zoneReserved.get(zone.id) ?? 0);
      if (capacity > 0 && (zone.filters.wood || zone.filters.food)) destinations.push({ destination: { type: 'stockpile', stockpileId: zone.id }, target: zone, priority: zone.priority, wood: zone.filters.wood ? capacity : 0, food: zone.filters.food ? capacity : 0, reachable: canReach(world, zone, reachable, true) });
    }
    const total = sources.length * destinations.length;
    const count = Math.min(total, budget.pairs);
    const start = total ? world.logisticsCursor % total : 0;
    const sourceReachable = new Map<number, boolean>();
    for (let offset = 0; offset < count; offset++) {
      const index = (start + offset) % total;
      const pile = sources[Math.floor(index / destinations.length)]!;
      if (pile.owner.type !== 'ground') continue;
      const destination = destinations[index % destinations.length]!;
      const capacity = destination.destination.type === 'stockpile' ? storageCapacity(world, zonesByCell.get(cellIndex(world,destination.target.x,destination.target.z))!, pile.item) : destination[pile.kind]; if (capacity <= 0 || sameCell(pile.owner, destination.target)) continue;
      const sourceZone = zonesByCell.get(cellIndex(world, pile.owner.x, pile.owner.z));
      const excess = sourceZone ? Math.max(0, (ground.get(cellIndex(world, pile.owner.x, pile.owner.z)) ?? 0) - sourceZone.capacity) : 0;
      const currentPriority = sourceZone?.filters[pile.kind] && !excess ? sourceZone.priority : 0;
      if (destination.priority <= currentPriority) continue;
      let available = pile.quantity - (sourceReserved.get(pile.id) ?? 0);
      if (sourceZone?.filters[pile.kind] && excess > 0 && destination.destination.type === 'stockpile') available = Math.min(available, Math.max(0, excess - (outbound.get(cellIndex(world, pile.owner.x, pile.owner.z)) ?? 0)));
      if (available <= 0) continue;
      let sourceAccess = sourceReachable.get(pile.id);
      if (sourceAccess === undefined) { sourceAccess = canReach(world, pile.owner, reachable, true); sourceReachable.set(pile.id, sourceAccess); }
      if (!sourceAccess || !destination.reachable) {
        if (blockedTargets.length < 16) { if (!sourceAccess) blockedTargets.push({ target: pile.owner, allow: true }); else blockedTargets.push({ target: destination.target, allow: destination.destination.type === 'stockpile' }); }
        continue;
      }
      const candidate: Candidate = { priority: pawn.priorities.haul, rank: 2 + (5 - destination.priority) / 10, distance: Math.abs(pawn.x - pile.owner.x) + Math.abs(pawn.z - pile.owner.z) + Math.abs(destination.target.x - pile.owner.x) + Math.abs(destination.target.z - pile.owner.z), id: pile.id,
        sourceId: pile.id, quantity: Math.min(CARRY_CAPACITY, available, capacity), destination: destination.destination, target: pile.owner };
      if (!best || compareCandidate(candidate, best) < 0) best = candidate;
    }
    budget.pairs -= count;
    if (total) world.logisticsCursor = (start + count) % total;
  }
  if (best) {
    const path = routeToJob(world, best.target, reachable, !best.job)!;
    if (best.destination) pawn.haul = { sourcePileId: best.sourceId!, quantity: best.quantity!, phase: 'pickup', destination: best.destination, carryPileId: null };
    else { best.job!.reservedBy = pawn.id; best.job!.status = 'active'; pawn.jobId = best.job!.id; }
    pawn.path = path; pawn.state = path.length ? 'moving' : 'working'; return;
  }
  const staticReachable = blockedTargets.length ? search(world, pawn, blocked, new Set(), budget) : null;
  if (staticReachable) for (const candidate of blockedTargets) if (yieldIdleBlocker(world, pawn, candidate.target, blocked, occupied, staticReachable, candidate.allow)) return;
}
