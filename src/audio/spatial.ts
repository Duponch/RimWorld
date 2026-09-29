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
// OrthographicCamera keeps a large, nearly fixed world-space offset for map
// clipping. Zoom changes its visible span rather than moving its position, so
// use a virtual ear height that tracks the equivalent change in view distance.
const ORTHOGRAPHIC_HEIGHT_PER_SPAN = 0.45;
// The virtual ear must retain useful headroom for sounds at the focus at the
// normal iso span; zoom-out then shortens this horizon as its ear rises.
const ORTHOGRAPHIC_RANGE_MULTIPLIER = 1.8;
// Perspective already moves its physical ear away as the camera zooms out.
// Keep the acoustic horizon stable instead of shortening it a second time.
const PERSPECTIVE_RANGE_MULTIPLIER = 2.5;

/** Perspective listens from the camera. Orthographic listens above its focus,
 * at a height derived from zoom; its distant render-camera offset is not an
 * acoustic distance. In both modes, the returned position drives the Web Audio
 * listener and source-distance culling alike. */
export function listenerPose(camera: AudioCamera): ListenerPose {
  const targetX = Number.isFinite(camera.targetX) ? camera.targetX! : camera.x;
  const targetZ = Number.isFinite(camera.targetZ) ? camera.targetZ! : camera.z;
  const directionX = targetX - camera.x;
  const directionZ = targetZ - camera.z;
  const length = Math.hypot(directionX, directionZ);
  const forwardX = length > 0.001 ? directionX / length : 0;
  const forwardZ = length > 0.001 ? directionZ / length : -1;
  if (camera.mode === 'perspective') {
    return { x: camera.x, y: camera.y, z: camera.z, forwardX, forwardZ };
  }
  const span = Number.isFinite(camera.span) && camera.span! > 0 ? camera.span!
    : Number.isFinite(camera.zoom) && camera.zoom! > 0 ? 32 / camera.zoom! : 32;
  const offsetHeight = Math.max(0, camera.y);
  const offsetLength = Math.hypot(directionX, offsetHeight, directionZ);
  const verticalFraction = offsetLength > 0.001 ? offsetHeight / offsetLength : 1;
  return {
    x: targetX,
    y: EAR_HEIGHT + span * ORTHOGRAPHIC_HEIGHT_PER_SPAN * verticalFraction,
    z: targetZ,
    forwardX, forwardZ,
  };
}

/** Orthographic zoom needs a virtual ear and a shrinking listening area.
 * Perspective zoom already changes the ear's real distance to every source. */
export function audibleRange(baseRange: number, camera: AudioCamera): number {
  if (camera.mode === 'perspective')
    return Math.max(2, Math.min(90, baseRange * PERSPECTIVE_RANGE_MULTIPLIER));
  const scale = Number.isFinite(camera.span) && camera.span! > 0 ? 32 / camera.span!
    : Number.isFinite(camera.zoom) && camera.zoom! > 0 ? camera.zoom! : 1;
  const zoomFactor = Math.max(0.2, Math.min(2, scale));
  return Math.max(2, Math.min(40, baseRange * ORTHOGRAPHIC_RANGE_MULTIPLIER * zoomFactor));
}

export function sourceDistance(x: number, z: number, pose: ListenerPose): number {
  return Math.hypot(x - pose.x, pose.y, z - pose.z);
}
