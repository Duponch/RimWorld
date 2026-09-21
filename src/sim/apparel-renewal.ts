import { healthRandom } from './health.ts';
import type { ApparelState } from './apparel-rules.ts';

/** One local day. Calendar and PRNG streams are caller-owned and persisted. */
export const APPAREL_WEAR_INTERVAL=6000;
export const APPAREL_WEAR_CHANCE=.4;
export const APPAREL_POLICY_INTERVAL=Object.freeze({min:600,max:900});

export interface ApparelWearState {nextWearAt:number;rng:number}
export type ApparelWearCalendar=ApparelWearState;
export interface ApparelPolicyCalendar {nextPolicyAt:number;rng:number}
export interface WearableApparel {readonly id:number;readonly apparel:Pick<ApparelState,'hitPoints'>}
export interface ApparelWearChange {readonly id:number;readonly damage:number;readonly remaining:number;readonly destroyed:boolean}
export interface ApparelWearAdvance {readonly calendar:ApparelWearCalendar;readonly changes:readonly ApparelWearChange[];readonly elapsedDays:number}

const validTick=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const validRng=(n:number)=>Number.isInteger(n)&&n>=0&&n<=0xffffffff;
const randomInterval=(stream:{rng:number}):number=>APPAREL_POLICY_INTERVAL.min+Math.floor(healthRandom(stream)*(APPAREL_POLICY_INTERVAL.max-APPAREL_POLICY_INTERVAL.min+1));

export function createApparelWearCalendar(nowTick:number,rng:number):ApparelWearCalendar {
  if(!validTick(nowTick)||!validRng(rng)||!Number.isSafeInteger(nowTick+APPAREL_WEAR_INTERVAL))throw new RangeError('Invalid apparel wear calendar');
  return {nextWearAt:nowTick+APPAREL_WEAR_INTERVAL,rng};
}
export function createApparelPolicyCalendar(nowTick:number,rng:number):ApparelPolicyCalendar {
  if(!validTick(nowTick)||!validRng(rng))throw new RangeError('Invalid apparel policy calendar');
  const stream={rng},nextPolicyAt=nowTick+randomInterval(stream);
  if(!Number.isSafeInteger(nextPolicyAt))throw new RangeError('Invalid apparel policy calendar');
  return {nextPolicyAt,rng:stream.rng};
}

/** Replays every elapsed daily pulse in stable item-id order. It never mutates
 * the supplied apparel, so an adapter can prevalidate all destructions first. */
export function advanceApparelWear(calendar:ApparelWearCalendar,nowTick:number,worn:readonly WearableApparel[]):ApparelWearAdvance {
  if(!calendar||!validTick(calendar.nextWearAt)||!validRng(calendar.rng)||!validTick(nowTick))throw new RangeError('Invalid apparel wear advance');
  const ids=new Set<number>(),remaining=new Map<number,number>();
  for(const p of worn){if(!Number.isSafeInteger(p.id)||p.id<=0||ids.has(p.id)||!Number.isSafeInteger(p.apparel.hitPoints)||p.apparel.hitPoints<=0)throw new RangeError('Invalid worn apparel');ids.add(p.id);remaining.set(p.id,p.apparel.hitPoints);}
  const elapsed=nowTick<calendar.nextWearAt?0:Math.floor((nowTick-calendar.nextWearAt)/APPAREL_WEAR_INTERVAL)+1;
  if(elapsed>1_000_000)throw new RangeError('Apparel wear replay exceeds bound');
  const stream={rng:calendar.rng},ordered=[...remaining.keys()].sort((a,b)=>a-b),damage=new Map<number,number>();
  for(let day=0;day<elapsed;day++)for(const id of ordered){const hp=remaining.get(id)!;if(hp>0&&healthRandom(stream)<APPAREL_WEAR_CHANCE){remaining.set(id,hp-1);damage.set(id,(damage.get(id)??0)+1);}}
  const nextWearAt=calendar.nextWearAt+elapsed*APPAREL_WEAR_INTERVAL;
  if(!Number.isSafeInteger(nextWearAt))throw new RangeError('Invalid apparel wear calendar');
  return {calendar:{nextWearAt,rng:stream.rng},elapsedDays:elapsed,changes:[...damage].map(([id,n])=>({id,damage:n,remaining:remaining.get(id)!,destroyed:remaining.get(id)===0}))};
}

/** Returns how many persisted policy checks became due. Selection itself is
 * pure and lives in apparel-policy.ts; the stream only schedules future checks. */
export function advanceApparelPolicyCalendar(calendar:ApparelPolicyCalendar,nowTick:number):Readonly<{calendar:ApparelPolicyCalendar;checks:number}> {
  if(!calendar||!validTick(calendar.nextPolicyAt)||!validRng(calendar.rng)||!validTick(nowTick))throw new RangeError('Invalid apparel policy advance');
  const stream={rng:calendar.rng};let next=calendar.nextPolicyAt,checks=0;
  while(next<=nowTick){if(++checks>1_000_000)throw new RangeError('Apparel policy replay exceeds bound');next+=randomInterval(stream);if(!Number.isSafeInteger(next))throw new RangeError('Invalid apparel policy calendar');}
  return {calendar:{nextPolicyAt:next,rng:stream.rng},checks};
}
