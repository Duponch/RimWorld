import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { enableCassandraRaids, INTRO_RAID_TICK } from '../src/sim/cassandra-raids.ts';
import { scoutEligible } from '../src/sim/caravan-trip.ts';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { adoptFluIncidents } from '../src/sim/flu-incidents.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { injurePawn } from '../src/sim/health.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { advanceQuests } from '../src/sim/quests.ts';
import { advanceRaids } from '../src/sim/raids.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { type World } from '../src/sim/types.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

function offered(): World {
  const world = deconstructionCamp(3);
  world.scenario = { id: 'crashlanded', revision: 1, landing: { x: 16, z: 16 } };
  world.gameProfile = crashlandedProfile();
  enableCassandraRaids(world);
  adoptFluIncidents(world);
  expect(applyCommand(world, { type: 'enable-quests' })).toMatchObject({ ok: true });
  world.tick = INTRO_RAID_TICK;
  advanceRaids(world);
  const intro = world.raids!.active!;
  injurePawn(world, world.pawns.find(pawn => pawn.id === intro.members[0])!, 'brain', 'crush', 99000);
  advanceRaids(world);
  expect(world.raids!.active).toBeUndefined();
  world.tick = world.quests!.nextCheck;
  expect(world.tick).toBeLessThan(world.fluIncidents!.nextCheck);
  advanceQuests(world);
  expect(world.quests!.entries[0]?.status).toBe('offered');
  expect(validateWorld(world)).toEqual([]);
  return world;
}

test('V183 joined pawn physically scouts with original identity, possessions and quest link through save and bridge', () => {
  const world = offered();
  const quest = world.quests!.entries[0]!;
  expect(applyCommand(world, { type: 'answer-quest', questId: quest.id, accept: true })).toMatchObject({ ok: true });
  for (let n = 0; n < 120 && quest.arrivedAt === undefined; n++) stepWorld(world);
  expect(quest.arrivedAt).toBe(world.tick);
  expect(quest.raidAt).toBeUndefined();
  const joiner = world.pawns.find(pawn => pawn.id === quest.pawnId)!;
  expect(joiner.originQuestId).toBe(quest.id);
  const shirt = world.piles.find(pile => pile.owner.type === 'apparel' && pile.owner.pawnId === joiner.id)!;
  expect(shirt.item).toBe('cloth-shirt');

  // A prepared ration stack is still loaded by contact and carried through a
  // real edge exit; it is not inserted into the off-map manifest by the test.
  const foodCell = joiner.x === 0 ? { x: 1, z: joiner.z }
    : joiner.x === world.width - 1 ? { x: joiner.x - 1, z: joiner.z }
      : joiner.z === 0 ? { x: joiner.x, z: 1 } : { x: joiner.x, z: joiner.z - 1 };
  addMaterial(world, 'food', 2, { type: 'ground', ...foodCell }, 'survival-meal');
  const food = world.piles.find(pile => pile.item === 'survival-meal' && pile.owner.type === 'ground'
    && pile.owner.x === foodCell.x && pile.owner.z === foodCell.z)!;
  expect(scoutEligible(world, joiner)).toBeNull();
  expect(validateWorld(world)).toEqual([]);

  const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const checkpoint = structuredClone(encoder.encode(world, 0, 1));
  expect(checkpoint.kind).toBe('checkpoint');
  const before = decoder.adopt(checkpoint);
  if (before.status !== 'applied') throw Error(before.status);
  const retained = JSON.stringify(before.world);

  expect(applyCommand(world, { type: 'scout-start', pawnId: joiner.id, pileId: food.id, quantity: 2 }))
    .toMatchObject({ ok: true });
  expect(world.scout?.phase).toBe('loading');
  const phases = new Set<string>();
  for (let n = 0; n < 120 && world.scout?.phase !== 'travelling'; n++) {
    phases.add(world.scout?.phase ?? 'none');
    stepWorld(world);
  }
  expect(phases.has('leaving')).toBe(true);
  const trip = world.scout;
  if (!trip || trip.phase !== 'travelling') throw Error('The joined pawn did not physically leave the map.');
  expect(quest.pawnId).toBe(joiner.id);
  expect(trip.pawn).toBe(joiner);
  expect(trip.pawn.originQuestId).toBe(quest.id);
  expect(world.pawns.some(pawn => pawn.id === joiner.id)).toBe(false);
  expect(world.piles.some(pile => pile.id === shirt.id || pile.id === food.id)).toBe(false);
  expect(trip.items.filter(pile => pile.id === shirt.id && pile.owner.type === 'apparel'
    && pile.owner.pawnId === joiner.id)).toHaveLength(1);
  expect(trip.items.filter(pile => pile.id === food.id && pile.item === 'survival-meal'
    && pile.owner.type === 'inventory' && pile.owner.pawnId === joiner.id)).toHaveLength(1);
  expect(validateWorld(world)).toEqual([]);

  const saved = serializeWorld(world), resumed = deserializeWorld(saved);
  expect(resumed).toEqual(world);
  stepWorld(world);
  stepWorld(resumed);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
  expect(validateWorld(world)).toEqual([]);

  const good = structuredClone(encoder.encode(world, 0, 1));
  expect(good.kind).toBe('delta');
  const bad = structuredClone(good);
  if (!bad.world.scout || bad.world.scout.phase !== 'travelling') throw Error('Expected an off-map scout delta.');
  bad.world.scout.pawn.originQuestId = quest.id + 1;
  expect(decoder.adopt(bad).status).toBe('resync');
  const adopted = decoder.adopt(good);
  if (adopted.status !== 'applied') throw Error(adopted.status);
  expect(JSON.stringify(before.world)).toBe(retained);
  expect(adopted.world.pawns.some(pawn => pawn.id === joiner.id)).toBe(false);
  expect(adopted.world.scout?.phase).toBe('travelling');
  if (adopted.world.scout?.phase !== 'travelling') throw Error('Expected the original off-map owner.');
  expect(adopted.world.scout.pawn.id).toBe(joiner.id);
  expect(adopted.world.scout.pawn.originQuestId).toBe(quest.id);
  expect(adopted.world.quests?.entries[0]?.pawnId).toBe(joiner.id);
});
