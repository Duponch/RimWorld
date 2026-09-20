import { TICKS_PER_DAY, TICKS_PER_SECOND } from '../sim/types';

/** Runtime seconds at 1x. Saved local ticks and Core/local ratios stay unchanged. */
export const LOCAL_TICKS_PER_SECOND = TICKS_PER_SECOND;
const CORE_TICKS_PER_LOCAL = 60000 / TICKS_PER_DAY;
export const CORE_TICKS_PER_SECOND = LOCAL_TICKS_PER_SECOND * CORE_TICKS_PER_LOCAL;

export const localTimeSeconds = (tick:number, origin=0):number =>
  (tick-origin)/LOCAL_TICKS_PER_SECOND;

/** Subtract the local origin before converting, retaining precision in old saves. */
export const coreTimeSeconds = (tick:number, localOrigin=0):number =>
  (tick-localOrigin*CORE_TICKS_PER_LOCAL)/CORE_TICKS_PER_SECOND;
