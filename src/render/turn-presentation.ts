import { TICKS_PER_SECOND } from '../sim/types';

/** Cosmetic heading only. Translation continues to use the confirmed edge. */
export const TURN_SECONDS = 0.24;
export const TURN_TICKS = TURN_SECONDS * TICKS_PER_SECOND;

export interface TurnHeading { from:number; to:number; startTick:number }

export function headingAt(turn:TurnHeading,tick:number):number {
  const alpha=Math.max(0,Math.min(1,(tick-turn.startTick)/TURN_TICKS));
  return turn.from+(turn.to-turn.from)*alpha;
}

/** Keep equivalent angles adjacent so a reversal takes the shorter half turn. */
export function turnToward(previous:TurnHeading|undefined,target:number,tick:number):TurnHeading {
  if(!previous)return {from:target,to:target,startTick:tick};
  const difference=Math.atan2(Math.sin(target-previous.to),Math.cos(target-previous.to));
  if(Math.abs(difference)<1e-5)return previous;
  const from=headingAt(previous,tick);
  const delta=Math.atan2(Math.sin(target-from),Math.cos(target-from));
  return {from,to:from+delta,startTick:tick};
}
