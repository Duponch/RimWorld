/** Numeric/DefID Core4871 facts resolved16Oct2026 without DLC.
 * Original reader, no copied implementation or descriptions. New Site3 only. */
import type {WorldLandBiome} from './world-biome-selection.ts';
import type {WeatherKind} from './weather-definitions.ts';
export const BIOME_WEATHER_WEIGHTS_256:Readonly<Record<WorldLandBiome,Readonly<Partial<Record<WeatherKind,number>>>>>=Object.freeze({
 "boreal-forest": {
  "clear": 18.0,
  "fog": 1.0,
  "rain": 2.0,
  "dry-thunderstorm": 1.0,
  "rainy-thunderstorm": 1.0,
  "foggy-rain": 1.0,
  "snow-gentle": 4.0,
  "snow-hard": 4.0
 },
 "tundra": {
  "clear": 18.0,
  "fog": 1.0,
  "rain": 2.0,
  "dry-thunderstorm": 1.0,
  "rainy-thunderstorm": 1.0,
  "foggy-rain": 1.0,
  "snow-gentle": 4.0,
  "snow-hard": 4.0
 },
 "cold-bog": {
  "clear": 18.0,
  "fog": 1.0,
  "rain": 2.0,
  "dry-thunderstorm": 1.0,
  "rainy-thunderstorm": 1.0,
  "foggy-rain": 1.0,
  "snow-gentle": 4.0,
  "snow-hard": 4.0
 },
 "ice-sheet": {
  "clear": 12.0,
  "fog": 0.0,
  "rain": 0.0,
  "dry-thunderstorm": 2.0,
  "rainy-thunderstorm": 0.0,
  "foggy-rain": 0.0,
  "snow-gentle": 20.0,
  "snow-hard": 40.0
 },
 "sea-ice": {
  "clear": 12.0,
  "fog": 0.0,
  "rain": 0.0,
  "dry-thunderstorm": 2.0,
  "rainy-thunderstorm": 0.0,
  "foggy-rain": 0.0,
  "snow-gentle": 8.0,
  "snow-hard": 8.0
 },
 "temperate-forest": {
  "clear": 18.0,
  "fog": 1.0,
  "rain": 2.0,
  "dry-thunderstorm": 1.0,
  "rainy-thunderstorm": 1.0,
  "foggy-rain": 1.0,
  "snow-gentle": 4.0,
  "snow-hard": 4.0
 },
 "temperate-swamp": {
  "clear": 18.0,
  "fog": 1.0,
  "rain": 2.0,
  "dry-thunderstorm": 1.0,
  "rainy-thunderstorm": 1.0,
  "foggy-rain": 1.0,
  "snow-gentle": 4.0,
  "snow-hard": 4.0
 },
 "tropical-rainforest": {
  "clear": 18.0,
  "fog": 1.0,
  "rain": 2.0,
  "dry-thunderstorm": 0.3,
  "rainy-thunderstorm": 1.7,
  "foggy-rain": 1.0,
  "snow-gentle": 4.0,
  "snow-hard": 4.0
 },
 "tropical-swamp": {
  "clear": 18.0,
  "fog": 1.0,
  "rain": 2.0,
  "dry-thunderstorm": 0.3,
  "rainy-thunderstorm": 1.7,
  "foggy-rain": 1.0,
  "snow-gentle": 4.0,
  "snow-hard": 4.0
 },
 "arid-shrubland": {
  "clear": 18.0,
  "fog": 1.0,
  "rain": 2.0,
  "dry-thunderstorm": 1.0,
  "rainy-thunderstorm": 1.0,
  "foggy-rain": 0.5,
  "snow-gentle": 4.0,
  "snow-hard": 4.0
 },
 "desert": {
  "clear": 18.0,
  "rain": 2.0,
  "dry-thunderstorm": 1.0,
  "rainy-thunderstorm": 1.0,
  "snow-gentle": 4.0,
  "snow-hard": 4.0
 },
 "extreme-desert": {
  "clear": 18.0,
  "rain": 1.0,
  "dry-thunderstorm": 1.0,
  "rainy-thunderstorm": 1.0,
  "snow-gentle": 1.5,
  "snow-hard": 1.0
 }
});
const RAINFALL_CURVES_256:Readonly<Record<WeatherKind,readonly (readonly [number,number])[]>>={"clear": [], "fog": [[0.0, 0.0], [1300.0, 1.0]], "rain": [[0.0, 0.0], [1300.0, 1.0], [4000.0, 3.0]], "dry-thunderstorm": [], "rainy-thunderstorm": [[0.0, 0.0], [1300.0, 1.0], [4000.0, 2.0]], "foggy-rain": [[0.0, 0.0], [1300.0, 1.0]], "snow-gentle": [[0.0, 0.0], [300.0, 0.5], [1300.0, 1.0]], "snow-hard": [[0.0, 0.0], [300.0, 0.5], [1300.0, 1.0]]};
export const WEATHER_ORDER_256:readonly WeatherKind[]=["clear", "fog", "rain", "dry-thunderstorm", "rainy-thunderstorm", "foggy-rain", "snow-hard", "snow-gentle"];
const f=Math.fround;
export function biomeWeatherCommonality256(biome:WorldLandBiome,kind:WeatherKind,rainfall:number,beforeRainfallFactor=1):number {
 if(!Object.hasOwn(BIOME_WEATHER_WEIGHTS_256,biome)||!Number.isFinite(rainfall)||!Number.isFinite(beforeRainfallFactor)||beforeRainfallFactor<0)throw Error('Missing actual biome weather definitions');
 let weight=f(f(BIOME_WEATHER_WEIGHTS_256[biome][kind]??0)*f(beforeRainfallFactor));
 const points=RAINFALL_CURVES_256[kind];if(!points.length)return weight;
 const x=f(rainfall),first=points[0]!,last=points.at(-1)!;let factor:number;
 if(x<=first[0])factor=first[1];else if(x>=last[0])factor=last[1];else {let i=1;while(x>points[i]![0])i++;const a=points[i-1]!,b=points[i]!;factor=f(a[1]+f(f(b[1]-a[1])*f(f(x-a[0])/f(b[0]-a[0]))));}
 return f(weight*f(factor));
}
