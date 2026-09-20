import { TICKS_PER_DAY } from '../sim/types';
import { seasonalNaturalLight } from '../sim/environment';
import { TEMPERATE_CLIMATE,TICKS_PER_YEAR } from '../sim/site-climate';

export interface DaylightSample {
  x: number; y: number; z: number;
  daylight: number; warmth: number; sunlight: number; moonlight: number;
}

function smooth(a: number, b: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Art interpretation: clear equinox at 45°N, east +X / south +Z.
 * Tick-derived and periodic, but NOT a source of gameplay light or climate.
 * Historical worlds retain this exact presentation. */
export function sampleDaylight(tick: number, out: DaylightSample): DaylightSample {
  const phase = ((tick % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY / TICKS_PER_DAY;
  const hourAngle = (phase - 0.5) * Math.PI * 2;
  out.x = -Math.sin(hourAngle);
  out.y = Math.cos(hourAngle) * Math.SQRT1_2;
  out.z = Math.cos(hourAngle) * Math.SQRT1_2;
  // Broad twilight keeps dusk/dawn legible, without pretending to reproduce
  // RimWorld's latitude-dependent, non-astronomical glow corrections exactly.
  out.daylight = smooth(-0.24, 0.3, out.y);
  out.warmth = smooth(-0.12, 0.04, out.y) * (1 - smooth(0.08, 0.42, out.y));
  out.sunlight = smooth(0, 0.32, out.y);
  out.moonlight = smooth(0.04, 0.32, -out.y) * 0.22;
  return out;
}

/** Seasonal local direction shares the chosen site's calendar and latitude.
 * Ambient intensity and the opposite moon are artistic, not gameplay inputs. */
export function sampleSeasonalDaylight(civilTick:number,out:DaylightSample):DaylightSample {
  const tick=((civilTick%TICKS_PER_YEAR)+TICKS_PER_YEAR)%TICKS_PER_YEAR;
  const angle=(tick%TICKS_PER_DAY/TICKS_PER_DAY-.5)*Math.PI*2;
  const season=-Math.cos(Math.floor(tick/TICKS_PER_DAY)/60*Math.PI*2)*.2;
  const latitude=TEMPERATE_CLIMATE.latitude*Math.PI/180,scale=1/Math.sqrt(1+season*season);
  out.x=-Math.sin(angle)*scale;
  out.y=(Math.cos(angle)*Math.cos(latitude)+season*Math.sin(latitude))*scale;
  out.z=(Math.cos(angle)*Math.sin(latitude)-season*Math.cos(latitude))*scale;
  out.daylight=seasonalNaturalLight(TEMPERATE_CLIMATE.latitude,tick);
  out.warmth=smooth(-.12,.04,out.y)*(1-smooth(.08,.42,out.y));
  out.sunlight=smooth(0,.32,out.y);
  out.moonlight=smooth(.04,.32,-out.y)*.22;
  return out;
}
