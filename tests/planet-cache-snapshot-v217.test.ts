import {actualPlanetOrigin,onlyPlanetGroup} from './helpers/planet-cache-registry-v217.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {validRegisteredPresentation} from '../src/sim/world-map-projection-save.ts';
import {assertLegacyPlanet,type LegacyPlanetWorld,legacyPlanet} from './helpers/legacy-fixture-guards.ts';
import { expect, test, vi } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand, createWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { validatePlanet } from '../src/sim/planet-save.ts';
import { commercialCamp } from './helpers/commercial-v193.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { createBulletFlight } from '../src/sim/bullet-flight.ts';
import { validWorldProjectile } from '../src/sim/projectile-save.ts';
import { projectileProfile } from '../src/sim/ranged-statistics.ts';
import type { LegacyPlanetState, PlanetTile } from '../src/sim/planet-state.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

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
const GROUP_OWNER_REFUSAL = 'Provenance de couchage au sol humain invalide ou future.';
const GEOGRAPHY_REFUSAL = 'La géographie confirmée a changé sans remplacement.';
const SCHEMA_REFUSAL = 'Version de schéma du snapshot invalide.';
function preparedPlanet(): LegacyPlanetWorld {
  const { world } = commercialCamp();
  stepWorld(world); // Bring the older camp's real incident clocks current.
  expect(applyCommand(world, { type: 'planet-adopt' }).ok).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  assertLegacyPlanet(world);return world;
}
function projection(world:World):World {
  const whole=structuredClone(world),view=world.worldMaps?registeredMapPresentation(world):world;
  if(!view)throw Error('Expected the actual selected map presentation');
  expect(world).toEqual(whole);return view;
}
function packet(encoder: SnapshotEncoder, world: World, checkpoint = false): SnapshotMessage {
  const whole=structuredClone(world),message=structuredClone(encoder.encode(world, 0, 0, checkpoint));
  // The complete campaign remains an independent immutability witness.
  expect(world).toEqual(whole);
  if(world.worldMaps&&message.kind==='checkpoint')expect(validRegisteredPresentation(message.world)).toBe(true);
  return message;
}
function adopt(decoder: SnapshotDecoder, message: SnapshotMessage): World {
  const result = decoder.adopt(message);
  expect(result.status,JSON.stringify(result)).toBe('applied');
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
  const planet = legacyPlanet(before), centers = planet.tiles.map(t => t.center), neighbours = planet.tiles.map(t => t.neighbours);
  const originalTick = world.tick, rng = world.rng;
  for (let i = 0; i < 3; i++) {
    // Equal values in newly allocated source arrays must use the same proof.
    world.planet = structuredClone(legacyPlanet(world));
    fullValidation.calls = 0;
    const next = adopt(decoder, packet(encoder, world, checkpoint));
    expect(next).toEqual(projection(world));
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
  expect(fullValidation.calls).toBe(0); expect(changed).toEqual(projection(world));
  expect(changed.piles).not.toBe(piles); expect(before).toEqual(frozen);
  expect(world.tick).toBe(originalTick); expect(world.rng).toBe(rng);
  // Neither a subsequently mutated producer nor a refused packet may alter an
  // accepted render frame or serve as a mutable cache witness.
  const good = packet(encoder, world, checkpoint), bad = structuredClone(good);
  legacyPlanet(bad.world).tiles.at(-1)!.rainfall += 1;
  refuse(decoder, bad, GEOGRAPHY_REFUSAL);
  legacyPlanet(world).tiles[0]!.rainfall += 1;
  expect(before).toEqual(frozen);
  expect(adopt(decoder, good)).toEqual(changed);
});

