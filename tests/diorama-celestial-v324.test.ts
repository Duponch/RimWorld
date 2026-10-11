import { expect, test } from 'vitest';
import { Color, Ray, Vector3 } from 'three/webgpu';
import { createDioramaGeometry, DIORAMA_PAPER_THICKNESS } from '../src/render/diorama-geometry';
import { DIORAMA_SKY } from '../src/render/diorama-sky';

test('both celestial rods use full cardboard-paper thickness and leave a physical gap behind the cutouts', () => {
  const model = createDioramaGeometry(250, 250, 73, 'boreal-forest');
  try {
    const part = model.parts.find(part => part.geometry.hasAttribute('dioramaCelestial'))!;
    const position = part.geometry.getAttribute('position'), kinds = part.geometry.getAttribute('dioramaCelestial');
    for (const kind of [-1, 1]) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, cutoutBack = Infinity;
      let rodVertices = 0;
      for (let i = 0; i < kinds.count; i++) if (kinds.getX(i) === kind) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        // Below the discs only the rod remains; above the rod only cutout paper remains.
        if (y < model.span * .08) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); rodVertices++;
        }
        if (y > model.span * .18) cutoutBack = Math.min(cutoutBack, z);
      }
      expect(rodVertices).toBeGreaterThan(0);
      expect((maxX - minX) / model.span).toBeGreaterThan(.006);
      expect((maxZ - minZ) / model.span).toBeCloseTo(DIORAMA_PAPER_THICKNESS, 6);
      expect(Number.isFinite(cutoutBack)).toBe(true);
      expect((cutoutBack - maxZ) / model.span).toBeGreaterThan(.0001);
      expect(model.parts.length).toBeLessThanOrEqual(18);
    }
  } finally { model.parts.forEach(part => part.geometry.dispose()); }
});

test('the hand-cut moon is a real crescent with an empty opening, a solid outer limb and finite closed paper faces', () => {
  const model = createDioramaGeometry(250, 250, 73, 'temperate-forest');
  try {
    const geometry = model.parts.find(part => part.geometry.hasAttribute('dioramaCelestial'))!.geometry;
    const position = geometry.getAttribute('position'), color = geometry.getAttribute('color');
    const normal = geometry.getAttribute('normal'), kind = geometry.getAttribute('dioramaCelestial'), indices = geometry.index!;
    const pigment = new Color(0xe2e4d6), center = (-.5 - model.span * .0126) + (250 + model.span * .0252) * .68;
    const y = model.span * DIORAMA_SKY.center, radius = model.span * DIORAMA_SKY.moonRadius;
    const front = (i: number) => kind.getX(i) === -1 && normal.getZ(i) > .99
      && Math.abs(color.getX(i) - pigment.r) < 1e-6 && Math.abs(color.getY(i) - pigment.g) < 1e-6
      && Math.abs(color.getZ(i) - pigment.b) < 1e-6;
    const hits = (x: number): number => {
      const ray = new Ray(new Vector3(x, y, 10), new Vector3(0, 0, -1)), a = new Vector3(), b = new Vector3(), c = new Vector3(), hit = new Vector3();
      let count = 0;
      for (let i = 0; i < indices.count; i += 3) {
        const ia = indices.getX(i), ib = indices.getX(i + 1), ic = indices.getX(i + 2);
        if (!front(ia) || !front(ib) || !front(ic)) continue;
        a.fromBufferAttribute(position, ia); b.fromBufferAttribute(position, ib); c.fromBufferAttribute(position, ic);
        if (ray.intersectTriangle(a, b, c, false, hit)) count++;
      }
      return count;
    };
    expect(hits(center + radius * .2)).toBe(0);
    expect(hits(center - radius * .75)).toBeGreaterThan(0);
    const depths = new Set<number>();
    for (let i = 0; i < kind.count; i++) if (kind.getX(i) === -1) {
      expect(Number.isFinite(position.getX(i)) && Number.isFinite(position.getY(i)) && Number.isFinite(position.getZ(i))).toBe(true);
      depths.add(position.getZ(i));
    }
    expect(depths.size).toBe(4); // Two closed paper depths and two closed rod depths.
  } finally { model.parts.forEach(part => part.geometry.dispose()); }
});
