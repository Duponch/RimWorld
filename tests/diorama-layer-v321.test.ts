import { describe, expect, it, vi } from 'vitest';
import { Group, OrthographicCamera, PerspectiveCamera, Scene, Texture, Vector3 } from 'three/webgpu';
import { DioramaLayer } from '../src/render/DioramaLayer';
import { SceneRenderCore } from '../src/render/SceneRenderCore';
import type { SceneTextureLoader } from '../src/render/scene-render-ports';

describe('optional static diorama ownership', () => {
  it('does not allocate or read the map when disabled; detaches a resident scene on disable', () => {
    const scene = new Scene(), group = new Group(); scene.add(group);
    const configure = vi.fn();
    const core = Object.assign(Object.create(SceneRenderCore.prototype), {
      disposed: false, dioramaEnabled: true, diorama: { group, configure }, scene,
    });
    Object.defineProperty(core, 'world', { get() { throw Error('Disabled decoration read World'); } });
    core.setDioramaEnabled(false);
    core.configureDiorama();
    expect(group.parent).toBeNull(); expect(configure).not.toHaveBeenCalled();
    core.diorama = null;
    core.setDioramaEnabled(false); core.configureDiorama();
    expect(core.diorama).toBeNull();
  });

  it('keeps geometry resident across camera, plain/textured and repeated map configuration', async () => {
    const load = vi.fn<SceneTextureLoader>((_url, done) => { done(new Texture()); });
    const layer = new DioramaLayer(load);
    layer.configure(32, 48, false);
    expect(load).not.toHaveBeenCalled();
    const geometries = layer.group.children.map(o => (o as any).geometry);
    const camera = new PerspectiveCamera(); camera.position.set(30, 30, 30);
    layer.present(camera, new Vector3(16, 0, 24), 80);
    layer.setTexturesEnabled(true); const restore = await layer.prepare(); restore();
    layer.configure(32, 48, true);
    layer.setTexturesEnabled(false);
    expect(layer.group.children.map(o => (o as any).geometry)).toEqual(geometries);
    expect(load).toHaveBeenCalledTimes(2);
    for (const o of layer.group.children) expect((o as any).material.colorNode).toBeNull();
    const dispose = geometries.map(g => vi.spyOn(g, 'dispose'));
    layer.dispose(); layer.dispose();
    for (const spy of dispose) expect(spy).toHaveBeenCalledTimes(1);
  });

  it('disposes textures arriving after teardown without resurrecting the layer', async () => {
    const pending: ((texture: Texture) => void)[] = [];
    const layer = new DioramaLayer((_url, done) => { pending.push(done); });
    layer.configure(32, 32, true);
    layer.dispose();
    for (const done of pending) {
      const map = new Texture(), dispose = vi.spyOn(map, 'dispose'); done(map);
      expect(dispose).toHaveBeenCalledTimes(1);
    }
    expect(layer.group.children).toHaveLength(0);
  });

  it('culls distant walls from a close colony view and restores them after zooming out', async () => {
    const layer = new DioramaLayer(vi.fn()); layer.configure(250, 250, false);
    const camera = new OrthographicCamera(-30, 30, 17, -17, .1, 1000);
    const target = new Vector3(129, 0, 122);
    camera.position.copy(target).add(new Vector3(.85, 2, .9).normalize().multiplyScalar(368));
    camera.lookAt(target); camera.updateProjectionMatrix();
    layer.present(camera, target, 34);
    const close = layer.group.children.filter(o => o.visible).map(o => o.name);
    expect(close.length).toBeGreaterThan(0);
    expect(close).toEqual(['diorama-diorama-box-base', 'diorama-diorama-wooden-table']);
    const restore = await layer.prepare(); restore();
    layer.present(camera, target, 34);
    expect(layer.group.children.filter(o => o.visible).map(o => o.name)).toEqual(close);
    camera.zoom = .1; camera.updateProjectionMatrix();
    layer.present(camera, target, 340);
    const overview = layer.group.children.filter(o => o.visible).map(o => o.name);
    expect(overview.length).toBeGreaterThan(close.length);
    expect(overview.some(name => name.includes('north') && name.includes('upper'))).toBe(true);
    camera.zoom = 1; camera.updateProjectionMatrix();
    layer.present(camera, target, 34);
    expect(layer.group.children.filter(o => o.visible).map(o => o.name)).toEqual(close);
    layer.dispose();
  });

  it('prepares solid pigments when loading fails or times out, and rejects late image ownership', async () => {
    vi.useFakeTimers();
    const late: ((texture: Texture) => void)[] = [];
    let calls = 0;
    const layer = new DioramaLayer((_url, done) => {
      if (++calls === 1) throw Error('Unavailable image loader');
      late.push(done);
    });
    try {
      layer.configure(32, 32, true);
      const ready = layer.prepare();
      await vi.advanceTimersByTimeAsync(15000);
      const restore = await ready; restore();
      const map = new Texture(), dispose = vi.spyOn(map, 'dispose'); late[0]!(map);
      expect(dispose).toHaveBeenCalledOnce();
      for (const o of layer.group.children) expect((o as any).material.colorNode).toBeNull();
    } finally { layer.dispose(); vi.useRealTimers(); }
  });
});
