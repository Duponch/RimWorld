import { footprintContains, JOB_DURATION } from './definitions.ts';
import { constructionRecipe, type ConstructionMaterial } from './construction-materials.ts';
import type { Cell, Job, Structure, World } from './types.ts';

export interface DeconstructionTarget { structureId: number; kind: Structure['kind']; material?:ConstructionMaterial }
/** Lost construction wood and retired fuel history are distinct ledger terms. */
export interface DeconstructionLedger { count: number; lostWood: number; fuelTicks: number; lostSteel?:number; lostComponents?:number; lostBlocks?:Partial<Record<import('./building-materials.ts').BlockMaterial,number>> }
export const deconstructionAt = (world: World, cell: Cell & {targetId?:number}) => world.structures.find(s => (cell.targetId===undefined||s.id===cell.targetId)&&footprintContains(s, cell));
export const deconstructionTarget = (world: World, job: Job) => world.structures.find(s => s.id === job.deconstruction?.structureId);
export function deconstructionReserved(world: World, id: number, exceptPawn?: number): boolean {
  return world.jobs.some(j => (j.deconstruction?.structureId??j.furniture?.structureId) === id && j.reservedBy !== null && j.reservedBy !== exceptPawn);
}
/** Reserve the object, not its owner's bed assignment or a table's eating surface.
 * A queued order may follow the same pawn's service; other users must finish first. */
export function deconstructionAvailable(world: World, job: Job, exceptPawn?: number): boolean {
  const id = job.deconstruction?.structureId;
  if (!id || !deconstructionTarget(world, job)) return false;
  for (const p of world.pawns) if (p.id !== exceptPawn) {
    if (p.research?.stationId===id || p.rescue?.bedId===id || p.cooking?.stationId === id || p.haul?.destination.type === 'fuel' && p.haul.destination.structureId === id
      || p.need?.kind === 'sleep' && p.need.bedId === id || p.need?.kind === 'eat' && p.need.dining?.seatId === id
      || p.recreation.task?.buildingId === id) return false;
    for (const order of p.orders.queue) if (typeof order !== 'number') {
      if ('cooking' in order ? order.cooking.stationId === id : order.destination.type === 'fuel' && order.destination.structureId === id) return false;
    }
  }
  return true;
}
/** Core clamps work to 20..3000 ticks and applies ConstructionSpeed × 1.7.
 * Local construction durations retain their documented catalogue calibration. */
export function deconstructionDuration(job: Job): number {
  const work = constructionRecipe(job.deconstruction??{kind:'wall'}).coreWork;
  return Math.ceil(Math.min(3000, Math.max(20, work)) / 17);
}
export function designateDeconstruction(world: World, structure: Structure): void {
  world.jobs.push({ id: world.nextId++, kind: 'deconstruct', deconstruction: { structureId: structure.id, kind: structure.kind,...structure.material?{material:structure.material}:{} },
    x: structure.x, z: structure.z, orientation: structure.orientation, footprint: structure.footprint,
    progress: 0, status: 'pending', reservedBy: null, escrow: { wood: 0, food: 0 } });
}
