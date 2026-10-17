import {expect,test} from 'vitest';
import {WORLD_LAND_BIOMES} from '../src/sim/world-biome-selection.ts';
import {BIOME_WEATHER_WEIGHTS_256,WEATHER_ORDER_256,biomeWeatherCommonality256 as weight} from '../src/sim/biome-weather-256.ts';
import {weatherWeights} from '../src/sim/weather.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
test('all twelve actual land biomes have their own Core-only weather admission',()=>{
 expect(Object.keys(BIOME_WEATHER_WEIGHTS_256).sort()).toEqual([...WORLD_LAND_BIOMES].sort());
 expect(WEATHER_ORDER_256).toEqual(['clear','fog','rain','dry-thunderstorm','rainy-thunderstorm','foggy-rain','snow-hard','snow-gentle']);
 expect(weight('desert','fog',1300)).toBe(0);expect(weight('desert','foggy-rain',1300)).toBe(0);
 expect(weight('extreme-desert','rain',1300)).toBe(1);expect(weight('extreme-desert','snow-hard',1300)).toBe(1);
 expect(weight('ice-sheet','snow-hard',1300)).toBe(40);expect(weight('sea-ice','snow-hard',1300)).toBe(8);
 expect(weight('tropical-rainforest','dry-thunderstorm',1300)).toBe(Math.fround(.3));expect(weight('tropical-swamp','rainy-thunderstorm',1300)).toBe(Math.fround(1.7));
});
test('rainfall curves use their actual endpoints, intermediate segments and zero, without normalizing other biomes',()=>{
 expect(weight('temperate-forest','rain',0)).toBe(0);expect(weight('temperate-forest','rain',650)).toBe(1);
 expect(weight('temperate-forest','rain',1300)).toBe(2);expect(weight('temperate-forest','rain',2650)).toBe(4);
 expect(weight('temperate-forest','rain',9000)).toBe(6);expect(weight('ice-sheet','snow-hard',300)).toBe(20);
 expect(weight('arid-shrubland','foggy-rain',1300)).toBe(.5);
 expect(()=>weight('unknown' as never,'rain',1300)).toThrow();expect(()=>weight('desert','rain',NaN)).toThrow();
});
test('legacy site weather contracts retain their original literal weights and order in a new schema',()=>{
 const w=deconstructionCamp();
 expect(weatherWeights(w,20,1300)).toEqual([
  {kind:'clear',weight:18},{kind:'fog',weight:1},{kind:'rain',weight:2},
  {kind:'dry-thunderstorm',weight:0},{kind:'rainy-thunderstorm',weight:0},{kind:'foggy-rain',weight:1},
  {kind:'snow-gentle',weight:0},{kind:'snow-hard',weight:0}
 ]);
});
