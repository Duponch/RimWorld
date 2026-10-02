import { isColonist } from './affiliation.ts';
import { QUEST_HISTORY_LIMIT, QUEST_OFFER_TICKS } from './quest-state.ts';
import { TICKS_PER_DAY, type World } from './types.ts';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const exact = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
const edge = (value: unknown, world: World): boolean => object(value) && exact(value, ['x', 'z'])
  && integer(value.x, 0, world.width - 1) && integer(value.z, 0, world.height - 1)
  && (value.x === 0 || value.z === 0 || value.x === world.width - 1 || value.z === world.height - 1);

/** Validate references against the caller's union of map and scout registries.
 * This never interprets a historical raid result as a second live group. */
export function validateQuests(world: World, version: number): string[] {
  const state: unknown = (world as World & { quests?: unknown }).quests;
  if (state === undefined) {
    const active = world.raids?.active as Record<string, unknown> | undefined;
    const last = world.raids?.last as Record<string, unknown> | undefined;
    const errors: string[] = [];
    if (active?.originQuestId !== undefined || last?.originQuestId !== undefined)
      errors.push('Quest raid lacks its quest calendar.');
    if (Array.isArray(world.pawns) && world.pawns.some(pawn => pawn?.originQuestId !== undefined))
      errors.push(version < 172 ? 'Future quest pawn provenance in legacy save.' : 'Quest pawn lacks its quest calendar.');
    return errors;
  }
  if (version < 172) return ['Future quest calendar in legacy save.'];
  if (!object(state) || !exact(state, ['profile', 'adoptedAt', 'rng', 'nextCheck', 'serial', 'entries'])
    || state.profile !== 'pursued-joiner-v1' || !world.gameProfile || world.raids?.profile !== 'cassandra-raids-v1'
    || !integer(state.adoptedAt, 0, world.tick) || !integer(state.rng, 1, 0xffffffff)
    || !integer(state.nextCheck, world.tick + 1, world.tick + 8 * TICKS_PER_DAY)
    || !integer(state.serial, 0) || !Array.isArray(state.entries) || state.entries.length > QUEST_HISTORY_LIMIT)
    return ['Invalid quest calendar.'];

  const errors: string[] = [];
  let previous = 0;
  let open = 0;
  const pawnIds = new Set<number>();
  const raidIds = new Set<number>();
  const entries = state.entries as unknown[];
  const indexed = new Map<number, Record<string, unknown>>();
  if ((state.serial === 0) !== (entries.length === 0)) errors.push('Quest serial and history disagree.');
  for (const raw of entries) {
    if (!object(raw) || !integer(raw.id, previous + 1, state.serial)) {
      errors.push('Invalid quest identity or order.');
      continue;
    }
    previous = raw.id;
    indexed.set(raw.id, raw);
    const base = ['id', 'offeredAt', 'expiresAt', 'name', 'profile', 'joinDelay', 'raidDelay', 'status'];
    const accepted = raw.status === 'accepted' || raw.status === 'concluded';
    const terminal = raw.status === 'refused' || raw.status === 'expired' || raw.status === 'concluded';
    const hasArrival = raw.arrivedAt !== undefined || raw.pawnId !== undefined || raw.entry !== undefined;
    const hasRaid = raw.raidAt !== undefined || raw.raidGroupId !== undefined;
    const fields = [...base, ...(accepted ? ['acceptedAt'] : []), ...(hasArrival ? ['arrivedAt', 'pawnId', 'entry'] : []),
      ...(hasRaid ? ['raidAt', 'raidGroupId'] : []), ...(terminal ? ['endedAt'] : [])];
    if (!exact(raw, fields) || !integer(raw.offeredAt, state.adoptedAt, world.tick)
      || raw.expiresAt !== Number(raw.offeredAt) + QUEST_OFFER_TICKS || !integer(raw.expiresAt, 0)
      || typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 48
      || !integer(raw.profile, 0, 2) || !integer(raw.joinDelay, 60, 120)
      || typeof raw.raidDelay !== 'number' || ![175, 200, 225, 250].includes(raw.raidDelay)
      || typeof raw.status !== 'string' || !['offered', 'accepted', 'refused', 'expired', 'concluded'].includes(raw.status)
      || !accepted && (hasArrival || hasRaid)) {
      errors.push('Invalid quest record.');
      continue;
    }
    if (raw.status === 'offered' || raw.status === 'accepted') open++;
    if (raw.status === 'offered') {
      if (world.tick >= Number(raw.expiresAt)) errors.push('Expired quest offer remains open.');
      continue;
    }
    if (raw.status === 'refused' || raw.status === 'expired') {
      if (!integer(raw.endedAt, raw.status === 'refused' ? raw.offeredAt as number : raw.expiresAt as number,
        raw.status === 'refused' ? Math.min(world.tick, Number(raw.expiresAt) - 1) : world.tick)
        || raw.status === 'expired' && raw.endedAt !== raw.expiresAt) errors.push('Invalid quest refusal or expiry.');
      continue;
    }
    if (!integer(raw.acceptedAt, raw.offeredAt as number, Math.min(world.tick, Number(raw.expiresAt) - 1))) {
      errors.push('Invalid quest acceptance.');
      continue;
    }
    if (hasArrival) {
      if (!integer(raw.arrivedAt, Number(raw.acceptedAt) + Number(raw.joinDelay), world.tick)
        || !integer(raw.pawnId, 1, world.nextId - 1) || !edge(raw.entry, world)
        || pawnIds.has(raw.pawnId as number)
        || !world.pawns.some(pawn => pawn?.id === raw.pawnId && isColonist(pawn)
          && pawn.originQuestId === raw.id)) errors.push('Invalid quest joiner identity or entry.');
      else pawnIds.add(raw.pawnId as number);
    }
    if (hasRaid) {
      if (!hasArrival || !integer(raw.arrivedAt,0,world.tick) || !integer(raw.raidAt, Math.max(Number(raw.acceptedAt) + Number(raw.raidDelay),
        Number(raw.arrivedAt) + Number(raw.raidDelay) - Number(raw.joinDelay)), world.tick)
        || !integer(raw.raidGroupId, 1, world.raids!.serial) || raidIds.has(raw.raidGroupId as number))
        errors.push('Invalid quest raid identity or timing.');
      else raidIds.add(raw.raidGroupId as number);
    }
    if (raw.status === 'concluded' && (!hasArrival || !hasRaid || !integer(raw.raidAt,0,world.tick)
      || raw.endedAt !== Number(raw.raidAt) + 60 || !integer(raw.endedAt, 0, world.tick)))
      errors.push('Invalid quest conclusion.');
    if (raw.status === 'accepted' && hasRaid && integer(raw.raidAt,0,world.tick) && world.tick >= raw.raidAt + 60)
      errors.push('Quest conclusion is overdue.');
  }
  if (entries.length && previous !== state.serial) errors.push('Quest serial differs from latest retained record.');
  if (open > 1) errors.push('More than one open quest.');
  for (const pawn of world.pawns) {
    if (pawn?.originQuestId === undefined) continue;
    const id = pawn.originQuestId;
    const retained = indexed.get(id);
    if (version < 172 || !integer(id, 1, state.serial)
      || (retained ? retained.arrivedAt === undefined || retained.pawnId !== pawn.id : id >= state.serial))
      errors.push('Invalid quest pawn provenance.');
  }

  const active: unknown = world.raids!.active;
  const last: unknown = world.raids!.last;
  for (const raid of [active, last]) {
    if (!object(raid)) continue;
    const related = entries.find(value => object(value) && value.raidGroupId === raid.id);
    if (raid.originQuestId === undefined && !related) continue;
    if (!integer(raid.originQuestId, 1, state.serial) || !object(related)
      || related.id !== raid.originQuestId || !integer(related.raidAt,0,world.tick)
      || (raid === active ? related.raidAt !== raid.startedAt : !integer(raid.tick, related.raidAt as number, world.tick)))
      errors.push('Quest and raid origin do not agree.');
  }
  return errors;
}
