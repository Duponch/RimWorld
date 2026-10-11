import { expect, test, vi } from 'vitest';
import { OrthographicCamera, PerspectiveCamera, Scene, Vector3, type BufferAttribute, type Mesh } from 'three/webgpu';
import { DioramaLayer } from '../src/render/DioramaLayer';
import { DayNightLayer } from '../src/render/DayNightLayer';
import { createDioramaGeometry } from '../src/render/diorama-geometry';
import { DIORAMA_SKY, DioramaSkyMotion } from '../src/render/diorama-sky';
import { calendarTick } from '../src/sim/calendar';
import { crashlandedProfile } from '../src/sim/game-profile';
import type { BiomeId } from '../src/sim/biome-flora';
import { TICKS_PER_DAY, type World } from '../src/sim/types';

const biomes: BiomeId[] = ['temperate-forest', 'boreal-forest', 'arid-shrubland'];
const slides = (layer: DioramaLayer): DioramaSkyMotion =>
  (layer as unknown as { sky: DioramaSkyMotion }).sky;
const meshes = (layer: DioramaLayer): Mesh[] => layer.group.children as Mesh[];
const height = (motion: DioramaSkyMotion, kind: 1 | -1, span: number): number =>
  Math.max(DIORAMA_SKY.center * span + (kind === 1 ? motion.offsets.value.x : motion.offsets.value.y), motion.offsets.value.z);

test('cardboard sun and moon follow the existing light through dawn, noon, dusk and midnight', () => {
  const lighting = new DayNightLayer(new Scene()), motion = new DioramaSkyMotion(), target = new Vector3(16, 0, 16);
  const span = 32;
  const pose = (tick: number) => {
    lighting.update(tick, target); motion.present(lighting.sample.y, span);
    return [height(motion, 1, span), height(motion, -1, span)] as const;
  };
  try {
    const midnight = pose(0), dawn = pose(TICKS_PER_DAY / 4), morning = pose(TICKS_PER_DAY * 3 / 8);
    const noon = pose(TICKS_PER_DAY / 2), afternoon = pose(TICKS_PER_DAY * 5 / 8), dusk = pose(TICKS_PER_DAY * 3 / 4);
    expect(midnight[0]).toBeLessThan(0); expect(midnight[1]).toBeGreaterThan(0);
    expect(dawn[0]).toBeLessThan(0); expect(dawn[1]).toBeLessThan(0);
    expect(morning[0]).toBeGreaterThan(dawn[0]); expect(noon[0]).toBeGreaterThan(morning[0]);
    expect(afternoon[0]).toBeCloseTo(morning[0], 12); expect(dusk[0]).toBeLessThan(0);
    expect(noon[1]).toBeLessThan(0); expect(pose(TICKS_PER_DAY)).toEqual(midnight);
    const uniform = motion.offsets.value;
    motion.offsets.value.w = 0; pose(TICKS_PER_DAY / 2);
    expect(motion.offsets.value).toBe(uniform); expect(motion.offsets.value.w).toBe(0);
  } finally { lighting.dispose(); }
});

test('civil arrival and adopted climate phases reach the slides through the same lighting sample', () => {
  const lighting = new DayNightLayer(new Scene()), motion = new DioramaSkyMotion(), target = new Vector3();
  const worlds: Pick<World, 'tick' | 'gameProfile' | 'climate'>[] = [
    { tick: 0 },
    { tick: 0, gameProfile: crashlandedProfile() },
    { tick: 137, gameProfile: crashlandedProfile(), climate: {
      revision: 1, profile: 'boreal-reference', adoptedAt: 137, calendarOrigin: TICKS_PER_DAY * 30 + TICKS_PER_DAY / 4,
    } },
  ];
  try {
    const initial = worlds.map(world => {
      lighting.update(calendarTick(world), target, world); motion.present(lighting.sample.y, 32);
      return [height(motion, 1, 32), height(motion, -1, 32)] as const;
    });
    expect(initial[0]![1]).toBeGreaterThan(0);
    expect(initial[1]![0]).toBeLessThan(0); expect(initial[1]![1]).toBeLessThan(0);
    for (const world of worlds.slice(1)) {
      lighting.update(calendarTick(world, world.tick + TICKS_PER_DAY / 4), target, world);
      expect(lighting.sample.y).toBeGreaterThan(0);
      motion.present(lighting.sample.y, 32);
      expect(height(motion, 1, 32)).toBeGreaterThan(0); expect(height(motion, -1, 32)).toBeLessThan(0);
    }
  } finally { lighting.dispose(); }
});

