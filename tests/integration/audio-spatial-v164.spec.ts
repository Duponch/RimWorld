import { expect, test } from '@playwright/test';
import { audibleRange, listenerPose, type AudioCamera } from '../../src/audio/spatial';

test('V164 : le Panner Web Audio calme le travail iso à mi-distance sans étouffer le foyer', async ({ page }) => {
  const span = 32;
  const inclination = 2 / Math.hypot(0.85, 2, 0.9);
  const distance = span / (2 * Math.tan(Math.PI / 8));
  const camera: AudioCamera = {
    x: distance * Math.sqrt(1 - inclination ** 2), y: distance * inclination, z: 0,
    targetX: 0, targetZ: 0, span, mode: 'orthographic',
  };
  const poses = {
    iso: listenerPose(camera),
    perspective: listenerPose({ ...camera, mode: 'perspective' }),
  };
  const ranges = {
    mining: {
      iso: audibleRange(16, camera),
      perspective: audibleRange(16, { ...camera, mode: 'perspective' }),
    },
    wood: {
      iso: audibleRange(22, camera),
      perspective: audibleRange(22, { ...camera, mode: 'perspective' }),
    },
  };
  const energy = await page.evaluate(async ({ poses, ranges }) => {
    const measure = async (ear: { x: number; y: number; z: number }, sourceX: number, range: number) => {
      const length = 4410;
      const context = new OfflineAudioContext(2, length, 44100);
      const buffer = context.createBuffer(1, length, 44100);
      buffer.getChannelData(0).fill(0.5);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const panner = context.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'linear';
      panner.refDistance = 2;
      panner.maxDistance = range;
      panner.rolloffFactor = 1;
      panner.positionX.value = sourceX;
      context.listener.positionX.value = ear.x;
      context.listener.positionY.value = ear.y;
      context.listener.positionZ.value = ear.z;
      source.connect(panner).connect(context.destination);
      source.start();
      const rendered = await context.startRendering();
      let sum = 0;
      for (let channel = 0; channel < 2; channel++) {
        const samples = rendered.getChannelData(channel);
        for (let i = 200; i < length - 200; i++) sum += samples[i]! ** 2;
      }
      return Math.sqrt(sum / (2 * (length - 400)));
    };
    const result: Record<string, { nearIso: number; middleIso: number; middlePerspective: number; farIso: number }> = {};
    for (const kind of ['mining', 'wood'] as const) {
      result[kind] = {
        nearIso: await measure(poses.iso, 0, ranges[kind].iso),
        middleIso: await measure(poses.iso, 14, ranges[kind].iso),
        middlePerspective: await measure(poses.perspective, 14, ranges[kind].perspective),
        farIso: await measure(poses.iso, -40, ranges[kind].iso),
      };
    }
    return result;
  }, { poses, ranges });

  for (const kind of ['mining', 'wood']) {
    const measured = energy[kind]!;
    expect(measured.nearIso).toBeGreaterThan(0.15);
    expect(measured.middleIso).toBeLessThan(measured.nearIso * 0.7);
    expect(measured.middleIso).toBeLessThanOrEqual(measured.middlePerspective * 1.1);
    expect(measured.farIso).toBeLessThan(0.0001);
  }
});
