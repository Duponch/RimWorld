import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import type {World} from './types.ts';

/** A condition belongs to this local map's existing Misc calendar. It never
 * travels with a person or with the camera. All times ending in Core use the
 * campaign's native 60,000 ticks/day; ordinary incident starts are local steps. */
export interface ToxicFalloutActive294 {
  startCore:number;
  /** Native condition expiration is strict: the final Core tick is active. */
  endCore:number;
  /** Private prospective environmental stream, independent of campaign RNG. */
  rng:number;
  /** Position in the bounded full-cycle cell permutation. */
  cursor:number;
}
export interface ToxicFalloutCalendar294 {
  adoptedAt:number;
  count:number;
  lastStart?:number;
  active?:ToxicFalloutActive294;
}
export const TOXIC_FALLOUT_FIRST_DAY294=60;
export const TOXIC_FALLOUT_COOLDOWN_DAYS294=90;
export const TOXIC_FALLOUT_MIN_CORE294=150000;
export const TOXIC_FALLOUT_MAX_CORE294=630000;
export const TOXIC_FALLOUT_DOSE_INTERVAL294=3451;

/** No time filtering here: the clinical adapter also needs the last partial
 * interval when the native end falls between two local simulation steps. */
export function getToxicFallout294(world:Pick<World,'miscIncidents'>&{schemaVersion?:number}):ToxicFalloutActive294|undefined {
  return (world.schemaVersion===294||(Number(world.schemaVersion)===295||(Number(world.schemaVersion)===296||isCorePhysicalSchema297(Number(world.schemaVersion)))))?world.miscIncidents?.toxicFallout?.active:undefined;
}
export function toxicFalloutActive294(world:Pick<World,'tick'|'miscIncidents'>&{schemaVersion?:number},atCore=world.tick*10):boolean {
  const active=getToxicFallout294(world);
  return !!active&&atCore>=active.startCore&&atCore<=active.endCore;
}

/** Native float multiplication before CeilToInt: 10,000 cells produces
 * 6.000000476837158 in single precision, hence seven visits, not six. */
export function toxicFalloutCellsPerCore294(area:number):number {
  if(!Number.isSafeInteger(area)||area<1)throw Error('Invalid fallout map area');
  return Math.ceil(Math.fround(Math.fround(area)*Math.fround(.0006)));
}
