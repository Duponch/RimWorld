import { afterEach, expect, test, vi } from 'vitest';
import { OrthographicCamera } from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import type { World } from '../src/sim/types';
import { MapLabelsOverlay, PILE_LABEL_MIN_CELL_PIXELS } from '../src/render/MapLabelsOverlay';
import {itemLabelMinCellPixels,itemLabelVisibilityLabel} from '../src/ui/item-label-visibility';

afterEach(() => vi.unstubAllGlobals());

test('item-label option bounds, always visible and unchanged setting preserve cached canvas',()=>{
  expect(itemLabelMinCellPixels(null)).toBe(96);expect(itemLabelMinCellPixels('')).toBe(96);expect(itemLabelMinCellPixels(NaN)).toBe(96);
  expect(itemLabelMinCellPixels(-1)).toBe(0);expect(itemLabelMinCellPixels(300)).toBe(160);expect(itemLabelMinCellPixels('40.8')).toBe(41);
  expect(itemLabelVisibilityLabel(0)).toBe('Toujours visibles');
  const {overlay,context,canvas,camera,world}=overlayFixture();overlay.draw(world,camera,20,800,600);expect(canvas.hidden).toBe(true);
  overlay.setMinCellPixels(0);overlay.draw(world,camera,20,800,600);expect(canvas.hidden).toBe(false);expect(context.fillText).toHaveBeenCalledWith('2',expect.any(Number),expect.any(Number));
  const paints=context.clearRect.mock.calls.length;overlay.setMinCellPixels(0);overlay.draw(world,camera,20,800,600);expect(context.clearRect).toHaveBeenCalledTimes(paints);
  overlay.setMinCellPixels(160);overlay.draw(world,camera,120,800,600);expect(canvas.hidden).toBe(true);overlay.dispose();
});

function overlayFixture() {
  const context = {
    setTransform: vi.fn(), clearRect: vi.fn(), strokeText: vi.fn(), fillText: vi.fn(),
  };
  const canvas = {
    className: '', hidden: false, width: 0, height: 0,
    setAttribute: vi.fn(), getContext: vi.fn(() => context), remove: vi.fn(),
  };
  const host = { after: vi.fn() };
  const display = { devicePixelRatio: 1 };
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
  vi.stubGlobal('window', display);
  const overlay = new MapLabelsOverlay(host as unknown as HTMLElement);
  const camera = new OrthographicCamera(-6, 6, 6, -6, .1, 100);
  camera.position.set(4, 16, 4);
  camera.lookAt(4, 0, 4);
  camera.updateProjectionMatrix();
  let world: World = createWorld(190, 8, 8);
  world.piles = [{ id: 10, kind: 'wood', item: 'wood', quantity: 2,
    owner: { type: 'ground', x: 4, z: 4 } }];
  world.packed = [];
  return { overlay, context, canvas, camera, display, world };
}

test('stable snapshots keep the indexed labels and canvas pixels without repainting', () => {
  const { overlay, context, camera, world: initial } = overlayFixture();
  let world = initial;
  overlay.draw(world, camera, 120, 800, 600);
  expect(context.clearRect).toHaveBeenCalledTimes(1);
  expect(context.fillText).toHaveBeenCalledWith('2', expect.any(Number), expect.any(Number));
  const chunks = overlay['chunks'];

  // A worker snapshot replaces World and often packed, even if labels did not change.
  world = { ...world, tick: world.tick + 1, packed: world.packed.slice() };
  overlay.draw(world, camera, 120, 800, 600);
  world = { ...world, piles: world.piles.map(p => ({ ...p })), packed: world.packed.slice() };
  overlay.draw(world, camera, 120, 800, 600);
  expect(overlay['chunks']).toBe(chunks);
  expect(context.clearRect).toHaveBeenCalledTimes(1);

  world = { ...world, piles: [{ ...world.piles[0]!, quantity: 3 }] };
  overlay.draw(world, camera, 120, 800, 600);
  expect(context.clearRect).toHaveBeenCalledTimes(2);
  expect(context.fillText).toHaveBeenLastCalledWith('3', expect.any(Number), expect.any(Number));

  world = { ...world, packed: [{ building: { id: 11, kind: 'stool', x: 5, z: 4,
    orientation: 0, footprint: 'standard', quality: 'good' },
    owner: { type: 'ground', x: 5, z: 4 } }] };
  overlay.draw(world, camera, 120, 800, 600);
  expect(context.clearRect).toHaveBeenCalledTimes(3);
  expect(context.fillText).toHaveBeenLastCalledWith('bon', expect.any(Number), expect.any(Number));
  const packedChunks = overlay['chunks'];
  world = { ...world, packed: world.packed.map(p => ({ ...p, building: { ...p.building, damage: 1 } })) };
  overlay.draw(world, camera, 120, 800, 600);
  expect(overlay['chunks']).toBe(packedChunks);
  expect(context.clearRect).toHaveBeenCalledTimes(3);
  overlay.dispose();
});

test('camera, zoom, viewport, DPR and visibility transitions invalidate the canvas', () => {
  const { overlay, context, canvas, camera, display, world } = overlayFixture();
  overlay.draw(world, camera, 120, 800, 600);
  const chunks = overlay['chunks'];
  camera.position.x += 1;
  overlay.draw(world, camera, 120, 800, 600);
  expect(context.clearRect).toHaveBeenCalledTimes(2);
  expect(overlay['chunks']).toBe(chunks);

  camera.zoom = 1.5;
  camera.updateProjectionMatrix();
  overlay.draw(world, camera, 120, 800, 600);
  expect(context.clearRect).toHaveBeenCalledTimes(3);
  overlay.draw(world, camera, 120, 801, 600);
  expect(context.clearRect).toHaveBeenCalledTimes(4);
  display.devicePixelRatio = 1.5;
  overlay.draw(world, camera, 120, 801, 600);
  expect(context.clearRect).toHaveBeenCalledTimes(5);
  expect(canvas.width).toBe(Math.ceil(801 * 1.5));

  overlay.draw(world, camera, PILE_LABEL_MIN_CELL_PIXELS - 1, 801, 600);
  expect(canvas.hidden).toBe(true);
  expect(context.clearRect).toHaveBeenCalledTimes(5);
  overlay.draw(world, camera, PILE_LABEL_MIN_CELL_PIXELS, 801, 600);
  expect(canvas.hidden).toBe(false);
  expect(context.clearRect).toHaveBeenCalledTimes(6);
  overlay.draw(world, camera, PILE_LABEL_MIN_CELL_PIXELS, 801, 600);
  expect(context.clearRect).toHaveBeenCalledTimes(6);

  const wider = createWorld(191, 9, 8);
  wider.piles = world.piles; wider.packed = world.packed;
  overlay.draw(wider, camera, 120, 801, 600);
  expect(overlay['chunks']).not.toBe(chunks);
  expect(context.clearRect).toHaveBeenCalledTimes(7);
  overlay.dispose();
});
