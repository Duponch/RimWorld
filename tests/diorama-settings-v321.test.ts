import { expect, test } from 'vitest';
import { DEFAULT_DIORAMA_ENABLED, dioramaEnabled } from '../src/render/diorama-settings';

test('the diorama is enabled when the browser has no valid preference', () => {
  expect(DEFAULT_DIORAMA_ENABLED).toBe(true);
  for (const value of [null, undefined, '', 'bad', 'False', '0', 0, NaN, {}, []]) {
    expect(dioramaEnabled(value)).toBe(true);
  }
});

test('an explicit disabled preference survives reading without truthy string coercion', () => {
  expect(dioramaEnabled('false')).toBe(false);
  expect(dioramaEnabled(false)).toBe(false);
  expect(dioramaEnabled('true')).toBe(true);
  expect(dioramaEnabled(true)).toBe(true);
});
