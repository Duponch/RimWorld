import * as THREE from 'three/webgpu';
import { expect, test, vi } from 'vitest';
import { createRoomGeometry, ROOM_GEOMETRY_LIMITS, sampleRoomOrbit, type MotionKind,
  type RoomGeometry } from '../src/render/room-geometry';

const dispose = (room: RoomGeometry): void => { for (const part of room.parts) part.geometry.dispose(); };
const signature = (room: RoomGeometry) => room.parts.map(part => ({ name: part.name, material: part.material,
  section: part.section, motionKind: part.motionKind, index: part.geometry.getIndex()!.array,
  position: part.geometry.getAttribute('position').array, normal: part.geometry.getAttribute('normal').array,
  color: part.geometry.getAttribute('color').array, uv: part.geometry.getAttribute('uv').array }));

test('the authored room is deterministic and caller-owned despite Three resource UUID randomness', () => {
  const random = vi.spyOn(Math, 'random').mockReturnValue(.1);
  let first: RoomGeometry | undefined, second: RoomGeometry | undefined;
  try {
    first = createRoomGeometry(32, 32, 84602);
    random.mockReturnValue(.9);
    second = createRoomGeometry(32, 32, 84602);
    expect(signature(first)).toEqual(signature(second));
    expect(second.orbit).toEqual(first.orbit);
    expect(second.cloudSuspensions).toEqual(first.cloudSuspensions);
    expect(second.parts[0]!.geometry).not.toBe(first.parts[0]!.geometry);
    const firstPosition = first.parts[0]!.geometry.getAttribute('position');
    const original = second.parts[0]!.geometry.getAttribute('position').getX(0);
    firstPosition.setX(0, Infinity);
    expect(second.parts[0]!.geometry.getAttribute('position').getX(0)).toBe(original);
  } finally { random.mockRestore(); if (first) dispose(first); if (second) dispose(second); }
});

test.each([[250, 250], [48, 32], [32, 48], [16, 16]])('the %i×%i room is bounded, indexed and aligned beneath the existing table', (width, height) => {
  const room = createRoomGeometry(width, height, 42);
  try {
    expect(room.span).toBe(Math.min(width, height));
    expect(room.floorY / room.span).toBeCloseTo(-.049 - .030 - .31, 12);
    expect(room.parts.length).toBeLessThanOrEqual(ROOM_GEOMETRY_LIMITS.parts);
    expect(new Set(room.parts.map(part => part.name)).size).toBe(room.parts.length);
    expect(room.parts.some(part => /table/i.test(part.name))).toBe(false);
    for (const side of ['north', 'west', 'east']) {
      const wall = room.parts.find(part => part.section === side && part.material === 'plaster');
      expect(wall).toBeDefined();
      expect(wall!.geometry.boundingBox!.max.y).toBeCloseTo(room.floorY + room.span * 1.35, 4);
    }
    const parquet = room.parts.find(part => part.name === 'room-parquet-floor')!;
    expect(parquet.geometry.boundingBox!.max.y).toBeCloseTo(room.floorY, 5);
    let triangles = 0, invalid = 0, intrusion = 0;
    for (const part of room.parts) {
      const geometry = part.geometry, index = geometry.getIndex()!;
      const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal');
      const c = geometry.getAttribute('color'), uv = geometry.getAttribute('uv');
      expect(index).toBeDefined(); expect(index.count % 3).toBe(0);
      expect(n.count).toBe(p.count); expect(c.count).toBe(p.count); expect(uv.count).toBe(p.count);
      expect(geometry.boundingBox!.isEmpty()).toBe(false);
      triangles += index.count / 3;
      for (let i = 0; i < p.count; i++) {
        const normalLength = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
        if (![p.getX(i), p.getY(i), p.getZ(i), uv.getX(i), uv.getY(i),
          c.getX(i), c.getY(i), c.getZ(i)].every(Number.isFinite) || Math.abs(normalLength - 1) > 1e-5) invalid++;
        // Furniture and shell may surround the colony but cannot occupy it
        // above ground. The separate orbit family belongs above the map.
        if (!part.motionKind && part.section !== 'orbit' && p.getY(i) >= 0
          && p.getX(i) >= -.5 && p.getX(i) <= width - .5 && p.getZ(i) >= -.5 && p.getZ(i) <= height - .5) intrusion++;
      }
    }
    expect(invalid).toBe(0); expect(intrusion).toBe(0);
    expect(triangles).toBeLessThanOrEqual(ROOM_GEOMETRY_LIMITS.triangles);
  } finally { dispose(room); }
});