test('changing only seed or biome replaces and disposes the old site while identical configuration stays resident', () => {
  const layer = new DioramaLayer(vi.fn());
  try {
    layer.configure(32, 48, false, 73, 'temperate-forest');
    let previous = meshes(layer).map(mesh => mesh.geometry);
    layer.configure(32, 48, false, 73, 'temperate-forest');
    meshes(layer).forEach((mesh, i) => expect(mesh.geometry).toBe(previous[i]));
    for (const [seed, biome] of [[74, 'temperate-forest'], [74, 'boreal-forest'], [74, 'arid-shrubland']] as const) {
      const disposed = previous.map(geometry => vi.spyOn(geometry, 'dispose'));
      layer.configure(32, 48, false, seed, biome);
      disposed.forEach(spy => expect(spy).toHaveBeenCalledOnce());
      meshes(layer).forEach(mesh => expect(previous).not.toContain(mesh.geometry));
      previous = meshes(layer).map(mesh => mesh.geometry);
    }
  } finally { layer.dispose(); }
});

test('the mixed north paper batch has signed tags and keeps every GPU buffer and material resident as time advances', async () => {
  const layer = new DioramaLayer(vi.fn());
  try {
    layer.configure(32, 48, false, 73, 'boreal-forest');
    const original = meshes(layer).map(mesh => ({ mesh, material: mesh.material, geometry: mesh.geometry,
      attributes: [...Object.values(mesh.geometry.attributes), mesh.geometry.index!].map(attribute => ({
        attribute, array: attribute.array, version: (attribute as BufferAttribute).version, values: Array.from(attribute.array),
      })),
    }));
    const moving = original.filter(({ geometry }) => geometry.hasAttribute('dioramaCelestial'));
    expect(moving).toHaveLength(1); expect(moving[0]!.mesh.name).toContain('north-upper-paper');
    const kinds = moving[0]!.geometry.getAttribute('dioramaCelestial');
    expect(kinds.array).toBeInstanceOf(Float32Array);
    expect(new Set(kinds.array)).toEqual(new Set([-1, 0, 1]));
    const indices = moving[0]!.geometry.index!;
    for (let i = 0; i < indices.count; i += 3) {
      const kind = kinds.getX(indices.getX(i));
      // Removing tagged indices must remove whole triangles from the static tree.
      expect(kinds.getX(indices.getX(i + 1))).toBe(kind);
      expect(kinds.getX(indices.getX(i + 2))).toBe(kind);
    }
    const camera = new PerspectiveCamera(50, 1, .1, 1000), target = new Vector3(16, 0, 24);
    camera.position.set(30, 30, 60); camera.lookAt(target);
    layer.present(camera, target, 80);
    const poses = new Set<string>();
    for (const elevation of [-Math.SQRT1_2, 0, .3, Math.SQRT1_2, .3]) {
      layer.presentSky(elevation); layer.present(camera, target, 80);
      poses.add(slides(layer).offsets.value.toArray().join(','));
    }
    expect(poses.size).toBe(4);
    const restore = await layer.prepare(); restore();
    for (const { mesh, material, geometry, attributes } of original) {
      expect(mesh.material).toBe(material); expect(mesh.geometry).toBe(geometry);
      for (const { attribute, array, version, values } of attributes) {
        expect(attribute.array).toBe(array); expect((attribute as BufferAttribute).version).toBe(version);
        expect(Array.from(array)).toEqual(values);
      }
    }
  } finally { layer.dispose(); }
});

