import { expect, test } from 'vitest';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three/webgpu';
import { createRoomGeometry } from '../src/render/room-geometry';

test.each([[250, 250], [48, 32], [32, 48]])('the %i×%i bedroom encloses the camera bounds on all four sides, including the joined corners', (width, height) => {
  const room = createRoomGeometry(width, height, 42), material = new MeshBasicMaterial();
  const shell = room.parts.filter(part => part.material === 'plaster');
  try {
    expect(shell.map(part => part.section).sort()).toEqual(['east', 'north', 'south', 'west']);
    // One additional cullable part shares the existing plaster material and
    // surface detail. The suspension and furniture budgets remain unchanged.
    expect(room.parts).toHaveLength(17);
    const walls = shell.map(part => new Mesh(part.geometry, material));
    const { layout } = room, { westX, eastX, northZ, southZ, height: wallHeight } = layout.walls;
    const ray = new Raycaster(), target = new Vector3(), direction = new Vector3();
    const center = new Vector3((westX + eastX) / 2, 0, (northZ + southZ) / 2);
    for (const heightRatio of [.1, .5, .9]) {
      center.y = layout.floorY + wallHeight * heightRatio;
      for (const side of ['north', 'south', 'west', 'east'] as const) {
        for (const along of [0, .25, .5, .75, 1]) {
          const horizontal = side === 'north' || side === 'south';
          target.set(horizontal ? westX + (eastX - westX) * along : side === 'west' ? westX : eastX,
            center.y, horizontal ? side === 'north' ? northZ : southZ : northZ + (southZ - northZ) * along);
          const expectedDistance = center.distanceTo(target);
          ray.set(center, direction.copy(target).sub(center).normalize());
          const hit = ray.intersectObjects(walls, false)[0];
          // Real front-facing triangles must close the physical envelope,
          // rather than relying on bounds or double-sided rendering alone.
          expect(hit, `${side}, height ${heightRatio}, along ${along}`).toBeDefined();
          expect(Math.abs(hit!.distance - expectedDistance)).toBeLessThan(layout.unit * 1e-4);
        }
      }
    }
  } finally {
    material.dispose();
    for (const part of room.parts) part.geometry.dispose();
  }
});
