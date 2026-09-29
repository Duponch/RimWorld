import { expect, test } from 'vitest';
import { Matrix4, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three/webgpu';
import { WeatherPrecipitationLayer, precipitationShares } from '../src/render/WeatherPrecipitationLayer';
import { WEATHER_KINDS, WEATHER } from '../src/sim/weather-definitions';

const target = new Vector3(15.5, 0, 15.5);
const camera = new PerspectiveCamera(45, 1.6, .1, 1000);
camera.position.set(15.5, 4, 35.5);
camera.lookAt(target);

const input = { seed: 441, tick: 100, rainRate: 1, snowRate: 0, camera, target,
  strength: 1, directionX: .8, directionZ: .6, daylight: 1 };

test('les huit météos Core choisissent la précipitation visible sans double pluie sur neige', () => {
  expect(WEATHER_KINDS).toHaveLength(8);
  for (const kind of WEATHER_KINDS) {
    const rates = precipitationShares(WEATHER[kind].rain, WEATHER[kind].snow);
    expect(rates.rain).toBeGreaterThanOrEqual(0);
    expect(rates.snow).toBeGreaterThanOrEqual(0);
    expect(rates.rain + rates.snow).toBeLessThanOrEqual(1);
  }
  expect(precipitationShares(0, 0)).toEqual({ rain: 0, snow: 0 });
  expect(precipitationShares(1, 0)).toEqual({ rain: 1, snow: 0 });
  expect(precipitationShares(1, .8)).toEqual({ rain: 0, snow: 1 });
  expect(precipitationShares(1, 1.2)).toEqual({ rain: 0, snow: 1 });
  expect(precipitationShares(.5, .4)).toEqual({ rain: 0, snow: .5 });
  expect(precipitationShares(1, .4)).toEqual({ rain: .5, snow: .5 });
});

test('un lot résident suit le tick confirmé et la caméra, se fige en pause et se masque à sec', () => {
  const layer = new WeatherPrecipitationLayer();
  const mesh = layer.mesh, geometry = mesh.geometry, material = mesh.material;
  try {
    layer.present(input);
    expect(mesh.visible).toBe(true);
    expect(mesh.count).toBeGreaterThan(190);
    expect(mesh.count).toBeLessThanOrEqual(256);
    expect(mesh.castShadow).toBe(false);
    expect(mesh.receiveShadow).toBe(false);
    expect(material.depthWrite).toBe(false);
    expect(geometry.getAttribute('position').count * mesh.count / 3).toBeLessThan(600);
    const first = Array.from(mesh.instanceMatrix.array);
    const version = mesh.instanceMatrix.version;
    layer.present(input);
    expect(mesh.instanceMatrix.version).toBe(version);
    expect(Array.from(mesh.instanceMatrix.array)).toEqual(first);
    layer.present({ ...input, tick: 101 });
    expect(mesh.instanceMatrix.version).toBeGreaterThan(version);
    expect(Array.from(mesh.instanceMatrix.array)).not.toEqual(first);
    const movedCamera = new OrthographicCamera(-20, 20, 20, -20, .1, 1000);
    movedCamera.position.set(25.5, 50, 35.5);
    movedCamera.lookAt(target);
    layer.present({ ...input, tick: 101, camera: movedCamera });
    expect(mesh.visible).toBe(true);
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.material).toBe(material);
    const matrix = new Matrix4();
    mesh.getMatrixAt(0, matrix);
    expect(matrix.elements[12]).toBeGreaterThan(first[12]!);
    layer.present({ ...input, rainRate: 0, snowRate: 0 });
    expect(mesh.visible).toBe(false);
    expect(mesh.count).toBe(0);
  } finally { layer.dispose(); }
  expect(mesh.parent).toBeNull();
});

test('la reprise au même tick reconstruit exactement le motif sans état visuel sauvegardé', () => {
  const a = new WeatherPrecipitationLayer(), b = new WeatherPrecipitationLayer();
  try {
    a.present({ ...input, tick: 712.5, rainRate: 1, snowRate: .4 });
    b.present({ ...input, tick: 712.5, rainRate: 1, snowRate: .4 });
    expect(a.mesh.count).toBe(b.mesh.count);
    expect(Array.from(a.mesh.instanceMatrix.array)).toEqual(Array.from(b.mesh.instanceMatrix.array));
    a.reset();
    a.present({ ...input, tick: 712.5, rainRate: 1, snowRate: .4 });
    expect(Array.from(a.mesh.instanceMatrix.array)).toEqual(Array.from(b.mesh.instanceMatrix.array));
  } finally { a.dispose(); b.dispose(); }
});

test('la perspective basse ne transforme pas un trait proche en bande géante à l’écran', () => {
  const layer = new WeatherPrecipitationLayer();
  try {
    layer.present(input);
    camera.updateMatrixWorld();
    const matrix = new Matrix4(), bottom = new Vector3(), top = new Vector3();
    let longest = 0;
    for (let index = 0; index < layer.mesh.count; index++) {
      layer.mesh.getMatrixAt(index, matrix);
      bottom.set(0, -.5, 0).applyMatrix4(matrix).project(camera);
      top.set(0, .5, 0).applyMatrix4(matrix).project(camera);
      if (bottom.z < -1 || bottom.z > 1 || top.z < -1 || top.z > 1) continue;
      if (Math.abs(bottom.x) > 1 || Math.abs(top.x) > 1) continue;
      longest = Math.max(longest, Math.abs(top.y - bottom.y) * 500);
    }
    expect(longest).toBeLessThan(100); // 1000 px viewport, at most one tenth high
  } finally { layer.dispose(); }
});
