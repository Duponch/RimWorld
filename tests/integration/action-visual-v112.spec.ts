import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { applyCommand, refreshStock, serializeWorld, validateWorld } from '../../src/sim/index';
import { addMaterial } from '../../src/sim/materials';
import type { World } from '../../src/sim/types';
import { deconstructionCamp } from '../scenarios/deconstruction';
import { miningCamp } from '../scenarios/mining';
import { stonecuttingCamp } from '../scenarios/stonecutting';
import { firingCamp } from '../scenarios/shooting';
import { animalCombatCamp } from '../scenarios/animal-combat';
import { expectWorld, observeErrors, panel, pause, pawnTab, saveKey, world } from './helpers';

type Gesture = 'mine' | 'chop' | 'build' | 'craft';

// Samples the attributes submitted to WebGPU after the ordinary worker snapshot.
// The shader output is also captured as a real browser screenshot below.
const probe = `
window.__actionVisual={view:null,active:false,frames:[]};
const actionVisualFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
  const result=actionVisualFrame.call(this,now),b=window.__actionVisual;b.view=this;
  if(!b.active||this.preparing||!this.world?.pawns[0])return result;
  const g=this.pawns.pawnMesh?.geometry;if(!g)return result;
  const p=this.world.pawns[0],job=this.world.jobs.find(j=>j.id===p.jobId);
  const motion=g.getAttribute('aMotion'),from=g.getAttribute('aFrom'),to=g.getAttribute('aTo'),travel=g.getAttribute('aTravel'),equipment=g.getAttribute('aEquipment');
  const animal=this.world.wildlife?.animals.find(a=>a.species==='hare');
  const rig=this.wildlife.mesh.children.find(child=>child.name==='Wild hare — GPU rig');
  const ag=rig?.geometry,af=ag?.getAttribute('aFrom'),at=ag?.getAttribute('aTo'),ar=ag?.getAttribute('aTravel');
  const projectile=this.projectiles.mesh.geometry,bullet=projectile.getAttribute('bulletTime');
  let projectileActive=0;
  for(let i=0;i<projectile.instanceCount;i++)if(this.projectiles.tick.value>=bullet.getX(i)&&this.projectiles.tick.value<bullet.getY(i))projectileActive++;
  b.frames.push({now,tick:this.world.tick,presented:this.timeline.tick,id:p.id,state:p.state,
    jobKind:job?.kind??null,jobProgress:job?.progress??null,cookingPhase:p.cooking?.phase??null,
    cookingProgress:p.cooking?.progress??null,work:motion.getY(0),phase:motion.getZ(0),
    yawFrom:from.getW(0),yawTo:to.getW(0),travelStart:travel.getX(0),travelEnd:travel.getY(0),
    travelClock:this.pawns.travelTime.value,blend:this.pawns.blend.value,
    rigTime:this.pawns.time.value,phaseOrigin:motion.getW(0),equipment:equipment.getX(0),
    projectileActive,drawCalls:this.stats.drawCalls,
    animal:animal&&ag?.instanceCount?{id:animal.id,state:animal.state,x:animal.x,z:animal.z,
      yawFrom:af.getW(0),yawTo:at.getW(0),travelStart:ar.getX(0),travelEnd:ar.getY(0),
      travelClock:this.wildlife.travelTime.value}:null});
  return result;
};`;

function preparedGesture(kind: Gesture): World {
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
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);
  await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, initial);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !!(window as any).__actionVisual?.view && !(window as any).__actionVisual.view.preparing);
  await page.evaluate(({ x, z }) => {
    const v = (window as any).__actionVisual.view;
    v.controls.enableDamping = false; v.rig.setMode('orthographic');
    v.controls.target.set(x, 0, z); v.camera.zoom = 6; v.camera.updateProjectionMatrix(); v.controls.update();
    (window as any).__actionVisual.active = true;
  }, initial.pawns[0]!);
}

