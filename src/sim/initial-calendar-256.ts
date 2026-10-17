import {geographicPlanetClimateDefinition256,geographicSeasonTemperature256,geographicLongitudeOffsetCore256,type ClimateDefinition} from './site-climate.ts';
import type {PlanetState} from './planet-state.ts';
export type InitialSeason256='auto'|'spring'|'summer'|'fall'|'winter'|'permanent-summer'|'permanent-winter';
export const INITIAL_CALENDAR_YEAR_256=5500;
const f=Math.fround;
function roundEven(n:number):number {const low=Math.floor(n),r=n-low;return r<.5?low:r>.5?low+1:low%2===0?low:low+1;}
export function firstSeasonTwelfth256(season:Exclude<InitialSeason256,'auto'>,latitude:number):number {
 if(!Number.isFinite(latitude)||latitude< -90||latitude>90)throw Error('Invalid actual starting latitude');
 if(season==='permanent-summer'||season==='permanent-winter')return 0;
 const north={spring:0,summer:3,fall:6,winter:9},south={spring:6,summer:9,fall:0,winter:3};
 if(!Object.hasOwn(north,season))throw Error('Unknown configured starting season');return (latitude>=0?north:south)[season];
}
/** Pure source oracle surface, no World/clock, PRNG, cache or owner creation. */
export function averageInitialTwelfthTemperature256(definition:ClimateDefinition,twelfth:number):number {
 if(!Number.isInteger(twelfth)||twelfth<0||twelfth>11)throw Error('Invalid starting twelfth');
 let sum=f(0);for(let i=0;i<120;i++){
  const absolute=twelfth*300000+30000+roundEven(f(f(i/120)*300000));
  sum=f(sum+geographicSeasonTemperature256(definition,absolute));
 }
 return f(sum/120);
}
export function firstWarmStartingTwelfth256(averages:readonly number[],latitude:number):number {
 if(!Number.isFinite(latitude)||latitude< -90||latitude>90)throw Error('Invalid actual starting latitude');
 if(averages.length!==12||averages.some(v=>!Number.isFinite(v)||f(v)!==v))throw Error('Actual twelve f32 temperature averages required');
 const warm=(i:number)=>averages[i]!>=12&&averages[i]!<=9999;
 let first=-1;for(let i=0;i<12;i++)if(warm(i)){first=i;break;}
 if(first<0)return firstSeasonTwelfth256('summer',latitude);
 if(first===0){let current=0;for(let i=0;i<12;i++){const previous=(current+11)%12;if(!warm(previous))return current;current=previous;}}
 return first;
}
export function configuredInitialCalendarScalars256(definition:ClimateDefinition,options:{season:InitialSeason256}) {
 if(!Number.isFinite(definition.latitude)||definition.latitude< -90||definition.latitude>90||!Number.isFinite(definition.longitude)||definition.longitude< -180||definition.longitude>180||!Number.isFinite(definition.meanTemperature)||!Number.isFinite(definition.amplitude)||definition.amplitude<0)throw Error('Actual selected-site climate facts required');
 const averages=options.season==='auto'?Array.from({length:12},(_,i)=>averageInitialTwelfthTemperature256(definition,i)):undefined;
 const twelfth=options.season==='auto'?firstWarmStartingTwelfth256(averages!,definition.latitude):firstSeasonTwelfth256(options.season,definition.latitude);
 const localOffsetCore=geographicLongitudeOffsetCore256(f(definition.longitude)),timeZone=localOffsetCore/2500;
 const configuredTicksAbsCore=twelfth*300000+2500*(6+(24-timeZone)%24),localStartAbsCore=configuredTicksAbsCore+localOffsetCore;
 return {twelfth,timeZone,configuredTicksAbsCore,localStartAbsCore,...averages?{averages}:{}};
}
/** The caller supplies the TRUE newly constructed campaign TickManager
 * frontier. No default0, load/migration path, local-time inference or fresh
 * World is manufactured here. Configuration precedes original Pawn transfer. */
export function prepareInitialCalendar256(planet:Extract<PlanetState,{revision:3}>,tile:number,options:{season:InitialSeason256},actualClock:{ticksGameCore:number}) {
 if(actualClock.ticksGameCore!==0)throw Error('Initial calendar requires the actual new campaign clock frontier');
 if(tile!==planet.homeTile)throw Error('Initial calendar requires the confirmed home tile');
 const definition=geographicPlanetClimateDefinition256(planet,tile),configured=configuredInitialCalendarScalars256(definition,options);
 const tick=actualClock.ticksGameCore/10,calendarOrigin=configured.localStartAbsCore/10;
 if(!Number.isSafeInteger(tick)||!Number.isSafeInteger(calendarOrigin))throw Error('Initial calendar cannot be represented by the existing clock scale');
 return {tile,season:options.season,year:INITIAL_CALENDAR_YEAR_256,...configured,
  /** Existing map/global clock inputs, not a new persisted record. */
  tick,calendarOrigin,
  /** Pre-Playing GenTicks.TicksAbs, distinct from elapsed health/owner time. */
  worldPawnEntry:{clockCore:actualClock.ticksGameCore,enteredAtAbsCore:configured.configuredTicksAbsCore}};
}
