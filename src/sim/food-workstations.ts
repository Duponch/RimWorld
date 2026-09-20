import { isPowerActive } from './power-rules.ts';
import type { Structure } from './types.ts';

/** Physical food stations added in V84; legacy campfires/spots retain their rules. */
export const isStove=(kind:unknown):boolean=>kind==='fueled-stove'||kind==='electric-stove';
export const isFoodWorkstation=(kind:unknown):boolean=>isStove(kind)||kind==='butcher-table';
export const isButcherStation=(kind:unknown):boolean=>kind==='butcher-spot'||kind==='butcher-table';
export const usesCookingFuel=(kind:unknown):boolean=>kind==='campfire'||kind==='fueled-stove';
export const foodStationUsable=(s:Structure):boolean=>(!usesCookingFuel(s.kind)||!!s.fuel?.ticks)&&(s.kind!=='electric-stove'||isPowerActive(s));
export const butcherStationEfficiency=(s:Pick<Structure,'kind'>):number=>s.kind==='butcher-spot'?.7:1;
