import { expect,test } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/index';
import { observeErrors,panel,world,expectWorld,saveKey } from './helpers';
import { perform } from './player-actions';

test('natural camp: pause/reload research, 1x/6x unlock, construct tailor, craft and wear shirt through UI',async({playwright})=>{
  test.setTimeout(240000);
  const initial=deserializeWorld(readFileSync('artifacts/research-checkpoint-v73.json','utf8')),p=initial.pawns[0]!;
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await panel(page,'research');await expect(page.locator('[data-research-status]')).toContainText('En cours');
    await page.locator('[data-research-pause]').click();await expect.poll(async()=>(await world(page)).research?.project).toBeNull();
    const paused=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,paused);
    await perform(page,{reason:'Terminer la recherche avant les travaux ordinaires.',command:{type:'priority',pawnId:p.id,work:'research',value:1}},{value:0});
    for(const work of ['grow','cook','gather','haul'] as const)await perform(page,{reason:'Achever notre recherche.',command:{type:'priority',pawnId:p.id,work,value:2}},{value:0});
    await panel(page,'research');await page.locator('[data-research-start]').click();await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>(await world(page)).research!.points,{timeout:20000}).toBeGreaterThan(paused.research!.points);
    await page.locator('[data-speed="6"]').click();await expect(page.locator('[data-research-status]')).toContainText('Terminée',{timeout:30000});await page.locator('[data-speed="0"]').click();
    await page.screenshot({path:'artifacts/research-complete-v73.png'});
    for(const work of ['grow','cook','gather','haul'] as const)await perform(page,{reason:'Réserver le travail immédiat à notre nouvel atelier.',command:{type:'priority',pawnId:p.id,work,value:2}},{value:0});
    await perform(page,{reason:'Construire le poste débloqué.',command:{type:'designate',kind:'tailor-bench',material:'wood',x:8,z:12}},{value:0});
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='tailor-bench'),{timeout:80000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const tailor=(await world(page)).structures.find(s=>s.kind==='tailor-bench')!;
    await perform(page,{reason:'Confectionner une chemise avec notre coton.',command:{type:'bill-add',structureId:tailor.id,recipe:'shirt'}},{value:0});
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{if(!window.__lisiere.world.piles.some(i=>i.item==='cloth-shirt'&&i.owner.type==='ground'))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},undefined,{timeout:70000});
    const shirt=(await world(page)).piles.find(i=>i.item==='cloth-shirt')!;
    await perform(page,{reason:'Porter notre chemise fabriquée.',command:{type:'order-equipment',pawnId:p.id,itemId:shirt.id,action:'wear',queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).piles.find(i=>i.id===shirt.id)?.owner.type,{timeout:20000}).toBe('apparel');await page.locator('[data-speed="0"]').click();
    await expect(page.locator(`[data-pawn="${p.id}"]`)).toHaveAttribute('data-apparel','cloth-shirt');await page.locator(`[data-pawn="${p.id}"]`).click();
    await page.locator('#equipment-details summary').click();await expect(page.locator('#equipment-apparel')).toContainText('Chemise');await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:'artifacts/research-shirt-v73.png'});const final=await world(page);expect(validateWorld(final)).toEqual([]);
    expect(final.piles.filter(i=>i.item==='cloth').reduce((n,i)=>n+i.quantity,0)).toBe(15);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);expect(errors).toEqual([]);
    writeFileSync('artifacts/research-ui-v73.json',JSON.stringify({date:new Date().toISOString(),startTick:initial.tick,endTick:final.tick,research:final.research,shirt:final.piles.find(i=>i.id===shirt.id),errors},null,2));
  }finally{await browser.close();}
});
