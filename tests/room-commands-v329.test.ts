// Native command membership, UBOs and pixels are covered by separate browser controls.
import { describe, expect, it, vi } from 'vitest';
import { BundleGroup, Color, Frustum, LessEqualDepth, Matrix4, Mesh, MeshStandardNodeMaterial,
  OrthographicCamera, RenderTarget, Scene, Vector2, Vector3, Vector4, WebGPUCoordinateSystem,
  type BufferGeometry, type Camera, type WebGPURenderer } from 'three/webgpu';
import { RoomLayer } from '../src/render/RoomLayer';
import { createRoomGeometry } from '../src/render/room-geometry';
import { sampleDaylight } from '../src/render/daylight';
import { SceneRenderCore } from '../src/render/SceneRenderCore';
import { LandscapeBatch } from '../src/render/LandscapeBatch';
import { AnimationDetail } from '../src/render/AnimationDetail';
import { TICKS_PER_DAY } from '../src/sim/types';

const noon = TICKS_PER_DAY / 2;
const sample = (tick: number) => sampleDaylight(tick,
  { x: 0, y: 0, z: 0, daylight: 0, warmth: 0, sunlight: 0, moonlight: 0 });
const meshes = (scene: Scene) => {
  const result: Mesh[] = []; scene.traverse(o => { if (o instanceof Mesh) result.push(o); });
  return result.sort((a, b) => a.id - b.id); // Identity comparison survives parent/list order changes.
};
const movers = (room: RoomLayer) => [...room.sun.children, ...room.moon.children] as Mesh[];
const fixedMeshes = (room: RoomLayer) => meshes(room.scene).filter(mesh => !movers(room).includes(mesh));
function ordinaryGroup(room: RoomLayer) {
  const group = room.scene.getObjectByName('room-ordinary-commands');
  expect(group).toBeDefined(); return group!;
}
function fixedGroup(room: RoomLayer): BundleGroup {
  const groups = room.scene.children.filter(o => o instanceof BundleGroup);
  expect(groups).toHaveLength(1); return groups[0] as BundleGroup;
}
function geometryValues(geometry: BufferGeometry) {
  return { attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([name, attr]) =>
    [name, { itemSize: attr.itemSize, normalized: attr.normalized, values: Array.from(attr.array) }])),
    index: geometry.index ? Array.from(geometry.index.array) : null, drawRange: { ...geometry.drawRange } };
}
function material(mesh: Mesh): MeshStandardNodeMaterial {
  expect(mesh.material).toBeInstanceOf(MeshStandardNodeMaterial);
  return mesh.material as MeshStandardNodeMaterial;
}

/** Same caller-state harness as room-backdrop/lifecycle: real geometry, cameras,
 * lights, targets and TSL nodes; backend records calls only, never simulates a
 * retained render bundle or certifies GPU culling, bindings or pixels. */
