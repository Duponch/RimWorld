/** Prospective surface movement facts. Absolute Core ticks are supplied by
 * the caller; no local-map clock, weather or selected view is consulted. */
import {evaluateClimateCurve,type ClimateSetting} from './world-climate-settings.ts';
import {worldBiomeMovement} from './world-biome-properties.ts';
import {roundWorldInteger} from './world-rivers.ts';
import type {WorldSurfaceTile} from './world-surface-geography.ts';
const f=Math.fround;
const clip=(x:number)=>Math.max(0,Math.min(1,x));
const inverse=(a:number,b:number,x:number)=>a===b?0:clip(f(f(x-a)/f(b-a)));
const LATITUDES:readonly (readonly [number,number,number])[]=[[-999,-999,999],[-999,15,999],[-999,40,999],[15,75,999],[35,999,999],[65,999,999],[999,999,999]];
const SEASON_CURVE=[[-.042500004,0],[.042500004,1],[.2075,1],[.29250002,2],[.45749998,2],[.5425,3],[.7075,3],[.7925,4],[.9575,4],[1.0425,5]] as const;
const RELIEF={flat:0,'small-hills':.5,'large-hills':1.5,mountainous:3,impassable:1000} as const;
export function worldSurfaceCoordinates(tile:Pick<WorldSurfaceTile,'center'>):{latitude:number;longitude:number} {
 const [x,y,z]=tile.center;
 return {latitude:f(f(Math.asin(Math.max(-1,Math.min(1,f(y/100)))))*f(57.29578)),longitude:f(f(Math.atan2(x,-z))*f(57.29578))};
}
export function worldYearFraction(absoluteCoreTick:number,longitude:number):number {
 const offset=roundWorldInteger(f(longitude/15))*2500,year=3600000;
 return f(((absoluteCoreTick+offset)%year+year)%year/year);
}
export function worldLatitudeWeights(latitude:number,temperature:ClimateSetting):{equatorial:number;seasonal:number;polar:number} {
 const [equator,seasonalLimit,polarLimit]=LATITUDES[temperature]!,at=Math.abs(latitude);
 if(at<=equator)return {equatorial:1,seasonal:0,polar:0};
 if(at>seasonalLimit)return {equatorial:0,seasonal:0,polar:at<=polarLimit?1:0};
 let equatorial=inverse(equator+5,equator,at),polar=inverse(seasonalLimit-5,seasonalLimit,at),seasonal=Math.min(f(1-equatorial),f(1-polar));
 const total=f(f(equatorial+seasonal)+polar);
 if(total!==0){equatorial=f(equatorial/total);seasonal=f(seasonal/total);polar=f(polar/total);}
 return {equatorial,seasonal,polar};
}
function winterAt(year:number):number {
 const phase=evaluateClimateCurve(SEASON_CURVE,clip(year));
 return phase<=1?f(1-phase):phase<=3?0:phase<=4?f(phase-3):f(1-f(phase-4));
}
export function worldWinterWeights(latitude:number,year:number,temperature:ClimateSetting):{winter:number;permanentWinter:number} {
 const weights=worldLatitudeWeights(latitude,temperature),north=inverse(-2.5,2.5,latitude),southYear=f(f(clip(year)+.5)%1);
 return {winter:f(f(f(north*winterAt(year))+f(f(1-north)*winterAt(southYear)))*weights.seasonal),permanentWinter:weights.polar};
}
export function worldSeasonalTemperature(tile:Pick<WorldSurfaceTile,'center'|'meanTemperature'>,absoluteCoreTick:number):number {
 const latitude=worldSurfaceCoordinates(tile).latitude;
 const normalized=Math.abs(f(tile.center[1]/100)),amplitude=evaluateClimateCurve([[0,3],[.1,4],[1,28]],normalized)*(latitude<0?-1:1);
 const tick=absoluteCoreTick===0?1:absoluteCoreTick,year=f(f(f(f(tick)/60000)%60)/60);
 const angle=f(f(f(Math.PI)*2)*f(year-f(10/12)));
 return f(tile.meanTemperature+f(f(Math.cos(angle))*f(-amplitude)));
}
export function worldSurfaceDifficulty(tile:Pick<WorldSurfaceTile,'center'|'biome'|'hilliness'|'meanTemperature'>,temperature:ClimateSetting,absoluteCoreTick:number):number {
 if(tile.biome==='ocean'||tile.biome==='lake'||tile.hilliness==='impassable')return 1000;
 const coordinates=worldSurfaceCoordinates(tile),winter=worldWinterWeights(coordinates.latitude,worldYearFraction(absoluteCoreTick,coordinates.longitude),temperature);
 const severity=f(f(winter.winter+winter.permanentWinter)*inverse(5,0,worldSeasonalTemperature(tile,absoluteCoreTick)));
 return f(f(worldBiomeMovement(tile.biome)+RELIEF[tile.hilliness])+(severity>f(.01)?f(2*severity):0));
}
export function captureWorldSurfaceDifficulties(tiles:readonly WorldSurfaceTile[],temperature:ClimateSetting,absoluteCoreTick:number):Float32Array {
 if(!Number.isSafeInteger(absoluteCoreTick)||absoluteCoreTick<0)throw Error('Invalid world movement clock');
 return Float32Array.from(tiles,tile=>worldSurfaceDifficulty(tile,temperature,absoluteCoreTick));
}
