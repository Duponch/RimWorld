import { expect, test, vi } from 'vitest';
import { Frustum, Matrix4, PerspectiveCamera, Vector3, WebGLCoordinateSystem, WebGPUCoordinateSystem } from 'three/webgpu';
import { cameraClipNear } from '../src/render/camera-clip';
import { GpuGroundGrassLayer } from '../src/render/GpuGroundGrassLayer';
import type { World } from '../src/sim/types';

test.each([WebGLCoordinateSystem, WebGPUCoordinateSystem])('NDC guard and configured frustum reject the band before the near plane (%i)', coordinateSystem => {
  const camera = new PerspectiveCamera(60, 1, .1, 100); camera.coordinateSystem = coordinateSystem;
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const before = new Vector3(0, 0, -.075), inside = new Vector3(0, 0, -.11);
  const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), camera.coordinateSystem, camera.reversedDepth);
  expect(frustum.containsPoint(before)).toBe(false); expect(frustum.containsPoint(inside)).toBe(true);
  expect(before.clone().project(camera).z).toBeLessThan(cameraClipNear(camera));
  expect(inside.clone().project(camera).z).toBeGreaterThan(cameraClipNear(camera));
});

test('an insufficient configured texture limit disables decoration before dense allocation and cannot be warmed/presented', () => {
  const warning = vi.fn(), layer = new GpuGroundGrassLayer(undefined, 2048, warning);
  const world = { width: 250, height: 250 } as World; // Guard precedes any World collection read/allocation.
  const image = layer.bloodMap.image, version = layer.bloodMap.version;
  layer.update(world); layer.update(world);
  expect(layer.bloodMap.image).toBe(image); expect(layer.bloodMap.version).toBe(version);
  expect(warning).toHaveBeenCalledOnce(); expect(warning.mock.calls[0]![0]).toContain('3500 × 250');
  layer.prepareForCompile()(); layer.present(new PerspectiveCamera(), new Vector3(), 1, 100);
  expect(layer.mesh.visible).toBe(false); expect(layer.mesh.geometry.instanceCount).toBe(0); layer.dispose();
});
