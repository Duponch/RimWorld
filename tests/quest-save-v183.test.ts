import { expect, test } from 'vitest';
import { withoutMiningSkill, withoutPredatorDefaults, withoutTelevisionRecreation, withMigratedTelevisionRecreation } from './scenarios/legacy-skills.ts';
import { enableQuests } from '../src/sim/quests.ts';
import { validateQuests } from '../src/sim/quest-save.ts';
import { validateRaids } from '../src/sim/raid-save.ts';
import { raidEntries } from '../src/sim/raid-space.ts';
import { createRaidGroup } from '../src/sim/raid-spawn.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { enableBiomeWildlife } from '../src/sim/wildlife.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { enableCassandraRaids } from '../src/sim/cassandra-raids.ts';
import { adoptFluIncidents } from '../src/sim/flu-incidents.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { startingPawn } from '../src/sim/starting-pawns.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { injurePawn } from '../src/sim/health.ts';
import { advanceRaids } from '../src/sim/raids.ts';
import type { JoinerQuest } from '../src/sim/quest-state.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

test('malformed JSON dates are rejected without coercing objects or throwing from validation',()=>{
  for(const field of ['offeredAt','acceptedAt','arrivedAt','raidAt','endedAt']){
    const w=pursued();
    w.tick=300;const q=w.quests!.entries[0]!;q.status='concluded';q.endedAt=q.raidAt!+60;
    (q as unknown as Record<string,unknown>)[field]={valueOf:0,toString:0};
    expect(()=>validateQuests(w,172)).not.toThrow();
    expect(validateQuests(w,172).length).toBeGreaterThan(0);
    expect(()=>deserializeWorld(JSON.stringify(w))).toThrow(/Invalid save/);
  }
});

test('quest delay and phase reject JSON strings, arrays and objects without coercion',()=>{
  const corruptions:[string,unknown][]=[
    ...['200',['200'],{valueOf:0,toString:0},true,null].map(value=>['raidDelay',value] as [string,unknown]),
    ...[['accepted'],{valueOf:0,toString:0},null,1].map(value=>['status',value] as [string,unknown]),
  ];
  for(const [field,value] of corruptions){
    const w=pursued();
    (w.quests!.entries[0] as unknown as Record<string,unknown>)[field]=value;
    expect(()=>validateQuests(w,172)).not.toThrow();
    expect(validateQuests(w,172).length).toBeGreaterThan(0);
    expect(()=>deserializeWorld(JSON.stringify(w))).toThrow(/Invalid save/);
  }
});

/** A prepared save witness: these tests verify persistence and references,
 * while the quest timeline tests exercise the actual admission transitions. */
function offered(): World {
  const w = deconstructionCamp(3);
  w.scenario = { id: 'crashlanded', revision: 1, landing: { x: 16, z: 16 } };
  w.gameProfile = crashlandedProfile();
  enableCassandraRaids(w); adoptFluIncidents(w);
  enableQuests(w);
  w.quests!.serial = 1;
  w.quests!.entries = [{ id: 1, offeredAt: 0, expiresAt: 1800, name: 'Mira', profile: 0,
    joinDelay: 60, raidDelay: 200, status: 'offered' }];
  return w;
}

function joined(): World {
  const w = offered(), q = w.quests!.entries[0]!;
  q.status = 'accepted'; q.acceptedAt = 0;
  w.tick = 60;
  const entry = { x: 0, z: 16 };
  const p = startingPawn(w.nextId++, q.name, entry.x, entry.z, q.profile, 55, w.seed, w.tick);
  p.hunger = 75; p.rest = 80; p.foodPolicyId = w.foodPolicies[0]!.id; p.originQuestId = q.id;
  w.pawns.push(p);
  w.piles.push({ id: w.nextId++, kind: 'apparel', item: 'cloth-shirt', quantity: 1,
    owner: { type: 'apparel', pawnId: p.id }, apparel: newApparelState('cloth-shirt') });
  q.arrivedAt = w.tick; q.pawnId = p.id; q.entry = entry;
  return w;
}

