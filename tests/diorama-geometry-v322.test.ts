import * as THREE from 'three/webgpu';
import { expect, test } from 'vitest';
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

test('ordinary mountains, snow, forest, sky and folded contact paper have 2.5× physical thickness', () => {
  const model = createDioramaGeometry(250, 250);
  const edge = new THREE.Color(0xc9bfa8);
  const pigments = [0x71836c, 0x809178, 0x8c9b80, 0xe0ddc9, 0x526b54, 0x61775e,
    0x354e3d, 0x45644b, 0x557254, 0x9a7851, 0xede7d6, 0xf5efdf, 0xc4b9a4, 0xc49652, 0xb78d50];
  const colors = pigments.map(hex => new THREE.Color(hex));
  const observed = new Set<number>();
  let checked = 0, mismatched = 0;
  expect(DIORAMA_PAPER_THICKNESS).toBeCloseTo(.00065 * 2.5, 12);
  for (const part of model.parts.filter(part => part.material === 'paper')) {
    const position = part.geometry.getAttribute('position'), normal = part.geometry.getAttribute('normal');
    const color = part.geometry.getAttribute('color'), [nx, nz] = inward[part.side!];
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
      if (facing < .99) continue;
      const pigment = colors.findIndex(candidate => matches(i, candidate));
      if (pigment < 0) continue;
      observed.add(pigments[pigment]!); checked++;
      const expected = model.span * DIORAMA_PAPER_THICKNESS;
      if (!backs.get(key(i))?.some(back => Math.abs(depth(i) - back - expected) < model.span * 1e-6)) mismatched++;
    }
  }
  expect(checked).toBeGreaterThan(100);
  expect(mismatched).toBe(0);
  expect([...observed].sort()).toEqual([...pigments].sort());
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

test('the high south wall carries full-scale mountains, snowy peaks, pines and sky paper', () => {
  const model = createDioramaGeometry(250, 250);
  const south = model.parts.find(part => part.side === 'south' && part.layer === 'upper' && part.material === 'paper');
  expect(south).toBeDefined();
  const position = south!.geometry.getAttribute('position'), color = south!.geometry.getAttribute('color');
  const peak = (pigments: number[]) => {
    const palette = pigments.map(hex => new THREE.Color(hex));
    let maxY = -Infinity;
    for (let i = 0; i < position.count; i++) {
      if (palette.some(p => Math.abs(color.getX(i) - p.r) < 1e-6 && Math.abs(color.getY(i) - p.g) < 1e-6
        && Math.abs(color.getZ(i) - p.b) < 1e-6)) maxY = Math.max(maxY, position.getY(i));
    }
    return maxY / model.span;
  };
  expect(peak([0x71836c, 0x809178, 0x8c9b80])).toBeGreaterThan(.09);
  expect(peak([0xe0ddc9])).toBeGreaterThan(.09);
  expect(peak([0x354e3d, 0x45644b, 0x557254])).toBeGreaterThan(.05);
  expect(peak([0xede7d6])).toBeGreaterThan(.17);
  expect(model.parts.length).toBeLessThanOrEqual(18);
  for (const part of model.parts) part.geometry.dispose();
});
