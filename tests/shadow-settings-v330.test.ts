import { expect, test } from 'vitest';
import { DEFAULT_SHADOW_SETTINGS, parseShadowSettings, SHADOW_FREQUENCY_OPTIONS, SHADOW_RESOLUTION_OPTIONS } from '../src/render/shadow-settings';

test('shadow preferences preserve independent frequency and resolution choices, including per-frame maximum', () => {
  for (const { value: frequency } of SHADOW_FREQUENCY_OPTIONS) for (const { value: resolution } of SHADOW_RESOLUTION_OPTIONS) {
    expect(parseShadowSettings(JSON.stringify({ frequency, resolution }))).toEqual({ frequency, resolution });
  }
});

test('corrupt shadow preferences default each field independently and never retain caller ownership', () => {
  for (const value of [undefined, null, '', '{', [], 60, '60', false]) expect(parseShadowSettings(value)).toEqual(DEFAULT_SHADOW_SETTINGS);
  expect(parseShadowSettings({ frequency: 120, resolution: '4096' })).toEqual({ frequency: 120, resolution: 2048 });
  expect(parseShadowSettings({ frequency: NaN, resolution: 512 })).toEqual({ frequency: 60, resolution: 512 });
  expect(parseShadowSettings({ frequency: Infinity, resolution: 2049 })).toEqual(DEFAULT_SHADOW_SETTINGS);
  const source = { frequency: 30 as const, resolution: 1024 as const }, parsed = parseShadowSettings(source);
  expect(parsed).not.toBe(source); parsed.frequency = 0;
  expect(source.frequency).toBe(30); expect(parseShadowSettings(null)).not.toBe(DEFAULT_SHADOW_SETTINGS);
});
