import { expect, test } from 'vitest';
import { createDioramaGeometry } from '../src/render/diorama-geometry';

test.each([[32, 32], [250, 250], [48, 32]])('static cardboard fits outside a %i×%i playable map', (width, height) => {
  const model = createDioramaGeometry(width, height);
  expect(model.parts.length).toBeLessThanOrEqual(18);
  let count = 0;
  for (const { geometry, layer } of model.parts) {
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    count += position.count;
    expect(geometry.index!.count % 3).toBe(0);
    for (const attribute of ['normal', 'uv', 'color']) expect(geometry.getAttribute(attribute).count).toBe(position.count);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      expect([x, y, z].every(Number.isFinite)).toBe(true);
      expect(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i))).toBeCloseTo(1, 5);
      if (y >= 0) expect(x < -.5 || z < -.5 || x > width - .5 || z > height - .5).toBe(true);
      if (layer === 'table') expect(y).toBeLessThan(0);
    }
    geometry.dispose();
  }
  expect(count).toBeLessThan(60000);
});