test('every saved scalar and every indexed center/neighbour is checked at the same tick', () => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before);
  const good = packet(encoder, world), tick = world.tick, rng = world.rng;
  expect(good.kind).toBe('delta');
  const mutations: { label: string; change: (planet: LegacyPlanetState) => void }[] = [
    { label: 'revision', change: p => { raw(p).revision = 2; } },
    { label: 'adoptedAt', change: p => { p.adoptedAt--; } },
    { label: 'generationSeed', change: p => { p.generationSeed ^= 1; } },
    { label: 'homeTile', change: p => { [p.homeTile, p.civilianTile] = [p.civilianTile, p.homeTile]; } },
    { label: 'civilianTile', change: p => { p.civilianTile = p.homeTile; } },
    { label: 'nextGroupId', change: p => { p.nextGroupId = 0; } },
  ];
  for (let i = 0; i < legacyPlanet(world).tiles.length; i++) {
    const edit = (label: string, change: (tile: PlanetTile) => void) => mutations.push({ label: `tile ${i} ${label}`, change: p => change(p.tiles[i]!) });
    edit('id', t => { t.id = (t.id + 1) % 162; });
    edit('biome', t => { t.biome = t.biome === 'temperate-forest' ? 'boreal-forest' : 'temperate-forest'; });
    edit('hilliness', t => { t.hilliness = t.hilliness === 'flat' ? 'small-hills' : 'flat'; });
    edit('meanTemperature', t => { t.meanTemperature += 1; });
    edit('rainfall', t => { t.rainfall += 1; });
    for (let j = 0; j < 3; j++) edit(`center ${j}`, t => { t.center[j]! += .01; });
    for (let j = 0; j < legacyPlanet(world).tiles[i]!.neighbours.length; j++) edit(`neighbour ${j}`, t => { t.neighbours[j] = t.id; });
  }
  for (const { label, change } of mutations) {
    const bad = structuredClone(good);
    change(legacyPlanet(bad.world));
    const errors = validatePlanet(bad.world.planet, bad.world as World, bad.world.schemaVersion);
    // The full guard supplies the domain verdict; a still-valid geometry is
    // refused by the historical same-epoch immutability rule.
    fullValidation.calls = 0;
    expect(decoder.adopt(bad), label).toEqual({ status: 'resync', reason: errors.length ? DOMAIN_REFUSAL : GEOGRAPHY_REFUSAL });
    expect(fullValidation.calls, label).toBe(1);
  }
  fullValidation.calls = 0;
  expect(adopt(decoder, good)).toEqual(projection(world)); expect(fullValidation.calls).toBe(0);
  expect(before).toEqual(frozen); expect(world.tick).toBe(tick); expect(world.rng).toBe(rng);
}, 30_000);

test.each([false, true])('equal indexed values cannot hide malformed shapes, clocks or counters (checkpoint=%s)', checkpoint => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before), good = packet(encoder, world, checkpoint);
  const changes: ((p: LegacyPlanetState) => void)[] = [
    p => { Reflect.deleteProperty(p.tiles, '161'); }, p => { Reflect.deleteProperty(p.tiles[161]!.center, '2'); }, p => { Reflect.deleteProperty(p.tiles[161]!.neighbours, '0'); },
    p => { raw(p).extra = undefined; }, p => { raw(p.tiles[161]!).extra = undefined; },
    p => { raw(p.tiles).extra = undefined; }, p => { raw(p.tiles[161]!.center).extra = undefined; },
    p => { raw(p.tiles[161]!.neighbours).extra = undefined; }, p => { p.tiles.length = 163; },
    p => { p.tiles[161]!.neighbours.push(0); }, p => { p.adoptedAt = world.tick + 1; },
    p => { p.generationSeed = 0x100000000; }, p => { p.generationSeed = -1; },
    ...[0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(value => (p: LegacyPlanetState) => { p.nextGroupId = value; }),
  ];
  for (const change of changes) {
    const bad = structuredClone(good); change(legacyPlanet(bad.world));
    expect(validatePlanet(bad.world.planet, bad.world as World).length).toBeGreaterThan(0);
    fullValidation.calls = 0; refuse(decoder, bad, DOMAIN_REFUSAL); expect(fullValidation.calls).toBe(1);
    expect(before).toEqual(frozen);
  }
  fullValidation.calls = 0; expect(adopt(decoder, good)).toEqual(projection(world)); expect(fullValidation.calls).toBe(0);
});