function pursued(): World {
  const w = joined(), q = w.quests!.entries[0]!;
  w.tick = 200;
  const sites = raidEntries(w, 1, 1, q.entry);
  expect(sites).not.toBeNull();
  const group = createRaidGroup(w, { count: 1, sites: sites!, random: { rng: 1 },
    composition: { budget: 35, roster: ['drifter'] }, preserveCalendarRng: true });
  expect(group).not.toBeNull();
  group!.originQuestId = q.id;
  q.raidAt = w.tick; q.raidGroupId = group!.id;
  return w;
}

test('schema 171 migrates without a quest and rejects either future quest field', () => {
  const current = createScenarioWorld(42, 32, 'crashlanded');
  const old = withoutPredatorDefaults(withoutTelevisionRecreation(withoutMiningSkill(structuredClone(current))));
  (old as unknown as Record<string, unknown>).schemaVersion = 171;
  // The declared historical starters predate recorded personal backgrounds.
  for(const pawn of old.pawns)delete pawn.background;
  if(old.raids)delete old.raids.mechanoid;
  // Prepare the historical ecological profile before any future quest field.
  delete old.wildlife;
  enableBiomeWildlife(old, old.site!.biome);
  expect(deserializeWorld(JSON.stringify(old))).toEqual(withMigratedTelevisionRecreation({...old,schemaVersion:SCHEMA_VERSION}));

  const injected = structuredClone(old);
  injected.quests = offered().quests;
  expect(() => deserializeWorld(JSON.stringify(injected))).toThrow(/version 171/);
  const futurePawn = structuredClone(old);
  futurePawn.pawns[0]!.originQuestId = 1;
  expect(() => deserializeWorld(JSON.stringify(futurePawn))).toThrow(/version 171/);

  const linked = pursued();
  // Only the quest-era raid context is examined by these versioned guards.
  delete linked.raids!.mechanoid;
  expect(validateRaids(linked, 172, new Set())).toEqual([]);
  expect(validateRaids(linked, 171, new Set())).toContain('Invalid active raid group.');

  const oldRaid = structuredClone(old);
  const sites = raidEntries(oldRaid, 1, 1)!;
  const group = createRaidGroup(oldRaid, { count: 1, sites, random: { rng: 1 } })!;
  // The current actor factory adds Mining; this declared historical actor did
  // not have that profile. Validate the neutral base before injecting origin.
  withoutTelevisionRecreation(withoutMiningSkill(oldRaid));
  expect(deserializeWorld(JSON.stringify(oldRaid))).toEqual(withMigratedTelevisionRecreation({...oldRaid,schemaVersion:SCHEMA_VERSION}));
  group.originQuestId = 1;
  expect(() => deserializeWorld(JSON.stringify(oldRaid))).toThrow(/version 171/);
});

test('each prepared phase saves with one joined person and an independent physical pursuit', () => {
  const offer = offered();
  expect(validateWorld(offer)).toEqual([]);
  expect(deserializeWorld(serializeWorld(offer))).toEqual(offer);

  const accepted = structuredClone(offer), q = accepted.quests!.entries[0]!;
  q.status = 'accepted'; q.acceptedAt = 0;
  expect(validateWorld(accepted)).toEqual([]);
  expect(deserializeWorld(serializeWorld(accepted))).toEqual(accepted);

  const arrival = joined();
  expect(validateWorld(arrival)).toEqual([]);
  expect(deserializeWorld(serializeWorld(arrival))).toEqual(arrival);

  const raid = pursued();
  expect(validateWorld(raid)).toEqual([]);
  expect(deserializeWorld(serializeWorld(raid))).toEqual(raid);
  expect(raid.raids!.active!.composition).toEqual({ budget: 35, roster: ['drifter'] });
  expect(raid.raids!.active!.members.every(id => raid.pawns.some(p => p.id === id))).toBe(true);
  expect(raid.raids!.cassandra!.pending).toEqual(offer.raids!.cassandra!.pending);
  expect(raid.raids!.rng).toBe(offer.raids!.rng);

  raid.tick = 260;
  raid.quests!.entries[0]!.status = 'concluded';
  raid.quests!.entries[0]!.endedAt = 260;
  expect(validateWorld(raid)).toEqual([]);
  expect(deserializeWorld(serializeWorld(raid))).toEqual(raid);
});

