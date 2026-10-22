import type {CoupleClock285} from './couple-state-285.ts';

const uintRange=4294967296;
const safeCore=(value:number)=>Number.isSafeInteger(value)&&value>=0;
const uint=(value:number)=>Number.isInteger(value)&&value>=0&&value<uintRange;
function assertInputs(worldSeed:number,pawnId:number):void {
 if(!uint(worldSeed)||!Number.isSafeInteger(pawnId)||pawnId<1)throw new RangeError('Invalid couple random owner');
}
function assertClock(clock:CoupleClock285):void {
 if(!clock||typeof clock!=='object'||Object.getPrototypeOf(clock)!==Object.prototype)throw new RangeError('Invalid couple clock');
 const keys=Reflect.ownKeys(clock);
 if(!Object.hasOwn(clock,'revision')||!Object.hasOwn(clock,'rng')||keys.some(key=>{
  if(typeof key!=='string'||!['revision','rng','lastAttemptAtCore','nextAllowedAtCore'].includes(key))return true;
  const d=Object.getOwnPropertyDescriptor(clock,key);return !d||!d.enumerable||!Object.hasOwn(d,'value');
 }))throw new RangeError('Invalid couple clock fields');
 if(clock.revision!==1||!uint(clock.rng)||clock.rng===0
  ||Object.hasOwn(clock,'lastAttemptAtCore')&&!safeCore(clock.lastAttemptAtCore!)
  ||Object.hasOwn(clock,'nextAllowedAtCore')&&!safeCore(clock.nextAllowedAtCore!))throw new RangeError('Invalid couple clock values');
}
function scramble(value:number):number {
 let word=value>>>0;word=Math.imul(word^(word>>>16),0x7feb352d);word=Math.imul(word^(word>>>15),0x846ca68b);
 return (word^(word>>>16))>>>0;
}
/** Original deterministic personal namespace. Both words of a safe integer
 * ID participate; a high ID never silently becomes its truncated low word. */
export function coupleSeed285(worldSeed:number,pawnId:number):number {
 assertInputs(worldSeed,pawnId);
 const low=pawnId>>>0,high=Math.floor(pawnId/uintRange);
 return scramble(worldSeed^Math.imul(low,0x9e3779b1)^Math.imul(high,0x85ebca6b)^0x71e5a9d3)||1;
}

/** A prospective private draft, never an adopter called by load or a reader.
 * Existing deadlines and their literal absence are preserved unchanged. */
export function coupleClockDraft285(worldSeed:number,pawnId:number,old?:CoupleClock285):CoupleClock285 {
 assertInputs(worldSeed,pawnId);
 if(old===undefined)return {revision:1,rng:coupleSeed285(worldSeed,pawnId)};
 assertClock(old);
 return {revision:1,rng:old.rng,
  ...Object.hasOwn(old,'lastAttemptAtCore')?{lastAttemptAtCore:old.lastAttemptAtCore!}:{},
  ...Object.hasOwn(old,'nextAllowedAtCore')?{nextAllowedAtCore:old.nextAllowedAtCore!}:{}};
}

/** Saved personal xorshift32. This mutation touches only the supplied draft's
 * RNG; no world, social stream, deadline or cached random value is captured. */
export function coupleRandom285(clock:CoupleClock285):number {
 assertClock(clock);
 if(Object.getOwnPropertyDescriptor(clock,'rng')?.writable!==true)throw new RangeError('Couple random draft is immutable');
 let word=clock.rng;word^=word<<13;word^=word>>>17;word^=word<<5;clock.rng=word>>>0;
 return clock.rng/uintRange;
}

/** Exactly two personal draws, no cached second normal and no retry. Nonzero
 * xorshift states make the logarithm's uniform argument strictly positive. */
export function coupleNormal285(clock:CoupleClock285):number {
 const radius=coupleRandom285(clock),angle=coupleRandom285(clock);
 return Math.sqrt(-2*Math.log(radius))*Math.cos(2*Math.PI*angle);
}

/** Original temporary person/hour stream. Its one local comparison draw is
 * deliberately distinct from Core Rand's rare two-draw MTB thinning. */
export function coupleOpportunityRoll285(worldSeed:number,pawnId:number,atCore:number):number {
 const personal=coupleSeed285(worldSeed,pawnId);if(!safeCore(atCore))throw new RangeError('Invalid couple opportunity date');
 const hour=Math.floor(atCore/2500),low=hour>>>0,high=Math.floor(hour/uintRange);
 const rng=scramble(personal^Math.imul(low,0xc2b2ae35)^Math.imul(high,0x27d4eb2f)^0x4c6f7669)||1;
 return coupleRandom285({revision:1,rng});
}

/** Cadence belongs to the last actual check, not an hour bucket or cooldown.
 * The caller records the attempt before partner/MTB/giver admission. */
export function coupleCheckDue285(clock:CoupleClock285|undefined,atCore:number):boolean {
 if(!safeCore(atCore))throw new RangeError('Invalid couple check date');
 if(clock===undefined)return true;
 assertClock(clock);
 return clock.lastAttemptAtCore===undefined||atCore-clock.lastAttemptAtCore>=2500;
}
