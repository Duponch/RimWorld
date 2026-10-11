import { describe, expect, it, vi } from 'vitest';
import { Mesh, OrthographicCamera, Scene, Vector3 } from 'three/webgpu';
import { DayNightLayer } from '../src/render/DayNightLayer';
import { DioramaLayer } from '../src/render/DioramaLayer';
import { RoomLayer } from '../src/render/RoomLayer';
import { RoomLighting } from '../src/render/RoomLighting';
import { LandscapeBatch } from '../src/render/LandscapeBatch';
import { SceneRenderCore } from '../src/render/SceneRenderCore';
import { TICKS_PER_DAY } from '../src/sim/types';

describe('optional room presentation ownership', () => {
  it('turns OFF before a world exists without reading World or creating presentation owners', () => {
    const dispose = vi.fn(), loadTexture = vi.fn();
    const core = Object.assign(Object.create(SceneRenderCore.prototype), {
      disposed: false, roomEnabled: true, dioramaEnabled: false, room: { dispose }, diorama: null,
      daylight: { setExternalLighting: vi.fn() }, rig: { setRoomEnabled: vi.fn() },
      hostPort: { loadTexture }, invalidatePausedShadow: vi.fn(),
      landscape: new LandscapeBatch(),
    });
    Object.defineProperty(core, 'world', { get() { throw Error('Disabled room read World'); } });
    core.setRoomEnabled(false);
    core.configureRoom(); core.configureDiorama(); core.setRoomEnabled(false);
    expect(core.room).toBeNull(); expect(core.diorama).toBeNull();
    expect(dispose).toHaveBeenCalledOnce(); expect(loadTexture).not.toHaveBeenCalled();
    expect(core.daylight.setExternalLighting).toHaveBeenCalledExactlyOnceWith(false);
    expect(core.rig.setRoomEnabled).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('invalidates retained light bindings before disposal and on reactivation, once per transition', () => {
    const landscape = new LandscapeBatch(), initialVersion = landscape.version;
    const dispose = vi.fn(() => expect(landscape.version).toBe(initialVersion + 1));
    const core = Object.assign(Object.create(SceneRenderCore.prototype), {
      disposed: false, roomEnabled: true, dioramaEnabled: true, room: { dispose }, landscape,
      daylight: { setExternalLighting: vi.fn() }, rig: { setRoomEnabled: vi.fn() },
      configureDiorama: vi.fn(), configureRoom: vi.fn(), invalidatePausedShadow: vi.fn(),
    });
    core.setRoomEnabled(false); core.setRoomEnabled(false);
    expect(dispose).toHaveBeenCalledOnce(); expect(landscape.version).toBe(initialVersion + 1);
    core.setRoomEnabled(true); core.setRoomEnabled(true);
    expect(landscape.version).toBe(initialVersion + 2);
    expect(core.configureRoom).toHaveBeenCalledOnce();
  });

  it('preserves the existing table when the independent cardboard box is turned OFF', async () => {
    const scene = new Scene(), load = vi.fn(), layer = new DioramaLayer(load);
    const target = new Vector3(15.5, 0, 15.5);
    const camera = new OrthographicCamera(-100, 100, 100, -100, .1, 1000);
    camera.position.copy(target).add(new Vector3(65, 100, 70)); camera.lookAt(target);
    const core = Object.assign(Object.create(SceneRenderCore.prototype), {
      disposed: false, roomEnabled: true, dioramaEnabled: true, diorama: layer, scene,
      world: { width: 32, height: 32, seed: 7 }, texturesEnabled: false,
      daylight: { sample: { y: 1 } }, rig: { camera, controls: { target }, span: 200 },
    });
    core.configureDiorama();
    const table = layer.group.children.find(o => o.name === 'diorama-diorama-wooden-table') as Mesh;
    const geometry = table.geometry;
    try {
      core.setDioramaEnabled(false);
      expect(layer.group.parent).toBe(scene); expect(table.geometry).toBe(geometry);
      expect(layer.group.children.filter(o => o.visible)).toEqual([table]);
      const restore = await layer.prepare();
      expect(layer.group.children.filter(o => o.visible)).toEqual([table]); restore();
      core.setDioramaEnabled(true);
      expect(table.geometry).toBe(geometry);
      expect(layer.group.children.filter(o => o.visible).length).toBeGreaterThan(1);
      expect(load).not.toHaveBeenCalled();
    } finally { layer.dispose(); }
  });

  it('moves both lighting attachments between scenes and releases every attachment on dispose', () => {
    const first = new Scene(), firstRoom = new Scene(), second = new Scene(), secondRoom = new Scene();
    const lighting = new RoomLighting();
    lighting.attach(first, firstRoom); lighting.attach(first, firstRoom);
    expect(first.children).toEqual([lighting.sun, lighting.moon, lighting.ambient]);
    expect(firstRoom.children).toEqual([lighting.roomSun, lighting.roomMoon, lighting.roomAmbient]);
    lighting.attach(second, secondRoom);
    expect(first.children).toHaveLength(0); expect(firstRoom.children).toHaveLength(0);
    expect(lighting.sun.parent).toBe(second); expect(lighting.roomMoon.parent).toBe(secondRoom);
    lighting.detach(second, secondRoom);
    expect(second.children).toHaveLength(0); expect(secondRoom.children).toHaveLength(0);
    lighting.attach(first, firstRoom); lighting.dispose(); lighting.dispose();
    lighting.attach(second, secondRoom);
    for (const scene of [first, firstRoom, second, secondRoom]) expect(scene.children).toHaveLength(0);
  });

  it('retains unchanged room geometry and releases replaced geometry, lights and target exactly once', () => {
    const game = new Scene(), room = new RoomLayer(game);
    const meshes = () => { const result: Mesh[] = []; room.scene.traverse(o => { if (o instanceof Mesh) result.push(o); }); return result; };
    room.configure(32, 48, 7);
    const original = meshes(); expect(original.length).toBeGreaterThan(0);
    const oldDisposals = original.map(m => vi.spyOn(m.geometry, 'dispose'));
    room.configure(32, 48, 7);
    expect(meshes()).toEqual(original);
    for (const dispose of oldDisposals) expect(dispose).not.toHaveBeenCalled();
    room.configure(32, 48, 8);
    for (const dispose of oldDisposals) expect(dispose).toHaveBeenCalledOnce();
    const current = meshes(), disposals = current.map(m => vi.spyOn(m.geometry, 'dispose'));
    const materials = new Set(current.flatMap(m => Array.isArray(m.material) ? m.material : [m.material]));
    const materialDisposals = [...materials].map(m => vi.spyOn(m, 'dispose'));
    const targetDispose = vi.spyOn(room.backdrop.target, 'dispose');
    expect(game.children).toEqual([room.lighting.sun, room.lighting.moon, room.lighting.ambient]);
    room.dispose(); room.dispose(); room.configure(32, 48, 9);
    expect(game.children).toHaveLength(0); expect(room.scene.children).toHaveLength(0);
    expect(targetDispose).toHaveBeenCalledOnce();
    for (const dispose of [...disposals, ...materialDisposals]) expect(dispose).toHaveBeenCalledOnce();
  });

  it('continues sampling civil time while the old sky and environmental emitters are detached, then restores them', () => {
    const scene = new Scene(), daylight = new DayNightLayer(scene), target = new Vector3(16, 0, 16);
    daylight.update(0, target);
    const sky = scene.backgroundNode, sample = daylight.sample;
    const originalPosition = daylight.light.position.clone(), originalIntensity = daylight.light.intensity;
    const originalAmbient = daylight.ambient.intensity;
    try {
      expect(sample.y).toBeLessThan(0);
      daylight.setExternalLighting(true); daylight.setExternalLighting(true);
      expect(scene.children).toHaveLength(0); expect(scene.backgroundNode).toBeNull();
      daylight.update(TICKS_PER_DAY / 2, target);
      expect(daylight.sample).toBe(sample); expect(sample.y).toBeGreaterThan(0); expect(sample.sunlight).toBe(1);
      expect(daylight.light.position.equals(originalPosition)).toBe(true);
      expect(daylight.light.intensity).toBe(originalIntensity); expect(daylight.ambient.intensity).toBe(originalAmbient);
      daylight.setExternalLighting(false); daylight.setExternalLighting(false);
      expect(scene.backgroundNode).toBe(sky);
      expect(scene.children).toEqual([daylight.light, daylight.light.target, daylight.ambient]);
      daylight.update(TICKS_PER_DAY / 2, target);
      expect(daylight.light.intensity).toBeGreaterThan(originalIntensity);
      expect(daylight.light.position.equals(originalPosition)).toBe(false);
    } finally { daylight.dispose(); }
    expect(scene.children).toHaveLength(0); expect(scene.backgroundNode).toBeNull();
  });

  it('keeps lighting preferences while the room is OFF without reading World or allocating the room', () => {
    const core = Object.assign(Object.create(SceneRenderCore.prototype), {
      disposed: false, roomEnabled: false, room: null, daylight: { setSettings: vi.fn() }, invalidatePausedShadow: vi.fn(),
    });
    Object.defineProperty(core, 'world', { get() { throw Error('Lighting preference read World'); } });
    const settings = { sun: .75, moon: 2, ambient: 1.5 };
    core.setLightingSettings(settings); core.configureRoom();
    expect(core.room).toBeNull(); expect(core.lightingSettings).toEqual(settings);
    expect(core.daylight.setSettings).toHaveBeenCalledExactlyOnceWith(settings);
    expect(core.invalidatePausedShadow).toHaveBeenCalledOnce();
  });

  it('scales each old environmental light independently without changing the civil-time sample', () => {
    const daylight = new DayNightLayer(new Scene()), target = new Vector3(16, 0, 16);
    try {
      daylight.update(TICKS_PER_DAY / 2, target);
      const noon = { ...daylight.sample }, sun = daylight.light.intensity, noonAmbient = daylight.ambient.intensity;
      daylight.setSettings({ sun: .5, moon: 3, ambient: 2 }); daylight.update(TICKS_PER_DAY / 2, target);
      expect(daylight.sample).toEqual(noon); expect(daylight.light.intensity).toBeCloseTo(sun * .5);
      expect(daylight.ambient.intensity).toBeCloseTo(noonAmbient * 2);
      daylight.setSettings({ sun: 1, moon: 1, ambient: 1 }); daylight.update(0, target);
      const night = { ...daylight.sample }, moon = daylight.light.intensity, nightAmbient = daylight.ambient.intensity;
      daylight.setSettings({ sun: 3, moon: 2, ambient: .5 }); daylight.update(0, target);
      expect(daylight.sample).toEqual(night); expect(daylight.light.intensity).toBeCloseTo(moon * 2);
      expect(daylight.ambient.intensity).toBeCloseTo(nightAmbient * .5);
      daylight.setSettings({ sun: 0, moon: 0, ambient: 0 }); daylight.update(0, target);
      expect(daylight.light.intensity).toBe(0); expect(daylight.ambient.intensity).toBe(0);
    } finally { daylight.dispose(); }
  });
});
