import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import { expectWorld, observeErrors, panel, pause, saveKey } from './helpers.ts';
import { testOutputPath, writeTestFile } from '../test-output.ts';

// Decode only Playwright's ordinary 8-bit RGB/RGBA PNG screenshots. No image
// package or implementation source is used to define the pixel oracle.
function pixels(png: Buffer) {
  let width = 0, height = 0, channels = 0;
  const chunks: Buffer[] = [];
  for (let cursor = 8; cursor < png.length;) {
    const size = png.readUInt32BE(cursor), type = png.toString('ascii', cursor + 4, cursor + 8);
    const data = png.subarray(cursor + 8, cursor + 8 + size);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || ![2, 6].includes(data[9]!) || data[12] !== 0) throw new Error('Unsupported screenshot PNG.');
      channels = data[9] === 2 ? 3 : 4;
    }
    if (type === 'IDAT') chunks.push(data);
    cursor += size + 12;
  }
  const packed = inflateSync(Buffer.concat(chunks)), stride = width * channels;
  const raw = new Uint8Array(height * stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c, aa = Math.abs(p - a), bb = Math.abs(p - b), cc = Math.abs(p - c);
    return aa <= bb && aa <= cc ? a : bb <= cc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = packed[y * (stride + 1)]!;
    if (filter > 4) throw new Error('Invalid PNG row filter.');
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, a = x >= channels ? raw[i - channels]! : 0;
      const b = y ? raw[i - stride]! : 0, c = y && x >= channels ? raw[i - stride - channels]! : 0;
      raw[i] = (packed[y * (stride + 1) + 1 + x]! + [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter]!) & 255;
    }
  }
  return { width, height, channels, raw };
}
function difference(left: Buffer, right: Buffer) {
  const a = pixels(left), b = pixels(right);
  expect([a.width, a.height, a.channels]).toEqual([b.width, b.height, b.channels]);
  let maxChannel = 0, total = 0, changedChannels = 0;
  for (let i = 0; i < a.raw.length; i++) {
    const delta = Math.abs(a.raw[i]! - b.raw[i]!); maxChannel = Math.max(maxChannel, delta);
    total += delta; if (delta) changedChannels++;
  }
  return { maxChannel, meanChannel: total / a.raw.length, changedChannels };
}
const hook = `const terrainGrassFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=terrainGrassFrame.apply(this,args);
 if(!this.preparing){window.__terrainGrassView=this;const p=window.__terrainGrassProbe;
  if(p?.scene){const g=this.grass,s=p.slot;
   g.baseInstances.value=0;g.nearInstances.value=0;
   g.slotsPerCell.value=s.slot;g.nearSlotsPerCell.value=0;g.foregroundSlotsPerCell.value=1;
   g.foregroundGridOrigin.value.set(s.x,s.z);g.foregroundGridWidth.value=1;
   g.zoomVisibility.value=1;g.bandView.value.set(0,0,0,0);g.bandLimits.value.set(1000,1,1000,1);
   g.windStrength.value=0;g.mesh.visible=true;g.mesh.geometry.instanceCount=p.blocked?0:1;
   this.renderer.render(p.scene,p.camera);
  }
 }return result;};`;
const settled = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
async function capture(page: Page, name: string) {
  await settled(page);
  const path = testOutputPath(`artifacts/terrain-grass-v200-${name}.png`);
  const png = await page.getByTestId('world-canvas').screenshot({ path });
  await test.info().attach(name, { path, contentType: 'image/png' }); return png;
}

