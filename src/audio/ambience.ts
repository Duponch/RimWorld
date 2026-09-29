import { listenerPose, type AudioCamera } from './spatial';

/** Global weather follows the map camera but softens as the listener rises. */
export function ambientCameraGain(camera: AudioCamera): number {
  const height = listenerPose(camera).y;
  return Math.max(0.15, 1 / (1 + Math.max(0, height - 2) / 32));
}
