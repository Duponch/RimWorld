import { JOB_WOOD_COST } from './definitions.ts';
import { deconstructionAvailable, deconstructionTarget } from './deconstruction-rules.ts';
import { groundPile, groundCapacity, planGroundPlacement } from './ground-placement.ts';
import { addMaterial } from './materials.ts';
import type { Job, Pawn, World } from './types.ts';

/** Preview the random rounding without changing authoritative RNG. Only a
 * successful, fully placeable removal consumes a draw or retires material. */
export function finishDeconstruction(world: World, pawn: Pawn, job: Job): boolean {
  const structure = deconstructionTarget(world, job);
  if (!structure || !deconstructionAvailable(world, job, pawn.id)) return false;
  const cost = JOB_WOOD_COST[structure.kind];
  let rng = world.rng, quantity = structure.kind === 'campfire' ? 0 : Math.floor(cost / 2);
  if (structure.kind !== 'campfire' && cost % 2) {
    rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; rng >>>= 0;
    if (rng / 0x100000000 < .5) quantity++;
  }
  const structures = world.structures.filter(s => s.id !== structure.id);
  const jobs = world.jobs.filter(j => j.id !== job.id);
  const view = { ...world, structures, jobs };
  // Most refunds fit the vacated cell: no map flood on this common path.
  const drops = !quantity ? [] : groundCapacity(view, structure, 'wood') >= quantity
    ? [{ cell: { x: structure.x, z: structure.z }, quantity }] : planGroundPlacement(view, quantity, structure, 'wood');
  if (!drops) return false;
  const newPiles = drops.filter(d => !groundPile(view, d.cell)).length;
  if (world.piles.length + newPiles > 32768 || !Number.isSafeInteger(world.nextId + newPiles)) return false;
  const lostWood = structure.kind === 'campfire' ? 0 : cost - quantity;
  const fuelTicks = structure.fuel ? structure.fuel.ticks + structure.fuel.burned : 0;
  const ledger = world.deconstructed;
  if (![ledger.count + 1, ledger.lostWood + lostWood, ledger.fuelTicks + fuelTicks].every(Number.isSafeInteger)) return false;
  world.structures = structures; world.jobs = jobs; world.rng = rng;
  for (const d of drops) addMaterial(world, 'wood', d.quantity, { type: 'ground', ...d.cell }, 'wood');
  ledger.count++; ledger.lostWood += lostWood; ledger.fuelTicks += fuelTicks;
  for (const p of world.pawns) {
    if (p.bedId === structure.id) p.bedId = null;
    // A table is not exclusively reserved by its eaters. Keep their actual meal
    // and position, remove the vanished surface before ingestion can benefit.
    if (p.need?.kind === 'eat' && p.need.dining?.tableId === structure.id) p.need.dining.tableId = null;
  }
  return true;
}