test.each([false, true])('real group allocation advances the counter without weakening group validation or accepting regression (checkpoint=%s)', checkpoint => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before);
  const food = world.piles.find(p => p.item === 'survival-meal')!;
  const counter = legacyPlanet(world).nextGroupId;
  expect(applyCommand(world, { type: 'group-start', originMapId:actualPlanetOrigin(world), memberIds: world.pawns.slice(0, 2).map(p => p.id),
    destination: legacyPlanet(world).civilianTile, sources: [{ pileId: food.id, quantity: 4 }] }).ok).toBe(true);
  expect(legacyPlanet(world).nextGroupId).toBe(counter + 1); expect(validateWorld(world)).toEqual([]);
  const good = packet(encoder, world, checkpoint), malformed = structuredClone(good);
  raw(malformed.world).group = null;
  // A null owner is now rejected by the earlier descriptor-safe container guard.
  fullValidation.calls = 0; refuse(decoder, malformed, GROUP_OWNER_REFUSAL); expect(fullValidation.calls).toBe(0);
  const active = adopt(decoder, good), activeFrozen = structuredClone(active);
  expect(active).toEqual(projection(world)); expect(before).toEqual(frozen);
  expect(applyCommand(world, { type: 'group-cancel',groupId:onlyPlanetGroup(world).state.id }).ok).toBe(true);
  const cancelled = packet(encoder, world, checkpoint), backwards = structuredClone(cancelled);
  legacyPlanet(backwards.world).nextGroupId = counter;
  expect(validatePlanet(backwards.world.planet, backwards.world as World)).toEqual([]);
  refuse(decoder, backwards, GEOGRAPHY_REFUSAL);
  fullValidation.calls = 0; expect(adopt(decoder, cancelled)).toEqual(projection(world)); expect(fullValidation.calls).toBe(0);
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
  const oldEpochChanged = structuredClone(retry); legacyPlanet(oldEpochChanged.world).generationSeed ^= 1;
  refuse(decoder, oldEpochChanged, GEOGRAPHY_REFUSAL);
  const oldEpoch = adopt(decoder, retry); expect(oldEpoch).toEqual(projection(world)); expect(before).toEqual(frozen);
  fullValidation.calls = 0;
  const next = adopt(decoder, replacing); expect(next).toEqual(projection(replacement)); expect(fullValidation.calls).toBe(1);
  const wrongBase = packet(replacingEncoder, replacement);
  if (wrongBase.kind !== 'delta') throw Error('Missing actual delta');
  wrongBase.baseRevision--;
  refuse(decoder, wrongBase, 'Snapshot intermédiaire manquant.');
  const valid = structuredClone(wrongBase); if (valid.kind !== 'delta') throw Error('Missing delta'); valid.baseRevision++;
  expect(adopt(decoder, valid)).toEqual(projection(replacement));
  expect(decoder.adopt(structuredClone(replacing))).toEqual({ status: 'stale' });
  expect(oldEpoch).toEqual(projection(world));
});

