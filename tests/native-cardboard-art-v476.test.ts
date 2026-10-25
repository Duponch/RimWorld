import {createHash} from 'node:crypto';
import {afterEach, describe, expect, it, vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {MANAGEMENT_BUTTONS, PALETTE, PrototypeCardboardArt, createCutoutRectShape, seededRandom, type CardboardPiece} from '../src/ui3d/prototype-art';

type InkCommand = unknown[];
interface PaintSurface {
  canvas: HTMLCanvasElement;
  commands: InkCommand[];
}

/** A procedural-ink recorder, not a browser, canvas rasterizer or DOM layout.
 * Save/restore has real style scope so the golden stream also covers styles
 * read back by the original brush helpers. Coordinates normalize at 1e-6 px. */
function canvasFixture(): PaintSurface {
  const commands: InkCommand[] = [], state = new Map<PropertyKey, unknown>(), stack: Array<Map<PropertyKey, unknown>> = [];
  const methods = new Set(['clearRect', 'fillRect', 'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'arc', 'translate', 'rotate', 'fillText', 'strokeText']);
  const normalize = (value: unknown): unknown => typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value;
  const ctx = new Proxy({}, {
    get(_target, key) {
      if (typeof key === 'string' && methods.has(key)) return (...args: unknown[]) => {
        commands.push([key, ...args.map(normalize)]);
        if (key === 'save') stack.push(new Map(state));
        if (key === 'restore') { state.clear(); for (const [name, value] of stack.pop() ?? []) state.set(name, value); }
      };
      return state.get(key);
    },
    set(_target, key, value: unknown) { state.set(key, value); commands.push(['set', key, normalize(value)]); return true; }
  }) as CanvasRenderingContext2D;
  return {canvas: {width: 0, height: 0, getContext: (kind: string) => {if (kind !== '2d') throw new Error(`Unexpected context ${kind}`); return ctx;}} as unknown as HTMLCanvasElement, commands};
}

function installCanvases(): PaintSurface[] {
  const surfaces: PaintSurface[] = [];
  vi.stubGlobal('document', {createElement: (tag: string) => {
    if (tag !== 'canvas') throw new Error(`Native paint requested a non-canvas element: ${tag}`);
    const surface = canvasFixture(); surfaces.push(surface); return surface.canvas;
  }});
  return surfaces;
}
const inkHash = (surface: PaintSurface): string => createHash('sha256').update(JSON.stringify(surface.commands)).digest('hex');
const onDispose = (resource: THREE.BufferGeometry | THREE.Material | THREE.Texture) => {
  const spy = vi.fn(); resource.addEventListener('dispose', spy); return spy;
};
function frontMaterial(piece: CardboardPiece): THREE.MeshStandardMaterial {
  return (piece.userData.mesh.material as THREE.Material[])[0] as THREE.MeshStandardMaterial;
}

afterEach(() => {vi.unstubAllGlobals(); vi.restoreAllMocks();});

describe('literal prototype cut and ink provenance', () => {
  // Golden values below were obtained by executing the original user-supplied
  // diorama_carton_hud_3d_three_js_webgpu(3).html functions on 25 October 2026.
  // They are constants, not expected values recomputed by the product helpers.
  it.each([
    {seed: 1, values: [0.000007825903601782307, 0.13153778773875702, 0.7556053220812281, 0.4586501316713636, 0.5327672371945971]},
    {seed: 0, values: [0.9999921736307369, 0.8684622117955817, 0.24439467745311064, 0.5413498678629751, 0.4672327623397417]},
    {seed: 600, values: [0.0046958210921807415, 0.9226728858637371, 0.3631933167234001, 0.1900791536924235, 0.660342447143367]}
  ])('retains the original seeded brush/cut sequence for seed $seed', ({seed, values}) => {
    const rng = seededRandom(seed);
    expect(Array.from({length: values.length}, () => rng())).toEqual(values);
  });

  it('retains the architect card’s cut silhouette including snipped corners and a closed edge', () => {
    const points = createCutoutRectShape(.63, .55, .038, 600).getPoints();
    const golden = [
      [-.3101459715143137, -.27010370705751446], [-.0014665979516129016, -.27074325713207786],
      [.3072112593790018, -.2719030334639452], [.3104316160067681, -.2621566772591474],
      [.313473550930407, .0021784431151216062], [.3159482051172041, .26344490582422825],
      [.3129553571392408, .27627297791679273], [.0033362308647694227, .26863451449753667],
      [-.30629075784906296, .2759473346360788], [-.30949743313303474, .26470453344252987],
      [-.30679881065009035, .0028935445970634786], [-.31324470895767326, -.2673644180027939],
      [-.3101459715143137, -.27010370705751446]
    ];
    expect(points).toHaveLength(golden.length);
    points.forEach((point, index) => {expect(point.x).toBeCloseTo(golden[index]![0]!, 11); expect(point.y).toBeCloseTo(golden[index]![1]!, 11);});
    expect(createCutoutRectShape(.63, .55, .038, 600).getPoints().map(point => point.toArray())).toEqual(points.map(point => point.toArray()));
    expect(createCutoutRectShape(.63, .55, .038, 631).getPoints().map(point => point.toArray())).not.toEqual(points.map(point => point.toArray()));
  });

  it('retains the much smaller masking tape’s independent torn-edge scale', () => {
    const points = createCutoutRectShape(.14, .04, .014, 27).getPoints();
    expect(points).toHaveLength(13);
    const golden = [[0, -.06778232612776897, -.020386039824865768], [1, -.0002802420178078295, -.018027217784866045], [6, .06958952454986454, .019639110750539892], [11, -.07039710243004914, -.019499847005027594]];
    for (const [index, x, y] of golden) {expect(points[index!]!.x).toBeCloseTo(x!, 11); expect(points[index!]!.y).toBeCloseTo(y!, 11);}
  });

  it('matches literal gouache, medallion, icon, name tape and font command streams for three distinct tabs', () => {
    const surfaces = installCanvases(), art = new PrototypeCardboardArt();
    try {
      const golden = [
        {index: 0, count: 1023, hash: '8f0ec01b1de7e278b07e4c20e6dd110831bc236bccc776e9b20147b05fed27d1'},
        {index: 3, count: 978, hash: 'c705b5f3477ecf92e75b37214d20279773598ba1fba2a01d19bb93689ee1dc27'},
        {index: 11, count: 1001, hash: 'ec7b80c3bc2a4eda061f83e4ed3bd4aab3ba13f1ca231bd9f51d7ad05848bc4a'}
      ];
      for (const [surfaceIndex, entry] of golden.entries()) {
        const piece = art.createManagementButton(entry.index, MANAGEMENT_BUTTONS[entry.index]!, () => {});
        expect(surfaces[surfaceIndex]!.commands).toHaveLength(entry.count);
        expect(inkHash(surfaces[surfaceIndex]!)).toBe(entry.hash);
        const geometry = piece.userData.mesh.geometry as THREE.ExtrudeGeometry;
        expect(geometry.parameters.options.bevelEnabled).toBe(false);
        expect(frontMaterial(piece).roughness).toBe(.99);
        expect(frontMaterial(piece).metalness).toBe(0);
        expect(piece.userData.texture.colorSpace).toBe(THREE.SRGBColorSpace);
        const position = geometry.getAttribute('position');
        for (let index = 0; index < position.count; index++) expect(position.getZ(index)).toBeGreaterThanOrEqual(0);
      }
    } finally { art.dispose(); }
  });

  it('repaints the original active ink once and leaves its GPU texture unchanged for a repeated active value', () => {
    const surfaces = installCanvases(), art = new PrototypeCardboardArt();
    try {
      const piece = art.createManagementButton(0, MANAGEMENT_BUTTONS[0]!, () => {}), surface = surfaces[0]!;
      surface.commands.length = 0; piece.setActive(true);
      expect(surface.commands).toHaveLength(1023);
      expect(inkHash(surface)).toBe('aa64544bd3f4dedf7e6903afae3b3af31f9c57861020ff574be5ff032853e7fe');
      const textureVersion = piece.userData.texture.version;
      surface.commands.length = 0; piece.setActive(true);
      expect(surface.commands).toHaveLength(0);
      expect(piece.userData.texture.version).toBe(textureVersion);
      piece.setActive(false);
      expect(inkHash(surface)).toBe('8f0ec01b1de7e278b07e4c20e6dd110831bc236bccc776e9b20147b05fed27d1');
    } finally { art.dispose(); }
  });
});

describe('native cardboard resource ownership', () => {
  it('releases a removed card’s paint, edge geometry and tape while retaining sibling/factory resources', () => {
    const surfaces = installCanvases(), first = new PrototypeCardboardArt(), second = new PrototypeCardboardArt();
    let firstClosed = false, secondClosed = false;
    try {
      const root = new THREE.Group();
      const removed = first.createManagementButton(0, MANAGEMENT_BUTTONS[0]!, () => {});
      const survivor = first.createManagementButton(1, MANAGEMENT_BUTTONS[1]!, () => {});
      const foreign = second.createManagementButton(3, MANAGEMENT_BUTTONS[3]!, () => {});
      const shelf = first.createBottomShelf(); root.add(removed, survivor, foreign, shelf);
      const privateTexture = onDispose(removed.userData.texture), privateFront = onDispose(frontMaterial(removed));
      const face = onDispose(removed.userData.mesh.geometry), shadow = onDispose(removed.userData.shadowMesh.geometry);
      const tape = removed.children.find(child => child !== removed.userData.mesh && child !== removed.userData.shadowMesh) as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      const tapeGeometry = onDispose(tape.geometry), tapeMaterial = onDispose(tape.material);
      const sharedEdge = onDispose(first.cardboardEdgeMat), sharedShadow = onDispose(first.shadowMat), survivorTexture = onDispose(survivor.userData.texture);
      const foreignTexture = onDispose(foreign.userData.texture), foreignEdge = onDispose(second.cardboardEdgeMat);
      const shelfGeometry = onDispose(shelf.geometry), shelfWall = onDispose((shelf.material as THREE.Material[])[4]!);
      first.disposePiece(removed); first.disposePiece(removed);
      for (const spy of [privateTexture, privateFront, face, shadow, tapeGeometry, tapeMaterial]) expect(spy).toHaveBeenCalledTimes(1);
      for (const spy of [sharedEdge, sharedShadow, survivorTexture, foreignTexture, foreignEdge, shelfGeometry, shelfWall]) expect(spy).not.toHaveBeenCalled();
      expect(removed.parent).toBeNull(); expect(first.interactiveMeshes).not.toContain(removed.userData.mesh);
      expect(first.interactiveMeshes).toContain(survivor.userData.mesh);
      first.disposePiece(foreign);
      expect(foreign.parent).toBe(root); expect(foreignTexture).not.toHaveBeenCalled();
      surfaces[1]!.commands.length = 0; survivor.redraw();
      expect(surfaces[1]!.commands.length).toBeGreaterThan(0);
      first.dispose(); firstClosed = true;
      for (const spy of [sharedEdge, sharedShadow, survivorTexture, shelfGeometry, shelfWall]) expect(spy).toHaveBeenCalledTimes(1);
      expect(foreignTexture).not.toHaveBeenCalled(); expect(foreignEdge).not.toHaveBeenCalled();
      surfaces[2]!.commands.length = 0; foreign.redraw(undefined, PALETTE.ochre);
      expect(surfaces[2]!.commands.length).toBeGreaterThan(0);
      expect(second.interactiveMeshes).toContain(foreign.userData.mesh);
      second.dispose(); secondClosed = true;
      expect(foreignTexture).toHaveBeenCalledTimes(1); expect(foreignEdge).toHaveBeenCalledTimes(1);
    } finally {if (!firstClosed) first.dispose(); if (!secondClosed) second.dispose();}
  });
});
