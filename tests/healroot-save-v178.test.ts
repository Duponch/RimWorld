import { expect, test } from 'vitest';
import { createScenarioWorld } from '../src/sim/new-game';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization';
import { SnapshotDecoder, SnapshotEncoder } from '../src/bridge/snapshots';
import { jobDuration } from '../src/sim/farming';
import { SCHEMA_VERSION, type Job, type World } from '../src/sim/types';

test('V166 is validated before a neutral V167 migration with no retrospective acquisition', () => {
  // Arid generation contains no new species: this is a valid V166 shape,
  // including the existing climate/flora state, not an old fixture rewritten.
  const world = createScenarioWorld(42, 32, 'crashlanded', { biome: 'arid-shrubland', hilliness: 'small-hills' });
  const legacy = JSON.parse(serializeWorld(world));
  for(const pawn of legacy.pawns)delete pawn.skills.plants;
  legacy.schemaVersion = 166;
  const before = JSON.stringify(legacy);
  const migrated = deserializeWorld(before);
  expect(migrated).toEqual({ ...legacy, schemaVersion: SCHEMA_VERSION });
  expect(validateWorld(migrated)).toEqual([]);
  expect(JSON.stringify(legacy)).toBe(before);
  const invalid = { ...legacy, rng: 0 };
  expect(() => deserializeWorld(JSON.stringify(invalid))).toThrow(/Invalid version 166 save/);
  const future = createScenarioWorld(42, 64, 'crashlanded', { biome: 'boreal-forest', hilliness: 'small-hills' });
  expect(future.resources.some(resource => resource.species === 'healroot-wild')).toBe(true);
  expect(() => deserializeWorld(JSON.stringify({ ...future, schemaVersion: 166 }))).toThrow(/Invalid version 166 save/);
});

test('future wild species in an old resource delta is rejected without adopting candidate changes', () => {
  const world = createScenarioWorld(42, 32, 'crashlanded', { biome: 'arid-shrubland', hilliness: 'small-hills' });
  const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  for(const pawn of world.pawns)delete pawn.skills.plants;
  // Model an existing V166 stream. A later corrupted upsert must not upgrade it.
  const oldStream = { ...world, schemaVersion: 166 } as unknown as World;
  const checkpoint = encoder.encode(oldStream, 0, 0);
  expect(decoder.adopt(checkpoint).status).toBe('applied');
  const root = oldStream.resources.find(resource => resource.kind === 'wild-plant')!;
  Object.assign(root, { species: 'healroot-wild', amount: 1 });
  const delta = encoder.encode(oldStream, 0, 0);
  expect(delta.kind).toBe('delta');
  const rejected = decoder.adopt(delta);
  expect(rejected.status).toBe('resync');
  // Rejection leaves the accepted revision available for a corrected packet.
  root.species = 'grass'; root.amount = 0;
  const corrected = structuredClone(delta);
  if(corrected.kind !== 'delta')throw new Error('Expected resource delta.');
  const patch = corrected.resources!.upserted.find(resource => resource.id === root.id)!;
  Object.assign(patch, { species: 'grass', amount: 0 });
  expect(decoder.adopt(corrected).status).toBe('applied');
});

test('only harvesting wild healroot receives the Core-scaled forty-tick duration', () => {
  const world = createScenarioWorld(42, 64, 'crashlanded', { biome: 'boreal-forest', hilliness: 'small-hills' });
  const root = world.resources.find(resource => resource.species === 'healroot-wild')!;
  const job: Job = { id: world.nextId++, kind: 'harvest', x: root.x, z: root.z, progress: 0, reservedBy: null, orientation: 0, footprint: 'standard', status: 'pending', escrow: { wood: 0, food: 0 } };
  expect(jobDuration(world, job)).toBe(40);
  expect(jobDuration(world, job, root)).toBe(40);
  expect(jobDuration(world, { ...job, kind: 'cut' }, root)).toBe(60);
  expect(jobDuration(world, job, { ...root, species: 'berry-bush', kind: 'berries', amount: 10 })).toBe(60);
  expect(jobDuration(world, job, { ...root, species: undefined, kind: 'rice', amount: 6 })).toBe(20);
});
