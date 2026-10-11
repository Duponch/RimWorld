import { expect,test } from '@playwright/test';
import { smeltingAulnes,smeltingBuildResume,smeltingWorkResume } from '../helpers/smelting-v311.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { decodeStoredSave } from '../../src/ui/save-storage-codec.ts';
import { constructionRecipe,deliveredMaterial } from '../../src/sim/construction-materials.ts';
import { footprintCells } from '../../src/sim/definitions.ts';
import { powerDemand } from '../../src/sim/power-rules.ts';
import { productionWorkTotal } from '../../src/sim/production-recipes.ts';
import type { Command,World } from '../../src/sim/types.ts';
import type { SmeltFilter } from '../../src/sim/cooking-types.ts';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world } from './helpers.ts';
import { perform,revealCells } from './player-actions.ts';
import { writeTestFile } from '../test-output.ts';
import { itemCargoKind } from '../../src/render/item-presentation.ts';

// Read the resident actor buffers after normal presentation. This observes the
// actual single cargo slot; no simulation or GPU buffer is written here.
const rendererProbe=(crafterId:number)=>`
window.__smeltingFrames=[];
const smeltingFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
  const result=smeltingFrame.call(this,now);if(this.preparing||!this.world)return result;
  const index=this.world.pawns.findIndex(p=>p.id===${crafterId}),g=this.pawns.feedbackSource;if(index<0||!g)return result;
  const pawn=this.world.pawns[index],pile=this.world.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);if(!pile)return result;
  const cargo=g.getAttribute('aCargo');window.__smeltingFrames.push({tick:this.world.tick,pileId:pile.id,item:pile.item,cargo:[cargo.getX(index),cargo.getY(index)]});
  if(window.__smeltingFrames.length>240)window.__smeltingFrames.shift();return result;
};`;

