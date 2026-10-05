import { expect, test, vi } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand, createWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { validatePlanet } from '../src/sim/planet-save.ts';
import { commercialCamp } from './helpers/commercial-v193.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { createBulletFlight } from '../src/sim/bullet-flight.ts';
import { validWorldProjectile } from '../src/sim/projectile-save.ts';
import { projectileProfile } from '../src/sim/ranged-statistics.ts';
import type { PlanetState, PlanetTile } from '../src/sim/planet-state.ts';
import type { World } from '../src/sim/types.ts';

// Observe the actual full guard, without replacing any verdict. The frozen
// V216 comparison belongs to the external A/B runner, not a tmp import in CI.
const fullValidation = vi.hoisted(() => ({ calls: 0 }));
vi.mock('../src/sim/planet-save.ts', async importOriginal => {
  const original = await importOriginal<typeof import('../src/sim/planet-save.ts')>();
  return { ...original, validatePlanet: (...args: Parameters<typeof original.validatePlanet>) => {
    fullValidation.calls++;
    return original.validatePlanet(...args);
  } };
});

const DOMAIN_REFUSAL = 'Planète, groupe ou pertes incohérents.';
const GEOGRAPHY_REFUSAL = 'La géographie confirmée a changé sans remplacement.';
const SCHEMA_REFUSAL = 'Version de schéma du snapshot invalide.';
function preparedPlanet(): World {
  const { world } = commercialCamp();
  stepWorld(world); // Bring the older camp's real incident clocks current.
  expect(applyCommand(world, { type: 'planet-adopt' }).ok).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  return world;
}
function packet(encoder: SnapshotEncoder, world: World, checkpoint = false): SnapshotMessage {
  return structuredClone(encoder.encode(world, 0, 0, checkpoint));
}
function adopt(decoder: SnapshotDecoder, message: SnapshotMessage): World {
  const result = decoder.adopt(message);
  expect(result.status).toBe('applied');
  if (result.status !== 'applied') throw Error(JSON.stringify(result));
  return result.world;
}
function refuse(decoder: SnapshotDecoder, message: SnapshotMessage, reason: string): void {
  expect(decoder.adopt(message)).toEqual({ status: 'resync', reason });
}
function raw(value: object): Record<string, unknown> { return value as unknown as Record<string, unknown>; }

test.each([false, true])('real repeated publications keep old frames and reuse a value-equal geography (checkpoint=%s)', checkpoint => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const initialPacket = packet(encoder, world);
  fullValidation.calls = 0;
  const before = adopt(decoder, initialPacket), frozen = structuredClone(before);
  expect(fullValidation.calls).toBe(1);
  const resources = before.resources, piles = before.piles, tiles = before.tiles;
  const planet = before.planet!, centers = planet.tiles.map(t => t.center), neighbours = planet.tiles.map(t => t.neighbours);
  const originalTick = world.tick, rng = world.rng;
  for (let i = 0; i < 3; i++) {
    // Equal values in newly allocated source arrays must use the same proof.
    world.planet = structuredClone(world.planet!);
    fullValidation.calls = 0;
    const next = adopt(decoder, packet(encoder, world, checkpoint));
    expect(next).toEqual(world);
    expect(fullValidation.calls).toBe(0);
    if (!checkpoint) {
      expect(next.resources).toBe(resources); expect(next.piles).toBe(piles); expect(next.tiles).toBe(tiles);
    }
    expect(before).toEqual(frozen);
    expect(planet.tiles.map(t => t.center)).toEqual(centers);
    expect(planet.tiles.map(t => t.neighbours)).toEqual(neighbours);
  }
  // A real inventory addition changes membership independently of geography.
  addMaterial(world, 'textile', 1, { type: 'ground', x: 1, z: 1 }, 'cloth');
  fullValidation.calls = 0;
  const changed = adopt(decoder, packet(encoder, world, checkpoint));
  expect(fullValidation.calls).toBe(0); expect(changed).toEqual(world);
  expect(changed.piles).not.toBe(piles); expect(before).toEqual(frozen);
  expect(world.tick).toBe(originalTick); expect(world.rng).toBe(rng);
  // Neither a subsequently mutated producer nor a refused packet may alter an
  // accepted render frame or serve as a mutable cache witness.
  const good = packet(encoder, world, checkpoint), bad = structuredClone(good);
  bad.world.planet!.tiles.at(-1)!.rainfall += 1;
  refuse(decoder, bad, GEOGRAPHY_REFUSAL);
  world.planet!.tiles[0]!.rainfall += 1;
  expect(before).toEqual(frozen);
  expect(adopt(decoder, good)).toEqual(changed);
});

