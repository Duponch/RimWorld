import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultPrototype = 'E:/Téléchargements/diorama_carton_hud_3d_three_js_webgpu(3).html';
const sha256 = value => createHash('sha256').update(value).digest('hex');

// Read-only observations are deliberately appended after the literal module.
// They neither replace its layout nor change its animation or pointer handlers.
const observation = String.raw`
let referenceRenderedFrames = 0;
const referenceOriginalRender = renderer.render.bind(renderer);
renderer.render = (...args) => {
  referenceRenderedFrames++;
  return referenceOriginalRender(...args);
};
window.__ui3dReference = {
  get ready() { return referenceRenderedFrames >= 3; },
  snapshot() {
    camera.updateMatrixWorld(true);
    const project = object => {
      const p = object.getWorldPosition(new THREE.Vector3()).project(camera);
      return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2, z: p.z };
    };
    return {
      width: innerWidth, height: innerHeight, pixelRatio: renderer.getPixelRatio(),
      fov: camera.fov, hudDistance: HUD_DIST, frames: referenceRenderedFrames,
      backend: renderer.backend?.isWebGPUBackend ? 'webgpu' : 'webgl',
      threeRevision: THREE.REVISION,
      camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray() },
      anchors: Object.fromEntries(Object.entries(anchors).map(([name, object]) => [name, {
        position: object.position.toArray(), scale: object.scale.toArray()
      }])),
      targets: interactiveMeshes.map((mesh, index) => ({
        index, center: project(mesh), seed: mesh.userData.widgetGroup.userData.seed,
        width: mesh.userData.widgetGroup.userData.w,
        height: mesh.userData.widgetGroup.userData.h,
        tooltip: mesh.userData.widgetGroup.userData.tooltip
      })),
      management: managementButtons.map((object, index) => ({
        id: managementButtonsConfig[index].id, label: managementButtonsConfig[index].label,
        center: project(object), seed: object.userData.seed,
        position: object.position.toArray(), rotation: object.rotation.toArray(),
        active: object.userData.active, hover: object.userData.hoverVal
      })),
      widgets: animatedWidgets.length, gameSpeed, gameMinutes, activeManagementTab,
      drawer: { current: drawerCurrentY, target: drawerTargetY },
      dom: [...document.body.children].map(element => element.tagName)
    };
  }
};
`;

export async function prepareReference({
  prototypePath = defaultPrototype,
  outputDir = resolve(projectRoot, 'tmp/ui3d-v476/reference')
} = {}) {
  const original = await readFile(prototypePath);
  const text = original.toString('utf8');
  if ((text.match(/<script type="importmap">/g) ?? []).length !== 1 ||
      (text.match(/import \* as THREE from 'three';/g) ?? []).length !== 1) {
    throw new Error('Unexpected prototype import structure; literal extraction stopped.');
  }
  const moduleStart = text.indexOf('<script type="module">');
  const moduleEnd = text.indexOf('</script>', moduleStart);
  if (moduleStart < 0 || moduleEnd < 0) throw new Error('Prototype module is missing.');
  const originalModule = text.slice(moduleStart + '<script type="module">'.length, moduleEnd);
  const localModule = originalModule.replace("import * as THREE from 'three';", "import * as THREE from 'three/webgpu';");
  const importmapRemoved = text.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, '');
  const fixture = importmapRemoved.replace(originalModule, `${localModule}\n${observation}\n`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'prototype-original.html'), original);
  await writeFile(join(outputDir, 'index.html'), fixture);
  const dependency = JSON.parse(await readFile(join(projectRoot, 'node_modules/three/package.json'), 'utf8'));
  const manifest = {
    prototypePath, originalSha256: sha256(original), originalModuleSha256: sha256(originalModule),
    fixtureSha256: sha256(fixture), localModuleSha256: sha256(localModule),
    changes: ['Remove CDN import map', "Resolve original Three import through local 'three/webgpu'", 'Append read-only scene observations'],
    originalThreeVersion: '0.170.0', localThreeVersion: dependency.version,
    rendererVersionDifference: dependency.version !== '0.170.0',
    warning: 'This fixture preserves literal prototype art/layout/animation. Local Three version differs from its CDN reference; pixel equality with the CDN renderer is not asserted.'
  };
  await writeFile(join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { outputDir, fixturePath: join(outputDir, 'index.html'), manifest };
}

export async function findBundledChromium() {
  const { readdir } = await import('node:fs/promises');
  const browserRoot = join(projectRoot, '.playwright');
  const versions = (await readdir(browserRoot)).filter(name => /^chromium-\d+$/.test(name)).sort().reverse();
  for (const version of versions) {
    const executable = join(browserRoot, version, 'chrome-win64/chrome.exe');
    try { await access(executable); return executable; } catch { /* Try the next installed build. */ }
  }
  throw new Error('No bundled full Chromium executable found under .playwright.');
}

export async function captureReference({ port = 5196, ...options } = {}) {
  const prepared = await prepareReference(options);
  const { createServer } = await import('vite');
  const { chromium } = await import('playwright');
  const relativeFixture = prepared.fixturePath.slice(projectRoot.length).replaceAll('\\', '/');
  const server = await createServer({
    configFile: false, root: projectRoot, clearScreen: false,
    server: { host: '127.0.0.1', port, strictPort: true, watch: { ignored: ['**/tmp/**'] } },
    optimizeDeps: { entries:[prepared.fixturePath], include: ['three/webgpu'] }
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({
      executablePath: await findBundledChromium(), headless: false,
      args: ['--mute-audio', '--enable-unsafe-webgpu'],
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [], consoleMessages = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => {
      if (['error', 'warning'].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
    });
    await page.goto(`http://127.0.0.1:${port}${relativeFixture}`, { waitUntil: 'load', timeout: 120_000 });
    await page.waitForFunction(() => window.__ui3dReference?.ready, null, { timeout: 120_000 });
    const captures = [];
    for (const width of [1440, 2547]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.mouse.move(width / 2, 500);
      await page.waitForTimeout(700);
      const basename = `original-local-three-${width}x1000`;
      await page.screenshot({ path: join(prepared.outputDir, `${basename}.png`) });
      await page.screenshot({ path: join(prepared.outputDir, `${basename}-toolbar.png`), clip: { x: 0, y: 800, width, height: 200 } });
      const snapshot = await page.evaluate(() => window.__ui3dReference.snapshot());
      await writeFile(join(prepared.outputDir, `${basename}.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
      captures.push({ basename, snapshot });
    }
    const gpu = await page.evaluate(async () => {
      const adapter = await navigator.gpu?.requestAdapter();
      return adapter ? { info: { ...adapter.info }, features: [...adapter.features] } : null;
    });
    const report = { ...prepared.manifest, captures, gpu, errors, consoleMessages, muted: true, simultaneousPages: 1 };
    await writeFile(join(prepared.outputDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    if (errors.length) throw new Error(`Reference page produced ${errors.length} JavaScript error(s); see capture-report.json.`);
    return report;
  } finally {
    await browser?.close();
    await server.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const capture = process.argv.includes('--capture');
  if (!capture && !process.argv.includes('--prepare')) {
    console.log('Use --prepare to write the isolated literal reference, or --capture to render it sequentially in muted Chromium.');
  } else {
    const result = capture ? await captureReference() : await prepareReference();
    console.log(JSON.stringify(capture ? { captures: result.captures.map(entry => entry.basename), errors: result.errors } : result, null, 2));
  }
}
