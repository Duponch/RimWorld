import {expect,test} from 'vitest';
import {coupleSeed285,coupleClockDraft285,coupleRandom285,coupleNormal285,coupleOpportunityRoll285,coupleCheckDue285} from '../src/sim/couple-random-285.ts';
import type {CoupleClock285} from '../src/sim/couple-state-285.ts';

test('personal seeds are deterministic nonzero uint32 values, with distinct owner and high-ID words',()=>{
 for(const [seed,id]of [[0,1],[0xffffffff,1],[42,7],[42,4294967303],[0xffffffff,Number.MAX_SAFE_INTEGER]]as const){
  const value=coupleSeed285(seed,id);expect(Number.isInteger(value)).toBe(true);expect(value).toBeGreaterThan(0);expect(value).toBeLessThan(4294967296);expect(coupleSeed285(seed,id)).toBe(value);
 }
 expect(coupleSeed285(42,7)).not.toBe(coupleSeed285(42,8));expect(coupleSeed285(42,7)).not.toBe(coupleSeed285(43,7));expect(coupleSeed285(42,7)).not.toBe(coupleSeed285(42,4294967303));
 for(const [seed,id]of [[-1,1],[4294967296,1],[NaN,1],[1,0],[1,1.5],[1,Number.MAX_SAFE_INTEGER+1]]as const)expect(()=>coupleSeed285(seed,id)).toThrow(RangeError);
});

test('draft creation preserves existing literal clocks and leaves a frozen owner untouched, including absent timestamps',()=>{
 const fresh=coupleClockDraft285(42,7);expect(fresh).toEqual({revision:1,rng:coupleSeed285(42,7)});expect(Object.hasOwn(fresh,'lastAttemptAtCore')).toBe(false);expect(Object.hasOwn(fresh,'nextAllowedAtCore')).toBe(false);
 const old:CoupleClock285=Object.freeze({revision:1,rng:123,lastAttemptAtCore:0,nextAllowedAtCore:9876}),before=JSON.stringify(old),draft=coupleClockDraft285(999,7,old);
 expect(draft).toEqual(old);expect(draft).not.toBe(old);coupleRandom285(draft);expect(draft.rng).not.toBe(old.rng);expect(JSON.stringify(old)).toBe(before);expect(draft.lastAttemptAtCore).toBe(0);expect(draft.nextAllowedAtCore).toBe(9876);
 expect(coupleClockDraft285(42,7,JSON.parse(JSON.stringify(fresh)))).toEqual(fresh);
});

test('personal xorshift follows known uint32 vectors and saved continuation without mutating timestamps',()=>{
 const clock:CoupleClock285={revision:1,rng:1,lastAttemptAtCore:1234,nextAllowedAtCore:9999};
 expect(coupleRandom285(clock)).toBe(270369/4294967296);expect(clock.rng).toBe(270369);
 const loaded=JSON.parse(JSON.stringify(clock)) as CoupleClock285;
 expect(coupleRandom285(clock)).toBe(67634689/4294967296);expect(coupleRandom285(loaded)).toBe(67634689/4294967296);
 expect(coupleRandom285(clock)).toBe(2647435461/4294967296);expect(coupleRandom285(loaded)).toBe(2647435461/4294967296);
 expect(clock.lastAttemptAtCore).toBe(1234);expect(clock.nextAllowedAtCore).toBe(9999);
});

test('each normal uses exactly two draws with no cache or retry, and is reproducible after JSON reload',()=>{
 const clock:CoupleClock285={revision:1,rng:1},twoDraws:CoupleClock285={revision:1,rng:1};
 const radius=coupleRandom285(twoDraws),angle=coupleRandom285(twoDraws),expected=Math.sqrt(-2*Math.log(radius))*Math.cos(2*Math.PI*angle);
 expect(coupleNormal285(clock)).toBe(expected);expect(clock.rng).toBe(67634689);
 const loaded=JSON.parse(JSON.stringify(clock)) as CoupleClock285,second=coupleNormal285(clock);expect(Number.isFinite(second)).toBe(true);expect(coupleNormal285(loaded)).toBe(second);
 coupleRandom285(twoDraws);coupleRandom285(twoDraws);expect(clock.rng).toBe(twoDraws.rng);
});

test('temporary opportunities are stable within a person/hour without consuming any saved personal state',()=>{
 const clock=Object.freeze(coupleClockDraft285(42,7)),before=JSON.stringify(clock),a=coupleOpportunityRoll285(42,7,0);
 expect(a).toBeGreaterThan(0);expect(a).toBeLessThan(1);expect(coupleOpportunityRoll285(42,7,2499)).toBe(a);expect(coupleOpportunityRoll285(42,7,2500)).not.toBe(a);
 expect(coupleOpportunityRoll285(42,8,0)).not.toBe(a);expect(coupleOpportunityRoll285(43,7,0)).not.toBe(a);expect(coupleOpportunityRoll285(42,7,Number.MAX_SAFE_INTEGER)).toBe(coupleOpportunityRoll285(42,7,Number.MAX_SAFE_INTEGER));
 expect(JSON.stringify(clock)).toBe(before);
});

test('cadence follows2500Core since the real last check, independent of hour boundary and future cooldown',()=>{
 const clock:CoupleClock285=Object.freeze({revision:1,rng:1,lastAttemptAtCore:2490,nextAllowedAtCore:10000}),before=JSON.stringify(clock);
 expect(coupleCheckDue285(undefined,0)).toBe(true);expect(coupleCheckDue285({revision:1,rng:1},0)).toBe(true);
 expect(coupleCheckDue285(clock,2500)).toBe(false);expect(coupleCheckDue285(clock,4989)).toBe(false);expect(coupleCheckDue285(clock,4990)).toBe(true);expect(coupleCheckDue285(clock,2000)).toBe(false);
 expect(coupleCheckDue285({revision:1,rng:1,lastAttemptAtCore:0},2500)).toBe(true);expect(JSON.stringify(clock)).toBe(before);
});

test('invalid fields and accessors refuse before mutation, with no clock invented from malformed data',()=>{
 for(const old of [{revision:1,rng:0},{revision:2,rng:1},{revision:1,rng:4294967296},{revision:1,rng:1,lastAttemptAtCore:undefined},{revision:1,rng:1,nextAllowedAtCore:-1},{revision:1,rng:1,extra:0}]){
  const before=JSON.stringify(old);expect(()=>coupleClockDraft285(1,1,old as CoupleClock285)).toThrow(RangeError);expect(JSON.stringify(old)).toBe(before);
 }
 let reads=0;const accessor={revision:1};Object.defineProperty(accessor,'rng',{enumerable:true,get(){reads++;return 1;}});
 expect(()=>coupleClockDraft285(1,1,accessor as CoupleClock285)).toThrow(RangeError);expect(reads).toBe(0);
 const frozen:CoupleClock285=Object.freeze({revision:1,rng:1});expect(()=>coupleNormal285(frozen)).toThrow(RangeError);expect(frozen.rng).toBe(1);
 for(const at of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){expect(()=>coupleCheckDue285(undefined,at)).toThrow(RangeError);expect(()=>coupleOpportunityRoll285(1,1,at)).toThrow(RangeError);}
});
