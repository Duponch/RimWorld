import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand, createWorld, validateWorld } from '../src/sim/index.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { createBulletFlight } from '../src/sim/bullet-flight.ts';
import { registerWorldProjectile } from '../src/sim/projectile-system.ts';
import { projectileProfile } from '../src/sim/ranged-statistics.ts';
import { SCHEMA_VERSION, type World } from '../src/sim/types.ts';

// These cases deliberately change V217's fractional-schema compatibility oracle;
// they do not serve as an equivalent-verdict CPU benchmark against V216/V217.
const SCHEMA_REFUSAL = 'Version de schéma du snapshot invalide.';
const GEOGRAPHY_REFUSAL = 'La géographie confirmée a changé sans remplacement.';
const invalidSchemas: readonly unknown[] = [1.5, SCHEMA_VERSION + .5, 0, -1, SCHEMA_VERSION + 1,
  Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, -Infinity, String(SCHEMA_VERSION), null, undefined];
const raw = (value: object): Record<string, unknown> => value as unknown as Record<string, unknown>;
const packet = (encoder: SnapshotEncoder, world: World, checkpoint = false): SnapshotMessage =>
  structuredClone(encoder.encode(world, 0, 0, checkpoint));
function accept(decoder: SnapshotDecoder, message: SnapshotMessage, replaced: boolean): World {
  const result = decoder.adopt(message);
  expect(result.status).toBe('applied');
  if (result.status !== 'applied') throw Error(JSON.stringify(result));
  expect(result.replaced).toBe(replaced);
  return result.world;
}
function refuse(decoder: SnapshotDecoder, message: SnapshotMessage, reason = SCHEMA_REFUSAL): void {
  expect(decoder.adopt(message)).toEqual({ status: 'resync', reason });
}
function plainWorld(owner = false): World {
  const world = createWorld(42, 16, 16);
  if (owner) {
    // An empty own collection is invalid for the complete save guard. Use the
    // real emission boundary with current actors, clock and a newly owned ID.
    const launcher = world.pawns[0]!, target = world.pawns[1]!;
    registerWorldProjectile(world, createBulletFlight({
      origin: { x: launcher.x + .5, z: launcher.z + .5 },
      destination: { x: target.x + .5, z: target.z + .5 },
      launcherKey: `pawn:${launcher.id}`, equipmentKey: null,
      intendedKey: `pawn:${target.id}`, usedKey: `pawn:${target.id}`,
      flags: 7, preventFriendlyFire: false,
      speedPerCoreTick: projectileProfile('revolver', 'normal')!.projectileTilesPerCoreTick,
    }), 'normal', { friendlyPawnIds: world.pawns.map(pawn => pawn.id), friendlyFireFactor: .4 });
    expect(world.projectiles).toHaveLength(1);
  }
  expect(Object.hasOwn(world, 'projectiles')).toBe(owner);
  expect(Object.hasOwn(world, 'planet')).toBe(false);
  expect(validateWorld(world)).toEqual([]);
  return world;
}

test('checkpoint metadata refuses invalid schemas uniformly with and without ballistic owners, then retries the exact revision', () => {
  for (const owner of [false, true]) {
    const world = plainWorld(owner), encoder = new SnapshotEncoder();
    const good = packet(encoder, world, true), frozen = structuredClone(world);
    expect(good.kind).toBe('checkpoint');
    for (const schema of invalidSchemas) {
      const decoder = new SnapshotDecoder(), bad = structuredClone(good);
      raw(bad.world).schemaVersion = schema;
      refuse(decoder, bad);
      expect(raw(bad.world).schemaVersion).toBe(schema);
      expect(accept(decoder, good, true)).toEqual(world);
      expect(world).toEqual(frozen);
    }
    const decoder = new SnapshotDecoder(), missing = structuredClone(good);
    delete raw(missing.world).schemaVersion;
    refuse(decoder, missing);
    expect(accept(decoder, good, true)).toEqual(world);
  }
});

test('an invalid-schema delta cannot apply actual terrain or pile changes, consume a revision, or alter earlier frames', () => {
  for (const owner of [false, true]) {
    const world = plainWorld(owner), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
    const before = accept(decoder, packet(encoder, world), true), frozen = structuredClone(before);
    world.tiles[0] = { terrain: before.tiles[0]!.terrain === 'soil' ? 'grass' : 'soil' };
    addMaterial(world, 'wood', 1, { type: 'ground', x: 1, z: 1 }, 'wood');
    const good = packet(encoder, world);
    expect(good.kind).toBe('delta');
    if (good.kind !== 'delta') throw Error('Actual delta required');
    expect(good.tiles?.length).toBe(1);
    expect(good.piles?.upserted.length).toBeGreaterThan(0);
    for (const schema of invalidSchemas) {
      const bad = structuredClone(good);
      raw(bad.world).schemaVersion = schema;
      refuse(decoder, bad);
      expect(before).toEqual(frozen);
    }
    expect(accept(decoder, good, false)).toEqual(world);
    expect(before).toEqual(frozen);
    // Already-confirmed packets retain the existing stale verdict regardless
    // of their ignored World body; no new resync is requested for stale data.
    const stale = structuredClone(good);
    raw(stale.world).schemaVersion = SCHEMA_VERSION + .5;
    expect(decoder.adopt(stale)).toEqual({ status: 'stale' });
  }
});

test('a rejected replacement preserves the old epoch and geography witness until a valid checkpoint is accepted', () => {
  const world = plainWorld();
  expect(applyCommand(world, { type: 'planet-adopt' }).ok).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = accept(decoder, packet(encoder, world), true), frozen = structuredClone(before);
  const oldRetry = packet(encoder, world), replacement = structuredClone(world);
  const good = packet(encoder, replacement), bad = structuredClone(good);
  expect(good.kind).toBe('checkpoint');
  expect(good.epoch).toBe(oldRetry.epoch + 1);
  raw(bad.world).schemaVersion = SCHEMA_VERSION + 1;
  refuse(decoder, bad);
  const changedOld = structuredClone(oldRetry);
  changedOld.world.planet!.generationSeed ^= 1;
  refuse(decoder, changedOld, GEOGRAPHY_REFUSAL);
  expect(accept(decoder, oldRetry, false)).toEqual(world);
  expect(accept(decoder, good, true)).toEqual(replacement);
  expect(decoder.adopt(oldRetry)).toEqual({ status: 'stale' });
  expect(before).toEqual(frozen);
});

test('legal historical transport stays historical and a same-epoch delta still cannot change its integer schema', () => {
  // This legal 195 transport case already passes the V217 historical-own-key
  // oracle; do not invent a version1 World or migrate it during decoding.
  const world = plainWorld(); raw(world).schemaVersion = 195;
  const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = accept(decoder, packet(encoder, world), true), frozen = structuredClone(before);
  expect(before.schemaVersion).toBe(195);
  addMaterial(world, 'wood', 1, { type: 'ground', x: 1, z: 1 }, 'wood');
  const good = packet(encoder, world), changedSchema = structuredClone(good);
  expect(good.kind).toBe('delta');
  raw(changedSchema.world).schemaVersion = SCHEMA_VERSION;
  refuse(decoder, changedSchema, 'Le delta appartient à une autre carte.');
  const next = accept(decoder, good, false);
  expect(next).toEqual(world); expect(next.schemaVersion).toBe(195);
  expect(raw(world).schemaVersion).toBe(195); expect(before).toEqual(frozen);
});