test('geography refusal stays after owner/group/projectile guards and before relationship guards', () => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before), good = packet(encoder, world);
  const changed = structuredClone(good); legacyPlanet(changed.world).generationSeed ^= 1;
  const group = structuredClone(changed); raw(group.world).group = null;
  refuse(decoder, group, GROUP_OWNER_REFUSAL);
  const bullet = structuredClone(changed); raw(bullet.world).projectiles = [null];
  refuse(decoder, bullet, 'Balle ou canon lanceur invalide.');
  const relations = structuredClone(changed);
  relations.world.relationships = { links: [{ kind: 'sibling', aId: relations.world.pawns[0]!.id, bId: relations.world.nextId, recordedAt: relations.world.tick }] };
  refuse(decoder, relations, GEOGRAPHY_REFUSAL);
  expect(adopt(decoder, good)).toEqual(projection(world)); expect(before).toEqual(frozen);
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
  // Build the expected projection before measuring Decoder: projection itself
  // can invoke the full planet guard for an absent planetary owner.
  const expected=projection(world);
  const retry = packet(encoder, world, checkpoint), fractional = structuredClone(retry);
  // Registered presentation materializes the absent shared planet as an own
  // undefined field. This valid retry takes prepare(), not prepareAbsence().
  expect(Object.hasOwn(retry.world,'planet')).toBe(true); expect(retry.world.planet).toBeUndefined();
  raw(fractional.world).schemaVersion = 196.5;
  const ballistic = structuredClone(fractional);
  ballistic.world.projectiles = [];
  fullValidation.calls = 0;
  refuse(decoder, fractional, SCHEMA_REFUSAL);
  refuse(decoder, ballistic, SCHEMA_REFUSAL);
  expect(fullValidation.calls).toBe(0);
  expect(before).toEqual(frozen);
  expect(raw(fractional.world).schemaVersion).toBe(196.5);
  // An absent geography has no reusable proof: this healthy preparation calls
  // validatePlanet(undefined) once. Fractional refusals above still call it zero times.
  expect(adopt(decoder, retry)).toEqual(expected); expect(fullValidation.calls).toBe(1);
  expect(before).toEqual(frozen); expect(world.schemaVersion).toBe(SCHEMA_VERSION);
});

