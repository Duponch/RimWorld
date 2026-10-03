import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PREDATION_FOX_CELL, PREDATION_HARE_CELL } from '../../scripts/create-test-save-predation-v190.ts';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import type { World } from '../../src/sim/types.ts';
import { expectWorld, observeErrors, panel, pause, world } from './helpers.ts';
import { revealCells } from './player-actions.ts';
import { TEST_COLONY_COUNT } from '../test-colony-count.ts';
import { testOutputPath, writeTestFile } from '../test-output.ts';

interface Pose { id: number; species: string; x: number; y: number; z: number }
interface Frame { now: number; tick: number; clock: number; poses: Pose[]; calls: number }
interface Probe { pipelines: number; compiled: { name: string; label?: string; vertex?: string; fragment?: string }[]; frames: Frame[] }

// Read the existing resident pose attributes after rendering; never change World.
const frameProbe = `
const predationFrame = ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame = function(now) {
  const result = predationFrame.call(this, now);
  if (this.preparing || !this.world || !window.predationProbe) return result;
  const poses = [];
  this.wildlife.forEachPose((id, species, x, y, z) => poses.push({id, species, x, y, z}));
  const frames = window.predationProbe.frames;
  frames.push({now, tick:this.world.tick, clock:this.timeline.tick, poses, calls:this.stats.drawCalls});
  if (frames.length > 8192) frames.shift();
  return result;
};`;

async function savedThroughUI(page: Page, expected: World): Promise<void> {
  await panel(page, 'menu');
  await page.locator('#save').click(); await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
  await page.locator('#load').click(); await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page, expected); await page.keyboard.press('Escape');
}
async function renderedFrame(page: Page, tick: number): Promise<Frame> {
  await expect.poll(() => page.evaluate(tick => {
    const probe = (window as unknown as { predationProbe: Probe }).predationProbe;
    const frame = probe.frames.at(-1);
    return !!frame && frame.tick === tick && Math.abs(frame.clock - tick) < .001;
  }, tick)).toBe(true);
  return page.evaluate(() => (window as unknown as { predationProbe: Probe }).predationProbe.frames.at(-1)!);
}

