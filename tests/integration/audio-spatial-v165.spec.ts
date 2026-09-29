import { expect, test } from '@playwright/test';
import { audibleRange, listenerPose, SPATIAL_REF_DISTANCE, SPATIAL_ROLLOFF } from '../../src/audio/spatial';

test('V165 : le Panner réel descend progressivement près, à mi-distance et loin dans chaque caméra', async ({ page }) => {
  const cameras = {
    iso: { x: 20, y: 30, z: 0, targetX: 0, targetZ: 0, span: 32, mode: 'orthographic' as const },
    perspective: { x: 0, y: 4, z: 0, targetX: 0, targetZ: 0, span: 32, mode: 'perspective' as const },
  };
  const setup = Object.fromEntries(Object.entries(cameras).map(([mode, camera]) =>
    [mode, { pose: listenerPose(camera), range: audibleRange(16, camera) }]));
  const levels = await page.evaluate(async ({ setup, refDistance, rolloff }) => {
    const measure = async (pose: { x: number; y: number; z: number }, range: number, x: number) => {
      const frames = 4410;
      const context = new OfflineAudioContext(2, frames, 44100);
      const buffer = context.createBuffer(1, frames, 44100);
      buffer.getChannelData(0).fill(0.5);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const panner = context.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'exponential';
      panner.refDistance = refDistance;
      panner.maxDistance = range;
      panner.rolloffFactor = rolloff;
      panner.positionX.value = x;
      context.listener.positionX.value = pose.x;
      context.listener.positionY.value = pose.y;
      context.listener.positionZ.value = pose.z;
      const mix = context.createGain();
      mix.gain.value = 0.55 * 0.75;
      source.connect(panner).connect(mix).connect(context.destination);
      source.start();
      const rendered = await context.startRendering();
      let sum = 0;
      for (let channel = 0; channel < 2; channel++) {
        const samples = rendered.getChannelData(channel);
        for (let i = 200; i < frames - 200; i++) sum += samples[i]! ** 2;
      }
      return Math.sqrt(sum / (2 * (frames - 400)));
    };
    const result: Record<string, number[]> = {};
    for (const [mode, { pose, range }] of Object.entries(setup))
      result[mode] = await Promise.all([0, 16, 40].map(x => measure(pose, range, x)));
    return result;
  }, { setup, refDistance: SPATIAL_REF_DISTANCE, rolloff: SPATIAL_ROLLOFF });

  for (const mode of ['iso', 'perspective']) {
    const [near, middle, far] = levels[mode]!;
    expect(near).toBeGreaterThan(middle);
    expect(middle).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0.001);
    expect(far).toBeLessThan(0.02);
    expect(far).toBeLessThan(near * 0.25);
  }
});
