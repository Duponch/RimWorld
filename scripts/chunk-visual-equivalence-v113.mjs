import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

/**
 * Two frozen production builds, identical except the candidate's render chunk
 * size. Run only after source edits and other native/CPU measurements stop.
 * The same saved world is fed to both builds; no test code enters the product.
 */
const root = process.cwd(), baselineCommit = '9f840a8';
const diagnostic = process.argv.includes('--diagnose');
const aa = process.argv.includes('--aa');
const nodeModules = resolve('node_modules'), vite = resolve('node_modules/vite/bin/vite.js');
assert.ok(existsSync(nodeModules) && existsSync(vite), 'Install project dependencies first.');
if (!aa) assert.match(readFileSync('src/world/scale.ts', 'utf8'), /chunkSize:\s*64\b/, 'Candidate must use chunkSize 64.');
mkdirSync(resolve('tmp'), { recursive: true });
mkdirSync(resolve('artifacts'), { recursive: true });
const work = mkdtempSync(resolve('tmp/chunk-visual-v113-'));
const baseline = join(work, 'baseline'), candidate = join(work, 'candidate');
mkdirSync(baseline); mkdirSync(candidate);
const paths = ['src', 'public', 'index.html', 'navigation.html', 'package.json', 'vite.config.ts'];
const archive = spawnSync('git', ['archive', '--format=tar', baselineCommit, ...paths],
  { cwd: root, maxBuffer: 64 * 1024 * 1024 });
if (archive.status !== 0) throw new Error(`Cannot archive ${baselineCommit}: ${archive.error?.message ?? archive.stderr?.toString()}`);
const tar = join(work, 'baseline.tar');
writeFileSync(tar, archive.stdout);
execFileSync('tar', ['-xf', tar, '-C', baseline], { stdio: 'inherit' });
for (const path of paths) cpSync(aa ? join(baseline, path) : resolve(path), join(candidate, path), { recursive: true });
for (const dir of [baseline, candidate]) symlinkSync(nodeModules, join(dir, 'node_modules'), 'junction');
const candidateDigest = createHash('sha256')
  .update(readFileSync(join(candidate, 'src/world/scale.ts')))
  .update(readFileSync(join(candidate, 'src/render/TerrainLayer.ts')))
  .update(readFileSync(join(candidate, 'src/render/ResourceLayer.ts')))
  .digest('hex');

