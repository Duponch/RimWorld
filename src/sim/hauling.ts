import { processFurnitureHaul } from './furniture-hauling.ts';
import { constructionSiteFree } from './construction-rules.ts';
import { copyRot } from './food-preservation.ts';
import { refuelable, WOOD_BURN_TICKS, REFUEL_WORK_TICKS } from './fuel.ts';
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
  if(task.whole){processFurnitureHaul(world,pawn,move,wake);return;}
  if (!destinationValid(world, pawn)) { releaseWork(world, pawn); return; }
  if (task.phase === 'pickup') {
    const source = world.piles.find(item => item.id === task.sourcePileId);
    if (!source || source.owner.type !== 'ground' || source.quantity < task.quantity) { releaseWork(world, pawn); return; }
    if (!nearby(pawn, source.owner)) { move(source.owner, true); return; }
    if (source.kind!=='weapon'&&(!Number.isSafeInteger(world.nextId + 1) || (source.quantity > task.quantity && world.piles.length >= 32768))) { releaseWork(world, pawn); return; }
    task.pickupCell={x:source.owner.x,z:source.owner.z};
    if(source.kind==='weapon'){
      source.owner={type:'pawn',pawnId:pawn.id};task.carryPileId=source.id;task.phase='deliver';pawn.path=[];pawn.planCooldown=0;pawn.state='working';return;
    }
    source.quantity -= task.quantity;
    if (!source.quantity) world.piles.splice(world.piles.indexOf(source), 1);
    const carryId = world.nextId++;
    world.piles.push({ id: carryId, kind: source.kind, item: source.item, quantity: task.quantity, owner: { type: 'pawn', pawnId: pawn.id }, ...copyRot(source) });
    task.carryPileId = carryId; task.phase = 'deliver'; pawn.path = []; pawn.planCooldown = 0; pawn.state = 'working'; return;
  }
  const target = destinationCell(world, task.destination);
  const carry = world.piles.find(item => item.id === task.carryPileId);
  if (!target || !carry) { releaseWork(world, pawn); return; }
  const atTarget = task.destination.type === 'job' ? footprintCells(target as Job).some(cell => adjacent(pawn, cell)) && !footprintCells(target as Job).some(cell => sameCell(pawn, cell)) : task.destination.type==='fuel'?footprintCells(target as Job).some(cell=>nearby(pawn,cell)):nearby(pawn, target);
  if (!atTarget) { move(target, task.destination.type !== 'job'); return; }
  if(task.destination.type==='job'&&!constructionSiteFree(world,target as Job,pawn.id)){releaseWork(world,pawn);return;}
  if (task.destination.type==='fuel') {
    pawn.state='working';pawn.path=[];task.serviceProgress=(task.serviceProgress??0)+1;
    if(task.serviceProgress<REFUEL_WORK_TICKS)return;
    const fire=refuelable(world,task.destination.structureId)!;
    fire.fuel!.ticks+=carry.quantity*WOOD_BURN_TICKS;
    world.piles.splice(world.piles.indexOf(carry),1);
  } else if(!transferPile(world,carry,task.destination.type === 'job' ? { type:'job',jobId:task.destination.jobId } : {type:'ground',x:target.x,z:target.z})) {releaseWork(world,pawn);return;}
  if(task.destination.type==='job')(target as Job).construction='frame';
  pawn.haul = null; if(pawn.orders.active==='haul')pawn.orders.active=null;
  pawn.path = []; pawn.state = 'idle'; pawn.planCooldown = 0; wake();
}
