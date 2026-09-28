export interface AudioCamera {
  x: number;
  y: number;
  z: number;
  /** Orbit target in world coordinates; required for useful orthographic sound. */
  targetX?: number;
  targetZ?: number;
  /** Visible height in world units at the orbit target (CameraRig.span). */
  span?: number;
  /** OrthographicCamera.zoom, used only when span is unavailable. */
  zoom?: number;
  mode?: 'orthographic' | 'perspective';
}

export interface ListenerPose {
  x: number;
  y: number;
  z: number;
  forwardX: number;
  forwardZ: number;
}

const EAR_HEIGHT = 1.6;

/** An orthographic camera may sit hundreds of metres away solely for clipping.
 * Its orbit target, rather than its physical position, defines the audible area.
 */
export function listenerPose(camera: AudioCamera): ListenerPose {
  const targetX = Number.isFinite(camera.targetX) ? camera.targetX! : camera.x;
  const targetZ = Number.isFinite(camera.targetZ) ? camera.targetZ! : camera.z;
  const directionX = targetX - camera.x;
  const directionZ = targetZ - camera.z;
  const length = Math.hypot(directionX, directionZ);
  const forwardX = length > 0.001 ? directionX / length : 0;
  const forwardZ = length > 0.001 ? directionZ / length : -1;
  // In a low perspective view the camera itself approaches the listener's ear.
  // High perspective and orthographic views listen around the orbit target.
  const cameraWeight = camera.mode === 'perspective'
    ? Math.max(0, Math.min(0.7, (20 - camera.y) / 24)) : 0;
  return {
    x: targetX + (camera.x - targetX) * cameraWeight,
    y: EAR_HEIGHT,
    z: targetZ + (camera.z - targetZ) * cameraWeight,
    forwardX, forwardZ,
  };
}

/** Zooming out quiets distant work; a full map never becomes one listening area. */
export function audibleRange(baseRange: number, camera: AudioCamera): number {
  const scale = Number.isFinite(camera.span) && camera.span! > 0 ? 32 / camera.span!
    : Number.isFinite(camera.zoom) && camera.zoom! > 0 ? camera.zoom! : 1;
  const zoomFactor = Math.max(0.55, Math.min(1.25, Math.sqrt(scale)));
  return Math.max(2, Math.min(36, baseRange * zoomFactor));
}

export function sourceDistance(x: number, z: number, pose: ListenerPose): number {
  return Math.hypot(x - pose.x, z - pose.z);
}
