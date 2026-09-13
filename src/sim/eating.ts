import { nutritionOf, ITEM_DEFINITIONS } from './items.ts';
import { adjacent } from './pathfinding.ts';
import { reservedSource } from './materials.ts';
import { adjacentTable, chooseDiningPlace, validDiningPlace } from './dining.ts';
import { rememberMeal } from './wellbeing.ts';
import type { NeedContext } from './needs.ts';
import type { Pawn, World } from './types.ts';

export const INGEST_TICKS = 50;
export const PORTION_NUTRITION = 35;

export function processEating(world: World, pawn: Pawn, context: NeedContext): void {
  const task = pawn.need;
  if (task?.kind !== 'eat') return;
  const pile = world.piles.find(item => item.id === (task.phase === 'pickup' ? task.sourcePileId : task.carryPileId));
  if (!pile || pile.kind !== 'food') { context.release(); return; }
  if (task.phase === 'pickup') {
    if (pile.owner.type !== 'ground' || reservedSource(world, pile.id) > pile.quantity) { context.release(); return; }
    if ((pawn.x !== pile.owner.x || pawn.z !== pile.owner.z) && !adjacent(pawn, pile.owner)) { context.move(pile.owner, false); return; }
    if (pile.quantity === task.quantity) {
      pile.owner = { type: 'pawn', pawnId: pawn.id }; task.carryPileId = pile.id;
    } else {
      if (world.piles.length >= 32768 || !Number.isSafeInteger(world.nextId + 1)) { context.release(); return; }
      pile.quantity -= task.quantity; task.carryPileId = world.nextId++;
      world.piles.push({ id: task.carryPileId, kind: 'food', item: pile.item, quantity: task.quantity, owner: { type: 'pawn', pawnId: pawn.id } });
    }
    task.phase = 'choose-spot'; pawn.path = []; pawn.state = 'moving'; pawn.needCooldown = 0;
    return;
  }
  if (pile.owner.type !== 'pawn' || pile.owner.pawnId !== pawn.id || pile.quantity !== task.quantity) { context.release(); return; }
  if (task.dining && !validDiningPlace(world, task.dining)) {
    task.phase = 'choose-spot'; task.dining = null; task.progress = 0;
    pawn.path = []; pawn.state = 'moving'; pawn.needCooldown = 0;
  }
  if (task.phase === 'choose-spot') {
    const choice = chooseDiningPlace(world, pawn, context);
    if (!choice) return;
    task.dining = choice.place; task.phase = 'travel'; pawn.path = choice.path;
  }
  if (!task.dining) { context.release(); return; }
  if (task.phase === 'travel') {
    if (pawn.x !== task.dining.target.x || pawn.z !== task.dining.target.z) { context.move(task.dining.target, true); return; }
    task.phase = 'ingest'; pawn.path = []; pawn.state = 'eating';
    // The surface is checked on arrival and again at completion, never remotely.
    task.dining.tableId = adjacentTable(world, pawn)?.id ?? null;
    return;
  }
  pawn.state = 'eating';
  if (++task.progress >= INGEST_TICKS) {
    world.piles.splice(world.piles.indexOf(pile), 1);
    pawn.hunger = Math.min(100, pawn.hunger + nutritionOf(pile));
    const atTable = adjacentTable(world, pawn) !== null;
    rememberMeal(world, pawn, atTable);
    pawn.need = null; pawn.state = 'idle'; pawn.planCooldown = 0; pawn.needCooldown = 0;
    context.event(`${pawn.name} a mangé une portion (${task.quantity} × ${ITEM_DEFINITIONS[pile.item].label}) ${atTable ? 'à table' : 'sans table'}.`);
  }
}
