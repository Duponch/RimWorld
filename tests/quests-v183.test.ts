import { expect, test } from 'vitest';
import { applyCommand, createWorld, stepWorld } from '../src/sim/engine.ts';
import { advanceQuests } from '../src/sim/quests.ts';
import { enableCassandraRaids, INTRO_RAID_TICK } from '../src/sim/cassandra-raids.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { adoptFluIncidents, FLU_FIRST_CHECK } from '../src/sim/flu-incidents.ts';
import { injurePawn } from '../src/sim/health.ts';
import { raidEntries } from '../src/sim/raid-space.ts';
import { createRaidGroup } from '../src/sim/raid-spawn.ts';
import { advanceRaids } from '../src/sim/raids.ts';
import { deserializeWorld, hashWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { QUEST_OFFER_TICKS, QUEST_RETRY_TICKS, type JoinerQuest } from '../src/sim/quest-state.ts';
import { TICKS_PER_DAY, type World } from '../src/sim/types.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

/** Prepared 32² Cassandra colony. The introductory raid is processed at its
 * real opportunity before jumping over otherwise idle days to a quest check. */
function colony(): World {
  const world = deconstructionCamp(3);
  world.scenario = { id: 'crashlanded', revision: 1, landing: { x: 16, z: 16 } };
  world.gameProfile = crashlandedProfile();
  enableCassandraRaids(world);
  adoptFluIncidents(world);
  expect(world.fluIncidents!.nextCheck).toBe(FLU_FIRST_CHECK);
  return world;
}

function offered(): { world: World; quest: JoinerQuest } {
  const world = colony();
  expect(applyCommand(world, { type: 'enable-quests' })).toMatchObject({ ok: true });
  expect(world.quests!.nextCheck).toBe(8 * TICKS_PER_DAY);
  world.tick = INTRO_RAID_TICK;
  advanceRaids(world);
  const intro = world.raids!.active;
  expect(intro).toBeDefined();
  injurePawn(world, world.pawns.find(pawn => pawn.id === intro!.members[0])!, 'brain', 'crush', 99000);
  advanceRaids(world);
  expect(world.raids!.active).toBeUndefined();
  world.tick = world.quests!.nextCheck;
  expect(world.tick).toBeLessThan(world.fluIncidents!.nextCheck);
  const normalAgenda = structuredClone(world.raids!.cassandra);
  advanceQuests(world);
  const quest = world.quests!.entries[0]!;
  expect(quest.status).toBe('offered');
  expect(quest.expiresAt - quest.offeredAt).toBe(QUEST_OFFER_TICKS);
  expect([175, 200, 225, 250]).toContain(quest.raidDelay);
  expect(quest.joinDelay).toBeGreaterThanOrEqual(60);
  expect(quest.joinDelay).toBeLessThanOrEqual(120);
  expect(world.raids!.cassandra).toEqual(normalAgenda);
  expect(validateWorld(world)).toEqual([]);
  return { world, quest };
}

function sameContinuation(world: World): void {
  expect(validateWorld(world)).toEqual([]);
  const restored = deserializeWorld(serializeWorld(world));
  stepWorld(world);
  stepWorld(restored);
  expect(hashWorld(restored)).toBe(hashWorld(world));
  expect(validateWorld(world)).toEqual([]);
}

function stepUntilBefore(world: World, due: number): void {
  expect(due).toBeGreaterThan(world.tick);
  while (world.tick < due - 1) stepWorld(world);
  expect(world.tick).toBe(due - 1);
}

test('V183 quest offers require real Cassandra context; stale, duplicate and expired answers are atomic', () => {
  const unsupported = createWorld(43);
  const before = hashWorld(unsupported);
  expect(applyCommand(unsupported, { type: 'enable-quests' }).ok).toBe(false);
  expect(hashWorld(unsupported)).toBe(before);

  const { world, quest } = offered();
  const worldRng = world.rng, questRng = world.quests!.rng;
  const pawns = world.pawns.length, piles = world.piles.length, ids = world.nextId;
  expect(applyCommand(world, { type: 'answer-quest', questId: quest.id + 1, accept: true }).ok).toBe(false);
  expect(world.quests!.rng).toBe(questRng);
  expect(applyCommand(world, { type: 'answer-quest', questId: quest.id, accept: false })).toMatchObject({ ok: true });
  expect(quest.status).toBe('refused');
  expect(world.pawns).toHaveLength(pawns);
  expect(world.piles).toHaveLength(piles);
  expect(world.nextId).toBe(ids);
  expect(world.rng).toBe(worldRng);
  expect(world.quests!.rng).toBe(questRng);
  const refused = hashWorld(world);
  expect(applyCommand(world, { type: 'answer-quest', questId: quest.id, accept: true }).ok).toBe(false);
  expect(hashWorld(world)).toBe(refused);
  expect(validateWorld(world)).toEqual([]);

  const expiring = offered(), offer = expiring.quest;
  expiring.world.tick = offer.expiresAt;
  const expiryRng = expiring.world.quests!.rng;
  const atBoundary = hashWorld(expiring.world);
  expect(applyCommand(expiring.world, { type: 'answer-quest', questId: offer.id, accept: true }).ok).toBe(false);
  expect(hashWorld(expiring.world)).toBe(atBoundary);
  advanceQuests(expiring.world);
  expect(offer.status).toBe('expired');
  expect(offer.endedAt).toBe(offer.expiresAt);
  expect(expiring.world.quests!.rng).toBe(expiryRng);
  expect(validateWorld(expiring.world)).toEqual([]);
});

test('V183 accepted quest saves at each phase; one joiner, shirt and private-RNG raid reach neutral conclusion', () => {
  const { world, quest } = offered();
  sameContinuation(world); // offered, then one real simulation step
  const ids = world.nextId, originalRng = world.rng;
  const raidRng = world.raids!.rng, agenda = structuredClone(world.raids!.cassandra);
  const originalPiles = world.piles.length;
  expect(applyCommand(world, { type: 'answer-quest', questId: quest.id, accept: true })).toMatchObject({ ok: true });
  expect(quest.acceptedAt).toBe(world.tick);
  expect(world.nextId).toBe(ids);
  const accepted = hashWorld(world);
  expect(applyCommand(world, { type: 'answer-quest', questId: quest.id, accept: true }).ok).toBe(false);
  expect(hashWorld(world)).toBe(accepted);
  sameContinuation(world);

  stepUntilBefore(world, quest.acceptedAt! + quest.joinDelay);
  sameContinuation(world); // actual due tick creates the joiner
  expect(quest.arrivedAt).toBe(world.tick);
  expect(quest.pawnId).toBe(ids);
  expect(world.pawns.filter(pawn => pawn.id === ids)).toHaveLength(1);
  const joiner = world.pawns.find(pawn => pawn.id === ids)!;
  expect(joiner.name).toBe(quest.name);
  expect({ x: joiner.x, z: joiner.z }).toEqual(quest.entry);
  expect(world.piles).toHaveLength(originalPiles + 1);
  expect(world.piles.filter(pile => pile.id === ids + 1)).toMatchObject([
    { item: 'cloth-shirt', quantity: 1, owner: { type: 'apparel', pawnId: ids } },
  ]);
  expect(world.nextId).toBe(ids + 2);

  const due = Math.max(quest.acceptedAt! + quest.raidDelay,
    quest.arrivedAt! + quest.raidDelay - quest.joinDelay);
  stepUntilBefore(world, due);
  sameContinuation(world); // actual due tick creates one physical raider
  const group = world.raids!.active!;
  expect(quest.raidAt).toBe(world.tick);
  expect(quest.raidGroupId).toBe(group.id);
  expect(group.originQuestId).toBe(quest.id);
  expect(group.members).toHaveLength(1);
  expect(group.composition).toEqual({ budget: 35, roster: ['drifter'] });
  const raider = world.pawns.find(pawn => pawn.id === group.members[0])!;
  expect(raider.raid?.group).toBe(group.id);
  expect(Math.max(Math.abs(raider.x - quest.entry!.x), Math.abs(raider.z - quest.entry!.z))).toBeLessThanOrEqual(2);
  expect(world.piles.some(pile => pile.item === 'plasteel-knife' && pile.owner.type === 'equipment' && pile.owner.pawnId === raider.id)).toBe(true);
  expect(world.rng).toBe(originalRng);
  expect(world.raids!.rng).toBe(raidRng);
  expect(world.raids!.cassandra).toEqual(agenda);
  sameContinuation(world);

  injurePawn(world, joiner, 'brain', 'crush', 99000);
  expect(joiner.state).toBe('dead');
  stepUntilBefore(world, quest.raidAt! + 60);
  sameContinuation(world); // conclusion during an active assault, despite death
  expect(quest.status).toBe('concluded');
  expect(quest.endedAt).toBe(quest.raidAt! + 60);
  expect(world.raids!.active?.id).toBe(group.id);
  expect(world.pawns.filter(pawn => pawn.id === joiner.id)).toHaveLength(1);
  expect(validateWorld(world)).toEqual([]);
});

test('V183 blocked entry and occupied raid preserve identities and RNG until the first eligible retry', () => {
  const { world, quest } = offered();
  expect(applyCommand(world, { type: 'answer-quest', questId: quest.id, accept: true })).toMatchObject({ ok: true });
  const edge = world.tiles.map((tile, i) => ({ tile, edge: i % world.width === 0 || i % world.width === world.width - 1
    || i < world.width || i >= world.width * (world.height - 1) }));
  for (let i = 0; i < edge.length; i++) if (edge[i]!.edge) world.tiles[i] = { terrain: 'water' };
  const arrivalDue = quest.acceptedAt! + quest.joinDelay;
  world.tick = arrivalDue;
  const noEntryIds = world.nextId, noEntryRng = world.quests!.rng;
  advanceQuests(world);
  expect(quest.arrivedAt).toBeUndefined();
  expect(world.nextId).toBe(noEntryIds);
  expect(world.quests!.rng).toBe(noEntryRng);
  for (let i = 0; i < edge.length; i++) if (edge[i]!.edge) world.tiles[i] = edge[i]!.tile;
  world.tick = arrivalDue + QUEST_RETRY_TICKS;
  advanceQuests(world);
  expect(quest.arrivedAt).toBe(world.tick);
  expect(quest.pawnId).toBe(noEntryIds);
  expect(validateWorld(world)).toEqual([]);

  const ordinarySites = raidEntries(world, world.raids!.rng, 2)!;
  const ordinaryRandom = { rng: world.raids!.rng };
  const ordinary = createRaidGroup(world, { count: 2, sites: ordinarySites, random: ordinaryRandom, preserveCalendarRng: true });
  expect(ordinary).toBeTruthy();
  const due = Math.max(quest.acceptedAt! + quest.raidDelay,
    quest.arrivedAt! + quest.raidDelay - quest.joinDelay);
  world.tick = due;
  const blockedIds = world.nextId, blockedQuestRng = world.quests!.rng;
  const blockedRaidRng = world.raids!.rng, blockedAgenda = structuredClone(world.raids!.cassandra);
  advanceQuests(world);
  expect(quest.raidAt).toBeUndefined();
  expect(world.nextId).toBe(blockedIds);
  expect(world.quests!.rng).toBe(blockedQuestRng);
  expect(world.raids!.rng).toBe(blockedRaidRng);
  expect(world.raids!.cassandra).toEqual(blockedAgenda);
  for (const id of ordinary!.members)
    injurePawn(world, world.pawns.find(pawn => pawn.id === id)!, 'brain', 'crush', 99000);
  advanceRaids(world);
  expect(world.raids!.active).toBeUndefined();
  world.tick = due + QUEST_RETRY_TICKS;
  advanceQuests(world);
  expect(quest.raidAt).toBe(world.tick);
  expect(world.raids!.active?.originQuestId).toBe(quest.id);
  expect(world.raids!.rng).toBe(blockedRaidRng);
  expect(world.raids!.cassandra).toEqual(blockedAgenda);
  expect(validateWorld(world)).toEqual([]);
});
