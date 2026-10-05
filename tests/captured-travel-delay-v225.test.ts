import { expect, test } from 'vitest';
import { validCapturedTravelDelay } from '../src/sim/captured-travel-delay.ts';
import { startTravel } from '../src/sim/movement.ts';
import { travelEnd } from '../src/sim/travel-timing.ts';
import { terrainTravelDelay } from '../src/sim/furniture-travel.ts';
import { burnFloor } from '../src/sim/flooring.ts';
import { ensureFireState } from '../src/sim/fire-rules.ts';
import { validatePawnRecordShape } from '../src/sim/pawn-record-save.ts';
import { applyCommand, deserializeWorld, serializeWorld, validateWorld, stepWorld } from '../src/sim/index.ts';
import type { Pawn, World } from '../src/sim/types.ts';
import { cleanlinessCamp } from './scenarios/cleanliness.ts';

const durationError = 'Inconsistent travel duration.';
const cases = [{ source: 'fence', delay: 2, introduced: 119 },
  { source: 'burned-wood', delay: .1, introduced: 89 }] as const;
function physicalEdge(source: typeof cases[number]['source']) {
  const world = cleanlinessCamp(), pawn = world.pawns[0]!, target = { x: pawn.x + 1, z: pawn.z + 1 };
  // A controlled quiet fixture exposes the edge rather than selecting other work.
  for (const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[]) pawn.priorities[key] = 0;
  if (source === 'fence') world.structures.push({ id: world.nextId++, kind: 'fence', ...target,
    orientation: 0, footprint: 'standard', material: 'wood' });
  else {
    world.tiles[target.z * world.width + target.x]!.floor = 'wood-planks';
    ensureFireState(world);
    expect(burnFloor(world, target)).toBe(true);
    expect(world.fires!.ledger.items.wood).toBe(3);
    expect(terrainTravelDelay(world, target.z * world.width + target.x)).toBe(.1);
  }
  expect(validateWorld(world)).toEqual([]);
  expect(applyCommand(world, { type: 'draft', pawnIds: [pawn.id], enabled: true }).ok).toBe(true);
  expect(applyCommand(world, { type: 'draft-move', pawnIds: [pawn.id], target, queue: false }).ok).toBe(true);
  expect(pawn.draft!.target).toEqual(target);
  expect(pawn.path).toEqual([target]);
  expect(startTravel(world, pawn, target)).toBe(true);
  pawn.path.shift(); // Consume exactly the admitted edge, as processDraft does.
  return { world, pawn, target };
}
function pawnShape(world: World, version: number): string[] {
  return validatePawnRecordShape(world.pawns[0]! as unknown as Record<string, unknown>, world, version);
}

test.each(cases)('a real $source edge saves and resumes the exact captured invoice', ({ source, delay }) => {
  const { world, pawn } = physicalEdge(source), captured = structuredClone(pawn.motion)!;
  expect(captured.terrainDelay).toBe(delay);
  expect(captured.end).toBe(travelEnd(captured));
  expect(pawn.moveCooldown).toBe(captured.end - world.tick);
  expect(validateWorld(world)).toEqual([]);
  const restored = deserializeWorld(serializeWorld(world));
  expect(restored).toStrictEqual(world);
  expect(restored.pawns[0]!.motion).toStrictEqual(captured);
  expect(restored.pawns[0]!.moveCooldown).toBe(pawn.moveCooldown);
  for (let tick = 0; tick < 12; tick++) {
    stepWorld(world); stepWorld(restored);
    expect(validateWorld(world)).toEqual([]);
    expect(restored).toStrictEqual(world);
    if (world.tick < captured.end) {
      expect(pawn.motion).toStrictEqual(captured);
      expect(pawn.moveCooldown).toBe(captured.end - world.tick);
    }
  }
  expect({ x: pawn.x, z: pawn.z }).toEqual(captured.to);
  expect(pawn.moveCooldown).toBe(0);
  expect(pawn.state).toBe('idle');
});

test.each(cases)('$source cost remains captured when its source disappears during travel', ({ source, delay }) => {
  const { world, pawn, target } = physicalEdge(source), captured = structuredClone(pawn.motion);
  if (source === 'fence') world.structures = [];
  else delete world.tiles[target.z * world.width + target.x]!.floor;
  expect(pawn.motion).toStrictEqual(captured);
  expect(pawn.motion!.terrainDelay).toBe(delay);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toStrictEqual(world);
});

test.each(cases)('$source delay is admitted at schema $introduced and refused in its predecessor', ({ source, delay, introduced }) => {
  const { world } = physicalEdge(source);
  expect(validCapturedTravelDelay(delay, introduced)).toBe(true);
  expect(validCapturedTravelDelay(delay, introduced - 1)).toBe(false);
  // Other modern fields may be future to that old schema; inspect the duration
  // verdict itself, without inventing or migrating a historical colony.
  expect(pawnShape(world, introduced)).not.toContain(durationError);
  expect(pawnShape(world, introduced - 1)).toContain(durationError);
});

test('all historical allowed costs keep their exact version boundaries', () => {
  const boundaries: Array<[number, number[]]> = [
    [15, []], [16, [1.4]], [21, [1.4]], [22, [1.4, 3, 4.2]], [27, [1.4, 3, 4.2]],
    [28, [.2, 1.4, 3, 4.2]], [30, [.2, 1.4, 3, 4.2]], [31, [.2, 1.4, 3, 4.2, 5]],
    [88, [.2, 1.4, 3, 4.2, 5]], [89, [.1, .2, 1.4, 3, 4.2, 5]],
    [118, [.1, .2, 1.4, 3, 4.2, 5]], [119, [.1, .2, 1.4, 2, 3, 4.2, 5]],
  ];
  for (const [version, allowed] of boundaries) {
    expect(validCapturedTravelDelay(undefined, version)).toBe(true);
    for (const value of [.1, .2, 1.4, 2, 3, 4.2, 5]) expect(validCapturedTravelDelay(value, version)).toBe(allowed.includes(value));
  }
});

test.each(cases)('$source does not admit nearby, zero, nonfinite or nonnumeric values', ({ source, delay }) => {
  const { world } = physicalEdge(source);
  const encoded = serializeWorld(world);
  for (const value of [delay - 1e-10, delay + 1e-10, 0, -1, 1.7, NaN, Infinity, null, String(delay)]) {
    expect(validCapturedTravelDelay(value, world.schemaVersion)).toBe(false);
    const corrupt = JSON.parse(encoded) as World;
    corrupt.pawns[0]!.motion!.terrainDelay = value as number;
    expect(pawnShape(corrupt, world.schemaVersion)).toContain(durationError);
    expect(() => deserializeWorld(JSON.stringify(corrupt))).toThrow(/travel duration/);
  }
  // Known costs do not excuse a corrupt total, cooldown or speed capture.
  for (const field of ['end', 'speedFactor', 'moveCooldown'] as const) {
    const corrupt = JSON.parse(encoded) as World, pawn = corrupt.pawns[0]!;
    if (field === 'moveCooldown') pawn.moveCooldown += .25;
    else if (field === 'speedFactor') pawn.motion!.speedFactor = (pawn.motion!.speedFactor ?? 1) - .01;
    else pawn.motion!.end += .25;
    expect(pawnShape(corrupt, world.schemaVersion)).toContain(durationError);
    expect(() => deserializeWorld(JSON.stringify(corrupt))).toThrow(/travel duration/);
  }
});
