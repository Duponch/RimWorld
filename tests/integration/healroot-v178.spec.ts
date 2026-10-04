import { expect, test } from '@playwright/test';
import { createScenarioWorld } from '../../src/sim/new-game';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { updatePawnHealth } from '../../src/sim/health';
import { controlledInjury } from '../scenarios/health';
import { cell, expectWorld, observeErrors, panel, pause, pawnTab, saveKey, tool, world } from './helpers';
import { perform, revealCells } from './player-actions';
import { testOutputPath, writeTestFile } from '../test-output';

const biome = 'boreal-forest';
const site = { hilliness: 'small-hills', biome } as const;
const seed = 42;
const targetCell = { x: 127, z: 143 };
const storageCell = { x: 127, z: 126 };
const herbalTotal = (state: Awaited<ReturnType<typeof world>>) =>
  state.piles.filter(pile => pile.item === 'herbal-medicine').reduce((sum, pile) => sum + pile.quantity, 0);
const industrialTotal = (state: Awaited<ReturnType<typeof world>>) =>
  state.piles.filter(pile => pile.item === 'medicine').reduce((sum, pile) => sum + pile.quantity, 0);

test('natural healroot becomes one hauled dose, survives an in-progress save and treats a prepared injury', async ({ playwright }) => {
  test.setTimeout(240_000);
  const initial = createScenarioWorld(seed, 250, 'crashlanded', site);
  const plant = initial.resources.find(resource => resource.species === 'healroot-wild' && resource.x === targetCell.x && resource.z === targetCell.z);
  expect(plant, 'Seed 42 boreal forest must naturally generate this mature wild healroot.').toBeDefined();
  expect(plant!.growth).toBe(1);
  expect(plant!.kind).toBe('wild-plant');
  expect(herbalTotal(initial)).toBe(0);
  expect(industrialTotal(initial)).toBe(30);
  expect(initial.width).toBe(250);
  // Keep the harvested dose on the ground until the player orders its transport.
  // This changes only worker policy; the generated terrain, plant and item supply remain intact.
  initial.pawns.forEach(pawn => { pawn.priorities.haul = 0; });
  expect(validateWorld(initial)).toEqual([]);
  const worker = initial.pawns[0]!;
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page), rotation = { value: 0 };
  try {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: serializeWorld(initial) });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page, 'menu');
    await page.locator('#load').click();
    await expectWorld(page, initial);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.__lisiere.backend)).toBe('WebGPU');

    await tool(page, 'select');
    await revealCells(page, [targetCell]);
    await cell(page, targetCell.x, targetCell.z);
    await expect(page.locator('#cell-title')).toHaveText('Racine de guérison sauvage');
    await expect(page.locator('#cell-description')).toContainText(/Croissance\s*:\s*100 %/);
    await expect(page.locator('#cell-description')).toContainText(/Récolte\s*:\s*environ 1 dose de médicament à base de plantes/);
    await page.screenshot({ path: testOutputPath('artifacts/healroot-v178-natural.png') });

    await perform(page, { reason: 'Désigner la racine sauvage mûre.', command: { type: 'designate', kind: 'harvest', ...targetCell } }, rotation);
    const job = (await world(page)).jobs.find(candidate => candidate.kind === 'harvest' && candidate.x === targetCell.x && candidate.z === targetCell.z);
    expect(job).toBeDefined();
    expect(herbalTotal(await world(page))).toBe(0);
    await perform(page, { reason: 'Marcher jusqu’au plant et le récolter au contact.', command: { type: 'order-job', pawnId: worker.id, jobId: job!.id, queue: false } }, rotation);
    const ordered = await world(page);
    expect(ordered.jobs.find(candidate => candidate.id === job!.id)?.reservedBy).toBe(worker.id);
    expect(ordered.pawns.find(pawn => pawn.id === worker.id)?.path.length).toBeGreaterThan(0);

    await page.locator('[data-speed="1"]').click();
    // Pause from the same browser task that observes progress so the worker
    // cannot finish its 40 ticks before the test asks it to pause.
    await page.waitForFunction(({ jobId }) => {
      const state = window.__lisiere.world;
      const progress = state.jobs.find(job => job.id === jobId)?.progress ?? 0;
      if (progress < 5 || progress >= 25) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();
      return true;
    }, { jobId: job!.id }, { polling: 100, timeout: 30_000 });
    await pause(page);
    const working = await world(page);
    const work = working.jobs.find(candidate => candidate.id === job!.id);
    expect(work?.progress).toBeGreaterThan(0);
    expect(work!.progress).toBeLessThan(40);
    expect(working.resources.some(resource => resource.id === plant!.id)).toBe(true);
    expect(herbalTotal(working)).toBe(0);
    expect(validateWorld(working)).toEqual([]);
    await page.screenshot({ path: testOutputPath('artifacts/healroot-v178-working.png') });
    await panel(page, 'menu');
    await page.locator('#save').click();
    await page.locator('#load').click();
    await expectWorld(page, working);
    await page.keyboard.press('Escape');

    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(({ plantId }) => {
      const state = window.__lisiere.world;
      if (state.resources.some(resource => resource.id === plantId) || !state.piles.some(pile => pile.item === 'herbal-medicine' && pile.quantity === 1 && pile.owner.type === 'ground')) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();
      return true;
    }, { plantId: plant!.id }, { polling: 100, timeout: 30_000 });
    await pause(page);
    const harvested = await world(page);
    const dose = harvested.piles.find(pile => pile.item === 'herbal-medicine');
    expect(dose?.owner.type).toBe('ground');
    expect(dose?.quantity).toBe(1);
    expect(herbalTotal(harvested)).toBe(1);
    expect(harvested.resources.some(resource => resource.id === plant!.id)).toBe(false);
    expect(industrialTotal(harvested)).toBe(30);
    expect(validateWorld(harvested)).toEqual([]);
    await writeTestFile('artifacts/healroot-v178-harvested-checkpoint.json', serializeWorld(harvested));

    await perform(page, { reason: 'Créer une réserve qui accepte la médecine.', command: { type: 'stockpile', ...storageCell, enabled: true, filters: { wood: false, food: false, medicine: true }, priority: 2, capacity: 75 } }, rotation);
    await perform(page, { reason: 'Réactiver le transport pour le cueilleur.', command: { type: 'priority', pawnId: worker.id, work: 'haul', value: 1 } }, rotation);
    const haulCommand = { type: 'order-haul', pawnId: worker.id, target: { type: 'pile', pileId: dose!.id }, queue: false } as const;
    await perform(page, { reason: 'Transporter cette dose physique vers la réserve filtrée.', command: haulCommand }, rotation);
    const haulOrdered = await world(page);
    const haulTask = haulOrdered.pawns.find(pawn => pawn.id === worker.id)?.haul;
    expect(haulTask?.sourcePileId).toBe(dose!.id);
    expect(haulTask?.quantity).toBe(1);
    expect(haulTask?.destination.type).toBe('stockpile');
    await page.locator('[data-speed="1"]').click();
    let carryPileId: number | undefined;
    try {
      const carrying = await page.waitForFunction(({ pawnId, sourcePileId }) => {
        const state = window.__lisiere.world;
        const task = state.pawns.find(pawn => pawn.id === pawnId)?.haul;
        if (task?.sourcePileId !== sourcePileId || task.phase !== 'deliver' || task.carryPileId === null) return false;
        const pile = state.piles.find(pile => pile.id === task.carryPileId);
        return pile?.item === 'herbal-medicine' && pile.quantity === 1 && pile.owner.type === 'pawn' && pile.owner.pawnId === pawnId ? task.carryPileId : false;
      }, { pawnId: worker.id, sourcePileId: dose!.id }, { polling: 50, timeout: 20_000 });
      carryPileId = await carrying.jsonValue() as number;
      await page.locator('[data-speed="6"]').click();
      await page.waitForFunction(({ x, z }) => {
        // Divisible materials are reidentified on pickup. The harvested source
        // pile disappears; the carried dose receives a new ID before delivery.
        const doses = window.__lisiere.world.piles.filter(pile => pile.item === 'herbal-medicine');
        if (doses.length !== 1 || doses[0]!.quantity !== 1 || doses[0]!.owner.type !== 'ground' || doses[0]!.owner.x !== x || doses[0]!.owner.z !== z) return false;
        document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();
        return true;
      }, storageCell, { polling: 100, timeout: 30_000 });
    } catch (error) {
      await pause(page).catch(() => {});
      const checkpoint = await world(page), notice = await page.locator('#notice').textContent();
      const diagnostic = { command: haulCommand, sourcePileId: dose!.id, carryPileId, notice, checkpoint };
      await writeTestFile('artifacts/healroot-v178-haul-failure.json', JSON.stringify(diagnostic, null, 2));
      const actor = checkpoint.pawns.find(pawn => pawn.id === worker.id);
      throw new Error(`Transport de la dose non confirmé : ${JSON.stringify({ tick: checkpoint.tick, haul: actor?.haul, doses: checkpoint.piles.filter(pile => pile.item === 'herbal-medicine'), notice, events: checkpoint.events.slice(-5) })}; ${String(error)}`);
    }
    await pause(page);
    const stored = await world(page);
    const storedDose = stored.piles.find(pile => pile.item === 'herbal-medicine' && pile.owner.type === 'ground' && pile.owner.x === storageCell.x && pile.owner.z === storageCell.z);
    expect(storedDose?.quantity).toBe(1);
    expect(storedDose?.id).toBe(carryPileId);
    expect(storedDose?.id).not.toBe(dose!.id);
    expect(stored.piles.some(pile => pile.id === dose!.id)).toBe(false);
    expect(stored.pawns.find(pawn => pawn.id === worker.id)?.haul).toBeNull();
    expect(herbalTotal(stored)).toBe(1);
    expect(industrialTotal(stored)).toBe(30);
    expect(validateWorld(stored)).toEqual([]);
    await writeTestFile('artifacts/healroot-v178-stored-checkpoint.json', serializeWorld(stored));

    // Explicit medical fixture boundary: add one localized bruise only after
    // the natural dose has been collected and hauled. No plant or item is added.
    const injured = structuredClone(stored);
    const patient = injured.pawns.find(pawn => pawn.id === worker.id)!;
    updatePawnHealth(injured, patient);
    controlledInjury(injured, patient, 'left-arm', 5000, 'bruise');
    expect(patient.health?.injuries).toHaveLength(1);
    expect(patient.health?.injuries[0]?.bornAt).toBe(injured.tick);
    expect(herbalTotal(injured)).toBe(1);
    expect(injured.piles.find(pile => pile.id === storedDose!.id)).toEqual(storedDose);
    expect(validateWorld(injured)).toEqual([]);
    await page.evaluate(({ key, value }) => window.__lisiere.saveRepository.setItem(key, value), { key: saveKey, value: serializeWorld(injured) });
    await panel(page, 'menu');
    await page.locator('#load').click();
    await expectWorld(page, injured);
    await page.keyboard.press('Escape');

    await page.locator(`[data-pawn="${worker.id}"]`).click();
    await pawnTab(page, 'health');
    await page.locator('#medical-policy').selectOption('herbal');
    await page.locator('#self-tend-policy').check();
    await expect.poll(async () => (await world(page)).pawns.find(pawn => pawn.id === worker.id)?.selfTend).toBe(true);
    await perform(page, { reason: 'Utiliser la dose sauvage pour soigner sa contusion.', command: { type: 'order-tend', pawnId: worker.id, patientId: worker.id, queue: false } }, rotation);
    const tendOrder = await world(page);
    expect(tendOrder.pawns.find(pawn => pawn.id === worker.id)?.tend?.medicine?.item).toBe('herbal-medicine');
    expect(tendOrder.pawns.find(pawn => pawn.id === worker.id)?.tend?.medicine?.sourcePileId).toBe(storedDose!.id);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(({ pawnId }) => {
      const state = window.__lisiere.world, pawn = state.pawns.find(pawn => pawn.id === pawnId);
      if (!pawn?.health?.injuries[0] || pawn.health.injuries[0].tended === undefined) return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();
      return true;
    }, { pawnId: worker.id }, { polling: 100, timeout: 30_000 });
    await pause(page);
    const treated = await world(page);
    expect(treated.pawns.find(pawn => pawn.id === worker.id)?.health?.injuries[0]?.tended).toBeDefined();
    expect(herbalTotal(treated)).toBe(0);
    expect(industrialTotal(treated)).toBe(30);
    expect(treated.resources.some(resource => resource.id === plant!.id)).toBe(false);
    expect(treated.events.some(event => /avec Plantes médicinales/.test(event.message))).toBe(true);
    expect(validateWorld(treated)).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testOutputPath('artifacts/healroot-v178-treated.png') });
    await writeTestFile('artifacts/healroot-v178-report.json',JSON.stringify({
      seed, biome, size:250, backend:await page.evaluate(()=>window.__lisiere.backend),
      plantId:plant!.id, targetCell, storageCell, harvestedDoseId:dose!.id, carryPileId, storedDoseId:storedDose!.id,
      ticks:{start:initial.tick,working:working.tick,harvested:harvested.tick,stored:stored.tick,treated:treated.tick},
      savedProgress:work!.progress, herbal:{initial:0,harvested:1,stored:1,treated:0},
      industrial:industrialTotal(treated), errors,
      preparedBoundary:'Localized bruise after natural acquisition and physical storage; no dose/plant added.'
    },null,2));
  } finally {
    await browser.close();
  }
});
