import { expect, test, vi } from 'vitest';
import { Color, Frustum, HemisphereLight, Matrix4, PointLight, Scene, Vector3 } from 'three/webgpu';
import { RoomLighting } from '../src/render/RoomLighting';
import { CameraRig } from '../src/render/CameraRig';
import { clippedMapPlane } from '../src/render/DayNightLayer';
import { sampleDaylight, type DaylightSample } from '../src/render/daylight';
import { TICKS_PER_DAY } from '../src/sim/types';
import { WORLD_SCALE } from '../src/world/scale';

const sample = (tick: number): DaylightSample => sampleDaylight(tick,
  { x: 0, y: 0, z: 0, daylight: 0, warmth: 0, sunlight: 0, moonlight: 0 });
const sunPos = new Vector3(90, 85, -35), moonPos = new Vector3(175, 78, -30);

test('each scene receives two physical globes and one unshadowed hemisphere; the shared projection stays off-scene', () => {
  const lighting = new RoomLighting(), game = new Scene(), room = new Scene();
  try {
    lighting.attach(game, room); lighting.attach(game, room);
    expect(game.children).toEqual([lighting.sun, lighting.moon, lighting.ambient]);
    expect(room.children).toEqual([lighting.roomSun, lighting.roomMoon, lighting.roomAmbient]);
    expect([lighting.sun, lighting.moon, lighting.roomSun, lighting.roomMoon].every(light => light instanceof PointLight)).toBe(true);
    expect(lighting.ambient).toBeInstanceOf(HemisphereLight); expect(lighting.roomAmbient).toBeInstanceOf(HemisphereLight);
    expect(lighting.ambient.castShadow).toBe(false); expect(lighting.roomAmbient.castShadow).toBe(false);
    expect(lighting.shadowLight.parent).toBeNull(); expect(lighting.shadowLight.target.parent).toBeNull();
    expect(lighting.shadowLight.intensity).toBe(0);
    expect(lighting.shadowLight.shadow.mapSize.toArray()).toEqual([2048, 2048]);
    expect(lighting.shadowLight.shadow.camera.isPerspectiveCamera).toBe(true);
    expect(lighting.sun.castShadow && lighting.moon.castShadow).toBe(true);
    expect(lighting.roomLights.every(light => !light.castShadow)).toBe(true);
    for (const light of [lighting.sun, lighting.moon])
      expect((light.shadow as unknown as { shadowNode: unknown }).shadowNode).toBe(lighting.shadowNode);
  } finally { lighting.dispose(); }
  expect(game.children).toEqual([]); expect(room.children).toEqual([]);
});

test('paused inputs keep the same uniforms, version and shared shadow node', () => {
  const lighting = new RoomLighting(), noon = sample(TICKS_PER_DAY / 2);
  try {
    lighting.configure(250, 250);
    const node = lighting.shadowNode, sun = lighting.sun, color = sun.color;
    const ambient = lighting.ambient, sky = ambient.color, ground = ambient.groundColor;
    const version = lighting.sync(sunPos, moonPos, noon, 250);
    expect(version).toBeGreaterThan(0);
    for (let i = 0; i < 8; i++) expect(lighting.sync(sunPos, moonPos, noon, 250)).toBe(version);
    expect(lighting.sun).toBe(sun); expect(lighting.sun.color).toBe(color); expect(lighting.shadowNode).toBe(node);
    expect(lighting.ambient).toBe(ambient); expect(ambient.color).toBe(sky); expect(ambient.groundColor).toBe(ground);
    expect(lighting.sun.position).toEqual(sunPos); expect(lighting.moon.position).toEqual(moonPos);
    for (const [game, room] of [[lighting.sun, lighting.roomSun], [lighting.moon, lighting.roomMoon]]) {
      expect(room!.position).toEqual(game!.position); expect(room!.intensity).toBe(game!.intensity);
      expect(room!.color).toEqual(game!.color);
    }
    expect(lighting.roomAmbient.intensity).toBe(ambient.intensity);
    expect(lighting.roomAmbient.color).toEqual(sky); expect(lighting.roomAmbient.groundColor).toEqual(ground);
  } finally { lighting.dispose(); }
});

