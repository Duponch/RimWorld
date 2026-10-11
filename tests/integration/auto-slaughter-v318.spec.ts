import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expect,test} from '@playwright/test';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {AUTO_SLAUGHTER_SPECIES,defaultAutoSlaughterConfig,type AutoSlaughterConfig} from '../../src/sim/auto-slaughter-state.ts';
import {adultAgeTicks} from '../../src/sim/animal-life.ts';
import type {Command} from '../../src/sim/types.ts';
import {expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers.ts';
import {editAutoSlaughterPolicy,perform} from './player-actions.ts';
import {writeTestFile} from '../test-output.ts';

test('V318 actual Aulnes: quotas, independent manual designation, cancellation, contact death and exact reloads',async({playwright})=>{
  test.setTimeout(420000);
  const source='public/test-saves/v284/les-aulnes-integrees.json',raw=await readFile(source,'utf8');
  const sha=createHash('sha256').update(raw).digest('hex');expect(sha).toBe('6d75f98d4435e8b4569f11fce1969a71d31ba523fcf36ad864f35ba3191eedb1');
  const historical=deserializeWorld(await decodeStoredSave(raw));expect(historical).toMatchObject({tick:8434,width:250,height:250});
  const resumePath=process.env.AUTO_SLAUGHTER_V318_RESUME,resumeRaw=resumePath?await readFile(resumePath,'utf8'):null,resumeSha256=resumeRaw?createHash('sha256').update(resumeRaw).digest('hex'):null;
  if(resumeRaw)expect(resumeSha256).toBe(process.env.AUTO_SLAUGHTER_V318_RESUME_SHA256);
  const initial=resumeRaw?deserializeWorld(resumeRaw):historical;expect(validateWorld(initial)).toEqual([]);expect(initial).toMatchObject({width:250,height:250});expect(initial.tick).toBeGreaterThanOrEqual(8434);expect(initial.pawns).toHaveLength(15);
  const owned=historical.wildlife!.animals.filter(a=>a.domestic&&a.state!=='dead'&&!a.health?.death);
  const species=AUTO_SLAUGHTER_SPECIES.filter(s=>owned.some(a=>a.species===s&&!a.pregnancy&&a.state!=='downed')).sort((a,b)=>owned.filter(x=>x.species===a).length-owned.filter(x=>x.species===b).length||AUTO_SLAUGHTER_SPECIES.indexOf(a)-AUTO_SLAUGHTER_SPECIES.indexOf(b))[0]!;
  expect(species).toBeDefined();
  const candidates=owned.filter(a=>a.species===species&&!a.pregnancy).sort((a,b)=>b.ageTicks-a.ageTicks||a.id-b.id),animalId=candidates[0]!.id,witnessIds=owned.filter(a=>a.species!==species).map(a=>a.id);
  expect(witnessIds.length).toBeGreaterThan(0);expect(candidates[0]!.domestic!.slaughter).toBeUndefined();
  const handler=initial.pawns.filter(p=>!p.prisoner&&p.state!=='dead'&&p.state!=='downed'&&p.priorities.handle>0).sort((a,b)=>b.skills.animals!.level-a.skills.animals!.level||a.id-b.id)[0]!;expect(handler).toBeDefined();
  const defaults=defaultAutoSlaughterConfig(species),quota:AutoSlaughterConfig={...defaults,maxTotal:candidates.length-1};
  const browser=await playwright.chromium.launch({channel:'chrome'}),page=await browser.newPage({baseURL:process.env.AUTO_SLAUGHTER_V318_BASE_URL??'http://127.0.0.1:5392',viewport:{width:2560,height:1440}});
  page.setDefaultTimeout(15000);const errors=observeErrors(page),checkpoints:{label:string;tick:number}[]=[],rotation={value:0};
  const act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);
  async function animals(){if(!await page.locator('#animals-panel').isVisible())await page.locator('[data-panel="animals"]').click();await expect(page.locator(`[data-domestic-focus="${animalId}"]`)).toBeVisible();}
  async function checkpoint(label:string){
    await pause(page);const w=await world(page);expect(validateWorld(w)).toEqual([]);
    await page.keyboard.press('Escape');await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(async()=>{const saved=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);return saved?serializeWorld(deserializeWorld(await decodeStoredSave(saved))):null;}).toBe(serializeWorld(w));
    await page.locator('#load').click();await expectWorld(page,w);await page.keyboard.press('Escape');checkpoints.push({label,tick:w.tick});await writeTestFile(test.info().outputPath(`checkpoint-${label}.json`),serializeWorld(w));return w;
  }
  async function gate(phase:'approach'|'contact'|'dead',timeout=120000){
    await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({phase,id})=>{
      const w=window.__lisiere.world,worker=w.pawns.find(p=>p.animalHandling?.kind==='slaughter'&&p.animalHandling.animalId===id),a=w.wildlife?.animals.find(a=>a.id===id);
      const ready=phase==='approach'?worker?.animalHandling?.phase==='approach'&&!!worker.motion:phase==='contact'?worker?.animalHandling?.phase==='interact'&&worker.animalHandling.progress>0:(!a||a.state==='dead')&&w.piles.some(p=>p.corpse?.animalId===id);
      if(ready)document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return ready;
    },{phase,id:animalId},{polling:'raf',timeout});await pause(page);
  }
  try{
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
    await page.evaluate(({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await checkpoint(resumeRaw?'continuation':'baseline');
    if(!resumeRaw){
    for(const p of initial.pawns.filter(p=>!p.prisoner)){
      if(p.id!==handler.id&&p.priorities.handle)await act({type:'priority',pawnId:p.id,work:'handle',value:0},'Réserver le geste témoin au dresseur réel.');
      if(p.id===handler.id)await act({type:'priority',pawnId:p.id,work:'handle',value:1},'Prioriser le travail Animaux du dresseur.');
    }
    const live=await world(page),eligible=live.wildlife!.animals.filter(a=>a.domestic&&a.species===species&&a.state!=='dead'&&!a.health?.death&&!a.pregnancy);
    const safe:AutoSlaughterConfig={...defaults,maxTotal:eligible.length,maxMales:eligible.filter(a=>a.sex==='male'&&a.ageTicks>=adultAgeTicks(species)).length,maxFemales:eligible.filter(a=>a.sex==='female'&&a.ageTicks>=adultAgeTicks(species)).length,maxMalesYoung:eligible.filter(a=>a.sex==='male'&&a.ageTicks<adultAgeTicks(species)).length,maxFemalesYoung:eligible.filter(a=>a.sex==='female'&&a.ageTicks<adultAgeTicks(species)).length};
    await editAutoSlaughterPolicy(page,safe);
    const row=page.locator(`[data-auto-slaughter-species="${species}"]`);await expect(row.locator('[data-auto-slaughter-population]')).toHaveText(String(owned.filter(a=>a.species===species).length));await expect(row.locator('[data-auto-slaughter-count="total"]')).toHaveText(String(eligible.length));
    await editAutoSlaughterPolicy(page,{...safe,allowPregnant:true});await editAutoSlaughterPolicy(page,safe);await checkpoint('five-fields-and-protection');
    await animals();await row.locator('[data-auto-slaughter-reset]').click();await expect.poll(async()=>(await world(page)).autoSlaughter?.find(c=>c.species===species)).toBeUndefined();await expect(page.locator('[data-auto-slaughter]')).not.toHaveAttribute('aria-busy','true');
    await editAutoSlaughterPolicy(page,quota);await expect(page.locator(`[data-domestic-details="${animalId}"]`)).toContainText('quota du troupeau');await expect(page.locator(`[data-domestic-slaughter="${animalId}"]`)).not.toBeChecked();await checkpoint('quota');
    await gate('approach');await checkpoint('approach');await editAutoSlaughterPolicy(page,defaults);
    const cancelled=await checkpoint('cancelled');expect(cancelled.pawns.some(p=>p.animalHandling?.kind==='slaughter'&&p.animalHandling.animalId===animalId)).toBe(false);expect(cancelled.wildlife!.animals.find(a=>a.id===animalId)!.state).not.toBe('dead');expect(cancelled.piles.some(p=>p.corpse?.animalId===animalId)).toBe(false);
    await editAutoSlaughterPolicy(page,quota);await animals();const manual=page.locator(`[data-domestic-slaughter="${animalId}"]`);await manual.check();await expect.poll(async()=>(await world(page)).wildlife!.animals.find(a=>a.id===animalId)!.domestic!.slaughter).toBe(true);
    await editAutoSlaughterPolicy(page,defaults);await expect(manual).toBeChecked();await expect(page.locator(`[data-domestic-details="${animalId}"]`)).not.toContainText('quota du troupeau');await checkpoint('manual-independent');
    await animals();await manual.uncheck();await expect.poll(async()=>(await world(page)).wildlife!.animals.find(a=>a.id===animalId)!.domestic!.slaughter===true).toBe(false);
    }
    if(!(await world(page)).piles.some(p=>p.corpse?.animalId===animalId)){
    await editAutoSlaughterPolicy(page,quota);
    if(!(await world(page)).pawns.some(p=>p.animalHandling?.kind==='slaughter'&&p.animalHandling.animalId===animalId&&p.animalHandling.phase==='interact'&&p.animalHandling.progress>0))await gate('contact');
    const contact=await checkpoint('contact'),worker=contact.pawns.find(p=>p.animalHandling?.kind==='slaughter'&&p.animalHandling.animalId===animalId)!;
    expect(worker.animalHandling!.progress).toBeGreaterThan(0);expect(contact.wildlife!.animals.find(a=>a.id===animalId)!.domestic!.slaughter).toBeUndefined();
    const target=contact.wildlife!.animals.find(a=>a.id===animalId)!;expect(Math.abs(worker.x-target.x)).toBeLessThanOrEqual(1);expect(Math.abs(worker.z-target.z)).toBeLessThanOrEqual(1);expect(worker.motion?.end??0).toBeLessThanOrEqual(contact.tick);expect(target.motion?.end??0).toBeLessThanOrEqual(contact.tick);
    await animals();await page.locator(`[data-domestic-focus="${animalId}"]`).click();await expect(page.locator('[data-animal-activity]')).toContainText('quota du troupeau');await expect(page.locator('[data-animal-slaughter]')).not.toBeChecked();await page.screenshot({path:test.info().outputPath('quota-contact.png')});
    await gate('dead',60000);
    }
    const dead=await checkpoint('death'),corpse=dead.piles.find(p=>p.corpse?.animalId===animalId)!;expect(corpse.id).toBe(animalId);expect(corpse.quantity).toBe(1);expect(corpse.corpse!.health.death?.cause).toBe('execution');expect(dead.wildlife!.animals.some(a=>a.id===animalId)).toBe(false);expect(dead.pawns.some(p=>p.animalHandling?.kind==='slaughter'&&p.animalHandling.animalId===animalId)).toBe(false);expect(dead.pawns).toHaveLength(15);
    for(const id of witnessIds)expect(dead.wildlife!.animals.find(a=>a.id===id)!.state).not.toBe('dead');
    await editAutoSlaughterPolicy(page,quota);await expect(page.locator(`[data-auto-slaughter-species="${species}"] [data-auto-slaughter-count="total"]`)).toHaveText(String(candidates.length-1));
    expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});
    await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({source,sha,resumePath:resumePath??null,resumeSha256,declaredDotation:[],species,animalId,handlerId:handler.id,corpseId:corpse.id,witnessIds,checkpoints,errors,limits:`Actual historical Aulnes, ordinary work and physical contact. ${resumeRaw?'Continuation from the captured world; prior quota/cancellation/manual UI phases are not replayed.':'Quota fields, protection, cancellation and manual independence exercised.'} No injected animal, gestation or resource; no natural campaign or FPS claim.`},null,2));
  }catch(error){await pause(page);await writeTestFile(test.info().outputPath('failed-world.json'),serializeWorld(await world(page)));await writeTestFile(test.info().outputPath('failed-diagnostic.json'),JSON.stringify({species,animalId,checkpoints,errors,notice:await page.locator('#notice').textContent()},null,2));throw error;}
  finally{await page.close();await browser.close();}
});
