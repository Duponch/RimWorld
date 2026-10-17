import {describe,it,expect} from 'vitest';
import {plantSeasonAmplitude256,plantSeasonTemperature256,plantSeasonRange256} from '../src/sim/plant-season-range-256.ts';
import {plantRegrowthMtb256} from '../src/sim/wild-plant-runtime-256.ts';
describe('seasonal plant admission and MTB facts256',()=>{
 it('uses the raw radius100 centre, piecewise equatorial distance and hemisphere sign',()=>{
  expect(plantSeasonAmplitude256({center:[100,0,0],meanTemperature:12},100)).toBe(3);
  expect(plantSeasonAmplitude256({center:[99,10,0],meanTemperature:12},100)).toBe(4);
  expect(plantSeasonAmplitude256({center:[0,-100,0],meanTemperature:-12},100)).toBe(-28);
  expect(plantSeasonAmplitude256({center:[0,50,0],meanTemperature:12},100)).toBeCloseTo(14.666667,4);
 });
 it('samples seasonal-only temperatures at134 real year positions rather than mean±amplitude',()=>{
  const tile={center:[0,50,0] as const,meanTemperature:12},range=plantSeasonRange256(tile,100);
  const values=Array.from({length:134},(_,i)=>plantSeasonTemperature256(tile,100,i*27000));expect(range).toEqual({min:Math.min(...values),max:Math.max(...values)});
  expect(range.min).toBeGreaterThanOrEqual(12-plantSeasonAmplitude256(tile,100));expect(range.max).toBeLessThanOrEqual(12+plantSeasonAmplitude256(tile,100));
  const south=plantSeasonTemperature256({...tile,center:[0,-50,0]},100,3000000),north=plantSeasonTemperature256(tile,100,3000000);expect(south).toBeGreaterThan(north);
 });
 it('retains MTB early exits and the rare-event gate draw',()=>{
  let calls=0;const random=()=>{calls++;return .5;};expect(plantRegrowthMtb256(Infinity,random)).toBe(false);expect(plantRegrowthMtb256(0,random)).toBe(true);expect(calls).toBe(0);
  expect(plantRegrowthMtb256(100000,random)).toBe(false);expect(calls).toBe(1);
  calls=0;expect(plantRegrowthMtb256(130,()=>{calls++;return 0;})).toBe(true);expect(calls).toBe(1);
 });
});
