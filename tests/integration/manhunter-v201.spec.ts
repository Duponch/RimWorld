import { readFileSync } from 'node:fs';
import { expect,test } from '@playwright/test';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers.ts';
import { testOutputPath,writeTestFile } from '../test-output.ts';

/** Prepared hardware Chromium chronology. The worker remains the only World
 * owner; hooks observe published audio/music and send ordinary bridge orders. */
test('V201 real introductory rage, inspection, shelter, contact defense and exact resume',async({playwright})=>{
  test.setTimeout(120_000);
  const prepared=deserializeWorld(readFileSync('public/test-saves/v201/animal-en-rage.json','utf8'));
  const animalId=prepared.wildlife!.animals[0]!.id,pawnId=prepared.pawns[0]!.id;
  expect(validateWorld(prepared)).toEqual([]);expect(prepared.wildlife!.animals[0]!.manhunter).toBeUndefined();
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    await page.addInitScript(()=>{
      const probe={pipelines:0,hooked:false,cues:[] as unknown[],moods:[] as string[]};
      (window as any).__v201Probe=probe;
      const device=(globalThis as any).GPUDevice?.prototype;
      if(device)for(const name of ['createRenderPipeline','createRenderPipelineAsync']){
        const original=device[name];device[name]=function(...args:any[]){probe.pipelines++;return Reflect.apply(original,this,args);};probe.hooked=true;
      }
    });
    await page.route('**/src/main.ts*',async route=>{
      const response=await route.fetch();
      let body=await response.text();
      expect(body).toContain('client.onAudioCues = (cues) => {');
      body=body.replace('client.onAudioCues = (cues) => {','client.onAudioCues = (cues) => { window.__v201Probe.cues.push(...cues);');
      const hook=`const v201Mood=MusicDirector.prototype.setMood;MusicDirector.prototype.setMood=function(mood){window.__v201Probe.moods.push(mood);return v201Mood.call(this,mood);};`;
      await route.fulfill({response,body:hook+body+'\nwindow.__v201Command=async command=>{await client.command(command);};'});
    });
    await page.goto('/?e2e');
    const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.getByRole('button',{name:'Colonies de test',exact:true}).click();
    await front.locator('input[name="test-colony"][value="animal-en-rage-v201"]').check();
    await front.getByRole('button',{name:'Charger cette colonie',exact:true}).click();
    await expectWorld(page,prepared);await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await expect(page.locator('#inspect-threat')).toBeHidden();
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>!!window.__lisiere.world.wildlife?.animals.find(a=>a.id===id)?.manhunter,animalId);
    await pause(page);
    const active=await world(page);expect(active.smallIncidents!.incidents).toBe(1);
    expect(active.pawns.every(p=>p.faction!=='outlaws')).toBe(true);
    await expect(page.locator('#status-alerts')).toContainText('1 animal en rage');
    await page.locator('#inspect-threat').click();
    await expect(page.locator('[data-animal-activity]')).toContainText('En rage');
    await expect(page.locator('[data-animal-content="info"]')).toContainText('rage temporaire');
    const started=await page.evaluate(()=> (window as any).__v201Probe);
    expect(started.cues.filter((cue:any)=>cue.kind==='ui.threat'&&cue.id.includes('manhunter:'))).toHaveLength(1);
    expect(started.moods).toContain('tension');
    const door=active.structures.find(s=>s.kind==='door')!;
    expect(door.door!.open).toBe(false);
    expect(active.pawns.slice(1).every(p=>p.x>8&&p.x<12&&p.z>13&&p.z<19&&!p.health!.injuries.length)).toBe(true);
    // Continue genuine navigation before recording an in-flight checkpoint.
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{
      const a=window.__lisiere.world.wildlife?.animals.find(a=>a.id===id);
      return !!a?.manhunter&&a.manhunter.targetId!==undefined&&(!!a.motion||a.x!==19||a.z!==16);
    },animalId);
    await pause(page);const pursuing=await world(page);expect(validateWorld(pursuing)).toEqual([]);
    await page.screenshot({path:testOutputPath('artifacts/manhunter-v201-pursuit.png')});
    const pipelineCount=await page.evaluate(()=> (window as any).__v201Probe.pipelines);
    await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(()=>page.evaluate(key=>{
      const raw=window.__lisiere.saveRepository.peekItem(key);return raw?JSON.parse(raw).tick:null;
    },saveKey)).toBe(pursuing.tick);
    const saved=deserializeWorld((await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey))!);
    expect(saved).toEqual(pursuing);
    await page.locator('#load').click();await expectWorld(page,saved);await page.keyboard.press('Escape');
    await page.locator('#inspect-threat').click();
    await expect(page.locator('[data-animal-activity]')).toContainText('En rage');
    const restored=await page.evaluate(()=> (window as any).__v201Probe);
    expect(restored.cues.filter((cue:any)=>cue.kind==='ui.threat'&&cue.id.includes('manhunter:'))).toHaveLength(1);
    expect(restored.pipelines).toBe(pipelineCount);
    // Ordinary bridge commands exercise physical defense without clinical edits.
    await page.evaluate(async({pawnId,animalId})=>{
      await (window as any).__v201Command({type:'draft',pawnIds:[pawnId],enabled:true});
      await (window as any).__v201Command({type:'melee',pawnIds:[pawnId],targetId:animalId});
    },{pawnId,animalId});
    const injuryId=saved.pawns[0]!.health!.nextInjuryId,animalInjuryId=saved.wildlife!.animals[0]!.health!.nextInjuryId;
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({animalId,pawnId,injuryId,animalInjuryId})=>{
      const w=window.__lisiere.world,a=w.wildlife?.animals.find(a=>a.id===animalId),p=w.pawns.find(p=>p.id===pawnId);
      return (p?.health?.nextInjuryId??0)>injuryId||(a?.health?.nextInjuryId??0)>animalInjuryId||w.piles.some(p=>p.corpse?.animalId===animalId);
    },{animalId,pawnId,injuryId,animalInjuryId},{timeout:30_000});
    await pause(page);const defended=await world(page);expect(validateWorld(defended)).toEqual([]);
    await page.screenshot({path:testOutputPath('artifacts/manhunter-v201-contact.png')});
    const final=await page.evaluate(()=> (window as any).__v201Probe);
    expect(final.hooked).toBe(true);expect(final.pipelines).toBeGreaterThan(0);
    await writeTestFile('artifacts/manhunter-v201-native.json',JSON.stringify({prepared:true,initialTick:prepared.tick,
      incidentTick:active.smallIncidents!.lastIncidentTick,pursuingTick:pursuing.tick,defendedTick:defended.tick,
      pipelineCountBeforeReload:pipelineCount,pipelineCountAfterReload:restored.pipelines,
      notice:'Chronologie préparée et observation des pipelines ; aucune mesure CPU/GPU générale ni écoute humaine.',...final,errors},null,2));
    expect(errors).toEqual([]);
  }finally{await writeTestFile('artifacts/manhunter-v201-native-errors.json',JSON.stringify(errors));await browser.close();}
});
