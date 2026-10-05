import { expect, test } from 'vitest';
import { withoutMiningSkill, withoutTelevisionRecreation, withMigratedTelevisionRecreation } from './scenarios/legacy-skills.ts';
import { createScenarioWorld } from '../src/sim/new-game';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization';
import { SnapshotDecoder, SnapshotEncoder } from '../src/bridge/snapshots';
import { jobDuration } from '../src/sim/farming';
import { SCHEMA_VERSION, type Job, type World } from '../src/sim/types';
import { enableBiomeWildlife } from '../src/sim/wildlife';
import { withoutPredatorFoodPolicies, withoutPredatorApparelPolicies } from './scenarios/legacy-save';

function historicalAridWorld():World {
  const current=createScenarioWorld(42,32,'crashlanded',{biome:'arid-shrubland',hilliness:'small-hills'});
  const legacy=withoutTelevisionRecreation(withoutMiningSkill(withoutPredatorApparelPolicies(withoutPredatorFoodPolicies(JSON.parse(serializeWorld(current)) as World))));
  delete legacy.miscIncidents;
  if(legacy.raids)delete legacy.raids.mechanoid;
  for(const pawn of legacy.pawns){delete pawn.skills.plants;delete pawn.background;}
  legacy.schemaVersion=(withoutTelevisionRecreation(legacy),166) as World['schemaVersion'];
  // Construct the pre-predator ecological profile under its own version. Do
  // not relabel an already generated v2 population or remove individual foxes.
  delete legacy.wildlife;
  enableBiomeWildlife(legacy,'arid-shrubland');
  return legacy;
}

test('V166 is validated before a neutral V167 migration with no retrospective acquisition', () => {
  // Arid generation contains no new species: this is a valid V166 shape,
  // including the existing climate/flora state, not an old fixture rewritten.
  const legacy = historicalAridWorld();
  const before = JSON.stringify(legacy);
  const migrated = deserializeWorld(before);
  expect(migrated).toEqual(withMigratedTelevisionRecreation({ ...legacy, schemaVersion: SCHEMA_VERSION }));
  expect(validateWorld(migrated)).toEqual([]);
  expect(JSON.stringify(legacy)).toBe(before);
  const invalid = { ...legacy, rng: 0 };
  expect(() => deserializeWorld(JSON.stringify(invalid))).toThrow(/Invalid version 166 save/);
  const future = createScenarioWorld(42, 64, 'crashlanded', { biome: 'boreal-forest', hilliness: 'small-hills' });
  for(const pawn of future.pawns)delete pawn.background;
  if(future.raids)delete future.raids.mechanoid;
  expect(future.resources.some(resource => resource.species === 'healroot-wild')).toBe(true);
  expect(() => deserializeWorld(JSON.stringify({ ...future, schemaVersion: 166 }))).toThrow(/Invalid version 166 save/);
});

test('future wild species in an old resource delta is rejected without adopting candidate changes', () => {
  const oldStream = historicalAridWorld();
  const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  // Model an existing V166 stream. A later corrupted upsert must not upgrade it.
  // Mirror postMessage cloning: the decoder must never share mutable worker
  // objects with later test edits, including its initial checkpoint.
  const checkpoint = structuredClone(encoder.encode(oldStream, 0, 0));
  const initial=decoder.adopt(checkpoint);
  expect(initial.status,initial.status==='resync'?initial.reason:'Historical checkpoint').toBe('applied');
  if(initial.status!=='applied')throw new Error('Historical checkpoint refused.');
  const retained=structuredClone(initial.world);
  const root = oldStream.resources.find(resource => resource.kind === 'wild-plant')!;
  Object.assign(root, { species: 'healroot-wild', amount: 1 });
  const delta = structuredClone(encoder.encode(oldStream, 0, 0));
  expect(delta.kind).toBe('delta');
  const rejected = decoder.adopt(delta);
  expect(rejected.status).toBe('resync');
  expect(initial.world).toEqual(retained);
  // Rejection leaves the accepted revision available for a corrected packet.
  root.species = 'grass'; root.amount = 0;
  const corrected = structuredClone(delta);
  if(corrected.kind !== 'delta')throw new Error('Expected resource delta.');
  const patch = corrected.resources!.upserted.find(resource => resource.id === root.id)!;
  Object.assign(patch, { species: 'grass', amount: 0 });
  const repaired=decoder.adopt(corrected);
  expect(repaired.status).toBe('applied');
  if(repaired.status==='applied')expect(repaired.world.schemaVersion).toBe(166);
  expect(initial.world).toEqual(retained);
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