test('every saved scalar and every indexed center/neighbour is checked at the same tick', () => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before);
  const good = packet(encoder, world), tick = world.tick, rng = world.rng;
  expect(good.kind).toBe('delta');
  const mutations: { label: string; change: (planet: PlanetState) => void }[] = [
    { label: 'revision', change: p => { raw(p).revision = 2; } },
    { label: 'adoptedAt', change: p => { p.adoptedAt--; } },
    { label: 'generationSeed', change: p => { p.generationSeed ^= 1; } },
    { label: 'homeTile', change: p => { [p.homeTile, p.civilianTile] = [p.civilianTile, p.homeTile]; } },
    { label: 'civilianTile', change: p => { p.civilianTile = p.homeTile; } },
    { label: 'nextGroupId', change: p => { p.nextGroupId = 0; } },
  ];
  for (let i = 0; i < world.planet!.tiles.length; i++) {
    const edit = (label: string, change: (tile: PlanetTile) => void) => mutations.push({ label: `tile ${i} ${label}`, change: p => change(p.tiles[i]!) });
    edit('id', t => { t.id = (t.id + 1) % 162; });
    edit('biome', t => { t.biome = t.biome === 'temperate-forest' ? 'boreal-forest' : 'temperate-forest'; });
    edit('hilliness', t => { t.hilliness = t.hilliness === 'flat' ? 'small-hills' : 'flat'; });
    edit('meanTemperature', t => { t.meanTemperature += 1; });
    edit('rainfall', t => { t.rainfall += 1; });
    for (let j = 0; j < 3; j++) edit(`center ${j}`, t => { t.center[j]! += .01; });
    for (let j = 0; j < world.planet!.tiles[i]!.neighbours.length; j++) edit(`neighbour ${j}`, t => { t.neighbours[j] = t.id; });
  }
  for (const { label, change } of mutations) {
    const bad = structuredClone(good);
    change(bad.world.planet!);
    const errors = validatePlanet(bad.world.planet, bad.world as World, bad.world.schemaVersion);
    // The full guard supplies the domain verdict; a still-valid geometry is
    // refused by the historical same-epoch immutability rule.
    fullValidation.calls = 0;
    expect(decoder.adopt(bad), label).toEqual({ status: 'resync', reason: errors.length ? DOMAIN_REFUSAL : GEOGRAPHY_REFUSAL });
    expect(fullValidation.calls, label).toBe(1);
  }
  fullValidation.calls = 0;
  expect(adopt(decoder, good)).toEqual(world); expect(fullValidation.calls).toBe(0);
  expect(before).toEqual(frozen); expect(world.tick).toBe(tick); expect(world.rng).toBe(rng);
}, 30_000);

test.each([false, true])('equal indexed values cannot hide malformed shapes, clocks or counters (checkpoint=%s)', checkpoint => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before), good = packet(encoder, world, checkpoint);
  const changes: ((p: PlanetState) => void)[] = [
    p => { Reflect.deleteProperty(p.tiles, '161'); }, p => { Reflect.deleteProperty(p.tiles[161]!.center, '2'); }, p => { Reflect.deleteProperty(p.tiles[161]!.neighbours, '0'); },
    p => { raw(p).extra = undefined; }, p => { raw(p.tiles[161]!).extra = undefined; },
    p => { raw(p.tiles).extra = undefined; }, p => { raw(p.tiles[161]!.center).extra = undefined; },
    p => { raw(p.tiles[161]!.neighbours).extra = undefined; }, p => { p.tiles.length = 163; },
    p => { p.tiles[161]!.neighbours.push(0); }, p => { p.adoptedAt = world.tick + 1; },
    p => { p.generationSeed = 0x100000000; }, p => { p.generationSeed = -1; },
    ...[0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(value => (p: PlanetState) => { p.nextGroupId = value; }),
  ];
  for (const change of changes) {
    const bad = structuredClone(good); change(bad.world.planet!);
    expect(validatePlanet(bad.world.planet, bad.world as World).length).toBeGreaterThan(0);
    fullValidation.calls = 0; refuse(decoder, bad, DOMAIN_REFUSAL); expect(fullValidation.calls).toBe(1);
    expect(before).toEqual(frozen);
  }
  fullValidation.calls = 0; expect(adopt(decoder, good)).toEqual(world); expect(fullValidation.calls).toBe(0);
});

