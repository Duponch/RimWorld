import { expect, test } from 'vitest';
import { ambientCameraGain } from '../src/audio/ambience';

test('global weather softens as either camera rises without vanishing', () => {
  const perspectiveNear = ambientCameraGain({ x: 0, y: 2, z: 0, mode: 'perspective' });
  const perspectiveFar = ambientCameraGain({ x: 0, y: 52, z: 0, mode: 'perspective' });
  const isoNear = ambientCameraGain({ x: 0, y: 40, z: 40, targetX: 0, targetZ: 0,
    span: 16, mode: 'orthographic' });
  const isoFar = ambientCameraGain({ x: 0, y: 40, z: 40, targetX: 0, targetZ: 0,
    span: 120, mode: 'orthographic' });
  expect(perspectiveNear).toBe(1);
  expect(perspectiveFar).toBeLessThan(perspectiveNear);
  expect(isoFar).toBeLessThan(isoNear);
  expect(isoFar).toBeGreaterThanOrEqual(0.15);
});
