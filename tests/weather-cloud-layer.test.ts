import { expect, test } from 'vitest';
import { Matrix4, OrthographicCamera, PerspectiveCamera, Quaternion, Vector3 } from 'three/webgpu';
import { WeatherCloudLayer, cloudViewOpacity } from '../src/render/WeatherCloudLayer';
import { visualCloudAppearance, visualWindDirection } from '../src/render/visual-weather';
import { WEATHER_KINDS } from '../src/sim/weather-definitions';

const target = new Vector3(15.5, 0, 15.5);
const lowCamera = () => {
  const camera = new PerspectiveCamera(45, 1.6, .1, 2000);
  camera.position.set(15.5, 4, 35.5);
  camera.lookAt(target);
  return camera;
};

test('nuages V87 : huit états, transition Core et direction de vent visuelle pure', () => {
  expect(WEATHER_KINDS).toHaveLength(8);
  expect(WEATHER_KINDS).not.toContain('overcast');
  for (const kind of WEATHER_KINDS) {
    const appearance = visualCloudAppearance({ current: kind, previous: kind, ageCore: 4000 });
    expect(appearance.coverage).toBeGreaterThan(0);
    expect(appearance.coverage).toBeLessThanOrEqual(1);
    expect(appearance.opacity).toBeGreaterThan(0);
  }
  const start = visualCloudAppearance({ current: 'rain', previous: 'clear', ageCore: 0 });
  const middle = visualCloudAppearance({ current: 'rain', previous: 'clear', ageCore: 2000 });
  const end = visualCloudAppearance({ current: 'rain', previous: 'clear', ageCore: 4000 });
  expect(middle.coverage).toBeCloseTo((start.coverage + end.coverage) / 2);
  expect(middle.opacity).toBeCloseTo((start.opacity + end.opacity) / 2);

  const direction = visualWindDirection(12345, 901.25);
  expect(visualWindDirection(12345, 901.25)).toEqual(direction);
  expect(Math.hypot(direction.x, direction.z)).toBeCloseTo(1, 12);
  const next = visualWindDirection(12345, 901.5);
  expect(Math.hypot(next.x - direction.x, next.z - direction.z)).toBeLessThan(.001);
  expect(visualWindDirection(54321, 901.25)).not.toEqual(direction);
});

test('nuages : lot monde résident, caché en vue du dessus sans suivre la caméra', () => {
  const layer = new WeatherCloudLayer(), camera = lowCamera();
  layer.configureMap(32, 32);
  const initial = { seed: 7123, tick: 100.5, weather: { previous: 'clear' as const, current: 'rain' as const, ageCore: 2000 },
    camera, target, strength: 1, directionX: .8, directionZ: .6 };
  const mesh = layer.mesh, geometry = mesh.geometry, material = mesh.material;
  try {
    expect(mesh.isInstancedMesh).toBe(true);
    expect(mesh.count).toBe(64);
    expect(mesh.castShadow).toBe(false);
    expect(mesh.receiveShadow).toBe(false);
    expect(mesh.frustumCulled).toBe(true);
    expect(mesh.boundingSphere!.center.x).toBe(15.5);
    expect(mesh.boundingSphere!.center.z).toBe(15.5);
    expect(material.depthWrite).toBe(false);
    expect(geometry.getAttribute('position').count * mesh.count / 3).toBeLessThan(8000);
    expect(cloudViewOpacity(camera, target)).toBeGreaterThan(.9);
    layer.present(initial);
    expect(mesh.visible).toBe(true);
    expect(material.opacity).toBeGreaterThan(.4);
    const lowOpacity = material.opacity;
    camera.updateMatrixWorld();
    let upperSky = 0, mapCenter = 0;
    const matrix = new Matrix4(), position = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
    for (let index = 0; index < mesh.count; index++) {
      mesh.getMatrixAt(index, matrix);
      matrix.decompose(position, rotation, scale);
      if (scale.x < .5) continue;
      const projected = position.clone().project(camera);
      if (Math.abs(projected.x) <= 1 && projected.y <= 1 && projected.y >= -1 && projected.z >= -1 && projected.z <= 1) {
        if (projected.y > .35) upperSky++;
        if (projected.y < .1) mapCenter++;
      }
    }
    expect(upperSky).toBeGreaterThan(0);
    expect(mapCenter).toBe(0);
    const dayColor = material.color.clone();
    layer.present({ ...initial, daylight: 0 });
    expect(material.color.equals(dayColor)).toBe(false);
    expect(material.color.r + material.color.g + material.color.b).toBeLessThan(dayColor.r + dayColor.g + dayColor.b);
    const version = mesh.instanceMatrix.version;
    layer.present(initial);
    expect(mesh.instanceMatrix.version).toBe(version);
    layer.present({ ...initial, tick: 104.5 });
    expect(mesh.instanceMatrix.version).toBeGreaterThan(version);
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.material).toBe(material);

    const overhead = lowCamera();
    overhead.position.set(15.5, 65, 35.5);
    overhead.lookAt(target);
    const cameraVersion = mesh.instanceMatrix.version;
    layer.present({ ...initial, camera: overhead });
    expect(mesh.visible).toBe(false);
    expect(mesh.instanceMatrix.version).toBe(cameraVersion);
    const ortho = new OrthographicCamera(-20, 20, 20, -20, .1, 1000);
    ortho.position.set(35, 50, 35);
    layer.present({ ...initial, camera: ortho });
    expect(mesh.visible).toBe(false);
    expect(cloudViewOpacity(ortho, target)).toBe(0);
    expect(mesh.instanceMatrix.version).toBe(cameraVersion);
    layer.configureMap(250, 175);
    expect(mesh.boundingSphere!.center.x).toBe(124.5);
    expect(mesh.boundingSphere!.center.z).toBe(87);
    expect(mesh.boundingSphere!.radius).toBeGreaterThan(180);
  } finally { layer.dispose(); }
  expect(mesh.parent).toBeNull();
});

