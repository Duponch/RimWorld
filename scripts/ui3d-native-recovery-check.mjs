// ROOT only, after the active performance run. Never edits sources or starts a
// server. The appended DEV hook loads through the actual GameSession path;
// recovery itself is activated by a physical native-mesh pointer click.
// node scripts/ui3d-native-recovery-check.mjs [--device-loss] [--origin=http://127.0.0.1:5196]
import {chromium} from '@playwright/test';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
for (const arg of args) if (arg !== '--device-loss' && !/^--(origin|browser)=/.test(arg)) throw Error(`Unknown argument: ${arg}`);
const option = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const origin = new URL(option('origin', 'http://127.0.0.1:5196'));
assert.ok(origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname), 'Use a private local DEV server.');
assert.ok(!['5173', '5184'].includes(origin.port), 'Human servers are excluded.');
const executablePath = resolve(root, option('browser', '.playwright/chromium-1243/chrome-win64/chrome.exe'));
const out = resolve(root, 'tmp/ui3d-v476', `native-recovery-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`);
await mkdir(out, {recursive: true});
const sha = value => createHash('sha256').update(value).digest('hex');
const savePath = resolve(root, 'public/test-saves/v419/les-eclaircies.json'), saveBytes = await readFile(savePath);
assert.equal(sha(saveBytes), '49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f', 'Original Éclaircies input changed.');
async function sourceFence() {
  const files = {};
  async function visit(folder) {
    for (const entry of (await readdir(folder, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files[relative(root, path).replaceAll('\\', '/')] = sha(await readFile(path));
      else throw Error(`Unexpected source entry ${path}`);
    }
  }
  await visit(resolve(root, 'src'));
  for (const name of ['index.html', 'package.json', 'package-lock.json', 'vite.config.ts']) files[name] = sha(await readFile(resolve(root, name)));
  return files;
}
const sources = await sourceFence();
const report = {protocol: 'native-ui-recovery-v476-1', out, origin: origin.href, created: new Date().toISOString(),
  input: {path: savePath, sha256: sha(saveBytes)}, driverSHA: sha(await readFile(fileURLToPath(import.meta.url))), sources,
  deviceLossRequested: args.includes('--device-loss'), phases: [], errors: [], pageErrors: [],
  limits: ['Controlled reportFailure is distinct from real GPUDevice.destroy; the optional second phase exercises the actual device-loss diagnostic.',
    'UI visibility is checked from native mesh diagnostics, native canvas visibility, screenshots and standalone render progress; there are no HTML recovery controls.',
    'The full acknowledged save is compared structurally and by serialized SHA; no subset World comparison substitutes for it.',
    'A real device loss may report expected device-loss errors. All messages are retained; unrelated errors fail qualification.']};
const persist = () => writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
const hook = String.raw`
const recoveryDevices=new Map();
const recoveryDevice=view=>{const context=view?.renderer.getContext();return context&&'getConfiguration'in context?context.getConfiguration()?.device:context};
window.__ui3dRecovery={
 get ready(){return !!window.__lisiere&&!session.busy&&!replacingWorld&&!presentationPreparation&&!graphicsRecovering},
 get healthy(){return !!renderer&&!renderer.fatalError&&!graphicsFault&&!simulationStopped&&!waitingRequests.size&&!frontMenu.isOpen()},
 load:data=>replaceColony(()=>session.loadExternal(async()=>data)),save:()=>session.exportSave(),
 remember:key=>{recoveryDevices.set(key,{view:renderer,device:recoveryDevice(renderer),target:nativeUi?.overlayCache.target});},
 identities:key=>{const old=recoveryDevices.get(key);return {hadDevice:!!old?.device,hadCache:!!old?.target,
   rendererChanged:old?.view!==renderer,deviceChanged:old?.device!==recoveryDevice(renderer),cacheTargetChanged:old?.target!==nativeUi?.overlayCache.target};},
 get state(){return {ui:nativeUi?.diagnostics(),incident:{simulationStopped,graphicsFault,graphicsRecovering,waiting:waitingRequests.size},
   hasRenderer:!!renderer,backend:renderer?.backend,speed:currentSpeed,tick:snapshot?.tick,
   standalone:!!nativeUi?.standalone,worldVisible:!!nativeUi?.worldVisible,frontVisible:!!nativeUi?.frontVisible};}
};
`;
let browser, page, timer, timedOut = false;
const started = performance.now(), budgetMs = 240000;
const remaining = () => Math.max(1, Math.floor(budgetMs - (performance.now() - started)));
await persist();
try {
  browser = await chromium.launch({executablePath, headless: false, args: ['--mute-audio', '--enable-unsafe-webgpu']});
  timer = setTimeout(() => {timedOut = true; void browser.close();}, remaining());
  report.browser = browser.version();
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1});
  await context.addInitScript(() => {
    for (const [key, value] of Object.entries({'lisiere.audio.effects.enabled.v1': 'false', 'lisiere.audio.music.enabled.v1': 'false',
      'lisiere.audio.effects.volume.v1': '0', 'lisiere.audio.music.volume.v1': '0', 'lisiere.autosave-minutes.v1': '0', 'lisiere.presentation.threat-pause.v1': 'never'})) localStorage.setItem(key, value);
  });
  page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(String(error)));
  page.on('console', message => {if (message.type() === 'error' || /GPUValidationError|device.*lost/i.test(message.text())) report.errors.push({phase: report.phases.at(-1)?.kind ?? 'startup', type: message.type(), message: message.text()});});
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch(), body = await response.text();
    for (const anchor of ['function replaceColony', 'void start().catch']) assert.ok(body.includes(anchor), `DEV Main anchor missing: ${anchor}`);
    report.servedMain = {originalSHA: sha(body), injectedSHA: sha(body + hook)};
    await route.fulfill({response, body: body + hook});
  });
  const url = new URL('/', origin); url.searchParams.set('e2e', '1'); url.searchParams.set('ui', 'native');
  await page.goto(url.href, {waitUntil: 'domcontentloaded', timeout: remaining()});
  await page.waitForFunction(() => window.__ui3dRecovery?.ready, null, {timeout: remaining()});
  await page.evaluate(data => window.__ui3dRecovery.load(data), saveBytes.toString('utf8'));
  await page.waitForFunction(() => window.__ui3dRecovery?.ready && window.__ui3dRecovery.healthy && window.__lisiere.backend === 'WebGPU' && window.__lisiere.speed === 0, null, {timeout: remaining()});
  assert.equal(await page.locator('button,select,dialog,input').count(), 0, 'No retained HTML controls in native mode.');
  const click = async id => {
    const control = await page.evaluate(id => window.__lisiere.nativeUi.controls.find(control => control.id === id && !control.disabled), id);
    assert.ok(control && Number.isFinite(control.x) && Number.isFinite(control.y), `Enabled native control missing: ${id}`);
    await page.mouse.click(control.x, control.y);
  };
  const work = await page.evaluate(() => window.__lisiere.nativeUi.management.find(control => control.id === 'work'));
  assert.ok(work); await page.mouse.click(work.x, work.y);
  await page.waitForFunction(() => window.__lisiere.nativeUi.page === 'work', null, {timeout: remaining()});
  await page.waitForFunction(() => window.__lisiere.nativeUi.cache.cacheRenders > 0 && window.__lisiere.nativeUi.overlayRenders > 0, null, {timeout: remaining()});
  const baseline = await page.evaluate(() => window.__ui3dRecovery.save());
  assert.equal(typeof baseline, 'string'); report.baseline = {sha256: sha(baseline), bytes: Buffer.byteLength(baseline)};
  await writeFile(resolve(out, 'before-save.json'), baseline);
  await page.screenshot({path: resolve(out, 'before.png')});

  async function recover(kind) {
    const row = {kind, started: new Date().toISOString(), before: await page.evaluate(() => window.__ui3dRecovery.state)};
    report.phases.push(row); await persist();
    assert.ok(row.before.ui.cache.cacheRenders > 0, 'An actual cached overlay must exist before failure.');
    await page.evaluate(key => window.__ui3dRecovery.remember(key), kind);
    if (kind === 'device-loss') assert.equal(await page.evaluate(() => window.__lisiere.loseGraphicsDevice()), true, 'The actual world device must be destroyed.');
    else await page.evaluate(() => window.__lisiere.failGraphics('Incident graphique de contrôle V476'));
    await page.waitForFunction(beforeRenders => {
      const state = window.__ui3dRecovery.state;
      return state.incident.graphicsFault && !state.incident.graphicsRecovering && !state.hasRenderer && state.standalone && !state.worldVisible
        && state.ui.page === 'native-incident' && state.ui.renders > beforeRenders && state.ui.controls.some(control => control.id === 'native-incident-retry' && !control.disabled);
    }, row.before.ui.renders, {timeout: remaining()});
    assert.equal(await page.locator('canvas[data-ui3d="native"]').isVisible(), true, 'The standalone native canvas must render recovery.');
    assert.equal(await page.locator('button,select,dialog,input').count(), 0);
    row.failed = await page.evaluate(() => window.__ui3dRecovery.state);
    await page.screenshot({path: resolve(out, `${kind}-incident.png`)});
    const paused = await page.evaluate(() => window.__ui3dRecovery.save());
    assert.deepEqual(JSON.parse(paused), JSON.parse(baseline), 'Failure must preserve the complete paused save.');
    assert.equal(sha(paused), report.baseline.sha256, 'Failure must preserve the exact serialized save.');
    await click('native-incident-retry');
    await page.waitForFunction(beforeCacheRenders => {
      const recovery = window.__ui3dRecovery, state = recovery.state;
      return recovery.ready && recovery.healthy && state.backend === 'WebGPU' && !state.standalone && state.worldVisible
        && state.ui.page === 'work' && state.ui.cache.cacheRenders > beforeCacheRenders;
    }, row.before.ui.cache.cacheRenders, {timeout: remaining()});
    assert.equal(await page.locator('canvas[data-ui3d="native"]').isVisible(), false, 'The standalone canvas retires after world rendering resumes.');
    row.identities = await page.evaluate(key => window.__ui3dRecovery.identities(key), kind);
    assert.deepEqual(row.identities, {hadDevice: true, hadCache: true, rendererChanged: true, deviceChanged: true, cacheTargetChanged: true}, 'New renderer/device/cache ownership must replace the failed lifetime.');
    const after = await page.evaluate(() => window.__ui3dRecovery.save());
    await writeFile(resolve(out, `${kind}-after-save.json`), after);
    assert.deepEqual(JSON.parse(after), JSON.parse(baseline), 'Recovery must preserve every acknowledged World field.');
    assert.equal(sha(after), report.baseline.sha256, 'Recovery must preserve the exact serialized save.');
    row.after = await page.evaluate(() => window.__ui3dRecovery.state);
    row.save = {sha256: sha(after), bytes: Buffer.byteLength(after)};
    await page.screenshot({path: resolve(out, `${kind}-recovered.png`)});
    row.status = 'passed'; await persist();
  }

  await recover('reported-failure');
  if (args.includes('--device-loss')) await recover('device-loss');
  assert.deepEqual(report.pageErrors, [], 'Unhandled page errors are not an expected device-loss consequence.');
  const unexpected = report.errors.filter(error => error.phase !== 'device-loss' || !/device.*(lost|destroy)|lost.*device|gpu.*(lost|destroy)/i.test(error.message));
  assert.deepEqual(unexpected, [], 'Unexpected console errors during recovery.');
  assert.deepEqual(await sourceFence(), sources, 'Product sources changed during recovery qualification.');
  report.status = 'passed';
  console.log(JSON.stringify({out, status: report.status, phases: report.phases.map(row => row.kind), saveSHA: report.baseline.sha256}));
} catch (error) {
  report.status = 'failed'; report.failure = {message: String(error), timedOut};
  if (page && !page.isClosed()) {
    report.failure.state = await page.evaluate(() => window.__ui3dRecovery?.state ?? window.__lisiere?.nativeUi).catch(() => null);
    await page.screenshot({path: resolve(out, 'failure.png')}).catch(() => {});
  }
  throw error;
} finally {
  clearTimeout(timer); report.elapsedMs = performance.now() - started; await persist(); await browser?.close();
}
