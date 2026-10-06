import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder, readSnapshotChanges, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { NumericMembership, type NumericMembershipWriter } from '../src/sim/numeric-membership.ts';
import { createWorld, applyCommand } from '../src/sim/engine.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { validateWorld, serializeWorld, deserializeWorld } from '../src/sim/serialization.ts';
import { validateMechanoids } from '../src/sim/mechanoid-save.ts';
import { registerGroupThingIds } from '../src/sim/group-namespace-save.ts';
import { validateProjectiles } from '../src/sim/projectile-save.ts';
import { validateBombWaves } from '../src/sim/bomb-state.ts';
import { tryGroupDeparture } from '../src/sim/group-driver.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { createBulletFlight } from '../src/sim/bullet-flight.ts';
import { registerWorldProjectile } from '../src/sim/projectile-system.ts';
import { projectileProfile } from '../src/sim/ranged-statistics.ts';
import { miniTurretExplosive } from '../src/sim/bomb-creation.ts';
import { applyStructureExternalDamage } from '../src/sim/bomb-system.ts';
import { scytherCamp } from './scenarios/scyther-v213.ts';
import { miniTurretCamp, campTurret } from './scenarios/mini-turret-v212.ts';
import type { Pawn, World } from '../src/sim/types.ts';

const raw = (value: object): Record<string, unknown> => value as unknown as Record<string, unknown>;
type Writer = (world: World, ids: NumericMembershipWriter) => string[];
interface Fixture {
  world: World; ownedIds: number[]; write: Writer;
  corrupt: (message: SnapshotMessage) => void; refusal: string;
}
function occupyZone(message: SnapshotMessage, id: unknown): void {
  // Intentionally corrupt transport ownership. Growing-zone kind is checked
  // before the collective namespace; this is not a valid-save preparation.
  message.world.growingZones.push({ id: 1, plant: 'rice', cells: [0], allowSow: true, allowCut: true });
  raw(message.world.growingZones.at(-1)!).id = id;
}
function emit(world: World): void {
  const launcher = world.pawns[0]!, target = world.pawns[1]!;
  registerWorldProjectile(world, createBulletFlight({
    origin: { x: launcher.x + .5, z: launcher.z + .5 },
    destination: { x: target.x + .5, z: target.z + .5 },
    launcherKey: `pawn:${launcher.id}`, equipmentKey: null,
    intendedKey: `pawn:${target.id}`, usedKey: `pawn:${target.id}`, flags: 7, preventFriendlyFire: false,
    speedPerCoreTick: projectileProfile('revolver', 'normal')!.projectileTilesPerCoreTick,
  }), 'normal', { friendlyPawnIds: world.pawns.map(pawn => pawn.id), friendlyFireFactor: .4 });
  expect(world.projectiles).toHaveLength(1);
}
function mechanical(): Fixture {
  const { world, actor } = scytherCamp();
  return { world, ownedIds: [actor.id], write: (w, ids) => validateMechanoids(w, w.schemaVersion, ids),
    corrupt: message => occupyZone(message, actor.id), refusal: 'Identité, cible ou déplacement mécanique invalide.' };
}
function group(): Fixture {
  const world = createScenarioWorld(216, 32, 'crashlanded');
  for (const pawn of world.pawns) {
    delete pawn.health; delete pawn.background; delete pawn.traits;
    pawn.hunger = 95; pawn.rest = 95; pawn.recreation.level = 100;
    pawn.apparelAutomation = false; pawn.schedule.fill('work');
    for (const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[]) pawn.priorities[key] = 0;
  }
  const members = world.pawns.slice(0, 2);
  addMaterial(world, 'food', members.length, { type: 'inventory', pawnId: members[0]!.id }, 'survival-meal');
  expect(applyCommand(world, { type: 'planet-adopt' }).ok).toBe(true);
  expect(applyCommand(world, { type: 'group-start', memberIds: members.map(p => p.id),
    destination: world.planet!.civilianTile, sources: [] }).ok).toBe(true);
  const formation = world.group;
  if (!formation || !('exits' in formation)) throw Error('Real group formation missing');
  // Only the final exit frontier is authored. The departure producer transfers
  // original people/items atomically; no route or trade is claimed as played.
  formation.phase = 'leaving';
  for (const exit of formation.exits) {
    const pawn = world.pawns.find(p => p.id === exit.pawnId)!;
    if (!exit.cell) throw Error('Legal group exit missing');
    Object.assign(pawn, { x: exit.cell.x, z: exit.cell.z, state: 'idle', path: [], moveCooldown: 0, planCooldown: 0 });
    delete pawn.motion;
  }
  tryGroupDeparture(world);
  const away = world.group;
  if (!away || !('members' in away)) throw Error('Original group owners not transferred');
  away.phase = 'at-site'; away.tile = world.planet!.civilianTile; away.destination = away.tile;
  away.route = [away.tile]; away.segment = null; away.stop = { kind: 'at-site' };
  expect(away.members).toHaveLength(2); expect(away.items.length).toBeGreaterThan(0);
  return { world, ownedIds: [...away.members, ...away.items].map(owner => owner.id), write: registerGroupThingIds,
    corrupt: message => occupyZone(message, away.items[0]!.id), refusal: 'Une identité du groupe possède plusieurs propriétaires.' };
}
function ballistic(): Fixture {
  const world = createWorld(42, 16, 16); emit(world);
  return { world, ownedIds: world.projectiles!.map(projectile => projectile.id),
    write: (w, ids) => validateProjectiles(w, w.schemaVersion, ids),
    corrupt: message => { message.world.projectiles![0]!.id = world.pawns[0]!.id; },
    refusal: 'Balle ou canon lanceur invalide.' };
}
function bomb(withProjectile = false): Fixture {
  const world = miniTurretCamp(), turret = campTurret(world); turret.turret!.holdFire = true;
  while (!miniTurretExplosive(turret.id)) turret.id = world.nextId++;
  addMaterial(world, 'component', 1, { type: 'ground', x: 2, z: 2 }, 'component');
  const occupiedId = world.piles.find(pile => pile.item === 'component')!.id;
  if (withProjectile) {
    // A nearby actual human target keeps this short flight inside the ordinary
    // revolver range. Emission is real; no damage or impact is claimed.
    world.pawns[1]!.x = 4; world.pawns[1]!.z = 8; emit(world);
    world.relationships = { links: [] };
  }
  expect(applyStructureExternalDamage(world, turret, 100, 100, 'bullet', world.rng, world.tick * 10)).toBe(true);
  expect(world.structures).not.toContain(turret); expect(world.bombWaves).toHaveLength(1);
  expect(occupiedId).toBeGreaterThan(turret.id); expect(world.bombWaves![0]!.id).toBeGreaterThan(occupiedId);
  return { world, ownedIds: world.bombWaves!.map(wave => wave.id),
    write: (w, ids) => { const errors: string[] = []; validateBombWaves(w, errors, ids); return errors; },
    corrupt: message => { message.world.bombWaves![0]!.id = occupiedId; },
    refusal: 'Vague Bomb ou identité invalide.' };
}
const fixtures = [ ['mechanical', mechanical], ['group', group], ['projectile', ballistic], ['Bomb', bomb] ] as const;

