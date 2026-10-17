import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {urgentPauseWorkshopV402} from '../scenarios/urgent-pause-v402';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {campaignPresentation} from '../../src/sim/secondary-site-presentation';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
test.skip(process.env.URGENT_PAUSE_V402!=='1','ROOT only after product253 and frozen urgent transport adoption.');
async function checkpoint(page:Page,info:TestInfo,name:string){
 await pause(page);await panel(page,'menu');const pending=page.waitForEvent('download');await page.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await pending).saveAs(path);
 const complete=deserializeWorld(await decodeStoredSave(await readFile(path,'utf8'))),active=await world(page);expect(validateWorld(complete)).toEqual([]);expect(JSON.parse(JSON.stringify(campaignPresentation(complete)))).toEqual(active);return {complete,active,path};
}
const sounds=(page:Page)=>page.evaluate(()=>(window as unknown as {__urgentSoundCalls?:number}).__urgentSoundCalls??0);

test('V402 prepared two maps: real future arrivals, Never warning, confirmed global pause, See, menu safety and bootstrap without replay',async({page},info)=>{
 test.setTimeout(120_000);const f=urgentPauseWorkshopV402(),errors=observeErrors(page),proof:Record<string,unknown>={complete:false,notice:f.notice,boundSeconds:120};
 const input=info.outputPath('prepared-future-two-map-raids.json');await writeFile(input,f.initial);
 // Count only the existing UI signal invocation, never touch World/worker.
 await page.route('**/src/audio/AudioDirector.ts*',async route=>{const response=await route.fetch(),source=await response.text(),anchor='playInterface(kind) {';
  if(!source.includes(anchor))throw Error('AudioDirector interface instrumentation anchor changed.');
  await route.fulfill({response,body:source.replace(anchor,anchor+' globalThis.__urgentSoundCalls = (globalThis.__urgentSoundCalls ?? 0) + Number(kind === "ui.threat");')});
 });
 try{
  await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Options',exact:true}).click();
  const choice=page.locator('#front-threat-pause-mode');await expect(choice).toBeEnabled();await expect(choice).toHaveValue('major');
  await choice.selectOption('never');await expect(choice).toBeEnabled();await expect(choice).toHaveValue('never');
  await front.getByRole('button',{name:'Retour',exact:true}).click();await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(input);
  await expect(front).toBeHidden({timeout:60_000});await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(f.world))));await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await expect(page.locator('#urgent-threat-feedback')).toBeHidden();expect(await sounds(page)).toBe(0);
  await page.locator('[data-speed="1"]').click();await expect(page.locator('[data-speed="1"]')).toHaveAttribute('aria-pressed','true');
  const feedback=page.locator('#urgent-threat-feedback');await expect(feedback).toBeVisible({timeout:20_000});await expect(feedback).toContainText('Second site · Raid humain');await expect(feedback).not.toContainText('Jeu mis en pause');
  await expect(page.locator('[data-speed="1"]')).toHaveAttribute('aria-pressed','true');await pause(page);
  const warned=await checkpoint(page,info,'never-warning-complete');proof.first={tick:warned.complete.tick,path:warned.path};
  expect(warned.complete.secondarySite!.map.raids!.active!.startedAt).toBe(f.secondaryDue);expect(warned.complete.raids!.active).toBeUndefined();expect((warned.active.campaignMap?.revision===2?undefined:warned.active.campaignMap?.active)).toBe('home');expect(await sounds(page)).toBe(1);
  await page.locator('#threat-pause-mode').selectOption('any-threat');await expect(page.locator('#threat-pause-mode')).toBeEnabled();await expect(page.locator('#threat-pause-mode')).toHaveValue('any-threat');
  const pausedTick=(await world(page)).tick;await page.locator('#menu-panel [data-close-panel]').click();await page.waitForTimeout(250);expect((await world(page)).tick).toBe(pausedTick);await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');
  await feedback.locator('[data-urgent-site="secondary"]').click();await page.waitForFunction(()=>{const w=window.__lisiere.world;return (w.campaignMap?.revision===2?undefined:w.campaignMap?.active)==='secondary';},undefined,{polling:100});expect((await world(page)).tick).toBe(pausedTick);expect(await sounds(page)).toBe(1);
  await page.screenshot({path:info.outputPath('01-never-warning-real-secondary-target.png')});
  await page.locator('[data-speed="6"]').click();await expect(feedback).toContainText('Foyer · Raid humain',{timeout:20_000});await expect(feedback).toContainText('Jeu mis en pause');await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');
  // Preserve the complete endpoint BEFORE asserting tick cutoff/actor state.
  const urgent=await checkpoint(page,info,'global-pause-at-arrival');proof.second={tick:urgent.complete.tick,path:urgent.path};
  expect(urgent.complete.tick).toBe(f.homeDue);expect(urgent.complete.raids!.active!.startedAt).toBe(f.homeDue);expect((urgent.active.campaignMap?.revision===2?undefined:urgent.active.campaignMap?.active)).toBe('secondary');expect(await sounds(page)).toBe(2);
  await page.locator('#menu-panel [data-close-panel]').click();await page.waitForTimeout(250);expect((await world(page)).tick).toBe(f.homeDue);await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:info.outputPath('02-global-pause-current-view-preserved.png')});
  const homeActor=urgent.complete.raids!.active!.members[0]!;await feedback.locator('[data-urgent-site="home"]').click();
  await page.waitForFunction(id=>{const w=window.__lisiere.world;return (w.campaignMap?.revision===2?undefined:w.campaignMap?.active)==='home'&&w.pawns.some(p=>p.id===id);},homeActor,{polling:100});
  await expect(page.locator('#selected-name')).toHaveText(urgent.complete.pawns.find(p=>p.id===homeActor)!.name);expect((await world(page)).tick).toBe(f.homeDue);expect(await sounds(page)).toBe(2);
  await feedback.getByRole('button',{name:'Fermer les avertissements de menace'}).click();await expect(feedback).toBeHidden();await page.waitForTimeout(250);expect((await world(page)).tick).toBe(f.homeDue);
  // Exercise a real explicit time gesture while the confirmed urgent lock still exists.
  await page.locator('[data-speed="1"]').click();await expect(page.locator('[data-speed="1"]')).toHaveAttribute('aria-pressed','true');
  await page.waitForFunction(tick=>{const w=window.__lisiere.world;return w.tick>=tick+2;},f.homeDue,{polling:100,timeout:10_000});await pause(page);
  const saved=await checkpoint(page,info,'existing-threats-before-reload');proof.resumedUnderUrgent={tick:saved.complete.tick,path:saved.path};expect(saved.complete.tick).toBeGreaterThanOrEqual(f.homeDue+2);await expect(feedback).toBeHidden();expect(await sounds(page)).toBe(2);await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(saved.path);
  await expect(front).toBeHidden({timeout:60_000});await expectWorld(page,saved.active);await page.keyboard.press('Escape');await expect(feedback).toBeHidden();expect(await sounds(page)).toBe(2);
  const reloaded=await checkpoint(page,info,'existing-threats-reloaded');expect(reloaded.complete).toEqual(saved.complete);proof.reloadExact=true;await expect(page.locator('#threat-pause-mode')).toHaveValue('any-threat');await page.locator('#menu-panel [data-close-panel]').click();
  // Explicit time gesture after bootstrap; existing raids must not be new letters.
  await page.locator('[data-speed="1"]').click();await page.waitForFunction(tick=>{const w=window.__lisiere.world;return w.tick>=tick+2;},saved.complete.tick,{polling:100,timeout:10_000});await pause(page);
  const final=await checkpoint(page,info,'resumed-existing-threats');proof.final={tick:final.complete.tick,path:final.path};await expect(feedback).toBeHidden();expect(await sounds(page)).toBe(2);
  expect(Object.hasOwn(final.complete,'urgentThreats')).toBe(false);expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});proof.complete=true;
 }catch(error){proof.error=error instanceof Error?error.message:String(error);try{const saved=await checkpoint(page,info,'failure-complete');proof.failure={path:saved.path,tick:saved.complete.tick};}catch(cause){proof.conservationError=String(cause);}throw error;}
 finally{proof.errors=errors;await writeFile(info.outputPath('proof.json'),JSON.stringify(proof,null,2));}
});