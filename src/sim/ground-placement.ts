import { groundOccupancyAllows, storageOccupancyAllows } from './occupancy.ts';
import { isCookingOrder } from './order-types.ts';
import { blockedCells, cellIndex, inBounds } from './pathfinding.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import { storageAccepts } from './storage-filters.ts';
import type { Cell, HaulTask, MaterialPile, StockpileCell, World } from './types.ts';

/** Connected nearby cells, deterministic breadth first order. Never spill across a wall. */
export function nearbyGround(world: World, origin: Cell, radius = 12): Cell[] {
  if (!inBounds(world, origin.x, origin.z)) return [];
  const blocked = blockedCells(world), seen = new Set<number>([cellIndex(world, origin.x, origin.z)]);
  const queue: Cell[] = [{ x: origin.x, z: origin.z }], result: Cell[] = [];
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]!;
    if (!blocked[cellIndex(world, c.x, c.z)]) result.push(c);
    for (const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]]) {
      const x = c.x + dx!, z = c.z + dz!, key = cellIndex(world,x,z);
      if (inBounds(world,x,z) && Math.abs(x-origin.x)+Math.abs(z-origin.z)<=radius && !seen.has(key) && !blocked[key]) { seen.add(key); queue.push({x,z}); }
    }
  }
  return result;
}
export function groundPile(world: World, cell: Cell): MaterialPile | undefined {
  return world.piles.find(p=>p.owner.type==='ground' && p.owner.x===cell.x && p.owner.z===cell.z);
}
/** One synchronous placement decision only; never retain across ownership changes. */
export function groundPileCells(world:World):ReadonlySet<number> {
  const cells=new Set<number>();
  for(const p of world.piles)if(p.owner.type==='ground')cells.add(p.owner.z*world.width+p.owner.x);
  return cells;
}
function cellCapacity(world: World, cell: Cell, item: ItemId, limit: number, exceptPawn?: number, zone=world.stockpiles.find(z=>z.x===cell.x&&z.z===cell.z)): number {
  if(world.packed?.some(p=>p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z))return 0;
  const pile = groundPile(world, cell);
  if (pile && pile.item!==item) return 0;
  let capacity = Math.min(limit,ITEM_DEFINITIONS[item].stackLimit)-(pile?.quantity??0);
  if(capacity<=0||world.schemaVersion>=21&&(!groundOccupancyAllows(world,cell)||zone&&!storageOccupancyAllows(world,cell)))return 0;
  // Hot capacity queries must not allocate an array/generator of every transport.
  for (const pawn of world.pawns) {
    if(pawn.id!==exceptPawn&&pawn.ward?.kind==='food'&&pawn.ward.spot.x===cell.x&&pawn.ward.spot.z===cell.z){
      const t=pawn.ward,food=world.piles.find(p=>p.id===(t.phase==='pickup'?t.sourcePileId:t.carryPileId));
      if(!food||food.item!==item)return 0;capacity-=t.quantity;
    }
    if(pawn.id!==exceptPawn&&pawn.haul)capacity-=reservedAt(world,pawn.haul,cell,item,zone);
    const queue=pawn.orders?.queue;
    if(queue?.length)for(const task of queue)if(typeof task!=='number') {
      if(isCookingOrder(task)) {
        for(const i of task.cooking.ingredients)if(i.stage!=='placed'&&i.cell.x===cell.x&&i.cell.z===cell.z){if(i.item!==item)return 0;capacity-=i.quantity;}
      } else capacity-=reservedAt(world,task,cell,item,zone);
    }
    if(capacity<=0)return 0;
  }
  for(const pawn of world.pawns)if(pawn.id!==exceptPawn&&pawn.cooking) {
    for(const i of pawn.cooking.ingredients)if(i.stage!=='placed'&&i.cell.x===cell.x&&i.cell.z===cell.z) {if(i.item!==item)return 0;capacity-=i.quantity;}
    if(zone&&pawn.cooking.phase==='output'&&pawn.cooking.storageId===zone.id){const product=world.piles.find(p=>p.id===pawn.cooking!.productId);if(!product||product.item!==item)return 0;capacity-=pawn.cooking.storageQuantity??product.quantity;}
  }
  return Math.max(0,capacity);
}
function reservedAt(world:World,task:HaulTask,cell:Cell,item:ItemId,zone?:StockpileCell):number {
  const d=task.destination;
  if(!(zone&&d.type==='stockpile'&&d.stockpileId===zone.id)&&!(d.type==='aside'&&d.x===cell.x&&d.z===cell.z))return 0;
  if(task.whole)return Infinity;
  const pile=world.piles.find(p=>p.id===(task.phase==='pickup'?task.sourcePileId:task.carryPileId));
  return pile?.item===item?task.quantity:Infinity;
}
export function groundCapacity(world: World, cell: Cell, item: ItemId, exceptPawn?: number): number {
  return cellCapacity(world,cell,item,ITEM_DEFINITIONS[item].stackLimit,exceptPawn);
}
export function storageCapacity(world: World, zone: StockpileCell, item: ItemId, exceptPawn?: number): number {
  return storageAccepts(zone,item) ? cellCapacity(world,zone,item,zone.capacity,exceptPawn,zone) : 0;
}
export function planGroundPlacement(world: World, quantity: number, origin: Cell, item: ItemId): {cell:Cell; quantity:number}[] | null {
  const result: {cell:Cell;quantity:number}[]=[];
  for (const cell of nearbyGround(world,origin)) {
    const moved=Math.min(quantity,groundCapacity(world,cell,item));
    if(moved>0) {result.push({cell,quantity:moved});quantity-=moved;}
    if(!quantity) return result;
  }
  return quantity===0?result:null;
}
/** Retains identity, including an interrupted meal that will be reserved again. */
export function dropRetainingIdentity(world: World, pile: MaterialPile, origin: Cell): boolean {
  const carrier=pile.owner.type==='pawn'?pile.owner.pawnId:undefined;
  const occupied=groundPileCells(world);
  const cell=nearbyGround(world,origin).find(c=>!occupied.has(c.z*world.width+c.x)&&groundCapacity(world,c,pile.item,carrier)>=pile.quantity);
  if(!cell) return false;
  pile.owner={type:'ground',...cell}; return true;
}
