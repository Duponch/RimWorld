import { TICKS_PER_DAY, type Cell, type Pawn, type World } from './types.ts';

import { pawnBody } from './health-rules.ts';

export const RECREATION_KINDS = ['solitary', 'dexterity'] as const;
export type RecreationKind = typeof RECREATION_KINDS[number];
export type RecreationActivity = 'skygaze' | 'horseshoes';
export interface RecreationTask { activity: RecreationActivity; target: Cell; buildingId: number | null; phase: 'travel' | 'active'; elapsed: number }
export interface RecreationNeed { level: number; tolerance: Record<RecreationKind, number>; bored: Record<RecreationKind, boolean>; task: RecreationTask | null }
export const RECREATION_DURATION = 400;
export const RECREATION_GAIN = 36 * 24 / TICKS_PER_DAY;
// Extremely low expectations. Wealth-derived expectations await the economy.
export const TOLERANCE_FALL = 18 / TICKS_PER_DAY;
export const recreationKind = (activity: RecreationActivity): RecreationKind => activity === 'horseshoes' ? 'dexterity' : 'solitary';
export const initialRecreation = (level = 55): RecreationNeed => ({level, tolerance: {solitary: 0, dexterity: 0}, bored: {solitary: false, dexterity: false}, task: null});

export function updateRecreation(pawn: Pawn,body?:import('./body-capacities.ts').BodyAssessment,toleranceFall=TOLERANCE_FALL): void {
  if (pawn.mental?.crisis||pawn.state === 'sleeping'||pawn.state==='dead'||pawn.medicalSleep||pawn.health&&(body??pawnBody(pawn)).capacities.consciousness<.3) return;
  const joy = pawn.recreation;
  for (const kind of RECREATION_KINDS) {
    joy.tolerance[kind] = Math.max(0, joy.tolerance[kind] - toleranceFall);
    if (joy.tolerance[kind] < 30) joy.bored[kind] = false;
  }
  if (pawn.state !== 'recreating' || joy.task?.phase !== 'active') {
    const factor = joy.level < 1 ? 1 : joy.level < 15 ? .4 : joy.level < 30 ? .7 : 1;
    joy.level = Math.max(0, joy.level - 60 / TICKS_PER_DAY * factor);
  }
}
export function gainRecreation(joy: RecreationNeed, kind: RecreationKind, amount = RECREATION_GAIN): number {
  const gained = Math.min(100 - joy.level, Math.max(0, amount) * (1 - joy.tolerance[kind] / 100));
  joy.level += gained;
  joy.tolerance[kind] = Math.min(100, joy.tolerance[kind] + gained * .65);
  if (joy.tolerance[kind] > 50) joy.bored[kind] = true;
  return gained;
}
export const recreationMood = (level: number): number => level < 1 ? -20 : level < 15 ? -10 : level < 30 ? -5 : level < 70 ? 0 : level < 85 ? 5 : 10;

/** Serialized simulation RNG, consumed only for a real recreation decision. */
export function recreationRandom(world: World): number {
  let value = world.rng; value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  world.rng = value >>> 0; return world.rng / 0x100000000;
}
