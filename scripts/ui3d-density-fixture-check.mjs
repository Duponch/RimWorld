import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import assert from 'node:assert/strict';

// Preparation is inert: execute explicitly against ROOT's already owned Vite
// server. This script never starts/stops a server or opens a human browser.
const argument = name => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1);
const base = argument('--base') ?? 'http://127.0.0.1:5196';
const folder = resolve('tmp/ui3d-density-v477', `fixture-${new Date().toISOString().replaceAll(':', '-')}`);
const budgetMs = 240000, started = Date.now();
await mkdir(folder, { recursive: true });

async function fixtureBoot(THREE, NativeStage, layoutNativePage) {
  const effects = { panels: [], escapes: 0, errors: [], select: [], selectFallback: 0, paint: [], paintFallback: 0, long: [], commits: [], apply: [] };
  const model = { value: 'avant', priority: '2' };
  let currentPage = null, frame = 0, disposed = false;
  const stage = new NativeStage({ onPanel: id => effects.panels.push(id), onEscape: () => { effects.escapes++; }, onError: message => effects.errors.push(message) });
  await stage.ready;
  // A blank host renderer exercises the same public overlay/cache API as the
  // game, including world readout and bottom-dock animation, without a World.
  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); renderer.setClearColor(0x436457, 1);
  renderer.domElement.dataset.fixtureGraphics = 'true';
  renderer.domElement.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;touch-action:none';
  document.body.append(renderer.domElement); await renderer.init();
  const backdrop = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  stage.setFrontVisible(false); stage.setWorldVisible(true);
  const resize = () => renderer.setSize(innerWidth, innerHeight);
  addEventListener('resize', resize);
  const tick = now => {
    if (disposed) return;
    renderer.render(backdrop, camera); stage.renderOverlay(renderer, now);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  const show = page => { currentPage = page; stage.showPage(page); };
  const noop = () => {};
  const measureContext = document.createElement('canvas').getContext('2d');
  const measure = (text, size, bold = false) => { measureContext.font = (bold ? 'bold ' : '') + size + 'px "Comic Sans MS", Georgia, serif'; return measureContext.measureText(text).width; };
  const layout = () => currentPage ? layoutNativePage(currentPage, { width: innerWidth, height: innerHeight }, false, measure) : null;
  const pieces = () => {
    stage.scene.updateMatrixWorld(true); const found = [];
    stage.scene.traverse(piece => {
      const data = piece.userData;
      if (!data.nativeId || !data.w || !data.h) return;
      let visible = true; for (let parent = piece; parent; parent = parent.parent) if (!parent.visible) visible = false;
      const points = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, y]) => new THREE.Vector3(x * data.w / 2, y * data.h / 2, 0).applyMatrix4(piece.matrixWorld).project(stage.camera))
        .map(point => ({ x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 }));
      const left = Math.min(...points.map(point => point.x)), right = Math.max(...points.map(point => point.x));
      const top = Math.min(...points.map(point => point.y)), bottom = Math.max(...points.map(point => point.y));
      const record = { id: data.nativeId, visible, paper: data.paper, width: data.w * 100, height: data.h * 100,
        screen: { left, top, right, bottom, width: right - left, height: bottom - top, x: (left + right) / 2, y: (top + bottom) / 2 } };
      // Read the actual graphics clipping planes, projected at this control's
      // front face. Perspective depth must not turn a clipped-hit test into a
      // comparison against an approximate 2D panel rectangle.
      let clip = piece.parent;
      while (clip && clip.clippingPlanes?.length !== 4) clip = clip.parent;
      if (clip) {
        const planes = clip.clippingPlanes, worldZ = new THREE.Vector3(0, 0, data.depth + .003).applyMatrix4(piece.matrixWorld).z;
        const corner = (x, y) => { const p = new THREE.Vector3(x, y, worldZ).project(stage.camera); return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 }; };
        const tl = corner(-planes[0].constant, planes[2].constant), br = corner(planes[1].constant, -planes[3].constant);
        record.clip = { left: tl.x, top: tl.y, right: br.x, bottom: br.y };
      }
      if (data.nativeId === 'world-readout' && data.ctx) {
        const pixels = data.ctx.getImageData(0, 0, data.wPx, data.hPx).data;
        let ink = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) ink++;
        record.alpha = { inkFraction: ink / (pixels.length / 4), corners: [0, data.wPx - 1, (data.hPx - 1) * data.wPx, data.wPx * data.hPx - 1].map(index => pixels[index * 4 + 3]) };
      }
      found.push(record);
    });
    return found;
  };
  function showGeometry() {
    show({ id: 'bio-geometry-fixture', title: 'Biographie', subtitle: 'Bio', width: 514, height: 489, layout: 'inspector', columnRatio: .48,
      portrait: { url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E', label: 'Portrait témoin' },
      rows: [{ id: 'pawn-tabs', label: '', compact: true, controls: ['Bio', 'Besoins', 'Santé'].map(label => ({ id: 'tab-' + label, label, onActivate: noop })) },
        { id: 'identity', label: 'Personne témoin', column: 0 }, { id: 'traits', label: 'Traits connus', column: 0 },
        { id: 'skill-heading', label: 'Compétences', emphasis: 'heading', column: 1 },
        ...Array.from({ length: 12 }, (_, index) => ({ id: 'skill-' + index, label: 'Compétence ' + (index + 1), value: (index + 1) + '/20', column: 1,
          meter: { value: index + 1, max: 20, secondary: { value: index * 10, max: 200 } }, hint: 'Compétence confirmée ' + (index + 1) }))],
      actions: ['Mobiliser', 'Ordres', 'Travail'].map(label => ({ id: 'action-' + label, label, onActivate: noop })) });
  }
  function showControls() {
    show({ id: 'controls-fixture', title: 'Priorités locales', width: 514, height: 300, layout: 'inspector', rows: [
      { id: 'priority-row', label: 'Construction', compact: true, controls: [{ id: 'priority-select', label: model.priority, hint: 'Court',
        onActivate: () => { effects.selectFallback++; }, select: { value: model.priority, options: Array.from({ length: 5 }, (_, value) => ({ value: String(value), label: String(value), hint: 'Priorité ' + value })),
          onChange: value => { model.priority = value; effects.select.push(value); showControls(); } } }] },
      { id: 'plain-read', label: 'Donnée confirmée', value: 'Valeur lisible', hint: 'Court' },
    ] });
  }
  function showLong() {
    show({ id: 'long-fixture', title: 'Liste complète', width: 514, height: 300, layout: 'inspector', rows: Array.from({ length: 60 }, (_, index) => ({
      id: 'long-row-' + index, label: 'Entrée ' + index, compact: true, controls: [{ id: 'long-control-' + index, label: 'Ouvrir ' + index, onActivate: () => effects.long.push(index) }],
    })) });
  }
  function showPaint() {
    show({ id: 'paint-fixture', title: 'Planning', width: 1100, height: 260, layout: 'table', rows: [
      { id: 'paint-headings', label: 'Colon', compact: true, columns: Array.from({ length: 24 }, (_, hour) => ({ label: String(hour) })) },
      { id: 'paint-row', label: 'Personne', compact: true, controls: Array.from({ length: 24 }, (_, hour) => ({ id: 'paint-' + hour, label: '·', hint: hour + ' h',
        onActivate: () => { effects.paintFallback++; }, paint: { group: 'schedule-owner', index: hour, onPaint: indices => effects.paint.push([...indices]) } })) },
    ] });
  }
  function showEditor() {
    show({ id: 'editor-fixture', title: 'Édition', width: 514, layout: 'dialog', modal: true, rows: [{ id: 'editor-field', label: 'Nom', input: { value: model.value,
      onCommit: async value => { await new Promise(resolve => setTimeout(resolve, 30)); if (value === 'refus') return false; model.value = value; effects.commits.push(value); return true; } } }],
      actions: [{ id: 'editor-apply', label: 'Appliquer', onActivate: () => effects.apply.push(model.value) }] });
  }
  window.__densityFixture = { stage, effects, model, showGeometry, showControls, showLong, showPaint, showEditor, show,
    get ready() { return stage.diagnostics().overlayRenders > 0; },
    get ui() { return { ...stage.diagnostics(), pieces: pieces(), layout: layout(), shortTextWidth: measure('Court', 13) }; },
    dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(frame); removeEventListener('resize', resize); stage.dispose(); renderer.domElement.remove(); void renderer.dispose(); },
  };
}

