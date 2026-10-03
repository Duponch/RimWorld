import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import { expectWorld, observeErrors, panel, pause, saveKey } from './helpers.ts';
import { testOutputPath, writeTestFile } from '../test-output.ts';

// Prepared renderer diagnostic. The original save/worker is untouched; only
// grass receives a clone with one existing physical blood record at tick0.
// Its real shader is submitted one stable slot at a time via existing ranges.
const hook = `const v200Frame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=v200Frame.apply(this,args);
 if(!this.preparing){window.__v200View=this;const p=window.__v200Probe;
  if(p?.scene){const g=this.grass,s=p.slot;
   g.baseInstances.value=0;g.nearInstances.value=0;
   g.slotsPerCell.value=s.slot;g.nearSlotsPerCell.value=0;g.foregroundSlotsPerCell.value=1;
   g.foregroundGridOrigin.value.set(s.x,s.z);g.foregroundGridWidth.value=1;
   g.zoomVisibility.value=1;g.bandView.value.set(0,0,0,0);g.bandLimits.value.set(1000,1,1000,1);
   g.windStrength.value=0;g.mesh.visible=true;g.mesh.geometry.instanceCount=1;
   this.renderer.render(p.scene,p.camera);
  }
 }return result;};`;
const settled = (page: Page) => page.evaluate(() => new Promise<void>(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
async function capture(page: Page, name: string) {
  await settled(page);
  const path = testOutputPath(`artifacts/grass-footprint-v200-${name}.png`);
  const pixels = await page.getByTestId('world-canvas').screenshot({ path });
  await test.info().attach(name, { path, contentType: 'image/png' });
  return pixels;
}

test('V200 native WebGPU grass follows actual decal alpha within a cell and across its border', async ({ playwright }) => {
  test.setTimeout(90_000);
  const prepared = deserializeWorld(readFileSync('public/test-saves/v196/sang-depouilles-douleur.json', 'utf8'));
  expect(validateWorld(prepared)).toEqual([]);
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: true, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page), requests: string[] = [];
  page.on('requestfailed', request => requests.push(`${request.url()}: ${request.failure()?.errorText}`));
  let report: any = { prepared: true, renderOnly: true, performance: 'No benchmark or general GPU/CPU claim.' };
  try {
    await page.addInitScript(({ key, save }) => {
      localStorage.setItem(key, save);
      localStorage.setItem('lisiere.presentation.textures.v1', 'true');
      localStorage.setItem('lisiere.presentation.ground-grass.v1', 'true');
      const p = { pipelines: [] as any[], uploads: [] as any[], gpuErrors: [] as string[] };
      (window as any).__v200Probe = p;
      const proto = (globalThis as any).GPUDevice?.prototype;
      if (!proto) return;
      for (const name of ['createRenderPipeline', 'createRenderPipelineAsync']) {
        const original = proto[name];
        proto[name] = function (d: any) {
          const buffers = (d.vertex.buffers ?? []).filter(Boolean);
          p.pipelines.push({ label: d.label, vertexBuffers: buffers.length,
            vertexAttributes: buffers.reduce((sum: number, b: any) => sum + b.attributes.length, 0) });
          return Reflect.apply(original, this, [d]);
        };
      }
      const createQueue = (globalThis as any).GPUQueue?.prototype;
      if (createQueue) {
        const write = createQueue.writeTexture;
        createQueue.writeTexture = function (...args: any[]) {
          p.uploads.push({ bytes: args[1]?.byteLength ?? null, extent: args[3] });
          return Reflect.apply(write, this, args);
        };
      }
      const create = (globalThis as any).GPUAdapter?.prototype;
      if (create) {
        const request = create.requestDevice;
        create.requestDevice = async function (...args: any[]) {
          const device = await Reflect.apply(request, this, args) as any;
          device.addEventListener('uncapturederror', (event: any) => p.gpuErrors.push(String(event.error)));
          return device;
        };
      }
    }, { key: saveKey, save: serializeWorld(prepared) });
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: hook + await response.text() });
    });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0); await pause(page);
    await panel(page, 'menu'); await page.locator('#load').click();
    await expectWorld(page, prepared); await page.keyboard.press('Escape');
    await page.waitForFunction(() => Boolean((window as any).__v200View?.world));
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');

    const candidates = await page.evaluate(async () => {
      const v = (window as any).__v200View, p = (window as any).__v200Probe;
      const path = '/src/render/filth-appearance.ts';
      const { createFilthAtlas, filthDecal, FILTH_ATLAS } = await import(path);
      const atlas = createFilthAtlas(), size = FILTH_ATLAS.tileSize;
      // Independent inverse-quad/bilinear oracle over the actual full atlas.
      // Do not call the product bloodDecalAlpha or inspect mask to choose roots.
      const alpha = (d: any, x: number, z: number): number => {
        const angle = Math.fround(d.rotation), c = Math.cos(angle), s = Math.sin(angle);
        const dx = x - Math.fround(d.x), dz = z - Math.fround(d.z);
        let u = (c * dx + s * dz) / Math.fround(d.width) + .5;
        const vv = (c * dz - s * dx) / Math.fround(d.height) + .5;
        if (d.flip) u = 1 - u;
        if (u <= 0 || vv <= 0 || u >= 1 || vv >= 1) return 0;
        const px = u * size - .5, py = vv * size - .5, ix = Math.floor(px), iy = Math.floor(py);
        const a = (xx: number, yy: number) => {
          const tx = (d.tile % FILTH_ATLAS.columns) * size + Math.max(0, Math.min(size - 1, xx));
          const ty = Math.floor(d.tile / FILTH_ATLAS.columns) * size + Math.max(0, Math.min(size - 1, yy));
          return atlas.data[(ty * atlas.width + tx) * 4 + 3] / 255;
        };
        const fx = px - ix, fy = py - iy;
        return a(ix, iy) * (1 - fx) * (1 - fy) + a(ix + 1, iy) * fx * (1 - fy) +
          a(ix, iy + 1) * (1 - fx) * fy + a(ix + 1, iy + 1) * fx * fy;
      };
      // The pinned Three r186 PCG hash independently reconstructs vertex roots.
      const root = (x: number, z: number, slot: number) => {
        const key = (Math.imul(x, 73856093) ^ Math.imul(z, 19349663) ^ Math.imul(slot, 83492791)) >>> 0;
        const h = (k: number) => {
          const state = (Math.imul(k, 747796405) + 2891336453) >>> 0;
          const word = Math.imul((state >>> ((state >>> 28) + 4)) ^ state, 277803737) >>> 0;
          return Math.fround(Math.fround(((word >>> 22) ^ word) >>> 0) / 2 ** 32);
        };
        const offset = (k: number) => Math.fround(Math.fround(h(k) * Math.fround(.96)) - Math.fround(.48));
        return [Math.fround(x + offset(key)), Math.fround(z + offset((key + 11) >>> 0))];
      };
      for (const f of v.world.filth.items.filter((f: any) => f.kind === 'blood')) {
        const ds = Array.from({ length: f.thickness }, (_, i) => filthDecal(f, i)), rows: any[] = [];
        for (let z = f.z - 1; z <= f.z + 1; z++) for (let x = f.x - 1; x <= f.x + 1; x++) {
          if (x < 0 || z < 0 || x >= v.world.width || z >= v.world.height || !v.grass.map.image.data[(z * v.world.width + x) * 4 + 3]) continue;
          for (let slot = 0; slot < 224; slot++) {
            const [rx, rz] = root(x, z, slot), clear = ds.reduce((n: number, d: any) => n * (1 - alpha(d, rx, rz)), 1);
            rows.push({ x, z, slot, root: [rx, rz], alpha: 1 - clear });
          }
        }
        const inside = rows.find(r => r.x === f.x && r.z === f.z && r.alpha > .45);
        const outside = rows.find(r => r.x === f.x && r.z === f.z && r.alpha === 0);
        const border = rows.find(r => (r.x !== f.x || r.z !== f.z) && r.alpha > .1);
        if (!inside || !outside || !border) continue;
        const chart = structuredClone(v.world); chart.filth.items = [structuredClone(f)];
        v.grass.update(chart, true); p.chart = chart;
        const errors = rows.flatMap(r => {
          const word = v.grass.bloodMap.image.data[(r.z * chart.width + r.x) * 14 + (r.slot >>> 4)];
          const value = (word >>> ((r.slot & 15) * 2)) & 3, expected = Math.min(3, Math.ceil(r.alpha * 3 / .8));
          return value === expected ? [] : [{ ...r, value, expected }];
        });
        const mapBytes = v.grass.map.image.data.byteLength, bloodBytes = v.grass.bloodMap.image.data.byteLength;
        return { record: f, inside, outside, border, checkedRoots: rows.length, mismatches: errors,
          tick: chart.tick, mapBytes, bloodBytes, bloodDimensions: [v.grass.bloodMap.image.width, v.grass.bloodMap.image.height] };
      }
      throw new Error('Prepared scene has no exposed same-cell inside/outside pair and adjacent alpha footprint.');
    });
    report.candidates = candidates;
    expect(candidates.mismatches).toEqual([]);
    expect(candidates.bloodBytes).toBe(prepared.width * prepared.height * 56);
    expect(candidates.inside.x).toBe(candidates.outside.x);
    expect(candidates.inside.z).toBe(candidates.outside.z);

    // Keep the real ground decal visible for the witness before draw isolation.
    const witness = await page.evaluate((f: any) => {
      const v = (window as any).__v200View; v.controls.enableDamping = false;
      v.controls.maxZoom = 30; v.rig.setMode('orthographic');
      v.controls.target.set(f.x, .2, f.z); v.camera.position.set(f.x + 4, 6, f.z + 5);
      v.camera.zoom = 12; v.camera.updateProjectionMatrix(); v.controls.update();
      v.invalidatePausedShadow();
      return { visible: v.hygiene.filth.mesh.visible, instances: v.hygiene.filth.mesh.geometry.instanceCount };
    }, candidates.record);
    expect(witness.visible).toBe(true); expect(witness.instances).toBeGreaterThan(0); report.groundWitness = witness;
    await capture(page, 'real-ground-decal-witness');
    await page.addStyleTag({ content: 'body * { visibility:hidden !important } [data-testid="world-canvas"] { visibility:visible !important }' });
    await page.evaluate((f: any) => (window as any).__v200Record = f, candidates.record);
    await page.evaluate(async () => {
      const path = '/node_modules/.vite/deps/three_webgpu.js', THREE = await import(path);
      const p = (window as any).__v200Probe, v = (window as any).__v200View;
      v.grass.setTerrainPaint(null); // This test isolates the blood footprint.
      p.scene = new THREE.Scene(); p.scene.background = new THREE.Color(0xffffff);
      p.scene.add(v.grass.mesh); v.grass.mesh.receiveShadow = false;
      p.scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(3, 8, 4); p.scene.add(light);
      p.camera = new THREE.OrthographicCamera(-.55, .55, .38, -.38, .1, 100);
      p.slot = { x: 8, z: 23, slot: 0 };
    });
    const pixelPairs: any[] = [];
    for (const kind of ['inside', 'outside', 'border'] as const) {
      const sample = candidates[kind];
      await page.evaluate((s: any) => {
        const p = (window as any).__v200Probe, v = (window as any).__v200View;
        p.slot = s; p.camera.position.set(s.root[0] + 1, 1.1, s.root[1] + 1.5);
        p.camera.lookAt(s.root[0], .17, s.root[1]); p.camera.updateMatrixWorld();
        p.chart.filth.items = [structuredClone((window as any).__v200Record)]; v.grass.update(p.chart);
      }, sample);
      const stained = await capture(page, `${kind}-textures-on`);
      await page.evaluate(() => (window as any).__v200View.setTexturesEnabled(false));
      const off = await capture(page, `${kind}-textures-off`);
      await page.evaluate(() => { const v = (window as any).__v200View; v.setTexturesEnabled(true); v.grass.setTerrainPaint(null); });
      const restored = await capture(page, `${kind}-textures-restored`);
      expect(restored.equals(stained)).toBe(true);
      const cleaned = await page.evaluate(() => {
        const p = (window as any).__v200Probe, g = (window as any).__v200View.grass;
        const tick = p.chart.tick; p.chart.filth.items.length = 0; g.update(p.chart);
        const versions = [g.map.version, g.bloodMap.version]; g.update(p.chart);
        return { tick, afterTick: p.chart.tick, versions, stableVersions: [g.map.version, g.bloodMap.version],
          hasWords: g.bloodMap.image.data.some((word: number) => word !== 0) };
      });
      const clean = await capture(page, `${kind}-cleaned-same-tick`);
      const changed = !stained.equals(clean), offChanged = !stained.equals(off);
      pixelPairs.push({ kind, sample, changed, offChanged, restored: restored.equals(stained), cleaned });
      expect(changed, `${kind} shader pigment`).toBe(kind !== 'outside');
      expect(offChanged, `${kind} texture switch`).toBe(kind !== 'outside');
      expect(off.equals(clean)).toBe(true);
      expect(cleaned.tick).toBe(cleaned.afterTick); expect(cleaned.hasWords).toBe(false);
      expect(cleaned.stableVersions).toEqual(cleaned.versions);
    }
    report.pixelPairs = pixelPairs;
    report.runtime = await page.evaluate(() => {
      const p = (window as any).__v200Probe, v = (window as any).__v200View;
      const device = v.renderer.getContext().getConfiguration()?.device;
      const info = device?.adapterInfo;
      return { backend: v.backend, userAgent: navigator.userAgent,
        adapter: info ? { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description } : null,
        pipelines: p.pipelines, uploads: p.uploads, gpuErrors: p.gpuErrors,
        workerTick: window.__lisiere.world.tick, preparedTick: p.chart.tick };
    });
    expect(report.runtime.pipelines.length).toBeGreaterThan(0);
    expect(report.runtime.uploads.some((upload: any) => upload.bytes === candidates.bloodBytes)).toBe(true);
    for (const pipeline of report.runtime.pipelines) {
      expect(pipeline.vertexBuffers, pipeline.label).toBeLessThanOrEqual(8);
      expect(pipeline.vertexAttributes, pipeline.label).toBeLessThanOrEqual(16);
    }
    expect(report.runtime.gpuErrors).toEqual([]); expect(errors).toEqual([]); expect(requests).toEqual([]);
    await expectWorld(page, prepared);
  } finally {
    await writeTestFile('artifacts/grass-footprint-v200-native.json', JSON.stringify({ ...report, errors, requests }, null, 2));
    await browser.close();
  }
});
