import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {world,pause,panel,expectWorld,observeErrors,cell,settledCells} from './helpers';
import {revealCells} from './player-actions';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {sameDerivedClimateNumber} from '../../src/sim/site-climate';
import {fireTouch} from '../../src/sim/firefighting';
import {SCHEMA_VERSION,type World} from '../../src/sim/types';
import {fixedTundraSite,prepareSnowScene} from '../scenarios/tundra-v376';
const front=(page:Page)=>page.locator('.front-menu');
const button=(page:Page,name:string)=>front(page).getByRole('button',{name,exact:true});
async function chooseTile(page:Page,id:number):Promise<void>{
  // Visible accessible picker uses the same onSelected handler as the globe.
  const select=front(page).locator('[data-planet-selection]');
  await expect(select).toBeVisible();await select.selectOption(String(id));
  await expect(select).toHaveValue(String(id));
}

async function importFile(page:Page,path:string,expected:World){
  await panel(page,'menu');await page.locator('#browse-saves').click();
  await front(page).locator('input[type=file]').setInputFiles(path);await expectWorld(page,expected);await pause(page);
}
async function exportReload(page:Page,info:TestInfo,name:string,expected:World){
  await panel(page,'menu');const pending=page.waitForEvent('download');
  await page.locator('[data-save-manager-action="export"]').click();
  const download=await pending,path=info.outputPath(name+'.json');await download.saveAs(path);
  expect(deserializeWorld(await readFile(path,'utf8'))).toEqual(expected);
  await importFile(page,path,expected);await info.attach(name,{contentType:'application/json',path});
  await page.keyboard.press('Escape');
}
async function captureViews(page:Page,info:TestInfo,prefix:string,target:{x:number;z:number}){
  await page.keyboard.press('Escape');await revealCells(page,[target]);
  const camera=page.locator('#camera-mode');if(await camera.getAttribute('aria-pressed')==='true')await camera.click();
  await settledCells(page,[target]);await page.screenshot({path:info.outputPath(prefix+'-iso.png')});
  await camera.click();await expect(camera).toHaveAttribute('aria-pressed','true');await settledCells(page,[target]);
  await page.screenshot({path:info.outputPath(prefix+'-perspective.png')});await camera.click();await settledCells(page,[target]);
}

