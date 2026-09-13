import { MAX_STACK } from './definitions.ts';
import type { Cell, HaulDestination, MaterialKind, MaterialOwner, MaterialPile, Stock, World } from './types.ts';

export function pileCell(world: World, pile: MaterialPile): Cell | null {
  const owner = pile.owner;
  if (owner.type === 'ground') return { x: owner.x, z: owner.z };
  if (owner.type === 'pawn') return world.pawns.find(pawn => pawn.id === owner.pawnId) ?? null;
  return world.jobs.find(job => job.id === owner.jobId) ?? null;
}
export function deliveredStock(world: World, jobId: number): Stock {
  const stock: Stock = { wood: 0, food: 0 };
  for (const pile of world.piles) if (pile.owner.type === 'job' && pile.owner.jobId === jobId) stock[pile.kind] += pile.quantity;
  return stock;
}
export function refreshStock(world: World): void {
  const stock: Stock = { wood: 0, food: 0 };
  const delivered = new Map(world.jobs.map(job => [job.id, { wood: 0, food: 0 }]));
  for (const pile of world.piles) {
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
    : a.type === 'pawn' && b.type === 'pawn' ? a.pawnId === b.pawnId
      : a.type === 'job' && b.type === 'job' && a.jobId === b.jobId);

export function materialCanFit(world: World, kind: MaterialKind, quantity: number, owner: MaterialOwner): boolean {
  let remaining = quantity;
  for (const pile of world.piles) if (pile.kind === kind && sameOwner(pile.owner, owner)) remaining -= MAX_STACK - pile.quantity;
  const needed = Math.ceil(Math.max(0, remaining) / MAX_STACK);
  return world.piles.length + needed <= 32768 && Number.isSafeInteger(world.nextId + needed);
}

export function addMaterial(world: World, kind: MaterialKind, quantity: number, owner: MaterialOwner): void {
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > MAX_STACK * 32768) throw new Error('Material quantity exceeds supported range.');
  if (kind !== 'wood' && kind !== 'food') throw new Error('Unknown material.');
  if (owner.type === 'ground' && (!Number.isInteger(owner.x) || !Number.isInteger(owner.z) || owner.x < 0 || owner.z < 0 || owner.x >= world.width || owner.z >= world.height)) throw new Error('Invalid material position.');
  if (owner.type === 'ground' && (['water', 'rock'].includes(world.tiles[owner.z * world.width + owner.x]!.terrain)
    || [...world.structures, ...world.jobs].some(item => item.kind === 'wall' && item.x === owner.x && item.z === owner.z))) throw new Error('Material destination is impassable.');
  if (owner.type === 'pawn' && !world.pawns.some(pawn => pawn.id === owner.pawnId)) throw new Error('Material carrier does not exist.');
  if (owner.type === 'job' && !world.jobs.some(job => job.id === owner.jobId)) throw new Error('Material construction does not exist.');
  if (!materialCanFit(world, kind, quantity, owner)) throw new Error('Material pile limit exceeded.');
  for (const pile of world.piles) {
    if (!quantity) break;
    if (pile.kind !== kind || !sameOwner(pile.owner, owner)) continue;
    const moved = Math.min(MAX_STACK - pile.quantity, quantity);
    pile.quantity += moved; quantity -= moved;
  }
  while (quantity > 0) {
    const moved = Math.min(MAX_STACK, quantity);
    world.piles.push({ id: world.nextId++, kind, quantity: moved, owner: { ...owner } });
    quantity -= moved;
  }
  refreshStock(world);
}
export function addGroundMaterial(world: World, kind: MaterialKind, quantity: number, cell: Cell): void {
  addMaterial(world, kind, quantity, { type: 'ground', x: cell.x, z: cell.z });
}
export function reservedSource(world: World, pileId: number): number {
  let quantity = 0;
  for (const pawn of world.pawns) {
    if (pawn.haul?.phase === 'pickup' && pawn.haul.sourcePileId === pileId) quantity += pawn.haul.quantity;
    if (pawn.need?.kind === 'eat' && pawn.need.phase === 'pickup' && pawn.need.sourcePileId === pileId) quantity++;
  }
  return quantity;
}
export function sameDestination(a: HaulDestination, b: HaulDestination): boolean {
  return a.type === b.type && (a.type === 'job' && b.type === 'job' ? a.jobId === b.jobId
    : a.type === 'stockpile' && b.type === 'stockpile' && a.stockpileId === b.stockpileId);
}
export function reservedDestination(world: World, destination: HaulDestination, exceptPawn?: number): number {
  let quantity = 0;
  for (const pawn of world.pawns) if (pawn.id !== exceptPawn && pawn.haul && sameDestination(pawn.haul.destination, destination)) quantity += pawn.haul.quantity;
  return quantity;
}
export function groundQuantity(world: World, cell: Cell): number {
  let quantity = 0;
  for (const pile of world.piles) if (pile.owner.type === 'ground' && pile.owner.x === cell.x && pile.owner.z === cell.z) quantity += pile.quantity;
  return quantity;
}