test('V200 native grass samples the shared real terrain atlas at fixed blade roots', async ({ playwright }) => {
  test.setTimeout(120_000);
  const prepared = deserializeWorld(readFileSync('public/test-saves/v196/sang-depouilles-douleur.json', 'utf8'));
  expect(validateWorld(prepared)).toEqual([]);
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: true, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page), requests: string[] = [];
  page.on('requestfailed', r => requests.push(`${r.url()}: ${r.failure()?.errorText}`));
  let report: any = { prepared: true, renderOnly: true, performance: 'No benchmark or general performance claim.',
    oracle: 'CPU LOD0 bilinear filtering of per-texel sRGB-decoded real atlas versus constant-albedo reference on the same actual GPU blade, light, camera and geometry. Pixel max-channel tolerance 2/255.' };
  try {
    await page.addInitScript(({ key, save }) => {
      localStorage.setItem(key, save); localStorage.setItem('lisiere.presentation.textures.v1', 'true');
      localStorage.setItem('lisiere.presentation.ground-grass.v1', 'true');
      const p = { pipelines: [] as any[], gpuErrors: [] as string[], shaders: [] as string[] };
      (window as any).__terrainGrassProbe = p;
      const proto = (globalThis as any).GPUDevice?.prototype;
      if (!proto) return;
      const shader = proto.createShaderModule;
      proto.createShaderModule = function (d: any) { p.shaders.push(d.code); return Reflect.apply(shader, this, [d]); };
      for (const name of ['createRenderPipeline', 'createRenderPipelineAsync']) {
        const original = proto[name]; proto[name] = function (d: any) {
          const buffers = (d.vertex.buffers ?? []).filter(Boolean);
          p.pipelines.push({ label: d.label, vertexBuffers: buffers.length,
            vertexAttributes: buffers.reduce((n: number, b: any) => n + b.attributes.length, 0) });
          return Reflect.apply(original, this, [d]);
        };
      }
      const adapter = (globalThis as any).GPUAdapter?.prototype;
      if (adapter) {
        const request = adapter.requestDevice; adapter.requestDevice = async function (...args: any[]) {
          const d = await Reflect.apply(request, this, args) as any;
          d.addEventListener('uncapturederror', (e: any) => p.gpuErrors.push(String(e.error))); return d;
        };
      }
    }, { key: saveKey, save: serializeWorld(prepared) });
    await page.route('**/src/main.ts*', async route => { const r = await route.fetch(); await route.fulfill({ response: r, body: hook + await r.text() }); });
    await page.goto('/?scenario=camp&size=32&e2e'); await expect(page.locator('#loading')).toHaveCount(0); await pause(page);
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, prepared); await page.keyboard.press('Escape');
    await page.waitForFunction(() => Boolean((window as any).__terrainGrassView?.world));
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    const initial = await page.evaluate(async () => {
      const v = (window as any).__terrainGrassView, p = (window as any).__terrainGrassProbe;
      const path = '/src/render/grass-blood-mask.ts', { grassRoot } = await import(path);
      const chart = structuredClone(v.world); chart.filth.items = []; v.hasTracks = false; v.setWorld(chart, true, 0); p.chart = chart;
      const g = v.grass, paint = v.terrainPaintTexture;
      if (g.terrainPaint.value !== paint || !g.terrainPaintPresent.value) throw new Error('Grass is not bound to the actual shared terrain atlas.');
      // Native SRGB texture format decodes each texel before GPU filtering.
      const decode = (b: number) => { const c = b / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
      p.sample = (root: number[]) => {
        const image = v.terrainPaintTexture.image;
        const u = Math.fround(Math.fround(root[0] + .5) / chart.width), vv = Math.fround(Math.fround(root[1] + .5) / chart.height);
        const xx = u * image.width - .5, yy = vv * image.height - .5, ix = Math.floor(xx), iy = Math.floor(yy), fx = xx - ix, fy = yy - iy;
        const texel = (x: number, y: number, c: number) => decode(image.data[(Math.max(0, Math.min(image.height - 1, y)) * image.width + Math.max(0, Math.min(image.width - 1, x))) * 4 + c]);
        return [0, 1, 2].map(c => texel(ix, iy, c) * (1 - fx) * (1 - fy) + texel(ix + 1, iy, c) * fx * (1 - fy) +
          texel(ix, iy + 1, c) * (1 - fx) * fy + texel(ix + 1, iy + 1, c) * fx * fy);
      };
      const cell = { x: 8, z: 23 };
      if (!g.map.image.data[(cell.z * chart.width + cell.x) * 4 + 3]) throw new Error('Prepared reference cell is covered.');
      const rows = Array.from({ length: 224 }, (_, slot) => { const root = grassRoot(cell.x, cell.z, slot); return { ...cell, slot, root, rgb: p.sample(root) }; });
      rows.sort((a, b) => a.rgb[1] - b.rgb[1]);
      p.slots = [rows[0], rows[Math.floor(rows.length / 2)], rows.at(-1)]; p.slot = p.slots[0]; p.originalTile = structuredClone(chart.tiles[cell.z * chart.width + cell.x]);
      p.originalMaterial = g.mesh.material; p.paint = paint; p.paintData = paint.image.data;
      return { slots: p.slots, cell, sameTexture: g.terrainPaint.value === paint, samePixels: g.terrainPaint.value.image.data === paint.image.data,
        paintBytes: paint.image.data.byteLength, terrainBytes: g.map.image.data.byteLength, dimensions: [paint.image.width, paint.image.height], tick: chart.tick };
    });
    report.initial = initial; expect(initial.sameTexture).toBe(true); expect(initial.samePixels).toBe(true);
    expect(Math.abs(initial.slots[0].rgb[1] - initial.slots[2].rgb[1])).toBeGreaterThan(.001);
    // Capture the real terrain under its blades before submitting isolated slots.
    await page.evaluate((c: any) => {
      const v = (window as any).__terrainGrassView; v.controls.enableDamping = false; v.controls.maxZoom = 30; v.rig.setMode('orthographic');
      v.controls.target.set(c.x, .2, c.z); v.camera.position.set(c.x + 4, 6, c.z + 5); v.camera.zoom = 12;
      v.camera.updateProjectionMatrix(); v.controls.update(); v.invalidatePausedShadow();
    }, initial.cell); await capture(page, 'ground-and-blades-witness');
    await page.addStyleTag({ content: 'body * { visibility:hidden !important } [data-testid="world-canvas"] { visibility:visible !important }' });
    await page.evaluate(async () => {
      const path = '/tests/integration/terrain-grass-v200-browser.ts', { THREE, vec3 } = await import(path);
      const p = (window as any).__terrainGrassProbe, v = (window as any).__terrainGrassView;
      p.vec3 = vec3; p.scene = new THREE.Scene(); p.scene.background = new THREE.Color(0xffffff); p.scene.add(v.grass.mesh); v.grass.mesh.receiveShadow = false;
      p.scene.add(new THREE.AmbientLight(0xffffff, 1.5)); const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(3, 8, 4); p.scene.add(light);
      p.camera = new THREE.OrthographicCamera(-.55, .55, .38, -.38, .1, 100);
    });
    const comparisons: any[] = [];
    for (const [index, slot] of initial.slots.entries()) {
      await page.evaluate((s: any) => {
        const p = (window as any).__terrainGrassProbe, g = (window as any).__terrainGrassView.grass; p.slot = s;
        p.camera.position.set(s.root[0] + 1, 1.1, s.root[1] + 1.5); p.camera.lookAt(s.root[0], .17, s.root[1]); p.camera.updateMatrixWorld();
        g.mesh.material = p.originalMaterial; g.setTerrainPaint(p.paint); g.setTexturesEnabled(true);
      }, slot);
      const actual = await capture(page, `slot-${index}-atlas`);
      await page.evaluate((rgb: number[]) => {
        const p = (window as any).__terrainGrassProbe, g = (window as any).__terrainGrassView.grass;
        p.reference = p.originalMaterial.clone(); p.reference.colorNode = p.vec3(...rgb); g.mesh.material = p.reference;
      }, slot.rgb);
      const reference = await capture(page, `slot-${index}-cpu-bilinear-reference`), delta = difference(actual, reference);
      comparisons.push({ slot, delta }); expect(delta.maxChannel).toBeLessThanOrEqual(2);
      await page.evaluate(() => {
        const p = (window as any).__terrainGrassProbe, v = (window as any).__terrainGrassView;
        v.grass.mesh.material = p.originalMaterial; p.reference.dispose(); v.grass.setTerrainPaint(null);
      });
      const fallback = await capture(page, `slot-${index}-fallback`);
      expect(difference(actual, fallback).changedChannels).toBeGreaterThan(50);
      await page.evaluate(() => { const p = (window as any).__terrainGrassProbe, v = (window as any).__terrainGrassView; v.grass.setTerrainPaint(p.paint); v.setTexturesEnabled(false); });
      const off = await capture(page, `slot-${index}-textures-off`); expect(off.equals(fallback)).toBe(true);
      await page.evaluate(() => (window as any).__terrainGrassView.setTexturesEnabled(true));
      expect((await capture(page, `slot-${index}-restored`)).equals(actual)).toBe(true);
    }
    report.comparisons = comparisons;
    // A normal renderer adoption patches the actual terrain atlas at the same
    // world cell/tick. This is a prepared presentation edit, not played farming.
    const patch = await page.evaluate(() => {
      const p = (window as any).__terrainGrassProbe, v = (window as any).__terrainGrassView, s = p.slots[0]; p.slot = s;
      p.paintData = p.paint.image.data;
      const i = s.z * p.chart.width + s.x; p.chart = { ...p.chart, tiles: [...p.chart.tiles] };
      p.chart.tiles[i] = { ...p.chart.tiles[i], terrain: p.chart.tiles[i].terrain === 'soil' ? 'rich-soil' : 'soil' };
      v.setWorld(p.chart, false, 0); return { before: s.rgb, after: p.sample(s.root), tick: p.chart.tick,
        sameTexture: v.grass.terrainPaint.value === p.paint, samePixels: p.paint.image.data === p.paintData };
    });
    report.patch = patch; expect(patch.sameTexture).toBe(true); expect(patch.samePixels).toBe(true); expect(patch.after).not.toEqual(patch.before);
    const patched = await capture(page, 'same-root-patched-soil');
    await page.evaluate((rgb: number[]) => {
      const p = (window as any).__terrainGrassProbe, g = (window as any).__terrainGrassView.grass;
      p.reference = p.originalMaterial.clone(); p.reference.colorNode = p.vec3(...rgb); g.mesh.material = p.reference;
    }, patch.after);
    expect(difference(patched, await capture(page, 'patched-soil-cpu-reference')).maxChannel).toBeLessThanOrEqual(2);
    await page.evaluate(() => {
      const p = (window as any).__terrainGrassProbe, v = (window as any).__terrainGrassView, s = p.slot;
      v.grass.mesh.material = p.originalMaterial; p.reference.dispose();
      const i = s.z * p.chart.width + s.x; p.chart = { ...p.chart, tiles: [...p.chart.tiles] };
      p.chart.tiles[i] = { ...p.chart.tiles[i], floor: 'wood-planks' };
      v.setWorld(p.chart, false, 0);
      // Do not hide the draw: the product's actual coverage mask must collapse it.
    });
    const covered = await capture(page, 'floor-covered-root');
    await page.evaluate(() => (window as any).__terrainGrassProbe.blocked = true);
    const empty = await capture(page, 'empty-draw-control'); expect(covered.equals(empty)).toBe(true);
    const restoredState = await page.evaluate(() => {
      const p = (window as any).__terrainGrassProbe, v = (window as any).__terrainGrassView, s = p.slot;
      p.blocked = false; const i = s.z * p.chart.width + s.x; p.chart = { ...p.chart, tiles: [...p.chart.tiles] };
      p.chart.tiles[i] = structuredClone(p.originalTile);
      v.setWorld(p.chart, false, 0); return { tick: p.chart.tick, sameTexture: v.grass.terrainPaint.value === p.paint, rgb: p.sample(s.root) };
    });
    const restored = await capture(page, 'soil-restored-same-root'); expect(restored.equals(empty)).toBe(false);
    expect(restoredState.tick).toBe(initial.tick); expect(restoredState.sameTexture).toBe(true); expect(restoredState.rgb).toEqual(initial.slots[0].rgb);
    report.restored = restoredState;
    report.runtime = await page.evaluate(() => {
      const p = (window as any).__terrainGrassProbe, v = (window as any).__terrainGrassView;
      const info = v.renderer.getContext().getConfiguration()?.device?.adapterInfo;
      return { backend: v.backend, userAgent: navigator.userAgent,
        adapter: info ? { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description } : null,
        pipelines: p.pipelines, gpuErrors: p.gpuErrors,
        grassShaderCodes: p.shaders.filter((code: string) => code.includes('groundGrassColour')) };
    });
    expect(report.runtime.pipelines.length).toBeGreaterThan(0);
    expect(report.runtime.grassShaderCodes.length).toBeGreaterThan(0);
    for (const pipeline of report.runtime.pipelines) { expect(pipeline.vertexBuffers).toBeLessThanOrEqual(8); expect(pipeline.vertexAttributes).toBeLessThanOrEqual(16); }
    expect(report.runtime.gpuErrors).toEqual([]); expect(errors).toEqual([]); expect(requests).toEqual([]); await expectWorld(page, prepared);
  } finally {
    await writeTestFile('artifacts/terrain-grass-v200-native.json', JSON.stringify({ ...report, errors, requests }, null, 2)); await browser.close();
  }
});
