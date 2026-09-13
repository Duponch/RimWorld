import { expect, test } from 'vitest';
import { FrameMetrics } from '../src/render/FrameMetrics';

test('frame telemetry measures real cadence, counts stalls and resets hidden/resumed windows without growing memory', () => {
  const metrics = new FrameMetrics(); let now = 0;
  metrics.record(now);
  for (let i = 0; i < 12000; i++) metrics.record(now += 1000 / 120);
  expect(metrics.fps).toBeCloseTo(120, 5); expect(metrics.meanMs).toBeCloseTo(1000 / 120, 5);
  metrics.record(now += 1000); expect(metrics.fps).toBeLessThan(90);
  metrics.record(now += 60000, true); expect(metrics.fps).toBe(0);
  metrics.record(now += 60000);
  for (let i = 0; i < 60; i++) metrics.record(now += 1000 / 60);
  expect(metrics.fps).toBeCloseTo(60, 5); expect(metrics.p95Ms).toBeCloseTo(1000 / 60, 5);
  metrics.reset(); metrics.record(now); metrics.record(now); metrics.record(NaN);
  expect(metrics.fps).toBe(0);
  metrics.record(now);
  for (let i = 0; i < 1000; i++) metrics.record(now += 1);
  expect(metrics.fps).toBe(1000);
});
