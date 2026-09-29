import { expect, test } from 'vitest';
import { BufferAttribute, OrthographicCamera, PerspectiveCamera, Vector2, Vector3 } from 'three/webgpu';
import { WeatherPrecipitationLayer, precipitationMapLayout, precipitationShares } from '../src/render/WeatherPrecipitationLayer';
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

test('le préfixe de densité couvre toute la carte sans répétition ni concentration dans ses premières lignes', () => {
  for (const [width, height] of [[8, 8], [32, 32], [250, 250], [31, 19]]) {
    const { columns, capacity, stride } = precipitationMapLayout(width!, height!);
    const rows = Math.ceil(height! / 2);
    const all = new Set<number>(), quadrants = [0, 0, 0, 0];
    const active = Math.round(capacity * .82);
    for (let i = 0; i < capacity; i++) {
      const slot = i * stride % capacity;
      expect(all.has(slot)).toBe(false);
      all.add(slot);
      const x = slot % columns, z = Math.floor(slot / columns);
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(columns);
      expect(z).toBeGreaterThanOrEqual(0); expect(z).toBeLessThan(rows);
      if (i < active) quadrants[Number(x >= columns / 2) + 2 * Number(z >= rows / 2)]!++;
    }
    expect(all.size).toBe(capacity);
    if (capacity >= 256) for (const count of quadrants)
      expect(count).toBeGreaterThan(active * .15);
  }
  expect(precipitationMapLayout(250, 250).capacity).toBe(15_625);
});

test('panoramique, orbite et zoom à tick gelé ne modifient pas le volume ni la phase des particules', () => {
  const layer = new WeatherPrecipitationLayer();
  try {
    layer.configureMap(32, 32);
    layer.present(input);
    const state = layer as unknown as {
      dimensions: { value: Vector2 }; columns: { value: number };
      capacity: { value: number }; stride: { value: number };
      rainPhase: { value: number }; snowPhase: { value: number };
      groundSlope: { value: Vector2 };
    };
    const volume = [state.dimensions.value.x, state.dimensions.value.y,
      state.columns.value, state.capacity.value, state.stride.value];
    const phases = [state.rainPhase.value, state.snowPhase.value];
    const moving = camera.clone();
    moving.position.set(25.5, 5, 43.5);
    moving.lookAt(target.clone().add(new Vector3(10, 0, 8)));
    moving.zoom = 2;
    moving.updateProjectionMatrix();
    layer.present({ ...input, camera: moving, target: target.clone().add(new Vector3(10, 0, 8)) });
    expect([state.groundSlope.value.x, state.groundSlope.value.y]).toEqual([0, 0]);
    expect([state.dimensions.value.x, state.dimensions.value.y,
      state.columns.value, state.capacity.value, state.stride.value]).toEqual(volume);
    expect([state.rainPhase.value, state.snowPhase.value]).toEqual(phases);
    const iso = new OrthographicCamera(-20, 20, 20, -20, .1, 1000);
    iso.position.set(100, 95, -20); iso.lookAt(target);
    layer.present({ ...input, camera: iso });
    const direction = iso.getWorldDirection(new Vector3());
    expect(state.groundSlope.value.x).toBeCloseTo(direction.x / -direction.y);
    expect(state.groundSlope.value.y).toBeCloseTo(direction.z / -direction.y);
    expect([state.dimensions.value.x, state.dimensions.value.y,
      state.columns.value, state.capacity.value, state.stride.value]).toEqual(volume);
    expect([state.rainPhase.value, state.snowPhase.value]).toEqual(phases);
  } finally { layer.dispose(); }
});

test('un seul lot résident couvre les cartes 32² et 250², sans upload de sommets par tick', () => {
  const layer = new WeatherPrecipitationLayer();
  const mesh = layer.mesh, geometry = mesh.geometry, material = mesh.material;
  try {
    layer.configureMap(32, 32);
    layer.present(input);
    expect(mesh.visible).toBe(true);
    expect(geometry.instanceCount).toBe(210);
    expect(mesh.castShadow || mesh.receiveShadow).toBe(false);
    expect(material.depthWrite).toBe(false);
    expect(mesh.frustumCulled).toBe(false);
    expect(geometry.getAttribute('position').count).toBe(4);
    const vertexVersion = (geometry.getAttribute('position') as BufferAttribute).version;
    layer.present({ ...input, tick: 101 });
    expect((geometry.getAttribute('position') as BufferAttribute).version).toBe(vertexVersion);
    layer.configureMap(250, 250);
    layer.present(input);
    expect(geometry.instanceCount).toBe(12_813);
    expect(geometry.index!.count * geometry.instanceCount / 3).toBe(25_626);
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.material).toBe(material);
    expect((geometry.getAttribute('position') as BufferAttribute).version).toBe(vertexVersion);
    layer.present({ ...input, rainRate: 0, snowRate: 0 });
    expect(mesh.visible).toBe(false);
    expect(geometry.instanceCount).toBe(0);
  } finally { layer.dispose(); }
  expect(mesh.parent).toBeNull();
});

test('la reprise au même tick reconstitue les paramètres fixes du volume', () => {
  const a = new WeatherPrecipitationLayer(), b = new WeatherPrecipitationLayer();
  try {
    const weather = { ...input, tick: 712.5, rainRate: 1, snowRate: .4 };
    a.configureMap(31, 19); b.configureMap(31, 19);
    a.present(weather); b.present(weather);
    const snapshot = (layer: WeatherPrecipitationLayer) => {
      const state = layer as unknown as {
        dimensions: { value: Vector2 }; stride: { value: number };
        seed: { value: number }; rainPhase: { value: number };
        snowPhase: { value: number }; snowFraction: { value: number };
      };
      return [layer.mesh.geometry.instanceCount, state.dimensions.value.x, state.dimensions.value.y,
        state.stride.value, state.seed.value, state.rainPhase.value,
        state.snowPhase.value, state.snowFraction.value];
    };
    expect(snapshot(a)).toEqual(snapshot(b));
    a.reset(); a.present(weather);
    expect(snapshot(a)).toEqual(snapshot(b));
  } finally { a.dispose(); b.dispose(); }
});