function harness(mobileLayers = false) {
  const game = new Scene(), room = new RoomLayer(game); room.configure(32, 48, 7);
  if (!mobileLayers) for (const mesh of movers(room)) mesh.layers.set(7);
  const focus = new Vector3(15.5, 0, 23.5), camera = new OrthographicCamera(-50, 50, 50, -50, .1, 1000);
  camera.position.copy(focus).add(new Vector3(80, 90, 100)); camera.lookAt(focus); camera.updateMatrixWorld();
  const caller = new RenderTarget(800, 600);
  const state = { target: caller as RenderTarget | null, autoClear: false, size: new Vector2(800, 600),
    clear: new Color(0x123456), alpha: .4, failure: '' as '' | 'compile' | 'room' | 'restore',
    restoreFailed: false, compiling: false };
  const draws: { scene: unknown; target: RenderTarget | null; version: number }[] = [];
  const renderer = {
    sortObjects: true,
    get autoClear() { return state.autoClear; }, set autoClear(value: boolean) { state.autoClear = value; },
    getDrawingBufferSize: (out: Vector2) => out.copy(state.size),
    getRenderTarget: () => state.target,
    setRenderTarget: (target: RenderTarget | null) => {
      if (state.failure === 'restore' && state.compiling && target === caller && !state.restoreFailed) {
        state.restoreFailed = true; throw Error('Target restoration refused');
      }
      state.target = target;
    },
    getClearColor: (out: Color) => out.copy(state.clear), getClearAlpha: () => state.alpha,
    setClearColor: (color: Color, alpha: number) => { state.clear.copy(color); state.alpha = alpha; },
    compileAsync: vi.fn(async () => {
      state.compiling = true;
      expect(state.target).toBe(room.backdrop.target);
      for (const mesh of meshes(room.scene)) {
        expect(mesh.visible).toBe(true); expect(mesh.frustumCulled).toBe(false);
      }
      if (state.failure === 'compile' || state.failure === 'restore') throw Error('Compile refused');
      state.compiling = false;
    }),
    render: (scene: unknown) => {
      if (scene === room.scene && state.failure === 'room') throw Error('Room draw refused');
      draws.push({ scene, target: state.target, version: fixedGroup(room).version });
    },
  } as unknown as WebGPURenderer;
  const draw = (tick = noon, view: Camera = camera) => {
    room.present(sample(tick), view); room.renderBackground(renderer, view, focus, false);
  };
  return { game, room, focus, camera, caller, state, renderer, draws, draw,
    dispose: () => { room.dispose(); caller.dispose(); } };
}
function geometricallyVisible(room: RoomLayer, camera: Camera): Mesh[] {
  room.scene.updateMatrixWorld(true); camera.updateMatrixWorld();
  const frustum = new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    camera.coordinateSystem, camera.reversedDepth);
  return fixedMeshes(room).filter(o => o.visible && camera.layers.test(o.layers)
    && (!o.frustumCulled || frustum.intersectsObject(o))) as Mesh[];
}

/** The pinned native comparator, not a rewritten candidate comparator. This
 * remains a CPU list oracle; actual Renderer projection/submission is a native gate. */
async function nativeStaticOrder(room: RoomLayer, camera: Camera): Promise<Mesh[]> {
  // @ts-expect-error Pinned Three186 exposes this runtime source without a matching @types declaration.
  const { default: RenderList } = await import('three/src/renderers/common/RenderList.js');
  const list = new RenderList({ getNode: () => ({}) }, room.scene, camera) as {
    push: (...args: unknown[]) => void; sort: () => void; opaque: { object: Mesh }[];
  };
  room.scene.updateMatrixWorld(true); camera.updateMatrixWorld();
  const projection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  for (const mesh of fixedMeshes(room)) {
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const center = mesh.geometry.boundingSphere!.center;
    const point = new Vector4(center.x, center.y, center.z, 1)
      .applyMatrix4(mesh.matrixWorld).applyMatrix4(projection);
    list.push(mesh, mesh.geometry, mesh.material, 0, point.z, null, null);
  }
  list.sort(); return list.opaque.map(item => item.object);
}