test('V311 native Aulnes: build, real 700 W flick, weapon filters/cargo/staging, strict reloads, steel storage and reuse',async({playwright})=>{
  test.setTimeout(600000);
  const fixture=await smeltingAulnes(),prepared=fixture.world;
  const workResume=await smeltingWorkResume(process.env.SMELTING_V311_RESUME_WORK,fixture);
  const resume=workResume??await smeltingBuildResume(process.env.SMELTING_V311_RESUME_BUILD,fixture),initial=resume?.world??prepared;
  const witnesses=fixture.witnessIds.map(id=>structuredClone(prepared.piles.find(p=>p.id===id)!));
  const browser=await playwright.chromium.launch({channel:'chrome',args:[]});
  const page=await browser.newPage({baseURL:process.env.SMELTING_V311_BASE_URL??'http://127.0.0.1:5173',viewport:{width:2560,height:1440}});
  page.setDefaultTimeout(20000);
  const errors=observeErrors(page),checkpoints:{label:string;tick:number}[]=[],rotation={value:0};
  const act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);
  let stationId=resume?.stationId??0,billId=workResume?.billId??0,productId=0,constructionJobId=0,reuseJobId=0;
  const crafter=(w:World)=>w.pawns.find(p=>p.id===fixture.crafterId)!;
  const input=(w:World)=>w.piles.find(p=>p.id===fixture.weaponId);
  async function checkpoint(label:string){
    await pause(page);const snapshot=await world(page);expect(validateWorld(snapshot)).toEqual([]);
    await page.keyboard.press('Escape');await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(async()=>{
      const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);
      return raw?serializeWorld(deserializeWorld(await decodeStoredSave(raw))):null;
    },{timeout:20000}).toBe(serializeWorld(snapshot));
    await page.locator('#load').click();await expectWorld(page,snapshot);await page.keyboard.press('Escape');
    checkpoints.push({label,tick:snapshot.tick});await writeTestFile(test.info().outputPath(`checkpoint-${label}.json`),serializeWorld(snapshot));return snapshot;
  }
  async function inspectStation(){
    await tool(page,'select');await page.keyboard.press('Escape');await revealCells(page,[fixture.station]);
    for(let attempt=0;attempt<prepared.pawns.length+3;attempt++){
      await revealCells(page,[fixture.station]);await cell(page,fixture.station.x,fixture.station.z);
      if(await page.locator('[data-add-recipe="smelt-weapon"]').isVisible())break;
    }
    await expect(page.locator('[data-add-recipe="smelt-weapon"]')).toBeVisible();
  }
  async function filter(settings:SmeltFilter,rifle:boolean){
    await inspectStation();const form=page.locator(`[data-bill="${billId}"]`);
    if(await form.locator('details').getAttribute('open')===null)await form.locator('summary').click();
    for(const item of ['revolver','bolt-action-rifle','emp-launcher','plasteel-knife'])await form.locator(`[data-field="${item}"]`).setChecked(item==='bolt-action-rifle'&&rifle);
    for(const key of ['hpMin','hpMax'] as const)await form.locator(`[data-field="${key}"]`).fill(String(settings[key]));
    for(const key of ['qualityMin','qualityMax'] as const)await form.locator(`[data-field="${key}"]`).selectOption(settings[key]);
    await form.locator(`[data-apply-bill="${billId}"]`).click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===stationId)!.bills!.find(b=>b.id===billId)!.smeltFilter).toEqual(settings);
  }
  type Phase='scanner-off'|'construction-work'|'built'|'source-edge'|'work'|'station-off'|'station-on'|'output'|'stored'|'reused';
  async function run(phase:Phase,speed:'1'|'6'='6'){
    await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
    const args={phase,scannerId:fixture.scannerId,crafterId:fixture.crafterId,weaponId:fixture.weaponId,stationId,stationCell:fixture.station,constructionJobId,productId,reuseJobId,storage:fixture.storage,reuse:fixture.reuse};
    await page.evaluate(args=>{(window as any).__smeltingGate={args,evaluations:0,visibility:document.visibilityState};},args);
    await page.waitForFunction(({phase,scannerId,crafterId,weaponId,stationId,stationCell,constructionJobId,productId,reuseJobId,storage,reuse})=>{
      const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===crafterId)!,t=p.cooking;
      const station=w.structures.find(s=>s.id===stationId),pile=w.piles.find(p=>p.id===productId),job=w.jobs.find(j=>j.id===constructionJobId);
      const ready=phase==='scanner-off'?w.structures.find(s=>s.id===scannerId)?.power?.switchOn===false&&!w.jobs.some(j=>j.flick?.structureId===scannerId)
        :phase==='construction-work'?!!job&&job.progress>0&&w.piles.filter(i=>i.owner.type==='job'&&i.owner.jobId===job.id&&i.item==='steel').reduce((n,i)=>n+i.quantity,0)===170
        :phase==='built'?w.structures.some(s=>s.kind==='electric-smelter'&&s.x===stationCell.x&&s.z===stationCell.z&&s.power?.on===true)
        :phase==='source-edge'?t?.recipe==='smelt-weapon'&&t.ingredients.some(i=>i.pileId===weaponId&&i.stage==='held')&&!!p.motion&&p.motion.start<w.tick&&w.tick<p.motion.end-1
        :phase==='work'?t?.recipe==='smelt-weapon'&&t.phase==='work'&&t.progress>0&&t.progress<1600000
        :phase==='station-off'?station?.power?.switchOn===false&&!w.jobs.some(j=>j.flick?.structureId===stationId)&&!w.pawns.some(p=>p.cooking?.stationId===stationId)
        :phase==='station-on'?station?.power?.switchOn!==false&&station?.power?.on===true&&!w.jobs.some(j=>j.flick?.structureId===stationId)
        :phase==='output'?t?.recipe==='smelt-weapon'&&t.phase==='output'&&!!t.productId
        :phase==='stored'?pile?.owner.type==='ground'&&pile.owner.x===storage.x&&pile.owner.z===storage.z&&!w.pawns.some(p=>p.cooking?.productId===productId)
        :w.structures.some(s=>s.kind==='power-conduit'&&s.x===reuse.x&&s.z===reuse.z)&&!w.jobs.some(j=>j.id===reuseJobId);
      const scanner=w.structures.find(s=>s.id===scannerId),diagnostic=(window as any).__smeltingGate;
      diagnostic.evaluations++;diagnostic.last={phase,tick:w.tick,ready,visibility:document.visibilityState,scannerId,scannerFound:!!scanner,scannerPower:scanner?.power,flickIds:w.jobs.filter(j=>j.flick?.structureId===scannerId).map(j=>j.id),crafterPresent:!!p,stationId,stationFound:!!station,constructionJobId,constructionFound:!!job,productId,productOwner:pile?.owner};
      if(!ready)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },args,{polling:20,timeout:phase==='construction-work'||phase==='built'?180000:90000});
    await pause(page);
    await writeTestFile(test.info().outputPath(`gate-${phase}.json`),JSON.stringify(await page.evaluate(()=>(window as any).__smeltingGate),null,2));
  }
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:rendererProbe(fixture.crafterId)+await response.text()});});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
    await page.evaluate(async({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await checkpoint(workResume?'resume-staged-work-entry':resume?'resume-built-entry':'aulnes-baseline');
    if(!resume){
    // Player work settings keep an empty new storage cell available for this
    // output. Existing jobs and their possessions are released by real commands.
    for(const pawn of prepared.pawns.filter(p=>!p.prisoner)){
      if(pawn.priorities.haul)await act({type:'priority',pawnId:pawn.id,work:'haul',value:0},'Conserver les réserves actuelles pendant la fusion.');
      if(pawn.id!==fixture.builderId&&pawn.id!==fixture.assistantBuilderId&&pawn.priorities.build)await act({type:'priority',pawnId:pawn.id,work:'build',value:0},'Réserver les livraisons aux deux constructrices choisies.');
      if(pawn.priorities.craft)await act({type:'priority',pawnId:pawn.id,work:'craft',value:0},'Suspendre les autres ateliers par les priorités du joueur.');
    }
    await act({type:'priority',pawnId:fixture.builderId,work:'build',value:1},'Activer Construction pour Salomé, avec Ada déjà active pour les livraisons.');
    await act({type:'power-flick',structureId:fixture.scannerId,on:false},'Libérer les 700 W du scanner par une intervention physique.');
    const flick=(await world(page)).jobs.find(j=>j.flick?.structureId===fixture.scannerId)!;
    await act({type:'order-job',pawnId:fixture.builderId,jobId:flick.id,queue:false},'Prioriser le vrai interrupteur du scanner.');
    await run('scanner-off');
    await panel(page,'architect');await page.locator('[data-category="production"]').click();await page.locator('[data-tool="electric-smelter"]').click();
    await revealCells(page,[fixture.station]);await cell(page,fixture.station.x,fixture.station.z);await page.keyboard.press('Escape');
    const construction=(await world(page)).jobs.find(j=>j.kind==='electric-smelter'&&j.x===fixture.station.x&&j.z===fixture.station.z)!;
    expect(construction).toBeDefined();constructionJobId=construction.id;
    expect(constructionRecipe(construction).ingredients).toEqual([{item:'steel',quantity:170},{item:'component',quantity:2}]);
    await act({type:'order-haul',pawnId:fixture.builderId,target:{type:'job',jobId:construction.id},queue:false},'Livrer les matériaux des Aulnes puis construire la fonderie.');
    await run('construction-work');const supplied=await world(page),frame=supplied.jobs.find(j=>j.id===construction.id)!;
    expect(deliveredMaterial(supplied,frame,'steel')).toBe(170);expect(deliveredMaterial(supplied,frame,'component')).toBe(2);
    await run('built');stationId=(await world(page)).structures.find(s=>s.kind==='electric-smelter'&&s.x===fixture.station.x&&s.z===fixture.station.z)!.id;
    await checkpoint('smelter-built');
    }
    const built=await world(page),station=built.structures.find(s=>s.id===stationId)!;
    expect(footprintCells(station)).toHaveLength(3);expect(powerDemand(station)).toBe(700);expect(station.power!.parentId).not.toBeNull();
    if(!workResume){
    await act({type:'priority',pawnId:fixture.builderId,work:'build',value:0},'Conserver le métal de sortie pour son chantier de réemploi.');
    await act({type:'priority',pawnId:fixture.assistantBuilderId,work:'build',value:0},'Suspendre aussi la seconde constructrice après le chantier réel.');
    await act({type:'stockpile',...fixture.storage,enabled:true,filters:{wood:false,food:false,steel:true},items:{steel:true},priority:4,capacity:75},'Réserver une case vide au métal récupéré.');
    await inspectStation();await page.locator('[data-add-recipe="smelt-weapon"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===stationId)!.bills!.filter(b=>b.recipe==='smelt-weapon').length).toBe(1);
    const bill=(await world(page)).structures.find(s=>s.id===stationId)!.bills![0]!;billId=bill.id;
    expect(bill).toMatchObject({recipe:'smelt-weapon',mode:'times',target:1,filters:{revolver:false,'bolt-action-rifle':false,'emp-launcher':false,'plasteel-knife':false},smeltFilter:{hpMin:0,hpMax:100,qualityMin:'awful',qualityMax:'legendary'}});
    await expect(page.locator(`[data-bill="${billId}"] [data-field="mode"] option[value="until"]`)).toHaveCount(0);
    await expect(page.locator(`[data-bill="${billId}"]`)).toContainText(/25\s*%/);await expect(page.locator(`[data-bill="${billId}"]`)).toContainText(/aucun composant/i);
    await act({type:'priority',pawnId:fixture.crafterId,work:'craft',value:1},'Activer Artisanat avant de contrôler les refus de filtre.');
    await filter({hpMin:0,hpMax:99,qualityMin:'normal',qualityMax:'normal'},true);
    await expect(page.locator(`[data-bill="${billId}"] [data-bill-reason]`)).toContainText(/ingrédient|arme|filtre/i);expect(input(await world(page))).toEqual(input(prepared));
    await filter({hpMin:100,hpMax:100,qualityMin:'good',qualityMax:'legendary'},true);
    await expect(page.locator(`[data-bill="${billId}"] [data-bill-reason]`)).toContainText(/ingrédient|arme|filtre/i);expect(input(await world(page))).toEqual(input(prepared));
    await filter({hpMin:100,hpMax:100,qualityMin:'normal',qualityMax:'normal'},true);
    await act({type:'order-cook',pawnId:fixture.crafterId,structureId:stationId,queue:false},'Fondre le fusil à verrou conservé au sol.');
    await run('source-edge','1');const carried=await checkpoint('weapon-carry-edge'),carrier=crafter(carried);
    expect(input(carried)!.owner).toEqual({type:'pawn',pawnId:fixture.crafterId});expect(input(carried)!.weapon).toEqual(input(prepared)!.weapon);
    expect(carrier.motion!.start).toBeLessThan(carried.tick);expect(carrier.motion!.end).toBeGreaterThan(carried.tick);
    expect(carrier.cooking!.ingredients).toHaveLength(1);expect(carrier.cooking!.ingredients[0]).toMatchObject({pileId:fixture.weaponId,quantity:1,stage:'held'});
    await expect.poll(()=>page.evaluate(({id,kind})=>(window as any).__smeltingFrames.some((f:any)=>f.pileId===id&&f.cargo[0]===kind&&f.cargo[1]===1),{id:fixture.weaponId,kind:itemCargoKind('bolt-action-rifle')})).toBe(true);
    await revealCells(page,[carrier]);await page.screenshot({path:test.info().outputPath('weapon-carried.png')});
    await run('work','1');const working=await checkpoint('weapon-staged-work'),task=crafter(working).cooking!,weapon=input(working)!;
    expect(task.progress).toBeGreaterThan(0);expect(task.progress).toBeLessThan(productionWorkTotal('smelt-weapon'));
    expect(task.ingredients[0]!.stage).toBe('placed');expect(weapon.owner).toEqual({type:'ground',...task.ingredients[0]!.cell});expect(weapon.weapon).toEqual(input(prepared)!.weapon);
    expect([crafter(working).x,crafter(working).z]).toEqual([task.spot.x,task.spot.z]);
    await inspectStation();await page.screenshot({path:test.info().outputPath('smelting-work.png')});
    }
    if(workResume){
      await inspectStation();await expect(page.locator(`[data-bill="${billId}"] [data-bill-reason]`)).toContainText('Fond une arme');
      await page.screenshot({path:test.info().outputPath('smelting-work.png')});
    }
    await act({type:'power-flick',structureId:stationId,on:false},'Interrompre le travail avant destruction de l’arme.');
    const stop=(await world(page)).jobs.find(j=>j.flick?.structureId===stationId)!;
    await act({type:'order-job',pawnId:fixture.assistantBuilderId,jobId:stop.id,queue:false},'Ada, plus proche du poste, coupe réellement la fonderie.');
    await run('station-off','1');const interrupted=await checkpoint('power-interruption');expect(input(interrupted)!.weapon).toEqual(input(prepared)!.weapon);
    expect(input(interrupted)!.owner.type).toBe('ground');expect(interrupted.structures.find(s=>s.id===stationId)!.bills![0]!.target).toBe(1);
    await act({type:'power-flick',structureId:stationId,on:true},'Rétablir l’alimentation.');
    const restart=(await world(page)).jobs.find(j=>j.flick?.structureId===stationId)!;
    await act({type:'order-job',pawnId:fixture.assistantBuilderId,jobId:restart.id,queue:false},'Ada réactive réellement la fonderie.');await run('station-on','1');
    await act({type:'order-cook',pawnId:fixture.crafterId,structureId:stationId,queue:false},'Reprendre la fusion depuis l’arme toujours physique.');
    await run('output','1');const output=await checkpoint('steel-output'),outputTask=crafter(output).cooking!;productId=outputTask.productId!;
    const metal=output.piles.find(p=>p.id===productId)!;expect(input(output)).toBeUndefined();expect(metal).toMatchObject({item:'steel',kind:'steel',quantity:15,owner:{type:'pawn',pawnId:fixture.crafterId}});
    expect(metal.weapon).toBeUndefined();expect(metal.apparel).toBeUndefined();expect(outputTask.ingredients).toEqual([]);expect(outputTask.progress).toBe(0);expect(output.structures.find(s=>s.id===stationId)!.bills![0]!.target).toBe(0);
    await expect.poll(()=>page.evaluate(({id,kind})=>(window as any).__smeltingFrames.some((f:any)=>f.pileId===id&&f.cargo[0]===kind&&f.cargo[1]===1),{id:productId,kind:itemCargoKind('steel')})).toBe(true);
    await run('stored','1');const stored=await world(page);expect(stored.piles.find(p=>p.id===productId)).toMatchObject({quantity:15,owner:{type:'ground',...fixture.storage}});
    await act({type:'designate',kind:'power-conduit',...fixture.reuse,material:'steel'},'Réemployer une unité de ce métal dans une conduite voisine.');
    const reuse=(await world(page)).jobs.find(j=>j.kind==='power-conduit'&&j.x===fixture.reuse.x&&j.z===fixture.reuse.z)!;reuseJobId=reuse.id;
    await act({type:'priority',pawnId:fixture.assistantBuilderId,work:'build',value:1},'Réactiver Construction pour le réemploi par Ada, proche du poste.');
    await act({type:'order-haul',pawnId:fixture.assistantBuilderId,target:{type:'job',jobId:reuse.id},queue:false},'Ada livre le métal récupéré puis construit le nouveau câble.');
    expect((await world(page)).pawns.some(p=>p.haul?.sourcePileId===productId&&p.haul.quantity===1&&p.haul.destination.type==='job'&&p.haul.destination.jobId===reuse.id)).toBe(true);
    await run('reused','1');const final=await checkpoint('steel-stored-and-reused');expect(final.piles.find(p=>p.id===productId)).toMatchObject({quantity:14,owner:{type:'ground',...fixture.storage}});
    for(const witness of witnesses){const actual=final.piles.find(p=>p.id===witness.id)!;expect(actual.item).toBe(witness.item);expect(actual.quantity).toBe(1);expect(actual.weapon).toEqual(witness.weapon);}
    expect(final.pawns).toHaveLength(prepared.pawns.length);expect(errors).toEqual([]);await revealCells(page,[fixture.station,fixture.storage,fixture.reuse]);
    await page.screenshot({path:test.info().outputPath('smelter-aulnes-reuse.png')});
    await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({source:fixture.source,sourceSha:fixture.sourceSha,declaredDotation:fixture.declaredDotation,resume:resume?.provenance??null,scope:workResume?'interruption-output-storage-reuse-continuation; construction, filters, source cargo and staged work acquired in preserved red runs':resume?'fusion-storage-reuse-continuation; construction acquired in preserved red run':'fresh-integrated-journey',backend:'WebGPU',viewport:{width:2560,height:1440},builderId:fixture.builderId,assistantBuilderId:fixture.assistantBuilderId,crafterId:fixture.crafterId,weaponId:fixture.weaponId,witnessIds:fixture.witnessIds,scannerId:fixture.scannerId,stationId,billId,productId,reuseJobId,recoveredSteel:15,reusedSteel:1,storedSteel:14,checkpoints,errors},null,2));
  }catch(error){
    await writeTestFile(test.info().outputPath('failed-world.json'),JSON.stringify(await world(page)));
    await writeTestFile(test.info().outputPath('failed-diagnostic.json'),JSON.stringify({resume:resume?.provenance??null,checkpoints,errors,stationId,billId,productId,notice:await page.locator('#notice').textContent(),incident:await page.evaluate(()=>window.__lisiere.incident),gate:await page.evaluate(()=>(window as any).__smeltingGate??null)},null,2));throw error;
  }finally{await browser.close();}
});
