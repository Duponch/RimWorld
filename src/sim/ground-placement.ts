import { blockedCells, cellIndex, inBounds } from './pathfinding.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import type { Cell, MaterialPile, StockpileCell, World } from './types.ts';

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
function cellCapacity(world: World, cell: Cell, item: ItemId, limit: number, exceptPawn?: number, zone=world.stockpiles.find(z=>z.x===cell.x&&z.z===cell.z)): number {
  const pile = groundPile(world, cell);
  if (pile && pile.item!==item) return 0;
  let capacity = Math.min(limit,ITEM_DEFINITIONS[item].stackLimit)-(pile?.quantity??0);
  for (const pawn of world.pawns) if (pawn.id!==exceptPawn && pawn.haul && (
    (zone && pawn.haul.destination.type==='stockpile' && pawn.haul.destination.stockpileId===zone.id)
    || (pawn.haul.destination.type==='aside' && pawn.haul.destination.x===cell.x && pawn.haul.destination.z===cell.z))) {
    const task=pawn.haul, reserved=world.piles.find(p=>p.id===(task.phase==='pickup'?task.sourcePileId:task.carryPileId));
    if (!reserved || reserved.item!==item) return 0;
    capacity -= task.quantity;
  }
  return Math.max(0,capacity);
}
export function groundCapacity(world: World, cell: Cell, item: ItemId, exceptPawn?: number): number {
  return cellCapacity(world,cell,item,ITEM_DEFINITIONS[item].stackLimit,exceptPawn);
}
export function storageCapacity(world: World, zone: StockpileCell, item: ItemId, exceptPawn?: number): number {
  return zone.filters[ITEM_DEFINITIONS[item].kind] ? cellCapacity(world,zone,item,zone.capacity,exceptPawn,zone) : 0;
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
  const cell=nearbyGround(world,origin).find(c=>!groundPile(world,c)&&groundCapacity(world,c,pile.item,carrier)>=pile.quantity);
  if(!cell) return false;
  pile.owner={type:'ground',...cell}; return true;
}
