import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { world, pause, panel, expectWorld, observeErrors } from './helpers';
import { READINESS_BIOMES, biomeReadinessSite } from '../scenarios/biome-readiness';
import { deserializeWorld, validateWorld } from '../../src/sim/serialization';
import { sameDerivedClimateNumber } from '../../src/sim/site-climate';
import { BIOME_LABELS } from '../../src/sim/site';
import { SCHEMA_VERSION, type World } from '../../src/sim/types';

test.skip(process.env.BIOME_READINESS !== '1', 'Opt-in short native smoke; no browser allocated by default for this file');
const front = (page: Page) => page.locator('.front-menu');
const button = (page: Page, name: string) => front(page).getByRole('button', { name, exact: true });

/** Narrow reuse of first-night-v336's existing visible globe interaction.
 * Importing that spec would register its long shelter tests, so only this
 * interaction is retained here. No hidden input, forced click or world write. */
async function chooseTile(page: Page, id: number): Promise<void> {
  const svg = front(page).locator('.planet-view svg'); await svg.scrollIntoViewIfNeeded(); await svg.focus();
  for (let turn = 0; turn < 54; turn++) {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const point = await front(page).locator('[data-planet-tile="' + id + '"]').evaluate(el => {
      const path = el as SVGPathElement, d = path.getAttribute('d');
      if (!d || getComputedStyle(path).display === 'none') return null;
      const values = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number), matrix = path.getScreenCTM();
      if (!values || values.length < 6 || !matrix) return null;
      let x = 0, y = 0; for (let i = 0; i < values.length; i += 2) { x += values[i]!; y += values[i + 1]!; }
      const p = new DOMPoint(x / (values.length / 2), y / (values.length / 2)).matrixTransform(matrix);
      return document.elementFromPoint(p.x, p.y)?.closest('[data-planet-tile]') === path ? { x: p.x, y: p.y } : null;
    });
    if (point) {
      await page.mouse.click(point.x, point.y);
      await expect(front(page).locator('[data-planet-selection]')).toHaveValue(String(id)); return;
    }
    await page.keyboard.press('ArrowRight');
  }
  throw Error('No visible tile after one bounded globe rotation: ' + id);
}

async function exportReload(page: Page, info: TestInfo, name: string, expected: World) {
  await panel(page, 'menu'); const manager = page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill(name);
  await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state', 'success');
  const pendingDownload = page.waitForEvent('download');
  await manager.locator('[data-save-manager-action="export"]').click();
  const download = await pendingDownload, path = info.outputPath(name + '.json'); await download.saveAs(path);
  const raw = await readFile(path, 'utf8'); expect(deserializeWorld(raw)).toEqual(expected);
  await page.locator('#browse-saves').click();
  const row = front(page).locator('label').filter({ has: page.locator('strong').filter({ hasText: new RegExp('^' + name + '$') }) });
  await row.locator('input[name="front-save"]').check(); await button(page, 'Charger').click();
  await expectWorld(page, expected);
  await info.attach(name + '-export', { contentType: 'application/json', path });
  return { path, sha256: createHash('sha256').update(raw).digest('hex'), tick: expected.tick, reloaded: true };
}

