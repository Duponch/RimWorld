import {expect,test} from 'vitest';
import {prepareInitialMapWeather256,type InitialWeatherInputs256} from '../src/sim/initial-weather-256.ts';
import {BIOME_WEATHER_WEIGHTS_256} from '../src/sim/biome-weather-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {localMapInit256} from '../src/sim/local-map-init-256.ts';
import {validateWeather} from '../src/sim/weather-save.ts';
import type {World} from '../src/sim/types.ts';
const input=(random:WorldGenerationRandom,overrides:Partial<InitialWeatherInputs256>={}):InitialWeatherInputs256=>({biome:'temperate-forest',tick:0,runtimeSeed:42,gameInitDataPresent:true,mutatorCode:0,postMutatorInit:random.state,outsideTemperature:20,rainfall:1000,daysPassedSinceSettle:0,tutorial:false,forcedWeather:null,largeFire:false,preventRain:false,rainDisabledUntilCore:0,activeConditionCount:0,...overrides});

test('all twelve actual surface biomes start Clear for exactly10000Core without an outer weather draw',()=>{
 for(const biome of Object.keys(BIOME_WEATHER_WEIGHTS_256) as InitialWeatherInputs256['biome'][]){
  const init=localMapInit256(17,250,250),before=init.random.state;
  const r=prepareInitialMapWeather256(input(init.random,{biome,outsideTemperature:-200}),init.random);
  expect(r.weather).toMatchObject({current:'clear',previous:'clear',ageCore:0,durationCore:10000});expect(init.random.state).toEqual(before);
  expect(r.outerAfterWeather).toEqual(before);expect(r.branch).toBe('new-game-clear');
 }
});
test('the actual outer frontier is continued, never the terminal ScenParts875 stream or resetcounter',()=>{
 const init=localMapInit256(25,250,250);init.random.integer(0,123);init.random.float(1,3);
 const actual=init.random.state,r=prepareInitialMapWeather256(input(init.random),init.random);
 expect(r.outerAfterWeather).toEqual(actual);expect(actual.counter).toBe(3);
 const wrong=new WorldGenerationRandom(25);expect(()=>prepareInitialMapWeather256(input(init.random),wrong)).toThrow();expect(wrong.state.counter).toBe(0);
});
test('non-initial maps take two independent choices before duration and age, consuming exactlyfour actual draws',()=>{
 const random=new WorldGenerationRandom(417),before=random.state;
 const result=prepareInitialMapWeather256(input(random,{gameInitDataPresent:false,tick:1234}),random);
 expect(result.outerAfterWeather.counter-before.counter).toBe(4);expect(result.weather.originTick).toBe(1234);expect(result.weather.lastCoreTick).toBe(12340);
 expect(result.weather.durationCore).toBeGreaterThanOrEqual(16000);expect(result.weather.ageCore).toBeLessThan(result.weather.durationCore);
 expect(validateWeather({tick:1234,width:8,height:8,weather:result.weather} as World,256)).toEqual([]);
});
test('forced weather or tutorial bypass choices but still draw actual duration then exclusive age',()=>{
 for(const [tutorial,forcedWeather,expected] of [[false,'rain','rain'],[true,'rain','clear']] as const){
  const r=new WorldGenerationRandom(31),result=prepareInitialMapWeather256(input(r,{gameInitDataPresent:false,tutorial,forcedWeather}),r);
  const oracle=new WorldGenerationRandom(31),duration=oracle.integer(16000,160001),age=oracle.integer(0,duration);
  expect(result.weather).toMatchObject({current:expected,previous:expected,durationCore:duration,ageCore:age});expect(result.outerAfterWeather).toEqual(oracle.state);
 }
});
test('new-map states retain weather runtime seed and logical clock independently of the outer generation stream',()=>{
 const a=new WorldGenerationRandom(5),b=new WorldGenerationRandom(5);
 const first=prepareInitialMapWeather256(input(a,{tick:6500,runtimeSeed:7,gameInitDataPresent:false}),a),second=prepareInitialMapWeather256(input(b,{tick:6500,runtimeSeed:9,gameInitDataPresent:false}),b);
 expect(first.weather.rng).not.toBe(second.weather.rng);const {rng:_a,...restA}=first.weather,{rng:_b,...restB}=second.weather;expect(restA).toEqual(restB);expect(first.outerAfterWeather).toEqual(second.outerAfterWeather);
});
test('unknown conditions and mismatched context reject before any random draw or World mutation',()=>{
 const r=new WorldGenerationRandom(1),before=r.state;
 expect(()=>prepareInitialMapWeather256({...input(r),activeConditionCount:1} as unknown as InitialWeatherInputs256,r)).toThrow();
 expect(()=>prepareInitialMapWeather256(input(r,{rainfall:NaN}),r)).toThrow();expect(()=>prepareInitialMapWeather256(input(r,{mutatorCode:16}),r)).toThrow();expect(r.state).toEqual(before);
});
