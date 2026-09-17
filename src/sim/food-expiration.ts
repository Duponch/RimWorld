import { emptySpoilage, isPerishable, ticksUntilRot } from './food-preservation.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { releaseWork } from './work-release.ts';
import type { World } from './types.ts';

/** Expire before actions: a last-tick ingredient cannot be ingested or cooked.
 * Only an expiry allocates a set or reconciles tasks; normal checks leave ages intact. */
export function expireFood(world: World): void {
  let expired: Set<number> | undefined;
  let losses: ReturnType<typeof emptySpoilage> | undefined;
  for (const pile of world.piles) if (isPerishable(pile.item) && ticksUntilRot(pile, world.tick) <= 0) {
    (expired ??= new Set()).add(pile.id);
    (losses ??= emptySpoilage())[pile.item] += pile.quantity;
  }
  if (!expired) return;
  const expiredCarriers=new Set(world.piles.filter(p=>expired.has(p.id)&&p.owner.type==='pawn').map(p=>p.owner.type==='pawn'?p.owner.pawnId:-1));
  world.piles = world.piles.filter(pile => !expired.has(pile.id));
  for (const pawn of world.pawns) {
    // A retained payload still ages normally; its loss does not cancel sleep.
    if(pawn.interruptedCargo&&expiredCarriers.has(pawn.id)){delete pawn.interruptedCargo;pawn.planCooldown=0;}
    const c = pawn.cooking, h = pawn.haul, n = pawn.need;
    const affected = c && (c.ingredients.some(i => expired.has(i.pileId)) || c.productId !== null && expired.has(c.productId))
      || h && expired.has(h.phase === 'pickup' ? h.sourcePileId : h.carryPileId!)
      || pawn.feed && expired.has(pawn.feed.phase==='pickup'?pawn.feed.sourcePileId:pawn.feed.carryPileId!)
      || n?.kind === 'eat' && expired.has(n.phase === 'pickup' ? n.sourcePileId : n.carryPileId!);
    if (!affected || releaseWork(world, pawn)) continue;
    // Another ingredient may still be carried when a remote reservation rots.
    // Retain that cargo until a physical drop is possible, without dangling IDs
    // or pretending that an incomplete recipe can resume its work progress.
    if (c) {
      c.ingredients = c.ingredients.filter(i => i.stage === 'held' && !expired.has(i.pileId));
      c.phase = 'interrupted'; c.progress = 0; c.productId = null; c.storageId = null;
      pawn.path = []; pawn.state = pawn.moveCooldown > 0 ? 'moving' : 'working';
    }
  }
  for (const item of ['berries', 'rice', 'simple-meal'] as const) if (losses![item]) {
    world.spoiled[item] += losses![item];
    world.events.push({ tick: world.tick, type: 'need', message: `${losses![item]} ${ITEM_DEFINITIONS[item].label} ont pourri.` });
  }
  if (world.events.length > 80) world.events.splice(0, world.events.length - 80);
}
