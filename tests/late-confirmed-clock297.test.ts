import {expect,test} from 'vitest';
import {MotionTimeline} from '../src/render/MotionTimeline';

// NUM clock contract only. No forged World, Engine progress or Native grant.
test.each([1,3,6] as const)('a genuine silence joins36ms of confirmed history once and resumes without a second refill at x%i',speed=>{
 const t=new MotionTimeline(),rate=speed*6;
 t.adopt(100,speed,[],0,true,true,true);
 t.adopt(100+rate*.04,speed,[],40,false,true,true);
 t.advance(50);
 const latest=100+rate*.3,before=t.tick;
 t.adopt(latest,speed,[],300,false,true,true);
 expect(t.tick).toBeGreaterThan(before);expect(t.tick).toBeLessThanOrEqual(latest);
 expect((latest-t.tick)/rate).toBeCloseTo(.036,12);
 let confirmed=latest,previous=t.tick;
 // Regular20ms receipts and60Hz frames after the one actual >100ms gap.
 for(let unit=1;unit<=36;unit++){
  const now=300+unit*10/3;
  if(unit%6===0){const same=t.tick;confirmed=100+rate*now/1000;t.adopt(confirmed,speed,[],now,false,true,true);expect(t.tick).toBe(same);}
  if(unit%5===0){const shown=t.advance(now);expect(shown).toBeLessThanOrEqual(confirmed);expect(shown-previous).toBeCloseTo(rate/60,10);previous=shown;}
 }
 t.adopt(confirmed,0,[],421,false,true,true);
 expect(t.tick).toBe(confirmed);expect(t.advance(100000)).toBe(confirmed);
});

// One actually received Core remains presentable even if no second packet comes.
test.each([1,3,6] as const)('a lone confirmed Core is released after bounded silence at startup and resume x%i',speed=>{
 for(const resumed of [false,true]){
  const t=new MotionTimeline();t.adopt(100,speed,[],0,true,true,true);
  if(resumed){t.adopt(100,0,[],5,false,true,true);t.adopt(100,speed,[],10,false,true,true);}
  t.adopt(100.1,speed,[],20,false,true,true);expect(t.tick).toBe(100);
  expect(t.advance(40)).toBe(100);
  expect(t.advance(200)).toBe(100.1);expect(t.advance(5000)).toBe(100.1);
  t.adopt(100.1,0,[],5001,false,true,true);expect(t.advance(100000)).toBe(100.1);
 }
});
