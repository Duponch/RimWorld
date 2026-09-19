import type { Pawn,World } from './types.ts';

/** Different reference clocks: noise prevents voluntary sleep; a hit while
 * lying prevents lying down (including medical rest), not just sleeping. */
export interface DisturbanceState { sleepUntilCore:number; lieUntilCore:number }
export const fallingAsleepBlocked=(world:World,p:Pawn):boolean=>(p.disturbance?.lieUntilCore??0)>world.tick*10;
export const lyingBlocked=(world:World,p:Pawn):boolean=>p.state!=='downed'&&fallingAsleepBlocked(world,p);
export const sleepBlocked=(world:World,p:Pawn):boolean=>lyingBlocked(world,p)||(p.disturbance?.sleepUntilCore??0)>world.tick*10;
export function validDisturbance(value:unknown,version:number,tick:number):boolean {
  if(value===undefined)return true;
  if(version<62||!value||typeof value!=='object'||Array.isArray(value))return false;
  const d=value as Record<string,unknown>;
  return Object.keys(d).length===2&&['sleepUntilCore','lieUntilCore'].every(k=>typeof d[k]==='number'&&Number.isSafeInteger(d[k])&&(d[k] as number)>=0&&(d[k] as number)<=tick*10+(k==='sleepUntilCore'?1000:400));
}
