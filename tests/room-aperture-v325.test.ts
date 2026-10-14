import { expect, test, vi } from 'vitest';
import { Mesh, PerspectiveCamera, Scene, Vector3 } from 'three/webgpu';
import { DecorOcclusion } from '../src/render/decor-occlusion';
import { RoomLayer } from '../src/render/RoomLayer';
import { SceneRenderCore } from '../src/render/SceneRenderCore';
import { sampleDaylight } from '../src/render/daylight';

test('fixed room walls survive all camera quadrants and only installation materials share a geometric fragment mask', () => {
  const mask=new DecorOcclusion(),room = new RoomLayer(new Scene(),mask); room.configure(32, 32, 42);
  const camera = new PerspectiveCamera(45, 1, .1, 1000), target = new Vector3(15.5, 0, 15.5);
  const meshes: Mesh[] = []; room.scene.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
  try {
    for (const x of [-100, 100]) for (const z of [-100, 100]) {
      camera.position.set(x, 20, z); camera.lookAt(target);
      room.present(sampleDaylight(0, { x: 0, y: 0, z: 0, daylight: 0, warmth: 0, sunlight: 0, moonlight: 0 }), camera);
      for (const mesh of meshes) expect(mesh.visible).toBe(true);
    }
    const overhead = meshes.filter(mesh => /orbit|cotton|room-(sun|moon)-/.test(mesh.name));
    expect(overhead.length).toBeGreaterThan(4);
    for (const mesh of overhead) expect((mesh.material as any).maskNode).not.toBeNull();
    for (const mesh of meshes.filter(mesh => /wall|furniture|parquet/.test(mesh.name))) {
      expect((mesh.material as any).maskNode).toBeNull();
    }
    const original = meshes.map(mesh => mesh.geometry), powers = [room.lighting.sun.intensity, room.lighting.moon.intensity];
    for (const enabled of [false,true,false,true]) { if(mask.setEnabled(enabled))room.invalidateDecorOcclusion(); }
    expect(meshes.map(mesh => mesh.geometry)).toEqual(original);
    expect([room.lighting.sun.intensity, room.lighting.moon.intensity]).toEqual(powers);
  } finally { room.dispose(); }
});

test('V350 decor preference while room OFF reads no World, allocates no room and invalidates only on a boolean transition', () => {
  const decorOcclusion=new DecorOcclusion(),core=Object.assign(Object.create(SceneRenderCore.prototype),{room:null,decorOcclusion});
  Object.defineProperty(core,'world',{get(){throw Error('Mask preference read World');}});
  core.setDecorOcclusion(false);expect(core.room).toBeNull();
  const invalidateDecorOcclusion=vi.fn();core.room={invalidateDecorOcclusion};
  core.setDecorOcclusion(false);expect(invalidateDecorOcclusion).not.toHaveBeenCalled();
  core.setDecorOcclusion(true);expect(invalidateDecorOcclusion).toHaveBeenCalledOnce();
});