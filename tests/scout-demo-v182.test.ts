import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { prepareScoutDemo, scoutDemoActors, scoutDemoManifestEntry } from '../scripts/generate-scout-demo-v182.ts';
import { scoutEligible } from '../src/sim/caravan-trip.ts';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION, type World } from '../src/sim/types.ts';

const fixtureUrl = new URL('../public/test-saves/v182/reconnaissance-et-retour.json', import.meta.url);
const EXPECTED_SHA256 = '991ff54400b0077386c33cde80047d71cb974fb8456d50bbdf86c34b858f9689';

function rationCount(world: World): number {
  const map = world.piles.reduce((sum, pile) => sum + (pile.item === 'survival-meal' ? pile.quantity : 0), 0);
  const travelling = world.scout && (world.scout.phase === 'travelling' || world.scout.phase === 'awaiting-entry')
    ? world.scout.items.reduce((sum, pile) => sum + (pile.item === 'survival-meal' ? pile.quantity : 0), 0) : 0;
  return map + travelling;
}

function stepUntil(world: World, phase: 'leaving' | 'travelling' | 'returned', limit: number): void {
  for (let n = 0; n < limit; n++) {
    if (phase === 'returned' ? !world.scout : world.scout?.phase === phase) return;
    stepWorld(world);
  }
  throw new Error(`Scout did not reach ${phase} within ${limit} real world steps; phase=${world.scout?.phase ?? 'none'}.`);
}

test('V182 public scene is a byte-stable prepared 250² colony, not an already departed caravan', () => {
  const raw = readFileSync(fixtureUrl, 'utf8');
  const sha256 = createHash('sha256').update(raw).digest('hex');
  expect(sha256).toBe(EXPECTED_SHA256);
  const world = deserializeWorld(raw);
  expect(world).toEqual(prepareScoutDemo());
  expect(JSON.parse(raw).schemaVersion).toBe(171);
  expect(world.schemaVersion).toBe(SCHEMA_VERSION);
  expect(world.width).toBe(250);
  expect(world.height).toBe(250);
  expect(world.tick).toBe(0);
  expect(world.scout).toBeUndefined();
  expect(world.pawns).toHaveLength(3);
  const { pawn, pile } = scoutDemoActors(world);
  expect(scoutEligible(world, pawn)).toBeNull();
  expect(pawn.hunger).toBe(45);
  expect(pawn.rest).toBe(90);
  expect(pile.quantity).toBe(4);
  expect(pile.owner).toMatchObject({ type: 'ground' });
  expect(scoutDemoManifestEntry(world, sha256)).toMatchObject({ id: 'reconnaissance-et-retour-v182', prepared: true, tick: 0, sha256 });
  expect(validateWorld(world)).toEqual([]);
});

test('V182 real command loads at contact, exits at the border, eats from the unique manifest and returns without duplication', () => {
  const world = deserializeWorld(readFileSync(fixtureUrl, 'utf8'));
  const { pawn, pile } = scoutDemoActors(world);
  const initialRations = rationCount(world);
  const originalGear = world.piles.filter(item => item.owner.type === 'apparel' && item.owner.pawnId === pawn.id).map(item => item.id);
  expect(applyCommand(world, { type: 'scout-start', pawnId: pawn.id, pileId: pile.id, quantity: 3 })).toMatchObject({ ok: true });
  expect(world.scout?.phase).toBe('loading');
  expect(pile.quantity).toBe(4);
  const loadingCopy = deserializeWorld(serializeWorld(world));
  stepWorld(world); stepWorld(loadingCopy);
  expect(loadingCopy).toEqual(world);

  stepUntil(world, 'leaving', 80);
  expect(world.pawns.find(person => person.id === pawn.id)).toBe(pawn);
  expect(pile.quantity).toBe(1);
  const loadingDistance = pile.owner.type === 'ground' ? Math.abs(pawn.x - pile.owner.x) + Math.abs(pawn.z - pile.owner.z) : Infinity;
  expect(loadingDistance).toBeLessThanOrEqual(1);
  const loadedFood = world.piles.find(item => item.item === 'survival-meal' && item.owner.type === 'inventory' && item.owner.pawnId === pawn.id);
  expect(loadedFood?.quantity).toBe(3);
  expect(rationCount(world)).toBe(initialRations);
  expect(validateWorld(world)).toEqual([]);
  const leavingCopy = deserializeWorld(serializeWorld(world));
  stepWorld(world); stepWorld(leavingCopy);
  expect(leavingCopy).toEqual(world);

  stepUntil(world, 'travelling', 100);
  const trip = world.scout;
  expect(trip?.phase).toBe('travelling');
  if (!trip || trip.phase !== 'travelling') throw new Error('Expected travelling scout.');
  expect(world.pawns.some(person => person.id === pawn.id)).toBe(false);
  expect(world.piles.some(item => item.id === loadedFood?.id)).toBe(false);
  expect(trip.pawn).toBe(pawn);
  expect(trip.items.some(item => item.id === loadedFood?.id && item.quantity === 3)).toBe(true);
  expect(trip.items.filter(item => originalGear.includes(item.id)).map(item => item.id)).toEqual(originalGear);
  expect(trip.returnAt - trip.departedAt).toBe(1500);
  expect(validateWorld(world)).toEqual([]);
  const travellingCopy = deserializeWorld(serializeWorld(world));
  stepWorld(world); stepWorld(travellingCopy);
  expect(travellingCopy).toEqual(world);

  let consumed = 0;
  while (world.scout && world.tick <= trip.returnAt + 40) {
    const live = world.scout;
    if (live.phase === 'travelling' || live.phase === 'awaiting-entry') consumed = live.consumed;
    stepWorld(world);
  }
  expect(world.scout).toBeUndefined();
  expect(consumed).toBeGreaterThanOrEqual(1);
  expect(world.pawns.filter(person => person.id === pawn.id)).toEqual([pawn]);
  expect(world.piles.filter(item => originalGear.includes(item.id)).map(item => item.id)).toEqual(originalGear);
  expect(world.piles.some(item => item.id === loadedFood?.id && item.item === 'survival-meal' && item.owner.type === 'ground')).toBe(true);
  expect(rationCount(world)).toBe(initialRations - consumed);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
});
