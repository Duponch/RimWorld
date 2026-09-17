import { groundCapacity, planGroundPlacement } from './ground-placement.ts';
import { newWeaponState } from './equipment-rules.ts';
import { freshRot, mergeRot, rotAge } from './food-preservation.ts';
import { ITEM_DEFINITIONS, legacyItem } from './items.ts';
import type { ItemId } from './items.ts';
import { MAX_STACK } from './definitions.ts';
import { isCookingOrder } from './order-types.ts';
import { haulReservations } from './haul-reservations.ts';
import type { Cell, HaulDestination, MaterialKind, MaterialOwner, MaterialPile, Stock, World } from './types.ts';

export function pileCell(world: World, pile: MaterialPile): Cell | null {
  const owner = pile.owner;
  if (owner.type === 'ground') return { x: owner.x, z: owner.z };
  if (owner.type === 'pawn'||owner.type==='equipment') return world.pawns.find(pawn => pawn.id === owner.pawnId) ?? null;
  return world.jobs.find(job => job.id === owner.jobId) ?? null;
}
export function deliveredStock(world: World, jobId: number): Stock {
  const stock: Stock = { wood: 0, food: 0 };
  for (const pile of world.piles) if ((pile.kind === 'wood' || pile.kind === 'food') && pile.owner.type === 'job' && pile.owner.jobId === jobId) stock[pile.kind] += pile.quantity;
  return stock;
}
export function refreshStock(world: World): void {
  const stock: Stock = { wood: 0, food: 0 };
  const delivered = new Map(world.jobs.map(job => [job.id, { wood: 0, food: 0 }]));
  for (const pile of world.piles) {
    if(pile.kind!=='wood'&&pile.kind!=='food')continue;
    if (pile.owner.type === 'job') {
      const value = delivered.get(pile.owner.jobId);
      if (value) value[pile.kind] += pile.quantity;
    } else stock[pile.kind] += pile.quantity;
  }
  world.stock = stock;
  for (const job of world.jobs) job.escrow = delivered.get(job.id)!;
}
const sameOwner = (a: MaterialOwner, b: MaterialOwner): boolean => a.type === b.type
  && (a.type === 'ground' && b.type === 'ground' ? a.x === b.x && a.z === b.z
    : (a.type==='pawn'||a.type==='equipment')&&(b.type==='pawn'||b.type==='equipment') ? a.pawnId === b.pawnId
      : a.type === 'job' && b.type === 'job' && a.jobId === b.jobId);

export function materialCanFit(world: World, kind: MaterialKind, quantity: number, owner: MaterialOwner, item: ItemId = legacyItem(kind)): boolean {
  if(kind==='weapon'&&owner.type==='job')return false;
  if(owner.type==='equipment'&&(kind!=='weapon'||quantity!==1||world.piles.some(p=>p.owner.type==='equipment'&&p.owner.pawnId===owner.pawnId)))return false;
  if (owner.type === 'ground' && quantity > groundCapacity(world, owner, item)) return false;
  const limit = ITEM_DEFINITIONS[item].stackLimit;
  let remaining = quantity;
  for (const pile of world.piles) if (pile.item === item && sameOwner(pile.owner, owner)) remaining -= limit - pile.quantity;
  const needed = Math.ceil(Math.max(0, remaining) / limit);
  return world.piles.length + needed <= 32768 && Number.isSafeInteger(world.nextId + needed);
}

