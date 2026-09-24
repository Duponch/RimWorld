import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { visitorTradeFixture } from '../scenarios/visitors';
import { addGroundMaterial,addMaterial } from '../../src/sim/materials';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { observeErrors,panel,pawnTab,pause,saveKey,world,expectWorld } from './helpers';
import { perform } from './player-actions';

const version=process.env.VALIDATION_VERSION??'v88';

test('native trade: real contact, basket, silver, deposited rifle, equipment and restored ownership',async({playwright})=>{
  test.setTimeout(120000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    // Controlled commercial boundary, distinct from the natural colony pilot.
    const {world:initial,traderId,pawnId}=visitorTradeFixture(),p=initial.pawns.find(p=>p.id===pawnId)!;
    addGroundMaterial(initial,'silver',500,p,'silver');initial.home=initial.tiles.map((_,i)=>i);
    addMaterial(initial,'weapon',1,{type:'inventory',pawnId:traderId},'bolt-action-rifle');
    const rifle=initial.piles.find(p=>p.item==='bolt-action-rifle'&&p.owner.type==='inventory')!;
    expect(validateWorld(initial)).toEqual([]);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await expect(page.locator('#inspect-threat')).toBeHidden();
    await page.locator('#trade-letter').click();await page.locator('#trade-merchant').selectOption(String(traderId));await page.locator('#trade-negotiator').selectOption(String(pawnId));await page.locator('#trade-contact').click();
    await page.locator('#trade-close').click();
    // Closing voluntarily cancels the contact; reopen with time running.
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===pawnId)?.trade).toBeUndefined();
    await pause(page);await page.locator('#trade-letter').click();await page.locator('#trade-contact').click();
    await expect(page.locator('#trade-goods')).toBeVisible({timeout:30000});
    await expect(page.locator('#inspect-threat')).toBeHidden();
    await page.locator(`input[data-pile="${rifle.id}"]`).fill('1');await expect(page.locator('#trade-total')).toContainText('À payer');
    await page.screenshot({path:`artifacts/trade-basket-${version}.png`});
    await page.locator('#trade-confirm').click();await expect(page.locator('#trade-dialog')).not.toBeVisible();
    const bought=await world(page);expect(bought.trade?.count).toBe(1);expect(bought.piles.find(p=>p.id===rifle.id)?.owner.type).toBe('ground');expect(validateWorld(bought)).toEqual([]);
    await perform(page,{reason:'Équiper le fusil acheté',command:{type:'order-equipment',pawnId,itemId:rifle.id,action:'equip',queue:false}},{value:0});
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).piles.find(p=>p.id===rifle.id)?.owner.type,{timeout:20000}).toBe('equipment');await pause(page);
    const equipped=await world(page);expect(validateWorld(equipped)).toEqual([]);
    await page.locator(`[data-pawn="${pawnId}"]`).click();await pawnTab(page,'gear');await expect(page.locator('#equipment-primary')).toContainText('Fusil à verrou');await expect(page.locator(`[data-pawn="${pawnId}"]`)).toHaveAttribute('data-equipment','bolt-action-rifle');
    await page.screenshot({path:`artifacts/trade-equipment-${version}.png`});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,equipped);
    expect(errors).toEqual([]);writeFileSync(`artifacts/trade-ui-${version}.json`,JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',fixture:'controlled visitor intro with explicit silver and rifle stock',traderId,pawnId,rifleId:rifle.id,receipt:equipped.trade?.recent.at(-1),finalTick:equipped.tick,restored:true,errors},null,2)+'\n');
  } finally {await browser.close();}
});