test('each local lantern and its thread share an anchor and remain separated over both entire rails', () => {
  const room = createRoomGeometry(250, 250, 42);
  try {
    const sun = new THREE.Vector3(), moon = new THREE.Vector3();
    for (const kind of ['sun', 'moon'] as const) {
      const spec = room.orbit[kind], parts = room.parts.filter(part => part.motionKind === kind);
      expect(parts).toHaveLength(2);
      expect(new Set(parts.map(part => part.material))).toEqual(new Set(['paper', 'metal']));
      expect(spec.center[0]).toBe(0); expect(spec.center[2]).toBe(0);
      expect(spec.center[1] + spec.radius).toBeCloseTo(-spec.threadLength, 10);
      const body = parts.find(part => part.material === 'paper')!.geometry.boundingBox!;
      const thread = parts.find(part => part.material === 'metal')!.geometry.boundingBox!;
      expect(thread.containsPoint(new THREE.Vector3(0, 0, 0))).toBe(true);
      expect(thread.containsPoint(new THREE.Vector3(0, -spec.threadLength + room.span * 1e-7, 0))).toBe(true);
      expect(Math.abs(body.min.x)).toBeLessThan(spec.radius * 1.06);
      expect(Math.abs(body.max.x)).toBeLessThan(spec.radius * 1.06);
      expect(body.min.y).toBeGreaterThan(spec.center[1] - spec.radius * 1.06);
      expect(body.max.y).toBeLessThan(spec.center[1] + spec.radius * 1.06);
      for (let i = 0; i <= 64; i++) {
        const anchor = sampleRoomOrbit(room.orbit, i / 64, sun, kind);
        expect(anchor).toBe(sun);
        expect(anchor.y + spec.center[1] - spec.radius).toBeGreaterThan(room.floorY);
      }
    }
    for (let i = 0; i <= 100; i++) {
      sampleRoomOrbit(room.orbit, i / 100, sun, 'sun');
      sampleRoomOrbit(room.orbit, 1 - i / 100, moon, 'moon');
      sun.add(new THREE.Vector3(...room.orbit.sun.center));
      moon.add(new THREE.Vector3(...room.orbit.moon.center));
      expect(sun.distanceTo(moon)).toBeGreaterThan(room.orbit.sun.radius + room.orbit.moon.radius);
    }
    sampleRoomOrbit(room.orbit, .5, sun, 'sun'); sampleRoomOrbit(room.orbit, .5, moon, 'moon');
    expect(sun.z - moon.z).toBeCloseTo(room.span * .11, 10);
  } finally { dispose(room); }
});

test('cotton clouds are bridled from the modeled rear arc, clear of both moving globe rails', () => {
  const room = createRoomGeometry(48, 32, 84602);
  try {
    expect(room.cloudSuspensions).toHaveLength(3);
    const rig = room.parts.find(part => part.name === 'room-orbit-structure')!.geometry.boundingBox!;
    const cotton = room.parts.find(part => part.material === 'cotton')!.geometry.boundingBox!;
    for (const cloud of room.cloudSuspensions) {
      expect(rig.containsPoint(new THREE.Vector3(...cloud.anchor))).toBe(true);
      expect(cotton.containsPoint(new THREE.Vector3(...cloud.center))).toBe(true);
      expect(cloud.anchor[1]).toBeGreaterThan(cloud.attachment[1]);
      expect(cloud.attachment[1]).toBeGreaterThan(cloud.center[1]);
      for (const kind of ['sun', 'moon'] as MotionKind[]) for (let i = 0; i <= 32; i++) {
        const anchor = sampleRoomOrbit(room.orbit, i / 32, new THREE.Vector3(), kind);
        expect(Math.abs(anchor.z - cloud.center[2])).toBeGreaterThan(room.span * .10);
      }
    }
  } finally { dispose(room); }
});

test.each([[0, 32, 0], [32, -1, 0], [Infinity, 32, 0], [32, NaN, 0], [32, 32, .5]])('invalid room dimensions or seed are rejected before preparation (%s,%s,%s)', (width, height, seed) => {
  expect(() => createRoomGeometry(width, height, seed)).toThrow(RangeError);
});
