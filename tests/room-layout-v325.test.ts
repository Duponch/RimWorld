import { expect, test } from 'vitest';
import { createRoomLayout } from '../src/render/room-layout';
import { createDioramaGeometry } from '../src/render/diorama-geometry';
import { createRoomGeometry } from '../src/render/room-geometry';

test.each([[250, 250], [48, 32], [32, 48]])('reference table and room share one scale while the %i×%i map fits the short tabletop side', (width, height) => {
  const layout = createRoomLayout(width, height), { table, walls, unit, span } = layout;
  expect(table.width / table.depth).toBeCloseTo(6.02 / 3.45, 12);
  expect(table.surfaceWidth / table.surfaceDepth).toBeCloseTo(5.89 / 3.32, 12);
  expect(table.surfaceWidth).toBeGreaterThanOrEqual(width + span * .14 - 1e-10);
  expect(table.surfaceDepth).toBeGreaterThanOrEqual(height + span * .14 - 1e-10);
  expect(walls.height / table.depth).toBeCloseTo(5 / 3.45, 12);
  expect(walls.ceilingY).toBeCloseTo(layout.floorY + 5 * unit, 12);
  expect(table.topY).toBeCloseTo(-span * .049, 12);
  expect(walls.westX).toBeLessThan(table.minX); expect(walls.eastX).toBeGreaterThan(table.maxX);
  expect(walls.northZ).toBeLessThan(table.minZ); expect(walls.southZ).toBeGreaterThan(table.maxZ);
  const diorama = createDioramaGeometry(width, height), room = createRoomGeometry(width, height, 42);
  try {
    const bounds = diorama.parts.find(part => part.layer === 'table')!.geometry.boundingBox!;
    expect(bounds.min.x).toBeCloseTo(table.minX, 4); expect(bounds.max.x).toBeCloseTo(table.maxX, 4);
    expect(bounds.min.z).toBeCloseTo(table.minZ, 4); expect(bounds.max.z).toBeCloseTo(table.maxZ, 4);
    expect(bounds.min.y).toBeCloseTo(room.floorY, 4);
    expect(room.parts.some(part => part.name.includes('table'))).toBe(false);
    expect(room.orbit.baseY).toBeGreaterThan(table.topY);
    expect(room.orbit.baseY + room.orbit.rise + unit * .04).toBeLessThan(walls.ceilingY);
    expect(Math.abs(room.orbit.moonRailOffsetZ)).toBeGreaterThan(room.orbit.sun.radius + room.orbit.moon.radius + unit * .1);
    for (const side of [-1, 1]) {
      const x = layout.centerX + side * room.orbit.halfWidth;
      expect(x - unit * .047).toBeGreaterThan(table.minX); expect(x + unit * .047).toBeLessThan(table.maxX);
      const z = layout.centerZ + side * layout.rig.supportZ;
      expect(z - unit * .047).toBeGreaterThan(table.minZ); expect(z + unit * .047).toBeLessThan(table.maxZ);
    }
  } finally { for (const part of [...room.parts, ...diorama.parts]) part.geometry.dispose(); }
});

test('wall-side furniture is separated from the tabletop and connected to its own floor', () => {
  const layout = createRoomLayout(250, 250), unit = layout.unit;
  const [sx, sz] = layout.furniture.shelf, [bx, bz] = layout.furniture.bed;
  // Shelf depth .525 reference units and bed headboard half-depth .1125.
  expect(sz - unit * .2625 - layout.walls.northZ).toBeCloseTo(unit * .08, 10);
  expect(bz - unit * 1.75 - unit * .1125 - layout.walls.northZ).toBeCloseTo(unit * .0575, 10);
  expect(sx + unit * .875).toBeLessThan(layout.table.minX);
  expect(bx - unit * 1.5).toBeGreaterThan(layout.table.maxX);
  expect(sz + unit * .75).toBeLessThan(layout.table.minZ);
  expect(bz + unit * 1.8).toBeLessThan(layout.table.minZ);
});

test.each([[0, 250], [250, NaN], [Infinity, 250], [-1, 32]])('invalid shared layout dimensions %s×%s are rejected', (width, height) => {
  expect(() => createRoomLayout(width, height)).toThrow(RangeError);
});