export function addMaterial(world: World, kind: MaterialKind, quantity: number, owner: MaterialOwner, item: ItemId = legacyItem(kind)): void {
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > MAX_STACK * 32768) throw new Error('Material quantity exceeds supported range.');
  if (!Object.hasOwn(ITEM_DEFINITIONS, item) || ITEM_DEFINITIONS[item].kind !== kind) throw new Error('Unknown or incompatible item.');
  const limit = ITEM_DEFINITIONS[item].stackLimit;
  if (owner.type === 'ground' && (!Number.isInteger(owner.x) || !Number.isInteger(owner.z) || owner.x < 0 || owner.z < 0 || owner.x >= world.width || owner.z >= world.height)) throw new Error('Invalid material position.');
  if (owner.type === 'ground' && (['water', 'rock'].includes(world.tiles[owner.z * world.width + owner.x]!.terrain)
    || world.structures.some(item => item.kind === 'wall' && item.x === owner.x && item.z === owner.z)
    || world.schemaVersion<16&&world.jobs.some(item => item.kind === 'wall' && item.x === owner.x && item.z === owner.z))) throw new Error('Material destination is impassable.');
  if ((owner.type === 'pawn'||owner.type==='equipment') && !world.pawns.some(pawn => pawn.id === owner.pawnId)) throw new Error('Material carrier does not exist.');
  if (owner.type === 'job' && !world.jobs.some(job => job.id === owner.jobId)) throw new Error('Material construction does not exist.');
  if (!materialCanFit(world, kind, quantity, owner, item)) throw new Error('Material pile limit exceeded.');
  for (const pile of world.piles) {
    if (!quantity) break;
    if (pile.item !== item || !sameOwner(pile.owner, owner)) continue;
    const moved = Math.min(limit - pile.quantity, quantity);
    mergeRot(pile, moved, 0, world.tick);
    pile.quantity += moved; quantity -= moved;
  }
  while (quantity > 0) {
    const moved = Math.min(limit, quantity);
    world.piles.push({ id: world.nextId++, kind, item, quantity: moved, owner: { ...owner }, ...freshRot(item, world.tick),...kind==='weapon'?{weapon:newWeaponState()}:{}});
    quantity -= moved;
  }
  refreshStock(world);
}
export function addGroundMaterial(world: World, kind: MaterialKind, quantity: number, cell: Cell, item: ItemId = legacyItem(kind)): void {
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > MAX_STACK * 32768) throw new Error('Invalid ground quantity.');
  if (!Object.hasOwn(ITEM_DEFINITIONS,item) || ITEM_DEFINITIONS[item].kind!==kind) throw new Error('Invalid ground item.');
  const plan = planGroundPlacement(world, quantity, cell, item);
  if (!plan || world.piles.length + plan.length > 32768 || !Number.isSafeInteger(world.nextId + plan.length)) throw new Error('No room for ground material.');
  for (const part of plan) addMaterial(world, kind, part.quantity, { type:'ground', ...part.cell }, item);
}
/** Move the existing stack, merging only when possible. No allocation or identity budget needed. */
export function transferPile(world:World,pile:MaterialPile,owner:MaterialOwner):boolean {
  const carrier=pile.owner.type==='pawn'?pile.owner.pawnId:undefined;
  if(owner.type==='ground'&&groundCapacity(world,owner,pile.item,carrier)<pile.quantity)return false;
  const target=world.piles.find(p=>p!==pile&&p.item===pile.item&&sameOwner(p.owner,owner)&&p.quantity+pile.quantity<=ITEM_DEFINITIONS[pile.item].stackLimit);
  if(target){mergeRot(target,pile.quantity,rotAge(pile,world.tick),world.tick);target.quantity+=pile.quantity;world.piles.splice(world.piles.indexOf(pile),1);}else pile.owner={...owner};
  refreshStock(world);return true;
}
export function reservedSource(world: World, pileId: number, exceptPawn?: number): number {
  let quantity = 0;
  for (const pawn of world.pawns) {
    if (pawn.id !== exceptPawn) {
      if(pawn.equipmentTask?.action==='equip'&&pawn.equipmentTask.itemId===pileId)quantity++;
      for(const i of pawn.cooking?.ingredients??[])if(i.pileId===pileId&&i.stage!=='held')quantity+=i.quantity;
      if(pawn.tend?.phase==='pickup'&&pawn.tend.medicine?.sourcePileId===pileId)quantity+=pawn.tend.medicine.quantity;
      if(pawn.feed?.phase==='pickup'&&pawn.feed.sourcePileId===pileId)quantity+=pawn.feed.quantity;
      if(pawn.haul?.phase==='pickup'&&pawn.haul.sourcePileId===pileId)quantity+=pawn.haul.quantity;
      if (pawn.need?.kind === 'eat' && pawn.need.phase === 'pickup' && pawn.need.sourcePileId === pileId) quantity += pawn.need.quantity ?? 1;
    }
    const queue=pawn.orders?.queue;
    if(queue?.length)for(const task of queue)if(typeof task!=='number') {
      if(isCookingOrder(task)){for(const i of task.cooking.ingredients)if(i.pileId===pileId)quantity+=i.quantity;}
      else if(task.sourcePileId===pileId)quantity+=task.quantity;
    }
  }
  return quantity;
}
export function sameDestination(a: HaulDestination, b: HaulDestination): boolean {
  return a.type === b.type && (a.type === 'job' && b.type === 'job' ? a.jobId === b.jobId
    : a.type === 'fuel' && b.type === 'fuel' ? a.structureId === b.structureId
    : a.type === 'stockpile' && b.type === 'stockpile' ? a.stockpileId === b.stockpileId
      : a.type === 'aside' && b.type === 'aside' && a.x === b.x && a.z === b.z);
}
export function reservedDestination(world: World, destination: HaulDestination, exceptPawn?: number, item?:ItemId): number {
  let quantity = 0;
  for(const task of haulReservations(world,exceptPawn))if(sameDestination(task.destination,destination)
    &&(item===undefined||!task.whole&&world.piles.find(p=>p.id===(task.phase==='pickup'?task.sourcePileId:task.carryPileId))?.item===item))quantity+=task.quantity;
  return quantity;
}
export function groundQuantity(world: World, cell: Cell): number {
  let quantity = 0;
  for (const pile of world.piles) if (pile.owner.type === 'ground' && pile.owner.x === cell.x && pile.owner.z === cell.z) quantity += pile.quantity;
  return quantity;
}