test.each([false, true])('real group allocation advances the counter without weakening group validation or accepting regression (checkpoint=%s)', checkpoint => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before);
  const food = world.piles.find(p => p.item === 'survival-meal')!;
  const counter = world.planet!.nextGroupId;
  expect(applyCommand(world, { type: 'group-start', memberIds: world.pawns.slice(0, 2).map(p => p.id),
    destination: world.planet!.civilianTile, sources: [{ pileId: food.id, quantity: 4 }] }).ok).toBe(true);
  expect(world.planet!.nextGroupId).toBe(counter + 1); expect(validateWorld(world)).toEqual([]);
  const good = packet(encoder, world, checkpoint), malformed = structuredClone(good);
  raw(malformed.world).group = null;
  fullValidation.calls = 0; refuse(decoder, malformed, DOMAIN_REFUSAL); expect(fullValidation.calls).toBe(0);
  const active = adopt(decoder, good), activeFrozen = structuredClone(active);
  expect(active).toEqual(world); expect(before).toEqual(frozen);
  expect(applyCommand(world, { type: 'group-cancel' }).ok).toBe(true);
  const cancelled = packet(encoder, world, checkpoint), backwards = structuredClone(cancelled);
  backwards.world.planet!.nextGroupId = counter;
  expect(validatePlanet(backwards.world.planet, backwards.world as World)).toEqual([]);
  refuse(decoder, backwards, GEOGRAPHY_REFUSAL);
  fullValidation.calls = 0; expect(adopt(decoder, cancelled)).toEqual(world); expect(fullValidation.calls).toBe(0);
  expect(Object.hasOwn(cancelled.world, 'group')).toBe(false); expect(active).toEqual(activeFrozen);
});

