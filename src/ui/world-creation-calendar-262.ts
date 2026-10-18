import {geographicSurfaceTileClimateDefinition256} from '../sim/site-climate';
import {configuredGeographicStartClock256} from '../sim/geographic-start-clock-256';
import {INITIAL_CALENDAR_YEAR_256} from '../sim/initial-calendar-256';
import type {WorldSurfaceTile} from '../sim/world-surface-geography';
import type {GeographicCreationSeason262} from '../sim/geographic-creation-options-262';
export const CREATION_SEASON_LABELS_262={auto:'Auto',spring:'Printemps',summer:'Été',fall:'Automne',winter:'Hiver'} as const;
/** Same actual immutable tile and calendar kernel as the factory. No Planet,
 * World, weather, generated map or random stream is manufactured for this UI. */
export function worldCreationCalendarFacts262(tile:WorldSurfaceTile,season:GeographicCreationSeason262){
 const definition=geographicSurfaceTileClimateDefinition256(tile),clock=configuredGeographicStartClock256(definition,season);
 const day=Math.floor(clock.calendarOrigin/6000),year=INITIAL_CALENDAR_YEAR_256+Math.floor(day/60),inYear=((day%60)+60)%60;
 return {clock,definition,date:`Jour ${inYear+1} de ${year} · 06:00`,choice:CREATION_SEASON_LABELS_262[season],seasonalRange:`${(definition.meanTemperature-definition.amplitude).toFixed(1)} à ${(definition.meanTemperature+definition.amplitude).toFixed(1)} °C`};
}
