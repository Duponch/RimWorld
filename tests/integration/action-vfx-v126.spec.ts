import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/serialization';
import { stepWorld } from '../../src/sim/engine';
import { ACTION_FX } from '../../src/render/ActionVfxLayer';
import type { World } from '../../src/sim/types';
import { nightEncounter } from '../scenarios/disturbance';
import { environmentUiFixture } from '../scenarios/environment-camp';
import { expectWorld, observeErrors, panel, pause, saveKey } from './helpers';

const probe = `
window.__activityView = null;
const v126Frame = ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame = function(now) {
  const result = v126Frame.call(this, now);
  if (!this.preparing) window.__activityView = this;
  return result;
};`;

async function load(page: Page, initial: World, raw = serializeWorld(initial)): Promise<void> {
  expect(validateWorld(initial)).toEqual([]);
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: raw });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: probe + await response.text() });
  });
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);
  await panel(page, 'menu');
  await page.locator('#load').click();
  await expectWorld(page, initial);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !!(window as any).__activityView);
}

test('V126: brawl, sleep and active equipment effects use shared WebGPU batches and freeze on pause', async ({ playwright }) => {
  test.setTimeout(180_000);
  const browser = await playwright.chromium.launch({ channel: 'chromium', headless: false, args: [] });
  const reports: unknown[] = [];
  try {
    const fightRaw = readFileSync(new URL('../../public/test-saves/v125/insulte-bagarre.json', import.meta.url), 'utf8');
    const forge = deserializeWorld(readFileSync(new URL('../../public/test-saves/v123/industrie.json', import.meta.url), 'utf8'));
    for (let i = 0; i < 500 && forge.pawns[0]?.cooking?.phase !== 'work'; i++) stepWorld(forge, 1);
    expect(forge.pawns[0]?.cooking?.phase).toBe('work');
    const scenes: { name: string; world: World; raw?: string; focus: { x: number; z: number } }[] = [
      { name: 'brawl', world: deserializeWorld(fightRaw), raw: fightRaw, focus: { x: 16.5, z: 15.5 } },
      { name: 'sleep', world: nightEncounter(), focus: { x: 6, z: 10 } },
      { name: 'forge', world: forge, focus: { x: 16, z: 8 } },
      { name: 'equipment-fire', world: environmentUiFixture().world, focus: { x: 14, z: 20 } },
    ];
    for (const scene of scenes) {
      const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
      const errors = observeErrors(page);
      try {
        await load(page, scene.world, scene.raw);
        await page.evaluate(({ x, z }) => {
          const view = (window as any).__activityView;
          view.controls.enableDamping = false;
          view.rig.setMode('orthographic');
          view.controls.target.set(x, 0, z);
          view.camera.zoom = 6;
          view.camera.updateProjectionMatrix();
          view.controls.update();
        }, scene.focus);
        await page.waitForTimeout(250);
        const inspect = () => page.evaluate(() => {
          const view = (window as any).__activityView;
          const action = view.actionVfx.mesh;
          const brawl = view.brawlCloud.group;
          let brawlDraws = 0;
          brawl.traverse((object: any) => {
            if (object.isMesh && object.visible && object.geometry?.instanceCount > 0) brawlDraws++;
          });
          const source = view.pawns.feedbackSource;
          const structure = view.structureVfx;
          const fx = action.geometry.getAttribute('actionFx');
          return {
            backend: view.backend,
            actionVisible: action.visible,
            actionCount: action.geometry.instanceCount,
            brawlVisible: brawl.visible,
            brawlDraws,
            effects: view.world.pawns.map((_pawn: unknown, index: number) => fx.getX(index)),
            sharedPose: ['aFrom', 'aTo', 'aTravel'].every(name => action.geometry.getAttribute(name) === source.getAttribute(name)),
            actionClock: view.actionVfx.time.value,
            glowCount: structure.glow.activeCount,
            smokeCount: structure.smoke.geometry.instanceCount,
            fireCount: view.fires.mesh.geometry.instanceCount,
          };
        });
        const first = await inspect();
        expect(first.backend).toBe('WebGPU');
        expect(first.sharedPose).toBe(true);
        if (scene.name === 'brawl') {
          expect(first.brawlVisible).toBe(true);
          expect(first.brawlDraws).toBeGreaterThan(0);
          expect(first.actionVisible).toBe(false);
        } else if (scene.name === 'sleep') {
          expect(first.actionVisible).toBe(true);
          expect(first.effects).toContain(ACTION_FX.sleep);
          const portraitExpressions = await page.locator('#colonists .portrait-head').evaluateAll(nodes =>
            nodes.map(node => decodeURIComponent((node as HTMLElement).dataset.source ?? '').match(/data-expression="([^"]+)"/)?.[1] ?? ''));
          // The HUD portrait is generated from the same closed-eye face state.
          expect(portraitExpressions).toContain('sleep');
        } else if (scene.name === 'forge') {
          expect(first.effects).toContain(ACTION_FX.smith);
          expect(first.glowCount).toBeGreaterThan(0);
          expect(first.smokeCount).toBeGreaterThan(0);
        } else {
          expect(first.glowCount).toBeGreaterThan(0);
          expect(first.smokeCount).toBeGreaterThan(0);
          expect(first.fireCount).toBeGreaterThan(0);
        }
        await page.waitForTimeout(180);
        const second = await inspect();
        expect(second.actionClock).toBe(first.actionClock);
        expect(errors).toEqual([]);
        await page.screenshot({ path: test.info().outputPath(`activity-v126-${scene.name}.png`) });
        if (scene.name === 'equipment-fire') {
          await page.evaluate(() => (window as any).__activityView.focusCell({ x: 10, z: 12 }));
          await page.waitForTimeout(80);
          await page.screenshot({ path: test.info().outputPath('activity-v126-battery.png') });
        }
        reports.push({ scene: scene.name, ...second });
      } finally { await page.close(); }
    }
    expect(reports).toHaveLength(4);
  } finally { await browser.close(); }
});
