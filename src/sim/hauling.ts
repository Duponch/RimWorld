import { destinationCell, destinationValid } from './work-planner.ts';
import { releaseWork } from './work-release.ts';
import { footprintCells } from './definitions.ts';
import { adjacent } from './pathfinding.ts';
import { transferPile } from './materials.ts';
import type { Cell, Job, Pawn, World } from './types.ts';
const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.z === b.z;
const nearby = (a: Cell, b: Cell) => sameCell(a, b) || adjacent(a, b);

export function processHaul(world: World, pawn: Pawn, move: (target: Cell, allowTarget: boolean) => void, wake: () => void): void {
  const task = pawn.haul!;
  if (!destinationValid(world, pawn)) { releaseWork(world, pawn); return; }
  if (task.phase === 'pickup') {
    const source = world.piles.find(item => item.id === task.sourcePileId);
    if (!source || source.owner.type !== 'ground' || source.quantity < task.quantity) { releaseWork(world, pawn); return; }
    if (!nearby(pawn, source.owner)) { move(source.owner, true); return; }
    if (!Number.isSafeInteger(world.nextId + 1) || (source.quantity > task.quantity && world.piles.length >= 32768)) { releaseWork(world, pawn); return; }
    task.pickupCell={x:source.owner.x,z:source.owner.z};
    source.quantity -= task.quantity;
    if (!source.quantity) world.piles.splice(world.piles.indexOf(source), 1);
    const carryId = world.nextId++;
    world.piles.push({ id: carryId, kind: source.kind, item: source.item, quantity: task.quantity, owner: { type: 'pawn', pawnId: pawn.id } });
    task.carryPileId = carryId; task.phase = 'deliver'; pawn.path = []; pawn.planCooldown = 0; pawn.state = 'working'; return;
  }
  const target = destinationCell(world, task.destination);
  const carry = world.piles.find(item => item.id === task.carryPileId);
  if (!target || !carry) { releaseWork(world, pawn); return; }
  const atTarget = task.destination.type === 'job' ? footprintCells(target as Job).some(cell => adjacent(pawn, cell)) && !footprintCells(target as Job).some(cell => sameCell(pawn, cell)) : nearby(pawn, target);
  if (!atTarget) { move(target, task.destination.type !== 'job'); return; }
  if(!transferPile(world,carry,task.destination.type === 'job' ? { type:'job',jobId:task.destination.jobId } : {type:'ground',x:target.x,z:target.z})) {releaseWork(world,pawn);return;}
  pawn.haul = null; pawn.path = []; pawn.state = 'idle'; pawn.planCooldown = 0; wake();
}
