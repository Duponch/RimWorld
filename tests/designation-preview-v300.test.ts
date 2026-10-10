import { expect, test, vi } from 'vitest';
import * as THREE from 'three/webgpu';
import { applyCommand, createWorld } from '../src/sim/engine';
import { queryArea } from '../src/sim/designation';
import type { AreaAction, Job, World } from '../src/sim/types';
import { DESIGNATION_MIN_CELL_PIXELS, DesignationIconLayer, designationIconInstances,
  designationPreviewIconInstances } from '../src/render/DesignationIconLayer';
import { perspectiveDetailRange } from '../src/render/map-overlay-detail';

const job = (world: World, kind: Job['kind'], x: number, z: number): Job => ({
  id: world.nextId++, kind, x, z, orientation: 0, footprint: 'standard', status: 'pending',
  reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 },
});
function fixture(): World {
  const world = createWorld(300, 12, 12);
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = []; world.structures = []; world.jobs = []; world.piles = [];
  world.stockpiles = []; world.growingZones = [];
  world.tiles[2 * world.width + 1] = { terrain: 'rock' };
  world.resources = [
    { id: world.nextId++, kind: 'tree', species: 'oak', x: 2, z: 2, amount: 10, growth: 1, growthTick: world.tick },
    { id: world.nextId++, kind: 'berries', x: 3, z: 2, amount: 10, growth: 1, growthTick: world.tick },
    { id: world.nextId++, kind: 'berries', x: 4, z: 2, amount: 10, growth: .1, growthTick: world.tick },
    { id: world.nextId++, kind: 'tree', species: 'pine', x: 5, z: 2, amount: 10, growth: .1, growthTick: world.tick },
    { id: world.nextId++, kind: 'tree', x: 6, z: 2, amount: 10 },
  ];
  world.jobs = [job(world, 'chop', 6, 2)];
  return world;
}
const selection = (world: World, action: AreaAction): number[] => {
  const result = queryArea(world, { type: 'area', action, from: { x: 0, z: 0 }, to: { x: 10, z: 10 } });
  if (!result.ok) throw new Error(result.reason);
  return result.cells;
};
const layer = () => new DesignationIconLayer(() => undefined);
const active = (icons: DesignationIconLayer) => {
  const geometry = icons.mesh.geometry, count = geometry.instanceCount;
  return { positions: Array.from(geometry.getAttribute('designationPosition').array).slice(0, count * 3),
    icons: Array.from(geometry.getAttribute('designationIcon').array).slice(0, count) };
};

test('rectangle previews use compatible targets and the exact icons/heights of committed orders', () => {
  const world = fixture(), before = JSON.stringify(world);
  for (const [action, xs] of [['mine', [1]], ['chop', [2]], ['harvest', [3]], ['cut', [2, 3, 4, 5]]] as const) {
    const cells = selection(world, action);
    expect(cells).toEqual(xs.map(x => 2 * world.width + x));
    const preview = designationPreviewIconInstances(world, action, cells);
    const committed = { ...world, jobs: xs.map((x, index) => ({ ...world.jobs[0]!, id: 900 + index, kind: action, x })) };
    expect(preview).toEqual(designationIconInstances(committed));
  }
  expect(JSON.stringify(world)).toBe(before);
});

test('preview rejects repeated/outside cells and never duplicates an existing icon', () => {
  const world = fixture(), cell = 2 * world.width + 2, occupied = 2 * world.width + 6;
  const expected = designationPreviewIconInstances(world, 'chop', [cell]);
  expect(designationPreviewIconInstances(world, 'chop', [cell, occupied, cell, -1, .5, NaN, Infinity, world.width * world.height]))
    .toEqual(expected);
  expect(designationPreviewIconInstances(world, 'cancel', [cell])).toEqual([]);
  const icons = layer();
  icons.updatePreview(world, 'chop', [cell, occupied, cell]);
  expect(icons.mesh.geometry.instanceCount).toBe(2);
  expect(active(icons).icons).toEqual([1, 1]);
  icons.clearPreview();
  expect(icons.mesh.geometry.instanceCount).toBe(1);
  expect(active(icons).positions[0]).toBe(6);
  icons.dispose();
});