test('V375 short native: three fixed biomes, real new-game arrival and exact save reload in one sequential run', async ({ page }, info) => {
  test.setTimeout(180_000);
  const started = Date.now(), errors = observeErrors(page), rows: Record<string, unknown>[] = [];
  const only = process.env.BIOME_READINESS_BIOME;
  if (only && !READINESS_BIOMES.some(biome => biome === only)) throw Error('Unknown fixed biome case');
  let failure: string | undefined;
  try {
    for (const biome of READINESS_BIOMES.filter(biome => !only || biome === only)) {
      const selected = biomeReadinessSite(271828, biome);
      const row: Record<string, unknown> = { seed: 271828, biome, tile: selected.choice.tile, status: 'started' }; rows.push(row);
      await page.goto('/?e2e', { waitUntil: 'domcontentloaded', timeout: 30_000 }); await button(page, 'Nouvelle partie').click(); await button(page, 'Suivant').click();
      await front(page).getByRole('radio', { name: 'Récit d’aventure', exact: true }).check();
      await front(page).getByRole('radio', { name: 'Rechargeable à tout moment', exact: true }).check();
      await button(page, 'Suivant').click(); await page.locator('#front-seed').fill('271828'); await button(page, 'Générer').click();
      await chooseTile(page, selected.choice.tile); await button(page, 'Suivant').click();
      if (await front(page).locator('dialog').isVisible()) await front(page).locator('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
      const selectedNames = (await page.locator('[data-candidate-serial] .front-candidate-labels strong').allTextContents()).slice(0, 3);
      expect(selectedNames).toHaveLength(3);
      await button(page, 'Démarrer').click();
      if (await front(page).locator('dialog').isVisible()) await front(page).locator('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
      await expect(front(page)).toBeHidden({ timeout: 60_000 });
      await expect(page.locator('.game-shell')).toHaveJSProperty('inert', false, { timeout: 60_000 });
      const incoming = await world(page);
      expect(incoming.tick).toBe(0); expect(incoming.schemaVersion).toBe(SCHEMA_VERSION); expect(incoming.width).toBe(250); expect(incoming.seed).toBe(selected.resolved.seed);
      expect(incoming.site?.biome).toBe(biome); expect(incoming.planet?.homeTile).toBe(selected.choice.tile);
      if(incoming.flora?.revision!==1)throw Error('Historical biome pilot requires literal flora revision1');expect(incoming.flora.biome).toBe(biome); expect(incoming.wildlife?.population?.biome).toBe(biome);
      expect(incoming.resources.some(resource => resource.species !== undefined)).toBe(true);
      expect(incoming.wildlife!.animals.length).toBeGreaterThan(0);
      row.ecology = { plants: incoming.resources.filter(resource => resource.species !== undefined).length, animals: incoming.wildlife!.animals.length };
      expect(incoming.planet?.generationSeed).toBe(271828); expect(incoming.pawns).toEqual([]);
      expect(incoming.climate?.revision).toBe(2); expect(validateWorld(incoming)).toEqual([]);
      if (incoming.climate?.revision !== 2) throw Error('Expected actual tile climate');
      const actual = incoming.climate.definition, expectedClimate = selected.resolved.climate;
      expect(actual.meanTemperature).toBe(expectedClimate.meanTemperature); expect(actual.rainfall).toBe(expectedClimate.rainfall);
      for (const key of ['latitude', 'longitude', 'amplitude'] as const) expect(sameDerivedClimateNumber(actual[key], expectedClimate[key])).toBe(true);
      await expect(page.locator('#biome-current')).toHaveText(BIOME_LABELS[biome]);
      const arrival = incoming.startingArrival;
      if (!arrival || arrival.phase === 'opened') throw Error('Expected initial capsule custody');
      expect(arrival.phase).toBe('incoming'); expect(arrival.pods).toHaveLength(3);
      expect(arrival.pods.map(pod => pod.pawn.name)).toEqual(selectedNames);
      row.incomingTick = incoming.tick;
      await page.locator('.starting-arrival').getByRole('button', { name: 'Reprendre', exact: true }).click();
      const until = Date.now() + 20_000;
      for (;;) {
        const state = await page.evaluate(() => ({ tick: window.__lisiere.tick, phase: window.__lisiere.world.startingArrival?.phase }));
        if (state.tick > 120 || Date.now() > until) throw Error('Arrival smoke bound reached; do not reroll this case');
        if (state.phase === 'opened') break;
        await page.waitForTimeout(100);
      }
      await pause(page); const opened = await world(page);
      expect(opened.tick).toBeLessThanOrEqual(120); expect(opened.startingArrival?.phase).toBe('opened');
      expect(opened.pawns.map(pawn => pawn.id)).toEqual(arrival.pods.map(pod => pod.pawn.id));
      expect(opened.relationships).toEqual(incoming.relationships); expect(validateWorld(opened)).toEqual([]);
      // Identity conservation at the real UI observation, not frozen ground
      // coordinates: ordinary actors can legally start working before pause.
      // Exact discharge cells are covered at the engine boundary by the unit
      // cases; this smoke makes no unobserved transport-chain attribution.
      for (const pod of arrival.pods) for (const item of pod.items) {
        const live = opened.piles.filter(pile => pile.id === item.id);
        expect(live).toHaveLength(1);
        expect(live[0]).toMatchObject({ id: item.id, item: item.item, kind: item.kind, quantity: item.quantity });
        expect(live[0]!.owner.type).not.toBe('starting-pod');
      }
      expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');
      const guide = page.locator('.learning-readout');
      if (await guide.isVisible() && await guide.evaluate(node => (node as HTMLDetailsElement).open)) await guide.locator(':scope > summary').click();
      const checkpoint = await exportReload(page, info, 'V375-' + biome, opened);
      expect(await page.evaluate(() => window.__lisiere.incident)).toMatchObject({ simulationStopped: false, graphicsFault: false });
      expect(errors).toEqual([]);
      await page.screenshot({ path: info.outputPath(biome + '-arrival-reloaded.png') });
      Object.assign(row, { status: 'completed', openedTick: opened.tick, checkpoint, people: opened.pawns.map(pawn => ({ id: pawn.id, name: pawn.name })) });
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error); throw error;
  } finally {
    try { if (!page.isClosed() && await page.locator('[data-speed="0"]').isVisible()) await pause(page); } catch { /* Preserve the original smoke failure. */ }
    const report = info.outputPath('biome-readiness-summary.json');
    await writeFile(report, JSON.stringify({ scope: 'Short initial readiness only; no annual climate, durable survival, FPS or complete biome parity claim', elapsedMs: Date.now() - started, planned: READINESS_BIOMES.filter(biome => !only || biome === only), rows, failure, errors }, null, 2));
    await info.attach('biome-readiness-summary', { contentType: 'application/json', path: report });
  }
});
