import { readFileSync } from 'node:fs';
import { expect,test } from '@playwright/test';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers';
import { revealCells } from './player-actions';

test('Fabrication avancée V139 : recherche, facture et ouvrage physique dans le jeu',async({playwright})=>{
  test.setTimeout(150000);
  const raw=readFileSync(new URL('../../public/test-saves/v139/industrie-avancee.json',import.meta.url),'utf8');
  const prepared=deserializeWorld(raw);
  expect(prepared.schemaVersion).toBe(139);
  expect(validateWorld(prepared)).toEqual([]);
  expect(prepared.piles.some(pile=>pile.item==='advanced-component')).toBe(false);
  const bench=prepared.structures.find(structure=>structure.kind==='fabrication-bench')!;
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);

    await panel(page,'research');
    const project=page.locator('[data-research-node="advanced-fabrication"]');
    await expect(project).toBeVisible();
    await expect(project).toHaveAttribute('data-state','done');
    const projectBox=await project.boundingBox(),viewportBox=await page.locator('#research-panel .research-viewport').boundingBox();
    expect(projectBox&&viewportBox&&projectBox.x+projectBox.width<=viewportBox.x+viewportBox.width).toBe(true);
    await project.locator('[data-research-select]').click();
    await expect(page.locator('[data-research-selection-detail]')).toContainText('3 or');
    await page.screenshot({path:test.info().outputPath('advanced-research-v139.png')});
    await page.keyboard.press('Escape');

    await revealCells(page,[bench]);await cell(page,bench.x,bench.z);
    await expect(page.locator('[data-add-recipe="make-advanced-component"]')).toBeEnabled();
    await expect(page.locator('.bill-cost').filter({hasText:'plastacier'})).toContainText('3 or');
    await page.screenshot({path:test.info().outputPath('advanced-industry-v139.png')});
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.piles.some(pile=>pile.componentWork?.recipe==='make-advanced-component'&&pile.componentWork.progress>0),undefined,{timeout:90000});
    await pause(page);
    const actual=await world(page);
    expect(actual.piles.some(pile=>pile.componentWork?.recipe==='make-advanced-component'&&pile.componentWork.progress>0)).toBe(true);
    expect(validateWorld(actual)).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
