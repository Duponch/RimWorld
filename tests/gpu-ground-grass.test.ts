import { describe, expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { GpuGroundGrassLayer, GROUND_GRASS_MAX_BLADES, groundGrassPixels } from '../src/render/GpuGroundGrassLayer';
import { noise } from '../src/render/StaticGeometry';
import { TERRAIN_COLORS } from '../src/render/TerrainLayer';

function cell(world: ReturnType<typeof createWorld>, x: number, z: number): number {
  return (z * world.width + x) * 4;
}

describe('decorative GPU soil grass', () => {
  test('uses the rendered soil palette and excludes rock, gravel, water, built floors and walls', () => {
    const world = createWorld(115, 8, 8);
    world.site = { ...world.site!, biome: 'temperate-forest' };
    world.structures = [
      { id: 400, kind: 'wall', x: 5, z: 1, orientation: 0, footprint: 'standard' },
      { id: 401, kind: 'table', x: 4, z: 2, orientation: 0, footprint: 'standard' },
    ];
    world.piles = [{ id: 402, kind: 'wood', item: 'wood', quantity: 1, owner: { type: 'ground', x: 3, z: 2 } }];
    world.packed = [{ building: { id: 403, kind: 'stool', x: 6, z: 2, orientation: 0, footprint: 'standard' },
      owner: { type: 'ground', x: 6, z: 2 } }];
    world.resources = [{ id: 404, kind: 'rock', x: 5, z: 2, amount: 1 },
      { id: 405, kind: 'tree', x: 7, z: 4, amount: 1 }];
    world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
    for (const [x, terrain] of [[1, 'soil'], [2, 'rich-soil'], [3, 'rock'], [4, 'gravel'], [6, 'water']] as const)
      world.tiles[1 * world.width + x] = { terrain };
    world.tiles[1 * world.width + 7] = { terrain: 'soil', floor: 'wood-planks' };
    const data = groundGrassPixels(world);
    const alpha = (x: number) => data[cell(world, x, 1) + 3];
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(alpha)).toEqual([255, 255, 255, 0, 0, 0, 0, 0]);
    for (const x of [3, 4, 5, 6]) expect(data[cell(world, x, 2) + 3]).toBe(0);
    expect(data[cell(world, 7, 4) + 3]).toBe(255); // an upright tree does not bald the soil
    const color = new THREE.Color(TERRAIN_COLORS.soil).multiplyScalar(.94 + noise(1, 1, world.seed) * .12).getHex();
    expect(Array.from(data.slice(cell(world, 1, 1), cell(world, 1, 1) + 3)))
      .toEqual([color >>> 16, color >>> 8 & 255, color & 255]);
    expect(Array.from(data.slice(cell(world, 0, 1), cell(world, 0, 1) + 3)))
      .not.toEqual(Array.from(data.slice(cell(world, 1, 1), cell(world, 1, 1) + 3)));
  });

  test('the one shared quad has GPU-generated positions and reuploads only changed coverage', () => {
    const world = createWorld(116, 8, 8);
    world.tiles = world.tiles.map(() => ({ terrain: 'soil' }));
    world.structures = [];
    world.resources = []; world.piles = []; world.packed = [];
    const layer = new GpuGroundGrassLayer();
    layer.update(world);
    expect(layer.mesh.geometry.getAttribute('position').count).toBe(4);
    expect(Array.from(layer.mesh.geometry.getAttribute('normal').array)).toEqual([
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    ]);
    expect(layer.mesh.geometry.index?.count).toBe(6);
    expect(layer.mesh.material.positionNode).toBeDefined();
    expect(layer.mesh.material.colorNode).toBeDefined();
    expect(layer.mesh.castShadow).toBe(false);
    expect(layer.mesh.geometry.attributes).not.toHaveProperty('instancePosition');
    const revision = layer.map.version;
    layer.update(world);
    expect(layer.map.version).toBe(revision);
    world.tiles = world.tiles.map(t => ({ ...t, miningDamage: 2 }));
    layer.update(world);
    expect(layer.map.version).toBe(revision);
    world.tiles = world.tiles.map((t, i) => i === 0 ? { ...t, floor: 'wood-planks' } : t);
    layer.update(world);
    expect(layer.map.version).toBe(revision + 1);
    expect((layer.map.image.data as Uint8Array)[3]).toBe(0);
    world.structures = [{ id: 10, kind: 'door', x: 1, z: 0, orientation: 0, footprint: 'standard' }];
    layer.update(world);
    expect((layer.map.image.data as Uint8Array)[7]).toBe(0);
    const previousVersion = layer.map.version;
    world.piles = [{ id: 11, kind: 'wood', item: 'wood', quantity: 1, owner: { type: 'ground', x: 2, z: 0 } }];
    layer.update(world);
    expect((layer.map.image.data as Uint8Array)[11]).toBe(0);
    expect(layer.map.version).toBe(previousVersion + 1);
    world.piles = [{ ...world.piles[0]!, quantity: 2 }];
    layer.update(world);
    expect(layer.map.version).toBe(previousVersion + 1);
    world.piles = [];
    layer.update(world);
    expect((layer.map.image.data as Uint8Array)[11]).toBeGreaterThan(0);
    world.structures = [];
    layer.update(world);
    expect((layer.map.image.data as Uint8Array)[7]).toBeGreaterThan(0);
    world.tiles = world.tiles.map((t, i) => i === 0 ? { terrain: 'soil' } : t);
    layer.update(world);
    expect((layer.map.image.data as Uint8Array)[3]).toBe(255);
    layer.dispose();
  });

  test('density and blade height fade below 30 px/cell and submit nothing at 20', () => {
    const world = createWorld(117, 12, 12);
    const layer = new GpuGroundGrassLayer();
    layer.update(world);
    const camera = new THREE.OrthographicCamera(-16, 16, 9, -9);
    const target = new THREE.Vector3(6, 0, 6);
    layer.present(camera, target, 30, 60);
    const close = layer.mesh.geometry.instanceCount;
    expect(close).toBeGreaterThan(1000);
    expect(close).toBeLessThanOrEqual(GROUND_GRASS_MAX_BLADES);
    const midSlots = layer['slotsPerCell'].value;
    layer.present(camera, target, 30, 110);
    expect(layer['slotsPerCell'].value).toBeGreaterThan(150);
    expect(layer['slotsPerCell'].value).toBeGreaterThan(midSlots * 3);
    expect(layer.mesh.geometry.instanceCount).toBeLessThanOrEqual(GROUND_GRASS_MAX_BLADES);
    layer.present(camera, target, 155, 25);
    const fading = layer.mesh.geometry.instanceCount;
    expect(fading).toBeGreaterThan(0);
    expect(fading).toBeLessThan(close);
    expect(fading).toBeLessThanOrEqual(GROUND_GRASS_MAX_BLADES);
    layer.present(camera, target, 155, 21);
    expect(layer.mesh.visible).toBe(false);
    expect(layer.mesh.geometry.instanceCount).toBe(0);
    layer.present(camera, target, 155, 20);
    expect(layer.mesh.visible).toBe(false);
    expect(layer.mesh.geometry.instanceCount).toBe(0);
    layer.present(camera, target, 155, 7);
    expect(layer.mesh.visible).toBe(false);
    expect(layer.mesh.geometry.instanceCount).toBe(0);
    const restore = layer.prepareForCompile();
    expect(layer.mesh.geometry.instanceCount).toBe(1);
    restore();
    expect(layer.mesh.geometry.instanceCount).toBe(0);
    // Wide footprints remain bounded even when zoomed enough for full detail.
    const wideWorld = createWorld(118, 80, 80);
    layer.update(wideWorld);
    const wideCamera = new THREE.OrthographicCamera(-100, 100, 100, -100);
    layer.present(wideCamera, new THREE.Vector3(40, 0, 40), 200, 60);
    expect(layer.mesh.geometry.instanceCount).toBeGreaterThan(100_000);
    expect(layer.mesh.geometry.instanceCount).toBeLessThanOrEqual(GROUND_GRASS_MAX_BLADES);
    const followCamera = new THREE.OrthographicCamera(-16, 16, 16, -16);
    followCamera.position.set(30, 50, 30); followCamera.lookAt(30, 0, 30);
    layer.present(followCamera, new THREE.Vector3(30, 0, 30), 32, 60);
    const before = { origin: layer['gridOrigin'].value.clone(),
      columns: layer['gridWidth'].value, slots: layer['slotsPerCell'].value };
    const atlasVersion = layer.map.version;
    followCamera.position.set(45, 50, 30); followCamera.lookAt(45, 0, 30);
    followCamera.zoom = 1.4; followCamera.updateProjectionMatrix();
    layer.present(followCamera, new THREE.Vector3(45, 0, 30), 32, 90);
    const after = { origin: layer['gridOrigin'].value.clone(),
      columns: layer['gridWidth'].value, slots: layer['slotsPerCell'].value };
    expect(after.origin.x).toBeGreaterThan(before.origin.x + 10);
    expect(after.slots).toBeGreaterThan(before.slots);
    // The GPU decodes instance -> (absolute cell, slot). Window origin and
    // density may change, but a retained slot in an overlapping cell cannot.
    const indexFor = (window: typeof before, x: number, z: number, slot: number) =>
      ((z - window.origin.y) * window.columns + x - window.origin.x) * window.slots + slot;
    const decoded = (window: typeof before, index: number) => {
      const cell = Math.floor(index / window.slots);
      return { x: window.origin.x + cell % window.columns,
        z: window.origin.y + Math.floor(cell / window.columns), slot: index % window.slots };
    };
    expect(decoded(before, indexFor(before, 40, 30, 3))).toEqual({ x: 40, z: 30, slot: 3 });
    expect(decoded(after, indexFor(after, 40, 30, 3))).toEqual({ x: 40, z: 30, slot: 3 });
    expect(layer.map.version).toBe(atlasVersion);
    layer.dispose();
  });

  test('large-map iso rotation keeps a constant per-cell budget and horizon fallback covers the map', () => {
    const world = createWorld(119, 160, 160);
    const layer = new GpuGroundGrassLayer();
    layer.update(world);
    const target = new THREE.Vector3(80, 0, 80);
    const camera = new THREE.OrthographicCamera(-35, 35, 25, -25);
    camera.position.set(150, 70, 80); camera.lookAt(target);
    layer.present(camera, target, 50, 110);
    const firstSlots = layer['slotsPerCell'].value;
    const firstCount = layer.mesh.geometry.instanceCount;
    const atlasVersion = layer.map.version;
    const diagonal = 70 / Math.SQRT2;
    camera.position.set(80 + diagonal, 70, 80 + diagonal); camera.lookAt(target);
    layer.present(camera, target, 50, 110);
    expect(layer['slotsPerCell'].value).toBe(firstSlots);
    expect(layer.mesh.geometry.instanceCount).toBeGreaterThan(0);
    expect(layer.mesh.geometry.instanceCount).toBeLessThanOrEqual(GROUND_GRASS_MAX_BLADES);
    expect(firstCount).toBeLessThanOrEqual(GROUND_GRASS_MAX_BLADES);
    expect(layer.map.version).toBe(atlasVersion);

    const horizon = new THREE.PerspectiveCamera(45, 1.5, .1, 2000);
    horizon.position.set(80, 10, 80); horizon.lookAt(80, 8, 70);
    layer.present(horizon, target, 50, 60);
    expect(layer['gridOrigin'].value.toArray()).toEqual([0, 0]);
    expect(layer['gridWidth'].value).toBe(160);
    expect(layer.mesh.geometry.instanceCount).toBeLessThanOrEqual(GROUND_GRASS_MAX_BLADES);
    layer.dispose();
  });
});
