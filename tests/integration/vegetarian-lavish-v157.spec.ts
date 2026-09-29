import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {TICKS_PER_DAY,type World} from '../../src/sim/types.ts';
import {cell,expectWorld,observeErrors,panel,pause,pawnTab,saveKey,world} from './helpers.ts';
import {editBill,revealCells} from './player-actions.ts';

test('V157 prepared vegetarian lavish meal uses UI, worker, save and ingestion',async({page})=>{
  test.setTimeout(180000);
  // Prepare a copy of the historical V152 scene, then hold it at V156 for
  // the browser load. The player still sets the policy and bill through UI.
  const legacy=JSON.parse(readFileSync(new URL('../../public/test-saves/v152/repas-fin.json',import.meta.url),'utf8')) as World;
  expect(legacy.schemaVersion).toBe(152);
  for(const pile of legacy.piles)if(pile.item==='milk')pile.quantity=12;else if(pile.item==='rice')pile.quantity=13;
  legacy.stock.food=25;
  const legacyEater=legacy.pawns[1]!;
  legacyEater.memories=[{kind:'ate-fine-meal',expiresAt:legacy.tick+TICKS_PER_DAY}];
  const v156=deserializeWorld(JSON.stringify(legacy));
  v156.schemaVersion=156 as World['schemaVersion'];
  const raw=JSON.stringify(v156),prepared=deserializeWorld(raw),cook=prepared.pawns[0]!,eater=prepared.pawns[1]!;
  const stove=prepared.structures.find(s=>s.kind==='fueled-stove')!;
  expect(validateWorld(prepared)).toEqual([]);
  expect(prepared.piles.filter(p=>p.item==='milk'||p.item==='rice').map(p=>[p.item,p.quantity])).toEqual([['milk',12],['rice',13]]);
  expect(prepared.piles.some(p=>p.item==='vegetarian-lavish-meal')).toBe(false);
  expect(stove.bills).toEqual([]);
  expect(stove.fuel!.ticks).toBeGreaterThan(0);
  expect(cook.skills.cooking!.level).toBeGreaterThanOrEqual(8);
  expect(prepared.foodPolicies.find(p=>p.id===eater.foodPolicyId)!.allowed).not.toContain('vegetarian-lavish-meal');

  const errors=observeErrors(page);
  await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  await pause(page);
  await panel(page,'menu');await page.locator('#load').click();
  await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page,prepared);

  await page.keyboard.press('Escape');await panel(page,'assign');
  await page.locator('#manage-food-policies').click();
  await page.locator('#food-policy-choice').selectOption(String(eater.foodPolicyId));
  const permission=page.locator('[data-allowed-food="vegetarian-lavish-meal"]');
  await expect(permission).not.toBeChecked();
  await expect(permission.locator('..')).toContainText('Plat végétarien gastronomique');
  await permission.check();await page.locator('#apply-food-policy').click();
  await expect.poll(async()=>(await world(page)).foodPolicies.find(p=>p.id===eater.foodPolicyId)?.allowed.includes('vegetarian-lavish-meal')).toBe(true);
  await page.locator('#close-food-policies').click();
  await page.getByRole('button',{name:'Fermer Assignations'}).click();
  await page.locator(`[data-pawn="${eater.id}"]`).click();await pawnTab(page,'needs');
  await expect(page.locator('[data-thought="ate-fine-meal"]')).toContainText('+5');

  await page.keyboard.press('Escape');await revealCells(page,[stove]);await cell(page,stove.x,stove.z);
  const add=page.locator('[data-add-recipe="vegetarian-lavish-meal"]');
  await expect(add).toBeEnabled();await expect(add).toContainText('plat gastronomique végétarien');await add.click();
  await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===stove.id)?.bills?.length).toBe(1);
  const bill=(await world(page)).structures.find(s=>s.id===stove.id)!.bills![0]!;
  expect(bill.recipe).toBe('vegetarian-lavish-meal');
  await expect(page.locator(`[data-bill="${bill.id}"] .bill-cost`)).toContainText('25 végétaux ou lait · Cuisine 8');
  await editBill(page,bill.id,{...bill,filters:{...bill.filters,milk:true,rice:true},destination:'drop'});
  await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===stove.id)?.bills?.[0]?.destination).toBe('drop');
  await expect(page.locator(`[data-bill="${bill.id}"] [data-field="milk"]`)).toBeChecked();
  await expect(page.locator(`[data-bill="${bill.id}"] [data-field="rice"]`)).toBeChecked();
  await expect(page.locator(`[data-bill="${bill.id}"] [data-field="hare-meat"]`)).toHaveCount(0);
  await panel(page,'work');
  await page.locator(`select[data-owner="${cook.id}"][data-work="cook"]`).selectOption('1');
  await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();

  await page.waitForFunction(id=>{
    const task=window.__lisiere.world.pawns.find(p=>p.id===id)?.cooking;
    if(task?.recipe!=='vegetarian-lavish-meal'||task.phase!=='work'||task.progress<10)return false;
    (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;
  },cook.id,{polling:50,timeout:45000});
  await expect(page.locator('#pause-banner')).toBeVisible();
  const working=await world(page),task=working.pawns.find(p=>p.id===cook.id)!.cooking!;
  expect(task.ingredients.reduce((sum,i)=>sum+i.quantity,0)).toBe(25);
  expect(task.ingredients.every(i=>i.stage==='placed')).toBe(true);
  expect(working.piles.some(p=>p.item==='vegetarian-lavish-meal')).toBe(false);
  expect(validateWorld(working)).toEqual([]);
  await panel(page,'menu');await page.locator('#save').click();
  await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
  await page.locator('#load').click();await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page,working);
  await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(id=>{
    const current=window.__lisiere.world;
    if(current.pawns.find(p=>p.id===id)?.cooking||!current.piles.some(p=>p.item==='vegetarian-lavish-meal'&&p.owner.type==='ground'))return false;
    (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;
  },cook.id,{polling:50,timeout:45000});
  const cooked=await world(page);
  expect(cooked.piles.filter(p=>p.item==='vegetarian-lavish-meal').reduce((sum,p)=>sum+p.quantity,0)).toBe(1);
  expect(cooked.piles.filter(p=>p.item==='milk'||p.item==='rice').reduce((sum,p)=>sum+p.quantity,0)).toBe(0);
  expect(cooked.structures.find(s=>s.id===stove.id)!.fuel!.burned).toBeGreaterThan(0);
  expect(cooked.structures.find(s=>s.id===stove.id)!.bills![0]!.target).toBe(0);
  expect(validateWorld(cooked)).toEqual([]);
  await expect(page.locator('#food-items [data-item="vegetarian-lavish-meal"]')).toContainText('Plat végétarien gastronomique');

  const product=cooked.piles.find(p=>p.item==='vegetarian-lavish-meal')!;
  if(product.owner.type==='ground'){
    const owner=product.owner;
    await page.locator(`[data-pawn="${cook.id}"]`).click({modifiers:['Shift']});
    const project=()=>page.evaluate(({x,z})=>{
      const canvas=document.querySelector<HTMLCanvasElement>('#viewport canvas')!;
      const bounds=canvas.getBoundingClientRect(),point=window.__lisiere.projectCell(x,z);
      const px=bounds.x+point.x,py=bounds.y+point.y;
      return {x:px,y:py,target:document.elementFromPoint(px,py)?.tagName};
    },owner);
    let point=await project();
    for(let attempt=0;attempt<3&&point.target!=='CANVAS';attempt++){
      const anchor=await page.evaluate(()=>{
        const b=document.querySelector<HTMLCanvasElement>('#viewport canvas')!.getBoundingClientRect();
        for(const [fx,fy] of [[.67,.38],[.72,.5],[.58,.35],[.8,.4]]){
          const x=b.x+b.width*fx,y=b.y+b.height*fy;
          if(document.elementFromPoint(x,y)?.tagName==='CANVAS')return{x,y};
        }
        throw new Error('Aucune surface libre pour déplacer la carte vers le repas.');
      });
      const dx=Math.max(-260,Math.min(260,anchor.x-point.x));
      const dy=Math.max(-180,Math.min(180,anchor.y-point.y));
      await page.mouse.move(anchor.x,anchor.y);await page.mouse.down({button:'middle'});
      await page.mouse.move(anchor.x+dx,anchor.y+dy,{steps:8});await page.mouse.up({button:'middle'});
      await page.waitForTimeout(1200);
      point=await project();
    }
    expect(point.target,`Le repas livré en ${owner.x},${owner.z} doit être cliquable sur la carte.`).toBe('CANVAS');
    await page.mouse.click(point.x,point.y);
    await expect(page.locator('#cell-title')).toHaveText('Plat végétarien gastronomique');
    await expect(page.locator('.cell-illustration')).toHaveAttribute('data-icon','meal');
  }

  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===eater.id)?.memories.some(m=>m.kind==='ate-lavish-meal'),{timeout:45000,intervals:[100]}).toBe(true);
  await pause(page);
  const eaten=await world(page),eaterNow=eaten.pawns.find(p=>p.id===eater.id)!;
  expect(eaten.piles.some(p=>p.item==='vegetarian-lavish-meal')).toBe(false);
  expect(eaterNow.hunger).toBeGreaterThan(prepared.pawns[1]!.hunger);
  expect(eaterNow.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
  expect(validateWorld(eaten)).toEqual([]);
  await page.locator(`[data-pawn="${eater.id}"]`).click();await pawnTab(page,'needs');
  await expect(page.locator('[data-thought="ate-lavish-meal"]')).toContainText('+12');
  await expect(page.locator('[data-thought="ate-fine-meal"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
