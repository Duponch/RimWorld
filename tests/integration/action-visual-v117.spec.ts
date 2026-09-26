import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { applyCommand, refreshStock, serializeWorld, validateWorld } from '../../src/sim/index';
import { addMaterial } from '../../src/sim/materials';
import type { World } from '../../src/sim/types';
import { deconstructionCamp } from '../scenarios/deconstruction';
import { miningCamp } from '../scenarios/mining';
import { stonecuttingCamp } from '../scenarios/stonecutting';
import { expectWorld, observeErrors, panel, pause, saveKey, world } from './helpers';

type Gesture = 'mine' | 'chop' | 'build' | 'craft';
const expectedPhase: Record<Gesture, number> = { mine: 11, chop: 12, build: 13, craft: 14 };

// Observe the submitted resident pose and the actual tree range deformation after each rendered frame.
const probe = `
window.__v117={view:null,active:false,pauseOnLow:false,lowCaptured:false,pauseOnTree:false,treeCaptured:false,capturedTreeAngle:0,frames:[]};
const original=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
  const result=original.call(this,now),b=window.__v117;b.view=this;
  if(!b.active||this.preparing||!this.world?.pawns[0])return result;
  const p=this.world.pawns[0],g=this.pawns.pawnMesh?.geometry;
  if(!g)return result;
  const job=this.world.jobs.find(j=>j.id===p.jobId),motion=g.getAttribute('aMotion');
  const from=g.getAttribute('aFrom'),to=g.getAttribute('aTo'),travel=g.getAttribute('aTravel');
  const clock=this.pawns.travelTime.value,segment=travel.getY(0)>travel.getX(0);
  const turnStart=travel.getW(0)>1?travel.getZ(0):travel.getX(0);
  const turnAlpha=travel.getW(0)>1||segment?Math.max(0,Math.min(1,(clock-turnStart)/.24)):this.pawns.blend.value;
  const heading=from.getW(0)+(to.getW(0)-from.getW(0))*turnAlpha;
  const hits=[...this.resources.treeHits.values()];
  b.frames.push({now,tick:this.world.tick,presented:this.timeline.tick,state:p.state,
    jobKind:job?.kind??null,jobProgress:job?.progress??null,cookingPhase:p.cooking?.phase??null,
    cookingProgress:p.cooking?.progress??null,work:motion.getY(0),phase:motion.getZ(0),
    time:this.pawns.time.value,heading,treeAngle:hits[0]?.angle??0,treeHitCount:hits.length});
  if(b.pauseOnLow&&p.state==='working'&&motion.getZ(0)===16){
    b.pauseOnLow=false;b.lowCaptured=true;
    document.querySelector('[data-speed="0"]')?.click();
  }
  if(b.pauseOnTree&&Math.abs(hits[0]?.angle??0)>.02&&motion.getZ(0)===12&&
     b.frames.filter(f=>f.phase===12&&(f.jobProgress??0)>0).length>=3){
    b.pauseOnTree=false;b.treeCaptured=true;b.capturedTreeAngle=hits[0].angle;
  }
  return result;
};`;

function prepared(kind: Gesture): World {
  if (kind === 'mine' || kind === 'chop') {
    const w = miningCamp(1), p = w.pawns[0]!;
    p.schedule.fill('anything');
    p.priorities.mine = kind === 'mine' ? 1 : 0;
    p.priorities.gather = kind === 'chop' ? 1 : 0;
    const target = { x: p.x + 1, z: p.z };
    if (kind === 'mine') w.tiles[target.z * w.width + target.x] = { terrain: 'rock', stone: 'granite' };
    else w.resources.push({ id: w.nextId++, kind: 'tree', ...target, amount: 12 });
    expect(applyCommand(w, { type: 'designate', kind, ...target }).ok).toBe(true);
    refreshStock(w);
    return w;
  }
  if (kind === 'build') {
    const w = deconstructionCamp(1, 32), p = w.pawns[0]!;
    p.priorities.build = 1;
    addMaterial(w, 'wood', 5, { type: 'ground', x: p.x - 1, z: p.z }, 'wood');
    expect(applyCommand(w, { type: 'designate', kind: 'wall', material: 'wood', x: p.x + 1, z: p.z }).ok).toBe(true);
    refreshStock(w);
    return w;
  }
  const w = stonecuttingCamp(1, 32), p = w.pawns[0]!, station = w.structures[0]!;
  p.x = 14; p.z = 13; station.x = 14; station.z = 15;
  station.bills = [{ id: w.nextId++, recipe: 'stone-blocks', mode: 'times', target: 3, suspended: false,
    filters: { 'granite-chunk': true, 'limestone-chunk': true, 'marble-chunk': true, 'sandstone-chunk': true, 'slate-chunk': true },
    radius: 4, destination: 'stockpile' }];
  for (let i = 0; i < 3; i++) addMaterial(w, 'chunk', 1, { type: 'ground', x: 16, z: 12 + i }, 'granite-chunk');
  refreshStock(w);
  return w;
}

