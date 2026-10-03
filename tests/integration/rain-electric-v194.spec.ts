import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { RAIN_ELECTRIC_DEMO_ID, RAIN_ELECTRIC_CELLS } from '../../scripts/create-test-save-rain-electric-v194.ts';
import { fireTouch } from '../../src/sim/firefighting.ts';
import { rainElectricalEligible } from '../../src/sim/rain-electric.ts';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import type { Structure, World } from '../../src/sim/types.ts';
import { TEST_COLONY_COUNT } from '../test-colony-count.ts';
import { testOutputPath, writeTestFile } from '../test-output.ts';
import { cell, dragRectangle, expectWorld, observeErrors, panel, pause, tool, world } from './helpers.ts';
import { perform, revealCells } from './player-actions.ts';

interface Frame { tick: number; clock: number; pawnGeometry: number; pawnInstances: number; fireGeometry: number; fireCapacity: number; fireInstances: number; previewGeometry: number; previewCapacity: number; previewInstances: number }
interface Probe { pipelines: number; buffersCreated: number; bufferBytesCreated: number; frames: Frame[] }
const frameProbe = `
const rainElectricFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const result=rainElectricFrame.call(this,now);
 if(this.preparing||!this.world||!window.rainElectricProbe)return result;
 const p=this.pawns.feedbackSource,f=this.fires.mesh.geometry;if(!p||!f)return result;
 const frames=window.rainElectricProbe.frames;
 frames.push({tick:this.world.tick,clock:this.timeline.tick,pawnGeometry:p.id,pawnInstances:p.instanceCount,
  fireGeometry:f.id,fireCapacity:f.getAttribute('firePosition').count,fireInstances:f.instanceCount,
  previewGeometry:this.areaPreview.mesh.geometry.id,previewCapacity:this.areaPreview.mesh.instanceMatrix.count,
  previewInstances:this.areaPreview.mesh.geometry.instanceCount});
 if(frames.length>2048)frames.shift();return result;
};`;

async function frame(page: Page, tick: number): Promise<Frame> {
  await expect.poll(() => page.evaluate(tick => {
    const f = (window as unknown as { rainElectricProbe: Probe }).rainElectricProbe.frames.at(-1);
    return !!f && f.tick === tick && Math.abs(f.clock - tick) < .001;
  }, tick)).toBe(true);
  return page.evaluate(() => (window as unknown as { rainElectricProbe: Probe }).rainElectricProbe.frames.at(-1)!);
}
async function saveResume(page: Page, state: World) {
  await panel(page, 'menu'); await page.locator('#save').click(); await page.locator('#load').click();
  await expectWorld(page, state); await page.keyboard.press('Escape');
}
async function inspect(page: Page, s: Structure) {
  await tool(page, 'select'); await page.keyboard.press('Escape'); await revealCells(page, [s]);
  for (let i = 0; i < 8; i++) { await cell(page, s.x, s.z); if (await page.locator(`[data-power-id="${s.id}"]`).isVisible()) break; }
  await expect(page.locator(`[data-power-id="${s.id}"]`)).toBeVisible();
  return page.locator(`[data-power-id="${s.id}"]`);
}
async function zoomContact(page: Page, cells: { x: number; z: number }[]) {
  await revealCells(page, cells);
  const bounds = await page.locator('#viewport canvas').boundingBox(); if (!bounds) throw Error('Canvas absent.');
  const anchor = { x: bounds.x + bounds.width * .7, y: bounds.y + bounds.height * .2 };
  await page.mouse.move(anchor.x, anchor.y); await page.mouse.wheel(0, -600); await page.waitForTimeout(200);
  await revealCells(page, cells);
}