test.each([false, true])('replacement, true absence, fresh adoption and historical own keys preserve authority (checkpoint=%s)', checkpoint => {
  const world = preparedPlanet(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const before = adopt(decoder, packet(encoder, world)), frozen = structuredClone(before), retry = packet(encoder, world, checkpoint);
  const absentSource=structuredClone(world);delete raw(absentSource).planet;
  const rootId=absentSource.worldMaps!.rootMapId,root=absentSource.worldMaps!.sites.find(s=>s.id===rootId);
  if(!root||absentSource.worldMaps!.sites.length!==1)throw Error('Expected the sole actual map of this absence fixture');
  root.tile=null; // True absence metadata must not retain an impossible tile0.
  const absent = structuredClone(retry); delete absent.world.planet;
  absent.world.campaignMap=structuredClone(projection(absentSource).campaignMap);
  expect(validRegisteredPresentation(absent.world as World)).toBe(true);
  refuse(decoder, absent, GEOGRAPHY_REFUSAL);
  const replacement = structuredClone(world);
  const validReplacement = packet(encoder, replacement), malformedReplacement = structuredClone(validReplacement);
  legacyPlanet(malformedReplacement.world).tiles[161]!.center = [...legacyPlanet(malformedReplacement.world).tiles[0]!.center];
  expect(validatePlanet(malformedReplacement.world.planet, malformedReplacement.world as World).length).toBeGreaterThan(0);
  fullValidation.calls = 0; refuse(decoder, malformedReplacement, DOMAIN_REFUSAL); expect(fullValidation.calls).toBe(1);
  // A retry from the old epoch still needs its original immutable geography.
  const changedOld = structuredClone(retry); legacyPlanet(changedOld.world).tiles[161]!.rainfall++;
  refuse(decoder, changedOld, GEOGRAPHY_REFUSAL);
  expect(adopt(decoder, retry)).toEqual(projection(world));
  fullValidation.calls = 0; expect(adopt(decoder, validReplacement)).toEqual(projection(replacement)); expect(fullValidation.calls).toBe(1);
  const oldEpochRetry = packet(encoder, replacement, checkpoint);
  const empty = createWorld(42, 16, 16), emptyPacket = packet(encoder, empty);
  expect(Object.hasOwn(empty,'planet')).toBe(false);expect(emptyPacket.world.planet).toBeUndefined();
  expect(emptyPacket.world.planet).toEqual(projection(empty).planet);
  // No planet is present, but this relation prepares an absent context before
  // its unknown endpoint is refused by the final relationship guard. A duplicate
  // Pawn would instead fail the earlier quest ownership capture. The healthy
  // retry below has no protected owners and exercises prepareAbsence itself.
  const emptyLate = structuredClone(emptyPacket);
  emptyLate.world.relationships = { links: [{ kind: 'sibling', aId: emptyLate.world.pawns[0]!.id,
    bId: emptyLate.world.nextId, recordedAt: emptyLate.world.tick }] };
  refuse(decoder, emptyLate, 'Liens, annonce ou souvenirs relationnels incohérents.');
  const stillChanged = structuredClone(oldEpochRetry); legacyPlanet(stillChanged.world).tiles[161]!.rainfall++;
  refuse(decoder, stillChanged, GEOGRAPHY_REFUSAL);
  expect(adopt(decoder, oldEpochRetry)).toEqual(projection(replacement));
  const emptyFrame = adopt(decoder, emptyPacket), emptyFrozen = structuredClone(emptyFrame), rng = empty.rng, tick = empty.tick;
  expect(applyCommand(empty, { type: 'planet-adopt' }).ok).toBe(true);
  fullValidation.calls = 0; expect(adopt(decoder, packet(encoder, empty, checkpoint))).toEqual(projection(empty)); expect(fullValidation.calls).toBe(1);
  expect(empty.rng).toBe(rng); expect(empty.tick).toBe(tick); expect(emptyFrame).toEqual(emptyFrozen); expect(before).toEqual(frozen);
  const historical = createWorld(42, 16, 16); raw(historical).schemaVersion = 195;
  // This synthetic pre196 packet cannot carry the real future255 registries.
  delete historical.worldMaps;delete historical.worldGroups;
  // This synthetic schema195 witness also predates the map clock from252.
  delete raw(historical).deterioration;
  // The current factory also installs the prospective256 wander companion.
  // This synthetic195 packet predates it; preserve the older mental state.
  for(const pawn of historical.pawns)if(pawn.mental)delete pawn.mental.wander;
  // This is a prepared transport fixture, not a genuine old save. The current
  // generator now initializes V227 food policy/ledger keys; a V195 packet
  // must omit those future fields before exercising planetary admission.
  for(const policy of historical.foodPolicies??[])policy.allowed=policy.allowed.filter(item=>item!=='kibble'&&item!=='nutrient-paste-meal'&&item!=='pemmican');
  // Only default permissions are removed from this synthetic pre-content witness.
  // Actual historical files remain immutable and retain their separate corpus.
  if(historical.apparelPolicies)historical.apparelPolicies=historical.apparelPolicies.map(policy=>({...policy,allowedItems:policy.allowedItems.filter(item=>!['cloth-tuque','muffalo-wool-tuque','recon-armor','recon-helmet'].includes(item))}));
  if(historical.spoiled){delete raw(historical.spoiled).hay;delete raw(historical.spoiled).kibble;delete raw(historical.spoiled)['nutrient-paste-meal'];}
  const historicalFrame = adopt(decoder, packet(encoder, historical)), historicalFrozen = structuredClone(historicalFrame);
  const historicalRetry = packet(encoder, historical, checkpoint);
  for (const key of ['planet', 'group', 'groupLosses']) {
    const bad = structuredClone(historicalRetry); raw(bad.world)[key] = undefined;
    refuse(decoder, bad, 'Planète ou propriétaire de groupe futur.');
  }
  expect(adopt(decoder, historicalRetry)).toEqual(projection(historical)); expect(historicalFrame).toEqual(historicalFrozen);
});