async function load(page: Page, initial: World): Promise<void> {
  expect(validateWorld(initial)).toEqual([]);
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: serializeWorld(initial) });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: probe + await response.text() });
  });
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);
  await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, initial);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !!(window as any).__v117?.view && !(window as any).__v117.view.preparing);
  await page.evaluate(({ x, z }) => {
    const v = (window as any).__v117.view;
    v.controls.enableDamping = false; v.rig.setMode('orthographic');
    v.controls.target.set(x, 0, z); v.camera.zoom = 6; v.camera.updateProjectionMatrix(); v.controls.update();
    (window as any).__v117.active = true;
  }, initial.pawns[0]!);
  expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
}

test('V117: real jobs show contact, low work and confirmed tree recoil', async ({ playwright }) => {
  test.setTimeout(180_000);
  mkdirSync('artifacts', { recursive: true });
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const reports: unknown[] = [];
  try {
    for (const kind of ['mine', 'chop', 'build', 'craft'] as const) {
      const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
      const errors = observeErrors(page), initial = prepared(kind), phase = expectedPhase[kind];
      try {
        await load(page, initial);
        if (kind === 'build' || kind === 'craft') await page.evaluate(() => { (window as any).__v117.pauseOnLow = true; });
        if (kind === 'chop') await page.evaluate(() => { (window as any).__v117.pauseOnTree = true; });
        await page.locator('[data-speed="1"]').click();
        if (kind === 'build' || kind === 'craft') {
          await page.waitForFunction(() => (window as any).__v117.lowCaptured,
            undefined, { timeout: 25_000, polling: 'raf' });
          await pause(page);
          expect(await page.evaluate(() => (window as any).__v117.frames.at(-1).phase)).toBe(16);
          await page.screenshot({ path: `artifacts/action-visual-v117-${kind}-low.png` });
          await page.locator('[data-speed="1"]').click();
        }
        let liveRecoil: { before: number; after: number } | null = null;
        if (kind === 'chop') {
          await page.waitForFunction(() => (window as any).__v117.treeCaptured,
            undefined, { timeout: 25_000, polling: 'raf' });
          const before = await page.evaluate(() => (window as any).__v117.frames.at(-1).treeAngle);
          await page.screenshot({ path: 'artifacts/action-visual-v117-chop-recoil-live.png' });
          const after = await page.evaluate(() => (window as any).__v117.frames.at(-1).treeAngle);
          liveRecoil = { before, after };
        }
        await page.waitForFunction(({ phase, kind }) => {
          const frames = (window as any).__v117.frames as any[];
          const active = frames.filter(f => f.state === 'working' && f.work === 1 && f.phase === phase &&
            ((f.jobProgress ?? 0) > 0 || (f.cookingProgress ?? 0) > 0));
          const tree = kind !== 'chop' || (window as any).__v117.treeCaptured;
          if (active.length < 3 || !tree) return false;
          (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();
          return true;
        }, { phase, kind }, { timeout: 40_000, polling: 'raf' });
        await pause(page);
        const frames = await page.evaluate(() => (window as any).__v117.frames as any[]);
        const active = frames.filter(f => f.state === 'working' && f.work === 1 && f.phase === phase);
        expect(active.length).toBeGreaterThanOrEqual(3);
        expect(new Set(active.map(f => f.time)).size).toBeGreaterThan(1);
        const geometry = await page.evaluate(() => {
          const g = (window as any).__v117.view.pawns.pawnMesh.geometry;
          const entries = Object.entries(g.attributes).filter(([name]) => name !== 'aFire');
          return { instances: g.instanceCount, attributes: entries.length,
            buffers: new Set(entries.map(([, a]: [string, any]) => a.data ?? a)).size };
        });
        expect(geometry.instances).toBe(1);
        expect(geometry.attributes).toBeLessThanOrEqual(16);
        expect(geometry.buffers).toBeLessThanOrEqual(7);
        const saved = await world(page); expect(validateWorld(saved)).toEqual([]);
        expect(saved.tick).toBeGreaterThan(initial.tick);
        await page.screenshot({ path: `artifacts/action-visual-v117-${kind}.png` });
        if (kind === 'build') {
          await page.evaluate(({ x, z }) => {
            const v = (window as any).__v117.view;
            v.focusCell({ x, z }); v.camera.position.set(x, 5, z - 6);
            v.camera.zoom = 6; v.camera.updateProjectionMatrix(); v.controls.update();
          }, initial.pawns[0]!);
          await page.waitForTimeout(200);
          await page.screenshot({ path: 'artifacts/action-visual-v117-build-side.png' });
        }
        if (kind === 'chop') {
          await page.evaluate(({ x, z }) => {
            const v = (window as any).__v117.view;
            v.focusCell({ x, z }); v.camera.position.set(x, 5, z - 6);
            v.camera.zoom = 6; v.camera.updateProjectionMatrix(); v.controls.update();
          }, initial.pawns[0]!);
          await page.waitForTimeout(200);
          await page.screenshot({ path: 'artifacts/action-visual-v117-chop-side.png' });
        }
        // The pause command can still deliver its final confirmed tick after the UI button responds.
        await page.waitForTimeout(350);
        const paused = await page.evaluate(() => {
          const b = (window as any).__v117, f = b.frames.at(-1);
          return { tick: f.tick, time: f.time, treeAngle: f.treeAngle };
        });
        await page.waitForTimeout(350);
        const pausedLater = await page.evaluate(() => {
          const b = (window as any).__v117, f = b.frames.at(-1);
          return { tick: f.tick, time: f.time, treeAngle: f.treeAngle };
        });
        expect(pausedLater).toEqual(paused);
        if (kind === 'chop') {
          expect(await page.evaluate(() => (window as any).__v117.treeCaptured)).toBe(true);
          expect(Math.abs(await page.evaluate(() => (window as any).__v117.capturedTreeAngle))).toBeGreaterThan(.02);
        }
        const allFrames = await page.evaluate(() => (window as any).__v117.frames as any[]);
        const headingSteps = allFrames.slice(1).flatMap((f, i) => {
          const previous = allFrames[i]!;
          return f.now - previous.now < 100 ? [Math.abs(Math.atan2(
            Math.sin(f.heading - previous.heading), Math.cos(f.heading - previous.heading)))] : [];
        });
        const maxHeadingStep = Math.max(0, ...headingSteps);
        expect(maxHeadingStep).toBeLessThan(.75);
        reports.push({ kind, tick: saved.tick, expectedPhase: phase,
          observedPhases: [...new Set(allFrames.filter(f => f.state === 'working').map(f => f.phase))],
          activeFrames: active.length, lowFrames: allFrames.filter(f => f.phase === 16).length,
          treeRecoilFrames: allFrames.filter(f => Math.abs(f.treeAngle) > .0001).length,
          peakTreeAngle: Math.max(...allFrames.map(f => Math.abs(f.treeAngle))),
          capturedTreeAngle: kind === 'chop' ? await page.evaluate(() => (window as any).__v117.capturedTreeAngle) : null,
          liveRecoil,
          maxHeadingStep,
          geometry, paused, errors });
        expect(errors).toEqual([]);
      } finally { await page.close(); }
    }
    writeFileSync('artifacts/action-visual-v117.json', JSON.stringify({ date: new Date().toISOString(),
      protocol: 'Native Chromium WebGPU; four 32² prepared jobs performed by the real worker at 1× to capture brief presentation phases. Close orthographic screenshots cover each job, the low poses and tree/build side views. Poses, tree recoil and pause sampled after rendered frames; save and resident geometry checked. No long simulation or GPU timer.',
      reports }, null, 2) + '\n');
  } finally { await browser.close(); }
});