test('distance-squared power scaling keeps normalized irradiance constant', () => {
  const lighting = new RoomLighting(), dusk = sample(TICKS_PER_DAY * .74);
  try {
    const center = new Vector3(49.5, 0, 49.5), largeCenter = new Vector3(99.5, 0, 99.5);
    const smallSun = center.clone().add(new Vector3(-20, 55, -45));
    const smallMoon = center.clone().add(new Vector3(30, 50, -40));
    lighting.configure(100, 100); lighting.sync(smallSun, smallMoon, dusk, 100);
    const sunPower = lighting.sun.intensity, moonPower = lighting.moon.intensity;
    const ambientPower = lighting.ambient.intensity;
    lighting.configure(200, 200);
    lighting.sync(smallSun.clone().sub(center).multiplyScalar(2).add(largeCenter),
      smallMoon.clone().sub(center).multiplyScalar(2).add(largeCenter), dusk, 200);
    expect(lighting.sun.intensity).toBeCloseTo(sunPower * 4, 8);
    expect(lighting.moon.intensity).toBeCloseTo(moonPower * 4, 8);
    expect(lighting.ambient.intensity).toBe(ambientPower);
    expect(lighting.sun.decay).toBe(2); expect(lighting.sun.distance).toBe(0);
  } finally { lighting.dispose(); }
});

test('noon remains brighter than the early sunlight plateau, with bounded central power', () => {
  const lighting = new RoomLighting(), center = new Vector3(124.5, 0, 124.5);
  try {
    lighting.configure(250, 250);
    const morning = sample(TICKS_PER_DAY * .33), evening = sample(TICKS_PER_DAY * .67);
    expect(morning.sunlight).toBe(1); expect(evening.sunlight).toBe(1);
    lighting.sync(sunPos, moonPos, morning, 250); const morningPower = lighting.sun.intensity;
    lighting.sync(sunPos, moonPos, evening, 250); const eveningPower = lighting.sun.intensity;
    lighting.sync(sunPos, moonPos, sample(TICKS_PER_DAY * .5), 250);
    expect(lighting.sun.intensity).toBeGreaterThan(morningPower * 1.4);
    expect(lighting.sun.intensity).toBeGreaterThan(eveningPower * 1.4);
    expect(morningPower).toBeCloseTo(eveningPower, 8);
    const centralPower = lighting.sun.intensity / sunPos.distanceToSquared(center);
    expect(centralPower).toBeGreaterThan(1.6); expect(centralPower).toBeLessThanOrEqual(2);
  } finally { lighting.dispose(); }
});

test('day and night share a soft hemisphere with readable night power and distinct reflected colors', () => {
  const lighting = new RoomLighting();
  try {
    lighting.configure(250, 250); lighting.sync(sunPos, moonPos, sample(TICKS_PER_DAY / 2), 250);
    expect(lighting.ambient.intensity).toBeCloseTo(1.65, 12);
    expect(lighting.ambient.color).toEqual(new Color(0xfff2dd));
    expect(lighting.ambient.groundColor).toEqual(new Color(0xd4d1be));
    lighting.sync(sunPos, moonPos, sample(0), 250);
    expect(lighting.ambient.intensity).toBeCloseTo(.82, 12);
    expect(lighting.ambient.color).toEqual(new Color(0xbdcfe7));
    expect(lighting.ambient.groundColor).toEqual(new Color(0x889bab));
    expect(lighting.roomAmbient.intensity).toBe(lighting.ambient.intensity);
    expect(lighting.roomAmbient.color).toEqual(lighting.ambient.color);
    expect(lighting.roomAmbient.groundColor).toEqual(lighting.ambient.groundColor);
    expect(lighting.moon.intensity).toBeGreaterThan(0);
  } finally { lighting.dispose(); }
});

test('rectangular map centers are available on the first sync without requiring a shadow fit', () => {
  const a = new RoomLighting(), b = new RoomLighting(), noon = sample(TICKS_PER_DAY / 2);
  try {
    a.configure(250, 96); b.configure(96, 250);
    const centerA = new Vector3(124.5, 0, 47.5), centerB = new Vector3(47.5, 0, 124.5);
    a.sync(centerA.clone().add(new Vector3(20, 60, -35)), centerA.clone().add(new Vector3(-30, 70, -40)), noon, 96);
    b.sync(centerB.clone().add(new Vector3(20, 60, -35)), centerB.clone().add(new Vector3(-30, 70, -40)), noon, 96);
    expect(a.sun.intensity).toBe(b.sun.intensity); expect(a.moon.intensity).toBe(b.moon.intensity);
    expect(a.sun.intensity).toBeCloseTo(2 * (20 ** 2 + 60 ** 2 + 35 ** 2), 8);
  } finally { a.dispose(); b.dispose(); }
});