function strict(world: World): void {
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toStrictEqual(world);
}
function submit(decoder: SnapshotDecoder, input: SnapshotMessage): ReturnType<SnapshotDecoder['adopt']> {
  const before = structuredClone(input), result = decoder.adopt(input);
  expect(input).toStrictEqual(before); // Compare the actual object submitted.
  return result;
}
function accept(decoder: SnapshotDecoder, input: SnapshotMessage, world: World): World {
  const result = submit(decoder, input); expect(result.status).toBe('applied');
  if (result.status !== 'applied') throw Error(JSON.stringify(result));
  expect(result.world).toStrictEqual(world); expect(result.world.rng).toBe(world.rng);
  return result.world;
}

test.each(fixtures)('%s writer uses nonempty owners identically with native and numeric membership', (_name, prepare) => {
  const { world, write, ownedIds } = prepare(); strict(world);
  const before = structuredClone(world);
  for (const duplicate of [false, true]) {
    const seed = duplicate ? [ownedIds[0]!] : [];
    const native = new Set(seed), numeric = new NumericMembership(65_536, seed);
    const nativeErrors = write(world, native), numericErrors = write(world, numeric);
    expect(numericErrors).toEqual(nativeErrors);
    if (duplicate) expect(nativeErrors.length).toBeGreaterThan(0); else expect(nativeErrors).toEqual([]);
    for (const id of ownedIds) { expect(native.has(id)).toBe(true); expect(numeric.has(id)).toBe(true); }
    expect([...numeric]).toEqual([...native]); expect(world).toStrictEqual(before);
  }
});

