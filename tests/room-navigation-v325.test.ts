import { expect, test } from 'vitest';
import { Vector3 } from 'three/webgpu';
import { CameraRig } from '../src/render/CameraRig';
import { createRoomLayout } from '../src/render/room-layout';

test.each([[250, 250], [48, 32], [32, 48], [16, 16]])('room navigation bounds both projections for %i×%i maps', (width, height) => {
  const rig = new CameraRig(null), layout = createRoomLayout(width, height);
  rig.configureMap(width, height); rig.resize(2560, 1440); rig.setRoomEnabled(true);
  rig.controls.enableDamping = false;
  try {
    for (const mode of ['perspective', 'orthographic'] as const) {
      rig.setMode(mode);
      for (const [x, z] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
        rig.controls.target.set(x!, 0, z!);
        for (const direction of [new Vector3(1, .1, 1), new Vector3(-1, .1, 1),
          new Vector3(1, .1, -1), new Vector3(-1, .1, -1), new Vector3(0, 1, 0)]) {
          rig.camera.position.copy(rig.controls.target).addScaledVector(direction, layout.unit * 100);
          rig.controls.update();
          const viewRay = rig.camera.position.clone().sub(rig.controls.target).normalize();
          rig.constrainRoom();
          const eye = rig.camera.position, { walls } = layout;
          expect(eye.x).toBeGreaterThan(walls.westX); expect(eye.x).toBeLessThan(walls.eastX);
          expect(eye.z).toBeGreaterThan(walls.northZ); expect(eye.z).toBeLessThan(walls.southZ);
          expect(eye.y).toBeGreaterThan(layout.floorY); expect(eye.y).toBeLessThan(walls.ceilingY);
          const before = eye.clone();
          rig.controls.update(); rig.constrainRoom();
          expect(eye.distanceTo(before)).toBeLessThan(1e-9);
          expect(eye.clone().sub(rig.controls.target).normalize().distanceTo(viewRay)).toBeLessThan(1e-9);
        }
      }
    }
  } finally { rig.dispose(); }
});

test('projection transfers and activation constrain the eye, while room OFF leaves navigation free', () => {
  const rig = new CameraRig(null), layout = createRoomLayout(250, 250);
  rig.configureMap(250, 250); rig.resize(1440, 2560);
  try {
    rig.camera.position.set(layout.walls.eastX + 100, 100, layout.centerZ);
    const before = rig.camera.position.clone();
    expect(rig.constrainRoom()).toBe(false); expect(rig.camera.position).toEqual(before);
    rig.setRoomEnabled(true); expect(rig.camera.position.x).toBeLessThan(layout.walls.eastX);
    for (const mode of ['perspective', 'orthographic', 'perspective'] as const) {
      rig.setMode(mode); expect(rig.camera.position.x).toBeLessThan(layout.walls.eastX);
      expect(rig.camera.position.y).toBeLessThan(layout.walls.ceilingY);
    }
    rig.setRoomEnabled(false); rig.camera.position.copy(before);
    expect(rig.constrainRoom()).toBe(false); expect(rig.camera.position).toEqual(before);
  } finally { rig.dispose(); }
});
