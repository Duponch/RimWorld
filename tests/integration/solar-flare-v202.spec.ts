import { readFileSync } from 'node:fs';
import { expect,test } from '@playwright/test';
import { SOLAR_FLARE_CELLS } from '../helpers/solar-flare-v202-fixture.ts';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers.ts';
import { revealCells } from './player-actions.ts';
import { TEST_COLONY_COUNT } from '../test-colony-count.ts';
import { testOutputPath,writeTestFile } from '../test-output.ts';

/** Public prepared chronology, confirmed worker snapshots and real pointer UI.
 * No clock, active condition, charge or power state is injected into the page. */
test('V202 public flare letter, power inspection, exact active save and physical recovery in native WebGPU',async({playwright})=>{
  test.setTimeout(150_000);
  const prepared=deserializeWorld(readFileSync('public/test-saves/v202/eruption-solaire.json','utf8'));
  expect(validateWorld(prepared)).toEqual([]);expect(prepared.worldIncidents!.active).toBeUndefined();
  const lampId=prepared.structures.find(s=>s.kind==='sun-lamp')!.id,batteryId=prepared.structures.find(s=>s.kind==='battery')!.id;
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.addInitScript(()=>{
      const probe={pipelines:0,hooked:false};(window as any).__v202Probe=probe;
      const device=(globalThis as any).GPUDevice?.prototype;
      if(device)for(const name of ['createRenderPipeline','createRenderPipelineAsync']){
        const original=device[name];device[name]=function(...args:any[]){probe.pipelines++;return Reflect.apply(original,this,args);};probe.hooked=true;
      }
    });
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.getByRole('button',{name:'Colonies de test',exact:true}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);expect(TEST_COLONY_COUNT).toBe(48);
    await front.locator('input[name="test-colony"][value="eruption-solaire-v202"]').check();
    await front.getByRole('button',{name:'Charger cette colonie',exact:true}).click();await expectWorld(page,prepared);await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await expect(page.locator('#solar-flare-letter')).toHaveCount(0);
    const baseline=await page.evaluate(()=>(window as any).__v202Probe.pipelines);
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(()=>!!window.__lisiere.world.worldIncidents?.active);await pause(page);
    const started=await world(page);expect(started.worldIncidents!.lastStart).toBe(90100);expect(started.worldIncidents!.flares).toBe(1);
    await page.locator('#solar-flare-letter').click();await expect(page.locator('#solar-flare-dialog')).toBeVisible();
    await expect(page.locator('#solar-flare-dialog')).toContainText('s’arrêtent progressivement');
    await expect(page.locator('#solar-flare-dialog')).toContainText('autodécharge continue');
    await expect(page.locator('#solar-flare-dialog')).toContainText('couture électrique');
    await page.locator('#solar-flare-dialog').getByRole('button',{name:'Fermer',exact:true}).click();
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(()=>window.__lisiere.world.structures.filter(s=>['sun-lamp','standing-lamp','cooler','electric-tailor-bench'].includes(s.kind)).every(s=>s.power?.on===false));
    await pause(page);const off=await world(page);expect(validateWorld(off)).toEqual([]);expect(off.resources.every(r=>r.growthLight==='dark')).toBe(true);
    await revealCells(page,[SOLAR_FLARE_CELLS.lamp]);await cell(page,SOLAR_FLARE_CELLS.lamp.x,SOLAR_FLARE_CELLS.lamp.z);
    await expect(page.locator(`[data-power-id="${lampId}"]`)).toContainText('Éruption solaire');
    await expect(page.locator(`[data-power-id="${lampId}"]`)).toContainText('redémarrage suspendu');
    await revealCells(page,[SOLAR_FLARE_CELLS.battery]);await cell(page,SOLAR_FLARE_CELLS.battery.x,SOLAR_FLARE_CELLS.battery.z);
    await expect(page.locator(`[data-power-id="${batteryId}"]`)).toContainText('charge et décharge du réseau suspendues');
    await expect(page.locator(`[data-power-id="${batteryId}"]`)).toContainText('réserve conservée');
    await page.screenshot({path:testOutputPath('artifacts/solar-flare-v202-off-iso.png')});
    await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(()=>page.evaluate(key=>{const raw=localStorage.getItem(key);return raw?JSON.parse(raw).tick:null;},saveKey)).toBe(off.tick);
    const saved=deserializeWorld((await page.evaluate(key=>localStorage.getItem(key),saveKey))!);expect(saved).toEqual(off);
    await page.locator('#load').click();await expectWorld(page,saved);await page.keyboard.press('Escape');
    await expect(page.locator('#solar-flare-letter')).toContainText('Éruption solaire');
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(()=>!window.__lisiere.world.worldIncidents?.active);
    await page.waitForFunction(id=>window.__lisiere.world.structures.find(s=>s.id===id)?.power?.on===true,lampId);
    await pause(page);const recovered=await world(page);expect(validateWorld(recovered)).toEqual([]);
    expect(recovered.worldIncidents!.flares).toBe(1);expect(recovered.worldIncidents!.lastEndCore).toBe(910000);
    expect(recovered.resources.every(r=>r.growthLight==='artificial-full')).toBe(true);
    await expect(page.locator('#solar-flare-letter')).toContainText('terminée');await page.locator('#solar-flare-letter').click();
    await expect(page.locator('#solar-flare-dialog')).toContainText('redémarrent selon leurs cadences');
    await page.locator('#solar-flare-dialog').getByRole('button',{name:'Fermer',exact:true}).click();
    await revealCells(page,[SOLAR_FLARE_CELLS.lamp]);await cell(page,SOLAR_FLARE_CELLS.lamp.x,SOLAR_FLARE_CELLS.lamp.z);
    await expect(page.locator(`[data-power-id="${lampId}"]`)).toContainText('Allumée');await expect(page.locator(`[data-power-id="${lampId}"]`)).not.toContainText('redémarrage suspendu');
    await page.locator('#camera-mode').click();await page.keyboard.press('Escape');await revealCells(page,[SOLAR_FLARE_CELLS.lamp]);
    await page.screenshot({path:testOutputPath('artifacts/solar-flare-v202-recovered-perspective.png')});
    const final=await page.evaluate(()=>(window as any).__v202Probe);expect(final.hooked).toBe(true);expect(final.pipelines).toBe(baseline);expect(errors).toEqual([]);
    await writeTestFile('artifacts/solar-flare-v202-native.json',JSON.stringify({prepared:true,initialTick:prepared.tick,start:started.worldIncidents!.active,
      offTick:off.tick,saveTick:saved.tick,recoveredTick:recovered.tick,pipelinesBefore:baseline,pipelinesAfter:final.pipelines,
      batteryBefore:prepared.structures.find(s=>s.id===batteryId)!.battery,batteryDuring:off.structures.find(s=>s.id===batteryId)!.battery,
      notice:'Scène préparée 32×32, chronologie réelle ; aucune fréquence naturelle, campagne longue ou mesure CPU/GPU générale.',errors},null,2));
  }finally{await writeTestFile('artifacts/solar-flare-v202-native-errors.json',JSON.stringify(errors));await browser.close();}
});