test('V376 native short: real tundra v2 arrival, then explicitly prepared snow clearing with exact interrupted-work reload',async({page},info)=>{
  test.setTimeout(180_000);const errors=observeErrors(page),proof:Record<string,unknown>={scope:'Short native UI; prepared snow is separate from natural arrival; no winter/campaign/FPS proof'};
  try{
    const selected=fixedTundraSite();proof.choice=selected.choice;
    await page.goto('/?e2e',{waitUntil:'domcontentloaded',timeout:30_000});await button(page,'Nouvelle partie').click();await button(page,'Suivant').click();
    await front(page).getByRole('radio',{name:'Récit d’aventure',exact:true}).check();
    await front(page).getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();await button(page,'Suivant').click();
    await page.locator('#front-seed').fill(String(selected.choice.seed));await button(page,'Générer').click();await chooseTile(page,selected.choice.tile);
    await button(page,'Suivant').click();if(await front(page).locator('dialog').isVisible())await front(page).locator('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();
    const names=(await page.locator('[data-candidate-serial] .front-candidate-labels strong').allTextContents()).slice(0,3);expect(names).toHaveLength(3);
    await button(page,'Démarrer').click();if(await front(page).locator('dialog').isVisible())await front(page).locator('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();
    await expect(front(page)).toBeHidden({timeout:60_000});await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60_000});
    const incoming=await world(page);expect(incoming.tick).toBe(0);expect(incoming.width).toBe(250);expect(incoming.schemaVersion).toBe(SCHEMA_VERSION);
    expect(incoming.planet?.revision).toBe(2);expect(incoming.planet?.homeTile).toBe(selected.choice.tile);expect(incoming.site?.biome).toBe('tundra');
    expect(incoming.flora?.biome).toBe('tundra');expect(incoming.wildlife?.population?.biome).toBe('tundra');expect(incoming.snow?.lastTick).toBe(0);
    expect(incoming.climate?.revision).toBe(2);if(incoming.climate?.revision!==2)throw Error('Expected geographic climate');
    for(const key of ['meanTemperature','rainfall','latitude','longitude','amplitude'] as const)expect(sameDerivedClimateNumber(incoming.climate.definition[key],selected.resolved.climate[key])).toBe(true);
    expect(incoming.startingArrival?.phase).toBe('incoming');if(incoming.startingArrival?.phase!=='incoming')throw Error('Expected real capsule arrival');
    expect(incoming.startingArrival.pods.map(p=>p.pawn.name)).toEqual(names);expect(validateWorld(incoming)).toEqual([]);await expect(page.locator('#biome-current')).toHaveText('Toundra');
    await page.locator('.starting-arrival').getByRole('button',{name:'Reprendre',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>({tick:window.__lisiere.tick,phase:window.__lisiere.world.startingArrival?.phase})),{timeout:20_000,intervals:[100]}).toMatchObject({phase:'opened'});
    await pause(page);const opened=await world(page);expect(opened.tick).toBeLessThanOrEqual(120);expect(opened.pawns.map(p=>p.id)).toEqual(incoming.startingArrival.pods.map(p=>p.pawn.id));
    expect(validateWorld(opened)).toEqual([]);proof.arrivalTick=opened.tick;await exportReload(page,info,'real-tundra-arrival',opened);
    await captureViews(page,info,'real-tundra',opened.scenario!.landing);
    // A separate Node fixture is explicit: snow and work-only priorities are
    // prepared here. No browser World write or completed work is injected.
    const prepared=prepareSnowScene(opened),path=info.outputPath('prepared-snow-input.json');proof.preparation={outside:prepared.outside,from:prepared.from,target:prepared.target,depth:1};
    expect(prepared.outside,'Fixed coldest tundra tile must actually be below freezing').toBeLessThan(0);
    await writeFile(path,prepared.raw);await importFile(page,path,prepared.world);await page.keyboard.press('Escape');
    const guide=page.locator('.learning-readout');if(await guide.isVisible()&&await guide.evaluate(node=>(node as HTMLDetailsElement).open))await guide.locator(':scope > summary').click();
    await captureViews(page,info,'prepared-snow-before-zone',prepared.target);
    const zones=page.locator('#zones-open');if(await zones.getAttribute('aria-expanded')!=='true')await zones.click();
    await page.locator('[data-tool="snow-clear"]').click();await revealCells(page,[prepared.target]);await cell(page,prepared.target.x,prepared.target.z);
    await expect.poll(async()=>(await world(page)).snowClearArea).toEqual([prepared.index]);await page.keyboard.press('Escape');
    const observations:unknown[]=[];proof.observations=observations;let moving=false;
    await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>{
      const sample=await page.evaluate(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id)!;return {tick:window.__lisiere.tick,x:p.x,z:p.z,state:p.state,path:p.path.length,cleaning:p.cleaning};},prepared.workerId);
      observations.push(sample);if(sample.state==='moving'||sample.path>0)moving=true;
      return sample.cleaning?.phase==='clean'&&sample.cleaning.progress>0;
    },{timeout:30_000,intervals:[50]}).toBe(true);
    await pause(page);const working=await world(page),cleaner=working.pawns.find(p=>p.id===prepared.workerId)!;
    expect(moving,'A real approach must be observed before contact').toBe(true);expect(cleaner.cleaning).toMatchObject({snowCell:prepared.index,phase:'clean'});
    expect(cleaner.cleaning!.progress).toBeGreaterThan(0);expect(working.tiles[prepared.index]!.snowDepth).toBeGreaterThan(0);expect(fireTouch(working,cleaner,prepared.target)).toBe(true);expect(validateWorld(working)).toEqual([]);
    proof.observations=observations;proof.interruptedWork={tick:working.tick,progress:cleaner.cleaning!.progress,x:cleaner.x,z:cleaner.z};
    await captureViews(page,info,'snow-working-contact',prepared.target);await exportReload(page,info,'snow-interrupted-work',working);
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).tiles[prepared.index]!.snowDepth,{timeout:10_000,intervals:[100]}).toBeUndefined();
    await pause(page);const finished=await world(page);expect(finished.snowClearArea).toEqual([prepared.index]);expect(finished.pawns.find(p=>p.id===prepared.workerId)!.cleaning).toBeUndefined();expect(validateWorld(finished)).toEqual([]);
    proof.finishedTick=finished.tick;await exportReload(page,info,'snow-cleared',finished);await captureViews(page,info,'snow-cleared-reloaded',prepared.target);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});expect(errors).toEqual([]);
  }catch(error){proof.failure=error instanceof Error?error.message:String(error);throw error;}
  finally{proof.errors=errors;await writeFile(info.outputPath('tundra-native-summary.json'),JSON.stringify(proof,null,2));}
});
