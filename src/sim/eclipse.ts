import { checkpointPlantGrowth } from './plant-lighting.ts';
import type { World } from './types.ts';

export interface EclipseInterval {start:number;end:number}
export type EclipseWorld=Pick<World,'tick'>&Partial<Pick<World,'miscIncidents'>>;
/** Core GameCondition_NoSunlight: 200 Core ticks, at ten Core ticks per local tick.
 * Its SkyTarget glow is zero; SkyTarget.LerpDarken interpolates from base glow.
 * Core Incidents_World_Conditions.xml: durationDays 0.75~1.25. */
export const ECLIPSE_TRANSITION_TICKS=20;
export const ECLIPSE_MIN_DURATION=4500;
export const ECLIPSE_MAX_DURATION=7500;

export function activeEclipse(world:EclipseWorld,tick=world.tick):EclipseInterval|undefined {
  const interval=world.miscIncidents?.weather?.eclipse;
  return interval&&tick>=interval.start&&tick<interval.end?interval:undefined;
}

export function eclipseLightFactor(world:EclipseWorld,tick=world.tick):number {
  const interval=activeEclipse(world,tick);
  return interval?1-Math.max(0,Math.min(1,(tick-interval.start)/ECLIPSE_TRANSITION_TICKS,
    (interval.end-tick)/ECLIPSE_TRANSITION_TICKS)):1;
}

/** Boundary producer only: call BEFORE installing or removing the interval.
 * This retains acquired growth while the integral's temporary loss table can
 * be discarded. Artificial light keeps its independent integral unchanged. */
export function checkpointEclipseGrowth(world:World):void {
  for(const plant of world.resources)checkpointPlantGrowth(world,plant);
}
