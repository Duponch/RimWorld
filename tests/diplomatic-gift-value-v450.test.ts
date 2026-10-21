import {expect,test} from 'vitest';
import {diplomaticGiftGain274,diplomaticGiftGainFromBase274} from '../src/sim/diplomatic-gift-value-274.ts';

test.each([
 [0,0,0],[0,40,0],[0,41,1],[0,80,1],[0,81,2],[0,400,9],[0,1000,22],
 [50,80,0],[50,81,1],[50,400,4],
 [75,159.99998,0],[75,160,1],[75,400,2],[75,1000,6],
 [100,160,1],[100,1000,6],
] as const)('goodwill%s, unrounded SELL value%s requests%s, before faction effects',(goodwill,value,expected)=>{
 expect(diplomaticGiftGain274(goodwill,value)).toBe(expected);
});

test('native Float32 conversion and final truncation stay distinct from silver or label rounding',()=>{
 // At75 the factor is exactly1/4. The first basket rounds to160 in Float32;
 // the next remains below it. Neither value is rounded to whole silver first.
 expect(diplomaticGiftGain274(75,160-.000001)).toBe(1);
 expect(diplomaticGiftGain274(75,160-.00002)).toBe(0);
 expect(diplomaticGiftGain274(75,159.6)).toBe(0);
 // Displaying or rounding the requested amount must not turn a sub-unit gift
 // into goodwill. The transaction may still transfer this positive basket.
 expect(diplomaticGiftGain274(0,40)).toBe(0);
});

test.each([-100,0,75,100])('requested gain at%s remains bounded even for a huge basket',goodwill=>{
 expect(diplomaticGiftGain274(goodwill,32000)).toBe(200);
 expect(diplomaticGiftGain274(goodwill,1e12)).toBe(200);
 // Saturation of the actual relation is deliberately applied elsewhere:
 // an already100 faction still has a positive requested gift gain.
 expect(diplomaticGiftGain274(100,160)).toBe(1);
});

test('invalid scalar inputs do not request goodwill',()=>{
 for(const goodwill of [NaN,Infinity,-Infinity,-101,101,.5])expect(diplomaticGiftGain274(goodwill,400)).toBe(0);
 for(const value of [NaN,Infinity,-Infinity,-1])expect(diplomaticGiftGain274(0,value)).toBe(0);
});

test('the Core constant-factor branch provides an analytic oracle for per-line Float32 aggregation',()=>{
 const f=Math.fround;
 // Two legal unrounded unit SELL prices,0.01 and79.99, each count2. Native
 // FactionGiftUtility divides each amount by40 BEFORE adding the raw gains.
 const first=f(f(.01)*2),second=f(f(79.99)*2);
 const base=f(f(first/40)+f(second/40));
 expect(base).toBe(3.999999761581421);
 // DiplomacyTuning's curve is constant1/4 at goodwill>=75. Fifteen complete
 // quarters add15/16; the last fraction leaves0.9999999403953552, truncated0.
 // This fixed-point branch's expected result is independent of our curve loop.
 expect(diplomaticGiftGainFromBase274(75,base)).toBe(0);
 expect(diplomaticGiftGain274(75,f(first+second))).toBe(1);
 expect(diplomaticGiftGainFromBase274(75,4)).toBe(1);
});

test.each([75,100])('the constant-factor branch at%s matches the exact Core quarter formula up to saturation',goodwill=>{
 // At and above75, Core's curve stays1/4 throughout the gift. Each complete
 // quarter adds exactly1/16; its remaining fraction is scaled by1/4 as well.
 const f=Math.fround;
 for(const base of [0,.125,3.999999761581421,4,799,799.999,800,1e12]){
  const raw=f(base),quarters=Math.floor(raw*4),remainder=raw-quarters*.25;
  const exactQuarterFormula=Math.trunc(Math.min(200,f(quarters*.0625+f(remainder*.25))));
  expect(diplomaticGiftGainFromBase274(goodwill,base)).toBe(exactQuarterFormula);
 }
 expect(diplomaticGiftGainFromBase274(goodwill,799.999)).toBe(199);
 expect(diplomaticGiftGainFromBase274(goodwill,800)).toBe(200);
});

test('pre-aggregated base uses the same native post-processing and scalar admission',()=>{
 for(const goodwill of [-100,0,50,75,100]){
  expect(diplomaticGiftGainFromBase274(goodwill,25)).toBe(diplomaticGiftGain274(goodwill,1000));
  expect(diplomaticGiftGainFromBase274(goodwill,800)).toBe(200);
  expect(diplomaticGiftGainFromBase274(goodwill,1e12)).toBe(200);
 }
 for(const value of [NaN,Infinity,-Infinity,-1])expect(diplomaticGiftGainFromBase274(0,value)).toBe(0);
 for(const goodwill of [NaN,Infinity,-101,101,.5])expect(diplomaticGiftGainFromBase274(goodwill,10)).toBe(0);
});
