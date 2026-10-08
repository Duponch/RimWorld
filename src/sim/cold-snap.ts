import { climateTick,seasonTemperature,siteClimateDefinition } from './site-climate.ts';
import { TICKS_PER_DAY,type World } from './types.ts';

export const COLD_SNAP_TRANSITION_TICKS=1200;
export const COLD_SNAP_MAX_OFFSET=-20;
export const COLD_SNAP_COOLDOWN=30*TICKS_PER_DAY;
type ColdSnapWorld=Pick<World,'tick'|'miscIncidents'>;

/** Persisted interval, observed at the current simulation tick. */
export function activeColdSnap(world:ColdSnapWorld):{start:number;end:number}|undefined {
  const active=world.miscIncidents?.weather?.coldSnap;
  return active&&world.tick>=active.start&&world.tick<active.end?active:undefined;
}

/** Core's -20°C LerpInOutValue, evaluated at our ten-Core-tick resolution. */
export function coldSnapOffset(world:ColdSnapWorld):number {
  const active=activeColdSnap(world);
  if(!active)return 0;
  const fraction=Math.max(0,Math.min(1,(world.tick-active.start)/COLD_SNAP_TRANSITION_TICKS,
    (active.end-world.tick)/COLD_SNAP_TRANSITION_TICKS));
  return fraction===0?0:COLD_SNAP_MAX_OFFSET*fraction;
}

/** Eligibility uses the season, never the daily swing or the cold event itself.
 * Unsupported/hot-season tickets are consumed by the caller without a retry. */
export function eligibleColdSnap(world:World):boolean {
  const calendar=world.miscIncidents,weather=calendar?.weather;
  if(world.schemaVersion<200||!world.gameProfile||!world.climate||!calendar||!weather
    ||calendar.active||world.heatwaves?.active||weather.coldSnap
    ||weather.lastColdSnapStart!==undefined&&world.tick-weather.lastColdSnapStart<COLD_SNAP_COOLDOWN)return false;
  const site=siteClimateDefinition(world);
  const seasonal=seasonTemperature(site.latitude,site.meanTemperature,climateTick(world));
  return seasonal>0&&seasonal<15;
}
