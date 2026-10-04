import { WebGPUCoordinateSystem, type Camera } from 'three/webgpu';

/** NDC depth is [0,1] in WebGPU, [-1,1] in WebGL (also with reversed depth). */
export function cameraClipNear(camera: Pick<Camera, 'coordinateSystem'>): number {
  return camera.coordinateSystem === WebGPUCoordinateSystem ? 0 : -1;
}
