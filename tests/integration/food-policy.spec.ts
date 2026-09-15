import { expect, test } from '@playwright/test';
import { addGroundMaterial, createWorld, deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/index';
import { withoutFoodPolicies } from '../scenarios/legacy-save';
import { world, panel, saveKey, expectWorld, observeErrors } from './helpers';

test('Affectations : régime partagé, copie, refus de suppression, faim, migration et commandes acquittées',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);page.setDefaultTimeout(10000);
  try {
    const fixture=createWorld(42,32,32);fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.stock={wood:0,food:0};
    fixture.pawns.forEach((p,i)=>{p.x=12+i*3;p.z=13;p.hunger=19;p.rest=100;p.priorities={mine:2,gather:0,build:0,haul:0,grow:0,cook:0};});
    addGroundMaterial(fixture,'food',8,{x:15,z:16},'survival-meal');
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    await page.keyboard.press('F3');await expect(page.locator('#assign-panel')).toBeVisible();
    const assign=(id:number)=>page.locator(`[data-food-policy-pawn="${id}"]`);
    await page.locator('#manage-food-policies').focus();await page.keyboard.press('Space');await expect(page.locator('#food-policy-dialog')).toBeVisible();await expect(page.locator('#pause-banner')).toBeVisible();
    await page.locator('#new-food-policy').click();await expect(page.locator('#food-policy-choice')).toHaveValue('5');
    const safeName='<b>Réserve de voyage</b>';
    await page.locator('#food-policy-name').fill(safeName);await page.locator('#deny-all-food').click();await page.locator('#apply-food-policy').click();
    await expect.poll(async()=>(await world(page)).foodPolicies.find(p=>p.id===5)).toMatchObject({name:safeName,allowed:[]});
    await page.locator('#copy-food-policy').click();await expect(page.locator('#food-policy-choice')).toHaveValue('6');
    await page.locator('[data-allowed-food="berries"]').check();await page.locator('#apply-food-policy').click();
    await expect.poll(async()=>(await world(page)).foodPolicies.find(p=>p.id===6)?.allowed).toEqual(['berries']);
    expect((await world(page)).foodPolicies.find(p=>p.id===5)?.allowed).toEqual([]);
    await page.locator('#delete-food-policy').click();await expect.poll(async()=>(await world(page)).foodPolicies.some(p=>p.id===6)).toBe(false);
    await page.keyboard.press('Escape');await expect(page.locator('#food-policy-dialog')).not.toBeVisible();
    for(const pawn of fixture.pawns) {await assign(pawn.id).selectOption('5');await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===pawn.id)?.foodPolicyId).toBe(5);}
    await page.locator('#manage-food-policies').click();await page.locator('#food-policy-choice').selectOption('5');await page.locator('#delete-food-policy').click();
    await expect(page.locator('#food-policy-feedback')).toContainText('utilisé');
    await page.screenshot({path:'artifacts/food-policies-ui.png'});await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns.every(p=>p.state==='hungry')).toBe(true);await page.locator('[data-speed="0"]').click();
    const hungry=await world(page);expect(hungry.stock.food).toBe(8);expect(hungry.pawns.every(p=>p.need===null)).toBe(true);
    await expect(page.locator('.policy-status').first()).toContainText('régime exclut');
    await page.locator('#manage-food-policies').click();await page.locator('[data-allowed-food="survival-meal"]').check();await page.locator('#apply-food-policy').click();
    await expect.poll(async()=>(await world(page)).foodPolicies.find(p=>p.id===5)?.allowed).toEqual(['survival-meal']);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns.every(p=>p.hunger>90),{timeout:15000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const fed=await world(page);expect(fed.stock.food).toBe(5);expect(validateWorld(fed)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,fed);
    const old=withoutFoodPolicies(JSON.parse(serializeWorld(fed)));old.schemaVersion=12;for(const a of old.pawns)delete a.priorities.mine;delete old.deconstructed;delete old.packed;
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:JSON.stringify(old)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,deserializeWorld(JSON.stringify(old)));
    const current=await world(page),bad=structuredClone(current);bad.pawns[0]!.foodPolicyId=999;
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:JSON.stringify(bad)});await panel(page,'menu');await page.locator('#load').click();await expect(page.locator('#notice')).toHaveClass(/error/);await expectWorld(page,current);
    await expect(page.locator('#fps-counter')).toBeVisible();expect(errors).toEqual([]);
    await testInfo.attach('food-policy-result',{contentType:'application/json',body:JSON.stringify({sharedPolicy:3,meals:3,migration:12,stock:fed.stock,errors})});
  } finally {await browser.close();}
});
