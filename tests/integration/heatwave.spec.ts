import { expect,test } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/index';
import { observeErrors,panel,pawnTab,world,expectWorld,saveKey } from './helpers';
import { perform } from './player-actions';

test('real heatwave camp: warning, insulation/health inspection, physical shelter 1x/6x and recovery after reload',async({playwright})=>{
  test.setTimeout(120000);
  const initial=deserializeWorld(readFileSync('artifacts/heatwave-checkpoint-v74.json','utf8')),p=initial.pawns.find(p=>(p.health?.heatstroke??0)>=40000000)!;
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await expect(page.locator('#heatwave-letter')).toContainText('Canicule');await expect(page.locator('#enable-heatwaves')).toBeHidden();
    await page.locator('#heatwave-letter').click();await expect(page.locator('#heatwave-dialog')).toContainText('refroidisseur passif');await page.getByRole('button',{name:'Fermer',exact:true}).click();
    await page.locator(`[data-pawn="${p.id}"]`).click();await pawnTab(page,'health');await expect(page.locator('[data-health="thermal"]')).toContainText('Coup de chaleur');
    await perform(page,{reason:'Conduire le colon exposé dans le refuge du camp.',command:{type:'draft',pawnIds:[p.id],enabled:true}},{value:0});
    await perform(page,{reason:'Rejoindre physiquement la pièce refroidie.',command:{type:'draft-move',pawnIds:[p.id],target:{x:4,z:3},queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns.find(q=>q.id===p.id)?.state).toBe('moving');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>{const q=(await world(page)).pawns.find(q=>q.id===p.id)!;return q.x===4&&q.z===3&&q.moveCooldown===0;},{timeout:20000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const sheltered=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,sheltered);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns.find(q=>q.id===p.id)?.health?.heatstroke??0,{timeout:20000}).toBe(0);await page.locator('[data-speed="0"]').click();
    await perform(page,{reason:'Reprendre la vie du camp après récupération.',command:{type:'draft',pawnIds:[p.id],enabled:false}},{value:0});
    await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:'artifacts/heatwave-refuge-v74.png'});
    const final=await world(page);expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);
    writeFileSync('artifacts/heatwave-ui-v74.json',JSON.stringify({date:new Date().toISOString(),start:initial.tick,end:final.tick,patient:p.id,before:p.health?.heatstroke,after:final.pawns.find(q=>q.id===p.id)?.health,errors},null,2));
  }finally{await browser.close();}
});
