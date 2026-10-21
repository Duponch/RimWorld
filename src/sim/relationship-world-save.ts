import { captureHumanOwners,type HumanOwnershipCapture } from './human-owners.ts';
import type { Pawn, World } from './types.ts';
import { validAnnouncedRelationship, validateRelationships } from './relationship-save.ts';
import { validFamilyBereavement } from './family-bereavement-save.ts';
import { validRomanceMemories } from './romance-memories.ts';

/** One complete context check after human owner/ID validation. Frozen records
 * retain their own clock. No generation, recursive World validation or mutation. */
export function validateRelationshipWorld(world: World, version: number): string[] {
  return validateRelationshipWorldForSnapshot(world,version,()=>captureHumanOwners(world));
}

/** @internal Fixed Decoder consumers only. Public/RAW callers capture afresh. */
export function validateRelationshipWorldForSnapshot(world:World,version:number,readOwners:()=>HumanOwnershipCapture):string[] {
  let owners: {pawn:Pawn;tick:number;civilTick:number}[];
  try {owners=readOwners().pawnOwners.map(slot=>({pawn:slot.pawn!,tick:slot.validationTick,civilTick:slot.kind==='player-casket'?world.tick:slot.validationTick}));}
  catch {return ['Invalid human relationship namespace.'];}
  const offers = [...(world.arrivals?.pending ? [world.arrivals.pending] : []), ...(world.quests?.entries ?? [])];
  const hasFields = Object.hasOwn(world, 'relationships')
    || owners.some(({ pawn }) => Object.hasOwn(pawn, 'familyBereavement') || Object.hasOwn(pawn, 'romanceMemories'))
    || offers.some(offer => Object.hasOwn(offer, 'relationship'));
  if (!hasFields) return [];
  if (version < 195) return ['Legacy save contains future family or romance fields.'];
  const errors: string[] = [];
  try {
    const people = readOwners().people;
    validateRelationships(world.relationships, { tick: world.tick, nextId: world.nextId, people }, version, errors);
    for (const offer of offers) {
      if (!validAnnouncedRelationship(offer, world, version, people)) errors.push('Invalid offered human relationship.');
    }
    for (const { pawn, tick, civilTick } of owners) {
      if (!validFamilyBereavement(pawn.familyBereavement, pawn.id, version, world, people,tick,civilTick)) errors.push('Invalid family bereavement memory.');
      if (!validRomanceMemories(pawn.romanceMemories, pawn.id, version, world, people,tick,civilTick)) errors.push('Invalid romance memory.');
    }
  } catch { errors.push('Invalid human relationship namespace.'); }
  return errors;
}
