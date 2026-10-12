import { expect, test } from 'vitest';
import { OrthographicCamera, Scene, Vector3 } from 'three/webgpu';
import { DayNightLayer } from '../src/render/DayNightLayer';
import { RoomLayer } from '../src/render/RoomLayer';
import { RoomLighting } from '../src/render/RoomLighting';
import { sampleDaylight } from '../src/render/daylight';
import { TICKS_PER_DAY } from '../src/sim/types';
import { SHADOW_RESOLUTION_OPTIONS } from '../src/render/shadow-settings';

const sample = (tick: number) => sampleDaylight(tick,
  { x: 0, y: 0, z: 0, daylight: 0, warmth: 0, sunlight: 0, moonlight: 0 });
function camera() {
  const view = new OrthographicCamera(-35, 35, 35, -35, .1, 1000);
  view.position.set(85, 95, 105); view.lookAt(49.5, 0, 49.5); view.updateMatrixWorld(); return view;
}
function projection(light: DayNightLayer['light'] | RoomLighting['shadowLight']) {
  const shadow = light.shadow;
  return { matrix: shadow.matrix.toArray(), cameraWorld: shadow.camera.matrixWorld.toArray(),
    cameraProjection: shadow.camera.projectionMatrix.toArray(), bias: shadow.bias,
    normalBias: shadow.normalBias, intensity: shadow.intensity, size: shadow.mapSize.toArray() };
}

test('room skips retain the actual atlas source and projection while globe positions, light powers and colors remain live', () => {
  const room = new RoomLayer(new Scene()), view = camera(); room.configure(100, 100, 7);
  try {
    room.present(sample(TICKS_PER_DAY * .45), view, true);
    const oldSource = room.lighting.shadowLight.position.clone(), oldProjection = projection(room.lighting.shadowLight);
    const oldSun = room.lighting.sun.position.clone(), oldPower = room.lighting.sun.intensity, version = room.lighting.version;
    room.lighting.shadowLight.shadow.needsUpdate = false; // Completed-pass input to this CPU owner test.
    const later = sample(TICKS_PER_DAY * .65);
    room.present(later, view, false);
    expect(room.lighting.sun.position.equals(oldSun)).toBe(false);
    expect(room.lighting.sun.intensity).not.toBe(oldPower); expect(room.lighting.version).toBeGreaterThan(version);
    expect(room.lighting.shadowLight.position.equals(oldSource)).toBe(true);
    expect(projection(room.lighting.shadowLight)).toEqual(oldProjection);
    expect(room.lighting.shadowLight.shadow.needsUpdate).toBe(false);
    // The due frame can have the same sample as the preceding skipped frame.
    const liveVersion = room.lighting.version;
    room.present(later, view, true);
    expect(room.lighting.version).toBe(liveVersion);
    expect(room.lighting.shadowLight.position.equals(oldSource)).toBe(false);
    expect(projection(room.lighting.shadowLight)).not.toEqual(oldProjection);
    expect(room.lighting.shadowLight.shadow.needsUpdate).toBe(true);
  } finally { room.dispose(); }
});

test('ordinary daylight moves the real emitter without changing the retained shadow matrix until the due fit', () => {
  const day = new DayNightLayer(new Scene()), view = camera(), target = new Vector3(49.5, 0, 49.5);
  try {
    day.configureShadow(100, 100); day.update(TICKS_PER_DAY * .45, target); day.fitShadow(view);
    const oldProjection = projection(day.light), oldPosition = day.light.position.clone(), oldIntensity = day.light.intensity;
    day.update(TICKS_PER_DAY * .74, target);
    expect(day.light.position.equals(oldPosition)).toBe(false); expect(day.light.intensity).not.toBe(oldIntensity);
    expect(projection(day.light)).toEqual(oldProjection);
    day.fitShadow(view); expect(projection(day.light)).not.toEqual(oldProjection);
  } finally { day.dispose(); }
});

test('independent resolution choices invalidate both native projections without replacing lights or shared nodes', () => {
  const day = new DayNightLayer(new Scene()), room = new RoomLighting(), view = camera();
  try {
    const dayLight = day.light, roomLight = room.shadowLight, node = room.shadowNode;
    day.configureShadow(100, 100); day.update(TICKS_PER_DAY / 2, new Vector3(49.5, 0, 49.5)); day.fitShadow(view);
    room.configure(100, 100); room.sync(new Vector3(20, 90, -30), new Vector3(80, 85, -35), sample(TICKS_PER_DAY / 2), 100);
    room.fitShadow(view, 100, 100);
    for (const { value: resolution } of SHADOW_RESOLUTION_OPTIONS) {
      dayLight.shadow.needsUpdate = roomLight.shadow.needsUpdate = false;
      day.setShadowSettings({ frequency: 60, resolution }); room.setShadowSettings({ frequency: 60, resolution });
      expect(dayLight.shadow.mapSize.toArray()).toEqual([resolution, resolution]);
      expect(roomLight.shadow.mapSize.toArray()).toEqual([resolution, resolution]);
      expect(dayLight.shadow.needsUpdate).toBe(true); expect(roomLight.shadow.needsUpdate).toBe(true);
      day.fitShadow(view); room.fitShadow(view, 100, 100);
      expect(day.light).toBe(dayLight); expect(room.shadowLight).toBe(roomLight); expect(room.shadowNode).toBe(node);
      dayLight.shadow.needsUpdate = roomLight.shadow.needsUpdate = false;
      day.setShadowSettings({ frequency: 0, resolution }); room.setShadowSettings({ frequency: 0, resolution });
      expect(dayLight.shadow.needsUpdate).toBe(false); expect(roomLight.shadow.needsUpdate).toBe(false);
    }
  } finally { day.dispose(); room.dispose(); }
});

test('explicit every-image refresh retains the legacy default owner path over solar and lunar source changes', () => {
  const original = new RoomLayer(new Scene()), maximum = new RoomLayer(new Scene()), view = camera();
  original.configure(100, 100, 7); maximum.configure(100, 100, 7);
  try {
    maximum.setShadowSettings({ frequency: 0, resolution: 2048 });
    for (const tick of [TICKS_PER_DAY * .25, TICKS_PER_DAY * .5, TICKS_PER_DAY * .75, TICKS_PER_DAY]) {
      const daylight = sample(tick); original.present(daylight, view); maximum.present(daylight, view, true);
      expect(projection(maximum.lighting.shadowLight)).toEqual(projection(original.lighting.shadowLight));
      expect(maximum.lighting.shadowLight.position).toEqual(original.lighting.shadowLight.position);
      expect(maximum.lighting.sun.position).toEqual(original.lighting.sun.position);
      expect(maximum.lighting.moon.position).toEqual(original.lighting.moon.position);
      expect(maximum.lighting.sun.intensity).toBe(original.lighting.sun.intensity);
      expect(maximum.lighting.moon.intensity).toBe(original.lighting.moon.intensity);
    }
  } finally { original.dispose(); maximum.dispose(); }
});
