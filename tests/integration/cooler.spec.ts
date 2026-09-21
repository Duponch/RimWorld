import { expect,test } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/index';
import { observeErrors,panel,world,expectWorld,saveKey,cell,tool } from './helpers';
import { perform,revealCells } from './player-actions';

test('earned research, physical freezer construction, storage, thermostat and exact UI reload at 1x/6x',async({playwright})=>{
  test.setTimeout(180000);
  const initial=deserializeWorld(readFileSync('artifacts/cold-store-preparation-v75.json','utf8'));
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await panel(page,'research');await expect(page.locator('[data-air-status]')).toContainText('En cours');
    await page.locator('[data-research-pause]').click();await expect.poll(async()=>(await world(page)).research?.project).toBeNull();
    await page.locator('[data-research-start]').click();await expect.poll(async()=>(await world(page)).research?.project).toBe('complex-clothing');
    await page.locator('[data-air-start]').click();await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>(await world(page)).research!.airConditioning!.points).toBeGreaterThan(initial.research!.airConditioning!.points);
    await page.locator('[data-speed="6"]').click();await expect(page.locator('[data-air-status]')).toContainText('Terminée',{timeout:40000});await page.locator('[data-speed="0"]').click();
    await perform(page,{reason:'Fermer le garde-manger avec l’appareil recherché.',command:{type:'designate',kind:'cooler',material:'steel',x:3,z:2,orientation:0}},{value:0});
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='cooler'),{timeout:45000}).toBe(true);await page.locator('[data-speed="0"]').click();
    await revealCells(page,[{x:3,z:2}]);await cell(page,3,2);await expect(page.locator('#cooler-controls')).toContainText('Cible 21.0');
    for(let i=0;i<3;i++)await page.locator('[data-cooler-offset="-10"]').click();
    for(let i=0;i<4;i++)await page.locator('[data-cooler-offset="1"]').click();
    await expect(page.locator('#cooler-controls')).toContainText('Cible -5.0');
    await tool(page,'stockpile');await page.locator('#stockpile-wood').setChecked(false);await page.locator('#stockpile-food').setChecked(true);
    await perform(page,{reason:'Réserver cette pièce aux aliments.',command:{type:'area',action:'stockpile',filters:{silver:true,corpse:false,unfinished:false,textile:false,apparel:false,weapon:false,medicine:false,component:false,blocks:false,steel:false,chunk:false,wood:false,food:true,furniture:false},from:{x:3,z:3},to:{x:5,z:5}}},{value:0});
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>{const w=await world(page),food=w.piles.filter(p=>p.item==='simple-meal');return food.reduce((n,p)=>n+p.quantity,0)===20&&food.every(p=>p.owner.type==='ground'&&p.rot?.rate===0);},{timeout:45000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const frozen=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,frozen);await page.keyboard.press('Escape');
    await revealCells(page,[{x:3,z:2}]);await cell(page,3,2);await expect(page.locator('#cooler-controls')).toContainText('Cible -5.0');
    await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:'artifacts/cooler-v75.png'});
    await page.locator('[data-cooler-offset="null"]').click();await expect(page.locator('#cooler-controls')).toContainText('Cible 21.0');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).piles.some(p=>p.item==='simple-meal'&&(p.rot?.rate??0)>0),{timeout:25000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);
    writeFileSync('artifacts/cooler-ui-v75.json',JSON.stringify({date:new Date().toISOString(),start:initial.tick,frozenAt:frozen.tick,end:final.tick,research:final.research,buildings:final.structures.map(s=>s.kind),errors},null,2));
  }finally{await browser.close();}
});
