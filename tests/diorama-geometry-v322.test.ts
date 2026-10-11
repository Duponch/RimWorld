import * as THREE from 'three/webgpu';
import { expect, test } from 'vitest';
import { createDioramaDecor, type DioramaDecorKind } from '../src/render/diorama-decor';
import { createDioramaGeometry, DIORAMA_PAPER_THICKNESS, type DioramaSide } from '../src/render/diorama-geometry';

const inward: Record<DioramaSide, readonly [number, number]> = {
  north: [0, 1], west: [1, 0], south: [0, -1], east: [-1, 0],
};

test.each([[32, 32], [250, 250], [48, 32]])('all four %i×%i walls keep the north nominal height along the whole rim', (width, height) => {
  const model = createDioramaGeometry(width, height);
  const expected = Math.min(width, height) * .215;
  const highWalls = model.parts.filter(part => part.layer === 'upper' && part.material === 'cardboard');
  expect(highWalls).toHaveLength(4);
  for (const part of highWalls) {
    const position = part.geometry.getAttribute('position');
    const horizontal = part.side === 'north' || part.side === 'south';
    const min = -.5 - model.span * .0126;
    const length = (horizontal ? width : height) + model.span * .0252;
    for (let step = 0; step <= 16; step++) {
      const along = min + length * step / 16;
      let rim = -Infinity;
      for (let i = 0; i < position.count; i++) {
        const u = horizontal ? position.getX(i) : position.getZ(i);
        if (Math.abs(u - along) < model.span * 1e-6) rim = Math.max(rim, position.getY(i));
      }
      expect(rim).toBeGreaterThan(expected - model.span * .002);
      expect(rim).toBeLessThan(expected + model.span * .002);
    }
  }
  for (const part of model.parts) part.geometry.dispose();
});

test.each(['temperate-forest', 'boreal-forest', 'arid-shrubland'] as const)('%s paper faces, including both celestial slides, have 2.5× physical thickness', biome => {
  const model = createDioramaGeometry(250, 250, 0, biome);
  const edge = new THREE.Color(0xc9bfa8);
  const observed = new Set<number>();
  let checked = 0, mismatched = 0;
  expect(DIORAMA_PAPER_THICKNESS).toBeCloseTo(.00065 * 2.5, 12);
  for (const part of model.parts.filter(part => part.material === 'paper')) {
    const position = part.geometry.getAttribute('position'), normal = part.geometry.getAttribute('normal');
    const color = part.geometry.getAttribute('color'), celestial = part.geometry.getAttribute('dioramaCelestial');
    const [nx, nz] = inward[part.side!];
    const matches = (i: number, pigment: THREE.Color) => Math.abs(color.getX(i) - pigment.r) < 1e-6
      && Math.abs(color.getY(i) - pigment.g) < 1e-6 && Math.abs(color.getZ(i) - pigment.b) < 1e-6;
    const key = (i: number) => `${(nx ? position.getZ(i) : position.getX(i)).toFixed(6)},${position.getY(i).toFixed(6)}`;
    const depth = (i: number) => nx * position.getX(i) + nz * position.getZ(i);
    const backs = new Map<string, number[]>();
    for (let i = 0; i < position.count; i++) {
      const facing = nx * normal.getX(i) + nz * normal.getZ(i);
      if (facing > -.99 || !matches(i, edge)) continue;
      const k = key(i), existing = backs.get(k);
      if (existing) existing.push(depth(i)); else backs.set(k, [depth(i)]);
    }
    for (let i = 0; i < position.count; i++) {
      const facing = nx * normal.getX(i) + nz * normal.getZ(i);
      // Every planar paper front, including the slide rods, pairs with the
      // same full-thickness back edge.
      if (facing < .99) continue;
      observed.add(celestial?.getX(i) ?? 0); checked++;
      const expected = model.span * DIORAMA_PAPER_THICKNESS;
      if (!backs.get(key(i))?.some(back => Math.abs(depth(i) - back - expected) < model.span * 1e-6)) mismatched++;
    }
  }
  expect(checked).toBeGreaterThan(100);
  expect(mismatched).toBe(0);
  expect([...observed].sort()).toEqual([-1, 0, 1]);
  for (const part of model.parts) part.geometry.dispose();
});