describe('V329 B2 ordered room commands and native mobile fallback', () => {
  it('groups only fixed parts with identical geometry, opaque depth state and world matrices', () => {
    const h = harness(), reference = createRoomGeometry(32, 48, 7);
    try {
      const group = fixedGroup(h.room), actual = new Map(meshes(h.room.scene).map(mesh => [mesh.name, mesh]));
      expect(actual.size).toBe(reference.parts.length);
      expect(group.children.map(o => o.name)).toEqual(reference.parts.filter(p => !p.motionKind).map(p => p.name));
      h.room.scene.updateMatrixWorld(true);
      for (const part of reference.parts) {
        const mesh = actual.get(part.name)!;
        expect(geometryValues(mesh.geometry)).toEqual(geometryValues(part.geometry));
        expect(mesh.parent).toBe(part.motionKind ? h.room[part.motionKind] : group);
        expect(mesh.visible).toBe(true); expect(mesh.frustumCulled).toBe(true);
        expect(mesh.castShadow).toBe(false); expect(mesh.receiveShadow).toBe(false);
        expect(mesh.matrixAutoUpdate).toBe(false);
        expect(mesh.matrixWorld.equals(new Matrix4())).toBe(true);
        const m = material(mesh);
        expect([m.transparent, m.opacity, m.depthTest, m.depthWrite, m.depthFunc]).toEqual([false, 1, true, true, LessEqualDepth]);
      }
      expect([h.room.sun.parent, h.room.moon.parent]).toEqual([h.room.scene, h.room.scene]);
      expect(h.room.lighting.roomLights.every(light => light.parent === h.room.scene)).toBe(true);
      expect(group.children.every(o => o instanceof Mesh)).toBe(true);
    } finally { reference.parts.forEach(p => p.geometry.dispose()); h.dispose(); }
  });

  it('uses exact layer/visibility/material/frustum admission and restores fixed ownership through live solar changes', () => {
    const h = harness(true);
    try {
      const moving = movers(h.room), fixed = fixedMeshes(h.room);
      for (const mesh of moving) mesh.layers.set(7);
      h.draw(); const group = fixedGroup(h.room), version = group.version;
      const geometries = fixed.map(mesh => mesh.geometry), nodes = moving.map(mesh => [material(mesh).maskNode, material(mesh).emissiveNode]);
      expect(group.visible).toBe(true); expect(ordinaryGroup(h.room).children).toHaveLength(0);
      const sun = h.room.sun.position.clone(), source = h.room.lighting.sun.position.clone(), power = h.room.lighting.sun.intensity;
      h.draw(noon + 300); h.draw(noon + 600);
      expect(group.version).toBe(version); expect(group.children).toHaveLength(fixed.length);
      expect(h.room.sun.position.equals(sun)).toBe(false);
      expect(h.room.lighting.sun.position.equals(source)).toBe(false);
      expect(h.room.lighting.sun.intensity).not.toBe(power);
      const selected = moving.find(mesh => mesh.name === 'room-sun-paper')!;
      expect(selected).toBeDefined(); selected.layers.set(0); selected.visible = false;
      h.draw(noon + 601); expect(group.visible).toBe(true);
      selected.visible = true; material(selected).visible = false;
      h.draw(noon + 602); expect(group.visible).toBe(true);
      material(selected).visible = true;
      // Force a native submission without relying on a particular fixture framing.
      selected.frustumCulled = false; h.draw(noon + 603);
      expect(group.visible).toBe(false); expect(group.children).toHaveLength(0);
      expect(ordinaryGroup(h.room).children).toEqual(fixed);
      const fallbackVersion = group.version; h.draw(noon + 604);
      expect(group.version).toBe(fallbackVersion);
      h.room.sun.visible = false; h.draw(noon + 604.25); expect(group.visible).toBe(true);
      h.room.sun.visible = true; h.draw(noon + 604.5); expect(group.visible).toBe(false);
      // Intensity and opaque mask do not imply a non-submission.
      h.room.setSettings({ sun: 0, moon: 0, ambient: 1 }); h.room.setMaskRadius(.31);
      h.draw(noon + 605); expect(group.visible).toBe(false);
      selected.frustumCulled = true;
      const savedPosition = h.camera.position.clone(); h.camera.position.x += 10000;
      h.camera.lookAt(h.focus.clone().add(new Vector3(10000, 0, 0))); h.draw(noon + 606);
      const frustum = new Frustum().setFromProjectionMatrix(new Matrix4()
        .multiplyMatrices(h.camera.projectionMatrix, h.camera.matrixWorldInverse), h.camera.coordinateSystem, h.camera.reversedDepth);
      expect(selected.intersectsFrustum(frustum)).toBe(false); expect(group.visible).toBe(true);
      h.camera.position.copy(savedPosition); h.camera.lookAt(h.focus);
      selected.layers.set(7); h.draw(noon + 607);
      expect(group.visible).toBe(true); expect(ordinaryGroup(h.room).children).toHaveLength(0);
      h.renderer.sortObjects = false; h.draw(noon + 608);
      expect(group.visible).toBe(false); expect(ordinaryGroup(h.room).children).toEqual(fixed);
      h.renderer.sortObjects = true; h.draw(noon + 609); expect(group.visible).toBe(true);
      expect(fixed.map(mesh => mesh.geometry)).toEqual(geometries);
      expect(moving.map(mesh => [material(mesh).maskNode, material(mesh).emissiveNode])).toEqual(nodes);
      expect(moving.map(mesh => mesh.parent)).toEqual([h.room.sun, h.room.sun, h.room.moon, h.room.moon]);
      expect(h.state.target).toBe(h.caller); expect(h.state.autoClear).toBe(false);
    } finally { h.dispose(); }
  });

  it('matches the pinned opaque order across camera recapture and preserves the actual cull on return', async () => {
    const h = harness();
    try {
      h.draw(); const group = fixedGroup(h.room), version = group.version;
      const originalOrder = group.children.slice();
      expect(group.children).toEqual(await nativeStaticOrder(h.room, h.camera));
      const visible = geometricallyVisible(h.room, h.camera);
      expect(visible.length).toBeGreaterThan(0);
      const position = h.camera.position.clone(); h.camera.position.x += 10000;
      h.camera.lookAt(h.focus.clone().add(new Vector3(10000, 0, 0)));
      h.draw(noon + 1);
      expect(geometricallyVisible(h.room, h.camera)).toHaveLength(0); expect(group.version).toBeGreaterThan(version);
      expect(group.children).toEqual(await nativeStaticOrder(h.room, h.camera));
      const awayVersion = group.version;
      h.camera.position.copy(position); h.camera.lookAt(h.focus); h.draw(noon + 2);
      expect(geometricallyVisible(h.room, h.camera)).toEqual(visible);
      expect(group.children).toEqual(originalOrder);
      expect(group.version).toBeGreaterThan(awayVersion);
      h.camera.position.copy(h.focus).add(new Vector3(-80, 90, -100)); h.camera.lookAt(h.focus); h.draw(noon + 3);
      expect(group.children).toEqual(await nativeStaticOrder(h.room, h.camera));
      expect(group.children).not.toEqual(originalOrder);
      h.camera.coordinateSystem = WebGPUCoordinateSystem; h.camera.updateProjectionMatrix(); h.draw(noon + 4);
      const forwardDepthOrder = group.children.slice(), forwardVersion = group.version;
      // Native Renderer sets this internal Camera flag; use its real projection
      // and real RenderList.push/sort rather than a rewritten depth comparator.
      expect(Reflect.set(h.camera, '_reversedDepth', true)).toBe(true);
      h.camera.updateProjectionMatrix(); h.draw(noon + 5);
      expect(h.camera.reversedDepth).toBe(true); expect(group.version).toBeGreaterThan(forwardVersion);
      expect(group.children).toEqual(await nativeStaticOrder(h.room, h.camera));
      expect(group.children).toEqual(forwardDepthOrder);
      const reversedVersion = group.version;
      Reflect.set(h.camera, '_reversedDepth', false); h.camera.updateProjectionMatrix(); h.draw(noon + 6);
      expect(group.version).toBeGreaterThan(reversedVersion);
      expect(group.children).toEqual(await nativeStaticOrder(h.room, h.camera));
      for (const mesh of meshes(h.room.scene)) expect(mesh.frustumCulled).toBe(true);
    } finally { h.dispose(); }
  });

  it('recaptures for a replacement view, projection, layers, coordinates and odd-sized target, then reuses them', () => {
    const h = harness();
    try {
      h.draw(); const group = fixedGroup(h.room); let version = group.version;
      const replacement = h.camera.clone(); h.draw(noon + 1, replacement);
      expect(group.version).toBeGreaterThan(version); version = group.version;
      replacement.zoom = 2; replacement.updateProjectionMatrix(); h.draw(noon + 2, replacement);
      expect(group.version).toBeGreaterThan(version); version = group.version;
      replacement.layers.disableAll(); h.draw(noon + 3, replacement);
      expect(geometricallyVisible(h.room, replacement)).toHaveLength(0);
      expect(group.version).toBeGreaterThan(version); version = group.version;
      replacement.layers.enable(0); replacement.coordinateSystem = WebGPUCoordinateSystem;
      h.draw(noon + 4, replacement); expect(group.version).toBeGreaterThan(version); version = group.version;
      h.state.size.set(801, 603); h.draw(noon + 5, replacement);
      expect([h.room.backdrop.target.width, h.room.backdrop.target.height]).toEqual([401, 302]);
      expect(group.version).toBeGreaterThan(version); version = group.version;
      h.draw(noon + 6, replacement); expect(group.version).toBe(version);
      expect(h.state.target).toBe(h.caller);
    } finally { h.dispose(); }
  });

  it('updates paused texture, mask and lighting choices without replacing any mesh, geometry or material', () => {
    const h = harness();
    try {
      h.draw(); const group = fixedGroup(h.room), original = meshes(h.room.scene);
      const geometries = original.map(m => m.geometry), materials = original.map(m => m.material);
      const source = h.room.lighting.sun.intensity; let version = group.version;
      h.room.setTexturesEnabled(false); h.draw();
      expect(group.version).toBeGreaterThan(version); version = group.version;
      for (const mesh of original) expect(material(mesh).colorNode).toBeNull();
      h.room.setMaskRadius(0); h.draw(); expect(group.version).toBeGreaterThan(version); version = group.version;
      h.room.setSettings({ sun: 2, moon: 0, ambient: .5 }); h.draw();
      expect(group.version).toBeGreaterThan(version); version = group.version;
      expect(h.room.lighting.sun.intensity).toBeCloseTo(source * 2, 8); expect(h.room.lighting.moon.intensity).toBe(0);
      h.room.setTexturesEnabled(true); h.room.setMaskRadius(.31);
      h.room.setSettings({ sun: 1, moon: 1, ambient: 1 }); h.draw();
      expect(group.version).toBeGreaterThan(version);
      for (const mesh of original) expect(material(mesh).colorNode).not.toBeNull();
      expect(meshes(h.room.scene)).toEqual(original);
      expect(original.map(m => m.geometry)).toEqual(geometries); expect(original.map(m => m.material)).toEqual(materials);
      const renders = h.room.backdrop.stats.roomRenders; h.draw();
      expect(h.room.backdrop.stats.roomRenders).toBe(renders); // Paused final image can still be cached.
    } finally { h.dispose(); }
  });

  it('drops replaced fixed parts and retains only the current rectangular-map geometry', () => {
    const h = harness();
    try {
      h.draw(); const group = fixedGroup(h.room), original = meshes(h.room.scene), version = group.version;
      const disposals = original.map(m => vi.spyOn(m.geometry, 'dispose'));
      h.room.configure(32, 48, 7); h.draw();
      expect(meshes(h.room.scene)).toEqual(original); expect(group.version).toBe(version);
      for (const dispose of disposals) expect(dispose).not.toHaveBeenCalled();
      h.room.configure(48, 32, 8); h.draw();
      const current = meshes(h.room.scene);
      expect(current.length).toBeGreaterThan(0); expect(current.some(m => original.includes(m))).toBe(false);
      for (const mesh of original) expect(mesh.parent).toBeNull();
      for (const dispose of disposals) expect(dispose).toHaveBeenCalledOnce();
      expect(group.children.every(o => current.includes(o as Mesh))).toBe(true);
      expect(group.version).toBeGreaterThan(version);
      expect(h.draws.at(-2)?.scene).toBe(h.room.scene);
    } finally { h.dispose(); }
  });

  it('restores nondefault visibility/culling after warm success and compile, draw or target-restoration refusal', async () => {
    for (const mobileLayers of [false, true]) for (const failure of ['', 'compile', 'room', 'restore'] as const) {
      const h = harness(mobileLayers);
      try {
        h.draw(); const original = meshes(h.room.scene), group = fixedGroup(h.room), version = group.version;
        original.forEach((mesh, i) => { mesh.visible = i % 2 === 0; mesh.frustumCulled = i % 3 !== 0; });
        const flags = original.map(mesh => [mesh.visible, mesh.frustumCulled]);
        // Exercise an actual warm pass, rather than an already cached backdrop.
        h.room.backdrop.invalidate();
        h.state.failure = failure;
        if (failure) await expect(h.room.prepare(h.renderer, h.camera)).rejects.toThrow();
        else await h.room.prepare(h.renderer, h.camera);
        expect(original.map(mesh => [mesh.visible, mesh.frustumCulled])).toEqual(flags);
        expect(group.version).toBeGreaterThan(version);
        if (failure !== 'restore') expect(h.state.target).toBe(h.caller);
        else expect(h.state.restoreFailed).toBe(true); // A rejected backend setter cannot promise a restored target.
        h.state.failure = ''; h.state.compiling = false; h.state.target = h.caller;
        const completed = h.room.backdrop.stats.roomRenders, afterWarm = group.version;
        h.draw();
        expect(h.room.backdrop.stats.roomRenders).toBe(completed + 1);
        expect(group.version).toBeGreaterThan(afterWarm);
        expect(original.map(mesh => [mesh.visible, mesh.frustumCulled])).toEqual(flags);
        expect(h.state.target).toBe(h.caller);
      } finally { h.dispose(); }
    }
  });

  it('disposes old command owners on two Core OFF/ON cycles and ignores their delayed callbacks', async () => {
    const h = harness();
    const core = Object.assign(Object.create(SceneRenderCore.prototype), {
      disposed: false, roomEnabled: true, dioramaEnabled: true, room: h.room, scene: h.game,
      world: { width: 32, height: 48, seed: 7 }, texturesEnabled: true, roomMaskRadius: .31,
      lightingSettings: { sun: 1, moon: 1, ambient: 1 }, landscape: new LandscapeBatch(), armedRoom: null,
      animationDetail: new AnimationDetail(), skyAnimation: new AnimationDetail().createHandle(),
      daylight: { setExternalLighting: vi.fn() }, rig: { setRoomEnabled: vi.fn() },
      configureDiorama: vi.fn(), invalidatePausedShadow: vi.fn(),
    });
    try {
      for (let cycle = 0; cycle < 2; cycle++) {
        const former = core.room as RoomLayer;
        const parts = meshes(former.scene), disposals = parts.map(mesh => vi.spyOn(mesh.geometry, 'dispose'));
        const targetDispose = vi.spyOn(former.backdrop.target, 'dispose');
        core.setRoomEnabled(false); core.setRoomEnabled(false);
        expect(core.room).toBeNull(); expect(former.scene.children).toHaveLength(0);
        const calls = h.draws.length;
        former.present(sample(noon), h.camera);
        former.renderBackground(h.renderer, h.camera, h.focus); former.composeBackground(h.renderer);
        await former.prepare(h.renderer, h.camera); former.dispose();
        expect(h.draws).toHaveLength(calls); expect(targetDispose).toHaveBeenCalledOnce();
        for (const dispose of disposals) expect(dispose).toHaveBeenCalledOnce();
        core.setRoomEnabled(true); core.setRoomEnabled(true);
        const current = core.room as RoomLayer;
        expect(current).not.toBe(former); expect(fixedGroup(current).children.length).toBeGreaterThan(0);
        expect(meshes(current.scene).some(mesh => parts.includes(mesh))).toBe(false);
        expect(h.game.children).toEqual([current.lighting.sun, current.lighting.moon, current.lighting.ambient]);
      }
    } finally { (core.room as RoomLayer | null)?.dispose(); h.dispose(); }
  });
});
