import { describe, expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import type { World } from '../src/sim/types';
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

  test('dynamic snapshot replacements skip the whole-map mask while spatial changes keep exact pixels', () => {
    const world = createWorld(121, 64, 64);
    world.tiles = world.tiles.map(() => ({ terrain: 'soil' }));
    world.structures = [{ id: 10, kind: 'table', x: 4, z: 4, orientation: 0, footprint: 'standard' }];
    world.resources = [{ id: 11, kind: 'rock', x: 7, z: 7, amount: 1 },
      { id: 12, kind: 'tree', x: 9, z: 9, amount: 1, growth: .5 }];
    world.piles = [{ id: 13, kind: 'wood', item: 'wood', quantity: 1,
      owner: { type: 'ground', x: 11, z: 11 } }];
    world.packed = [{ building: { id: 14, kind: 'stool', x: 13, z: 13,
      orientation: 0, footprint: 'standard' }, owner: { type: 'ground', x: 13, z: 13 } }];
    let tileReads = 0;
    world.tiles = new Proxy(world.tiles, {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) tileReads++;
        return Reflect.get(target, key, receiver);
      },
    });
    const layer = new GpuGroundGrassLayer();
    layer.update(world);
    const firstPixels = Uint8Array.from(layer.map.image.data as Uint8Array);
    const firstVersion = layer.map.version;
    tileReads = 0;
    world.structures = world.structures.map(s => ({ ...s, damage: (s.damage ?? 0) + 1 }));
    world.resources = world.resources.map(r => ({ ...r, amount: r.amount + 1, growth: .75 }));
    world.piles = world.piles.map(p => ({ ...p, quantity: p.quantity + 1, owner: { ...p.owner } }));
    world.packed = world.packed.map(p => ({ ...p, building: { ...p.building, damage: 1 },
      owner: { ...p.owner } }));
    layer.update(world);
    expect(tileReads).toBe(0);
    expect(layer.map.version).toBe(firstVersion);
    expect(layer.map.image.data).toEqual(firstPixels);

    const changedTile=5*world.width+5;
    const damagedTiles=world.tiles.slice();
    damagedTiles[changedTile]={...damagedTiles[changedTile]!,miningDamage:1};
    world.tiles=new Proxy(damagedTiles,{
      get(target,key,receiver){if(typeof key==='string'&&/^\d+$/.test(key))tileReads++;return Reflect.get(target,key,receiver);},
    });
    tileReads=0;
    layer.update(world,false,[changedTile]);
    expect(tileReads).toBeLessThan(10);
    expect(layer.map.version).toBe(firstVersion);
    expect(layer.map.image.data).toEqual(firstPixels);

    const spatialChanges = [
      () => { world.structures = world.structures.map(s => ({ ...s, orientation: 1 })); },
      () => { world.resources = world.resources.map(r => r.kind === 'rock' ? { ...r, x: 8 } : r); },
      () => { world.piles = world.piles.map(p => ({ ...p, owner: { type: 'ground', x: 12, z: 11 } })); },
      () => { world.packed = world.packed.map(p => ({ ...p, owner: { type: 'ground', x: 14, z: 13 } })); },
    ];
    for (const change of spatialChanges) {
      const version = layer.map.version;
      change();
      layer.update(world);
      expect(layer.map.version).toBe(version + 1);
      expect(layer.map.image.data).toEqual(groundGrassPixels(world));
    }
    layer.dispose();
  });

  test('overlapping cover remains until its last occupant leaves', () => {
    const world = createWorld(122, 12, 12);
    world.tiles = world.tiles.map(() => ({ terrain: 'soil' }));
    world.structures = [{ id: 1, kind: 'wall', x: 5, z: 5, orientation: 0, footprint: 'standard' }];
    world.resources = [{ id: 2, kind: 'rock', x: 5, z: 5, amount: 1 }];
    world.piles = [{ id: 3, kind: 'wood', item: 'wood', quantity: 1,
      owner: { type: 'ground', x: 5, z: 5 } }];
    world.packed = [{ building: { id: 4, kind: 'stool', x: 5, z: 5,
      orientation: 0, footprint: 'standard' }, owner: { type: 'ground', x: 5, z: 5 } }];
    const layer = new GpuGroundGrassLayer();
    layer.update(world);
    const version = layer.map.version;
    world.structures = [];
    layer.update(world);
    world.resources = [];
    layer.update(world);
    world.piles = [];
    layer.update(world);
    expect(layer.map.version).toBe(version);
    expect(layer.map.image.data).toEqual(groundGrassPixels(world));
    world.packed = [];
    layer.update(world);
    expect(layer.map.version).toBe(version + 1);
    expect((layer.map.image.data as Uint8Array)[cell(world, 5, 5) + 3]).toBe(255);
    expect(layer.map.image.data).toEqual(groundGrassPixels(world));
    layer.dispose();
  });

  test('incremental atlas matches a full rebuild through random cover and surface changes', () => {
    const world: World = createWorld(123, 18, 18);
    world.tiles = world.tiles.map(() => ({ terrain: 'soil' }));
    world.structures = []; world.resources = []; world.piles = []; world.packed = [];
    const layer = new GpuGroundGrassLayer();
    layer.update(world);
    let state = 0x5eed1234;
    const random = (max: number): number => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) % max;
    };
    const position = () => ({ x: random(20) - 1, z: random(20) - 1 });
    let id = 100;
    const kinds = ['wall', 'table', 'solar-generator', 'wind-turbine'] as const;
    const terrains = ['soil', 'grass', 'rich-soil', 'rock', 'water'] as const;
    for (let step = 0; step < 500; step++) {
      let changedTiles: number[] | undefined;
      const operation = random(16);
      if (operation === 0) {
        world.structures = [...world.structures, { id: id++, kind: kinds[random(kinds.length)]!,
          ...position(), orientation: random(4) as 0 | 1 | 2 | 3, footprint: 'standard' }];
      } else if (operation === 1 && world.structures.length) {
        const index = random(world.structures.length);
        world.structures = world.structures.filter((_, i) => i !== index);
      } else if (operation === 2 && world.structures.length) {
        const index = random(world.structures.length);
        world.structures = world.structures.map((s, i) => i === index ? { ...s, ...position(),
          orientation: random(4) as 0 | 1 | 2 | 3 } : s);
      } else if (operation === 3) {
        world.resources = [...world.resources, { id: id++, kind: random(2) ? 'rock' : 'tree',
          ...position(), amount: 1 }];
      } else if (operation === 4 && world.resources.length) {
        const index = random(world.resources.length);
        world.resources = world.resources.filter((_, i) => i !== index);
      } else if (operation === 5 && world.resources.length) {
        const index = random(world.resources.length);
        world.resources = world.resources.map((r, i) => i === index ? { ...r, ...position(),
          kind: r.kind === 'rock' ? 'tree' : 'rock' } : r);
      } else if (operation === 6) {
        world.piles = [...world.piles, { id: id++, kind: 'wood', item: 'wood', quantity: 1,
          owner: { type: 'ground', ...position() } }];
      } else if (operation === 7 && world.piles.length) {
        const index = random(world.piles.length);
        world.piles = world.piles.filter((_, i) => i !== index);
      } else if (operation === 8 && world.piles.length) {
        const index = random(world.piles.length);
        world.piles = world.piles.map((p, i) => i === index ? { ...p,
          owner: random(2) ? { type: 'ground', ...position() } : { type: 'pawn', pawnId: 1 } } : p);
      } else if (operation === 9) {
        world.packed = [...world.packed, { building: { id: id++, kind: 'stool',
          ...position(), orientation: 0, footprint: 'standard' }, owner: { type: 'ground', ...position() } }];
      } else if (operation === 10 && world.packed.length) {
        const index = random(world.packed.length);
        world.packed = world.packed.filter((_, i) => i !== index);
      } else if (operation === 11 && world.packed.length) {
        const index = random(world.packed.length);
        world.packed = world.packed.map((p, i) => i === index ? { ...p,
          owner: random(2) ? { type: 'ground', ...position() } : { type: 'pawn', pawnId: 1 } } : p);
      } else if (operation === 12 || operation === 13) {
        const index = random(world.tiles.length), tile = world.tiles[index]!;
        world.tiles = world.tiles.slice();
        world.tiles[index] = operation === 12 ? { terrain: terrains[random(terrains.length)]!,
          floor: random(3) ? undefined : 'wood-planks' } :
          { ...tile, miningDamage: (tile.miningDamage ?? 0) + 1 };
        changedTiles = [index];
      } else if (operation === 14) {
        world.seed = random(1_000_000);
        world.site = { ...world.site!, revision: 2,
          biome: random(2) ? 'temperate-forest' : 'arid-shrubland' };
      } // Operation 15 is a paused snapshot with identical references.
      const version = layer.map.version;
      layer.update(world, false, changedTiles);
      expect(layer.map.image.data, `step ${step}, operation ${operation}`).toEqual(groundGrassPixels(world));
      if (operation === 15) expect(layer.map.version).toBe(version);
    }
    // Explicit force must recover from an in-place edit, and dimensions reset
    // the counters and dirty-cell storage before the next incremental edit.
    if (world.structures.length) world.structures[0]!.x = 2;
    layer.update(world, true);
    expect(layer.map.image.data).toEqual(groundGrassPixels(world));
    const smaller = createWorld(124, 10, 10);
    smaller.tiles = smaller.tiles.map(() => ({ terrain: 'soil' }));
    layer.update(smaller);
    expect(layer.map.image.data).toEqual(groundGrassPixels(smaller));
    smaller.piles = [{ id: 9999, kind: 'wood', item: 'wood', quantity: 1,
      owner: { type: 'ground', x: 3, z: 3 } }];
    layer.update(smaller);
    expect(layer.map.image.data).toEqual(groundGrassPixels(smaller));
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

  test('low perspective spends the fixed blade budget on nearby ground instead of thinning the whole map', () => {
    const world = createWorld(120, 250, 250);
    const layer = new GpuGroundGrassLayer();
    layer.update(world);
    const camera = new THREE.PerspectiveCamera(45, 1.5, .1, 2000);
    camera.position.set(125, 5, 130); camera.lookAt(125, 0, 105);
    layer.present(camera, new THREE.Vector3(125, 0, 105), 30, 160);
    const baseSlots = layer['slotsPerCell'].value;
    const nearSlots = layer['nearSlotsPerCell'].value;
    const foregroundSlots = layer['foregroundSlotsPerCell'].value;
    const firstCount = layer.mesh.geometry.instanceCount;
    const before = { origin: layer['nearGridOrigin'].value.clone(),
      columns: layer['nearGridWidth'].value, slots: nearSlots,
      rows: layer['nearInstances'].value / (layer['nearGridWidth'].value * nearSlots),
      first: layer['baseInstances'].value };
    expect(baseSlots).toBe(1); // formerly the whole visible field had only this one slot
    expect(nearSlots).toBeGreaterThan(15);
    expect(foregroundSlots).toBeGreaterThan(80);
    expect(layer['bandLimits'].value.x).toBeGreaterThan(layer['bandLimits'].value.z);
    expect(layer['bandLimits'].value.y).toBeGreaterThan(1);
    expect(firstCount).toBeLessThanOrEqual(GROUND_GRASS_MAX_BLADES);
    expect(layer['baseInstances'].value).toBeGreaterThan(0);
    const atlasVersion = layer.map.version;
    const diagonal = 25 / Math.SQRT2;
    camera.position.set(125 + diagonal, 5, 105 + diagonal);
    camera.lookAt(125, 0, 105);
    layer.present(camera, new THREE.Vector3(125, 0, 105), 30, 160);
    expect(layer['nearSlotsPerCell'].value).toBe(nearSlots);
    expect(layer['foregroundSlotsPerCell'].value).toBe(foregroundSlots);
    expect(layer['bandLimits'].value.x).toBeCloseTo(25, 1);
    expect(layer.mesh.geometry.instanceCount).toBeLessThanOrEqual(GROUND_GRASS_MAX_BLADES);
    expect(layer.map.version).toBe(atlasVersion);
    const after = { origin: layer['nearGridOrigin'].value.clone(),
      columns: layer['nearGridWidth'].value, slots: layer['nearSlotsPerCell'].value,
      rows: layer['nearInstances'].value / (layer['nearGridWidth'].value * layer['nearSlotsPerCell'].value),
      first: layer['baseInstances'].value };
    const x = Math.max(before.origin.x, after.origin.x);
    const z = Math.max(before.origin.y, after.origin.y);
    expect(x).toBeLessThan(Math.min(before.origin.x + before.columns, after.origin.x + after.columns));
    expect(z).toBeLessThan(Math.min(before.origin.y + before.rows, after.origin.y + after.rows));
    const decode = (range: typeof before, index: number) => {
      const local = index - range.first;
      const cellIndex = Math.floor(local / range.slots);
      return { x: range.origin.x + cellIndex % range.columns,
        z: range.origin.y + Math.floor(cellIndex / range.columns), slot: local % range.slots + baseSlots };
    };
    const indexFor = (range: typeof before) => range.first +
      ((z - range.origin.y) * range.columns + x - range.origin.x) * range.slots + 3;
    expect(decode(before, indexFor(before))).toEqual({ x, z, slot: baseSlots + 3 });
    expect(decode(after, indexFor(after))).toEqual({ x, z, slot: baseSlots + 3 });
    layer.dispose();
  });
});
