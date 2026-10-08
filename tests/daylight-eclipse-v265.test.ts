import { expect, test } from 'vitest';
import { applyEclipseDaylight } from '../src/render/DayNightLayer';
import type { DaylightSample } from '../src/render/daylight';

type DaylightWorld = NonNullable<Parameters<typeof applyEclipseDaylight>[1]>;
const sample = (): DaylightSample => ({ x: .3, y: .6, z: .7, daylight: .8, warmth: .2, sunlight: .9, moonlight: .1 });
function world(): DaylightWorld {
  return {
    climate: { revision: 1, profile: 'temperate-reference', adoptedAt: 10000, calendarOrigin: 1500 },
    miscIncidents: {
      profile: 'cassandra-misc-v1', adoptedAt: 10000, rng: 1, nextCheck: 11000, introDone: true,
      checks: 1, opportunities: 1, heatwaves: 0,
      weather: { adoptedAt: 10000, coldSnaps: 0, eclipses: 1, lastEclipseStart: 10300, eclipse: { start: 10300, end: 10500 } },
    },
  };
}

test('historical and inactive worlds retain every daylight value exactly', () => {
  for (const w of [undefined, {}, world()]) {
    const out = sample(), before = { ...out };
    expect(applyEclipseDaylight(1700, w, out)).toBe(1);
    expect(out).toEqual(before);
  }
});

test('eclipse uses elapsed interval despite an adopted civil calendar and keeps celestial positions and moonlight', () => {
  const w = world(), before = JSON.stringify(w), out = sample();
  expect(applyEclipseDaylight(1900, w, out)).toBe(0); // elapsed10400
  expect(out).toEqual({ ...sample(), daylight: 0, warmth: 0, sunlight: 0 });
  expect(JSON.stringify(w)).toBe(before);
});

test('transition and exact end change light without moving the sun or changing the calendar', () => {
  const w = world(), start = sample(), half = sample(), end = sample();
  expect(applyEclipseDaylight(1800, w, start)).toBe(1); expect(start).toEqual(sample());
  expect(applyEclipseDaylight(1810, w, half)).toBe(.5);
  expect(half).toEqual({ ...sample(), daylight: .4, warmth: .1, sunlight: .45 });
  expect(applyEclipseDaylight(2000, w, end)).toBe(1); expect(end).toEqual(sample());
});
