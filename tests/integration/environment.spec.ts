import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { environmentUiFixture } from '../scenarios/environment-camp';
import { serializeWorld, deserializeWorld, validateWorld } from '../../src/sim/serialization';
import { windClearance, windObstructions } from '../../src/sim/wind-rules';
import { footprintCells } from '../../src/sim/definitions';
import { batteryWattDays } from '../../src/sim/power-battery';
import { TemperatureView } from '../../src/sim/temperature';
import { WEATHER } from '../../src/sim/weather-definitions';
import { perceivedWeather, weatherRainRate } from '../../src/sim/weather';
import { perform, revealCells } from './player-actions';
import { cell, expectWorld, observeErrors, panel, pause, saveKey, world } from './helpers';
import type { Command, Structure, World } from '../../src/sim/types';

async function inspectPower(page:Page, structure:Structure):Promise<void> {
  await page.keyboard.press('Escape'); await revealCells(page,[structure]);
  for(let i=0;i<=(await world(page)).pawns.length;i++){
    await cell(page,structure.x,structure.z);
    if(await page.locator(`[data-power-id="${structure.id}"]`).isVisible())return;
  }
  throw Error(`Electrical inspection unreachable: ${structure.id}`);
}
async function reload(page:Page,expected:World):Promise<void> {
  await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();
  await expectWorld(page,expected);await page.keyboard.press('Escape');
}
async function loadPrepared(page:Page,prepared:World):Promise<void> {
  expect(validateWorld(prepared)).toEqual([]);
  await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(prepared)});
  await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);await page.keyboard.press('Escape');
}