test('V112: four real jobs select four resident GPU gestures without changing the save', async ({ playwright }) => {
  test.setTimeout(180_000);
  mkdirSync('artifacts', { recursive: true });
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const reports: unknown[] = [], phases = new Map<Gesture, number>();
  try {
    for (const kind of ['mine', 'chop', 'build', 'craft'] as const) {
      const expectedPhase={mine:11,chop:12,build:13,craft:14}[kind];
      const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
      const errors = observeErrors(page), initial = preparedGesture(kind);
      try {
        await page.route('**/src/main.ts*', async route => {
          const response = await route.fetch();
          await route.fulfill({ response, body: probe + await response.text() });
        });
        await load(page, initial);
        expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
        await page.locator('[data-speed="6"]').click();
        await page.waitForFunction(({expectedPhase}) => {
          const frames = (window as any).__actionVisual.frames as any[];
          const active = frames.filter(f => f.state === 'working' && f.work === 1 && f.phase === expectedPhase &&
            ((f.jobProgress ?? 0) > 0 || (f.cookingProgress ?? 0) > 0));
          if (active.length < 3) return false;
          (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();
          return true;
        }, {expectedPhase}, { timeout: 40_000, polling: 'raf' });
        await pause(page);
        const frames = await page.evaluate(() => (window as any).__actionVisual.frames as any[]);
        const active = frames.filter(f => f.state === 'working' && f.work === 1 && f.phase > 10);
        expect(active.length).toBeGreaterThanOrEqual(3);
        const modes = [...new Set(active.map(f => f.phase))];
        expect(modes).toContain(expectedPhase);
        expect(modes.every(phase=>phase===expectedPhase||phase===16&&(kind==='build'||kind==='craft'))).toBe(true);
        phases.set(kind, expectedPhase);
        expect(new Set(active.map(f => f.rigTime)).size).toBeGreaterThan(1);
        const geometry = await page.evaluate(() => {
          const g = (window as any).__actionVisual.view.pawns.pawnMesh.geometry;
          const shaderEntries = Object.entries(g.attributes).filter(([name]) => name !== 'aFire');
          return { instances: g.instanceCount, attributes: Object.keys(g.attributes).length,
            shaderAttributes: shaderEntries.length,
            shaderBuffers: new Set(shaderEntries.map(([, a]: [string, any]) => a.data ?? a)).size };
        });
        expect(geometry.instances).toBe(1);
        expect(geometry.shaderAttributes).toBeLessThanOrEqual(16);
        expect(geometry.shaderBuffers).toBeLessThanOrEqual(7);
        const saved = await world(page); expect(validateWorld(saved)).toEqual([]);
        expect(saved.tick).toBeGreaterThan(initial.tick);
        await page.screenshot({ path: `artifacts/action-visual-v112-${kind}.png` });
        if (kind === 'chop') {
          await page.evaluate(({ x, z }) => {
            const v = (window as any).__actionVisual.view;
            v.focusCell({ x, z }); v.camera.position.set(x, 5, z - 6);
            v.camera.zoom = 6; v.camera.updateProjectionMatrix(); v.controls.update();
          }, initial.pawns[0]!);
          await page.waitForTimeout(200);
          await page.screenshot({ path: 'artifacts/action-visual-v112-chop-side.png' });
        }
        reports.push({ kind, tick: saved.tick, phase: expectedPhase, observedPhases:modes, workFrames: active.length,
          jobKinds: [...new Set(active.map(f => f.jobKind).filter(Boolean))],
          cookingPhases: [...new Set(active.map(f => f.cookingPhase).filter(Boolean))],
          geometry, errors });
        expect(errors).toEqual([]);
      } finally { await page.close(); }
    }
    expect(new Set(phases.values()).size).toBe(4);
    writeFileSync('artifacts/action-visual-v112.json', JSON.stringify({ date: new Date().toISOString(),
      protocol: 'Native Chromium WebGPU, four separate 32² prepared jobs. Each work state and progress comes from the real worker at 6×; aMotion and resident buffer counts are observed after frame rendering. Screenshots show the paused work state. This is not a long colony run or a GPU timer.',
      phases: Object.fromEntries(phases), reports }, null, 2) + '\n');
  } finally { await browser.close(); }
});

test('V112: physical rifle stays visible at rest, in a real shot, and in the cached avatar', async ({ playwright }) => {
  test.setTimeout(100_000);
  mkdirSync('artifacts', { recursive: true });
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    const initial = firingCamp(), shooter = initial.pawns[0]!, target = initial.pawns[1]!;
    initial.piles = initial.piles.filter(p => !(p.kind === 'weapon' && p.owner.type === 'equipment' && p.owner.pawnId === shooter.id));
    addMaterial(initial, 'weapon', 1, { type: 'equipment', pawnId: shooter.id }, 'bolt-action-rifle');
    refreshStock(initial);
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: probe + await response.text() });
    });
    await load(page, initial);
    await page.locator(`[data-pawn="${shooter.id}"]`).click(); await pawnTab(page, 'bio');
    const avatar = await page.locator('.appearance-inspection img').getAttribute('src');
    expect(avatar).toContain('data:image/svg+xml');
    const portrait = await page.evaluate(async id => {
      const w = window.__lisiere.world, p = w.pawns.find(p => p.id === id)!;
      const { portraitDataUrl } = await import('../../src/ui/pawn-portrait.ts');
      const { appearanceOf } = await import('../../src/sim/pawn-appearance.ts');
      const { apparelProjection, apparelAppearance } = await import('../../src/render/character-apparel.ts');
      const { pawnBaseColor } = await import('../../src/render/pawn-appearance-shape.ts');
      const rawLook = apparelAppearance(apparelProjection(w).get(id));
      const look = { ...rawLook, color: rawLook.color ?? pawnBaseColor(p.id) };
      const appearance = appearanceOf(p, w.seed);
      return { armed: portraitDataUrl(appearance, look, 'bolt-action-rifle'),
        bare: portraitDataUrl(appearance, look) };
    }, shooter.id);
    expect(portrait.armed).not.toBe(portrait.bare);
    expect(avatar).toBe(portrait.armed);
    expect(decodeURIComponent(avatar!)).toContain('data-weapon="bolt-action-rifle"');
    const rest = await page.evaluate(() => {
      const v = (window as any).__actionVisual.view, g = v.pawns.pawnMesh.geometry;
      return { equipment: g.getAttribute('aEquipment').getX(0), phase: g.getAttribute('aMotion').getZ(0),
        draws: v.stats.drawCalls };
    });
    expect(rest.equipment).toBe(2);
    await page.screenshot({ path: 'artifacts/action-visual-v112-rifle-rest.png' });
    const ordered = structuredClone(initial);
    expect(applyCommand(ordered, { type: 'shoot', pawnIds: [shooter.id], targetId: target.id }).ok).toBe(true);
    expect(validateWorld(ordered)).toEqual([]);
    await page.evaluate(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: serializeWorld(ordered) });
    await panel(page, 'menu'); await page.locator('#load').click(); await expectWorld(page, ordered);
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(() => {
      const b = (window as any).__actionVisual, last = b.frames.at(-1);
      if (!last || last.phase !== 7 || last.equipment !== 2) return false;
      (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();
      return true;
    }, undefined, { timeout: 20_000, polling: 'raf' });
    await pause(page);
    const aimed = await world(page); expect(validateWorld(aimed)).toEqual([]);
    const shooting = await page.evaluate(() => (window as any).__actionVisual.frames.filter((f: any) => f.phase === 7));
    expect(shooting.length).toBeGreaterThan(0);
    expect(shooting.every((f: any) => f.equipment === 2)).toBe(true);
    await page.screenshot({ path: 'artifacts/action-visual-v112-rifle-aim.png' });
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(() => (window as any).__actionVisual.frames.some((f: any) => f.phase === 15 && f.equipment === 2),
      undefined, { timeout: 20_000, polling: 'raf' });
    const firstRecoil = await page.evaluate(() => {
      const frames = (window as any).__actionVisual.frames as any[];
      return frames.some(f => f.phase === 15 && f.travelClock - f.phaseOrigin >= 0 &&
        f.travelClock - f.phaseOrigin < .30);
    });
    if (firstRecoil) await page.screenshot({ path: 'artifacts/action-visual-v112-rifle-recoil.png' });
    await expect.poll(async () => (await world(page)).pawns[0]!.lastAttack?.targetId).toBe(target.id);
    await pause(page);
    const afterShot = await world(page); expect(validateWorld(afterShot)).toEqual([]);
    const shotFrames = await page.evaluate(() => (window as any).__actionVisual.frames as any[]);
    const cooldown = shotFrames.filter(f => f.phase === 15);
    const recoil = cooldown.filter(f => f.travelClock - f.phaseOrigin >= 0 &&
      f.travelClock - f.phaseOrigin < .30);
    const elapsed = cooldown.map(f => f.travelClock - f.phaseOrigin);
    expect(shotFrames.some(f => f.phase === 15 && f.equipment === 2)).toBe(true);
    expect(recoil.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    writeFileSync('artifacts/action-visual-v112-rifle.json', JSON.stringify({
      date: new Date().toISOString(), backend: await page.evaluate(() => window.__lisiere.backend),
      aimTick: aimed.tick, shotTick: afterShot.tick, shooter: shooter.id, target: target.id,
      rest, aimFrames: shooting.length, cooldownFrames: cooldown.length,
      recoilWindowFrames: recoil.length, recoilWindowSeconds: .30,
      firstRecoilFactor: recoil.length ? Math.max(0, 1 - (recoil[0]!.travelClock - recoil[0]!.phaseOrigin) / .30) : null,
      priorDiagnostic: 'The original 0.13 s cosmetic window had no visible sample: first cooldown frame was +0.1345 s. V112 widened only the render recoil to 0.30 s.',
      firstCooldownElapsedSeconds: elapsed[0] ?? null,
      cooldownElapsedRangeSeconds: elapsed.length ? [Math.min(...elapsed), Math.max(...elapsed)] : null,
      firstCooldownSamples: cooldown.slice(0, 5).map(f => ({ worldTick: f.tick,
        timelineTick: f.presented, travelTime: f.travelClock,
        phaseOrigin: f.phaseOrigin, elapsedSeconds: f.travelClock - f.phaseOrigin })),
      projectileFrames: shotFrames.filter(f => f.projectileActive > 0).length,
      lastAttack: afterShot.pawns[0]!.lastAttack,
      armedAvatarBytes: portrait.armed.length, avatarDiffersFromBare: portrait.armed !== portrait.bare, errors,
    }, null, 2) + '\n');
  } finally { await page.close(); await browser.close(); }
});

