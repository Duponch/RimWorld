/** Same Core4871 Auto calendar owner as the existing initial-calendar kernel.
 * The modulo and f32 twelfth selection stay in that one source of truth. */
import {configuredInitialCalendarScalars256} from './initial-calendar-256.ts';
import type {ClimateDefinition} from './site-climate.ts';
export function configuredGeographicStartClock256(definition:ClimateDefinition):{absoluteCore:number;calendarOrigin:number} {
 const clock=configuredInitialCalendarScalars256(definition,{season:'auto'});
 const absoluteCore=clock.configuredTicksAbsCore,calendarOrigin=clock.localStartAbsCore/10;
 if(!Number.isSafeInteger(absoluteCore)||absoluteCore<0||!Number.isSafeInteger(calendarOrigin))throw Error('Actual configured starting clock overflow');
 return {absoluteCore,calendarOrigin};
}
