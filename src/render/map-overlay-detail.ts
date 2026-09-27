import type { OrthographicCamera, PerspectiveCamera } from 'three/webgpu';

/** Maximum true camera-to-object distance for one world cell to occupy the
 * requested number of vertical screen pixels in a perspective view. Radial
 * distance is at least view-space depth, so this is conservative off axis. */
export function perspectiveDetailRange(camera: PerspectiveCamera, viewportHeight: number, minCellPixels: number): number {
  return viewportHeight * camera.projectionMatrix.elements[5]! / (2 * minCellPixels);
}

/** Base world scale for a CSS pixel sprite. The vertex shader multiplies this
 * by per-target view depth in perspective; ortho uses it directly. */
export function screenSpriteScale(camera: OrthographicCamera | PerspectiveCamera, viewportHeight: number, spritePixels: number): number {
  return 2 * spritePixels / (viewportHeight * camera.projectionMatrix.elements[5]!);
}
