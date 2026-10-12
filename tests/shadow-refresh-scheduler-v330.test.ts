import { expect, test } from 'vitest';
import { ShadowRefreshScheduler } from '../src/render/ShadowRefreshScheduler';

test('only a completed pass permits reuse; refused passes and urgent changes remain due', () => {
  const scheduler = new ShadowRefreshScheduler();
  expect(scheduler.shouldRefresh(0, true)).toBe(true);
  scheduler.capture(0, false); expect(scheduler.shouldRefresh(1, true)).toBe(true);
  scheduler.capture(1, true); expect(scheduler.shouldRefresh(2, true)).toBe(false);
  expect(scheduler.shouldRefresh(2, false)).toBe(false);
  scheduler.invalidate(); expect(scheduler.shouldRefresh(2, true)).toBe(true);
  scheduler.capture(2, true); scheduler.capture(20, false);
  expect(scheduler.shouldRefresh(21, false)).toBe(true);
});

test('frequency choices retain their cadence at 240 Hz and non-divisible 144 Hz without long-term drift', () => {
  for (const rate of [240, 144]) for (const frequency of [30, 60, 120] as const) {
    const scheduler = new ShadowRefreshScheduler({ frequency, resolution: 2048 }); scheduler.capture(0, true);
    const refreshes: number[] = [];
    for (let frame = 1; frame <= rate; frame++) {
      const now = frame * 1000 / rate;
      if (scheduler.shouldRefresh(now, false)) { refreshes.push(now); scheduler.capture(now, true); }
    }
    expect(refreshes).toHaveLength(frequency);
    refreshes.forEach((now, index) => {
      expect(now + 1e-6).toBeGreaterThanOrEqual((index + 1) * 1000 / frequency);
      expect(now).toBeLessThan((index + 1) * 1000 / frequency + 1000 / rate + 1e-6);
    });
  }
});

test('long pauses retain a completed atlas; resume refreshes once without catch-up and maximum remains per image', () => {
  const scheduler = new ShadowRefreshScheduler(); scheduler.capture(0, true);
  expect(scheduler.shouldRefresh(100000, true)).toBe(false);
  expect(scheduler.shouldRefresh(100000, false)).toBe(true); scheduler.capture(100000, true);
  expect(scheduler.shouldRefresh(100001, false)).toBe(false);
  expect(scheduler.setFrequency(0)).toBe(true); expect(scheduler.shouldRefresh(100001, true)).toBe(true);
  scheduler.capture(100001, true); expect(scheduler.shouldRefresh(100002, true)).toBe(false);
  expect(scheduler.shouldRefresh(100002, false)).toBe(true);
  scheduler.capture(100002, true); expect(scheduler.shouldRefresh(100003, false)).toBe(true);
});

test('settings changes, invalid clocks and clock rollback cannot reuse a stale atlas', () => {
  const scheduler = new ShadowRefreshScheduler({ frequency: 30, resolution: 512 }); scheduler.capture(100, true);
  expect(scheduler.setSettings({ frequency: 30, resolution: 512 })).toBe(false);
  expect(scheduler.shouldRefresh(101, false)).toBe(false);
  expect(scheduler.shouldRefresh(99, true)).toBe(true); scheduler.capture(99, true);
  expect(scheduler.shouldRefresh(100, true)).toBe(true); scheduler.capture(100, true);
  for (const now of [NaN, Infinity, -Infinity]) {
    expect(scheduler.shouldRefresh(now, true)).toBe(true); scheduler.capture(now, true);
    expect(scheduler.shouldRefresh(101, true)).toBe(true); scheduler.capture(101, true);
  }
  expect(scheduler.setSettings({ frequency: 30, resolution: 4096 })).toBe(true);
  expect(scheduler.shouldRefresh(102, true)).toBe(true); scheduler.capture(102, true);
  expect(scheduler.setFrequency(120)).toBe(true); expect(scheduler.shouldRefresh(102, true)).toBe(true);
});
