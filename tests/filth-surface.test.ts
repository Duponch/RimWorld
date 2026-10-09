import { describe, expect, it } from 'vitest';
import type { InstancedBufferAttribute } from 'three/webgpu';
import type { FilthRecord } from '../src/sim/filth-rules';
import { FilthLayer } from '../src/render/FilthLayer';
import { filthDecal } from '../src/render/filth-appearance';
import { floorPartsForKind } from '../src/render/HygieneLayer';
import { FILTH_SURFACE_OFFSET, FLOOR_SURFACE_Y, filthSurfacePatches, surfaceHeightAtCell, type FilthSurface } from '../src/render/surface-height';
import { WORLD_SCALE } from '../src/world/scale';

const surface = (width = 12, height = 12): FilthSurface => ({
  width, height, tiles: Array.from({ length: width * height }, () => ({ terrain: 'soil' as const })),
});
const stain = (thickness = 1): FilthRecord => ({
  id: 42, kind: 'ash', x: 4, z: 4, thickness, grownCore: 123, expiresAfterCore: 456, nextCheckCore: 789,
});
const attribute = (layer: FilthLayer, name: string) => layer.mesh.geometry.getAttribute(name) as InstancedBufferAttribute;
const values = (buffer: InstancedBufferAttribute, index: number) =>
  [buffer.getX(index), buffer.getY(index), buffer.getZ(index), buffer.getW(index)];

