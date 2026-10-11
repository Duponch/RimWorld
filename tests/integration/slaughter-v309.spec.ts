import { expect,test } from '@playwright/test';
import { slaughterCamp } from '../helpers/slaughter-v309.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { decodeStoredSave } from '../../src/ui/save-storage-codec.ts';
import { SLAUGHTER_WORK_TICKS } from '../../src/sim/animal-slaughter.ts';
import type { Command } from '../../src/sim/types.ts';
import { observeErrors,pause,world,expectWorld,panel,saveKey } from './helpers.ts';
import { perform } from './player-actions.ts';
import { writeTestFile } from '../test-output.ts';

// Observe actual resident marker attributes and generated GPU modules. This
// wraps presentation only; commands and all simulation ticks remain ordinary.
const rendererProbe=`
const slaughterFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
  const result=slaughterFrame.call(this,now);if(this.preparing||!this.world)return result;
  const markers=[];this.scene.traverse(mesh=>{
    if(mesh.name!=='Domestic slaughter — shared GPU trajectories')return;
    const flags=mesh.geometry.getAttribute('aSlaughter');
    markers.push({visible:mesh.visible,count:mesh.geometry.instanceCount,flags:Array.from({length:mesh.geometry.instanceCount},(_,i)=>flags.getX(i))});
  });
  window.__slaughterMarker={tick:this.world.tick,markers};
  return result;
};`;

