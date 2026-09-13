import { footprintCells, JOB_DURATION } from './definitions.ts';
import { isPlant, plantGrowth, PLANT_DEFINITIONS } from './plants.ts';
import { releaseWork } from './work-release.ts';
import type { GrowingZone, Job, JobKind, Resource, World } from './types.ts';

export const FARM_SCAN_INTERVAL = 10;
export const FARM_SCAN_BUDGET = 512;
export const FARM_QUEUE_LIMIT = 128;
const index = (world: World, cell: { x: number; z: number }) => cell.z * world.width + cell.x;

// Derived indices contain no continuation state. Producers replace the arrays;
// save/resume reconstructs these indices and retains the serialized scan cursor.
const resourcesCache = new WeakMap<World, { source: Resource[]; cells: Map<number, Resource> }>();
export const resourceAt = (world: World, cell: number): Resource | undefined => resourceCells(world).get(cell);
function resourceCells(world: World): Map<number, Resource> {
  let cached = resourcesCache.get(world);
  if (!cached || cached.source !== world.resources) {
    cached = { source: world.resources, cells: new Map(world.resources.map(r => [index(world, r), r])) };
    resourcesCache.set(world, cached);
  }
  return cached.cells;
}
const zonesCache = new WeakMap<World, { source: GrowingZone[]; entries: { zone: GrowingZone; cell: number }[]; byCell: Map<number, GrowingZone> }>();
function zoneCells(world: World) {
  let cached = zonesCache.get(world);
  if (!cached || cached.source !== world.growingZones) {
    const entries = world.growingZones.flatMap(zone => zone.cells.map(cell => ({ zone, cell })));
    cached = { source: world.growingZones, entries, byCell: new Map(entries.map(e => [e.cell, e.zone])) };
    zonesCache.set(world, cached);
  }
  return cached;
}
export const growingZoneAt = (world: World, cell: number): GrowingZone | undefined => zoneCells(world).byCell.get(cell);
export function jobDuration(world: World, job: Job): number {
  return (job.kind === 'harvest' || job.kind === 'cut') && resourceCells(world).get(index(world, job))?.kind === 'rice' ? 20 : JOB_DURATION[job.kind];
}
interface Context { resources: Map<number, Resource>; fixed: Set<number> }
function context(world: World): Context {
  return {
    resources: resourceCells(world),
    fixed: new Set([...world.structures, ...world.jobs.filter(j => ['wall', 'bed', 'table', 'stool'].includes(j.kind))].flatMap(s => footprintCells(s).map(c => index(world, c)))),
  };
}
function intention(world: World, zone: GrowingZone, cell: number, ctx: Context): { kind: JobKind; cell: number } | null {
  if (ctx.fixed.has(cell)) return null;
  const plant = ctx.resources.get(cell);
  if (plant?.kind === zone.plant || (!zone.allowSow && zone.allowCut && plant && isPlant(plant))) {
    return plantGrowth(world, plant) >= 1 ? { kind: 'harvest', cell } : null;
  }
  if (!zone.allowSow) return null;
  if (plant) return zone.allowCut && plant.kind !== 'rock' ? { kind: plant.kind === 'tree' ? 'chop' : 'cut', cell } : null;
  // A sowing intention stays pending while its floor items are hauled aside.
  if (!['grass', 'soil'].includes(world.tiles[cell]!.terrain)) return null;
  const x = cell % world.width, z = Math.floor(cell / world.width);
  for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const nx = x + dx!, nz = z + dz!;
    if (nx < 0 || nz < 0 || nx >= world.width || nz >= world.height) continue;
    const neighbor = nz * world.width + nx;
    if (ctx.resources.get(neighbor)?.kind !== 'tree') continue;
    const other = growingZoneAt(world, neighbor);
    if (!zone.allowCut || (other && !other.allowCut)) return null;
    return { kind: 'chop', cell: neighbor };
  }
  return { kind: 'sow', cell };
}

/** Policy/removal cancels only generated work, never explicit player orders. */
export function cancelGrowingJobs(world: World, zoneIds: ReadonlySet<number>): void {
  const ids = new Set(world.jobs.filter(j => j.growingZoneId !== undefined && zoneIds.has(j.growingZoneId)).map(j => j.id));
  for (const pawn of world.pawns) if (pawn.jobId !== null && ids.has(pawn.jobId)) releaseWork(world, pawn);
  world.jobs = world.jobs.filter(j => !ids.has(j.id));
}
export function growingJobValid(world: World, job: Job): boolean {
  if (job.growingZoneId === undefined) return job.kind !== 'sow';
  const zone = world.growingZones.find(z => z.id === job.growingZoneId);
  if (!zone) return false;
  const target = index(world, job), ctx = context(world);
  // Tree clearing can originate in a neighbouring cell outside the zone.
  const origins = job.kind === 'chop' ? [target, target - world.width, target + 1, target + world.width, target - 1] : [target];
  return origins.some(cell => growingZoneAt(world, cell)?.id === zone.id && (() => {
    const desired = intention(world, zone, cell, ctx);
    return desired?.kind === job.kind && desired.cell === target;
  })());
}

/** Bounded rotating discovery; work execution and reservations use the ordinary planner. */
export function scheduleGrowing(world: World): void {
  if (!world.growingZones.length || world.tick % FARM_SCAN_INTERVAL) return;
  const { entries } = zoneCells(world);
  if (!entries.length) return;
  let count = world.jobs.filter(j => j.growingZoneId !== undefined).length;
  if (count >= FARM_QUEUE_LIMIT) {
    if (world.tick % 100) return;
    // Unreachable intentions must not monopolize the bounded queue forever.
    // Keep owned work; rescan unclaimed automatic work from the saved cursor.
    world.jobs = world.jobs.filter(j => j.growingZoneId === undefined || j.reservedBy !== null);
    count = world.jobs.filter(j => j.growingZoneId !== undefined).length;
  }
  const ctx = context(world), occupied = new Set(world.jobs.map(j => index(world, j)));
  const budget = Math.min(FARM_SCAN_BUDGET, entries.length);
  for (let n = 0; n < budget && count < FARM_QUEUE_LIMIT; n++) {
    const { zone, cell } = entries[world.growingCursor % entries.length]!;
    world.growingCursor = (world.growingCursor + 1) % entries.length;
    const desired = intention(world, zone, cell, ctx);
    if (!desired || occupied.has(desired.cell)) continue;
    if (!Number.isSafeInteger(world.nextId + 1)) return;
    world.jobs.push({ id: world.nextId++, growingZoneId: zone.id, kind: desired.kind, x: desired.cell % world.width, z: Math.floor(desired.cell / world.width), orientation: 0, footprint: 'standard', status: 'pending', reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 } });
    occupied.add(desired.cell); count++;
    for (const pawn of world.pawns) if (pawn.jobId === null && !pawn.haul) pawn.planCooldown = 0;
  }
}
export function finishSowing(world: World, job: Job): void {
  world.resources = [...world.resources, { id: world.nextId++, kind: 'rice', x: job.x, z: job.z, amount: PLANT_DEFINITIONS.rice.yield, growth: .0001, growthTick: world.tick }];
}
