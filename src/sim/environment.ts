import { TICKS_PER_DAY } from './types.ts';
import { climateTick,TEMPERATE_CLIMATE,TICKS_PER_YEAR,type ClimateWorld } from './site-climate.ts';

/** Fixed site: 45°N at equinox. Outdoor temperature/weather are still a preset.
 * Celestial glow follows the reference's horizon correction, independently of
 * rendered pixels and the artistic ambient light used for night readability. */
export function naturalLight(tick: number): number {
  const hourAngle = (tick % TICKS_PER_DAY / TICKS_PER_DAY - .5) * 2 * Math.PI;
  const altitudeDot = Math.cos(hourAngle) * Math.SQRT1_2;
  const correctedAngle = Math.max(0, Math.acos(altitudeDot) - 23.25 * Math.PI / 180);
  return Math.max(0, Math.min(1, Math.cos(correctedAngle) / .7));
}
export const OUTDOOR_TEMPERATURE = 21;

// Inclusive integer-tick integral. CPU growth remains O(1) per query, regardless
// of elapsed days; no per-tick walk over the forest or permanent growth deltas.
const prefix = new Float64Array(TICKS_PER_DAY + 1);
for (let tick = 1; tick <= TICKS_PER_DAY; tick++) {
  const phase = tick % TICKS_PER_DAY / TICKS_PER_DAY;
  const light = Math.max(0, (naturalLight(tick) - .51) / .49);
  prefix[tick] = prefix[tick - 1]! + (phase >= .25 && phase <= .8 ? light : 0);
}
export function growingLightIntegral(tick: number): number {
  const days = Math.floor(tick / TICKS_PER_DAY), remainder = tick % TICKS_PER_DAY;
  return days * prefix[TICKS_PER_DAY]! + prefix[remainder]!;
}

/** Reference celestial geometry reduced to a scalar dot product. The game's
 * horizon corrections are retained, rather than terrestrial sunrise formulas. */
export function seasonalNaturalLight(latitude:number,civilTick:number):number {
  const phase=((civilTick%TICKS_PER_YEAR)+TICKS_PER_YEAR)%TICKS_PER_YEAR;
  const day=Math.floor(phase/TICKS_PER_DAY),hourAngle=(phase%TICKS_PER_DAY/TICKS_PER_DAY-.5)*2*Math.PI;
  const offset=latitude<=70?.2:latitude>=75?1.5:.2+(latitude-70)/5*1.3;
  const y=-Math.cos(day/60*2*Math.PI)*offset,lat=latitude*Math.PI/180;
  const dot=(Math.cos(hourAngle)*Math.cos(lat)+y*Math.sin(lat))/Math.sqrt(1+y*y);
  const peek=latitude<=70?1:latitude>=75?.05:1-(latitude-70)/5*.95;
  const correction=(19*peek+17*Math.max(0,Math.min(1,(60-Math.abs(latitude))/60)))*Math.PI/180;
  const angle=Math.max(0,Math.acos(Math.max(-1,Math.min(1,dot)))-correction);
  return Math.max(0,Math.min(1,Math.cos(angle)/.7));
}

export function annualNaturalLight(world:ClimateWorld,tick=world.tick):number {
  const civil=climateTick(world,tick);
  return world.climate?seasonalNaturalLight(TEMPERATE_CLIMATE.latitude,civil):naturalLight(civil);
}

// Shared immutable annual table: one profile, ~2.9MB, O(1) interval queries.
// No plant/map scan on lookup and no accumulated authoritative growth cache.
let yearlyPrefix:Float64Array|undefined;
function annualPrefix():Float64Array {
  if(yearlyPrefix)return yearlyPrefix;
  const values=new Float64Array(TICKS_PER_YEAR+1);
  for(let tick=1;tick<=TICKS_PER_YEAR;tick++) {
    const phase=tick%TICKS_PER_DAY/TICKS_PER_DAY;
    const light=phase>=.25&&phase<=.8?Math.max(0,(seasonalNaturalLight(TEMPERATE_CLIMATE.latitude,tick)-.51)/.49):0;
    values[tick]=values[tick-1]!+light;
  }
  return yearlyPrefix=values;
}

export function annualGrowingLightIntegral(world:ClimateWorld,tick=world.tick):number {
  const civil=climateTick(world,tick);
  if(!world.climate)return growingLightIntegral(civil);
  const values=annualPrefix(),years=Math.floor(civil/TICKS_PER_YEAR),remainder=civil-years*TICKS_PER_YEAR;
  return years*values[TICKS_PER_YEAR]!+values[remainder]!;
}
