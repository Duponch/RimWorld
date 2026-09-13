import { expect, test } from 'vitest';
import { Plane, Raycaster, Scene, Vector2, Vector3 } from 'three/webgpu';
import { CameraRig } from '../src/render/CameraRig';
import { DayNightLayer } from '../src/render/DayNightLayer';
import { sampleDaylight, type DaylightSample } from '../src/render/daylight';
import { TICKS_PER_DAY } from '../src/sim/types';

test('les projections préservent cible, échelle et désignation du sol aux bornes de zoom et de carte', () => {
  const rig = new CameraRig(null), ray = new Raycaster(), plane = new Plane(new Vector3(0, 1, 0), 0);
  try {
    for (const [width, height] of [[32, 32], [250, 250], [325, 175]]) for (const aspect of [0.7, 1.44, 2.5]) {
      rig.setMode('orthographic'); rig.configureMap(width!, height!); rig.resize(1000 * aspect, 1000);
      for (const zoom of [rig.controls.minZoom, 1, rig.controls.maxZoom]) {
        rig.orthographic.zoom = zoom; rig.orthographic.updateProjectionMatrix(); rig.controls.update();
        const span = rig.span, target = rig.controls.target.clone(), direction = rig.camera.position.clone().sub(target).normalize();
        for (const mode of ['perspective', 'orthographic', 'perspective', 'orthographic'] as const) {
          rig.setMode(mode); rig.camera.updateMatrixWorld();
          expect(rig.controls.target.distanceTo(target)).toBeLessThan(1e-9);
          expect(rig.span).toBeCloseTo(span, 8);
          expect(rig.camera.position.clone().sub(target).normalize().distanceTo(direction)).toBeLessThan(1e-9);
          expect(target.clone().project(rig.camera).length()).toBeLessThan(1.01);
          for (const offset of [new Vector3(), new Vector3(1, 0, -1), new Vector3(-1, 0, 2)]) {
            const cell = target.clone().add(offset), projected = cell.clone().project(rig.camera);
            ray.setFromCamera(new Vector2(projected.x, projected.y), rig.camera);
            expect(ray.ray.intersectPlane(plane, new Vector3())!.distanceTo(cell)).toBeLessThan(1e-7);
          }
          expect(rig.pixelsPerCell(1000)).toBeGreaterThan(0);
          expect(Number.isFinite(rig.pixelsPerCell(1000))).toBe(true);
        }
      }
      // Full-map geometry stays in front of the ortho camera at all angles.
      for (const x of [0, width!]) for (const z of [0, height!]) {
        expect(new Vector3(x, 7, z).applyMatrix4(rig.camera.matrixWorldInverse).z).toBeLessThan(-rig.camera.near);
      }
    }
    rig.setMode('perspective');
    rig.camera.position.copy(rig.controls.target).add(new Vector3(0, 2, 100)); rig.controls.update();
    expect(rig.pixelsPerCell(1000)).toBeGreaterThan(100); // near canopy must not become an overview glyph
  } finally { rig.dispose(); }
});

test('ciel : horloge périodique, continuité minuit/crépuscule et ressources graphiques stables sur plusieurs jours', () => {
  const out: DaylightSample = { x: 0, y: 0, z: 0, daylight: 0, warmth: 0, sunlight: 0, moonlight: 0 };
  const scene = new Scene(), sky = new DayNightLayer(scene), node = scene.backgroundNode, light = sky.light, shadow = light.shadow, target = new Vector3(125, 0, 125);
  let previous: DaylightSample | undefined;
  try {
    for (let tick = -1; tick <= 2 * TICKS_PER_DAY; tick++) {
      const a = { ...sampleDaylight(tick, out) };
      expect(Math.hypot(a.x, a.y, a.z)).toBeCloseTo(1, 12);
      expect(sampleDaylight(tick + 17 * TICKS_PER_DAY, out)).toEqual(a);
      for (const field of ['daylight', 'warmth', 'sunlight', 'moonlight'] as const) {
        expect(a[field]).toBeGreaterThanOrEqual(0); expect(a[field]).toBeLessThanOrEqual(1);
        if (previous) expect(Math.abs(a[field] - previous[field])).toBeLessThan(0.01);
      }
      sky.update(tick, target);
      expect(scene.backgroundNode).toBe(node); expect(sky.light).toBe(light); expect(light.shadow).toBe(shadow);
      expect(light.position.y).toBeGreaterThan(0); expect(light.target.position).toEqual(target);
      if (a.y < 0) expect(a.sunlight).toBe(0);
      previous = a;
    }
    expect(sampleDaylight(0, out).daylight).toBe(0);
    expect(sampleDaylight(TICKS_PER_DAY / 2, out).daylight).toBe(1);
    expect(sampleDaylight(TICKS_PER_DAY / 4, out).x).toBeCloseTo(1);
    expect(sampleDaylight(TICKS_PER_DAY * 3 / 4, out).x).toBeCloseTo(-1);
    sky.update(1234, target); const before = light.position.clone();
    sky.update(1234, target); expect(light.position).toEqual(before);
  } finally { sky.dispose(); }
  expect(scene.backgroundNode).toBeNull(); expect(scene.children).toEqual([]);
});
