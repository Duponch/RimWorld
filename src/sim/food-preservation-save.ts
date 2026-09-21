import { emptySpoilage, freshRot, isPerishable, ROT_DAYS, ticksUntilRot } from './food-preservation.ts';
import { TICKS_PER_DAY, type World } from './types.ts';

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** Base shapes/items/tick have already been checked; no new state is inferred on load. */
export function validatePreservation(world: World, version: number): string[] {
  const errors: string[] = [];
  if (version < 11) {
    if (world.spoiled !== undefined || world.piles.some(p => p.rot !== undefined)) errors.push('Legacy save contains food preservation fields.');
    return errors;
  }
  const permitted=['berries','rice','simple-meal',...(version>=51?['herbal-medicine']:[]),...(version>=79?['hare-meat']:[]),...(version>=84?['potato','corn']:[]),...(version>=91?['agave-fruit','snow-hare-meat','deer-meat','muffalo-meat','gazelle-meat','dromedary-meat']:[])];
  if(!record(world.spoiled)||!['berries','rice','simple-meal'].every(k=>Object.hasOwn(world.spoiled,k))||Object.entries(world.spoiled).some(([k,n])=>!permitted.includes(k)||!Number.isSafeInteger(n)||n!<0))errors.push('Invalid cumulative food spoilage.');
  for (const pile of world.piles) {
    if(pile.kind==='corpse')continue; // Full persistent-corpse contract validates its age separately.
    if (!isPerishable(pile.item)) { if (pile.rot !== undefined) errors.push('Unexpected food age.'); continue; }
    const rot = pile.rot;
    if (!record(rot) || Object.keys(rot).length !== (rot.rate===undefined?2:3) || rot.rate!==undefined&&(version<38||typeof rot.rate!=='number'||!Number.isFinite(rot.rate)||rot.rate<0||rot.rate>=1) || !Number.isSafeInteger(rot.atTick) || rot.atTick < 0 || rot.atTick > world.tick
      || typeof rot.progress !== 'number' || !Number.isFinite(rot.progress) || rot.progress < 0 || rot.progress >= ROT_DAYS[pile.item] * TICKS_PER_DAY
      || ticksUntilRot(pile, world.tick) <= 0) errors.push('Invalid or expired food age.');
  }
  return errors;
}
export function initializePreservation(world: World): void {
  (world as unknown as {schemaVersion: number}).schemaVersion = 11; world.spoiled = emptySpoilage();
  // Prior saves did not record age. Start fresh at their existing tick, preserving
  // identities, task progress, quantities and paths; never invent retroactive losses.
  for (const pile of world.piles) Object.assign(pile, freshRot(pile.item, world.tick));
}
