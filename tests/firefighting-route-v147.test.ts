import { expect, test } from 'vitest';
import { candidateAccess } from '../src/sim/candidate-access.ts';
import { firefightingProposal, firefightingTargets, fireTouch } from '../src/sim/firefighting.ts';
import { firePosition } from '../src/sim/fire-rules.ts';
import { canStopAt, blockedCells, routeCost, routeToCell, workNeighbours } from '../src/sim/pathfinding.ts';
import { deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { fireCamp, woodFire } from './scenarios/fire.ts';
import type { Reachability } from '../src/sim/pathfinding.ts';
import type { Cell, Pawn, World } from '../src/sim/types.ts';

/** The pre-V147 proposal: filter in source order, route every candidate, then
 * choose the first route among equal path lengths by stable sort. */
function originalProposal(world: World, pawn: Pawn, reach: Reachability) {
  for (const fire of firefightingTargets(world, pawn)) {
    const target = firePosition(world, fire)!;
    const paths = [target, ...workNeighbours(target, 'mine')]
      .filter(cell => cell.x >= 0 && cell.z >= 0 && cell.x < world.width && cell.z < world.height
        && fireTouch(world, cell, target) && canStopAt(world, cell, reach))
      .map(cell => routeToCell(world, cell, reach))
      .filter((path): path is Cell[] => path !== null)
      .sort((a, b) => a.length - b.length);
    if (paths.length) return { fireId: fire.id, target: { x: target.x, z: target.z }, path: paths[0]! };
  }
  return undefined;
}

function fixture(origin: Cell, fires: Cell[]) {
  const world = fireCamp(), pawn = world.pawns[0]!;
  pawn.x = origin.x; pawn.z = origin.z; pawn.priorities.firefight = 1;
  const ids = fires.map(cell => woodFire(world, cell));
  world.home = [...new Set(fires.map(cell => cell.z * world.width + cell.x))].sort((a, b) => a - b);
  return { world, pawn, ids };
}
const access = (world: World, pawn: Pawn) => candidateAccess(world, pawn, blockedCells(world), new Set<number>(), true);

function compare(world: World, pawn: Pawn) {
  const before = serializeWorld(world), rng = world.rng, fireRng = world.fires?.rng;
  const oldReach = access(world, pawn), newReach = access(world, pawn);
  const old = originalProposal(world, pawn, oldReach);
  const current = firefightingProposal(world, pawn, newReach);
  expect(current).toEqual(old);
  expect(world.rng).toBe(rng);
  expect(world.fires?.rng).toBe(fireRng);
  expect(serializeWorld(world)).toBe(before);
  // The lazy weighted field is shared with later work candidates. Query the
  // same later destinations to check path and cost after each proposal order.
  for (const target of [{ x: 2, z: 2 }, { x: 20, z: 20 }, { x: 29, z: 29 }]) {
    const oldPath = routeToCell(world, target, oldReach);
    const newPath = routeToCell(world, target, newReach);
    expect(newPath).toEqual(oldPath);
    if (oldPath && newPath) expect(routeCost(world, newPath, newReach)).toBe(routeCost(world, oldPath, oldReach));
  }
  expect(serializeWorld(world)).toBe(before);
  return current;
}

test('a colonist already in contact keeps the exact zero-step proposal', () => {
  const { world, pawn, ids } = fixture({ x: 13, z: 16 }, [{ x: 14, z: 16 }]);
  expect(compare(world, pawn)).toEqual({ fireId: ids[0], target: { x: 14, z: 16 }, path: [] });
});

test('the lower bound uses the reachability origin even when it differs from the pawn', () => {
  const { world, pawn, ids } = fixture({ x: 12, z: 16 }, [{ x: 17, z: 16 }]);
  const before = serializeWorld(world), rng = world.rng, fireRng = world.fires?.rng;
  // From the pawn, the west contact cell looks closer. From reach.start,
  // the east cell is closer; a pawn-based bound can wrongly prune it.
  const start = { x: 22, z: 16 };
  const oldReach = candidateAccess(world, start, blockedCells(world), new Set<number>(), true);
  const newReach = candidateAccess(world, start, blockedCells(world), new Set<number>(), true);
  const priorTarget = { x: 22, z: 20 };
  expect(routeToCell(world, priorTarget, newReach)).toEqual(routeToCell(world, priorTarget, oldReach));
  const expected = originalProposal(world, pawn, oldReach);
  expect(expected?.fireId).toBe(ids[0]);
  expect(expected?.target).toEqual({ x: 17, z: 16 });
  expect(expected?.path.at(-1)).toEqual({ x: 18, z: 16 });
  expect(firefightingProposal(world, pawn, newReach)).toEqual(expected);
  expect(world.rng).toBe(rng);
  expect(world.fires?.rng).toBe(fireRng);
  expect(serializeWorld(world)).toBe(before);
});

test('a rock barrier forces the same real detour around the fire', () => {
  const { world, pawn } = fixture({ x: 6, z: 16 }, [{ x: 12, z: 16 }]);
  for (let z = 0; z < world.height; z++) if (z !== 24) world.tiles[z * world.width + 9] = { terrain: 'rock' };
  const proposal = compare(world, pawn);
  expect(proposal).toBeDefined();
  expect(proposal!.path.length).toBeGreaterThan(6);
});

test('equal-length routes keep the earliest contact cell from the original order', () => {
  const { world, pawn } = fixture({ x: 13, z: 16 }, [{ x: 17, z: 16 }]);
  const proposal = compare(world, pawn);
  expect(proposal?.path.at(-1)).toEqual({ x: 16, z: 16 });
});

test('an unreachable first fire does not hide a later reachable fire', () => {
  const { world, pawn, ids } = fixture({ x: 13, z: 16 }, [{ x: 17, z: 16 }, { x: 8, z: 16 }]);
  for (let z = 0; z < world.height; z++) world.tiles[z * world.width + 15] = { terrain: 'rock' };
  expect(compare(world, pawn)?.fireId).toBe(ids[1]);
});

test('planner continuation from a real fire fixture stays valid and deterministic', () => {
  const { world, pawn } = fixture({ x: 13, z: 16 }, [{ x: 17, z: 16 }, { x: 19, z: 18 }]);
  compare(world, pawn);
  const resumed = deserializeWorld(serializeWorld(world));
  stepWorld(world, 8); stepWorld(resumed, 8);
  expect(validateWorld(world)).toEqual([]);
  expect(serializeWorld(world)).toBe(serializeWorld(resumed));
});