test('slide back views and cameras inside the north shell collapse without coupling clock and camera caches', () => {
  const layer = new DioramaLayer(vi.fn()), target = new Vector3(16, 0, 16);
  try {
    layer.configure(32, 32, false);
    const camera = new PerspectiveCamera(50, 1, .1, 1000);
    for (const [z, expected] of [[30, 1], [-20, 0], [-1, 0], [-.6, 1], [30, 1]] as const) {
      camera.position.set(16, 10, z); camera.lookAt(target); layer.present(camera, target, 80);
      expect(slides(layer).offsets.value.w).toBe(expected);
      layer.presentSky(.5); layer.present(camera, target, 80);
      expect(slides(layer).offsets.value.w).toBe(expected);
    }
    const ortho = new OrthographicCamera(-50, 50, 50, -50, .1, 1000);
    for (const z of [-20, -1, 30]) for (const [direction, expected] of [[-1, 1], [1, 0]] as const) {
      ortho.position.set(16, 20, z); ortho.lookAt(16, 0, z + direction * 20);
      layer.present(ortho, target, 100); expect(slides(layer).offsets.value.w).toBe(expected);
    }
    // A rotation at the same eye position must invalidate the guard as well.
    ortho.matrixAutoUpdate = false;
    ortho.matrix.set(0, 0, 1, 16, 0, 1, 0, 20, -1, 0, 0, ortho.position.z, 0, 0, 0, 1);
    layer.present(ortho, target, 100);
    expect(slides(layer).offsets.value.w).toBe(0);
  } finally { layer.dispose(); }
});

test('actual celestial solids fit behind the safe camera half-space and all downward poses fit their baked bounds', () => {
  for (const [width, mapHeight] of [[32, 32], [250, 250], [325, 175]] as const)
    for (const seed of [0, 73, 4294967295]) for (const biome of biomes) {
      const model = createDioramaGeometry(width, mapHeight, seed, biome), span = Math.min(width, mapHeight);
      try {
        expect(model.parts.length).toBeLessThanOrEqual(18);
        expect(model.parts.reduce((total, part) => total + part.geometry.getAttribute('position').count, 0)).toBeLessThan(60000);
        const part = model.parts.find(part => part.geometry.hasAttribute('dioramaCelestial'))!;
        const positions = part.geometry.getAttribute('position'), kinds = part.geometry.getAttribute('dioramaCelestial');
        const motion = new DioramaSkyMotion(), box = part.geometry.boundingBox!;
        const maxFrontZ = -.5 - span * (.0126 - .003425);
        let count = 0, actualMaxZ = -Infinity;
        for (let i = 0; i < kinds.count; i++) if (kinds.getX(i) !== 0) {
          count++; actualMaxZ = Math.max(actualMaxZ, positions.getZ(i));
          expect(positions.getX(i)).toBeGreaterThan(0); expect(positions.getX(i)).toBeLessThan(width - .5);
          for (const elevation of [-1, -.3, 0, .3, 1]) {
            motion.present(elevation, span);
            const offset = kinds.getX(i) > 0 ? motion.offsets.value.x : motion.offsets.value.y;
            const vertex = new Vector3(positions.getX(i), Math.max(positions.getY(i) + offset, motion.offsets.value.z), positions.getZ(i));
            expect(box.containsPoint(vertex)).toBe(true);
          }
        }
        expect(count).toBeGreaterThan(0); expect(count).toBeLessThan(2000);
        // Float32 rounding is bounded; the guard must still have a full gap to playable ground.
        expect(actualMaxZ).toBeLessThanOrEqual(maxFrontZ + 1e-6);
        expect(actualMaxZ).toBeLessThan(-.5);
        // Independent half-space argument: any point of an interior eye→ground
        // segment remains in front of every slide, whatever its animated height.
        for (const eyeZ of [maxFrontZ + .001, 0, mapHeight + span]) for (const groundZ of [-.5, mapHeight - .5])
          for (const t of [0, .25, .5, .75, 1]) expect(eyeZ * (1 - t) + groundZ * t).toBeGreaterThan(actualMaxZ);
      } finally { model.parts.forEach(part => part.geometry.dispose()); }
    }
});
