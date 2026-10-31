import {expect,test} from 'vitest';
import {MotionTimeline} from '../src/render/MotionTimeline';
// Exact recorded inputs; this fixture grants no World, Native or admission authority.
import fixture from './fixtures/startup-confirmed-supply297.json';

test('the real x6 startup retains slower confirmed supply when its reserve first fills',()=>{
 // The 25 original geometric observations, including all 15 cold zeros, stay
 // explicit. A NUM clock replay cannot claim new GPU geometry or zero stutter.
 expect(fixture.walkingZeros).toHaveLength(25);
 expect(fixture.walkingZeros.filter(row=>row.windowMs>=200)).toHaveLength(10);
 expect(fixture.walkingZeros.filter(row=>row.windowMs<200)).toHaveLength(15);
 expect(fixture.measuredPair.recordedDelta).toBeCloseTo(fixture.measuredPair.nominalDelta,8);
 const clock=new MotionTimeline(),results=new Map<number,number>();let previous=11793,latest=11793;
 const holds:{index:number;at:number;after200ms:boolean;atConfirmedFront:boolean}[]=[];
 let lastAdvance: number|undefined;
 for(const call of fixture.calls){
  if(call.kind==='adopt'){
   expect(call.tick).toBeDefined();expect(call.speed).toBeDefined();expect(call.reset).toBeDefined();
   latest=Math.max(latest,call.tick!);
   clock.adopt(call.tick!,call.speed!,[],call.now,call.reset!,true,true);
  }else{
   const shown=clock.advance(call.now);
   expect(Number.isFinite(shown)).toBe(true);expect(shown).toBeGreaterThanOrEqual(previous);expect(shown).toBeLessThanOrEqual(latest);
   if(lastAdvance===shown)holds.push({index:call.index,at:call.at,after200ms:call.at-fixture.startedAt>=200,atConfirmedFront:shown===latest});
   lastAdvance=shown;
  }
  results.set(call.index,clock.tick);previous=clock.tick;
 }
 const from=results.get(fixture.measuredPair.from)!,to=results.get(fixture.measuredPair.to)!,delta=to-from;
 // This is a real recorded interval after readiness, not a private field seed.
 // Baseline spent the nominal36/s here after erasing the acquired estimate.
 expect(delta).toBeGreaterThanOrEqual(0);
 expect(delta).toBeLessThan(fixture.measuredPair.nominalDelta-1e-9);
 // A bounded trace may still exhaust history on a91.6ms publication gap. Keep
 // the residual rather than asserting zero holds or deleting cold samples.
 console.info(JSON.stringify({scope:'NUM_REPLAY_ONLY_NOT_NATIVE_OR_GPU',recordedWalkingZeros:fixture.walkingZeros.length,recordedSteadyWalkingZeros:10,observedNominalDelta:fixture.measuredPair.recordedDelta,replayedDelta:delta,replayedClockHolds:holds.length,replayedSteadyClockHolds:holds.filter(row=>row.after200ms).length,holds}));
 clock.adopt(latest,0,[],fixture.endedAt+1,false,true,true);
 expect(clock.tick).toBe(latest);expect(clock.advance(fixture.endedAt+100000)).toBe(latest);
});