test('paused controls immediately scale both scenes, extinguish sources and invalidate the backdrop version', () => {
  const lighting = new RoomLighting(), twilight = sample(TICKS_PER_DAY / 4);
  try {
    lighting.configure(250, 250); lighting.sync(sunPos, moonPos, twilight, 250);
    const baseline = [lighting.sun.intensity, lighting.moon.intensity, lighting.ambient.intensity];
    expect(baseline.every(power => power > 0)).toBe(true);
    const initialVersion = lighting.version, node = lighting.shadowNode;
    lighting.setSettings({ sun: .5, moon: 2, ambient: .25 });
    expect(lighting.version).toBe(initialVersion + 1);
    expect(lighting.sun.intensity).toBe(baseline[0]! * .5); expect(lighting.roomSun.intensity).toBe(lighting.sun.intensity);
    expect(lighting.moon.intensity).toBe(baseline[1]! * 2); expect(lighting.roomMoon.intensity).toBe(lighting.moon.intensity);
    expect(lighting.ambient.intensity).toBe(baseline[2]! * .25); expect(lighting.roomAmbient.intensity).toBe(lighting.ambient.intensity);
    const scaledVersion = lighting.version;
    lighting.setSettings({ sun: .5, moon: 2, ambient: .25 });
    expect(lighting.sync(sunPos, moonPos, twilight, 250)).toBe(scaledVersion);
    lighting.setSettings({ sun: 0, moon: 0, ambient: 0 });
    expect([lighting.sun, lighting.moon, lighting.ambient, ...lighting.roomLights].every(light => light.intensity === 0)).toBe(true);
    expect(lighting.version).toBe(scaledVersion + 1);
    lighting.setSettings({ sun: 1, moon: 1, ambient: 1 });
    expect([lighting.sun.intensity, lighting.moon.intensity, lighting.ambient.intensity]).toEqual(baseline);
    expect(lighting.shadowNode).toBe(node);
  } finally { lighting.dispose(); }
});

test('normalized controls are copied and the shared shadow follows actual scaled bulb power', () => {
  const lighting = new RoomLighting();
  try {
    lighting.configure(250, 250); lighting.sync(sunPos, moonPos, sample(TICKS_PER_DAY / 4), 250);
    const sunPower = lighting.sun.intensity, ambientPower = lighting.ambient.intensity;
    const controls = { sun: 4, moon: -1, ambient: NaN };
    lighting.setSettings(controls); controls.sun = 0;
    expect(lighting.sun.intensity).toBe(sunPower * 3); expect(lighting.moon.intensity).toBe(0);
    expect(lighting.ambient.intensity).toBe(ambientPower); expect(lighting.shadowLight.position).toEqual(sunPos);
    lighting.setSettings({ sun: 0, moon: 1, ambient: 1 });
    expect(lighting.shadowLight.position).toEqual(moonPos);
    expect(lighting.shadowLight.shadow.needsUpdate).toBe(true);
    lighting.setSettings({ sun: 1, moon: 0, ambient: 1 });
    expect(lighting.shadowLight.position).toEqual(sunPos);
  } finally { lighting.dispose(); }
});

test('noon, midnight and twilight use the confirmed sample without an independent clock', () => {
  const lighting = new RoomLighting();
  try {
    lighting.sync(sunPos, moonPos, sample(TICKS_PER_DAY / 2), 250);
    const dayPower = lighting.sun.intensity;
    expect(lighting.shadowLight.position).toEqual(sunPos);
    lighting.sync(sunPos, moonPos, sample(0), 250);
    expect(lighting.sun.intensity).toBe(0); expect(lighting.moon.intensity).toBeGreaterThan(0);
    expect(lighting.shadowLight.position).toEqual(moonPos);
    lighting.sync(sunPos, moonPos, sample(TICKS_PER_DAY / 4), 250);
    expect(lighting.sun.intensity + lighting.moon.intensity).toBeGreaterThan(0);
    const eclipsed = sample(TICKS_PER_DAY / 2);
    eclipsed.daylight *= .15; eclipsed.sunlight *= .15; eclipsed.warmth *= .15;
    lighting.sync(sunPos, moonPos, eclipsed, 250);
    expect(lighting.sun.intensity).toBeCloseTo(dayPower * .15, 8);
  } finally { lighting.dispose(); }
});

test('moving the active globe changes the shadow origin, not its resident node or atlas budget', () => {
  const lighting = new RoomLighting();
  try {
    const node = lighting.shadowNode, projection = lighting.shadowLight.shadow;
    lighting.sync(sunPos, moonPos, sample(TICKS_PER_DAY / 2), 250);
    projection.needsUpdate = false;
    lighting.sync(new Vector3(110, 95, -25), moonPos, sample(TICKS_PER_DAY / 2), 250);
    expect(lighting.shadowLight.position).toEqual(new Vector3(110, 95, -25));
    expect(projection.needsUpdate).toBe(true); expect(lighting.shadowNode).toBe(node);
    expect(projection.mapSize.toArray()).toEqual([2048, 2048]);
  } finally { lighting.dispose(); }
});

