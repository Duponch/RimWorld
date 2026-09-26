import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { filthVisualFixture } from '../scenarios/filth-visual';
import { expectWorld, observeErrors, panel, pause, saveKey, world } from './helpers';
import { perform, revealCells } from './player-actions';

// Read-only observations of the real renderer; nothing enters the product bundle.
const probe = `
const filthFrame = ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame = function(...args) {
 const result = filthFrame.apply(this,args);
 if(!this.preparing && this.world) {
  const mesh=this.hygiene.filth.mesh, g=mesh.geometry;
  window.__filthView={count:g.instanceCount,visible:mesh.visible,poseVersion:g.getAttribute('filthPose').version,
   fps:this.frames.fps,p95:this.frames.p95Ms,backend:this.backend,tick:this.world.tick};
  const target=window.__filthTarget;
  if(target) { const f=this.world.filth?.items.find(f=>f.id===target); const n=f?.thickness??0;
   (window.__filthThickness??=new Set()).add(n); }
 }
 return result;
};`;

test('V107 native filth: layers, camera, physical cleaning and cold reload', async ({ playwright }, info) => {
  test.setTimeout(90000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page), f = filthVisualFixture();
  const read = () => page.evaluate(() => (window as any).__filthView);
  try {
    expect(validateWorld(f.world)).toEqual([]);
    await page.route('**/src/main.ts*', async route => { const response = await route.fetch(); await route.fulfill({ response, body: probe + await response.text() }); });
    await page.addInitScript(({ key, data, target }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, data); (window as any).__filthTarget = target; }, { key: saveKey, data: serializeWorld(f.world), target: f.targetId });
    await page.goto('/?scenario=camp&size=32&e2e'); await expect(page.locator('#loading')).toHaveCount(0); await pause(page);
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, f.world); await page.keyboard.press('Escape');
    const initial = await read(); expect(initial.backend).toBe('WebGPU');
    expect(initial.count).toBe(f.world.filth!.items.reduce((n, trace) => n + trace.thickness, 0));
    await revealCells(page, [{ x: 5, z: 7 }, { x: 25, z: 7 }, { x: 5, z: 17 }, { x: 25, z: 17 }]);
    await page.screenshot({ path: 'artifacts/filth-chart-v107.png' });
    await page.mouse.move(780, 450); await page.mouse.down({ button: 'right' }); await page.mouse.move(970, 490, { steps: 12 }); await page.mouse.up({ button: 'right' });
    await page.mouse.wheel(0, -240);
    await page.screenshot({ path: 'artifacts/filth-camera-v107.png' });
    const rotated = await read(); expect(rotated.poseVersion).toBe(initial.poseVersion); expect(rotated.count).toBe(initial.count);
    await expectWorld(page, f.world);
    await perform(page, { command: { type: 'clean-room', pawnId: f.pawnId, ...f.dirty }, reason: 'Retirer les cinq couches par nettoyage physique.' }, { value: 0 });
    await page.keyboard.press('Escape'); await page.locator('[data-speed="3"]').click();
    await expect.poll(async () => (await world(page)).filth!.items.some(t => t.id === f.targetId), { timeout: 20000 }).toBe(false);
    await pause(page); const final = await world(page);
    expect(validateWorld(final)).toEqual([]); expect(final.filth!.cleaned).toBe(1); // Counter of fully removed traces, not layers.
    const seen = await page.evaluate(() => [...(window as any).__filthThickness].sort()); expect(seen).toEqual([0, 1, 2, 3, 4, 5]);
    expect((await read()).count).toBe(final.filth!.items.reduce((n, trace) => n + trace.thickness, 0));
    await page.screenshot({ path: 'artifacts/filth-cleaned-v107.png' });
    await panel(page, 'menu'); await page.locator('#save').click();
    await page.reload(); await expect(page.locator('#loading')).toHaveCount(0); await pause(page);
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, final); await page.keyboard.press('Escape');
    expect((await read()).count).toBe(final.filth!.items.reduce((n, trace) => n + trace.thickness, 0)); expect(errors).toEqual([]);
    const report = JSON.stringify({ prepared: true, initial, rotated, final: await read(), cleaned: final.filth!.cleaned, observedThickness: seen, exactColdReload: true, errors }, null, 2);
    writeFileSync('artifacts/filth-native-v107.json', report); await info.attach('filth-v107', { contentType: 'application/json', body: report });
  } catch (error) { writeFileSync('artifacts/filth-native-failure-v107.json', JSON.stringify({ error: String(error), errors, view: await read().catch(() => null) }, null, 2)); throw error; }
  finally { await browser.close(); }
});
