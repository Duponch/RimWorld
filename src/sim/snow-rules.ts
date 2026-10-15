/** Original phased-surface rules; not the Core spatial-noise implementation. */
export type SnowCategory = 0 | 1 | 2 | 3 | 4;
export interface SnowState {
  revision: 1;
  adoptedAt: number;
  lastTick: number;
  cursor: number;
  seed: number;
}
/** Absence is the only serialized spelling of zero depth. */
export interface SnowCell { snowDepth?: number }
export const CORE_STEPS_PER_LOCAL_TICK = 10;
export const snowCategory = (depth: number): SnowCategory => depth < .03 ? 0 : depth < .25 ? 1 : depth < .5 ? 2 : depth < .75 ? 3 : 4;
export const snowCorePathCost = (depth: number): number => depth < .25 ? 0 : depth < .5 ? 4 : depth < .75 ? 8 : 12;
export const snowTravelDelay = (depth: number): number => snowCorePathCost(depth) / CORE_STEPS_PER_LOCAL_TICK;
export const snowSearchCost = (depth: number): number => Math.round(snowTravelDelay(depth) / 3 * 1000);
export const snowMeltPerVisit = (temperature: number): number => temperature <= 0 ? 0 : temperature < 10 ? .00058 * temperature * temperature : .0058 * temperature;
export const snowVisitsPerLocalTick = (area: number): number => CORE_STEPS_PER_LOCAL_TICK * Math.ceil(area * .0006);
export const snowAllowsWildRegrowth = (depth: number): boolean => depth < .2;
/** This predicate adds ONLY the depth gate; growth, leaflessness and nutrition
 * remain with the plant authority. Trees bypass this particular depth gate. */
export const snowAllowsPlantFood = (depth: number, isTree: boolean, hideAt: number): boolean => isTree || depth <= hideAt;
export const snowClearingWanted = (depth: number): boolean => depth >= .2;
/** Deliberate clone adaptation to the Core nullable-sand anomaly. */
export const snowClearingWorkCore = (depth: number): number => 50 * depth;
export const compactedSnowDepth = (depth: number, bodySize: number): number => bodySize > .9 ? Math.max(0, depth - .001) : depth;
export const clampSnowDepth = (depth: number): number => Math.max(0, Math.min(1, depth));

export const SNOW_SCHEMA_VERSION=239;
