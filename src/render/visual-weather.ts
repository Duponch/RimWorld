import type { WeatherKind } from '../sim/weather-definitions';
import type { WeatherState } from '../sim/weather';

type CloudStyle = Readonly<{ coverage: number; opacity: number; color: number }>;

/** Artistic sky coverage for the eight V87 Core weather states. This table has
 * no effect on weather weights, light, temperature, wind power or saves. */
const CLOUD_STYLE: Readonly<Record<WeatherKind, CloudStyle>> = {
  clear: { coverage: .24, opacity: .56, color: 0xf5f3e9 },
  fog: { coverage: .52, opacity: .64, color: 0xc2cbd0 },
  rain: { coverage: .74, opacity: .72, color: 0x9da9b5 },
  'dry-thunderstorm': { coverage: .84, opacity: .76, color: 0x7e8a9e },
  'rainy-thunderstorm': { coverage: .96, opacity: .80, color: 0x687587 },
  'foggy-rain': { coverage: .88, opacity: .76, color: 0x9099a3 },
  'snow-gentle': { coverage: .66, opacity: .70, color: 0xd9dfe2 },
  'snow-hard': { coverage: .90, opacity: .76, color: 0xaab8c6 },
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const blend = (a: number, b: number, t: number): number => a + (b - a) * t;

function blendColor(a: number, b: number, t: number): number {
  let result = 0;
  for (const shift of [16, 8, 0]) {
    const channel = Math.round(blend((a >>> shift) & 255, (b >>> shift) & 255, t));
    result |= channel << shift;
  }
  return result;
}

/** Uses the same 4,000 Core tick transition as V87 weather coefficients. */
export function visualCloudAppearance(weather?: Pick<WeatherState, 'current' | 'previous' | 'ageCore'>): CloudStyle {
  if (!weather) return CLOUD_STYLE.clear;
  const previous = CLOUD_STYLE[weather.previous], current = CLOUD_STYLE[weather.current];
  const transition = clamp01(weather.ageCore / 4000);
  return {
    coverage: blend(previous.coverage, current.coverage, transition),
    opacity: blend(previous.opacity, current.opacity, transition),
    color: blendColor(previous.color, current.color, transition),
  };
}

function hash01(value: number): number {
  let x = value | 0;
  x = Math.imul(x ^ x >>> 16, 0x7feb352d);
  x = Math.imul(x ^ x >>> 15, 0x846ca68b);
  return ((x ^ x >>> 16) >>> 0) / 4294967296;
}

/** Shared visual wind bearing in the XZ plane. Fractional confirmed ticks are
 * accepted; no wall clock or gameplay RNG is read. The slow sway is continuous
 * through pauses, speed changes and save reloads. */
export function visualWindDirection(seed: number, tick: number): { x: number; z: number } {
  const base = hash01(seed ^ 0x53b9a0d7) * Math.PI * 2;
  const phase = hash01(seed ^ 0x6ac17e39) * Math.PI * 2;
  const angle = base + Math.sin(tick / 7300 + phase) * .22 + Math.sin(tick / 19800 + phase * 1.7) * .09;
  return { x: Math.cos(angle), z: Math.sin(angle) };
}
