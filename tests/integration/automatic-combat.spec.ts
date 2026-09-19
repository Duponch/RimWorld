import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { automaticCamp } from '../scenarios/automatic-combat';
import { applyCommand } from '../../src/sim/engine';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { world,panel,expectWorld,observeErrors,saveKey } from './helpers';

test('native UI: hold/allow fire, civilian Attack from Assign/inspector, actual wounds and exact continuation at 1x/6x',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),reports=[];
  page.setDefaultTimeout(15000);
  try {
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:`const autoFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__automaticView=this;return autoFrame.apply(this,args);};\n`+await response.text()});});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#save').click();await page.keyboard.press('Escape');
    for(const speed of [1,6]) {
      const initial=automaticCamp(),p=initial.pawns[0];
      if(speed===6)applyCommand(initial,{type:'draft',pawnIds:[p.id],enabled:false});
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');await page.locator(`[data-pawn="${p.id}"]`).click();
      if(speed===1){
        await expect(page.locator('#fire-at-will')).toHaveAttribute('aria-pressed','false');await page.locator('#fire-at-will').click();await expect(page.locator('#fire-at-will')).toHaveAttribute('aria-pressed','true');
      } else {
        await panel(page,'assign');await page.getByLabel(`Réaction hostile de ${p.name}`,{exact:true}).selectOption('attack');await page.keyboard.press('Escape');await page.locator(`[data-pawn="${p.id}"]`).click();await expect(page.locator('#inspector-hostility')).toHaveValue('attack');
      }
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns[0].lastAttack?.targetId,{timeout:12000}).toBe(initial.pawns[3].id);
      await expect.poll(async()=>(await world(page)).pawns[3].health?.injuries.length??0,{timeout:18000}).toBeGreaterThan(0);
      await page.locator('[data-speed="0"]').click();const fought=await world(page);expect(validateWorld(fought)).toEqual([]);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,fought);await page.keyboard.press('Escape');await page.locator(`[data-pawn="${p.id}"]`).click();
      expect(fought.pawns[0].shooting?.stance?.phase).toBe('cooldown');
      const heading=await page.evaluate(()=>{const v=(window as any).__automaticView;return v.pawns.pawnMesh.geometry.getAttribute('aTo').getW(0);});
      expect(Math.cos(heading-Math.atan2(fought.pawns[3].x-fought.pawns[0].x,fought.pawns[3].z-fought.pawns[0].z))).toBeCloseTo(1,5);
      if(speed===6){await page.locator('#inspector-hostility').selectOption('ignore');await panel(page,'assign');await expect(page.getByLabel(`Réaction hostile de ${p.name}`,{exact:true})).toHaveValue('ignore');await page.keyboard.press('Escape');}
      else {await page.locator('#fire-at-will').click();await expect(page.locator('#fire-at-will')).toHaveAttribute('aria-pressed','false');}
      reports.push({speed,tick:fought.tick,actor:fought.pawns[0],target:fought.pawns[3]});
    }
    await page.locator('[data-pawn]').first().click();await expect(page.locator('#fps-counter')).toBeVisible();expect(errors).toEqual([]);await page.screenshot({path:'artifacts/automatic-combat-v60.png'});
    writeFileSync('artifacts/automatic-combat-ui-v60.json',JSON.stringify({reports,errors},null,2)+'\n');
  }finally{await browser.close();}
});