const fixturePath = resolve(folder, 'density-fixture.html');
await writeFile(fixturePath, '<!doctype html><html lang="fr"><meta charset="UTF-8"><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}</style><body><script type="module">' +
  'import * as THREE from "three/webgpu";import {NativeStage} from "/src/ui3d/NativeStage.ts";import {layoutNativePage} from "/src/ui3d/native-layout.ts";(' + fixtureBoot.toString() + ')(THREE,NativeStage,layoutNativePage);</script></body></html>');
const url = base.replace(/\/$/, '') + '/' + relative(resolve('.'), fixturePath).replaceAll('\\', '/');
const errors = [], captures = [];
const browser = await chromium.launch({ executablePath: argument('--executable') ?? resolve('.playwright/chromium-1243/chrome-win64/chrome.exe'),
  headless: process.argv.includes('--headless'), timeout: 60000, args: ['--mute-audio', '--enable-unsafe-webgpu'] });
const watchdog = setTimeout(() => { console.error('Density fixture exceeded 240 s'); void browser.close(); }, Math.max(1, budgetMs - (Date.now() - started)));
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage(); page.setDefaultTimeout(10000);
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const ui = () => page.evaluate(() => window.__densityFixture.ui);
const effects = () => page.evaluate(() => window.__densityFixture.effects);
const wait = (predicate, arg = null) => page.waitForFunction(predicate, arg, { timeout: 10000 });
const show = name => page.evaluate(name => window.__densityFixture[name](), name);
const point = async id => { const target = (await ui()).controls.find(control => control.id === id); assert.ok(target, 'reachable native control ' + id); assert.equal(target.disabled, false); return target; };
const click = async id => { const target = await point(id); await page.mouse.click(target.x, target.y); };
const piece = (state, id) => { const target = state.pieces.find(piece => piece.id === id && piece.visible); assert.ok(target, 'visible mesh ' + id); return target; };
const capture = async label => { const state = await ui(); await page.screenshot({ path: resolve(folder, label + '.png') }); captures.push({ label, ui: state, effects: await effects() }); };
const moveToWorld = () => { const viewport = page.viewportSize(); return page.mouse.move(viewport.width / 2, viewport.height * .3); };
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__densityFixture?.ready, null, { timeout: 60000 });
  assert.equal(await page.locator('button,select,input,dialog').count(), 0, 'fixture controls belong to the native scene');
  const geometry = [];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 2557, height: 1440 }]) {
    await page.setViewportSize(viewport); await show('showGeometry');
    await wait(() => window.__densityFixture.ui.page === 'bio-geometry-fixture' && window.__densityFixture.ui.activeAnimations === 0);
    const state = await ui(), panel = piece(state, 'page:bio-geometry-fixture');
    assert.equal(state.mode, 'native-meshes'); assert.equal(state.error, null);
    assert.deepEqual([state.pageBounds.width, state.pageBounds.height], [514, 489]);
    assert.ok(Math.abs(panel.screen.width - 514) < 3, 'projected geometry uses CSS-pixel dimensions');
    assert.ok(Math.abs(panel.screen.height - 489) < 3, 'projected height uses CSS-pixel dimensions');
    geometry.push({ viewport, bounds: state.pageBounds, projected: panel.screen });
    await capture('geometry-' + viewport.width + 'x' + viewport.height);
  }
  assert.ok(Math.abs(geometry[0].projected.width - geometry[1].projected.width) < 1, 'wider viewport does not inflate a dossier');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { window.__densityFixture.show(null); window.__densityFixture.stage.setWorldReadout(['Sol fertile · 21 °C', 'Roche · 250 / 250']); });
  await moveToWorld();
  await wait(() => window.__densityFixture.ui.pieces.some(piece => piece.id === 'world-readout' && piece.visible));
  const readout = piece(await ui(), 'world-readout');
  assert.equal(readout.paper, false, 'world readout uses a transparent text plane');
  assert.deepEqual(readout.alpha.corners, [0, 0, 0, 0]);
  assert.ok(readout.alpha.inkFraction > 0 && readout.alpha.inkFraction < .7, 'outlined glyphs leave transparent space without an opaque backing');
  await capture('world-readout-text-only');

  await show('showControls');
  let target = await point('priority-select'); await page.mouse.move(target.x, target.y);
  await wait(() => window.__densityFixture.ui.pieces.some(piece => piece.id === 'native-tooltip' && piece.visible));
  let state = await ui(), tooltip = piece(state, 'native-tooltip');
  assert.ok(tooltip.width >= state.shortTextWidth + 19 && tooltip.width < 150, 'short tooltip is measured to its short text');
  assert.ok(tooltip.screen.left >= 0 && tooltip.screen.right <= 1440, 'tooltip remains inside viewport');
  await capture('tooltip-short-measured');
  await click('priority-select');
  await wait(() => !!window.__densityFixture.ui.dropdown);
  state = await ui(); assert.equal(state.page, 'controls-fixture');
  assert.equal(state.controls.filter(control => control.id.startsWith('select-option:')).length, 5);
  assert.ok(state.dropdown.width < state.pageBounds.width, 'priority choices remain a local popup');
  await capture('priority-popup-five-local-options');
  await click('select-option:priority-select:3');
  await wait(() => window.__densityFixture.model.priority === '3' && !window.__densityFixture.ui.dropdown);
  await click('priority-select'); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await wait(() => window.__densityFixture.model.priority === '1' && !window.__densityFixture.ui.dropdown);
  assert.deepEqual((await effects()).select, ['3', '1']); assert.equal((await effects()).selectFallback, 0);
  await click('priority-select'); state = await ui();
  const popup = state.dropdown, outside = popup.x > 24 ? { x: popup.x - 10, y: popup.y + popup.height / 2 } : { x: popup.x + popup.width + 10, y: popup.y + popup.height / 2 };
  await page.mouse.click(outside.x, outside.y); await wait(() => !window.__densityFixture.ui.dropdown);
  await click('priority-select'); await page.keyboard.press('Escape'); await wait(() => !window.__densityFixture.ui.dropdown);
  assert.equal((await ui()).page, 'controls-fixture'); assert.deepEqual((await effects()).select, ['3', '1']);

  await show('showLong'); state = await ui();
  assert.ok(state.maxScroll > 0);
  let track = piece(state, 'native-scrollbar'), thumb = piece(state, 'native-scroll-thumb');
  assert.ok(track.height > thumb.height && thumb.height >= 28, 'visible scrollbar has a proportional usable thumb');
  const bodyTop = state.pageBounds.y + state.layout.body.y, bodyBottom = bodyTop + state.layout.body.height;
  const clipped = state.pieces.find(piece => piece.id.startsWith('long-control-') && piece.clip && piece.screen.top < piece.clip.bottom && piece.screen.bottom > piece.clip.bottom + 3);
  assert.ok(clipped, 'fixture deliberately includes a partially visible bottom control');
  const clippedIndex = Number(clipped.id.split('-').at(-1));
  await page.mouse.click(clipped.screen.x, Math.min(clipped.screen.bottom - 1, clipped.clip.bottom + 3));
  assert.deepEqual((await effects()).long, [], 'clipped control portion cannot receive a hit beyond body');
  await page.mouse.click(clipped.screen.x, (clipped.screen.top + clipped.clip.bottom) / 2);
  assert.deepEqual((await effects()).long, [clippedIndex], 'the visible portion of the same partial control remains usable');
  await capture('long-partial-row-clipping');
  await page.mouse.move(state.pageBounds.x + state.pageBounds.width / 2, bodyTop + state.layout.body.height / 2);
  await page.mouse.wheel(0, 180); await wait(() => window.__densityFixture.ui.scroll > 0);
  state = await ui(); const wheelScroll = state.scroll;
  track = piece(state, 'native-scrollbar'); thumb = piece(state, 'native-scroll-thumb');
  await page.mouse.move(thumb.screen.x, thumb.screen.y); await page.mouse.down();
  await page.mouse.move(thumb.screen.x, track.screen.bottom - thumb.screen.height / 2, { steps: 12 }); await page.mouse.up();
  await wait(previous => window.__densityFixture.ui.scroll > previous, wheelScroll);
  state = await ui(); assert.ok(state.scroll <= state.maxScroll); assert.ok(state.controls.some(control => control.id === 'long-control-59'), 'last row remains reachable by dragging scrollbar');
  await capture('long-scroll-thumb-to-last-row');

  await show('showPaint');
  const first = await point('paint-0'), last = await point('paint-23');
  await page.mouse.move(first.x, first.y); await page.mouse.down(); await page.mouse.move(last.x, last.y, { steps: 24 }); await page.mouse.up();
  await wait(() => window.__densityFixture.effects.paint.length === 1);
  assert.deepEqual((await effects()).paint, [Array.from({ length: 24 }, (_, hour) => hour)]);
  assert.equal((await effects()).paintFallback, 0, 'drag release does not also activate a single-cell callback');
  const from = await point('paint-5'), to = await point('paint-8');
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 4 }); await page.keyboard.press('Escape'); await page.mouse.up();
  assert.equal((await effects()).paint.length, 1, 'Escape cancels an unfinished stroke');
  assert.equal((await ui()).page, 'paint-fixture'); await capture('planning-drag-and-cancel');

  await show('showEditor');
  await click('editor-field'); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('après'); await click('editor-apply');
  await wait(() => window.__densityFixture.effects.apply.length === 1);
  assert.deepEqual((await effects()).apply, ['après'], 'Apply waits for async composition commit');
  await click('editor-field'); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('tabulation'); await page.keyboard.press('Tab');
  await wait(() => window.__densityFixture.model.value === 'tabulation'); await page.keyboard.press('Enter');
  await wait(() => window.__densityFixture.effects.apply.length === 2);
  assert.deepEqual((await effects()).apply, ['après', 'tabulation']);
  await click('editor-field'); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('refus'); await page.keyboard.press('Tab');
  await wait(() => document.activeElement?.tagName === 'TEXTAREA' && document.activeElement.value === 'refus');
  assert.equal((await effects()).apply.length, 2); assert.equal(await page.locator('button,select,input,dialog').count(), 0);
  await page.keyboard.press('Escape'); await capture('editor-commit-tab-refusal');

  await page.evaluate(() => { window.__densityFixture.show(null); window.__densityFixture.stage.setWorldReadout(null); window.__densityFixture.stage.setAutoHideBottom(true); });
  await moveToWorld();
  await wait(() => window.__densityFixture.ui.bottomDock.offset < -.71 && window.__densityFixture.ui.activeAnimations === 0);
  const hidden = await ui(), dockViewport = page.viewportSize(); await page.mouse.move(dockViewport.width / 2, dockViewport.height - 2);
  await wait(() => window.__densityFixture.ui.bottomDock.open && Math.abs(window.__densityFixture.ui.bottomDock.offset) < .001);
  const revealed = await ui(); assert.ok(revealed.management[0].y < hidden.management[0].y, 'native dock slides into view');
  await capture('bottom-dock-revealed');
  await moveToWorld();
  await wait(() => window.__densityFixture.ui.bottomDock.offset < -.71 && window.__densityFixture.ui.activeAnimations === 0);
  await page.waitForTimeout(150);
  const settled = await ui(); await page.waitForTimeout(400); const stable = await ui();
  assert.equal(stable.cache.cacheRenders, settled.cache.cacheRenders, 'settled overlay does not recapture stable meshes');
  assert.ok(stable.cache.composites > settled.cache.composites, 'host frames continue using retained overlay');
  assert.equal(stable.activeAnimations, 0); assert.equal(stable.bottomDock.offset, settled.bottomDock.offset);
  await capture('bottom-dock-settled-cache');
  assert.deepEqual((await effects()).errors, []); assert.deepEqual(errors, []);
  await writeFile(resolve(folder, 'report.json'), JSON.stringify({ ok: true, folder, base, elapsedMs: Date.now() - started, geometry, captures, errors }, null, 2));
  console.log(JSON.stringify({ ok: true, folder, captures: captures.length, elapsedMs: Date.now() - started }));
} catch (error) {
  await page.screenshot({ path: resolve(folder, 'failure.png') }).catch(() => {});
  await writeFile(resolve(folder, 'failure.json'), JSON.stringify({ message: String(error), stack: error?.stack, errors, captures,
    ui: await ui().catch(() => null), effects: await effects().catch(() => null), elapsedMs: Date.now() - started }, null, 2));
  throw error;
} finally {
  clearTimeout(watchdog);
  await page.evaluate(() => window.__densityFixture?.dispose()).catch(() => {});
  await context.close().catch(() => {}); await browser.close();
}
