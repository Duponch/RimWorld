import { expect,test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import { isColonist } from '../../src/sim/affiliation';
import { climateDateLabel } from '../../src/ui/climate-inspection';
import { WEATHER } from '../../src/sim/weather-definitions';
import { perceivedWeather } from '../../src/sim/weather';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers';
import { revealCells } from './player-actions';

// The clean V87 checkpoint is kept under tests/fixtures. The old tmp path is
// a mutable pilot output and is routinely rewritten by later schema migrations.
const sourcePath=new URL('../fixtures/colony-v87.json.gz',import.meta.url);
test('native real seasonal colony: cold load, equipment, dates and exact continuation',async({playwright})=>{
  test.skip(!existsSync(sourcePath),'Requires the completed natural V87 colony; a skip is not validation.');
  test.setTimeout(150000);
  const data=gunzipSync(readFileSync(sourcePath)).toString('utf8'),raw=JSON.parse(data);
  const initial=deserializeWorld(data);
  expect(raw.schemaVersion).toBe(87);expect(initial.schemaVersion).toBe(90);expect(initial.climate).toBeDefined();expect(validateWorld(initial)).toEqual([]);
  const colonists=initial.pawns.filter(p=>isColonist(p)&&p.state!=='dead');expect(colonists.length).toBeGreaterThanOrEqual(4);
  const turbine=initial.structures.find(s=>s.kind==='wind-turbine')!,heater=initial.structures.find(s=>s.kind==='heater')!;
  expect(turbine).toBeDefined();expect(heater).toBeDefined();
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),viewport={width:1440,height:1000};
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport}),errors=observeErrors(page);
  const report:Record<string,unknown>={version:90,sourceVersion:87,controlled:false,source:sourcePath.pathname,sha256:createHash('sha256').update(data).digest('hex'),initialTick:initial.tick,viewport,status:'running',stage:'cold-load'};
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data});await page.goto('/?e2e');
    const front=page.locator('.front-menu');await expect(front).toBeVisible();
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator(`input[name="front-save"][value="${saveKey}"]`).check();await front.getByRole('button',{name:'Charger',exact:true}).click();
    await expectWorld(page,initial);await pause(page);await expectWorld(page,initial);
    report.backend=await page.evaluate(()=>window.__lisiere.backend);expect(report.backend).toBe('WebGPU');
    await expect(page.locator('#day')).toHaveText(climateDateLabel(initial));await expect(page.locator('#weather')).toHaveText(WEATHER[perceivedWeather(initial)].label);await expect(page.locator('#colonists [data-pawn]')).toHaveCount(colonists.length);
    report.stage='equipment';
    for(const s of [turbine,heater]){
      await page.keyboard.press('Escape');await revealCells(page,[s]);
      const card=page.locator(`[data-power-id="${s.id}"]`);
      for(let i=0;i<initial.pawns.length+4&&!await card.isVisible();i++)await cell(page,s.x,s.z);
      await expect(card).toBeVisible();
      if(s.kind==='heater')await expect(card.locator('[data-heater-offset]')).toHaveCount(5);
      else await expect(card.locator('[data-wind-auto-cut]')).toBeVisible();
      await page.screenshot({path:`artifacts/environment-colony-${s.kind}-v87.png`});
    }
    await panel(page,'menu');await expect(page.locator('#climate-adopt')).toHaveCount(0);await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    report.stage='continuation';await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).tick,{timeout:60000}).toBeGreaterThanOrEqual(initial.tick+120);await pause(page);
    const continued=await world(page);expect(validateWorld(continued)).toEqual([]);expect(continued.climate).toEqual(initial.climate);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,continued);await page.keyboard.press('Escape');
    report.finalTick=continued.tick;report.date=climateDateLabel(continued);report.weather=continued.weather;report.fires=continued.fires?.items.length;report.errors=errors;expect(errors).toEqual([]);
    await page.setViewportSize({width:1100,height:760});await page.screenshot({path:'artifacts/environment-colony-small-v87.png'});
    report.status='passed';writeFileSync('artifacts/environment-colony-native-v87.json',JSON.stringify(report,null,2));
  }catch(error){report.error=String(error);report.errors=errors;report.status='failed';const name=`artifacts/environment-colony-native-failed-v87-${Date.now()}`;await page.screenshot({path:name+'.png'}).catch(()=>{});writeFileSync(name+'.json',JSON.stringify(report,null,2));throw error;}
  finally{await browser.close();}
});