// One grouped native boundary: controlled room/wire/battery/materials and fire;
// construction, chopping, work assignment, extinguishing, power and saves use
// player clicks. The natural seasonal colony pilot supplies long-term evidence.
test('native environment loop: climate adoption, physical fire response, wind clearance, heater and exact reload',async({playwright})=>{
  test.setTimeout(240000);
  const fixture=environmentUiFixture(),initial=fixture.world;
  expect(validateWorld(initial)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15000);
  const report:Record<string,unknown>={version:87,controlled:true,stage:'load',initialTick:initial.tick,
    preparation:'Existing room, cable, battery at 200 W·j, construction materials and deliberately ignited isolated wood pile. Later cold air and rain are a labelled boundary checkpoint; elapsed/civil clocks are preserved.'};
  try{
    await page.addInitScript(()=>{
      const counters={pipelines:0};Object.assign(window,{environmentV87:counters});
      for(const name of ['createRenderPipeline','createRenderPipelineAsync'] as const){const original=GPUDevice.prototype[name];(GPUDevice.prototype[name] as unknown)=function(this:GPUDevice,...args:unknown[]){counters.pipelines++;return (original as Function).apply(this,args);};}
    });
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?e2e');
    const front=page.locator('.front-menu');await expect(front).toBeVisible();
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.locator(`input[name="front-save"][value="${saveKey}"]`).check();await front.getByRole('button',{name:'Charger',exact:true}).click();
    await expectWorld(page,initial);await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const pipelines=()=>page.evaluate(()=>(window as unknown as {environmentV87:{pipelines:number}}).environmentV87.pipelines);
    const preparedPipelines=await pipelines(),rotation={value:0};
    const act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);

    report.stage='adopt-and-extinguish';
    await panel(page,'menu');await page.locator('#climate-adopt').click();
    await expect.poll(async()=>(await world(page)).climate?.adoptedAt).toBe(initial.tick);
    await expect(page.locator('#climate-adopt')).toHaveCount(0);await page.keyboard.press('Escape');
    expect((await world(page)).weather?.current).toBe('clear');
    await act({type:'priority',pawnId:fixture.actorId,work:'firefight',value:1},'Permettre l’extinction dans le tableau Travail.');
    await expect(page.locator('#inspect-fire')).toBeVisible();
    await act({type:'order-extinguish',pawnId:fixture.actorId,fireId:fixture.fireId},'Battre le foyer préparé par un ordre contextuel réel.');
    const pendingFire=await world(page);expect(pendingFire.pawns[0]!.firefighting?.forced).toBe(true);await reload(page,pendingFire);
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).fires?.items.some(f=>f.id===fixture.fireId),{timeout:20000}).toBe(false);await pause(page);
    const extinguished=await world(page);expect(extinguished.fires!.ledger.extinguished).toBeGreaterThan(0);
    expect(extinguished.pawns[0]!.state).not.toBe('dead');report.extinction={tick:extinguished.tick,ledger:extinguished.fires!.ledger};

    report.stage='construction';
    await act({type:'designate',kind:'heater',...fixture.heater,material:'steel'},'Construire le radiateur dans la pièce.');
    await expect(page.locator('#placement-controls')).toBeHidden();
    await act({type:'designate',kind:'wind-turbine',...fixture.turbine,orientation:1,material:'steel'},'Construire l’éolienne orientée sur le câble.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.filter(s=>s.kind==='heater'||s.kind==='wind-turbine').length,{timeout:90000}).toBe(2);await pause(page);
    const built=await world(page),heater=built.structures.find(s=>s.kind==='heater')!,turbine=built.structures.find(s=>s.kind==='wind-turbine')!;
    expect(validateWorld(built)).toEqual([]);expect(turbine.orientation).toBe(1);expect(footprintCells(turbine)).toHaveLength(14);
    expect(windClearance(turbine)).toHaveLength(112);expect(windObstructions(built,turbine)).toEqual([{x:22,z:12}]);
    expect(built.piles.filter(p=>p.item==='steel'||p.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(0);
    await inspectPower(page,turbine);await expect(page.locator(`[data-power-id="${turbine.id}"]`)).toContainText('1/112');
    await expect(page.locator(`[data-power-id="${turbine.id}"] [data-power-flick]`)).toBeHidden();
    await page.screenshot({path:'artifacts/environment-wind-obstructed-v87.png'});
    await act({type:'wind-auto-cut',structureId:turbine.id,enabled:true},'Désigner une coupe, puis attendre l’abattage physique.');
    expect((await world(page)).resources.some(r=>r.id===fixture.treeId)).toBe(true);
    await reload(page,await world(page));await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).resources.some(r=>r.id===fixture.treeId),{timeout:30000}).toBe(false);
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===turbine.id)?.wind?.cachedWatts??0).toBeGreaterThan(0);await pause(page);
    const clear=await world(page);expect(windObstructions(clear,clear.structures.find(s=>s.id===turbine.id)!)).toEqual([]);
    expect(clear.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0)).toBeGreaterThan(extinguished.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0));
    report.construction={tick:clear.tick,heaterId:heater.id,turbineId:turbine.id,clearedTreeId:fixture.treeId,watts:clear.structures.find(s=>s.id===turbine.id)!.wind!.cachedWatts};

    report.stage='thermostat';
    for(const offset of [-10,-1,1,10,null] as const)await act({type:'heater-adjust',structureId:heater.id,offset},'Régler la consigne avec les boutons du radiateur.');
    expect((await world(page)).structures.find(s=>s.id===heater.id)!.heater!.target).toBe(21);
    await act({type:'heater-adjust',structureId:heater.id,offset:-10},'Choisir une température de veille.');
    await act({type:'heater-adjust',structureId:heater.id,offset:-10},'Conserver la consigne au rechargement.');
    await reload(page,await world(page));
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===heater.id)?.heater?.high).toBe(false);await pause(page);
    await inspectPower(page,heater);await expect(page.locator(`[data-power-id="${heater.id}"]`)).toContainText('17,5 W');
    await page.screenshot({path:'artifacts/environment-heater-idle-v87.png'});

    report.stage='rain-cold-boundary';
    const boundary=deserializeWorld(serializeWorld(await world(page)));
    for(const room of boundary.thermal?.regions??[])room.temperature=2;
    Object.assign(boundary.weather!,{current:'rain',previous:'clear',ageCore:2000,durationCore:16000});
    await loadPrepared(page,boundary);expect(weatherRainRate(boundary)).toBe(.5);
    await expect(page.locator('#weather')).toHaveText(WEATHER[perceivedWeather(boundary)].label);
    await act({type:'heater-adjust',structureId:heater.id,offset:null},'Réchauffer la pièce froide préparée avec l’énergie du réseau.');
    const start=await world(page),before=new TemperatureView(start).at(start,heater);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).tick,{timeout:15000}).toBeGreaterThanOrEqual(start.tick+120);await pause(page);
    const final=await world(page);expect(validateWorld(final)).toEqual([]);
    expect(new TemperatureView(final).at(final,heater)).toBeGreaterThan(before);
    expect(final.structures.find(s=>s.id===heater.id)!.power!.on).toBe(true);
    await inspectPower(page,heater);await page.screenshot({path:'artifacts/environment-rain-heater-v87.png'});
    await reload(page,final);expect(await pipelines()).toBe(preparedPipelines);await expect(page.locator('#fps-counter')).toBeVisible();expect(errors).toEqual([]);
    report.boundary={initialTick:start.tick,finalTick:final.tick,airBefore:before,airAfter:new TemperatureView(final).at(final,heater),rain:weatherRainRate(final),weather:final.weather,wind:final.wind,batteryWattDays:batteryWattDays(final.structures.find(s=>s.id===fixture.batteryId)!.battery!)};
    report.pipelines={prepared:preparedPipelines,final:await pipelines()};report.errors=errors;report.status='passed';writeFileSync('artifacts/environment-native-v87.json',JSON.stringify(report,null,2));
  }catch(error){
    const tag=`environment-native-failed-v87-${Date.now()}`,state=await world(page).catch(()=>undefined);
    await page.screenshot({path:`artifacts/${tag}.png`}).catch(()=>{});if(state)writeFileSync(`tmp/${tag}-checkpoint.json`,JSON.stringify(state));
    writeFileSync(`artifacts/${tag}.json`,JSON.stringify({...report,error:String(error),notice:await page.locator('#notice').textContent().catch(()=>null),checkpoint:state?`tmp/${tag}-checkpoint.json`:null,validation:state?validateWorld(state):undefined,errors},null,2));throw error;
  }finally{await browser.close();}
});