test('quest calendar rejects malformed phases, actors, raid links and composition', () => {
  const base = pursued();
  const rejects = (change: (w: World) => void) => {
    const w = structuredClone(base);
    change(w);
    expect(validateWorld(w).length).toBeGreaterThan(0);
    expect(() => deserializeWorld(serializeWorld(w))).toThrow();
  };
  rejects(w => { w.quests!.entries[0]!.raidDelay = 180; });
  rejects(w => { delete w.pawns.find(p => p.id === w.quests!.entries[0]!.pawnId)!.originQuestId; });
  rejects(w => { w.pawns.find(p => p.id === w.quests!.entries[0]!.pawnId)!.originQuestId = 2; });
  rejects(w => { w.quests!.entries[0]!.pawnId = w.pawns[0]!.id; w.pawns[0]!.faction = 'outlaws'; });
  rejects(w => { w.quests!.entries[0]!.entry = { x: 16, z: 16 }; });
  rejects(w => { w.quests!.entries[0]!.raidGroupId!++; });
  rejects(w => { w.raids!.active!.originQuestId!++; });
  rejects(w => { w.raids!.active!.composition!.budget = 70; });
  rejects(w => { delete w.raids!.active!.originQuestId; });
  rejects(w => { w.quests!.entries[0]!.raidAt = 199; });
  rejects(w => { (w.quests!.entries[0] as JoinerQuest & { future?: true }).future = true; });
  rejects(w => { w.tick = 260; }); // The committed raid must conclude at +60.

  const malformed = structuredClone(base);
  (malformed.quests!.entries as unknown[])[0] = null;
  expect(() => validateQuests(malformed, 172)).not.toThrow();
  expect(validateQuests(malformed, 172).length).toBeGreaterThan(0);
});

test('completed pursuit retains its quest origin in the last physical raid result', () => {
  const w = pursued();
  const raider = w.pawns.find(p => p.raid?.group === w.raids!.active!.id)!;
  injurePawn(w, raider, 'brain', 'crush', 99000);
  advanceRaids(w);
  expect(w.raids!.active).toBeUndefined();
  expect(w.raids!.last!.originQuestId).toBe(1);
  expect(w.raids!.last!.composition).toEqual({ budget: 35, roster: ['drifter'] });
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  delete w.raids!.last!.originQuestId;
  expect(validateWorld(w).length).toBeGreaterThan(0);
  expect(validateQuests(w, 172)).toContain('Quest and raid origin do not agree.');
});

test('history preserves distinct joiner identities and terminal refusal or expiry creates no actor', () => {
  const empty = offered();
  empty.quests!.entries = []; empty.quests!.serial = 0;
  expect(validateWorld(empty)).toEqual([]);
  empty.quests!.serial = 1;
  expect(validateQuests(empty, 172)).toContain('Quest serial and history disagree.');

  const refused = offered(), q = refused.quests!.entries[0]!;
  q.status = 'refused'; q.endedAt = 0;
  expect(validateWorld(refused)).toEqual([]);
  expect(refused.pawns).toHaveLength(3);
  const expired = offered(), e = expired.quests!.entries[0]!;
  expired.tick = 1800; e.status = 'expired'; e.endedAt = 1800;
  expect(validateWorld(expired)).toEqual([]);
  expect(expired.pawns).toHaveLength(3);

  const duplicate = pursued();
  duplicate.tick = 300;
  const old = duplicate.quests!.entries[0]!;
  old.status = 'concluded'; old.endedAt = 260;
  const later: JoinerQuest = { id: 2, offeredAt: 200, expiresAt: 2000, name: 'Sol', profile: 1,
    joinDelay: 60, raidDelay: 225, status: 'accepted', acceptedAt: 200,
    arrivedAt: 260, pawnId: old.pawnId, entry: { x: 0, z: 15 } };
  duplicate.quests!.serial = 2;
  duplicate.quests!.entries.push(later);
  expect(validateQuests(duplicate, 172)).toContain('Invalid quest joiner identity or entry.');
});
