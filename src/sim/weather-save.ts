import { WEATHER_KINDS } from './weather-definitions.ts';
import type { World } from './types.ts';

export function validateWeather(w:World,version:number):string[] {
  const s=w.weather;if(s===undefined)return [];
  const error=['Invalid surface weather state.'];
  if(version<87||!s||typeof s!=='object'||Array.isArray(s))return error;
  if(Object.keys(s).some(k=>!['revision','originTick','lastCoreTick','rng','current','previous','ageCore','durationCore','fireWatchCore','largeFire','lightningCount','lastLightning'].includes(k)))return error;
  if(s.revision!==1||!Number.isSafeInteger(s.originTick)||s.originTick<0||s.originTick>w.tick||!Number.isSafeInteger(s.lastCoreTick)||s.lastCoreTick!==w.tick*10
    ||!Number.isSafeInteger(s.rng)||s.rng<1||s.rng>0xffffffff||!WEATHER_KINDS.includes(s.current)||!WEATHER_KINDS.includes(s.previous)
    ||!Number.isSafeInteger(s.ageCore)||s.ageCore<0||s.ageCore>s.durationCore||!Number.isSafeInteger(s.durationCore)||s.durationCore<10000||s.durationCore>160000
    ||!Number.isSafeInteger(s.fireWatchCore)||s.fireWatchCore<s.originTick*10||s.fireWatchCore>s.lastCoreTick||s.lastCoreTick-s.fireWatchCore>=426
    ||typeof s.largeFire!=='boolean'||!Number.isSafeInteger(s.lightningCount)||s.lightningCount<0)return error;
  const l=s.lastLightning;
  const storm=s.current==='dry-thunderstorm'||s.current==='rainy-thunderstorm';
  if(!(s.durationCore===10000&&s.current==='clear'&&s.previous==='clear'||storm&&s.durationCore>=15000&&s.durationCore<=40000||!storm&&s.durationCore>=16000&&s.durationCore<=160000)||s.lightningCount>(s.lastCoreTick-s.originTick*10)*2)return error;
  if((s.lightningCount===0)!==(l===undefined))return error;
  if(l!==undefined&&(!l||typeof l!=='object'||Array.isArray(l)||Object.keys(l).some(k=>!['x','z','coreTick'].includes(k))||!Number.isSafeInteger(l.x)||l.x<0||l.x>=w.width||!Number.isSafeInteger(l.z)||l.z<0||l.z>=w.height||!Number.isSafeInteger(l.coreTick)||l.coreTick<=s.originTick*10||l.coreTick>s.lastCoreTick))return error;
  return [];
}
