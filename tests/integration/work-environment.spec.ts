import { test,expect } from '@playwright/test';
import { workplaceCamp } from '../scenarios/work-environment';
import { addGroundMaterial } from '../../src/sim/materials';
import { serializeWorld,validateWorld } from '../../src/sim/index';
import { world,observeErrors,panel,tool,cell,expectWorld,saveKey } from './helpers';
import { revealCells } from './player-actions';

test('atelier couvert : lire l’obscurité, construire un vrai feu, produire et recharger la sauvegarde',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);page.setDefaultTimeout(15000);
  try {
    const initial=workplaceCamp(),bench=initial.structures[0]!;initial.pawns[0]!.priorities.build=1;
    // Keep this room at the map centre, clear of the fixed HUD and camera bounds.
    for(const b of initial.structures){b.x+=10;b.z+=10;}for(const p of initial.pawns){p.x+=10;p.z+=10;}
    initial.roofing!.constructed=initial.roofing!.constructed.map(i=>i+10*initial.width+10);
    addGroundMaterial(initial,'wood',20,{x:15,z:13});addGroundMaterial(initial,'chunk',1,{x:13,z:14},'granite-chunk');
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await revealCells(page,[{x:11,z:11},{x:17,z:17}]);await cell(page,12,14);
    await expect(page.locator('#room-description')).toContainText('Production : 80 %');
    await expect(page.locator('#room-description')).toContainText('obscurité ×80 %');
    await tool(page,'campfire');await cell(page,16,14);await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='campfire')).toBe(true);
    await page.locator('[data-speed="0"]').click();await cell(page,12,14);
    await expect(page.locator('#room-description')).toContainText('Production : 100 % · lumière à la place 50 %');
    await page.locator('#add-cooking-bill').click();await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).piles.filter(p=>p.kind==='blocks').reduce((n,p)=>n+p.quantity,0)).toBe(20);
    await page.locator('[data-speed="0"]').click();const final=await world(page);expect(validateWorld(final)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);await page.keyboard.press('Escape');await cell(page,12,14);
    await expect(page.locator('#fps-counter')).toBeVisible();expect(errors).toEqual([]);
    await page.screenshot({path:'artifacts/work-environment-ui.png'});
    await testInfo.attach('work-environment',{contentType:'application/json',body:JSON.stringify({backend:await page.evaluate(()=>window.__lisiere.backend),tick:final.tick,bench:bench.id,blocks:20,description:await page.locator('#room-description').textContent(),errors})});
  } finally {await browser.close();}
});
