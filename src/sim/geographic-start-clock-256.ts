/** Same Core4871 configured calendar owner as the existing initial-calendar kernel.
 * The modulo and f32 twelfth selection stay in that one source of truth. */
import {configuredInitialCalendarScalars256,type InitialSeason256} from './initial-calendar-256.ts';
import type {ClimateDefinition} from './site-climate.ts';
export function configuredGeographicStartClock256(definition:ClimateDefinition,season:InitialSeason256='auto'):{absoluteCore:number;calendarOrigin:number} {
 const clock=configuredInitialCalendarScalars256(definition,{season});
 const absoluteCore=clock.configuredTicksAbsCore,calendarOrigin=clock.localStartAbsCore/10;
 if(!Number.isSafeInteger(absoluteCore)||absoluteCore<0||!Number.isSafeInteger(calendarOrigin))throw Error('Actual configured starting clock overflow');
 return {absoluteCore,calendarOrigin};
}
