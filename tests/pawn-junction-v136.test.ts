import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { pawnGeometry } from '../src/render/pawn-geometry';
import { PawnLayer } from '../src/render/PawnLayer';
import { createWorld } from '../src/sim/index';

/** Weld duplicate draw vertices so the test measures the surface, not its storage layout. */
test('the clothed torso and pelvis form one closed exterior surface without an internal waist cap', () => {
  const geometry = pawnGeometry();
  try {
    const position = geometry.getAttribute('position');
    // V135 transformed 2,088 vertices. Keep the joined surface within +10%.
    expect(position.count).toBeLessThanOrEqual(2296);
    const bone = geometry.getAttribute('boneId');
    const dye = geometry.getAttribute('dye');
    const index = geometry.index;
    const triangles: number[][] = [];
    const vertices: [number, number, number][] = [];
    const ids = new Map<string, number>();
    const welded = (source: number): number => {
      const point: [number, number, number] = [position.getX(source), position.getY(source), position.getZ(source)];
      const key = point.map(value => Math.round(value * 1e6)).join(',');
      let id = ids.get(key);
      if (id === undefined) { id = vertices.length; ids.set(key, id); vertices.push(point); }
      return id;
    };
    const vertexAt = (corner: number) => index ? index.getX(corner) : corner;
    for (let first = 0; first < (index?.count ?? position.count); first += 3) {
      const source = [0, 1, 2].map(offset => vertexAt(first + offset));
      if (!source.every(id => bone.getX(id) === 0 && dye.getX(id) === 1)) continue;
      triangles.push(source.map(welded));
    }
    expect(triangles.length).toBeGreaterThan(0);
    const y = vertices.map(point => point[1]);
    const minY = Math.min(...y), maxY = Math.max(...y);
    expect(maxY - minY).toBeGreaterThan(0.3);
    expect(minY, 'the joined shell must reach below the hips').toBeLessThan(0.55);
    expect(maxY, 'the joined shell must reach the shoulders').toBeGreaterThan(1);

    const edgeFaces = new Map<string, number[]>();
    const faces = new Set<string>();
    triangles.forEach((triangle, face) => {
      expect(new Set(triangle).size, `collapsed body triangle ${face}`).toBe(3);
      const faceKey = [...triangle].sort((a, b) => a - b).join(':');
      expect(faces.has(faceKey), `duplicate body triangle ${face}`).toBe(false);
      faces.add(faceKey);
      const heights = triangle.map(id => vertices[id]![1]);
      const horizontal = heights.every(height => Math.abs(height - heights[0]!) < 1e-6);
      if (horizontal) {
        const level = heights[0]!;
        expect(level < minY + 1e-6 || level > maxY - 1e-6,
          `an internal horizontal cap remains at y=${level}`).toBe(true);
      }
      for (let side = 0; side < 3; side++) {
        const a = triangle[side]!, b = triangle[(side + 1) % 3]!;
        const key = [a, b].sort((left, right) => left - right).join(':');
        const adjacent = edgeFaces.get(key) ?? [];
        adjacent.push(face);
        edgeFaces.set(key, adjacent);
      }
    });
    for (const [edge, adjacent] of edgeFaces) {
      expect(adjacent.length, `open or overlapping surface at edge ${edge}`).toBe(2);
    }
    const visited = new Set<number>([0]), pending = [0];
    const neighbours: number[][] = triangles.map(() => []);
    for (const [a, b] of edgeFaces.values()) {
      neighbours[a!]!.push(b!);
      neighbours[b!]!.push(a!);
    }
    while (pending.length) for (const neighbour of neighbours[pending.pop()!]!) {
      if (!visited.has(neighbour)) { visited.add(neighbour); pending.push(neighbour); }
    }
    expect(visited.size, 'the body is still assembled from separate closed boxes').toBe(triangles.length);
  } finally {
    geometry.dispose();
  }
});

test('the joined pawn remains in the existing WebGPU vertex-stream budget', () => {
  const layer = new PawnLayer();
  try {
    layer.update(createWorld(42, 32, 32), 1, true);
    const geometry = layer.feedbackSource!;
    const active = Object.entries(geometry.attributes).filter(([name]) => name !== 'aFire');
    const streams = new Set(active.map(([, attribute]) => attribute instanceof THREE.InterleavedBufferAttribute
      ? attribute.data : attribute));
    expect(active.length).toBeLessThanOrEqual(16);
    expect(streams.size).toBeLessThanOrEqual(7);
  } finally {
    layer.dispose();
  }
});
