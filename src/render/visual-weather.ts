import type { WeatherKind } from '../sim/weather-definitions';
import type { WeatherState } from '../sim/weather';

type CloudStyle = Readonly<{ coverage: number; opacity: number; color: number }>;

/** Artistic sky coverage for the eight V87 Core weather states. This table has
 * no effect on weather weights, light, temperature, wind power or saves. */
const CLOUD_STYLE: Readonly<Record<WeatherKind, CloudStyle>> = {
  clear: { coverage: .24, opacity: .98, color: 0xffe2aa },
  fog: { coverage: .70, opacity: .98, color: 0xe3cfaa },
  rain: { coverage: .88, opacity: .99, color: 0xccbaa0 },
  'dry-thunderstorm': { coverage: .94, opacity: .99, color: 0xaea08f },
  'rainy-thunderstorm': { coverage: 1, opacity: 1, color: 0x9e9488 },
  'foggy-rain': { coverage: .97, opacity: .99, color: 0xc5b6a1 },
  'snow-gentle': { coverage: .80, opacity: .99, color: 0xf4e8d0 },
  'snow-hard': { coverage: .97, opacity: 1, color: 0xded2bd },
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
