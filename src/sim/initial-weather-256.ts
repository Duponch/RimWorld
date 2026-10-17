/** Original implementation of the surface Core4871 initial-weather frontier.
 * The caller owns the actual OUTER map-init stream, after mutator.Init and
 * before GenerateContentsIntoMap's separate pushed streams. This does not
 * change the independently saved runtime weather generator or migrate saves. */
import {BIOME_WEATHER_WEIGHTS_256,biomeWeatherCommonality256,WEATHER_ORDER_256} from './biome-weather-256.ts';
import {WEATHER,type WeatherKind} from './weather-definitions.ts';
import {newWeatherState} from './weather.ts';
import {WorldGenerationRandom} from './world-generation-random.ts';
import {orderedCoreLocalMutators256} from './world-local-mutators-256.ts';
import type {WorldLandBiome} from './world-biome-selection.ts';

export interface InitialWeatherInputs256 {
 readonly biome:WorldLandBiome;readonly tick:number;readonly runtimeSeed:number;
 readonly gameInitDataPresent:boolean;readonly mutatorCode:number;
 /** Captured state of this same real outer stream AFTER actual mutator.Init. */
 readonly postMutatorInit:Readonly<{seed:number;counter:number}>;
 /** Actual new-map weather readers. Never infer an old settlement's age
  * from the local map's creation tick. Conditions are checked by its owner. */
 readonly outsideTemperature:number;readonly rainfall:number;readonly daysPassedSinceSettle:number;
 readonly tutorial:boolean;readonly forcedWeather:WeatherKind|null;
 readonly largeFire:boolean;readonly preventRain:boolean;readonly rainDisabledUntilCore:number;
 /** A fresh Crashlanded/Encounter map has no condition multipliers. Refuse
  * unknown active conditions rather than silently suppress their effects. */
 readonly activeConditionCount:0;
}
const f=Math.fround;
function choose(input:InitialWeatherInputs256,random:WorldGenerationRandom):WeatherKind {
 if(input.tutorial)return 'clear';
 if(input.forcedWeather!==null)return input.forcedWeather;
 const weights=WEATHER_ORDER_256.map(kind=>{
  const d=WEATHER[kind];
  if(input.outsideTemperature<d.minimum||input.outsideTemperature>d.maximum||d.storm&&input.daysPassedSinceSettle<8||d.rain>.1&&(input.preventRain||input.tick*10<input.rainDisabledUntilCore))return 0;
  return biomeWeatherCommonality256(input.biome,kind,input.rainfall,input.largeFire&&d.rain>.1?15:1);
 });
 let sum=f(0);for(const weight of weights)sum=f(sum+weight);
 if(sum>0){
  let left=f(sum*random.value());for(let i=0;i<weights.length;i++){const weight=weights[i]!;if(weight<=0)continue;left=f(left-weight);if(left<=0)return WEATHER_ORDER_256[i]!;}
  // A rounded endpoint can fall through the IList loop. Preserve the
  // ordinary enumerable retry's draws instead of substituting a new roll.
  const first=weights.findIndex(weight=>weight>0);let result=WEATHER_ORDER_256[first]!,running=weights[first]!;
  for(let i=first+1;i<weights.length;i++){const next=weights[i]!,total=f(running+next);if(random.float(0,total)>=running)result=WEATHER_ORDER_256[i]!;running=total;}
  return result;
 }
 // Core's explicit all-zero fallback chooses an entry of the biome list,
 // NOT another weighted draw and NOT a newly fabricated Clear preference.
 const rows=WEATHER_ORDER_256.filter(kind=>Object.hasOwn(BIOME_WEATHER_WEIGHTS_256[input.biome],kind));
 return rows[random.integer(0,rows.length)]!;
}
export function prepareInitialMapWeather256(input:InitialWeatherInputs256,random:WorldGenerationRandom){
 const p=input?.postMutatorInit,state=random instanceof WorldGenerationRandom?random.state:undefined;
 if(!input||!Object.hasOwn(BIOME_WEATHER_WEIGHTS_256,input.biome)||!state||!p||state.seed!==p.seed||state.counter!==p.counter||!Number.isSafeInteger(input.tick)||input.tick<0||!Number.isSafeInteger(input.tick*10)||!Number.isInteger(input.runtimeSeed)||input.runtimeSeed< -2147483648||input.runtimeSeed>0xffffffff||typeof input.gameInitDataPresent!=='boolean'||!Number.isFinite(input.outsideTemperature)||!Number.isFinite(input.rainfall)||input.rainfall<0||!Number.isFinite(input.daysPassedSinceSettle)||input.daysPassedSinceSettle<0||typeof input.tutorial!=='boolean'||input.forcedWeather!==null&&!WEATHER_ORDER_256.includes(input.forcedWeather)||typeof input.largeFire!=='boolean'||typeof input.preventRain!=='boolean'||!Number.isSafeInteger(input.rainDisabledUntilCore)||input.rainDisabledUntilCore<0||input.activeConditionCount!==0)throw Error('Missing actual initial-weather map/outer-stream context');
 orderedCoreLocalMutators256(input.mutatorCode);
 const weather=newWeatherState(input.runtimeSeed,input.tick);
 if(!input.gameInitDataPresent){
  // curWeather remains null for BOTH draws. In particular the second draw
  // can equal the first even when that weather is not normally repeatable.
  const current=choose(input,random),previous=choose(input,random);
  weather.current=current;weather.previous=previous;
  weather.durationCore=WEATHER[current].storm?random.integer(15000,40001):random.integer(16000,160001);
  weather.ageCore=random.integer(0,weather.durationCore);
 }
 // Every admitted surface Core biome lists Clear. Starting a new game
 // therefore spends NO weather draw, regardless of temperature or weights.
 return {weather,outerAfterWeather:random.state,branch:input.gameInitDataPresent?'new-game-clear' as const:'existing-campaign-map' as const};
}