test('V309 native: cancel, real approach/contact, strict reload, corpse, butchery and meal',async({playwright})=>{
  test.setTimeout(180000);
  const fixture=slaughterCamp(),prepared=fixture.world;
  expect(validateWorld(prepared)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chrome',args:[]});
  const page=await browser.newPage({baseURL:process.env.SLAUGHTER_V309_BASE_URL??'http://127.0.0.1:5173',viewport:{width:2560,height:1440}});
  const errors=observeErrors(page),checkpoints:{label:string;tick:number}[]=[];
  const rotation={value:0},act=(command:Command,reason:string)=>perform(page,{reason,command},rotation);
  page.setDefaultTimeout(20000);
  try{
    await page.addInitScript(()=>{
      const state=window as any;state.__slaughterShaders=[];
      const create=GPUDevice.prototype.createShaderModule;
      GPUDevice.prototype.createShaderModule=function(descriptor){
        state.__slaughterShaders.push(descriptor.code);return create.call(this,descriptor);
      };
    });
    await page.route('**/src/main.ts*',async route=>{
      const response=await route.fetch();await route.fulfill({response,body:rendererProbe+await response.text()});
    });
    await page.goto('/?scenario=camp&e2e&size=32');
    await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
    // Import only the private fixture through the same repository used by Menu
    // Load. No live world mutation and no new public save are involved.
    await page.evaluate(async({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(prepared)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');

    async function checkpoint(label:string){
      await pause(page);const snapshot=await world(page);expect(validateWorld(snapshot)).toEqual([]);
      await page.keyboard.press('Escape');await panel(page,'menu');await page.locator('#save').click();
      await expect.poll(async()=>{
        const stored=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);
        return stored?serializeWorld(deserializeWorld(await decodeStoredSave(stored))):null;
      }).toBe(serializeWorld(snapshot));
      const raw=await page.evaluate(()=>window.__lisiere.saveRepository.peekItem('lisiere.save.v1'));
      expect(serializeWorld(deserializeWorld(await decodeStoredSave(raw!)))).toBe(serializeWorld(snapshot));
      await page.locator('#load').click();await expectWorld(page,snapshot);await page.keyboard.press('Escape');
      checkpoints.push({label,tick:snapshot.tick});
      await writeTestFile(test.info().outputPath(`checkpoint-${label}.json`),serializeWorld(snapshot));return snapshot;
    }
    async function animals(){
      await page.keyboard.press('Escape');await page.locator('[data-panel="animals"]').click();
      await expect(page.locator(`[data-domestic-focus="${fixture.animalId}"]`)).toBeVisible();
    }
    async function watch(phase:'approach'|'contact'|'corpse'|'butchered'|'ingested'){
      await page.waitForFunction(({phase,id,handlerId,cookId})=>{
        const w=window.__lisiere.world,h=w.pawns.find(p=>p.id===handlerId),cook=w.pawns.find(p=>p.id===cookId);
        const ready=phase==='approach'?h?.animalHandling?.kind==='slaughter'&&h.animalHandling.phase==='approach'&&!!h.motion
          :phase==='contact'?h?.animalHandling?.kind==='slaughter'&&h.animalHandling.phase==='interact'&&h.animalHandling.progress>0
          :phase==='corpse'?w.piles.some(p=>p.id===id&&p.kind==='corpse')
          :phase==='butchered'?w.butchery?.completed===1
          :cook!.hunger>80;
        if(!ready)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
      },{phase,id:fixture.animalId,handlerId:fixture.handlerId,cookId:fixture.cookId},{polling:'raf',timeout:60000});
      await pause(page);
    }

    await animals();const checkbox=page.locator(`[data-domestic-slaughter="${fixture.animalId}"]`);
    await expect(page.locator('.domestic-table thead th')).toHaveText(['Nom','Sexe','Âge','Maturité','Soins','Enclos','Production','État','Abattre']);
    await expect(checkbox).not.toBeChecked();await checkbox.check();await expect(checkbox).toBeChecked();
    await expect(page.locator(`[data-domestic-details="${fixture.animalId}"]`)).toContainText('Désigné pour abattage');
    await page.locator(`[data-domestic-focus="${fixture.animalId}"]`).click();
    const inspector=page.locator('[data-animal-slaughter]');await expect(inspector).toBeChecked();await inspector.uncheck();
    await expect.poll(async()=>(await world(page)).wildlife!.animals[0]!.domestic?.slaughter===true).toBe(false);
    expect((await world(page)).piles).toHaveLength(0);expect((await world(page)).wildlife!.animals[0]!.health).toBeUndefined();
    await inspector.check();await checkpoint('designation');
    await expect.poll(async()=>page.evaluate(()=>(window as any).__slaughterMarker?.markers.some((m:any)=>m.visible&&m.flags.includes(1))??false)).toBe(true);
    const shaders=await page.evaluate(()=>(window as any).__slaughterShaders.filter((code:string)=>code.includes('aSlaughter')) as string[]);
    expect(shaders.length,'The marker must reach an actual generated WGSL module.').toBeGreaterThan(0);
    const wgsl=test.info().outputPath('slaughter.wgsl');await writeTestFile(wgsl,shaders.join('\n\n'));
    await test.info().attach('slaughter-wgsl',{contentType:'text/plain',path:wgsl});
    const designationImage=test.info().outputPath('designation.png');await page.screenshot({path:designationImage});
    await test.info().attach('designation',{path:designationImage,contentType:'image/png'});

    await page.locator('[data-speed="1"]').click();await watch('approach');
    const approaching=await checkpoint('approach');expect(approaching.pawns.find(p=>p.id===fixture.handlerId)!.animalHandling?.progress).toBe(0);
    await page.locator('[data-speed="1"]').click();await watch('contact');
    const contact=await checkpoint('contact'),task=contact.pawns.find(p=>p.id===fixture.handlerId)!.animalHandling!;
    expect(task.progress).toBeGreaterThan(0);expect(task.progress).toBeLessThan(SLAUGHTER_WORK_TICKS);
    expect(contact.wildlife!.animals.find(a=>a.id===fixture.animalId)!.health?.death).toBeUndefined();
    await animals();await expect(page.locator(`[data-domestic-details="${fixture.animalId}"]`)).toContainText('Abattage');
    await page.locator(`[data-domestic-focus="${fixture.animalId}"]`).click();await expect(page.locator('[data-animal-activity]')).toContainText('Abattage');
    const contactImage=test.info().outputPath('contact.png');await page.screenshot({path:contactImage});
    await test.info().attach('contact',{path:contactImage,contentType:'image/png'});await page.keyboard.press('Escape');

    await page.locator('[data-speed="1"]').click();await watch('corpse');
    const killed=await checkpoint('whole-corpse'),corpse=killed.piles.find(p=>p.id===fixture.animalId)!;
    expect(corpse.owner.type).toBe('ground');expect(corpse.quantity).toBe(1);expect(corpse.corpse!.animalId).toBe(fixture.animalId);
    expect(corpse.corpse!.health.death?.cause).toBe('execution');
    expect(corpse.corpse!.health.injuries.some(i=>i.kind==='execution-cut')).toBe(true);
    expect(killed.wildlife!.animals.some(a=>a.id===fixture.animalId)).toBe(false);
    expect(killed.filth!.items.some(f=>f.kind==='blood')).toBe(true);
    expect(killed.piles.some(p=>p.item==='hare-meat'||p.item==='light-leather')).toBe(false);
    await expect.poll(async()=>page.evaluate(()=>(window as any).__slaughterMarker?.markers.some((m:any)=>m.visible&&m.flags.includes(1))??false)).toBe(false);

    await act({type:'stockpile',x:8,z:8,enabled:true,filters:{wood:false,food:false,corpse:true}},'Ranger la dépouille réelle avant la boucherie.');
    // The healthy handler can carry the corpse while the deliberately hungry
    // cook prepares the later meal; needs and cargo interruption remain real.
    await act({type:'priority',pawnId:fixture.handlerId,work:'haul',value:2},'Attribuer le transport au dresseur disponible.');
    await act({type:'priority',pawnId:fixture.cookId,work:'cook',value:2},'Attribuer la cuisine au second colon.');
    await writeTestFile(test.info().outputPath('transport-start.json'),serializeWorld(await world(page)));
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>{const c=(await world(page)).piles.find(p=>p.id===fixture.animalId);return c?.owner.type==='ground'&&c.owner.x===8&&c.owner.z===8;},{timeout:30000}).toBe(true);
    await checkpoint('corpse-deposited');
    await act({type:'bill-add',structureId:fixture.spotId},'Dépecer cette identité physique.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();await watch('butchered');
    const butchered=await checkpoint('meat-and-leather');expect(butchered.butchery!.meat).toBeGreaterThan(0);expect(butchered.butchery!.leather).toBeGreaterThan(0);
    expect(butchered.piles.some(p=>p.id===fixture.animalId)).toBe(false);
    expect(butchered.piles.filter(p=>p.item==='hare-meat').reduce((n,p)=>n+p.quantity,0)).toBe(butchered.butchery!.meat);
    await act({type:'bill-add',structureId:fixture.fireId},'Cuisiner un repas depuis cette viande.');
    const bill=(await world(page)).structures.find(s=>s.id===fixture.fireId)!.bills![0]!;
    await act({type:'bill-update',structureId:fixture.fireId,billId:bill.id,settings:{...bill,filters:{rice:false,berries:false,'hare-meat':true},destination:'drop'}},'Employer uniquement la viande issue de cet abattage.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();await watch('ingested');
    const final=await checkpoint('meal-ingested');expect(final.pawns.find(p=>p.id===fixture.cookId)!.hunger).toBeGreaterThan(80);
    expect(final.piles.filter(p=>p.item==='hare-meat').reduce((n,p)=>n+p.quantity,0)+10).toBe(final.butchery!.meat);
    expect(final.piles.filter(p=>p.item==='light-leather').reduce((n,p)=>n+p.quantity,0)).toBe(final.butchery!.leather);
    expect(final.piles.some(p=>p.item==='simple-meal')).toBe(false);expect(errors).toEqual([]);
    const report=test.info().outputPath('report.json');
    await writeTestFile(report,JSON.stringify({preparedScene:true,backend:'WebGPU',checkpoints,meat:final.butchery!.meat,leather:final.butchery!.leather,errors},null,2));
    await test.info().attach('slaughter-report',{contentType:'application/json',path:report});
  }catch(error){
    await writeTestFile(test.info().outputPath('failed-world.json'),JSON.stringify(await world(page)));
    await writeTestFile(test.info().outputPath('failed-diagnostic.json'),JSON.stringify({errors,checkpoints,notice:await page.locator('#notice').textContent(),incident:await page.evaluate(()=>window.__lisiere.incident)},null,2));
    throw error;
  }finally{await browser.close();}
});
