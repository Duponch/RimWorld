import { afterEach, expect, test, vi } from 'vitest';
import * as THREE from 'three/webgpu';
import { MapLabelBatch } from '../src/render/MapLabelBatch';
import { QUALITY_LABELS } from '../src/sim/equipment-rules';

afterEach(() => vi.unstubAllGlobals());

function fixture() {
  const context = {
    setTransform: vi.fn(), measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    strokeText: vi.fn((_text: string, _x: number, _y: number) => {}), fillText: vi.fn((_text: string, _x: number, _y: number) => {}), font: '', textAlign: '', textBaseline: '',
    lineJoin: '', lineWidth: 0, strokeStyle: '', fillStyle: '',
  };
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => context) };
  const createElement = vi.fn(() => canvas);
  vi.stubGlobal('document', { createElement });
  const batch = new MapLabelBatch();
  return { batch, context, canvas, createElement };
}

test('one original atlas covers numeric and French quality glyphs without a DOM overlay', () => {
  const { batch, context, createElement } = fixture();
  expect(createElement).toHaveBeenCalledExactlyOnceWith('canvas');
  expect(context.font).toBe('12px Arial, sans-serif');
  expect(context.lineWidth).toBe(2.5);
  expect(context.strokeStyle).toBe('rgba(24, 29, 27, .85)');
  expect(context.fillStyle).toBe('#fff4d9');
  const glyphs = new Set(context.fillText.mock.calls.map(call => call[0]));
  for (const character of `0123456789${Object.values(QUALITY_LABELS).join('')}dépl.médi.norm.bonexc.chef-d’œuvrelég.`) {
    expect(glyphs.has(character), character).toBe(true);
  }
  batch.update([{ x: 4, y: .32, z: 6, label: '27', offsetY: 12 }]);
  expect(batch.mesh.geometry.instanceCount).toBe(2);
  const anchors = batch.mesh.geometry.getAttribute('labelAnchor');
  const offsets = batch.mesh.geometry.getAttribute('labelOffset');
  expect(Array.from(anchors.array).slice(0, 6)).toEqual([4, expect.closeTo(.32, 6), 6, 4, expect.closeTo(.32, 6), 6]);
  expect(Array.from(offsets.array).slice(0, 4)).toEqual([-3.5, -12, 3.5, -12]);
  batch.dispose();
});

test('camera, projection, viewport and visibility changes leave glyph buffers and atlas resident', () => {
  const { batch, context } = fixture();
  batch.update([{ x: 3, y: 1.2, z: 4, label: '99' }]);
  const geometry = batch.mesh.geometry;
  const attributes = ['labelAnchor', 'labelOffset', 'labelGlyph'].map(name => geometry.getAttribute(name) as THREE.InstancedBufferAttribute);
  const versions = attributes.map(attribute => attribute.version);
  const paints = context.fillText.mock.calls.length;
  const ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 100);
  const perspective = new THREE.PerspectiveCamera(45, 16 / 9, .1, 100);
  for (const camera of [ortho, perspective, ortho]) {
    for (const [height, pixels, threshold] of [[600, 120, 96], [900, 20, 96], [900, 20, 0]]) {
      camera.position.set(3, 15, 4);
      camera.lookAt(3, 0, 4);
      camera.zoom = 1.5;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      batch.present(camera, height!, pixels!, threshold!);
      expect(batch.mesh.visible).toBe(threshold === 0 || pixels! >= threshold!);
    }
  }
  batch.update([{ x: 3, y: 1.2, z: 4, label: '99', offsetY: 0 }]);
  expect(batch.mesh.geometry).toBe(geometry);
  expect(attributes.map(attribute => attribute.version)).toEqual(versions);
  expect(context.fillText).toHaveBeenCalledTimes(paints);
  expect(batch.mesh.material.depthTest).toBe(true);
  expect(batch.mesh.material.depthWrite).toBe(false);
  expect(batch.mesh.material.fog).toBe(false);
  expect(batch.mesh.material.toneMapped).toBe(false);
  expect(batch.mesh.material.userData.explorationIntent).toBe(true);
  batch.dispose();
});

test('capacity growth preserves material nodes and compilation restores current data and visibility', () => {
  const { batch } = fixture();
  const first = batch.mesh.geometry, disposeGeometry = vi.spyOn(first, 'dispose');
  const material = batch.mesh.material, vertex = material.vertexNode, color = material.colorNode;
  const restoreEmpty = batch.prepareForCompile();
  expect(batch.mesh.geometry.instanceCount).toBe(1);
  expect(batch.mesh.visible).toBe(true);
  restoreEmpty();
  expect(batch.mesh.geometry.instanceCount).toBe(0);
  expect(batch.mesh.visible).toBe(false);
  const restoreStale = batch.prepareForCompile();
  batch.update(Array.from({ length: 17 }, (_, x) => ({ x, y: .32, z: 2, label: '99' })));
  const camera = new THREE.PerspectiveCamera();
  batch.present(camera, 600, 120, 96);
  restoreStale();
  expect(batch.mesh.visible).toBe(true);
  expect(batch.mesh.geometry.instanceCount).toBe(34);
  expect(batch.mesh.geometry.getAttribute('labelAnchor').count).toBe(64);
  expect(batch.mesh.geometry).not.toBe(first);
  expect(disposeGeometry).toHaveBeenCalledOnce();
  expect(batch.mesh.material).toBe(material);
  expect(material.vertexNode).toBe(vertex);
  expect(material.colorNode).toBe(color);
  batch.update([]);
  const restoreUnchanged = batch.prepareForCompile();
  batch.update([]);
  restoreUnchanged();
  expect(batch.mesh.geometry.instanceCount).toBe(0);
  expect(batch.mesh.visible).toBe(false);
  const disposeMaterial = vi.spyOn(material, 'dispose');
  batch.dispose(); batch.dispose();
  expect(disposeMaterial).toHaveBeenCalledOnce();
});
