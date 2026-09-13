import { createWorld, addGroundMaterial, refreshStock } from '../../src/sim/index.ts';

/** Deterministic stress fixture: independent dining places isolate scheduling
 * from crowd deadlocks. Each diner subsequently uses an individually owned bed.
 */
export function diningFixture(size: number, count: number, preserveLandscape = false) {
  const world = createWorld(42, size, size), template = world.pawns[0]!;
  const origin = Math.floor(size / 2) - (count > 3 ? 25 : 5);
  if (!preserveLandscape) { world.tiles = world.tiles.map(() => ({ terrain: 'grass' })); world.resources = []; }
  world.piles = []; world.stockpiles = []; world.structures = [];
  world.pawns = Array.from({ length: count }, (_, index) => ({ ...structuredClone(template), id: world.nextId++, x: origin + (index % 10) * 5, z: origin + Math.floor(index / 10) * 5, hunger: 20, rest: 19, comfort: 20 }));
  if (preserveLandscape) {
    const cells = new Set<number>();
    for (const pawn of world.pawns) for (let dz = -1; dz <= 3; dz++) for (let dx = -1; dx <= 3; dx++) cells.add((pawn.z + dz) * size + pawn.x + dx);
    for (const cell of cells) world.tiles[cell] = { terrain: 'grass' };
    world.resources = world.resources.filter(item => !cells.has(item.z * size + item.x));
  }
  for (const pawn of world.pawns) {
    addGroundMaterial(world, 'food', 1, { x: pawn.x + 2, z: pawn.z });
    world.structures.push({ id: world.nextId++, kind: 'stool', x: pawn.x + 1, z: pawn.z + 1, orientation: 2, footprint: 'standard' });
    world.structures.push({ id: world.nextId++, kind: 'table', x: pawn.x + 2, z: pawn.z + 1, orientation: 0, footprint: 'standard' });
    pawn.bedId = world.nextId++;
    world.structures.push({ id: pawn.bedId, kind: 'bed', x: pawn.x, z: pawn.z + 2, orientation: 0, footprint: 'standard' });
  }
  refreshStock(world); return world;
}