describe('support des traces sur les surfaces construites V285', () => {
  it('partage la hauteur réelle des neuf sols et distingue terrain, eau et bord de carte', () => {
    const world = surface();
    expect(surfaceHeightAtCell(world, 4, 4)).toBe(0);
    world.tiles[4 * world.width + 4]!.terrain = 'water';
    expect(surfaceHeightAtCell(world, 4, 4)).toBe(WORLD_SCALE.waterSurface);
    for (const floor of ['wood-planks', 'burned-wood', 'granite-tile', 'limestone-tile', 'marble-tile', 'sandstone-tile', 'slate-tile', 'steel-tile', 'sterile-tile'] as const) {
      world.tiles[4 * world.width + 4]!.floor = floor;
      expect(surfaceHeightAtCell(world, 4, 4)).toBe(FLOOR_SURFACE_Y);
      for (const part of floorPartsForKind(floor, 4, 4)) expect(part.y + part.sy! / 2).toBeCloseTo(FLOOR_SURFACE_Y, 12);
    }
    expect(surfaceHeightAtCell(world, -1, 4)).toBeUndefined();
    expect(surfaceHeightAtCell(world, world.width, 4)).toBeUndefined();
  });

  it('fusionne une surface uniforme et couvre chaque fragment de trois bandes sans chevauchement', () => {
    const world = surface(4, 3), bounds = { minX: -.25, minZ: -.25, maxX: 3.25, maxZ: 2.25 };
    expect(filthSurfacePatches(world, bounds)).toEqual([{ ...bounds, height: 0 }]);
    for (let z = 0; z < world.height; z++) for (let x = 0; x < world.width; x++) {
      if (x < 2) world.tiles[z * world.width + x]!.floor = 'wood-planks';
      if (x === 3) world.tiles[z * world.width + x]!.terrain = 'water';
    }
    const patches = filthSurfacePatches(world, bounds);
    expect(patches).toEqual([
      { minX: -.25, minZ: -.25, maxX: 1.5, maxZ: 2.25, height: FLOOR_SURFACE_Y },
      { minX: 1.5, minZ: -.25, maxX: 2.5, maxZ: 2.25, height: 0 },
      { minX: 2.5, minZ: -.25, maxX: 3.25, maxZ: 2.25, height: WORLD_SCALE.waterSurface },
    ]);
    for (const x of [-.2, .9, 1.4999, 1.5, 2.4999, 2.5, 3.2]) for (const z of [-.2, .5, 1.5, 2.2]) {
      const support = patches.filter(p => x >= p.minX && x < p.maxX && z >= p.minZ && z < p.maxZ);
      expect(support).toHaveLength(1);
      expect(support[0]!.height).toBe(surfaceHeightAtCell(world, Math.floor(x + .5), Math.floor(z + .5)));
    }
    expect(filthSurfacePatches(world, { minX: -2, minZ: -2, maxX: -.6, maxZ: 0 })).toEqual([]);
  });

  it('garde un seul plan par couche sur une région uniforme, même pour les grandes cendres', () => {
    const world = surface(), items = [stain(3)], layer = new FilthLayer();
    try {
      layer.update(items, false, world);
      expect(layer.mesh.geometry.instanceCount).toBe(3);
      for (let i = 0; i < 3; i++) expect(attribute(layer, 'filthPose').getY(i)).toBeCloseTo(FILTH_SURFACE_OFFSET, 7);
      for (const tile of world.tiles) tile.floor = 'sterile-tile';
      layer.update(items, false, world);
      expect(layer.mesh.geometry.instanceCount).toBe(3);
      for (let i = 0; i < 3; i++) expect(attribute(layer, 'filthPose').getY(i)).toBeCloseTo(FLOOR_SURFACE_Y + FILTH_SURFACE_OFFSET, 7);
    } finally { layer.dispose(); }
  });

  it('conserve la hauteur de l’API autonome historique et adopte ensuite la vraie surface', () => {
    const world = surface(), items = [stain()], layer = new FilthLayer();
    try {
      layer.update(items);
      expect(layer.mesh.geometry.instanceCount).toBe(1);
      expect(attribute(layer, 'filthPose').getY(0)).toBeCloseTo(.071, 7);
      layer.update(items, false, world);
      expect(attribute(layer, 'filthPose').getY(0)).toBeCloseTo(FILTH_SURFACE_OFFSET, 7);
      layer.update(items);
      expect(attribute(layer, 'filthPose').getY(0)).toBeCloseTo(.071, 7);
    } finally { layer.dispose(); }
  });

  it('divise une grande trace au bord du sol en conservant centre, rotation, taille et UV de chaque couche', () => {
    const world = surface(), item = stain(2), layer = new FilthLayer();
    for (let i = 0; i < world.tiles.length; i++) if (i % world.width <= 4) world.tiles[i]!.floor = 'steel-tile';
    try {
      layer.update([item], false, world);
      expect(layer.mesh.geometry.instanceCount).toBe(4);
      const pose = attribute(layer, 'filthPose'), shape = attribute(layer, 'filthShape'), clip = attribute(layer, 'filthClip');
      for (let thickness = 0; thickness < 2; thickness++) {
        const decal = filthDecal(item, thickness);
        for (let side = 0; side < 2; side++) {
          const index = thickness * 2 + side;
          expect([pose.getX(index), pose.getZ(index), pose.getW(index)]).toEqual([decal.x, decal.z, decal.rotation].map(Math.fround));
          expect(values(shape, index)).toEqual([decal.width, decal.height, decal.tile, decal.flip ? 1 : 0].map(Math.fround));
        }
        expect(pose.getY(thickness * 2)).toBeCloseTo(FLOOR_SURFACE_Y + FILTH_SURFACE_OFFSET, 7);
        expect(pose.getY(thickness * 2 + 1)).toBeCloseTo(FILTH_SURFACE_OFFSET, 7);
        expect(clip.getZ(thickness * 2)).toBe(4.5);
        expect(clip.getX(thickness * 2 + 1)).toBe(4.5);
      }
      expect(Array.from(layer.mesh.geometry.getAttribute('uv').array)).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
      expect(layer.mesh.material.transparent).toBe(true);
      expect(layer.mesh.material.depthWrite).toBe(false);
    } finally { layer.dispose(); }
  });

  it('voit les sols posés et retirés sous des traces inchangées, sans upload pour un changement éloigné', () => {
    const world = surface(), items = [stain(2)], layer = new FilthLayer();
    try {
      layer.update(items, false, world);
      const pose = attribute(layer, 'filthPose'), shape = attribute(layer, 'filthShape'), clip = attribute(layer, 'filthClip');
      const versions = () => [pose.version, shape.version, clip.version];
      const initial = versions();
      for (let i = 0; i < world.tiles.length; i++) if (i % world.width <= 4) world.tiles[i]!.floor = 'marble-tile';
      layer.update(items, false, world);
      expect(versions()).toEqual(initial.map(v => v + 1));
      expect(layer.mesh.geometry.instanceCount).toBe(4);
      const built = versions();
      layer.update(items, false, world);
      expect(versions()).toEqual(built);
      for (const tile of world.tiles) delete tile.floor;
      layer.update(items, false, world);
      expect(versions()).toEqual(built.map(v => v + 1));
      expect(layer.mesh.geometry.instanceCount).toBe(2);
      const removed = versions();
      world.tiles[10 * world.width + 10]!.floor = 'wood-planks';
      layer.update(items, false, world);
      expect(versions()).toEqual(removed);
    } finally { layer.dispose(); }
  });

  it('suit une modification du terrain sous les mêmes items et conserve une reprise de compilation concurrente', () => {
    const world = surface(), items = [stain()], layer = new FilthLayer();
    try {
      layer.update([], false, world);
      const restore = layer.prepareForCompile();
      layer.update(items, false, world);
      restore();
      expect(layer.mesh.visible).toBe(true);
      expect(layer.mesh.geometry.instanceCount).toBe(1);
      const pose = attribute(layer, 'filthPose');
      for (const tile of world.tiles) tile.terrain = 'water';
      layer.update(items, false, world);
      expect(layer.mesh.geometry.instanceCount).toBe(1);
      expect(pose.getY(0)).toBeCloseTo(WORLD_SCALE.waterSurface + FILTH_SURFACE_OFFSET, 7);
      for (const tile of world.tiles) tile.floor = 'granite-tile';
      layer.update(items, false, world);
      expect(layer.mesh.geometry.instanceCount).toBe(1);
      expect(pose.getY(0)).toBeCloseTo(FLOOR_SURFACE_Y + FILTH_SURFACE_OFFSET, 7);
    } finally { layer.dispose(); }
  });
});
