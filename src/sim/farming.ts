import { furnitureDuration } from './furniture-rules.ts';
import { constructionRecipe } from './construction-materials.ts';
import { deconstructionDuration } from './deconstruction-rules.ts';
import { footprintCells, JOB_DURATION, STRUCTURE_DEFINITIONS } from './definitions.ts';
import { isCrop, isPlant, plantGrowth, PLANT_DEFINITIONS, sowingTemperatureAllowed } from './plants.ts';
import { TemperatureView, outdoorTemperature } from './temperature.ts';
import { releaseWork, type DropPlan } from './work-release.ts';
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
  if(job.kind==='mine'&&job.pickTicks!==undefined)return job.pickTicks/10;
  if(job.furniture)return furnitureDuration(world,job);
  if(job.kind==='repair')return job.repair?.warmed?20:80;
  if(job.kind==='deconstruct')return deconstructionDuration(job);
  if(job.material!==undefined)return constructionRecipe(job).work;
  return (job.kind === 'harvest' || job.kind === 'cut') && isCrop(resourceCells(world).get(index(world, job))??{kind:'rock'}) ? 20 : JOB_DURATION[job.kind];
}
interface Context { resources: Map<number, Resource>; fixed: Set<number>; temperatures:TemperatureView }
function context(world: World): Context {
  return {
    resources: resourceCells(world),
    temperatures: new TemperatureView(world),
    fixed: new Set([...world.structures, ...world.jobs.filter(j => j.kind==='install'||j.kind in STRUCTURE_DEFINITIONS)].flatMap(s => footprintCells(s).map(c => index(world, c)))),
  };
}
function intention(world: World, zone: GrowingZone, cell: number, ctx: Context, committed=false): { kind: JobKind; cell: number } | null {
  if (ctx.fixed.has(cell)) return null;
  const plant = ctx.resources.get(cell);
  if (plant?.kind === zone.plant || (!zone.allowSow && zone.allowCut && plant && isPlant(plant))) {
    return plantGrowth(world, plant) >= 1 ? { kind: 'harvest', cell } : null;
  }
  if (!zone.allowSow) return null;
  // Temperature gates new sowing work, not harvesting or an accepted job.
  if(!committed&&!sowingTemperatureAllowed(ctx.temperatures.at(world,{x:cell%world.width,z:Math.floor(cell/world.width)})))return null;
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

/** Cancel generated work and zone-bound clearance; independent designations survive. */
export function cancelGrowingJobs(world: World, zoneIds: ReadonlySet<number>,drops?:DropPlan): void {
  const ids = new Set(world.jobs.filter(j => j.growingZoneId !== undefined && zoneIds.has(j.growingZoneId)).map(j => j.id));
  for (const pawn of world.pawns) if (pawn.jobId !== null && ids.has(pawn.jobId)||pawn.haul?.destination.type==='aside'&&zoneIds.has(pawn.haul.destination.growingZoneId??-1)) releaseWork(world, pawn,drops);
  for(const pawn of world.pawns)pawn.orders.queue=pawn.orders.queue.filter(o=>typeof o==='number'||!('destination' in o)||o.destination.type!=='aside'||!zoneIds.has(o.destination.growingZoneId??-1));
  world.jobs = world.jobs.filter(j => !ids.has(j.id));
}
export function growingJobValid(world: World, job: Job, shared?:Context): boolean {
  if (job.growingZoneId === undefined) return job.kind !== 'sow';
  const zone = world.growingZones.find(z => z.id === job.growingZoneId);
  if (!zone) return false;
  const target = index(world, job), ctx = shared??context(world);
  // Tree clearing can originate in a neighbouring cell outside the zone.
  const origins = job.kind === 'chop' ? [target, target - world.width, target + 1, target + world.width, target - 1] : [target];
  return origins.some(cell => growingZoneAt(world, cell)?.id === zone.id && (() => {
    const desired = intention(world, zone, cell, ctx,job.reservedBy!==null);
    return desired?.kind === job.kind && desired.cell === target;
  })());
}

/** Bounded rotating discovery; work execution and reservations use the ordinary planner. */
export function scheduleGrowing(world: World): void {
  // Discard stale sowing/preparation intents before a planner can accept one.
  // Accepted work keeps its own interruption contract, including queued orders.
  if((!sowingTemperatureAllowed(outdoorTemperature(world))||world.thermal?.regions.some(r=>!sowingTemperatureAllowed(r.temperature)))
    &&world.jobs.some(j=>j.growingZoneId!==undefined&&j.reservedBy===null)) {
    const ctx=context(world);
    const allowed=(j:Job)=>j.growingZoneId===undefined||j.reservedBy!==null||growingJobValid(world,j,ctx);
    if(world.jobs.some(j=>!allowed(j)))world.jobs=world.jobs.filter(allowed);
  }
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
  const kind=world.growingZones.find(z=>z.id===job.growingZoneId)!.plant;
  world.resources = [...world.resources, { id: world.nextId++, kind, x: job.x, z: job.z, amount: PLANT_DEFINITIONS[kind].yield, growth: .0001, growthTick: world.tick }];
}
