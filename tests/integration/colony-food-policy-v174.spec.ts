import { expect, test } from '@playwright/test';
import { applyCommand, serializeWorld, validateWorld } from '../../src/sim/index.ts';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials.ts';
import { playerDecisions, foodAccount } from '../scenarios/colony-player.ts';
import { createSimpleMealLedger, observeSimpleMealLedger } from '../scenarios/simple-meal-ledger.ts';
import { foodWorkstationCamp } from '../scenarios/food-workstations.ts';
import { fixtureFire } from '../scenarios/work-environment.ts';
import { perform } from './player-actions.ts';
import { expectWorld, observeErrors, panel, pause, saveKey, world } from './helpers.ts';

for (const [rawUnits, recipe, portions] of [[40, 'cook-simple-meal-bulk', 4], [10, 'simple-meal', 1]] as const) {
  test(`V174 prepared player UI chooses ${recipe}, with physical collection and exact resume`, async ({ page }) => {
    test.setTimeout(150000);
    // Prepared engineering boundary, not a naturally developed camp. Only the
    // old unit bill, fuel, raw rice and storage exist before the player acts.
    const prepared=foodWorkstationCamp(),pawn=prepared.pawns[0]!;
    pawn.priorities.cook=1;
    const fire=fixtureFire(prepared,6,4);
    addGroundMaterial(prepared,'food',rawUnits,{x:6,z:6},'rice');
    prepared.stockpiles.push({id:prepared.nextId++,x:8,z:6,filters:{wood:false,food:true},items:{'simple-meal':true},priority:2,capacity:10});
    refreshStock(prepared);
    expect(applyCommand(prepared,{type:'bill-add',structureId:fire.id,recipe:'simple-meal'}).ok).toBe(true);
    expect(validateWorld(prepared)).toEqual([]);
    const errors=observeErrors(page),raw=serializeWorld(prepared),rotation={value:0};
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);
    const commands:string[]=[];
    for(let pass=0;pass<5;pass++) {
      const current=await world(page);
      const bills=playerDecisions(current,{bulkMeals:true}).filter(d=>d.command.type==='bill-add'||d.command.type==='bill-update'||d.command.type==='bill-move');
      if(!bills.length)break;
      for(const d of bills){await perform(page,d,rotation);commands.push(d.command.type);}
    }
    const configured=await world(page),bills=configured.structures.find(s=>s.id===fire.id)!.bills!;
    expect(bills.map(b=>b.recipe)).toEqual(['cook-simple-meal-bulk','simple-meal']);
    expect(bills.every(b=>b.mode==='until'&&b.target===2&&!b.suspended)).toBe(true);
    expect(commands).toContain('bill-add');expect(commands).toContain('bill-update');expect(commands).toContain('bill-move');
    const order=playerDecisions(configured,{bulkMeals:true}).find(d=>d.command.type==='order-cook');
    expect(order).toBeDefined();await perform(page,order!,rotation);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(({id,recipe})=>{
      const task=window.__lisiere.world.pawns.find(p=>p.id===id)?.cooking;
      if(!task|| (task.recipe??'simple-meal')!==recipe||task.phase!=='work'||task.progress<=0)return false;
      (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;
    },{id:pawn.id,recipe},{polling:50,timeout:60000});
    await expect(page.locator('#pause-banner')).toBeVisible();
    const working=await world(page),task=working.pawns.find(p=>p.id===pawn.id)!.cooking!;
    expect(task.ingredients.every(i=>i.stage==='placed')).toBe(true);
    expect(task.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(rawUnits);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,working);
    const ledger=createSimpleMealLedger(working.events);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(({id,portions})=>{
      const w=window.__lisiere.world;
      if(w.pawns.find(p=>p.id===id)?.cooking||w.piles.filter(p=>p.item==='simple-meal'&&p.owner.type==='ground'&&p.owner.x===8&&p.owner.z===6).reduce((n,p)=>n+p.quantity,0)!==portions)return false;
      (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;
    },{id:pawn.id,portions},{polling:50,timeout:60000});
    await expect(page.locator('#pause-banner')).toBeVisible();
    const final=await world(page);observeSimpleMealLedger(ledger,final.events);
    expect(ledger.totals).toMatchObject({operations:1,portions,ingredients:rawUnits,unitDelta:rawUnits-portions});
    expect(foodAccount(final)+ledger.totals.unitDelta).toBe(foodAccount(prepared));
    expect(final.piles.filter(p=>p.item==='rice')).toEqual([]);
    expect(final.structures.find(s=>s.id===fire.id)!.fuel!.burned).toBeGreaterThan(0);
    expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);
  });
}
