import { describe, expect, it } from 'vitest';
import { DEFAULT_LIGHTING_SETTINGS, LIGHTING_PREFERENCE_KEY, lightingPercentLabel, parseLightingSettings } from '../src/render/lighting-settings';

describe('independent browser lighting preferences', () => {
  it('uses fresh defaults for absent, invalid or non-object JSON', () => {
    expect(LIGHTING_PREFERENCE_KEY).toBe('lisiere.presentation.lighting.v1');
    for (const value of [undefined, null, '', '{bad', 'null', '[]', '3', 'true', [], 0, true]) {
      expect(parseLightingSettings(value)).toEqual({ sun: 1, moon: 1, ambient: 1 });
    }
    const parsed = parseLightingSettings(null); parsed.sun = 0;
    expect(DEFAULT_LIGHTING_SETTINGS.sun).toBe(1); expect(parseLightingSettings(null).sun).toBe(1);
  });

  it('keeps explicit zeroes and independent finite factors through JSON persistence', () => {
    const settings = { sun: 0, moon: 2.5, ambient: .75 };
    expect(parseLightingSettings(JSON.stringify(settings))).toEqual(settings);
    expect(parseLightingSettings(settings)).toEqual(settings);
  });

  it('clamps finite out-of-range values and defaults only invalid fields', () => {
    expect(parseLightingSettings({ sun: -7, moon: 8, ambient: .25 })).toEqual({ sun: 0, moon: 3, ambient: .25 });
    expect(parseLightingSettings({ sun: NaN, moon: Infinity, ambient: -Infinity })).toEqual({ sun: 1, moon: 1, ambient: 1 });
    expect(parseLightingSettings({ sun: '0', moon: false, ambient: null })).toEqual({ sun: 1, moon: 1, ambient: 1 });
    expect(parseLightingSettings('{"moon":0,"ambient":2}')).toEqual({ sun: 1, moon: 0, ambient: 2 });
  });

  it('does not mutate supplied settings and formats the full UI range in percent', () => {
    const input = Object.freeze({ sun: .75, moon: 1.15, ambient: 3 });
    const parsed = parseLightingSettings(input); expect(parsed).not.toBe(input); expect(parsed).toEqual(input);
    expect([0, .05, 1, 1.15, 3].map(lightingPercentLabel)).toEqual(['0 %', '5 %', '100 %', '115 %', '300 %']);
  });
});
