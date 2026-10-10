import { describe, expect, test } from 'vitest';
import { isWheelScrollRegion } from '../src/ui/map-wheel';

describe('wheel ownership above the map', () => {
  const fits = { clientWidth: 120, clientHeight: 80, scrollWidth: 120, scrollHeight: 80 };
  test('fitting auto wrappers do not block camera zoom', () => {
    expect(isWheelScrollRegion(fits, { overflowX: 'auto', overflowY: 'auto' })).toBe(false);
    expect(isWheelScrollRegion({ ...fits, scrollHeight: 100 }, { overflowX: 'visible', overflowY: 'visible' })).toBe(false);
  });
  test('both vertical and horizontal scroll panes retain the wheel', () => {
    expect(isWheelScrollRegion({ ...fits, scrollHeight: 100 }, { overflowX: 'hidden', overflowY: 'auto' })).toBe(true);
    expect(isWheelScrollRegion({ ...fits, scrollWidth: 160 }, { overflowX: 'scroll', overflowY: 'hidden' })).toBe(true);
  });
  test('clipped content is not a usable scroll region', () => {
    expect(isWheelScrollRegion({ ...fits, scrollWidth: 160, scrollHeight: 100 }, { overflowX: 'clip', overflowY: 'hidden' })).toBe(false);
  });
});