test('V194 public rain scene discharges, resumes and physically protects/extinguishes/repairs with resident WebGPU presentation', async ({ playwright }) => {
  test.setTimeout(180_000);
  const prepared = deserializeWorld(readFileSync('public/test-saves/v194/pluie-et-appareils.json', 'utf8'));
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page), stages: Record<string, unknown> = {}, rotation = { value: 0 };
  const batteryId = prepared.structures[0]!.id, exposedId = prepared.structures[3]!.id, pawnId = prepared.pawns[0]!.id;
  const act = (command: Parameters<typeof perform>[1]['command'], reason: string) => perform(page, { command, reason }, rotation);
  try {
    await page.addInitScript(() => {
      const probe: Probe = { pipelines: 0, buffersCreated: 0, bufferBytesCreated: 0, frames: [] }; Object.assign(window, { rainElectricProbe: probe });
      for (const name of ['createRenderPipeline', 'createRenderPipelineAsync'] as const) {
        const original = GPUDevice.prototype[name];
        (GPUDevice.prototype[name] as unknown) = function(this: GPUDevice, ...args: unknown[]) { probe.pipelines++; return (original as Function).apply(this, args); };
      }
      const create = GPUDevice.prototype.createBuffer;
      GPUDevice.prototype.createBuffer = function(this: GPUDevice, descriptor: GPUBufferDescriptor) {
        probe.buffersCreated++; probe.bufferBytesCreated += descriptor.size; return create.call(this, descriptor);
      };
    });
    // Observation only. The real public menu/save and worker remain unmodified.
    await page.route('**/src/main.ts*', async route => { const response = await route.fetch(); await route.fulfill({ response, body: frameProbe + await response.text() }); });
    await page.goto('/?e2e'); const front = page.locator('.front-menu');
    await front.getByRole('button', { name: 'Charger une partie', exact: true }).click(); await front.getByRole('button', { name: 'Colonies de test' }).click();
    expect(TEST_COLONY_COUNT).toBeGreaterThanOrEqual(44); await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator(`input[name="test-colony"][value="${RAIN_ELECTRIC_DEMO_ID}"]`).check(); await front.getByRole('button', { name: 'Charger cette colonie' }).click();
    await expectWorld(page, prepared); expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    const hardware = await page.evaluate(async () => {
      const adapter = await navigator.gpu.requestAdapter(); if (!adapter) throw Error('WebGPU adapter absent.');
      const info = adapter.info;
      return { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description, fallback: (adapter as unknown as { isFallbackAdapter?: boolean }).isFallbackAdapter ?? null };
    });
    expect(hardware.fallback).not.toBe(true); expect(Object.values(hardware).join(' ')).not.toMatch(/swiftshader|llvmpipe|lavapipe/i);
    const capture = async (name: string, w: World) => {
      expect(validateWorld(w)).toEqual([]); const rendered = await frame(page, w.tick);
      const counters = await page.evaluate(() => { const p = (window as unknown as { rainElectricProbe: Probe }).rainElectricProbe; return { pipelines: p.pipelines, buffersCreated: p.buffersCreated, bufferBytesCreated: p.bufferBytesCreated }; });
      stages[name] = { tick: w.tick, risk: w.rainElectrical, fireLedger: w.fires?.ledger, rendered, ...counters };
      return { ...counters, ...rendered };
    };
    const initial = await capture('prepared', prepared);
    expect(prepared.rainElectrical).toBeUndefined(); expect(prepared.fires).toBeUndefined();
    // Grow the resident preview through a real gesture, then cancel before
    // pointerup. Neither this intention nor a stray release changes the World.
    const rectangle = [{ x: 8, z: 8 }, { x: 16, z: 16 }];
    await tool(page, 'build-roof'); await revealCells(page, rectangle);
    await dragRectangle(page, rectangle[0]!, rectangle[1]!, false);
    await expect.poll(() => page.evaluate(() => (window as unknown as { rainElectricProbe: Probe }).rainElectricProbe.frames.at(-1)?.previewInstances ?? 0)).toBeGreaterThan(16);
    const preview = await capture('previewGrowth', prepared);
    expect(preview.previewCapacity).toBeGreaterThan(initial.previewCapacity);
    expect(preview.pipelines).toBe(initial.pipelines);
    await page.keyboard.press('Escape'); await page.mouse.up(); await expectWorld(page, prepared);
    const cancelled = await capture('previewCancelled', prepared);
    expect(cancelled.previewInstances).toBe(0); expect(cancelled.pipelines).toBe(initial.pipelines);
    const card = await inspect(page, prepared.structures[0]!); await expect(card).toContainText('risque de décharge');
    await saveResume(page, prepared); await capture('preparedReload', prepared);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(() => { if (!window.__lisiere.world.rainElectrical?.discharges) return false; document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click(); return true; }, undefined, { polling: 'raf', timeout: 20_000 });
    await pause(page); const struck = await world(page), battery = struck.structures.find(s => s.id === batteryId)!;
    expect(struck.rainElectrical).toMatchObject({ adoptedAt: 0, discharges: 1, lastDischarge: { coreTick: 97, structureId: batteryId, kind: 'battery' } });
    expect(battery.damage).toBeGreaterThan(0); expect(struck.fires?.ledger.ignitions).toBeGreaterThan(0);
    const strikeFrame = await capture('contact', struck); expect(strikeFrame.pipelines).toBe(initial.pipelines);
    expect(strikeFrame.fireGeometry).toBe(initial.fireGeometry); expect(strikeFrame.fireCapacity).toBe(initial.fireCapacity);
    await zoomContact(page, [battery]); await inspect(page, battery);
    await page.screenshot({ path: testOutputPath('artifacts/rain-electric-v194-contact-iso.png') });
    await page.locator('#camera-mode').click(); await zoomContact(page, [battery]);
    await page.screenshot({ path: testOutputPath('artifacts/rain-electric-v194-contact-perspective.png') });
    await page.locator('#camera-mode').click(); await saveResume(page, struck); await capture('contactReload', struck);

    // Stop another exposed consumer by real contact; a request is not immunity.
    await act({ type: 'priority', pawnId, work: 'basic', value: 1 }, 'Permettre le contact physique avec l’interrupteur.');
    await act({ type: 'power-flick', structureId: exposedId, on: false }, 'Demander l’arrêt depuis l’inspection, sans arrêter à distance.');
    const requested = await world(page); expect(requested.structures.find(s => s.id === exposedId)!.power!.switchOn).not.toBe(false);
    expect(requested.jobs.some(j => j.flick?.structureId === exposedId)).toBe(true); await saveResume(page, requested);
    // Give the player a genuine fire task immediately, before waiting on rain.
    const current = await world(page), fire = current.fires!.items.find(f => f.attachedPawnId === undefined && f.attachedAnimalId === undefined)!;
    expect(fire).toBeDefined();
    await act({ type: 'order-extinguish', pawnId, fireId: fire.id }, 'Rejoindre et battre un feu réellement produit par la décharge.');
    await page.keyboard.press('Escape'); await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id => { const p = window.__lisiere.world.pawns.find(p => p.id === id); if (p?.firefighting?.phase !== 'beat') return false; document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click(); return true; }, pawnId, { polling: 'raf', timeout: 25_000 });
    await pause(page); const beating = await world(page), worker = beating.pawns.find(p => p.id === pawnId)!;
    const attended = beating.fires!.items.find(f => f.id === worker.firefighting!.fireId)!;
    expect(fireTouch(beating, worker, attended)).toBe(true); await capture('extinctionContact', beating);
    await page.screenshot({ path: testOutputPath('artifacts/rain-electric-v194-extinction.png') }); await saveResume(page, beating);
    // Independent construction worker: roofing and repairs use real jobs.
    const builderId = prepared.pawns[1]!.id;
    await act({ type: 'priority', pawnId: builderId, work: 'build', value: 1 }, 'Construire le toit puis réparer les dégâts avec un colon.');
    await act({ type: 'priority', pawnId, work: 'firefight', value: 1 }, 'Continuer l’extinction dans le foyer préparé.');
    await act({ type: 'area', action: 'build-roof', from: RAIN_ELECTRIC_CELLS.battery, to: RAIN_ELECTRIC_CELLS.battery }, 'Recouvrir réellement l’ancrage soutenu par le mur adjacent.');
    expect((await world(page)).roofing!.constructed).not.toContain(10 * 32 + 10);
    await page.keyboard.press('Escape'); await page.locator('[data-speed="1"]').click();
    await expect.poll(async () => (await world(page)).roofing?.constructed.includes(10 * 32 + 10), { timeout: 35_000 }).toBe(true);
    await expect.poll(async () => (await world(page)).structures.find(s => s.id === exposedId)?.power?.switchOn, { timeout: 35_000 }).toBe(false);
    await expect.poll(async () => (await world(page)).structures.find(s => s.id === batteryId)?.damage ?? 0, { timeout: 45_000 }).toBe(0);
    await expect.poll(async () => (await world(page)).fires?.items.length ?? 0, { timeout: 30_000 }).toBe(0);
    await pause(page); const recovered = await world(page), intact = recovered.structures.find(s => s.id === batteryId)!;
    expect(intact).toBeDefined(); expect(rainElectricalEligible(recovered, intact)).toBe(false);
    expect(recovered.fires!.ledger.extinguished).toBeGreaterThan(struck.fires!.ledger.extinguished);
    expect(recovered.pawns.find(p => p.id === builderId)!.skills.construction.xp).toBeGreaterThan(prepared.pawns[1]!.skills.construction.xp);
    const protectedCard = await inspect(page, intact); await expect(protectedCard).toContainText('protégé par le toit');
    await page.screenshot({ path: testOutputPath('artifacts/rain-electric-v194-protected.png') });
    await capture('recovered', recovered); await saveResume(page, recovered); const final = await capture('recoveredReload', recovered);
    expect(final.pipelines).toBe(initial.pipelines); expect(final.pawnGeometry).toBe(initial.pawnGeometry); expect(final.pawnInstances).toBe(initial.pawnInstances);
    expect(final.fireGeometry).toBe(initial.fireGeometry); expect(final.fireCapacity).toBe(initial.fireCapacity);
    expect(errors).toEqual([]); await expect(page.locator('#fps-counter')).toBeVisible();
    await writeTestFile('artifacts/rain-electric-v194-native.json', JSON.stringify({ prepared: true, catalogueEntries: TEST_COLONY_COUNT, browser: browser.version(), hardware, stages, errors, limits: 'Prepared32², actual public save/menu, physical worker actions and exact reloads. Pipeline/geometry/capacity and cumulative buffer allocation observations are not GPU timings, zero-cost or general performance proof. Extinction contact is required separately from rain extinguishment. No natural-frequency or long-campaign claim.' }, null, 2));
  } catch (error) {
    const state = await world(page).catch(() => undefined);
    if (state) await writeTestFile('artifacts/rain-electric-v194-failure-world.json', JSON.stringify(state));
    await page.screenshot({ path: testOutputPath('artifacts/rain-electric-v194-failure.png') }).catch(() => {});
    await writeTestFile('artifacts/rain-electric-v194-failure.json', JSON.stringify({ error: String(error), tick: state?.tick, validation: state ? validateWorld(state) : undefined, stages, errors }, null, 2));
    throw error;
  } finally { await browser.close(); }
});
