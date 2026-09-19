import { test,expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { createScenarioWorld } from '../../src/sim/new-game';
import { survivorDecisions } from '../scenarios/survivor-player';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { world,pause,panel,expectWorld,observeErrors } from './helpers';
import { perform } from './player-actions';

test('native default Survivants, explicit historical camp, rejected start, physical first decisions and save',async({playwright})=>{
  test.setTimeout(240000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const frames:number[]=[],samples:unknown[]=[];
  try {
    await page.addInitScript(()=>{
      const w=window as any;w.__scenarioFrames=[];let previous=0;
      const frame=(now:number)=>{if(previous&&w.__lisiere)w.__scenarioFrames.push(now-previous);previous=now;requestAnimationFrame(frame);};requestAnimationFrame(frame);
    });
    // No scenario parameter: exercise exactly the default offered to a person.
    const olderBackup=serializeWorld(createScenarioWorld(93,32,'camp'));
    await page.addInitScript(data=>localStorage.setItem('lisiere.previous.v1',data),olderBackup);
    await page.goto('/?e2e');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    expect((await world(page)).scenario?.id).toBe('survivors');await expect(page.locator('#map-size')).toHaveText('250 × 250');
    await panel(page,'research');await expect(page.locator('[data-air-status]')).toContainText('Acquise au départ');
    await expect(page.locator('[data-research-status]')).toContainText('Acquise au départ');
    await expect(page.locator('[data-air-start]')).toBeDisabled();
    await panel(page,'menu');await expect(page.locator('#scenario-current')).toContainText(/survivants/i);
    await page.locator('#new-colony').click();await page.locator('#world-size').selectOption('32');await page.locator('#world-scenario').selectOption('sentry');
    const before=await world(page);await page.locator('#new-world-form button[type="submit"]').click();
    await expect(page.locator('#new-world-error')).toBeVisible();await expectWorld(page,before);
    expect(await page.evaluate(()=>localStorage.getItem('lisiere.previous.v1'))).toBe(olderBackup);
    await page.locator('#world-scenario').selectOption('camp');await page.locator('#world-size').selectOption('250');await page.locator('#new-world-form button[type="submit"]').click();
    await expect(page.locator('#new-world-dialog')).not.toBeVisible();await expectWorld(page,createScenarioWorld(42,250,'camp'));
    await panel(page,'research');await expect(page.locator('[data-research-status]')).toContainText('En attente');
    await panel(page,'menu');await page.locator('#new-colony').click();
    await page.locator('#world-size').selectOption('250');await page.locator('#world-scenario').selectOption('survivors');
    await page.locator('#new-world-form button[type="submit"]').click();await expect(page.locator('#new-world-dialog')).not.toBeVisible();
    await expectWorld(page,createScenarioWorld(42,250,'survivors'));
    const rotation={value:0},initial=await world(page);
    for(const decision of survivorDecisions(initial))await perform(page,decision,rotation);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.filter(s=>s.kind==='bed').length,{timeout:70000}).toBe(3);
    await pause(page);const established=await world(page);expect(validateWorld(established)).toEqual([]);
    expect(established.stock.wood).toBeLessThan(initial.stock.wood);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,established);
    await page.keyboard.press('Escape');
    for(const speed of [1,6]){
      await page.evaluate(()=>{(window as any).__scenarioFrames=[];});await page.locator(`[data-speed="${speed}"]`).click();
      const tick=(await world(page)).tick;await page.waitForTimeout(10000);await pause(page);
      frames.splice(0,frames.length,...await page.evaluate(()=>(window as any).__scenarioFrames as number[]));frames.sort((a,b)=>a-b);
      samples.push({speed,ticks:(await world(page)).tick-tick,p95:frames[Math.floor(frames.length*.95)],p99:frames[Math.floor(frames.length*.99)],max:frames.at(-1),frames:frames.length});
    }
    await page.screenshot({path:'artifacts/scenario-start-v80.png'});
    writeFileSync('tmp/survivor-ui-v80.json',serializeWorld(await world(page)));
    writeFileSync('artifacts/scenario-ui-v80.json',JSON.stringify({backend:await page.evaluate(()=>window.__lisiere.backend),viewport:{width:1440,height:1000},initial:{resources:initial.resources.length,scenario:initial.scenario},samples,errors},null,2));
    expect(errors).toEqual([]);
    const invalid=await browser.newPage({baseURL:'http://127.0.0.1:5173'});
    await invalid.goto('/?seed=4294967296');await expect(invalid.locator('#loading')).toContainText('Graine invalide');await invalid.close();
  }finally{await browser.close();}
});
