import { testOutputPath, testOutputDirectory } from '../test-output.ts';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { applyCommand, stepWorld } from '../../src/sim/engine';
import { deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/serialization';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import type { World } from '../../src/sim/types';
import { ACTION_FX, actionFxForPawn } from '../../src/render/ActionVfxLayer';
import { miningCamp } from '../scenarios/mining';
import { foodWorkstationCamp, fixtureFoodStation } from '../scenarios/food-workstations';
import { createMachiningFixture, requireCommand } from '../scenarios/machining-v101';
import { expectWorld, observeErrors, panel, pause, saveKey } from './helpers';

const probe = `
window.__workVfxView = null;
const v128WorkFrame = ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame = function(now) {
  const result = v128WorkFrame.call(this, now);
  if (!this.preparing) window.__workVfxView = this;
  return result;
};`;

function effect(world: World): number {
  const pawn = world.pawns[0]!;
  return actionFxForPawn(world, pawn, new Map(),
    new Map(world.jobs.map(job => [job.id, job])),
    new Map(world.structures.map(station => [station.id, station])), undefined, false).kind;
}

function advanceTo(world: World, wanted: number, limit: number): World {
  for (let step = 0; step < limit && effect(world) !== wanted; step++) stepWorld(world);
  expect(effect(world), `No active effect ${wanted} at tick ${world.tick}`).toBe(wanted);
  // A screenshot taken on the first work tick may catch the leading fragment
  // before it grows. Keep the confirmed action, and capture its bright phase.
  const first = structuredClone(world);
  for (let step = 0; step < 20; step++) {
    const seed = Math.fround(world.pawns[0]!.id * .61803398875);
    const phase = (world.tick * 1.65 / 6 + seed * .017) % 1;
    if (phase >= .24 && phase <= .36) break;
    stepWorld(world);
    if (effect(world) !== wanted) return first;
  }
  expect(validateWorld(world)).toEqual([]);
  return world;
}

function gather(kind: 'mine' | 'chop'): World {
  const world = miningCamp(1), pawn = world.pawns[0]!;
  pawn.schedule.fill('work');
  pawn.priorities.mine = kind === 'mine' ? 1 : 0;
  pawn.priorities.gather = kind === 'chop' ? 1 : 0;
  const x = pawn.x + 1, z = pawn.z;
  if (kind === 'mine') world.tiles[z * world.width + x] = { terrain: 'rock', stone: 'granite' };
  else world.resources.push({ id: world.nextId++, kind: 'tree', x, z, amount: 12 });
  expect(applyCommand(world, { type: 'designate', kind, x, z }).ok).toBe(true);
  refreshStock(world);
  return advanceTo(world, kind === 'mine' ? ACTION_FX.mine : ACTION_FX.chop, 400);
}

function cook(): World {
  const world = foodWorkstationCamp(), pawn = world.pawns[0]!;
  pawn.priorities.cook = 1;
  const station = fixtureFoodStation(world, 'fueled-stove');
  addGroundMaterial(world, 'wood', 10, { x: 5, z: 6 }, 'wood');
  addGroundMaterial(world, 'food', 5, { x: 6, z: 6 }, 'potato');
  addGroundMaterial(world, 'food', 5, { x: 7, z: 6 }, 'corn');
  refreshStock(world);
  expect(applyCommand(world, { type: 'bill-add', structureId: station.id }).ok).toBe(true);
  return advanceTo(world, ACTION_FX.cook, 600);
}

function research(): World {
  const { world, pawn } = createMachiningFixture();
  pawn.priorities.build = 0; pawn.priorities.craft = 0;
  requireCommand(world, { type: 'research-project', project: 'machining' });
  return advanceTo(world, ACTION_FX.research, 250);
}

function forge(): World {
  const world = deserializeWorld(readFileSync(new URL('../../public/test-saves/v123/industrie.json', import.meta.url), 'utf8'));
  return advanceTo(world, ACTION_FX.smith, 600);
}

async function load(page: Page, world: World): Promise<void> {
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data),
    { key: saveKey, data: serializeWorld(world) });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: probe + await response.text() });
  });
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);
  await panel(page, 'menu'); await page.locator('#load').click();
  await expectWorld(page, world);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !!(window as any).__workVfxView);
  await page.evaluate(({ x, z }) => {
    const view = (window as any).__workVfxView;
    view.controls.enableDamping = false;
    view.rig.setMode('orthographic');
    view.controls.target.set(x, 0, z);
    view.camera.zoom = 6;
    view.camera.updateProjectionMatrix();
    view.controls.update();
  }, world.pawns[0]!);
  await page.waitForTimeout(120);
}