test('nuages : le vent advecte vers sa direction, la pause et le calme figent le lot', () => {
  const calm = new WeatherCloudLayer(), windy = new WeatherCloudLayer(), reloaded = new WeatherCloudLayer(), camera = lowCamera();
  const input = { seed: 441, tick: 100, weather: { previous: 'clear' as const, current: 'clear' as const, ageCore: 4000 },
    camera, target, directionX: 1, directionZ: 0 };
  try {
    calm.present({ ...input, strength: 0 });
    windy.present({ ...input, strength: 2 });
    const initial = Array.from(windy.mesh.instanceMatrix.array);
    const calmVersion = calm.mesh.instanceMatrix.version;
    calm.present({ ...input, tick: 200, strength: 0 });
    windy.present({ ...input, tick: 200, strength: 2 });
    reloaded.present({ ...input, tick: 200, strength: 2 });
    expect(calm.mesh.instanceMatrix.version).toBe(calmVersion);
    expect(Array.from(calm.mesh.instanceMatrix.array)).toEqual(initial);
    expect(Array.from(windy.mesh.instanceMatrix.array)).not.toEqual(initial);
    // Presentation drift is intentionally not in the save; a fresh layer
    // anchors at its first confirmed tick without integrating prior history.
    expect(Array.from(reloaded.mesh.instanceMatrix.array)).toEqual(initial);
    const moved = windy.mesh.instanceMatrix.array;
    let forward = 0;
    for (let index = 0; index < windy.mesh.count; index++) {
      const x = index * 16 + 12;
      if (moved[x]! - initial[x]! > .5) forward++;
    }
    expect(forward).toBeGreaterThanOrEqual(50);
    const version = windy.mesh.instanceMatrix.version;
    windy.present({ ...input, tick: 200, strength: 2 });
    expect(windy.mesh.instanceMatrix.version).toBe(version);
    windy.present({ ...input, tick: 50, strength: 2 }); // rewind: keep phase, do not integrate backward
    expect(windy.mesh.instanceMatrix.version).toBe(version);
    windy.reset();
    windy.present({ ...input, tick: 200, strength: 2 });
    expect(Array.from(windy.mesh.instanceMatrix.array)).toEqual(Array.from(reloaded.mesh.instanceMatrix.array));
  } finally { calm.dispose(); windy.dispose(); reloaded.dispose(); }
});

test('nuages : franchir zéro en X ne décale pas tout le champ céleste', () => {
  const seed = 441, camera = lowCamera(), layer = new WeatherCloudLayer();
  const input = { seed, weather: { previous: 'rainy-thunderstorm' as const, current: 'rainy-thunderstorm' as const, ageCore: 4000 },
    camera, target, strength: 2, directionX: 1, directionZ: 0 };
  try {
    layer.present({ ...input, tick: 0, directionX: -1 });
    layer.present({ ...input, tick: 100, directionX: -1 });
    layer.present({ ...input, tick: 100 }); // confirmed direction changes without a position jump
    layer.present({ ...input, tick: 199 });
    const before = Array.from(layer.mesh.instanceMatrix.array);
    layer.present({ ...input, tick: 201 });
    const after = layer.mesh.instanceMatrix.array;
    let continuous = 0;
    for (let index = 0; index < layer.mesh.count; index++) {
      const offset = index * 16;
      const distance = Math.hypot(after[offset + 12]! - before[offset + 12]!,
        after[offset + 13]! - before[offset + 13]!, after[offset + 14]! - before[offset + 14]!);
      if (distance < 1) continuous++;
    }
    expect(continuous).toBeGreaterThanOrEqual(24);
  } finally { layer.dispose(); }
});

test('nuages : une instance s’efface avant de revenir par le bord latéral', () => {
  const camera = lowCamera(), layer = new WeatherCloudLayer();
  layer.configureMap(32, 32);
  const input = { seed: 441, weather: { previous: 'rainy-thunderstorm' as const, current: 'rainy-thunderstorm' as const, ageCore: 4000 },
    camera, target, strength: 2, directionX: 1, directionZ: 0 };
  try {
    const scale = (matrix: Matrix4) => Math.hypot(matrix.elements[0]!, matrix.elements[1]!, matrix.elements[2]!);
    const before = new Matrix4(), after = new Matrix4();
    layer.present({ ...input, tick: 0 });
    let faded = false;
    for (let tick = 100; tick <= 50_000 && !faded; tick += 100) {
      const previous = Array.from(layer.mesh.instanceMatrix.array);
      layer.present({ ...input, tick });
      for (let index = 0; index < layer.mesh.count; index++) {
        before.fromArray(previous, index * 16);
        layer.mesh.getMatrixAt(index, after);
        const dx = after.elements[12]! - before.elements[12]!, dz = after.elements[14]! - before.elements[14]!;
        if (Math.abs(dx) > 200 && Math.abs(dz) < 5 && scale(before) < .5 && scale(after) < .5) { faded = true; break; }
      }
    }
    expect(faded).toBe(true);
  } finally { layer.dispose(); }
});