test('the lifted cloud fold keeps its base film and tip relief at 2.5× behind the playable boundary', () => {
  const model = createDioramaGeometry(250, 250);
  const frontPigment = new THREE.Color(0xf5efdf), backPigment = new THREE.Color(0xc8bca7);
  const widths: number[] = [];
  for (const part of model.parts.filter(part => part.material === 'paper' && part.layer === 'upper')) {
    const position = part.geometry.getAttribute('position'), normal = part.geometry.getAttribute('normal');
    const color = part.geometry.getAttribute('color'), [nx, nz] = inward[part.side!];
    const matches = (i: number, pigment: THREE.Color) => Math.abs(color.getX(i) - pigment.r) < 1e-6
      && Math.abs(color.getY(i) - pigment.g) < 1e-6 && Math.abs(color.getZ(i) - pigment.b) < 1e-6;
    const key = (i: number) => `${(nx ? position.getZ(i) : position.getX(i)).toFixed(6)},${position.getY(i).toFixed(6)}`;
    const depth = (i: number) => nx * position.getX(i) + nz * position.getZ(i);
    const backs = new Map<string, number>();
    for (let i = 0; i < position.count; i++) {
      if (nx * normal.getX(i) + nz * normal.getZ(i) < -.99 && matches(i, backPigment)) backs.set(key(i), depth(i));
    }
    for (let i = 0; i < position.count; i++) {
      const facing = nx * normal.getX(i) + nz * normal.getZ(i);
      if (facing <= .8 || facing >= .99 || !matches(i, frontPigment)) continue;
      const back = backs.get(key(i));
      expect(back).toBeDefined();
      widths.push((depth(i) - back!) / model.span);
    }
  }
  expect(widths.length).toBeGreaterThan(0);
  expect(widths.some(value => Math.abs(value - .0001 * 2.5) < 1e-6)).toBe(true);
  expect(widths.some(value => Math.abs(value - .00165 * 2.5) < 1e-6)).toBe(true);
  expect(widths.every(value => Math.abs(value - .0001 * 2.5) < 1e-6 || Math.abs(value - .00165 * 2.5) < 1e-6)).toBe(true);
  for (const part of model.parts) part.geometry.dispose();
});

test('the high south wall carries full-scale temperate mountains, oak, poplar and sky paper', () => {
  const model = createDioramaGeometry(250, 250);
  const decor = createDioramaDecor({ seed: 0, biome: 'temperate-forest', side: 'south',
    span: model.span, wallLength: 250 + model.span * .0252 });
  const south = model.parts.find(part => part.side === 'south' && part.layer === 'upper' && part.material === 'paper');
  expect(south).toBeDefined();
  const position = south!.geometry.getAttribute('position'), color = south!.geometry.getAttribute('color');
  const peak = (kind: DioramaDecorKind) => {
    const palette = decor.cutouts.filter(cut => cut.kind === kind).map(cut => new THREE.Color(cut.pigment));
    expect(palette.length).toBeGreaterThan(0);
    let maxY = -Infinity;
    for (let i = 0; i < position.count; i++) {
      if (palette.some(p => Math.abs(color.getX(i) - p.r) < 1e-6 && Math.abs(color.getY(i) - p.g) < 1e-6
        && Math.abs(color.getZ(i) - p.b) < 1e-6)) maxY = Math.max(maxY, position.getY(i));
    }
    return maxY / model.span;
  };
  expect(peak('background-ridge')).toBeGreaterThan(.075);
  expect(peak('foreground-ridge')).toBeGreaterThan(.025);
  expect(peak('oak')).toBeGreaterThan(.04);
  expect(peak('poplar')).toBeGreaterThan(.04);
  expect(peak('cloud')).toBeGreaterThan(.16);
  expect(model.parts.length).toBeLessThanOrEqual(18);
  for (const part of model.parts) part.geometry.dispose();
});
