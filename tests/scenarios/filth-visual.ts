import { cleanlinessCamp, enclosedRoom } from './cleanliness';
import { addFilth } from '../../src/sim/filth';
import { FILTH_KINDS } from '../../src/sim/filth-rules';

/** Visual specimen chart, not an organically played colony. */
export function filthVisualFixture() {
  const world = cleanlinessCamp(), pawn = world.pawns[0]!;
  world.tick = 3000; // Prepared midday specimen chart, not elapsed survival.
  for (let z = 5; z < 20; z++) for (let x = 3; x < 29; x++) world.tiles[z * world.width + x]!.floor = z < 13 ? 'marble-tile' : 'slate-tile';
  for (const [column, kind] of FILTH_KINDS.entries()) for (const [row, thickness] of [1, 3, 5].entries()) {
    addFilth(world, { x: 5 + column * 4, z: 7 + row * 5 }, kind, thickness);
  }
  // Same cell, distinct kinds: alpha composition must leave the floor readable.
  addFilth(world, { x: 21, z: 22 }, 'blood', 3);
  world.tiles[22 * world.width + 21]!.floor = 'wood-planks';
  addFilth(world, { x: 21, z: 22 }, 'dirt', 3);
  const room = enclosedRoom(world, { x: 5, z: 21 }, 6), dirty = { x: 8, z: 24 };
  for (const i of room.cells) world.tiles[i]!.floor = 'marble-tile';
  world.home = [...room.cells].sort((a, b) => a - b);
  pawn.x = 8; pawn.z = 23; pawn.priorities.clean = 1;
  addFilth(world, dirty, 'blood', 5);
  const targetId = world.filth!.items.find(f => f.x === dirty.x && f.z === dirty.z)!.id;
  return { world, dirty, targetId, pawnId: pawn.id };
}
