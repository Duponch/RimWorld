import type { Pawn, World } from './types.ts';
import { captureRelationshipPeople } from './relationship-namespace.ts';
import { validAnnouncedRelationship, validateRelationships } from './relationship-save.ts';
import { validFamilyBereavement } from './family-bereavement-save.ts';
import { validRomanceMemories } from './romance-memories.ts';

/** One complete context check after human owner/ID validation. Frozen records
 * retain their own clock. No generation, recursive World validation or mutation. */
export function validateRelationshipWorld(world: World, version: number): string[] {
  const owners: { pawn: Pawn; tick: number }[] = world.pawns.map(pawn => ({ pawn, tick: world.tick }));
  if (world.scout && 'pawn' in world.scout) owners.push({ pawn: world.scout.pawn, tick: world.tick });
  if (world.commercialTrip && 'pawn' in world.commercialTrip) owners.push({ pawn: world.commercialTrip.pawn, tick: world.tick });
  for (const departure of world.visitors?.departed ?? []) owners.push({ pawn: departure.pawn, tick: departure.tick });
  for (const departure of world.podRescues?.departed ?? []) owners.push({ pawn: departure.pawn, tick: departure.tick });
  const offers = [...(world.arrivals?.pending ? [world.arrivals.pending] : []), ...(world.quests?.entries ?? [])];
  const hasFields = Object.hasOwn(world, 'relationships')
    || owners.some(({ pawn }) => Object.hasOwn(pawn, 'familyBereavement') || Object.hasOwn(pawn, 'romanceMemories'))
    || offers.some(offer => Object.hasOwn(offer, 'relationship'));
  if (!hasFields) return [];
  if (version < 195) return ['Legacy save contains future family or romance fields.'];
  const errors: string[] = [];
  try {
    const people = captureRelationshipPeople(world);
    validateRelationships(world.relationships, { tick: world.tick, nextId: world.nextId, people }, version, errors);
    for (const offer of offers) {
      if (!validAnnouncedRelationship(offer, world, version, people)) errors.push('Invalid offered human relationship.');
    }
    for (const { pawn, tick } of owners) {
      const clock = tick === world.tick ? world : { ...world, tick };
      if (!validFamilyBereavement(pawn.familyBereavement, pawn.id, version, clock, people)) errors.push('Invalid family bereavement memory.');
      if (!validRomanceMemories(pawn.romanceMemories, pawn.id, version, clock, people)) errors.push('Invalid romance memory.');
    }
  } catch { errors.push('Invalid human relationship namespace.'); }
  return errors;
}
