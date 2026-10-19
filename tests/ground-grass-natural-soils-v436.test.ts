import { describe, expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import type { Terrain } from '../src/sim/types';
import { GpuGroundGrassLayer, groundGrassPixels } from '../src/render/GpuGroundGrassLayer';
import { TERRAIN_COLORS } from '../src/render/TerrainLayer';
import { noise } from '../src/render/StaticGeometry';

// Explicit visual policy, independent of fertility: gravel is fertile but bare,
// and packed dirt is a road even though its player label contains "Terre".
const coverage: Record<Terrain, boolean> = {
  grass: true, soil: true, 'rich-soil': true,
  'soil-natural': true, 'mossy-soil': true, 'marshy-soil': true,
  'packed-dirt': false, gravel: false, riverbank: false, mud: false,
  sand: false, 'soft-sand': false, ice: false, 'rough-stone': false, rock: false,
  marsh: false, water: false, 'water-shallow': false, 'water-deep': false,
  'ocean-shallow': false, 'ocean-deep': false,
  'river-shallow': false, 'river-chest-deep': false,
};

function bareWorld() {
  const world = createWorld(436, 8, 8);
  world.site = { ...world.site!, biome: 'temperate-forest' };
  world.structures = []; world.resources = []; world.piles = []; world.packed = [];
  world.filth = { rng: 1, cleaned: 0, items: [] };
  world.tiles = world.tiles.map(() => ({ terrain: 'mud' }));
  return world;
}

describe('geographic soils retain the decorative grass carpet V436', () => {
  test('covers every soil identity with its actual palette while distinct bare terrain stays bare', () => {
    const world = bareWorld();
    const terrains = Object.keys(coverage) as Terrain[];
    for (const [index, terrain] of terrains.entries()) world.tiles[index] = { terrain };
    const before = JSON.stringify(world);
    const pixels = groundGrassPixels(world);
    for (const [index, terrain] of terrains.entries()) {
      expect(pixels[index * 4 + 3], terrain).toBe(coverage[terrain] ? 255 : 0);
      if (!coverage[terrain]) continue;
      const hex = new THREE.Color(TERRAIN_COLORS[terrain])
        .multiplyScalar(.94 + noise(index % world.width, Math.floor(index / world.width), world.seed) * .12).getHex();
      expect(Array.from(pixels.slice(index * 4, index * 4 + 3)), terrain)
        .toEqual([hex >>> 16, hex >>> 8 & 255, hex & 255]);
    }
    expect(JSON.stringify(world)).toBe(before);
  });

  test.each(['soil-natural', 'mossy-soil', 'marshy-soil'] as const)
    ('%s retains cover/snow masking and updates only when its surface pixels change', terrain => {
      const world = bareWorld();
      world.tiles[0] = { terrain };
      world.tiles[1] = { terrain, floor: 'wood-planks' };
      world.tiles[2] = { terrain, snowDepth: .5 };
      world.tiles[3] = { terrain, snowDepth: .49 };
      world.tiles[4] = { terrain };
      world.structures = [{ id: 1, kind: 'wall', x: 4, z: 0, orientation: 0, footprint: 'standard' }];
      const layer = new GpuGroundGrassLayer();
      try {
        layer.update(world);
        const alpha = () => Array.from(layer.map.image.data as Uint8Array)
          .filter((_, i) => i < 20 && i % 4 === 3);
        expect(alpha()).toEqual([255, 0, 0, 255, 0]);
        const version = layer.map.version;
        layer.update(world);
        expect(layer.map.version).toBe(version);
        world.tiles = world.tiles.map((tile, index) => index === 0 ? { ...tile, miningDamage: 2 } : tile);
        layer.update(world, false, [0]);
        expect(layer.map.version).toBe(version);
        world.tiles = world.tiles.map((tile, index) => index === 0 ? { terrain: 'mud' } : tile);
        layer.update(world, false, [0]);
        expect(alpha()).toEqual([0, 0, 0, 255, 0]);
        expect(layer.map.version).toBe(version + 1);
        world.tiles = world.tiles.map((tile, index) => index === 0 ? { terrain } : tile);
        layer.update(world, false, [0]);
        expect(alpha()).toEqual([255, 0, 0, 255, 0]);
        expect(layer.map.version).toBe(version + 2);
        expect(layer.map.image.data).toEqual(groundGrassPixels(world));
      } finally {
        layer.dispose();
      }
    });
});