const probe = `
window.__chunkVisual={view:null};
const visualFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(t){window.__chunkVisual.view=this;return visualFrame.call(this,t);};
`;
for (const dir of [baseline, candidate]) {
  const main = join(dir, 'src/main.ts');
  writeFileSync(main, probe + readFileSync(main, 'utf8') + '\nwindow.__chunkVisual.client=client;window.__chunkVisual.session=session;\n');
  execFileSync(process.execPath, [vite, 'build'], { cwd: dir, stdio: 'inherit', maxBuffer: 8 * 1024 * 1024 });
}
const servers = [];
const serve = (dir, port) => {
  const child = spawn(process.execPath, [vite, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  child.stdout.on('data', data => { output += data.toString(); });
  child.stderr.on('data', data => { output += data.toString(); });
  servers.push(child);
  return { url: `http://127.0.0.1:${port}`, output: () => output };
};
const sites = { V112: serve(baseline, 5183), V113: serve(candidate, 5184) };
const ready = async site => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(site.url)).ok) return; } catch { /* server starting */ }
    await new Promise(done => setTimeout(done, 500));
  }
  throw new Error(`Preview not ready: ${site.output()}`);
};

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('playwright');
const report = {
  date: new Date().toISOString(), baselineCommit, candidateDigest, work, aa,
  protocol: 'Frozen production builds, native Chromium WebGPU, 1920x1080, same migrated mixed-100 save, paused at the same tick. Chunk 16 vs 64: first frame, direct pan/orbit, cross 7 px/cell into distant LOD and return above 9 px/cell into detailed LOD, growth, mined rock, foliage switch, real session reload and changed solar pose. Pixel comparison includes actual shadows. No simulation claim: growth/mining are controlled world presentation mutations, not jobs performed by the worker. Geometry counts and state are checked alongside images.',
  cases: [], errors: [], targets: null, adapter: null,
};
const images = new Map(), serversReady = Promise.all(Object.values(sites).map(ready));
const specs = [
  'initial', 'pan-first', 'pan-next', 'orbit-first', 'lod-far-first', 'lod-near-first',
  'growth', 'growth-later', 'mined', 'foliage-hidden', 'foliage-restored',
  'reload-first', 'reload-pan', 'sun-shift',
].filter(spec => !diagnostic && !aa || ['initial', 'pan-first', 'pan-next', 'orbit-first'].includes(spec));
let browser;
try {
  await serversReady;
  browser = await chromium.launch({ channel: 'chromium', headless: false });
  let sharedSave;
  for (const version of ['V112', 'V113']) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('pageerror', error => report.errors.push(`${version}: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error' || /GPUValidationError|invalid pipeline/i.test(message.text()))
        report.errors.push(`${version}: ${message.text()}`);
    });
    try {
      await page.goto(sites[version].url + '/?e2e');
      await page.evaluate(async () => localStorage.setItem('lisiere.save.v1',
        await (await fetch('/test-saves/v98/mixed-100.json')).text()));
      await page.locator('.front-menu').getByRole('button', { name: /^Charger/ }).click();
      await page.locator('input[name="front-save"][value="lisiere.save.v1"]').check();
      await page.locator('.front-menu').getByRole('button', { name: 'Charger', exact: true }).click();
      await page.waitForFunction(() => window.__chunkVisual.view?.world?.pawns.length === 104
        && !window.__chunkVisual.view.preparing, undefined, { timeout: 60_000 });
      if (sharedSave) await page.evaluate(save => window.__chunkVisual.client.load(save), sharedSave);
      await page.evaluate(() => window.__chunkVisual.client.setSpeed(0));
      if (!sharedSave) sharedSave = await page.evaluate(() => window.__chunkVisual.client.save());
      const setup = await page.evaluate(() => {
        const b = window.__chunkVisual, v = b.view, w = v.world;
        if (v.backend !== 'WebGPU' || v.rig.mode !== 'orthographic') throw Error('Native WebGPU orthographic renderer required.');
        v.renderer.setAnimationLoop(null);
        v.hasTracks = false; v.snapshotDuration = 0; v.timeFrom = v.timeTo;
        v.controls.enableDamping = false; v.controls.update();
        v.hover.visible = false;
        const target = { x: (w.width - 1) / 2, z: (w.height - 1) / 2 };
        const distance = r => (r.x - target.x) ** 2 + (r.z - target.z) ** 2;
        const tree = w.resources.filter(r => r.kind === 'tree').sort((a, c) => distance(a) - distance(c))[0];
        const rocks = [];
        for (let i = 0; i < w.tiles.length; i++) if (w.tiles[i].terrain === 'rock') {
          const x = i % w.width, z = Math.floor(i / w.width);
          rocks.push({ i, x, z, d: (x - target.x) ** 2 + (z - target.z) ** 2 });
        }
        rocks.sort((a, c) => a.d - c.d);
        if (!tree || !rocks.length) throw Error('Reference world lacks tree or mineable rock.');
        b.original = structuredClone(w);
        b.save = null;
        b.target = target;
        b.offset = [v.camera.position.x - v.controls.target.x,
          v.camera.position.y - v.controls.target.y,
          v.camera.position.z - v.controls.target.z];
        b.treeId = tree.id; b.rock = rocks[0];
        const info = v.renderer.getContext().getConfiguration().device.adapterInfo;
        return { world: { tick: w.tick, rng: w.rng, width: w.width, height: w.height,
          pawns: w.pawns.length, resources: w.resources.length, schema: w.schemaVersion },
          treeId: b.treeId, rock: b.rock, adapter: { vendor: info.vendor, architecture: info.architecture, description: info.description } };
      });
      await page.evaluate(save => { window.__chunkVisual.save = save; }, sharedSave);
      if (version === 'V112') { report.targets = setup; report.adapter = setup.adapter; }
      else assert.deepEqual(setup, report.targets, 'Both builds must start from the same world and GPU.');

      for (const spec of specs) {
        const reference = version === 'V113' ? images.get(spec) : null;
        const captured = await page.evaluate(async ({ spec, reference, diagnostic }) => {
          const b = window.__chunkVisual; let v = b.view;
          const pose = (name, zoom = .23) => {
            const o = b.offset, t = b.target;
            const dx = name === 'pan' ? 15 : 0, dz = name === 'pan' ? -9 : 0;
            const angle = name === 'orbit' ? .42 : 0, c = Math.cos(angle), s = Math.sin(angle);
            v.controls.target.set(t.x + dx, 0, t.z + dz);
            v.camera.position.set(t.x + dx + o[0] * c + o[2] * s,
              o[1], t.z + dz + o[2] * c - o[0] * s);
            v.camera.zoom = zoom; v.camera.updateProjectionMatrix(); v.controls.update();
          };
          if (spec === 'initial') pose('base');
          if (spec === 'pan-first') pose('pan');
          if (spec === 'orbit-first') pose('orbit');
          if (spec === 'lod-far-first') pose('orbit', .20);
          if (spec === 'lod-near-first') pose('orbit', .30);
          if (spec === 'growth') {
            const w = structuredClone(v.world), r = w.resources.find(r => r.id === b.treeId);
            r.species = 'pine'; r.growth = .2; r.growthTick = w.tick;
            v.applyWorld(w, true); pose('base');
          }
          if (spec === 'growth-later') {
            const w = structuredClone(v.world), r = w.resources.find(r => r.id === b.treeId);
            r.growth = .8; r.growthTick = w.tick;
            v.applyWorld(w, true); pose('base');
          }
          if (spec === 'mined') {
            const w = structuredClone(v.world);
            w.tiles[b.rock.i].terrain = 'rough-stone'; delete w.tiles[b.rock.i].ore;
            w.resources = w.resources.filter(r => !(r.kind === 'rock' && r.x === b.rock.x && r.z === b.rock.z));
            v.applyWorld(w, true); pose('base');
          }
          if (spec === 'foliage-hidden') v.setFoliageVisible(false);
          if (spec === 'foliage-restored') v.setFoliageVisible(true);
          if (spec === 'reload-first') {
            await b.session.load('lisiere.save.v1');
            v = b.view;
            if (v.world.resources.find(r => r.id === b.treeId)?.species !==
                b.original.resources.find(r => r.id === b.treeId)?.species)
              throw Error('Reload did not restore original resource presentation.');
            v.hasTracks = false; v.snapshotDuration = 0; v.timeFrom = v.timeTo;
            pose('base');
          }
          if (spec === 'reload-pan') pose('pan');
          if (spec === 'sun-shift') {
            const w = structuredClone(v.world); w.tick += 1000;
            v.applyWorld(w, true); pose('base');
          }
          v.frame(performance.now());
          await v.renderer.getContext().getConfiguration().device.queue.onSubmittedWorkDone();
          const png = v.renderer.domElement.toDataURL('image/png');
          const measure = group => {
            let vertices = 0, indices = 0, shadowIndices = 0, meshes = 0;
            const residentPositions = new Set();
            group.traverse(object => {
              if (!object.isMesh) return;
              const g = object.geometry, count = g.index?.count ?? g.getAttribute('position')?.count ?? 0;
              const active = Math.min(count, g.drawRange.count);
              const instances = object.isInstancedMesh ? object.count : g.isInstancedBufferGeometry ? g.instanceCount : 1;
              const position = g.getAttribute('position');
              if (position && !residentPositions.has(position)) {
                vertices += position.count * instances;
                residentPositions.add(position);
              }
              indices += active * instances;
              if (object.castShadow) shadowIndices += active * instances;
              meshes++;
            });
            return { vertices, indices, shadowIndices, meshes };
          };
          const footprint = Object.fromEntries([
            ['terrain', v.terrainGroup], ['resources', v.resourceGroup],
            ['rocks', v.rocks.group], ['plants', v.plants.group], ['overview', v.overview.group],
          ].map(([name, group]) => [name, measure(group)]));
          let difference = null;
          if (reference) {
            const images = await Promise.all([reference, png].map(async url => {
              const image = new Image(); image.src = url; await image.decode(); return image;
            }));
            if (images[0].width !== images[1].width || images[0].height !== images[1].height)
              throw Error('Image dimensions changed.');
            const canvas = document.createElement('canvas');
            canvas.width = images[0].width; canvas.height = images[0].height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const values = images.map(image => {
              ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0);
              return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            });
            let changedPixels = 0, maxChannelDifference = 0, channelDifferenceTotal = 0;
            for (let i = 0; i < values[0].length; i += 4) {
              let changed = false;
              for (let c = 0; c < 4; c++) {
                const delta = Math.abs(values[0][i + c] - values[1][i + c]);
                changed ||= delta !== 0;
                maxChannelDifference = Math.max(maxChannelDifference, delta);
                channelDifferenceTotal += delta;
              }
              if (changed) changedPixels++;
            }
            difference = { changedPixels, maxChannelDifference, channelDifferenceTotal };
          }
          const variants = {};
          if (diagnostic && (spec === 'pan-next' || spec === 'orbit-first')) {
            const capture = async () => {
              v.frame(performance.now());
              await v.renderer.getContext().getConfiguration().device.queue.onSubmittedWorkDone();
              return v.renderer.domElement.toDataURL('image/png');
            };
            const groups = { terrain: v.terrainGroup, resources: v.resourceGroup,
              rocks: v.rocks.group, plants: v.plants.group };
            for (const [name, group] of Object.entries(groups)) {
              const visible = [], culling = [];
              group.traverse(object => {
                if (!object.isMesh) return;
                visible.push([object, object.visible]); object.visible = false;
              });
              variants[`hide-${name}`] = await capture();
              for (const [object, old] of visible) object.visible = old;
              group.traverse(object => {
                if (!object.isMesh) return;
                culling.push([object, object.frustumCulled]); object.frustumCulled = false;
              });
              variants[`uncull-${name}`] = await capture();
              for (const [object, old] of culling) object.frustumCulled = old;
            }
          }
          return { png, variants, difference, footprint,
            camera: { position: v.camera.position.toArray(), quaternion: v.camera.quaternion.toArray(),
              target: v.controls.target.toArray(), zoom: v.camera.zoom,
              pixelsPerCell: v.rig.pixelsPerCell(1080), overview: v.overview.group.visible },
            light: { position: v.daylight.light.position.toArray(),
              target: v.daylight.light.target.position.toArray(), intensity: v.daylight.light.intensity },
            world: { tick: v.world.tick, rng: v.world.rng, resources: v.world.resources.length,
              rock: v.world.tiles[b.rock.i].terrain, treeGrowth: v.world.resources.find(r => r.id === b.treeId)?.growth } };
        }, { spec, reference, diagnostic });
        const { png, variants, ...data } = captured;
        if (diagnostic) for (const [variant, source] of Object.entries(variants))
          writeFileSync(resolve(`artifacts/chunk-visual-v113-${spec}-${version}-${variant}.png`),
            Buffer.from(source.split(',')[1], 'base64'));
        if (version === 'V112') images.set(spec, png);
        else {
          const original = report.cases.find(row => row.spec === spec && row.version === 'V112');
          assert.ok(original);
          for (const layer of ['terrain', 'resources', 'rocks', 'plants', 'overview'])
            assert.deepEqual(
              Object.fromEntries(Object.entries(data.footprint[layer]).filter(([key]) => key !== 'meshes')),
              Object.fromEntries(Object.entries(original.footprint[layer]).filter(([key]) => key !== 'meshes')),
              `${spec}: ${layer} geometry changed`);
          assert.deepEqual(data.camera, original.camera, `${spec}: camera differs`);
          assert.deepEqual(data.light, original.light, `${spec}: shadows/light pose differs`);
          assert.deepEqual(data.world, original.world, `${spec}: presentation world differs`);
          if (data.difference.changedPixels) {
            for (const [suffix, source] of [['v112', images.get(spec)], ['v113', png]])
              writeFileSync(resolve(`artifacts/chunk-visual-v113-${spec}-${suffix}.png`),
                Buffer.from(source.split(',')[1], 'base64'));
          }
        }
        report.cases.push({ version, spec, ...data,
          imageHash: createHash('sha256').update(Buffer.from(png.split(',')[1], 'base64')).digest('hex') });
        console.log(JSON.stringify({ version, spec, changedPixels: data.difference?.changedPixels ?? null }));
      }
    } finally { await page.close(); }
  }
  const mismatches = report.cases.filter(row => row.version === 'V113' && row.difference.changedPixels !== 0);
  assert.deepEqual(report.errors, []);
  assert.equal(report.cases.length, specs.length * 2);
  if (!diagnostic && !aa) for (const version of ['V112', 'V113']) {
    const caseFor = spec => report.cases.find(row => row.version === version && row.spec === spec);
    assert.equal(caseFor('lod-far-first').camera.overview, true, `${version}: distant LOD not entered`);
    assert.equal(caseFor('lod-near-first').camera.overview, false, `${version}: detailed LOD not restored`);
    assert.equal(caseFor('growth').camera.overview, false, `${version}: growth did not render in detailed LOD`);
    report[`${version}IntraBuild`] = {
      repeatedPanPixelEqual: caseFor('pan-first').imageHash === caseFor('pan-next').imageHash,
      reloadMatchesInitialPixels: caseFor('reload-first').imageHash === caseFor('initial').imageHash,
    };
  }
  if (!diagnostic && !aa) assert.equal(report.V113IntraBuild.repeatedPanPixelEqual, true,
    'Candidate repeated unchanged camera did not stabilize');
  if (!diagnostic) assert.deepEqual(mismatches.map(row => ({ spec: row.spec, ...row.difference })), [],
    'Chunk size changed at least one rendered pixel; inspect saved pair.');
} finally {
  if (browser) await browser.close();
  for (const child of servers) child.kill();
  writeFileSync(resolve(`artifacts/chunk-visual-v113${diagnostic ? '-diagnostic' : aa ? '-aa' : ''}.json`),
    JSON.stringify(report, null, 2) + '\n');
}
