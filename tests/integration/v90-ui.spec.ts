import { expect, test } from '@playwright/test';
import { addGroundMaterial, createWorld, serializeWorld, validateWorld } from '../../src/sim/index';
import { revealCells,perform,editBill } from './player-actions';
import { CLOTHING_RESEARCH_COST,COMPLEX_FURNITURE_RESEARCH_COST } from '../../src/sim/research';
import { cell, expectWorld, observeErrors, panel, saveKey, world } from './helpers';

test('V90 : choisir un pot dans Architecte et affecter une politique vestimentaire par l’interface', async ({ playwright }, testInfo) => {
  const browser = await playwright.chromium.launch({ channel: 'chromium', args: [] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  const errors = observeErrors(page);
  try {
    const fixture = createWorld(90, 32, 32);
    fixture.tiles = fixture.tiles.map(() => ({ terrain: 'grass' }));
    fixture.resources = [];
    fixture.jobs = [];
    fixture.structures = [];
    fixture.stockpiles = [];
    fixture.piles = [];
    fixture.pawns = fixture.pawns.slice(0, 1);
    const pawn = fixture.pawns[0]!;
    Object.assign(pawn, { x: 13, z: 16, apparelPolicyId: 1, apparelAutomation: false });
    addGroundMaterial(fixture, 'wood', 20, { x: 12, z: 16 }, 'wood');
    fixture.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0}};
    const bench={id:fixture.nextId++,kind:'electric-tailor-bench' as const,x:16,z:12,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,bills:[],power:{on:false,parentId:null}};
    fixture.structures.push(bench);

    await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: saveKey, data: serializeWorld(fixture) });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();
    await panel(page, 'menu');
    await page.locator('#load').click();
    await expectWorld(page, fixture);
    await page.keyboard.press('Escape');

    await panel(page, 'architect');
    await page.locator('[data-category="furniture"]').click();
    await page.locator('[data-tool="flower-pot"]').click();
    await expect(page.locator('[data-tool="flower-pot"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tool-instruction')).toContainText('20 Bois');
    await revealCells(page, [{ x: 18, z: 16 }]);
    await cell(page, 18, 16);
    await expect.poll(async () => (await world(page)).jobs.find(job => job.kind === 'flower-pot')).toMatchObject({ x: 18, z: 16, material: 'wood' });

    const rotation={value:0};
    await page.locator('[data-category="furniture"]').click();
    for(const command of [
      {type:'designate' as const,kind:'dining-chair' as const,material:'steel' as const,x:18,z:18,orientation:1 as const},
      {type:'designate' as const,kind:'table-long' as const,material:'wood' as const,x:22,z:18,orientation:1 as const},
    ]){
      await page.locator(`[data-tool="${command.kind}"]`).click();
      await page.locator('#construction-material').selectOption(command.material);
      const orientation=page.locator('#placement-orientation');
      for(let attempt=0;attempt<4 && await orientation.innerText()!==`${command.orientation*90}°`;attempt++) await page.locator('#rotate-building').click();
      await expect(orientation).toHaveText(`${command.orientation*90}°`);
      rotation.value=command.orientation;
      await revealCells(page,[command]);
      await cell(page,command.x,command.z);
      await expect.poll(async () => (await world(page)).jobs.find(job => job.kind === command.kind)).toMatchObject({x:command.x,z:command.z,material:command.material,orientation:command.orientation});
    }
    for(const recipe of ['pants','duster','parka'] as const){
      await perform(page,{reason:'Choisir une recette avancée du tailleur.',command:{type:'bill-add',structureId:bench.id,recipe}},rotation);
      const bill=(await world(page)).structures.find(s=>s.id===bench.id)!.bills!.find(b=>b.recipe===recipe)!;
      await editBill(page,bill.id,{...bill,filters:{cloth:false,'light-leather':true},target:1});
    }

    await page.keyboard.press('F3');
    await expect(page.locator('#assign-panel')).toBeVisible();
    const policy = page.getByLabel(`Politique vestimentaire de ${pawn.name}`, { exact: true });
    const automatic = page.getByLabel(`Remplacement automatique des vêtements de ${pawn.name}`, { exact: true });
    await expect(policy).toHaveValue('1');
    await expect(automatic).not.toBeChecked();
    await policy.selectOption('2');
    await expect.poll(async () => (await world(page)).pawns[0]?.apparelPolicyId).toBe(2);
    await automatic.check();
    await expect.poll(async () => (await world(page)).pawns[0]?.apparelAutomation).toBe(true);

    const result = await world(page);
    expect(result.jobs.filter(job => job.kind === 'flower-pot')).toHaveLength(1);
    expect(result.jobs.find(j=>j.kind==='dining-chair')).toMatchObject({material:'steel',orientation:1});
    expect(result.jobs.find(j=>j.kind==='table-long')).toMatchObject({orientation:1});
    expect(result.structures.find(s=>s.id===bench.id)?.bills?.map(b=>({recipe:b.recipe,filters:b.filters}))).toEqual(['pants','duster','parka'].map(recipe=>({recipe,filters:{cloth:false,'light-leather':true}})));
    expect(result.pawns[0]).toMatchObject({ apparelPolicyId: 2, apparelAutomation: true });
    expect(validateWorld(result)).toEqual([]);
    expect(errors).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,result);
    await page.keyboard.press('Escape');await page.screenshot({path:'artifacts/habitat-apparel-ui-v90.png'});
    await testInfo.attach('v90-ui', {
      contentType: 'application/json',
      body: JSON.stringify({ tick: result.tick, construction: 'flower-pot', apparelPolicyId: 2, apparelAutomation: true, errors }),
    });
  } finally {
    await browser.close();
  }
});