test('V190 public living fox hunts and ingests in native WebGPU, with UI save/resume during pursuit and ingestion', async ({ playwright }) => {
  test.setTimeout(150_000);
  const prepared = deserializeWorld(readFileSync('public/test-saves/v190/predation.json', 'utf8'));
  const fox = prepared.wildlife!.animals.find(a => a.species === 'red-fox')!;
  const prey = prepared.wildlife!.animals.find(a => a.species === 'hare')!;
  expect(fox.predation).toBeUndefined(); expect(fox.health!.injuries).toEqual([]);
  expect(prey.health!.injuries).toEqual([]); expect(prey.domestic).toBeDefined();
  expect(prepared.piles).toEqual([]);
  const gpuProbe = process.env.LISIERE_PREDATION_GPU_PROBE === '1';
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page), checkpoints: Record<string, number> = {}, pipelineStages: Record<string, number> = {};
  try {
    if (gpuProbe) {
      await page.addInitScript(() => {
        const probe: Probe = { pipelines: 0, compiled: [], frames: [] };
        Object.assign(window, { predationProbe: probe });
        const sources = new WeakMap<GPUShaderModule, string>(), shader = GPUDevice.prototype.createShaderModule;
        GPUDevice.prototype.createShaderModule = function(descriptor) {
          const module = shader.call(this, descriptor); sources.set(module, descriptor.code); return module;
        };
        for (const name of ['createRenderPipeline', 'createRenderPipelineAsync'] as const) {
          const original = GPUDevice.prototype[name];
          (GPUDevice.prototype[name] as unknown) = function (this: GPUDevice, ...args: unknown[]) {
            const descriptor = args[0] as GPURenderPipelineDescriptor;
            probe.pipelines++; probe.compiled.push({ name, label: descriptor.label,
              vertex: sources.get(descriptor.vertex.module), fragment: descriptor.fragment && sources.get(descriptor.fragment.module) });
            return (original as Function).apply(this, args);
          };
        }
      });
      await page.route('**/src/main.ts*', async route => {
        const response = await route.fetch(); await route.fulfill({ response, body: frameProbe + await response.text() });
      });
    }
    await page.goto('/?e2e'); const front = page.locator('.front-menu');
    await front.getByRole('button', { name: 'Charger une partie', exact: true }).click();
    await front.getByRole('button', { name: 'Colonies de test' }).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator('input[name="test-colony"][value="predation-v190"]').check();
    await front.getByRole('button', { name: 'Charger cette colonie' }).click();
    await expectWorld(page, prepared); expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
    const hardware = await page.evaluate(async () => {
      const adapter = await navigator.gpu?.requestAdapter();
      return { backend: window.__lisiere.backend, userAgent: navigator.userAgent,
        adapter: adapter ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device, description: adapter.info.description } : null };
    });
    await revealCells(page, [PREDATION_FOX_CELL, PREDATION_HARE_CELL]);
    await panel(page, 'wildlife'); await page.locator(`[data-animal="${fox.id}"] button`).first().click();
    await expect(page.locator('[data-animal-title]')).toContainText(/renard roux/i);
    if (gpuProbe) {
      await renderedFrame(page, prepared.tick);
      pipelineStages.prepared = await page.evaluate(() => (window as unknown as { predationProbe: Probe }).predationProbe.pipelines);
    }
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id => {
      const a = window.__lisiere.world.wildlife?.animals.find(a => a.id === id);
      if (!a?.predation || !a.motion || a.strike) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click(); return true;
    }, fox.id, { polling: 'raf' });
    await pause(page); const chase = await world(page); checkpoints.chase = chase.tick;
    expect(validateWorld(chase)).toEqual([]);
    expect(chase.wildlife!.animals.find(a => a.id === fox.id)!.predation!.targetId).toBe(prey.id);
    expect(chase.wildlife!.eatenNutrition).toBe(0);
    await panel(page, 'wildlife');
    await expect(page.locator(`[data-animal-activity="${fox.id}"]`)).toContainText(/Poursuit|Attaque/);
    await page.keyboard.press('Escape');
    await revealCells(page, chase.wildlife!.animals.map(a => ({ x: a.x, z: a.z })));
    await page.screenshot({ path: testOutputPath('artifacts/predation-v190-chase-iso.png') });
    const savedPose = gpuProbe ? await renderedFrame(page, chase.tick) : undefined;
    await savedThroughUI(page, chase);
    if (gpuProbe) {
      const reloaded = await renderedFrame(page, chase.tick);
      for (const pose of savedPose!.poses) {
        const actual = reloaded.poses.find(p => p.id === pose.id)!;
        expect(actual).toBeDefined(); expect(actual.x).toBeCloseTo(pose.x, 5); expect(actual.z).toBeCloseTo(pose.z, 5);
      }
      pipelineStages.chaseReload = await page.evaluate(() => (window as unknown as { predationProbe: Probe }).predationProbe.pipelines);
    }
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({ foxId, preyId }) => {
      const w = window.__lisiere.world, a = w.wildlife?.animals.find(a => a.id === foxId);
      if (a?.state !== 'eating' || a.meal?.id !== preyId || a.meal.progress <= 0 || !w.piles.some(p => p.id === preyId && p.corpse)) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click(); return true;
    }, { foxId: fox.id, preyId: prey.id }, { polling: 'raf', timeout: 60_000 });
    await pause(page); const eating = await world(page); checkpoints.eating = eating.tick;
    expect(validateWorld(eating)).toEqual([]);
    expect(eating.wildlife!.animals.some(a => a.id === prey.id)).toBe(false);
    const corpse = eating.piles.find(p => p.id === prey.id)!;
    expect(corpse).toMatchObject({ item: 'hare-corpse', quantity: 1, owner: { type: 'ground' }, corpse: { animalId: prey.id } });
    const feedingFox = eating.wildlife!.animals.find(a => a.id === fox.id)!;
    expect(corpse.owner.type).toBe('ground');
    if (corpse.owner.type === 'ground') {
      expect(Math.abs(feedingFox.x - corpse.owner.x) + Math.abs(feedingFox.z - corpse.owner.z)).toBeLessThanOrEqual(1);
    }
    expect(eating.wildlife!.eatenNutrition).toBe(0);
    await panel(page, 'wildlife'); await expect(page.locator(`[data-animal-activity="${fox.id}"]`)).toHaveText('Mange une dépouille');
    await page.keyboard.press('Escape'); await revealCells(page, [feedingFox]);
    await page.screenshot({ path: testOutputPath('artifacts/predation-v190-ingestion-iso.png') });
    await savedThroughUI(page, eating);
    await page.locator('#camera-mode').click(); await page.keyboard.press('Escape'); await revealCells(page, [feedingFox]);
    await page.screenshot({ path: testOutputPath('artifacts/predation-v190-ingestion-perspective.png') });
    if (gpuProbe) pipelineStages.ingestionReload = await page.evaluate(() => (window as unknown as { predationProbe: Probe }).predationProbe.pipelines);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(() => {
      if (!(window.__lisiere.world.wildlife!.eatenNutrition > 0)) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click(); return true;
    }, undefined, { polling: 'raf', timeout: 30_000 });
    await pause(page); const consumed = await world(page); checkpoints.consumed = consumed.tick;
    expect(validateWorld(consumed)).toEqual([]);
    expect(consumed.wildlife!.eatenNutrition).toBeGreaterThan(0);
    const remaining = consumed.piles.find(p => p.id === prey.id);
    if (remaining) {
      expect(remaining.quantity).toBe(1); expect(remaining.corpse!.consumedParts!.length).toBeGreaterThan(0);
      expect(remaining.corpse!.health).toEqual(corpse.corpse!.health);
    } else expect(consumed.wildlife!.eatenItems).toBe(1);
    await savedThroughUI(page, consumed);
    await page.screenshot({ path: testOutputPath('artifacts/predation-v190-consumed.png') });
    let probe: Probe | undefined;
    if (gpuProbe) {
      await renderedFrame(page, consumed.tick);
      probe = await page.evaluate(() => (window as unknown as { predationProbe: Probe }).predationProbe);
      pipelineStages.final = probe.pipelines;
      await writeTestFile('artifacts/predation-v190-gpu-probe.json', JSON.stringify({ hardware, pipelineStages, probe }, null, 2));
      expect(probe.pipelines).toBe(pipelineStages.prepared);
      const frames = probe.frames.filter(f => f.clock > chase.tick && f.clock <= eating.tick);
      expect(frames.length).toBeGreaterThan(10);
      let intervals = 0;
      for (let i = 1; i < frames.length; i++) {
        const a = frames[i - 1]!, b = frames[i]!, dt = b.clock - a.clock;
        if (dt <= 0 || dt > 2) continue;
        const previous = a.poses.find(p => p.id === fox.id), current = b.poses.find(p => p.id === fox.id);
        if (!previous || !current) continue;
        expect(Math.hypot(current.x - previous.x, current.z - previous.z)).toBeLessThanOrEqual(dt * 1.1 + .05); intervals++;
      }
      expect(intervals).toBeGreaterThan(10);
      await writeTestFile('artifacts/predation-v190-gpu-probe.json', JSON.stringify({ hardware, pipelineStages, probe }, null, 2));
    }
    expect(errors).toEqual([]);
    await writeTestFile('artifacts/predation-v190-browser.json', JSON.stringify({ date: new Date().toISOString(), prepared: true,
      protocol: 'Public prepared 32² scene, native Chromium with no forced software flags; ordinary worker at 1× then 6×, actual living prey and corpse ingestion, UI saves at confirmed paused checkpoints. Optional resident-pose/pipeline probe; no GPU timer or general performance claim.',
      node: process.version, platform: process.platform, architecture: process.arch, browser: browser.version(), hardware, gpuProbe,
      checkpoints, foxId: fox.id, preyId: prey.id, eatenNutrition: consumed.wildlife!.eatenNutrition, remainingParts: remaining?.corpse?.consumedParts,
      deathTick: corpse.corpse!.health.death!.tick, pipelineStages, errors }, null, 2));
  } finally { await browser.close(); }
});
