import type { Pawn, World } from './types.ts';
import type { RelationshipPeople, RelationshipPerson } from './relationship-state.ts';

/** Human owners only. Archives establish identity, never a living world pawn.
 * Call after the ordinary owner/Thing-ID checks when decoding an untrusted save. */
export function captureRelationshipPeople(world: World): RelationshipPeople {
  const people = new Map<number, RelationshipPerson>();
  const add = (person: RelationshipPerson): void => {
    if (!Number.isSafeInteger(person.id) || person.id < 1 || person.id >= world.nextId
      || typeof person.name !== 'string' || person.name.length < 1 || person.name.length > 80)
      throw new Error('Invalid human relationship identity.');
    if (people.has(person.id)) throw new Error('Duplicate human relationship owner.');
    people.set(person.id, person);
  };
  const clock = (tick: number): void => {
    if (!Number.isSafeInteger(tick) || tick < 0 || tick > world.tick) throw new Error('Invalid human archive clock.');
  };
  const pawn = (p: Pawn, status: 'present' | 'away' | 'departed', tick = world.tick): void => {
    if (!p || !['idle','moving','working','sleeping','hungry','eating','recreating','resting','downed','dead'].includes(p.state)
      || p.health !== undefined && (!p.health || typeof p.health !== 'object' || Array.isArray(p.health) || p.health.body !== undefined))
      throw new Error('Invalid human relationship owner.');
    const deathAt = p.health?.death?.tick;
    if (deathAt !== undefined && (!Number.isSafeInteger(deathAt) || deathAt < 0 || deathAt > tick))
      throw new Error('Invalid human clinical death clock.');
    add({ id: p.id, name: p.name, status: p.state === 'dead' || deathAt !== undefined ? 'dead' : status,
      ...(deathAt !== undefined ? { deathAt } : {}) });
  };
  for (const p of world.pawns) pawn(p, 'present');
  if (world.scout && 'pawn' in world.scout) pawn(world.scout.pawn, 'away');
  if (world.commercialTrip && 'pawn' in world.commercialTrip) pawn(world.commercialTrip.pawn, 'away');
  for (const departure of world.visitors?.departed ?? []) { clock(departure.tick); pawn(departure.pawn, 'departed', departure.tick); }
  for (const departure of world.podRescues?.departed ?? []) { clock(departure.tick); pawn(departure.pawn, 'departed', departure.tick); }
  for (const departure of world.raids?.departed ?? []) {
    clock(departure.tick);
    add({ id: departure.pawnId, name: departure.name, status: 'departed' });
  }
  for (const departure of world.prisonDepartures ?? []) {
    clock(departure.tick);
    add({ id: departure.pawnId, name: departure.name, status: 'departed' });
  }
  return people;
}
