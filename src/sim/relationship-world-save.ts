import { captureHumanOwners,type HumanOwnershipCapture } from './human-owners.ts';
import type { Pawn, World } from './types.ts';
import { validAnnouncedRelationship, validateRelationships } from './relationship-save.ts';
import { validFamilyBereavement } from './family-bereavement-save.ts';
import { validRomanceMemories } from './romance-memories.ts';
import {captureCoupleMapContext285,validCouplePawnContext285} from './couple-save-285.ts';
import {hasCoupleFields285} from './couple-owner-save-285.ts';

/** One complete context check after human owner/ID validation. Frozen records
 * retain their own clock. No generation, recursive World validation or mutation. */
export function validateRelationshipWorld(world: World, version: number): string[] {
  return validateRelationshipWorldForSnapshot(world,version,()=>captureHumanOwners(world));
}

/** @internal Fixed Decoder consumers only. Public/RAW callers capture afresh. */
export function validateRelationshipWorldForSnapshot(world:World,version:number,readOwners:()=>HumanOwnershipCapture):string[] {
  let owners: {pawn:Pawn;tick:number;civilTick:number;local:boolean}[];
  try {owners=readOwners().pawnOwners.map(slot=>({pawn:slot.pawn!,tick:slot.validationTick,civilTick:slot.kind==='player-casket'||slot.kind==='ship-casket'?world.tick:slot.validationTick,local:slot.kind==='map'}));}
  catch {return ['Invalid human relationship namespace.'];}
  const offers = [...(world.arrivals?.pending ? [world.arrivals.pending] : []), ...(world.quests?.entries ?? [])];
  const hasFields = Object.hasOwn(world, 'relationships')
    || owners.some(({ pawn }) => Object.hasOwn(pawn, 'familyBereavement') || Object.hasOwn(pawn, 'romanceMemories')||hasCoupleFields285(pawn))
    || offers.some(offer => Object.hasOwn(offer, 'relationship'));
  if (!hasFields) return [];
  if (version < 195) return ['Legacy save contains future family or romance fields.'];
  const errors: string[] = [];
  try {
    const people = readOwners().people;
    const knownHumanIds=owners.some(o=>hasCoupleFields285(o.pawn))?new Set(people.keys()):undefined,
      map=owners.some(o=>o.local&&'coupleTask285'in o.pawn)?captureCoupleMapContext285(world):undefined;
    validateRelationships(world.relationships, { tick: world.tick, nextId: world.nextId, people }, version, errors);
    for (const offer of offers) {
      if (!validAnnouncedRelationship(offer, world, version, people)) errors.push('Invalid offered human relationship.');
    }
    for (const { pawn, tick, civilTick, local } of owners) {
      if (!validFamilyBereavement(pawn.familyBereavement, pawn.id, version, world, people,tick,civilTick)) errors.push('Invalid family bereavement memory.');
      if (!validRomanceMemories(pawn.romanceMemories, pawn.id, version, world, people,tick,civilTick)) errors.push('Invalid romance memory.');
      if(knownHumanIds&&hasCoupleFields285(pawn)&&!validCouplePawnContext285(pawn,{version,tick,civilTick,nextId:world.nextId,knownHumanIds,...local&&map?{map}:{}}))errors.push('Invalid actual couple task, clock or partner memory.');
    }
  } catch { errors.push('Invalid human relationship namespace.'); }
  return errors;
}
