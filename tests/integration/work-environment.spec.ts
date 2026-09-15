import { test,expect } from '@playwright/test';
import { workplaceCamp, fixtureFire } from '../scenarios/work-environment';
import type { Page } from '@playwright/test';
import type { World } from '../../src/sim/types';
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

/** Read captured pixels, not the field that generated them. Small patches avoid
 * exact GPU/driver-specific screenshot baselines while testing visible effects. */
async function luminance(page: Page, x: number, z: number): Promise<number[]> {
  const point = await page.evaluate(({x,z}) => window.__lisiere.projectCell(x,z), {x,z});
  const bounds = (await page.locator('#viewport canvas').boundingBox())!;
  const png = await page.screenshot();
  return page.evaluate(async ({url,x,y}) => {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = 5;
    const ctx = c.getContext('2d')!; ctx.drawImage(img,Math.round(x)-2,Math.round(y)-2,5,5,0,0,5,5);
    const bytes = ctx.getImageData(0,0,5,5).data, sum = [0,0,0];
    for(let i=0;i<bytes.length;i+=4)for(let k=0;k<3;k++)sum[k]!+=bytes[i+k]!/25;
    return sum;
  }, {url:`data:image/png;base64,${png.toString('base64')}`,x:bounds.x+point.x,y:bounds.y+point.y});
}

test('lumière visible : nuit, extinction, toit masqué, occlusion et deux projections sans modifier la sauvegarde',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15000);
  try {
    const night=workplaceCamp();night.tick=6000;
    for(const b of night.structures){b.x+=10;b.z+=10;}for(const p of night.pawns){p.x+=10;p.z+=10;}
    night.roofing!.constructed=night.roofing!.constructed.map(i=>i+330);
    const fire=fixtureFire(night,16,14);fire.fuel!.ticks=0;
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(night)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    const load=async(w:World)=>{
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(w)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,w);await page.keyboard.press('Escape');
      await page.mouse.move(1100,650);
    };
    await load(night);await page.locator('#wall-cutaway').click();
    const dark=await luminance(page,15,15),outsideDark=await luminance(page,18,14);
    await page.screenshot({path:'artifacts/interior-night-dark.png'});
    fire.fuel!.ticks=12000;await load(night);
    const lit=await luminance(page,15,15),outsideLit=await luminance(page,18,14);
    expect(lit[0]!-dark[0]!).toBeGreaterThan(35);
    expect(lit[0]!-lit[2]!).toBeGreaterThan(25);
    expect(Math.abs(outsideLit[0]!-outsideDark[0]!)).toBeLessThan(4);
    await page.screenshot({path:'artifacts/interior-night-lit.png'});
    await page.locator('#roof-toggle').click();await page.locator('#roof-toggle').click();
    const cut=await luminance(page,15,15);expect(Math.abs(cut[0]!-lit[0]!)).toBeLessThan(4);await expectWorld(page,night);
    await page.locator('#camera-mode').click();
    const perspective=await luminance(page,15,15);expect(perspective[0]!-perspective[2]!).toBeGreaterThan(25);
    await page.screenshot({path:'artifacts/interior-night-perspective.png'});
    await page.locator('#camera-mode').click();
    fire.fuel!.ticks=0;await load(night);const extinguished=await luminance(page,15,15);
    expect(Math.abs(extinguished[0]!-dark[0]!)).toBeLessThan(4);
    const day=structuredClone(night);day.tick=9000;await load(day);const covered=await luminance(page,15,15);
    day.roofing!.constructed=[];await load(day);const uncovered=await luminance(page,15,15);
    expect(uncovered[0]!-covered[0]!).toBeGreaterThan(35);
    await expectWorld(page,day);await expect(page.locator('#fps-counter')).toBeVisible();expect(errors).toEqual([]);
    await testInfo.attach('lighting-pixels',{contentType:'application/json',body:JSON.stringify({dark,lit,outsideDark,outsideLit,cut,perspective,extinguished,covered,uncovered,errors})});
  }finally{await browser.close();}
});
