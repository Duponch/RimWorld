import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { powerExpansionFixture } from '../scenarios/power-expansion';
import { deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/serialization';
import { batteryWattDays } from '../../src/sim/power-battery';
import { powerWatts } from '../../src/sim/power-rules';
import { observeErrors, panel, pause, saveKey, world, expectWorld, cell } from './helpers';
import { perform, revealCells } from './player-actions';
import type { Command, World } from '../../src/sim/types';

async function load(page:Page,state:World):Promise<void> {
  await pause(page);
  await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(state)});
  await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,state);await page.keyboard.press('Escape');
}
async function inspect(page:Page,position:{x:number;z:number},id:number):Promise<void> {
  await page.keyboard.press('Escape');await revealCells(page,[position]);
  const count=(await world(page)).pawns.length;
  for(let i=0;i<=count;i++){await cell(page,position.x,position.z);if(await page.locator(`[data-power-id="${id}"]`).isVisible())break;}
  await expect(page.locator(`[data-power-id="${id}"]`)).toBeVisible();
}

// Research progress and raw materials are controlled checkpoint preparation.
// Every finish, construction, roof and switch below uses actual player clicks.
test('native electrical loop: research, solar, battery, physical switches and cable below a wall survive reload',async({playwright})=>{
  test.setTimeout(300000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15000);
  const report:Record<string,unknown>={version:85,controlledConstruction:true,nightCheckpoint:'same built colony, civil clock advanced explicitly; not a simulated full day'};
  try {
    await page.addInitScript(()=>{
      const p={pipelines:0};Object.assign(window,{powerV85:p});
      for(const name of ['createRenderPipeline','createRenderPipelineAsync'] as const){const original=GPUDevice.prototype[name];(GPUDevice.prototype[name] as unknown)=function(this:GPUDevice,...args:unknown[]){p.pipelines++;return (original as Function).apply(this,args);};}
    });
    const initial=powerExpansionFixture();expect(validateWorld(initial)).toEqual([]);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await load(page,initial);
    const rotation={value:0},act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);
    const pipelines=()=>page.evaluate(()=>(window as any).powerV85.pipelines as number);
    const prepared=await pipelines();
    for(const [project,field] of [['batteries','batteries'],['solar-power','solarPower']] as const) {
      await act({type:'research-project',project},'Finir la recherche au bureau avec le chercheur, sans accorder la technologie.');
      await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
      await expect.poll(async()=>(await world(page)).research?.[field]?.completedAt,{timeout:20000}).toBeDefined();await pause(page);
    }
    expect((await world(page)).pawns[0]!.skills.intellectual!.xp).toBeGreaterThan(initial.pawns[0]!.skills.intellectual!.xp);
    // Fixed solar placement exposes no rotation; battery keeps its own 1×2 footprint.
    await act({type:'designate',kind:'battery',x:12,z:11,orientation:0,material:'steel'},'Construire un stockage initialement vide.');
    await act({type:'designate',kind:'solar-generator',x:7,z:10,orientation:0,material:'steel'},'Construire le panneau 4×4 sans toit.');
    await expect(page.locator('#placement-controls')).toBeHidden();
    await act({type:'designate',kind:'power-switch',x:13,z:11,orientation:0,material:'steel'},'Relier les deux côtés par un interrupteur physique.');
    for(const x of [11,14,15,16,17,18,19,20])await act({type:'designate',kind:'power-conduit',x,z:11,orientation:0,material:'steel'},'Construire le trajet électrique avec un acier par cellule.');
    await act({type:'designate',kind:'standing-lamp',x:21,z:11,orientation:0,material:'steel'},'Raccorder la lampe à la ligne, loin du producteur.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.filter(s=>['battery','solar-generator','power-switch','power-conduit','standing-lamp'].includes(s.kind)).length,{timeout:90000}).toBe(12);
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.kind==='battery')?.battery?.stored??0,{timeout:25000}).toBeGreaterThan(1_200_000);
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.kind==='standing-lamp')?.power?.on).toBe(true);await pause(page);
    expect(await pipelines()).toBe(prepared);
    const built=await world(page),solar=built.structures.find(s=>s.kind==='solar-generator')!,battery=built.structures.find(s=>s.kind==='battery')!,sw=built.structures.find(s=>s.kind==='power-switch')!,lamp=built.structures.find(s=>s.kind==='standing-lamp')!;
    expect(validateWorld(built)).toEqual([]);expect(built.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(87);
    expect(built.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(2);
    await inspect(page,solar,solar.id);await expect(page.locator('[data-power-kind="solar-generator"] [data-power-flick]')).toBeHidden();
    await expect(page.locator('#cell-description')).toContainText('16/16 cases sans toit');await page.screenshot({path:'artifacts/power-day-v85.png'});
    await inspect(page,battery,battery.id);await expect(page.locator('[data-power-kind="battery"] [data-power-flick]')).toBeHidden();
    await expect(page.locator('[data-power-kind="battery"]')).toContainText('50 %');
    await act({type:'area',action:'build-roof',from:{x:7,z:10},to:{x:7,z:10}},'Recouvrir physiquement une case du panneau, avec le mur adjacent comme support.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).roofing?.constructed.includes(10*32+7)).toBe(true);await pause(page);
    await inspect(page,solar,solar.id);await expect(page.locator('#cell-description')).toContainText('15/16 cases sans toit');
    await page.screenshot({path:'artifacts/power-roof-v85.png'});
    await act({type:'designate',kind:'wall',x:14,z:11,orientation:0,material:'wood'},'Construire un mur au-dessus d’un câble existant.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='wall'&&s.x===14&&s.z===11)).toBe(true);await pause(page);
    // The desired switch is saved while the physical switch is still closed.
    await act({type:'power-flick',structureId:sw.id,on:false},'Demander la coupure sans effet à distance.');
    const pending=await world(page);expect(pending.structures.find(s=>s.id===sw.id)!.power!.switchOn).not.toBe(false);expect(pending.jobs.some(j=>j.flick?.structureId===sw.id)).toBe(true);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,pending);await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===sw.id)!.power!.switchOn,{timeout:30000}).toBe(false);
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===lamp.id)!.power!.on).toBe(false);await pause(page);
    expect((await world(page)).structures.find(s=>s.id===lamp.id)!.power!.on).toBe(false);
    await act({type:'power-flick',structureId:sw.id,on:true},'Refermer physiquement le circuit.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===lamp.id)!.power!.on,{timeout:20000}).toBe(true);await pause(page);
    const wired=await world(page),cable=wired.structures.find(s=>s.kind==='power-conduit'&&s.x===14&&s.z===11)!,wall=wired.structures.find(s=>s.kind==='wall'&&s.x===14&&s.z===11)!;
    await inspect(page,cable,cable.id);await expect(page.locator('#cell-title')).toContainText('Mur');
    await page.screenshot({path:'artifacts/power-under-wall-v85.png'});
    await page.locator(`[data-power-id="${cable.id}"] [data-power-remove]`).click();
    await expect.poll(async()=>(await world(page)).jobs.some(j=>j.deconstruction?.structureId===cable.id)).toBe(true);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.id===cable.id)).toBe(false);
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===lamp.id)!.power!.on).toBe(false);await pause(page);
    const cut=await world(page);expect(cut.structures.some(s=>s.id===wall.id)).toBe(true);expect(cut.structures.find(s=>s.id===lamp.id)!.power!.on).toBe(false);
    expect(cut.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(87);
    await act({type:'designate',kind:'power-conduit',x:14,z:11,orientation:0,material:'steel'},'Reconstruire un câble sous le mur conservé.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===lamp.id)!.power!.on).toBe(true);await pause(page);
    const repaired=await world(page);expect(validateWorld(repaired)).toEqual([]);report.day={tick:repaired.tick,stored:batteryWattDays(repaired.structures.find(s=>s.id===battery.id)!.battery!),lostCableId:cable.id,pipelinesBefore:prepared,pipelinesAfter:await pipelines()};
    // Boundary checkpoint only: the uninterrupted multi-day pilot is separate.
    const night=deserializeWorld(serializeWorld(repaired));night.tick=Math.floor(repaired.tick/6000)*6000+5800+(repaired.tick%6000>5800?6000:0);expect(validateWorld(night)).toEqual([]);await load(page,night);
    const before=night.structures.find(s=>s.id===battery.id)!.battery!.stored;
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).tick).toBeGreaterThan(night.tick+40);await pause(page);
    const dark=await world(page);expect(powerWatts(dark.structures.find(s=>s.id===solar.id)!,dark)).toBe(0);expect(dark.structures.find(s=>s.id===lamp.id)!.power!.on).toBe(true);expect(dark.structures.find(s=>s.id===battery.id)!.battery!.stored).toBeLessThan(before);expect(validateWorld(dark)).toEqual([]);
    await inspect(page,battery,battery.id);await page.screenshot({path:'artifacts/power-night-v85.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,dark);
    report.night={tick:dark.tick,solarWatts:0,lampOn:true,storedBefore:batteryWattDays({stored:before}),storedAfter:batteryWattDays(dark.structures.find(s=>s.id===battery.id)!.battery!)};
    await expect(page.locator('#fps-counter')).toBeVisible();expect(errors).toEqual([]);report.errors=errors;
    writeFileSync('artifacts/power-native-v85.json',JSON.stringify(report,null,2));
  } catch(error) {
    const tag=`power-native-failed-v85-${Date.now()}`;
    await page.screenshot({path:`artifacts/${tag}.png`}).catch(()=>{});
    const state=await world(page).catch(()=>undefined);
    if(state)writeFileSync(`tmp/${tag}-checkpoint.json`,JSON.stringify(state));
    const notice=await page.locator('#notice').textContent().catch(()=>null);
    writeFileSync(`artifacts/${tag}.json`,JSON.stringify({...report,failure:String(error),notice,tick:state?.tick,validation:state?validateWorld(state):undefined,checkpoint:state?`tmp/${tag}-checkpoint.json`:null,errors},null,2));
    console.info(`Failure evidence: artifacts/${tag}.json; actual checkpoint: tmp/${tag}-checkpoint.json`);
    throw error;
  } finally {await browser.close();}
});