test('release replaces temporary instances with real jobs and snapshot updates discard stale eligibility', () => {
  const world = fixture(), icons = layer();
  icons.updatePreview(world, 'chop', selection(world, 'chop'));
  const preview = active(icons);
  expect(applyCommand(world, { type: 'area', action: 'chop', from: { x: 0, z: 0 }, to: { x: 10, z: 10 } }).ok).toBe(true);
  icons.update(world);
  expect(active(icons)).toEqual(preview);
  icons.clearPreview();
  expect(icons.mesh.geometry.instanceCount).toBe(2);
  icons.updatePreview(world, 'harvest', selection(world, 'harvest'));
  expect(icons.mesh.geometry.instanceCount).toBe(3);
  icons.update(world);
  expect(icons.mesh.geometry.instanceCount).toBe(2);
  icons.dispose();
});

test('zero threshold disables perspective distance rejection while positive thresholds remain configurable', () => {
  const world = fixture(), icons = layer(); icons.update(world);
  const perspective = new THREE.PerspectiveCamera(45, 16 / 9, .1, 2000);
  const orthographic = new THREE.OrthographicCamera(-20, 20, 20, -20, .1, 2000);
  const shader = icons as unknown as { distanceLimited: { value: number }; detailDistance: { value: number } };
  icons.present(perspective, 1440, DESIGNATION_MIN_CELL_PIXELS - 1);
  expect(icons.mesh.visible).toBe(false);
  icons.setMinCellPixels(0);
  for (const camera of [perspective, orthographic]) {
    icons.present(camera, 1440, .001);
    expect(icons.mesh.visible).toBe(true);
    expect(shader.distanceLimited.value).toBe(0);
  }
  icons.setMinCellPixels(8); icons.present(perspective, 1440, 8);
  expect(icons.mesh.visible).toBe(true);
  expect(shader.distanceLimited.value).toBe(1);
  expect(shader.detailDistance.value).toBe(perspectiveDetailRange(perspective, 1440, 8));
  icons.present(perspective, 1440, 7.99); expect(icons.mesh.visible).toBe(false);
  icons.setMinCellPixels(NaN); icons.present(perspective, 1440, 31);
  expect(icons.mesh.visible).toBe(false);
  icons.setMinCellPixels(0); icons.present(perspective, 0, 0);
  expect(icons.mesh.visible).toBe(false);
  icons.dispose();
});

test('buffers stay resident, grow only when needed, and compile restoration preserves newer previews', () => {
  const world = fixture(); world.jobs = [];
  const icons = layer(), mesh = icons.mesh, geometry = mesh.geometry, material = mesh.material;
  icons.update(world); icons.present(new THREE.PerspectiveCamera(), 1440, 64);
  const restore = icons.prepareForCompile();
  expect(geometry.instanceCount).toBe(1); expect(mesh.visible).toBe(true);
  restore(); expect(geometry.instanceCount).toBe(0); expect(mesh.visible).toBe(false);

  const obsolete = icons.prepareForCompile();
  icons.updatePreview(world, 'chop', selection(world, 'chop'));
  icons.present(new THREE.PerspectiveCamera(), 1440, 64);
  const count = geometry.instanceCount, positions = geometry.getAttribute('designationPosition') as THREE.InstancedBufferAttribute;
  const version = positions.version;
  icons.updatePreview(world, 'chop', selection(world, 'chop'));
  expect(geometry.getAttribute('designationPosition')).toBe(positions);
  expect(positions.version).toBe(version);
  obsolete(); expect(geometry.instanceCount).toBe(count); expect(mesh.visible).toBe(true);

  const cells = Array.from({ length: 50 }, (_, i) => i);
  for (const cell of cells) world.tiles[cell] = { terrain: 'rock' };
  const grow = icons.prepareForCompile(); icons.updatePreview(world, 'mine', cells); grow();
  expect(icons.mesh).toBe(mesh); expect(mesh.material).toBe(material); expect(mesh.geometry).toBe(geometry);
  expect(geometry.instanceCount).toBe(50);
  const grown = geometry.getAttribute('designationPosition');
  expect(grown.count).toBeGreaterThanOrEqual(50);
  icons.updatePreview(world, 'mine', cells.slice(0, 2));
  expect(geometry.getAttribute('designationPosition')).toBe(grown);
  const clear = icons.prepareForCompile(); icons.clearPreview(); clear();
  expect(geometry.instanceCount).toBe(0); expect(mesh.visible).toBe(false);
  icons.dispose();
});

test('late atlas loading and compile restoration cannot revive a disposed layer', () => {
  let loaded: ((texture: THREE.Texture) => void) | undefined;
  const icons = new DesignationIconLayer((_url, onLoad) => { loaded = onLoad; });
  const restore = icons.prepareForCompile(), texture = new THREE.Texture();
  const dispose = vi.spyOn(texture, 'dispose');
  icons.dispose(); loaded!(texture); restore();
  expect(dispose).toHaveBeenCalledOnce();
});