test('V128: distinct real work particles stay in one resident WebGPU batch and freeze in pause', async ({ playwright }) => {
  test.setTimeout(150_000);
  testOutputDirectory('artifacts/v128-work');
  testOutputDirectory('artifacts/v128-work/ab');
  const scenes = [
    { name: 'mine', world: gather('mine'), expected: ACTION_FX.mine },
    { name: 'chop', world: gather('chop'), expected: ACTION_FX.chop },
    { name: 'cook', world: cook(), expected: ACTION_FX.cook },
    { name: 'research', world: research(), expected: ACTION_FX.research },
    { name: 'forge', world: forge(), expected: ACTION_FX.smith },
  ];
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  try {
    for (const scene of scenes) {
      const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
      const errors = observeErrors(page);
      try {
        await load(page, scene.world);
        const inspect = () => page.evaluate(() => {
          const view = (window as any).__workVfxView, group = view.actionVfx.group;
          const mesh = view.actionVfx.mesh, geometry = mesh.geometry;
          const source = view.pawns.feedbackSource;
          return {
            backend: view.backend, tick: view.world.tick,
            resident: group.children.filter((child: any) => child.isMesh).length,
            visible: mesh.visible, instances: geometry.instanceCount,
            effect: geometry.getAttribute('actionFx').getX(0),
            parts: geometry.getAttribute('actionPart').count,
            depthTest: mesh.material.depthTest, frustumCulled: mesh.frustumCulled,
            sharedPose: ['aFrom', 'aTo', 'aTravel'].every(name => geometry.getAttribute(name) === source.getAttribute(name)),
            clock: view.actionVfx.time.value,
          };
        });
        const first = await inspect();
        expect(first.backend).toBe('WebGPU');
        expect(first.tick).toBe(scene.world.tick);
        expect(first.resident).toBe(1);
        expect(first.visible).toBe(true);
        expect(first.instances).toBeGreaterThan(0);
        expect(first.effect).toBe(scene.expected);
        expect(first.parts).toBe(32);
        expect(first.depthTest).toBe(true);
        expect(first.frustumCulled).toBe(true);
        expect(first.sharedPose).toBe(true);
        await page.screenshot({ path:testOutputPath(`artifacts/v128-work/${scene.name}.png`) });
        if(scene.name==='mine'||scene.name==='chop'){
          await page.evaluate(()=>{
            const layer=(window as any).__workVfxView.actionVfx;
            const original=layer.present.bind(layer);
            layer.present=(tick:number)=>original(tick+layer.debugPhaseOffset);
          });
          for(const offset of [1,2,3]){
            await page.evaluate(value=>{(window as any).__workVfxView.actionVfx.debugPhaseOffset=value;},offset);
            await page.waitForTimeout(80);
            await page.screenshot({path:testOutputPath(`artifacts/v128-work/${scene.name}-phase-${offset}.png`)});
          }
          await page.evaluate(()=>{(window as any).__workVfxView.actionVfx.debugPhaseOffset=0;});
        }
        // The WebGPU renderer retains render bundles; changing Mesh.visible
        // after prewarm does not necessarily invalidate one. Disable the
        // effect in its existing GPU attribute instead for an honest A/B.
        await page.evaluate(() => {
          const attr = (window as any).__workVfxView.actionVfx.mesh.geometry.getAttribute('actionFx');
          attr.setX(0, 0);
          attr.needsUpdate = true;
        });
        await page.waitForTimeout(120);
        await page.screenshot({ path:testOutputPath(`artifacts/v128-work/ab/${scene.name}-off.png`) });
        await page.waitForTimeout(160);
        const paused = await inspect();
        expect(paused.tick).toBe(first.tick);
        expect(paused.clock).toBe(first.clock);
        if (scene.name === 'chop') {
          await page.evaluate(({ x, z, kind }) => {
            const view = (window as any).__workVfxView;
            const attr = view.actionVfx.mesh.geometry.getAttribute('actionFx');
            attr.setX(0, kind);
            attr.needsUpdate = true;
            view.controls.target.set(x, 0, z);
            view.camera.position.set(x - 6, 5, z);
            view.controls.update();
          }, { x: scene.world.pawns[0]!.x, z: scene.world.pawns[0]!.z, kind: scene.expected });
          await page.waitForTimeout(120);
          await page.screenshot({ path:testOutputPath('artifacts/v128-work/chop-side.png') });
          await page.evaluate(() => {
            const attr = (window as any).__workVfxView.actionVfx.mesh.geometry.getAttribute('actionFx');
            attr.setX(0, 0);
            attr.needsUpdate = true;
          });
          await page.waitForTimeout(120);
          await page.screenshot({ path:testOutputPath('artifacts/v128-work/ab/chop-side-off.png') });
        }
        expect(errors).toEqual([]);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