test.each([false, true])('late refusal preserves epoch, revision, indexes and the last confirmed geography (checkpoint=%s)', checkpoint => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before);
  addMaterial(world, 'textile', 1, { type: 'ground', x: 1, z: 1 }, 'cloth');
  const retry = packet(encoder, world, checkpoint);
  const danglingLauncher = structuredClone(retry), core = world.tick * 10;
  // A valid flight uses a real occupied ID as a falsely claimed vanished
  // Structure launcher. Only the post-planet reference guard can reject it.
  danglingLauncher.world.projectiles = [{ id: danglingLauncher.world.nextId++, quality: 'normal', weaponItem: 'mini-turret-gun', emittedAtCore: core, advancedAtCore: core,
    flight: createBulletFlight({ launcherKey: `structure:${world.pawns[0]!.id}`, equipmentKey: null, intendedKey: null, usedKey: null, flags: 7, preventFriendlyFire: false,
      origin: { x: 1.5, z: 1.5 }, destination: { x: 10.5, z: 1.5 }, speedPerCoreTick: projectileProfile('mini-turret-gun', 'normal')!.projectileTilesPerCoreTick }),
    relations: { friendlyPawnIds: [], friendlyFireFactor: .4 }, arrival: null }];
  expect(validWorldProjectile(danglingLauncher.world.projectiles[0], danglingLauncher.world, danglingLauncher.world.schemaVersion)).toBe(true);
  refuse(decoder, danglingLauncher, 'Balle ou canon lanceur invalide.');
  const late = structuredClone(retry);
  late.world.relationships = { links: [{ kind: 'sibling', aId: late.world.pawns[0]!.id, bId: late.world.nextId, recordedAt: late.world.tick }] };
  refuse(decoder, late, 'Liens, annonce ou souvenirs relationnels incohérents.');
  expect(before).toEqual(frozen);
  // An independently encoded replacement has identical primitive geography;
  // its late failure must not clear the old epoch's immutability witness.
  const replacement = structuredClone(world), replacingEncoder = new SnapshotEncoder();
  replacingEncoder.encode(world, 0, 0);
  const replacing = packet(replacingEncoder, replacement), replacingLate = structuredClone(replacing);
  replacingLate.world.relationships = late.world.relationships;
  fullValidation.calls = 0;
  refuse(decoder, replacingLate, 'Liens, annonce ou souvenirs relationnels incohérents.');
  expect(fullValidation.calls).toBe(1);
  const oldEpochChanged = structuredClone(retry); oldEpochChanged.world.planet!.generationSeed ^= 1;
  refuse(decoder, oldEpochChanged, GEOGRAPHY_REFUSAL);
  const oldEpoch = adopt(decoder, retry); expect(oldEpoch).toEqual(world); expect(before).toEqual(frozen);
  fullValidation.calls = 0;
  const next = adopt(decoder, replacing); expect(next).toEqual(replacement); expect(fullValidation.calls).toBe(1);
  const wrongBase = packet(replacingEncoder, replacement);
  if (wrongBase.kind !== 'delta') throw Error('Missing actual delta');
  wrongBase.baseRevision--;
  refuse(decoder, wrongBase, 'Snapshot intermédiaire manquant.');
  const valid = structuredClone(wrongBase); if (valid.kind !== 'delta') throw Error('Missing delta'); valid.baseRevision++;
  expect(adopt(decoder, valid)).toEqual(replacement);
  expect(decoder.adopt(structuredClone(replacing))).toEqual({ status: 'stale' });
  expect(oldEpoch).toEqual(world);
});

test('geography refusal stays after group/projectile guards and before relationship guards', () => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before), good = packet(encoder, world);
  const changed = structuredClone(good); changed.world.planet!.generationSeed ^= 1;
  const group = structuredClone(changed); raw(group.world).group = null;
  refuse(decoder, group, DOMAIN_REFUSAL);
  const bullet = structuredClone(changed); raw(bullet.world).projectiles = [null];
  refuse(decoder, bullet, 'Balle ou canon lanceur invalide.');
  const relations = structuredClone(changed);
  relations.world.relationships = { links: [{ kind: 'sibling', aId: relations.world.pawns[0]!.id, bId: relations.world.nextId, recordedAt: relations.world.tick }] };
  refuse(decoder, relations, GEOGRAPHY_REFUSAL);
  expect(adopt(decoder, good)).toEqual(world); expect(before).toEqual(frozen);
});

test.each([false, true])('V218 deliberately refuses fractional schemas before planet preparation with or without ballistic owners (checkpoint=%s)', checkpoint => {
  const world = createWorld(42, 16, 16), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  for (const key of ['planet', 'group', 'groupLosses', 'relationships', 'mechanoids', 'projectiles', 'bombWaves'])
    expect(Object.hasOwn(world, key)).toBe(false);
  expect(world.pawns.some(p => Object.hasOwn(p, 'romanceMemories') || Object.hasOwn(p, 'familyBereavement'))).toBe(false);
  // The frozen V216/V217 comparison intentionally preserved acceptance of
  // 196.5 without protected owners. V218 hardens that separate boundary;
  // its historical benchmark/report remain unchanged evidence of V217.
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before);
  const retry = packet(encoder, world, checkpoint), fractional = structuredClone(retry);
  raw(fractional.world).schemaVersion = 196.5;
  const ballistic = structuredClone(fractional);
  ballistic.world.projectiles = [];
  fullValidation.calls = 0;
  refuse(decoder, fractional, SCHEMA_REFUSAL);
  refuse(decoder, ballistic, SCHEMA_REFUSAL);
  expect(fullValidation.calls).toBe(0);
  expect(before).toEqual(frozen);
  expect(raw(fractional.world).schemaVersion).toBe(196.5);
  expect(adopt(decoder, retry)).toEqual(world); expect(fullValidation.calls).toBe(0);
  expect(before).toEqual(frozen); expect(world.schemaVersion).toBe(196);
});

