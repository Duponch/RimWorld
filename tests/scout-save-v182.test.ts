import { beforeAll, expect, test } from 'vitest';
import { addMaterial } from '../src/sim/materials.ts';
import { injurePawn } from '../src/sim/health.ts';
import { applyCommand, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { medicalCamp } from './scenarios/health.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

type OffMap = Extract<NonNullable<World['scout']>, { phase: 'travelling' | 'awaiting-entry' }>;

function trip(world: World): OffMap {
  const scout = world.scout;
  if (!scout || (scout.phase !== 'travelling' && scout.phase !== 'awaiting-entry')) throw new Error('Expected an off-map scout.');
  return scout;
}

function stepUntil(world: World, phase: 'travelling' | 'awaiting-entry', limit: number): void {
  for (let i = 0; i < limit && world.scout?.phase !== phase; i++) stepWorld(world);
  expect(world.scout?.phase).toBe(phase);
}

function sealBorder(world: World): void {
  for (let z = 0; z < world.height; z++) for (let x = 0; x < world.width; x++) {
    if (x === 0 || z === 0 || x === world.width - 1 || z === world.height - 1)
      world.tiles[z * world.width + x] = { terrain: 'rock' };
  }
}

let departureSave: string;
beforeAll(() => {
  const world = medicalCamp(3);
  const [scout, resident, deceased] = world.pawns;
  scout!.foodPolicyId = 2; // Unique user: guards below must inspect the off-map owner.
  scout!.social ??= { rng: 1, memories: [] };
  scout!.social.memories.push({ otherId: deceased!.id, kind: 'deep-talk', at: world.tick, offset: 20 });
  resident!.social ??= { rng: 1, memories: [] };
  resident!.social.memories.push({ otherId: scout!.id, kind: 'deep-talk', at: world.tick, offset: 20 });
  injurePawn(world, deceased!, 'heart', 'bruise', 15000);
  expect(scout!.bereavement).toMatchObject([{ otherId: deceased!.id, kind: 'friend-died' }]);
  addMaterial(world, 'food', 2, { type: 'ground', x: scout!.x, z: scout!.z + 1 }, 'survival-meal');
  const food = world.piles.find(p => p.item === 'survival-meal' && p.owner.type === 'ground')!;
  expect(validateWorld(world)).toEqual([]);
  expect(applyCommand(world, { type: 'scout-start', pawnId: scout!.id, pileId: food.id, quantity: 2 }).ok).toBe(true);
  stepUntil(world, 'travelling', 100);
  expect(validateWorld(world)).toEqual([]);
  departureSave = serializeWorld(world);
});

test('schema 170 migrates neutrally and rejects a future scout field before migration', () => {
  const old = JSON.parse(serializeWorld(medicalCamp(2)));
  old.schemaVersion = 170;
  const migrated = deserializeWorld(JSON.stringify(old));
  expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  expect(migrated.scout).toBeUndefined();
  expect({ ...migrated, schemaVersion: 170 }).toEqual(old);
  old.scout = { phase: 'travelling' };
  expect(() => deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 170 save.*Future scout state/);
});

test('malformed loading owners are refused as validation errors before ordinary pile validation', () => {
  const world = medicalCamp(2), actor = world.pawns[0]!;
  addMaterial(world, 'food', 2, { type: 'ground', x: actor.x, z: actor.z + 1 }, 'survival-meal');
  const food = world.piles.find(p => p.item === 'survival-meal' && p.owner.type === 'ground')!;
  expect(applyCommand(world, { type: 'scout-start', pawnId: actor.id, pileId: food.id, quantity: 2 }).ok).toBe(true);
  for (const owner of [null, undefined, 'ground']) {
    const invalid = JSON.parse(serializeWorld(world));
    invalid.piles.find((p: {id: number}) => p.id === food.id).owner = owner;
    expect(validateWorld(invalid)).toContain('Invalid scout provisions.');
    expect(() => deserializeWorld(JSON.stringify(invalid))).toThrow(/Invalid scout provisions/);
  }
});

test('off-map original identity and cross-map social and bereavement references survive strict save and resume', () => {
  const world = deserializeWorld(departureSave);
  const state = trip(world);
  const resident = world.pawns.find(p => p.state !== 'dead')!;
  const deceased = world.pawns.find(p => p.state === 'dead')!;
  expect(world.pawns.some(p => p.id === state.pawn.id)).toBe(false);
  expect(resident.social?.memories.some(m => m.otherId === state.pawn.id)).toBe(true);
  expect(state.pawn.bereavement).toMatchObject([{ otherId: deceased.id, kind: 'friend-died' }]);
  expect(state.items.filter(p => p.owner.type === 'inventory' && p.owner.pawnId === state.pawn.id)).toHaveLength(1);
  expect(validateWorld(world)).toEqual([]);
  const resumed = deserializeWorld(serializeWorld(world));
  stepWorld(world, 21);
  stepWorld(resumed, 21);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
});

test('duplicate off-map person or pile IDs and corrupted original body are rejected', () => {
  const world = deserializeWorld(departureSave);
  const resident = world.pawns.find(p => p.state !== 'dead')!;
  const duplicatePerson = structuredClone(world);
  trip(duplicatePerson).pawn.id = resident.id;
  expect(validateWorld(duplicatePerson)).not.toEqual([]);
  expect(() => deserializeWorld(JSON.stringify(duplicatePerson))).toThrow();

  const duplicatePile = structuredClone(world);
  trip(duplicatePile).items[0]!.id = resident.id;
  trip(duplicatePile).foodPileId = resident.id;
  expect(validateWorld(duplicatePile)).toContain('Duplicate entity ID.');
  expect(() => deserializeWorld(JSON.stringify(duplicatePile))).toThrow();

  const invalidBody = structuredClone(world);
  trip(invalidBody).pawn.hunger = 101;
  expect(validateWorld(invalidBody)).toContain('Invalid pawn state.');
  expect(() => deserializeWorld(JSON.stringify(invalidBody))).toThrow();
});

test('a scout\'s unique food policy cannot be deleted or made incompatible during travel', () => {
  const world = deserializeWorld(departureSave);
  const state = trip(world);
  const policy = world.foodPolicies.find(p => p.id === state.pawn.foodPolicyId)!;
  expect(world.pawns.every(p => p.foodPolicyId !== policy.id)).toBe(true);
  const before = serializeWorld(world);
  expect(applyCommand(world, { type: 'food-policy-delete', policyId: policy.id }).ok).toBe(false);
  expect(serializeWorld(world)).toBe(before);
  expect(applyCommand(world, { type: 'food-policy-update', policyId: policy.id, name: 'Sans ration', allowed: [] }).ok).toBe(false);
  expect(serializeWorld(world)).toBe(before);
});

test('cancelling a loading walk in mid-edge keeps a valid, resumable world', () => {
  const world = medicalCamp(2);
  const actor = world.pawns[0]!;
  addMaterial(world, 'food', 2, { type: 'ground', x: actor.x + 5, z: actor.z }, 'survival-meal');
  const food = world.piles.find(p => p.item === 'survival-meal' && p.owner.type === 'ground')!;
  expect(applyCommand(world, { type: 'scout-start', pawnId: actor.id, pileId: food.id, quantity: 2 }).ok).toBe(true);
  for (let n = 0; n < 40 && !actor.motion; n++) stepWorld(world);
  expect(actor.motion).toBeDefined();
  expect(actor.moveCooldown).toBeGreaterThan(0);
  const edge = structuredClone(actor.motion);
  expect(applyCommand(world, { type: 'scout-cancel' }).ok).toBe(true);
  expect(actor.motion).toEqual(edge);
  expect(world.scout).toBeUndefined();
  expect(validateWorld(world)).toEqual([]);
  const resumed = deserializeWorld(serializeWorld(world));
  stepWorld(world, 10);
  stepWorld(resumed, 10);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
});

test('blocked physical return persists through save/resume, then returns same people and goods at an opened edge', () => {
  const world = deserializeWorld(departureSave);
  const original = trip(world);
  const pawnId = original.pawn.id;
  const itemIds = original.items.map(p => p.id);
  const entry = { ...original.entry };
  const returnAt = original.returnAt;
  sealBorder(world);
  expect(validateWorld(world)).toEqual([]);
  stepWorld(world, returnAt - world.tick);
  expect(world.tick).toBe(returnAt);
  expect(world.scout?.phase).toBe('awaiting-entry');
  expect(world.pawns.some(p => p.id === pawnId)).toBe(false);
  expect(validateWorld(world)).toEqual([]);

  const resumed = deserializeWorld(serializeWorld(world));
  stepWorld(world, 20);
  stepWorld(resumed, 20);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
  expect(world.scout?.phase).toBe('awaiting-entry');
  for (const copy of [world, resumed]) copy.tiles[entry.z * copy.width + entry.x] = { terrain: 'grass' };
  stepWorld(world, 20);
  stepWorld(resumed, 20);
  expect(world.scout).toBeUndefined();
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
  const returned = world.pawns.filter(p => p.id === pawnId);
  expect(returned).toHaveLength(1);
  expect(returned[0]).toMatchObject(entry);
  expect(itemIds.every(id => world.piles.filter(p => p.id === id).length === 1)).toBe(true);
  expect(world.piles.filter(p => itemIds.includes(p.id) && p.owner.type === 'ground')).toHaveLength(1);
  expect(validateWorld(world)).toEqual([]);
});

test('a healthy traveler can return when the remaining home colon dies during travel', () => {
  const world = deserializeWorld(departureSave);
  const scout = trip(world);
  const scoutId = scout.pawn.id;
  const resident = world.pawns.find(p => p.state !== 'dead')!;
  injurePawn(world, resident, 'heart', 'bruise', 15000);
  expect(world.pawns.every(p => p.state === 'dead')).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  stepWorld(world, scout.returnAt - world.tick);
  expect(world.scout).toBeUndefined();
  expect(world.pawns.filter(p => p.id === scoutId && p.state !== 'dead')).toHaveLength(1);
  expect(validateWorld(world)).toEqual([]);
});
