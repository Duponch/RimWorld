import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { medicalCamp } from '../scenarios/health';
import { addMaterial } from '../../src/sim/materials';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { moodTarget,moodThoughts } from '../../src/sim/mood';
import { observeErrors,panel,saveKey,world,expectWorld } from './helpers';
import { perform } from './player-actions';

test('mood causes at 1x/6x: real ingestion, remembered meal, physical clothing removal and saved gradual level',async({playwright})=>{
  test.setTimeout(120000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),proof=[];
  try{for(const speed of [1,6]){
    const initial=medicalCamp(),p=initial.pawns[0]!;initial.piles=[];Object.assign(p,{hunger:10,rest:80,comfort:50,mood:50});p.recreation.level=50;
    addMaterial(initial,'apparel',1,{type:'apparel',pawnId:p.id},'flak-vest');const vest=initial.piles.at(-1)!;vest.apparel!.hitPoints=10;
    addMaterial(initial,'food',20,{type:'ground',x:p.x+2,z:p.z},'rice');
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');await page.locator(`[data-pawn="${p.id}"]`).click();if(await page.locator('#mood-inspection').getAttribute('open')===null)await page.locator('#mood-inspection summary').click();
    await expect(page.locator('#mood-target')).toContainText('cible 45 %');await expect(page.locator('[data-thought="tattered-apparel"]')).toBeVisible();
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>{const s=(await world(page)).pawns[0]!;return s.need?.kind==='eat'&&s.need.phase==='ingest';},{intervals:[100]}).toBe(true);await page.locator('[data-speed="0"]').click();
    const eating=await world(page);expect(eating.pawns[0]!.memories).toEqual([]);expect(eating.pawns[0]!.mood).toBeLessThan(50);expect(eating.pawns[0]!.mood).toBeGreaterThan(45);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,eating);await page.keyboard.press('Escape');
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).pawns[0]!.memories.length).toBe(2);await page.locator('[data-speed="0"]').click();
    const fed=await world(page);expect(validateWorld(fed)).toEqual([]);expect(fed.pawns[0]!.hunger).toBeGreaterThan(80);expect(fed.pawns[0]!.mood).toBeGreaterThan(moodTarget(moodThoughts(fed,fed.pawns[0]!)));
    await page.locator(`[data-pawn="${p.id}"]`).click();if(await page.locator('#mood-inspection').getAttribute('open')===null)await page.locator('#mood-inspection summary').click();await expect(page.locator('[data-thought="ravenous"]')).toHaveCount(0);await expect(page.locator('[data-thought="ate-raw-food"]')).toContainText('-7');await expect(page.locator('[data-thought="ate-without-table"]')).toContainText('encore 24 h');
    await perform(page,{reason:'Remplacer le vêtement usé : le retirer physiquement.',command:{type:'order-equipment',pawnId:p.id,itemId:vest.id,action:'remove',queue:false}},{value:0});
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).piles.find(i=>i.id===vest.id)!.owner.type).toBe('ground');await page.locator('[data-speed="0"]').click();
    const removed=await world(page);await page.locator(`[data-pawn="${p.id}"]`).click();if(await page.locator('#mood-inspection').getAttribute('open')===null)await page.locator('#mood-inspection summary').click();await expect(page.locator('[data-thought="tattered-apparel"]')).toHaveCount(0);await expect(page.locator('#mood-target')).toContainText('cible 52 %');
    await page.screenshot({path:`artifacts/mood-v64-${speed}x.png`});
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).pawns[0]!.mood).toBeGreaterThan(removed.pawns[0]!.mood+.1);await page.locator('[data-speed="0"]').click();
    const final=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);expect(errors).toEqual([]);
    proof.push({speed,initialTick:initial.tick,finalTick:final.tick,initialMood:p.mood,eatingMood:eating.pawns[0]!.mood,fedMood:fed.pawns[0]!.mood,finalMood:final.pawns[0]!.mood,thoughts:moodThoughts(final,final.pawns[0]!),errors});await page.close();
  }}finally{await browser.close();}
  writeFileSync('artifacts/mood-ui-v64.json',JSON.stringify({date:new Date().toISOString(),proof},null,2)+'\n');
});