test('V112: colonist and hare turn through intermediate WebGPU headings on real travel edges', async ({ playwright }) => {
  test.setTimeout(90_000);
  mkdirSync('artifacts', { recursive: true });
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    const initial = animalCombatCamp();
    initial.pawns = initial.pawns.slice(0, 1);
    const pawn = initial.pawns[0]!, animal = initial.wildlife!.animals[0]!;
    pawn.x = 10; pawn.z = 10;
    animal.x = 20; animal.z = 20; animal.state = 'moving'; animal.food = .2; animal.rest = 1;
    animal.path = [{ x: 21, z: 20 }, { x: 22, z: 20 }, { x: 23, z: 20 },
      { x: 23, z: 21 }, { x: 23, z: 22 }, { x: 23, z: 23 }];
    animal.nextDecision = initial.tick + 100;
    expect(applyCommand(initial, { type: 'draft-move', pawnIds: [pawn.id], target: { x: 13, z: 10 }, queue: false }).ok).toBe(true);
    expect(applyCommand(initial, { type: 'draft-move', pawnIds: [pawn.id], target: { x: 13, z: 14 }, queue: true }).ok).toBe(true);
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: probe + await response.text() });
    });
    await load(page, initial);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(() => {
      const frames = (window as any).__actionVisual.frames as any[];
      const inTurn = (f: any) => f && f.travelEnd > f.travelStart &&
        Math.abs(f.yawTo - f.yawFrom) > .5 &&
        (f.travelClock - f.travelStart) / .24 > .1 &&
        (f.travelClock - f.travelStart) / .24 < .9;
      if (frames.filter(inTurn).length < 3 || frames.filter(f => inTurn(f.animal)).length < 3) return false;
      (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();
      return true;
    }, undefined, { timeout: 40_000, polling: 'raf' });
    await pause(page);
    const frames = await page.evaluate(() => (window as any).__actionVisual.frames as any[]);
    const turns = (items: any[]) => items.filter(f => f && f.travelEnd > f.travelStart &&
      Math.abs(f.yawTo - f.yawFrom) > .5 && (f.travelClock - f.travelStart) / .24 > .1 &&
      (f.travelClock - f.travelStart) / .24 < .9);
    const human = turns(frames), hare = turns(frames.map(f => f.animal));
    for (const samples of [human, hare]) {
      expect(samples.length).toBeGreaterThanOrEqual(3);
      const headings = samples.map(f => f.yawFrom + (f.yawTo - f.yawFrom) *
        Math.max(0, Math.min(1, (f.travelClock - f.travelStart) / .24)));
      expect(new Set(headings.map(h => Math.round(h * 100))).size).toBeGreaterThan(2);
      for (const f of samples) expect(Number.isFinite(f.yawFrom) && Number.isFinite(f.yawTo)).toBe(true);
    }
    const saved = await world(page); expect(validateWorld(saved)).toEqual([]);
    expect(saved.tick).toBeGreaterThan(initial.tick);
    expect(saved.pawns[0]!.x !== pawn.x || saved.pawns[0]!.z !== pawn.z).toBe(true);
    expect(saved.wildlife!.animals[0]!.x !== animal.x || saved.wildlife!.animals[0]!.z !== animal.z).toBe(true);
    await page.screenshot({ path: 'artifacts/action-visual-v112-turns.png' });
    expect(errors).toEqual([]);
    writeFileSync('artifacts/action-visual-v112-turns.json', JSON.stringify({ date: new Date().toISOString(),
      protocol: 'Prepared orthogonal human order queue and hare path; the ordinary worker advances both physical edges at 1×. Intermediate headings are read from the WebGPU pose attributes and shared travel clock, not inferred from cell positions.',
      tick: saved.tick, humanSamples: human.length, animalSamples: hare.length, errors }, null, 2) + '\n');
  } finally { await page.close(); await browser.close(); }
});
