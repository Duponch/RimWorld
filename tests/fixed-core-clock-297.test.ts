import {expect,test} from 'vitest';
import {FixedCoreClock297} from '../src/bridge/fixed-core-clock-297';

const drain=(clock:FixedCoreClock297)=>{let count=0;while(clock.consume())count++;return count;};
test.each([0,1,3,6])('one wall second at speed%s produces only actual debited Core credits',speed=>{
 const clock=new FixedCoreClock297();clock.reset(0);let played=0;
 for(let now=20;now<=1000;now+=20){const reserved=clock.reserve(now,speed);const consumed=drain(clock);expect(consumed).toBe(reserved);played+=consumed;}
 expect(played).toBe(speed*60);expect(clock.consume()).toBe(false);
});
test('a long wall stall caps its acquisition at250ms, never a full old-speed catch-up',()=>{
 const clock=new FixedCoreClock297();clock.reset(0);
 expect(clock.reserve(10000,6)).toBe(90);expect(drain(clock)).toBe(90);
 expect(clock.reserve(10000,6)).toBe(0);expect(clock.consume()).toBe(false);
});
test('a speed cancellation keeps sampled fractional credit, discards unplayed whole credit, and acquires no late wall interval',()=>{
 const clock=new FixedCoreClock297();clock.reset(0);
 expect(clock.reserve(20,1)).toBe(1);expect(clock.consume()).toBe(true);
 expect(clock.reserve(120,1)).toBe(6);expect(clock.consume()).toBe(true);
 clock.cancelUnplayed(1000);expect(clock.consume()).toBe(false);
 expect(clock.reserve(1000,1)).toBe(0);
 expect(clock.reserve(1013.4,1)).toBe(1);expect(drain(clock)).toBe(1);
});
test('backward wall timestamps cannot create or repay time and reset clears all old credits',()=>{
 const clock=new FixedCoreClock297();clock.reset(100);
 expect(clock.reserve(80,1)).toBe(0);expect(clock.reserve(110,1)).toBe(0);
 expect(clock.reserve(120,1)).toBe(1);expect(drain(clock)).toBe(1);
 clock.reset(120);expect(clock.reserve(120,6)).toBe(0);
 expect(clock.reserve(130,1)).toBe(0);
});
test('one active reservation cannot be overwritten, and invalid input leaves its earlier earned credit usable',()=>{
 const clock=new FixedCoreClock297();clock.reset(0);
 expect(clock.reserve(20,1)).toBe(1);
 expect(()=>clock.reserve(21,1)).toThrow('already active');expect(clock.consume()).toBe(true);
 expect(()=>clock.reserve(NaN,1)).toThrow();expect(()=>clock.reserve(30,-1)).toThrow();
 expect(clock.reserve(40,1)).toBe(1);expect(drain(clock)).toBe(1);
});
