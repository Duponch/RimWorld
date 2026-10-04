import { expect,test } from 'vitest';
import { serializeWorld,deserializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { isPowerActive,powerDemand,powerWatts } from '../src/sim/power-rules.ts';
import { triggerBreakdown,breakdownEligible } from '../src/sim/breakdowns.ts';
import { adoptWeather } from '../src/sim/weather.ts';
import { adoptRainElectrical,advanceRainElectrical,rainElectricalEligible } from '../src/sim/rain-electric.ts';
import { validRainElectrical } from '../src/sim/rain-electric-save.ts';
import { structureMaxHp,structureFlammability } from '../src/sim/thing-damage-rules.ts';
import { structureBeauty } from '../src/sim/room-beauty.ts';
import { STRUCTURE_SHOT_FILL } from '../src/sim/combat-content.ts';
import { FURNITURE_TRAVEL } from '../src/sim/furniture-travel.ts';
import { advanceRainClock } from './helpers/rain-electric-v194.ts';
import { prepareTelevisionWorld } from './scenarios/television-v208.ts';

test('a supplied CRT draws 200W without spectators and never acquires a material-quality or random component failure',()=>{
  const w=prepareTelevisionWorld(0,0),tv=w.structures.find(s=>s.kind==='tube-television')!;
  expect(isPowerActive(tv)).toBe(true);expect(powerDemand(tv)).toBe(200);expect(powerWatts(tv,w)).toBe(-200);
  expect(structureMaxHp(tv)).toBe(100);expect(structureFlammability(tv)).toBe(1);expect(structureBeauty(tv)).toBe(0);
  expect(STRUCTURE_SHOT_FILL[tv.kind]).toBe(.4);expect(FURNITURE_TRAVEL[tv.kind]).toEqual({delay:4.2,stand:false,repeat:true});
  expect(tv.quality).toBeUndefined();expect(breakdownEligible(tv)).toBe(false);
  const before=serializeWorld(w);expect(triggerBreakdown(w,tv.id)).toBe(false);expect(serializeWorld(w)).toBe(before);
});

test('an ordinary supply loss and restoration actually stop and restart the CRT without rewriting its physical switch',()=>{
  const w=prepareTelevisionWorld(0,0),tv=w.structures.find(s=>s.kind==='tube-television')!,generator=w.structures.find(s=>s.kind==='wood-generator')!;
  generator.fuel!.ticks=0;stepWorld(w,30);expect(isPowerActive(tv)).toBe(false);expect(tv.power!.switchOn).toBeUndefined();expect(powerWatts(tv,w)).toBe(0);
  const copy=deserializeWorld(serializeWorld(w));generator.fuel!.ticks=45000;copy.structures.find(s=>s.id===generator.id)!.fuel!.ticks=45000;
  stepWorld(w,40);stepWorld(copy,40);expect(isPowerActive(tv)).toBe(true);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
});

test('rain exposure uses actual supply and roof at the CRT anchor; a prepared opportunity creates the existing flame impact',()=>{
  const w=prepareTelevisionWorld(0,0),tv=w.structures.find(s=>s.kind==='tube-television')!;
  adoptWeather(w);Object.assign(w.weather!,{current:'rain',previous:'rain',ageCore:4000,durationCore:160000});adoptRainElectrical(w);
  expect(rainElectricalEligible(w,tv)).toBe(true);
  tv.power!.on=false;expect(rainElectricalEligible(w,tv)).toBe(false);tv.power!.on=true;
  w.roofing={constructed:[tv.z*w.width+tv.x],build:[],remove:[],cursor:0};expect(rainElectricalEligible(w,tv)).toBe(false);w.roofing.constructed=[];
  // Independent prepared private stream: the first two draws for seed1 pass
  // .02 and .2 respectively; the only eligible candidate is this television.
  w.rainElectrical!.rng=1;
  const due=(Math.floor(w.rainElectrical!.lastCoreTick/97)+1)*97;
  while(w.tick*10<due){advanceRainClock(w);advanceRainElectrical(w);}
  expect(w.rainElectrical!.discharges).toBe(1);expect(w.rainElectrical!.lastDischarge).toMatchObject({structureId:tv.id,kind:'tube-television',x:tv.x,z:tv.z,coreTick:due});
  expect(w.fires?.items.some(f=>f.x===tv.x&&f.z===tv.z)).toBe(true);
  expect(validRainElectrical(w.rainElectrical,190,w)).toBe(true);expect(validRainElectrical(w.rainElectrical,189,w)).toBe(false);
});
