import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { enableCassandraRaids, INTRO_RAID_TICK } from '../src/sim/cassandra-raids.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { adoptFluIncidents, FLU_FIRST_CHECK } from '../src/sim/flu-incidents.ts';
import { injurePawn } from '../src/sim/health.ts';
import { advanceQuests } from '../src/sim/quests.ts';
import { advanceRaids } from '../src/sim/raids.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import type { World } from '../src/sim/types.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

function offered(): World {
  const world = deconstructionCamp(3);
  world.scenario = { id: 'crashlanded', revision: 1, landing: { x: 16, z: 16 } };
  world.gameProfile = crashlandedProfile();
  enableCassandraRaids(world);
  adoptFluIncidents(world);
  expect(world.fluIncidents!.nextCheck).toBe(FLU_FIRST_CHECK);
  expect(applyCommand(world, { type: 'enable-quests' })).toMatchObject({ ok: true });
  world.tick = INTRO_RAID_TICK;
  advanceRaids(world);
  const raider = world.pawns.find(pawn => pawn.id === world.raids!.active!.members[0])!;
  injurePawn(world, raider, 'brain', 'crush', 99000);
  advanceRaids(world);
  world.tick = world.quests!.nextCheck;
  expect(world.tick).toBeLessThan(world.fluIncidents!.nextCheck);
  advanceQuests(world);
  expect(world.quests!.entries[0]?.status).toBe('offered');
  expect(validateWorld(world)).toEqual([]);
  return world;
}

function accept(world: World): void {
  const quest = world.quests!.entries[0]!;
  expect(applyCommand(world, { type: 'answer-quest', questId: quest.id, accept: true })).toMatchObject({ ok: true });
}

function pursue(world: World): void {
  const quest = world.quests!.entries[0]!;
  world.tick = quest.acceptedAt! + quest.joinDelay;
  advanceQuests(world);
  expect(quest.arrivedAt).toBe(world.tick);
  world.tick = Math.max(quest.acceptedAt! + quest.raidDelay,
    quest.arrivedAt! + quest.raidDelay - quest.joinDelay);
  advanceQuests(world);
  expect(quest.raidAt).toBe(world.tick);
  expect(validateWorld(world)).toEqual([]);
}

test('V183 same-tick accepted quest reaches bridge as a delta and leaves the prior owned checkpoint unchanged', () => {
  const world = offered(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const first = structuredClone(encoder.encode(world, 0, 1));
  expect(first.kind).toBe('checkpoint');
  const before = decoder.adopt(first);
  if (before.status !== 'applied') throw Error(before.status);
  const retained = JSON.stringify(before.world);
  const tick = world.tick;
  accept(world);
  const packet = structuredClone(encoder.encode(world, 0, 1));
  expect(packet.kind).toBe('delta');
  const after = decoder.adopt(packet);
  if (after.status !== 'applied') throw Error(after.status);
  expect(after.world.tick).toBe(tick);
  expect(after.world.quests?.entries[0]?.status).toBe('accepted');
  expect(after.world.quests?.entries[0]?.acceptedAt).toBe(tick);
  expect(JSON.stringify(before.world)).toBe(retained);
  expect(world.pawns.length).toBe(before.world.pawns.length);
});

test('V183 malformed future phase or quest/raid links refuse a delta without advancing bridge revision', () => {
  const world = offered(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  const first = structuredClone(encoder.encode(world, 0, 1));
  expect(decoder.adopt(first).status).toBe('applied');
  accept(world);
  pursue(world);
  const good = structuredClone(encoder.encode(world, 0, 1));
  expect(good.kind).toBe('delta');
  const record = (packet: typeof good): Record<string, unknown> =>
    packet.world.quests!.entries[0] as unknown as Record<string, unknown>;
  const corruptions: ((packet: typeof good) => void)[] = [
    packet => { record(packet).future = true; },
    packet => { record(packet).pawnId = world.nextId + 1; },
    packet => { record(packet).raidAt = world.tick + 1; },
    packet => { record(packet).raidDelay = '200'; },
    packet => { record(packet).status = {valueOf:0,toString:0}; },
    packet => { packet.world.raids!.active!.originQuestId = world.quests!.entries[0]!.id + 1; },
    packet => { (packet.world as unknown as Record<string, unknown>).schemaVersion = 171; },
  ];
  for (const corrupt of corruptions) {
    const bad = structuredClone(good);
    corrupt(bad);
    expect(decoder.adopt(bad as SnapshotMessage).status).toBe('resync');
  }
  const adopted = decoder.adopt(good);
  if (adopted.status !== 'applied') throw Error(adopted.status);
  expect(adopted.world.quests?.entries[0]?.raidGroupId).toBe(adopted.world.raids?.active?.id);
  expect(adopted.world.raids?.active?.originQuestId).toBe(adopted.world.quests?.entries[0]?.id);
});