test.each([false, true])('replacement, true absence, fresh adoption and historical own keys preserve authority (checkpoint=%s)', checkpoint => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before), retry = packet(encoder, world, checkpoint);
  const absent = structuredClone(retry); delete absent.world.planet;
  refuse(decoder, absent, GEOGRAPHY_REFUSAL);
  const replacement = structuredClone(world);
  const validReplacement = packet(encoder, replacement), malformedReplacement = structuredClone(validReplacement);
  malformedReplacement.world.planet!.tiles[161]!.center = [...malformedReplacement.world.planet!.tiles[0]!.center];
  expect(validatePlanet(malformedReplacement.world.planet, malformedReplacement.world as World).length).toBeGreaterThan(0);
  fullValidation.calls = 0; refuse(decoder, malformedReplacement, DOMAIN_REFUSAL); expect(fullValidation.calls).toBe(1);
  // A retry from the old epoch still needs its original immutable geography.
  const changedOld = structuredClone(retry); changedOld.world.planet!.tiles[161]!.rainfall++;
  refuse(decoder, changedOld, GEOGRAPHY_REFUSAL);
  expect(adopt(decoder, retry)).toEqual(world);
  fullValidation.calls = 0; expect(adopt(decoder, validReplacement)).toEqual(replacement); expect(fullValidation.calls).toBe(1);
  const oldEpochRetry = packet(encoder, replacement, checkpoint);
  const empty = createWorld(42, 16, 16), emptyPacket = packet(encoder, empty);
  expect(Object.hasOwn(emptyPacket.world, 'planet')).toBe(false);
  // No planet is present, but this relation prepares an absent context before
  // its unknown endpoint is refused by the final relationship guard. A duplicate
  // Pawn would instead fail the earlier quest ownership capture. The healthy
  // retry below has no protected owners and exercises prepareAbsence itself.
  const emptyLate = structuredClone(emptyPacket);
  emptyLate.world.relationships = { links: [{ kind: 'sibling', aId: emptyLate.world.pawns[0]!.id,
    bId: emptyLate.world.nextId, recordedAt: emptyLate.world.tick }] };
  refuse(decoder, emptyLate, 'Liens, annonce ou souvenirs relationnels incohérents.');
  const stillChanged = structuredClone(oldEpochRetry); stillChanged.world.planet!.tiles[161]!.rainfall++;
  refuse(decoder, stillChanged, GEOGRAPHY_REFUSAL);
  expect(adopt(decoder, oldEpochRetry)).toEqual(replacement);
  const emptyFrame = adopt(decoder, emptyPacket), emptyFrozen = structuredClone(emptyFrame), rng = empty.rng, tick = empty.tick;
  expect(applyCommand(empty, { type: 'planet-adopt' }).ok).toBe(true);
  fullValidation.calls = 0; expect(adopt(decoder, packet(encoder, empty, checkpoint))).toEqual(empty); expect(fullValidation.calls).toBe(1);
  expect(empty.rng).toBe(rng); expect(empty.tick).toBe(tick); expect(emptyFrame).toEqual(emptyFrozen); expect(before).toEqual(frozen);
  const historical = createWorld(42, 16, 16); raw(historical).schemaVersion = 195;
  const historicalFrame = adopt(decoder, packet(encoder, historical)), historicalFrozen = structuredClone(historicalFrame);
  const historicalRetry = packet(encoder, historical, checkpoint);
  for (const key of ['planet', 'group', 'groupLosses']) {
    const bad = structuredClone(historicalRetry); raw(bad.world)[key] = undefined;
    refuse(decoder, bad, 'Planète ou propriétaire de groupe futur.');
  }
  expect(adopt(decoder, historicalRetry)).toEqual(historical); expect(historicalFrame).toEqual(historicalFrozen);
});