test('twilight shadow follows the stronger bulb even after the solar horizon crossing', () => {
  const lighting = new RoomLighting();
  try {
    const twilight = sample(TICKS_PER_DAY * .755);
    expect(twilight.y).toBeLessThan(0);
    lighting.sync(sunPos, moonPos, twilight, 250);
    expect(lighting.sun.intensity).toBeGreaterThan(lighting.moon.intensity);
    expect(lighting.shadowLight.position).toEqual(sunPos);
    lighting.sync(sunPos, moonPos, sample(TICKS_PER_DAY * .85), 250);
    expect(lighting.moon.intensity).toBeGreaterThan(lighting.sun.intensity);
    expect(lighting.shadowLight.position).toEqual(moonPos);
  } finally { lighting.dispose(); }
});

test('visible ground and canopy remain covered through zoom, pan and projection changes', () => {
  const lighting = new RoomLighting(), rig = new CameraRig(null), frustum = new Frustum(), matrix = new Matrix4();
  try {
    rig.configureMap(250, 250); rig.resize(1440, 900);
    lighting.sync(sunPos, moonPos, sample(TICKS_PER_DAY / 2), 250);
    for (const mode of ['orthographic', 'perspective'] as const) {
      rig.setMode(mode);
      for (const zoom of [1, 3.5]) {
        if (mode === 'orthographic') { rig.camera.zoom = zoom; rig.camera.updateProjectionMatrix(); }
        else rig.camera.position.sub(rig.controls.target).normalize().multiplyScalar(32 / zoom).add(rig.controls.target);
        rig.camera.updateMatrixWorld();
        expect(lighting.fitShadow(rig.camera, 250, 250)).toBe(true);
        matrix.multiplyMatrices(rig.camera.projectionMatrix, rig.camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix, rig.camera.coordinateSystem, rig.camera.reversedDepth);
        const visible = [...clippedMapPlane(frustum, 250, 250, WORLD_SCALE.waterSurface),
          ...clippedMapPlane(frustum, 250, 250, WORLD_SCALE.treeMaxHeight + 2)];
        expect(visible.length).toBeGreaterThan(0);
        for (const point of visible) {
          const projected = point.clone().project(lighting.shadowLight.shadow.camera);
          expect(Math.abs(projected.x)).toBeLessThanOrEqual(1.00001);
          expect(Math.abs(projected.y)).toBeLessThanOrEqual(1.00001);
          expect(projected.z).toBeGreaterThanOrEqual(-1.00001); expect(projected.z).toBeLessThanOrEqual(1.00001);
        }
      }
    }
  } finally { lighting.dispose(); rig.dispose(); }
});

test('close views crop the perspective atlas and identical paused fits do no geometry work', () => {
  const lighting = new RoomLighting(), rig = new CameraRig(null);
  try {
    rig.configureMap(250, 250); rig.resize(1440, 900);
    lighting.sync(sunPos, moonPos, sample(TICKS_PER_DAY / 2), 250);
    lighting.fitShadow(rig.camera, 250, 250);
    const view = lighting.shadowLight.shadow.camera.view!;
    expect(view.enabled).toBe(true); expect(view.width * view.height).toBeLessThan(4);
    const projection = lighting.shadowLight.shadow.camera.projectionMatrix.clone();
    const fit = vi.spyOn(lighting.shadowLight.shadow, 'updateMatrices');
    lighting.shadowLight.shadow.needsUpdate = false;
    expect(lighting.fitShadow(rig.camera, 250, 250)).toBe(true);
    expect(fit).not.toHaveBeenCalled(); expect(lighting.shadowLight.shadow.needsUpdate).toBe(false);
    expect(lighting.shadowLight.shadow.camera.projectionMatrix).toEqual(projection);
    rig.controls.target.add(new Vector3(25, 0, 20)); rig.camera.position.add(new Vector3(25, 0, 20));
    rig.camera.updateMatrixWorld(); lighting.fitShadow(rig.camera, 250, 250);
    expect(fit).toHaveBeenCalled();
  } finally { lighting.dispose(); rig.dispose(); }
});

test('a source inside the caster box disables false one-face shadows and disposal is idempotent', () => {
  const lighting = new RoomLighting(), rig = new CameraRig(null), game = new Scene(), room = new Scene();
  lighting.attach(game, room); rig.configureMap(32, 32);
  lighting.sync(new Vector3(16, 1, 16), new Vector3(20, 12, -10), sample(TICKS_PER_DAY / 2), 32);
  expect(lighting.fitShadow(rig.camera, 32, 32)).toBe(false);
  expect(lighting.shadowLight.shadow.intensity).toBe(0);
  const dispose = vi.spyOn(lighting.shadowNode, 'dispose');
  lighting.dispose(); lighting.dispose();
  expect(dispose).toHaveBeenCalledOnce(); expect(game.children).toEqual([]); expect(room.children).toEqual([]);
  rig.dispose();
});
