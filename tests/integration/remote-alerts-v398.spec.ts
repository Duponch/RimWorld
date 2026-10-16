import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {deserializeWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {campaignPresentation} from '../../src/sim/secondary-site-presentation';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
test.skip(process.env.V398_REMOTE_ALERTS!=='1','ROOT opt-in; read-only navigation at the actual V39721483 checkpoint.');
const input='tmp/aulnes-multimap-v397/native-03/aulnes-multimap-v397-V397--6d968--two-map-reload-and-revisit/revisited-final-complete.json';
const expectedSha='9758f629ebdf902a97414c22f7d52d86d807df92a366721db6a7a053cea6713f';
async function closeWorld(page:Page){if(await page.locator('#world-panel').isVisible())await page.locator('#world-panel [data-close-panel]').click();await expect(page.locator('#world-panel')).toBeHidden();}
test('V398 actual paused21483: remote raging animal and downed colonist navigate to their genuine map and inspect Health',async({page},info)=>{
 test.setTimeout(120_000);const errors=observeErrors(page),raw=await decodeStoredSave(await readFile(input,'utf8'));
 expect(createHash('sha256').update(raw).digest('hex')).toBe(expectedSha);const initial=deserializeWorld(raw);expect(initial.tick).toBe(21483);expect(initial.secondarySite?.selected).toBe(true);
 expect(initial.wildlife?.animals.find(a=>a.id===19905)?.manhunter).toBeDefined();const downed=initial.pawns.filter(p=>p.state==='downed').map(p=>p.id).sort((a,b)=>a-b);expect(downed).toEqual([19871,20322,20349]);
 await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(resolve(input));
 await expect(front).toBeHidden({timeout:60_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await pause(page);await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(initial))));await page.keyboard.press('Escape');await closeWorld(page);
 const animalAlert=page.locator('[data-alert="campaign:home:manhunter:19905"]'),patientAlert=page.locator('[data-alert="campaign:home:downed:19871"]');await expect(animalAlert).toBeVisible();await expect(patientAlert).toContainText('3 colon(s) à terre');await page.screenshot({path:info.outputPath('01-actual-remote-danger.png')});
 await animalAlert.click();await page.waitForFunction(()=>{const w=window.__lisiere.world;return w.campaignMap?.active==='home'&&w.wildlife?.animals.some(a=>a.id===19905);},undefined,{polling:100,timeout:15_000});await expect(page.locator('[data-animal-title]')).toContainText('19905');expect((await world(page)).tick).toBe(21483);await page.screenshot({path:info.outputPath('02-real-raging-gazelle.png')});
 await panel(page,'world');await page.locator('#world-tab-group').click();await page.locator('[data-site-action="secondary"]').click();await page.waitForFunction(()=>{const w=window.__lisiere.world;return w.campaignMap?.active==='secondary';},undefined,{polling:100,timeout:15_000});await closeWorld(page);
 await page.locator('[data-alert="campaign:home:downed:19871"]').click();await page.waitForFunction(()=>{const w=window.__lisiere.world;return w.campaignMap?.active==='home'&&w.pawns.some(p=>p.id===19871&&p.state==='downed');},undefined,{polling:100,timeout:15_000});
 await expect(page.locator('#selected-name')).toHaveText('Noé');await expect(page.locator('[data-colonist-tab="health"]')).toHaveAttribute('aria-selected','true');const final=await world(page);expect(final.tick).toBe(21483);expect(final.pawns.filter(p=>p.state==='downed').map(p=>p.id).sort((a,b)=>a-b)).toEqual(downed);expect(errors).toEqual([]);await page.screenshot({path:info.outputPath('03-real-downed-noe-health.png')});
 const graphics=await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident}));expect(graphics).toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});
 // Read-only navigation must preserve every physical/clinical field on BOTH maps.
 await panel(page,'menu');const manager=page.locator('[data-save-manager]');await manager.locator('[data-save-manager-name]').fill('V398 navigation seule21483');await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
 const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const finalPath=info.outputPath('paused-navigation-complete.json');await(await download).saveAs(finalPath);const exported=deserializeWorld(await decodeStoredSave(await readFile(finalPath,'utf8')));
 expect(exported).toEqual({...initial,secondarySite:{...initial.secondarySite!,selected:false}});await info.attach('paused-navigation-complete',{path:finalPath,contentType:'application/json'});
 await writeFile(info.outputPath('summary.json'),JSON.stringify({input,expectedSha,tick:final.tick,downed,animalId:19905,errors,graphics,completePhysicalWorldUnchangedExceptSelectedView:true,scope:'Paused actual V397 endpoint only. No resumed time, healing, reenacted injury, reroll, changed public save or completed V397 well-being claim.'},null,2),'utf8');
});
