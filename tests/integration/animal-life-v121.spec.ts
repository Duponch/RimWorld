import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {animalLifeStage,gestationTicks} from '../../src/sim/animal-life';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {expectWorld,observeErrors,pause,saveKey,world} from './helpers';

test('cycle animal V121 : stades, gestation, fiches et échelle native WebGPU',async({playwright})=>{
  test.setTimeout(60000);
  const raw=readFileSync(new URL('../../public/test-saves/v121/cycle-animal.json',import.meta.url),'utf8');
  const prepared=deserializeWorld(raw);
  expect(validateWorld(prepared)).toEqual([]);
  const animals=prepared.wildlife!.animals;
  const young=animals.find(a=>!!a.domestic&&animalLifeStage(a)==='juvenile'&&!!a.parents);
  const adult=animals.find(a=>!!a.domestic&&a.species===young?.species&&animalLifeStage(a)==='adult'&&a.id===young?.parents?.motherId);
  const pregnant=animals.find(a=>!!a.domestic&&!!a.pregnancy);
  expect(young,'La colonie V121 contient un jeune domestique avec filiation.').toBeDefined();
  expect(adult,'La mère adulte de même espèce reste visible.').toBeDefined();
  expect(pregnant,'La colonie V121 contient une gestation en cours.').toBeDefined();
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await page.locator('[data-panel="menu"]').click();
    await page.locator('#load').click();
    await expectWorld(page,prepared);

    await page.locator('[data-panel="animals"]').click();
    await expect(page.locator(`[data-domestic-details="${young!.id}"]`)).toContainText('Jeune');
    await expect(page.locator(`[data-domestic-details="${adult!.id}"]`)).toContainText('Adulte');
    await expect(page.locator(`[data-domestic-details="${pregnant!.id}"]`)).toContainText('Gestation');
    await page.locator(`[data-domestic-focus="${young!.id}"]`).click();
    await expect(page.locator('[data-animal-identity]')).toContainText('Jeune');
    await expect(page.locator('[data-animal-content="info"]')).toContainText('Stade de vie : Jeune');
    await expect(page.locator('[data-animal-content="info"]')).toContainText('Âge :');
    await expect(page.locator('[data-animal-content="info"]')).toContainText(`Parents : mère ${young!.parents!.motherId} · père ${young!.parents!.fatherId}`);
    await page.locator('[data-panel="animals"]').click();
    await page.locator(`[data-domestic-focus="${pregnant!.id}"]`).click();
    await expect(page.locator('[data-animal-content="info"]')).toContainText(`Gestation : ${Math.round(100*pregnant!.pregnancy!.progress/gestationTicks(pregnant!.species))} %`);

    // The pointer proxy reads the resident instance scale used by the WebGPU animal batch.
    // Nearby mother and child keep the camera perspective comparable.
    await page.mouse.move(720,500);
    await page.mouse.wheel(0,-700);
    await page.waitForTimeout(500);
    const radii=await page.evaluate(([youngId,adultId])=>({
      young:window.__lisiere.projectPawn(youngId)?.radius,
      adult:window.__lisiere.projectPawn(adultId)?.radius,
    }),[young!.id,adult!.id] as const);
    expect(radii.young).toBeDefined();
    expect(radii.adult).toBeDefined();
    expect(radii.adult!).toBeGreaterThan(radii.young!*1.25);

    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(({motherId,previousIds})=>{
      const animals=window.__lisiere.world.wildlife?.animals??[];
      return animals.some(a=>!previousIds.includes(a.id)&&a.parents?.motherId===motherId);
    },{motherId:pregnant!.id,previousIds:animals.map(a=>a.id)},{timeout:15000});
    await pause(page);
    const born=(await world(page)).wildlife!.animals.find(a=>!animals.some(before=>before.id===a.id)&&a.parents?.motherId===pregnant!.id)!;
    expect(born.ageTicks).toBeLessThan(100);
    await page.locator('[data-panel="animals"]').click();
    await expect(page.locator(`[data-domestic-details="${born.id}"]`)).toContainText('Petit');
    await page.locator(`[data-domestic-focus="${born.id}"]`).click();
    await expect(page.locator('[data-animal-content="info"]')).toContainText('Stade de vie : Petit');
    await expect(page.locator('[data-animal-content="info"]')).toContainText(`Parents : mère ${pregnant!.id} · père ${pregnant!.pregnancy!.fatherId}`);
    expect(validateWorld(await world(page))).toEqual([]);
    expect(errors).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
  }finally{await browser.close();}
});
