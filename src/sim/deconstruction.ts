import { constructionRecipe } from './construction-materials.ts';
import { isBlockMaterial, type ConstructionMaterial, type BlockMaterial } from './building-materials.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import { deconstructionAvailable, deconstructionTarget } from './deconstruction-rules.ts';
import { groundPile, groundCapacity, planGroundPlacement } from './ground-placement.ts';
import { addMaterial } from './materials.ts';
import { planGraveRelease,commitGraveRelease } from './burial.ts';
import type { Job, Pawn, World } from './types.ts';

/** Preview the random rounding without changing authoritative RNG. Only a
 * successful, fully placeable removal consumes a draw or retires material. */
export function finishDeconstruction(world: World, pawn: Pawn, job: Job): boolean {
  const structure = deconstructionTarget(world, job);
  if (!structure || !deconstructionAvailable(world, job, pawn.id)) return false;
  const structures = world.structures.filter(s => s.id !== structure.id);
  const jobs = world.jobs.filter(j => j.id !== job.id);
  // The preview owns piles and escrow: planning several ingredient refunds must
  // neither mutate live stacks nor promise one ground cell to incompatible items.
  const view = { ...world, structures, jobs: jobs.map(j => ({ ...j, escrow: { ...j.escrow } })), piles: world.piles.map(p => ({ ...p, owner: { ...p.owner } })) };
  const graveRelease=planGraveRelease(view,structure);if(!graveRelease)return false;
  // Occupy the preview cell before planning any other restitution. The same
  // body identity will be moved there only after all preflights succeed.
  if(graveRelease.corpseId!==null)view.piles.find(p=>p.id===graveRelease.corpseId)!.owner={type:'ground',...graveRelease.cell!};
  const refunds: { item: ItemId; quantity: number; cell: { x:number; z:number } }[] = [];
  let rng = world.rng, lostWood = 0, lostSteel = 0, lostComponents=0;
  const lostBlocks:Partial<Record<BlockMaterial,number>>={...world.deconstructed.lostBlocks};
  for (const cost of structure.kind === 'campfire' || structure.kind === 'passive-cooler' ? [] : constructionRecipe(structure).ingredients) {
    let quantity = structure.kind==='power-conduit'?0:Math.floor(cost.quantity / 2);
    if (structure.kind!=='power-conduit'&&cost.quantity % 2) {
      rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; rng >>>= 0;
      if (rng / 0x100000000 < .5) quantity++;
    }
    const drops = !quantity ? [] : groundCapacity(view, structure, cost.item) >= quantity
      ? [{ cell: { x: structure.x, z: structure.z }, quantity }] : planGroundPlacement(view, quantity, structure, cost.item);
    if (!drops) return false;
    const newPiles = drops.filter(d => !groundPile(view, d.cell)).length;
    if (view.piles.length + newPiles > 32768 || !Number.isSafeInteger(view.nextId + newPiles)) return false;
    for (const drop of drops) {
      refunds.push({ ...drop, item: cost.item });
      addMaterial(view, ITEM_DEFINITIONS[cost.item].kind, drop.quantity, { type: 'ground', ...drop.cell }, cost.item);
    }
    if (cost.item === 'wood') lostWood += cost.quantity - quantity;
    else if(cost.item==='steel')lostSteel += cost.quantity - quantity;
    else if(cost.item==='component')lostComponents+=cost.quantity-quantity;
    else if(isBlockMaterial(cost.item))lostBlocks[cost.item]=(lostBlocks[cost.item]??0)+cost.quantity-quantity;
  }
  const fuelTicks = structure.fuel ? structure.fuel.ticks + structure.fuel.burned : 0;
  const ledger = world.deconstructed;
  if (![(ledger.lostComponents??0)+lostComponents, ledger.count + 1, ledger.lostWood + lostWood, (ledger.lostSteel ?? 0) + lostSteel, ledger.fuelTicks + fuelTicks,...Object.values(lostBlocks)].every(Number.isSafeInteger)) return false;
  if(!commitGraveRelease(world,structure,graveRelease))return false;
  world.structures = structures; world.jobs = jobs; world.rng = rng;
  for (const d of refunds) addMaterial(world, ITEM_DEFINITIONS[d.item].kind, d.quantity, { type: 'ground', ...d.cell }, d.item);
  ledger.count++; ledger.lostWood += lostWood; ledger.fuelTicks += fuelTicks;
  if(lostComponents)ledger.lostComponents=(ledger.lostComponents??0)+lostComponents;
  if (lostSteel) ledger.lostSteel = (ledger.lostSteel ?? 0) + lostSteel;
  if(Object.keys(lostBlocks).length)ledger.lostBlocks=lostBlocks;
  for (const p of world.pawns) {
    if (p.bedId === structure.id) p.bedId = null;
    // A table is not exclusively reserved by its eaters. Keep their actual meal
    // and position, remove the vanished surface before ingestion can benefit.
    if (p.need?.kind === 'eat' && p.need.dining?.tableId === structure.id) p.need.dining.tableId = null;
  }
  return true;
}