test.each(fixtures)('%s namespace refuses ownership aliases and recovers at the refused revision', (_name, prepare) => {
  for (const checkpoint of [false, true]) {
    const fixture = prepare(), { world } = fixture; strict(world);
    const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
    const initialInput = structuredClone(encoder.encode(world, 0, 0)), initialCopy = structuredClone(initialInput);
    const held = accept(decoder, initialInput, world), heldCopy = structuredClone(held);
    const good = structuredClone(encoder.encode(world, 0, 0, checkpoint));
    expect(good.kind).toBe(checkpoint ? 'checkpoint' : 'delta'); expect(good.world.tick).toBe(held.tick);
    const bad = structuredClone(good); fixture.corrupt(bad);
    expect(submit(decoder, bad)).toEqual({ status: 'resync', reason: fixture.refusal });
    expect(held).toStrictEqual(heldCopy); expect(readSnapshotChanges(held, held)).toEqual({ resourceIndices: [], tileIndices: [] });
    expect(readSnapshotChanges(held, bad.world as World)).toBeUndefined();
    accept(decoder, good, world);
    expect(held).toStrictEqual(heldCopy); expect(initialInput).toStrictEqual(initialCopy);
  }
});

test('a late relational refusal follows real projectile and Bomb owners without consuming the revision or epoch', () => {
  const fixture = bomb(true), { world } = fixture; strict(world);
  const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const initialInput = structuredClone(encoder.encode(world, 0, 0)), initialCopy = structuredClone(initialInput);
  const held = accept(decoder, initialInput, world), heldCopy = structuredClone(held);
  const good = structuredClone(encoder.encode(world, 0, 0));
  const late = structuredClone(good); raw(late.world.relationships!).unexpected = true;
  const lateCopy = structuredClone(late);
  expect(submit(decoder, late)).toEqual({ status: 'resync', reason: 'Liens, annonce ou souvenirs relationnels incohérents.' });
  const earlier = structuredClone(late); fixture.corrupt(earlier);
  expect(submit(decoder, earlier)).toEqual({ status: 'resync', reason: fixture.refusal });
  expect(held).toStrictEqual(heldCopy); expect(readSnapshotChanges(held, held)).toBeDefined();
  accept(decoder, good, world); // Same revision that both hostile packets used.
  const replacement = structuredClone(world), nextEpoch = structuredClone(encoder.encode(replacement, 0, 0));
  expect(nextEpoch.kind).toBe('checkpoint'); expect(nextEpoch.epoch).toBe(good.epoch + 1);
  const rejectedEpoch = structuredClone(nextEpoch); raw(rejectedEpoch.world.relationships!).unexpected = true;
  expect(submit(decoder, rejectedEpoch)).toEqual({ status: 'resync', reason: 'Liens, annonce ou souvenirs relationnels incohérents.' });
  accept(decoder, nextEpoch, replacement);
  expect(held).toStrictEqual(heldCopy); expect(late).toStrictEqual(lateCopy); expect(initialInput).toStrictEqual(initialCopy);
});

test('historical raw owner IDs stay permissive without relationship context, then refuse and recover atomically', () => {
  // Parser compatibility only: these deliberately malformed zone IDs are not
  // claimed to satisfy the complete save/domain guard.
  for (const value of ['3', undefined, { legacyOwner: true }]) {
    const { world } = mechanical();
    expect(Object.hasOwn(world, 'relationships')).toBe(false); expect(Object.hasOwn(world, 'planet')).toBe(false);
    const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
    const clean = structuredClone(encoder.encode(world, 0, 0)), input = structuredClone(clean);
    occupyZone(input, value); occupyZone(input, value);
    const inputCopy = structuredClone(input), expected = structuredClone(input.world) as World;
    const held = accept(decoder, input, expected), heldCopy = structuredClone(held);
    const refused = structuredClone(input); refused.revision++; refused.world.relationships = { links: [] };
    const refusedCopy = structuredClone(refused);
    expect(submit(decoder, refused)).toEqual({ status: 'resync', reason: 'Identité dupliquée ou invalide dans le registre relationnel.' });
    expect(held).toStrictEqual(heldCopy); expect(readSnapshotChanges(held, held)).toBeDefined();
    const recovery = structuredClone(clean); recovery.revision = refused.revision;
    accept(decoder, recovery, world);
    const stale = structuredClone(refused); raw(stale.world).schemaVersion = world.schemaVersion + .5;
    expect(submit(decoder, stale)).toEqual({ status: 'stale' });
    expect(held).toStrictEqual(heldCopy); expect(input).toStrictEqual(inputCopy); expect(refused).toStrictEqual(refusedCopy);
  }
});
