/** Core interval arithmetic only. MotionRuntime remains the sole group timer. */
export const groupHashOffset256=(id:number):number=>(id^((169495093+2654435769+(id<<6)+(id>>2))|0))|0;
/** Pawn.IsHashIntervalTick(interval,delta): signed overflow precedes remainder.
 * This is not the WorldObject modulo==0 scheduling predicate. */
export function groupPawnInterval256(id:number,coreTick:number,interval:number,deltaCore:number):boolean {
 if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(coreTick)||coreTick<0||!Number.isSafeInteger(interval)||interval<1||!Number.isSafeInteger(deltaCore)||deltaCore<1||deltaCore>16)throw Error('Invalid caravan personal interval');
 return Math.abs((((coreTick|0)+groupHashOffset256(id))|0)%interval)<deltaCore;
}
/** Elapsed, never civil time: the current local tick owns precisely its ten
 * completed Core ticks, no first-tick omission and no future projection. */
export function groupCoreTicks256(localTick:number):readonly number[] {
 if(!Number.isSafeInteger(localTick)||localTick<1||localTick>Math.floor(Number.MAX_SAFE_INTEGER/10))throw Error('Invalid caravan local tick');
 const first=(localTick-1)*10+1;return Array.from({length:10},(_,i)=>first+i);
}
