import { expect, test } from 'vitest';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three/webgpu';
import { DESIGNATION_ICON_PIXELS, DESIGNATION_MIN_CELL_PIXELS } from '../src/render/DesignationIconLayer';
import { PILE_LABEL_MIN_CELL_PIXELS } from '../src/render/MapLabelsOverlay';
import { perspectiveDetailRange, screenSpriteScale } from '../src/render/map-overlay-detail';

test('close pile labels reject off-axis distant cells even when their view depth is near', () => {
  const camera = new PerspectiveCamera(45, 16 / 9, .1, 2000);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const height = 900, range = perspectiveDetailRange(camera, height, PILE_LABEL_MIN_CELL_PIXELS);
  const close = new Vector3(0, 0, -range * .9);
  const offAxis = new Vector3(range * .5, 0, -range * .9);
  expect(camera.position.distanceToSquared(close)).toBeLessThan(range * range);
  expect(camera.position.distanceToSquared(offAxis)).toBeGreaterThan(range * range);
  expect(Math.abs(offAxis.clone().project(camera).x)).toBeLessThan(1);
  expect(height * camera.projectionMatrix.elements[5]! / (2 * -offAxis.z)).toBeGreaterThan(PILE_LABEL_MIN_CELL_PIXELS);
});

test('designation sprites keep a 30 CSS-pixel height across near, far and orthographic views', () => {
  const height = 900, pixels = DESIGNATION_ICON_PIXELS;
  const perspective = new PerspectiveCamera(45, 16 / 9, .1, 2000);
  const orthographic = new OrthographicCamera(-12, 12, 12, -12, .1, 2000);
  const measure = (camera: PerspectiveCamera | OrthographicCamera, depth: number): number => {
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const scale = screenSpriteScale(camera, height, pixels);
    // The designation vertex shader multiplies perspective scale by each
    // target's view depth before projecting its camera-facing quad.
    const half = scale * (camera instanceof PerspectiveCamera ? depth : 1) * .5;
    const top = new Vector3(0, half, -depth).project(camera);
    const bottom = new Vector3(0, -half, -depth).project(camera);
    return Math.abs(top.y - bottom.y) * height * .5;
  };
  expect(measure(perspective, 8)).toBeCloseTo(pixels, 5);
  expect(measure(perspective, 30)).toBeCloseTo(pixels, 5);
  perspective.zoom = 1.7;
  expect(measure(perspective, 30)).toBeCloseTo(pixels, 5);
  expect(measure(orthographic, 8)).toBeCloseTo(pixels, 5);
  orthographic.zoom = 3;
  expect(measure(orthographic, 30)).toBeCloseTo(pixels, 5);
  expect(perspectiveDetailRange(perspective, height, DESIGNATION_MIN_CELL_PIXELS))
    .toBeGreaterThan(perspectiveDetailRange(perspective, height, PILE_LABEL_MIN_CELL_PIXELS));
});
