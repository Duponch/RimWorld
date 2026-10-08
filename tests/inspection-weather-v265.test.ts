import { expect, test } from 'vitest';
import { weatherConditionInspection, weatherConditionLabel } from '../src/ui/weather-inspection';
import { TICKS_PER_DAY } from '../src/sim/types';

type WeatherWorld = Parameters<typeof weatherConditionInspection>[0];
function world(tick = 2000): WeatherWorld {
  return { tick, miscIncidents: {
    profile: 'cassandra-misc-v1', adoptedAt: 0, rng: 1, nextCheck: 3000, introDone: true,
    checks: 1, opportunities: 1, heatwaves: 0,
    weather: { adoptedAt: 0, coldSnaps: 1, eclipses: 1,
      lastColdSnapStart: 1000, lastEclipseStart: 1000,
      coldSnap: { start: 1000, end: 1000 + TICKS_PER_DAY }, eclipse: { start: 1000, end: 1000 + TICKS_PER_DAY } },
  } };
}

test('simultaneous conditions preserve both warnings and project time without changing the snapshot', () => {
  const w = world(), before = JSON.stringify(w), rows = weatherConditionInspection(w);
  expect(rows.map(row => row.kind)).toEqual(['cold-snap', 'eclipse']);
  expect(rows[0]!.summary).toContain('reste 20 h');
  expect(rows[1]!.summary).toBe('Éclipse · reste 20 h');
  expect(weatherConditionLabel(w)).toBe('Vague de froid · Éclipse');
  expect(JSON.stringify(w)).toBe(before);
});

test('warnings distinguish human warming and plant protection from a guaranteed recovery', () => {
  const body = weatherConditionInspection(world())[0]!.body;
  expect(body).toContain('Un toit seul ne chauffe pas');
  expect(body).toContain('hypothermie'); expect(body).toContain('les pansements ne remplacent pas');
  expect(body).toContain('température et une lumière suffisantes');
  expect(body).toContain('ne rend pas les plantes perdues');
});

test('eclipse guidance preserves electrical supply and ordinary horticultural hours', () => {
  const body = weatherConditionInspection(world())[1]!.body;
  expect(body).toContain('production des panneaux solaires est réduite');
  expect(body).toContain('batteries'); expect(body).toContain('combustible');
  expect(body).toContain('ne sont pas directement neutralisés');
  expect(body).toContain('dans leur horaire'); expect(body).toContain('ne change pas l’heure');
});

test('start is included and end excluded, including a paused snapshot at the boundary', () => {
  expect(weatherConditionInspection(world(999))).toEqual([]);
  expect(weatherConditionInspection(world(1000))).toHaveLength(2);
  const w = world(1000 + TICKS_PER_DAY);
  expect(weatherConditionInspection(w)).toEqual([]); expect(weatherConditionInspection(w)).toEqual([]);
  expect(weatherConditionLabel(w)).toBe('');
});

test('historical worlds and histories without active intervals show no weather condition', () => {
  expect(weatherConditionInspection({ tick: 2000 })).toEqual([]);
  const w = world(); delete w.miscIncidents!.weather;
  expect(weatherConditionInspection(w)).toEqual([]);
  const ended = world(); delete ended.miscIncidents!.weather!.coldSnap; delete ended.miscIncidents!.weather!.eclipse;
  expect(weatherConditionInspection(ended)).toEqual([]);
});
