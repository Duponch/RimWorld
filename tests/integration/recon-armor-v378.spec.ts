import {expect,test,type Page,type TestInfo} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {nativeV378Fixture} from '../scenarios/recon-armor-v378.ts';
import {world,pause,panel,expectWorld,observeErrors,saveKey} from './helpers.ts';
import {perform,inspectPerson} from './player-actions.ts';
import {serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import type {World} from '../../src/sim/types.ts';

const source=process.env.V378_URANIUM_SOURCE==='prepared'?'prepared':'mined';
const amount=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
async function act(page:Page,command:Parameters<typeof perform>[1]['command'],reason:string){await perform(page,{reason,command},{value:0});}
async function closePanels(page:Page){
  // Escape can be ignored while a command replacement is still in flight.
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);
  for(let n=0;n<3&&await page.locator('.management-panel:visible').count();n++)await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
}
async function saveReload(page:Page,info:TestInfo,label:string){
  await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);
  await writeFile(info.outputPath(label+'.json'),serializeWorld(before));
  await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(async()=>{const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);return raw?JSON.parse(raw):null;}).toEqual(before);
  await expect(page.locator('#load')).toBeEnabled();await page.locator('#load').click();await expectWorld(page,before);
  await closePanels(page);return before;
}

test('V378 chaîne physique courte : '+source+' uranium, fabrication, réserve, habillage114 et retrait66 avec recharges exactes',async({page},info)=>{
  test.setTimeout(300_000);const f=nativeV378Fixture(source),errors=observeErrors(page),initialRaw=serializeWorld(f.initial);
  await info.attach('préparation-explicite',{contentType:'text/plain',body:f.notice});await writeFile(info.outputPath('prepared-input.json'),initialRaw);
  await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:initialRaw});
  await page.goto('/?scenario=camp&e2e&size=32',{waitUntil:'domcontentloaded'});await expect(page.locator('#loading')).toBeHidden({timeout:60_000});await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60_000});await pause(page);
  await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,f.initial);await closePanels(page);
  expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
  const hardware=await page.evaluate(async()=>{const adapter=await navigator.gpu?.requestAdapter(),i=adapter?.info;return {vendor:i?.vendor,architecture:i?.architecture,description:i?.description,fallback:(i as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter??(adapter as unknown as {isFallbackAdapter?:boolean}|null)?.isFallbackAdapter??null};});
  expect(hardware.fallback).not.toBe(true);expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);
  await info.attach('adaptateur-observé',{contentType:'application/json',body:JSON.stringify(hardware)});
  await act(page,{type:'area',action:'stockpile',...f.storage,filters:{wood:false,food:false,uranium:true,apparel:true},items:{uranium:true,'recon-armor':true}},'Créer une réserve réelle limitée à l’uranium et à la combinaison.');
  await closePanels(page);
  await act(page,{type:'bill-add',structureId:f.benchId,recipe:'make-recon-armor'},'Ajouter la facture payée de combinaison.');
  await expect(page.locator('.bill-cost')).toContainText('80 plastacier · 3 composants avancés · 10 uranium');
  const bill=(await world(page)).structures.find(s=>s.id===f.benchId)!.bills!.find(b=>b.recipe==='make-recon-armor')!;
  if(source==='mined')await expect(page.locator(`[data-bill-reason="${bill.id}"]`)).toContainText('0/10 uranium');
  await act(page,{type:'bill-update',structureId:f.benchId,billId:bill.id,settings:{...bill,suspended:true}},'Suspendre la facture jusqu’au stockage réel de l’uranium.');
  await closePanels(page);
  if(source==='mined'){
    await act(page,{type:'priority',pawnId:f.pawnId,work:'mine',value:1},'Affecter le mineur8 préparé.');await closePanels(page);
    await act(page,{type:'designate',kind:'mine',...f.ore},'Désigner le minerai intact4000PV.');
    const mining=(await world(page)).jobs.find(j=>j.kind==='mine'&&j.x===f.ore.x&&j.z===f.ore.z)!;
    await act(page,{type:'order-job',pawnId:f.pawnId,jobId:mining.id,queue:false},'Miner au vrai contact.');await closePanels(page);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({x,z})=>!!window.__lisiere.world.tiles[z*window.__lisiere.world.width+x]!.miningDamage,f.ore,{timeout:12_000});await pause(page);
    const contact=await world(page),miner=contact.pawns.find(p=>p.id===f.pawnId)!;
    expect(Math.max(Math.abs(miner.x-f.ore.x),Math.abs(miner.z-f.ore.z))).toBe(1);expect(amount(contact,'uranium')).toBe(0);
    await page.screenshot({path:info.outputPath('uranium-mining-contact.png')});await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(({x,z})=>window.__lisiere.world.tiles[z*window.__lisiere.world.width+x]!.terrain==='rough-stone',f.ore,{timeout:35_000});await pause(page);
    const mined=await world(page);expect(amount(mined,'uranium')).toBe(40);expect(mined.pawns.find(p=>p.id===f.pawnId)!.skills.mining!.level).toBe(8);
    expect(mined.piles.some(p=>p.item==='unfinished-recon-armor'||p.item==='recon-armor')).toBe(false);
  }
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(()=>{const w=window.__lisiere.world,uranium=w.piles.filter(p=>p.item==='uranium');return uranium.length>0&&uranium.every(p=>p.owner.type==='ground'&&w.stockpiles.some(s=>p.owner.type==='ground'&&s.x===p.owner.x&&s.z===p.owner.z&&s.filters.uranium));},undefined,{timeout:20_000});await pause(page);
  const stocked=await world(page),available=amount(stocked,'uranium'),before={plasteel:amount(stocked,'plasteel'),advanced:amount(stocked,'advanced-component')};
  expect(available).toBe(source==='mined'?40:10);await expect(page.locator('#uranium')).toHaveText(String(available));
  await page.screenshot({path:info.outputPath('uranium-stored.png')});
  await act(page,{type:'bill-update',structureId:f.benchId,billId:bill.id,settings:{...bill,suspended:false}},'Autoriser les trois matières réelles pour la facture.');
  await closePanels(page); // Ordinary craft priority starts and resumes the bill, including real meal breaks.
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(()=>window.__lisiere.world.piles.some(p=>p.item==='unfinished-recon-armor'&&!!p.flakWork?.progress),undefined,{timeout:30_000});await pause(page);
  const begun=await world(page),work=begun.piles.find(p=>p.item==='unfinished-recon-armor')!,crafter=begun.pawns.find(p=>p.id===f.pawnId)!;
  expect(crafter.cooking).toMatchObject({recipe:'make-recon-armor',phase:'work'});expect(crafter.state).toBe('working');expect(work.flakWork!.authorId).toBe(f.pawnId);
  const spot=crafter.cooking!.spot;expect({x:crafter.x,z:crafter.z}).toEqual(spot);expect(crafter.skills.crafting!.level).toBeGreaterThanOrEqual(6);
  for(const [item,n] of [['plasteel',80],['advanced-component',3],['uranium',10]] as const)expect(work.flakWork!.parts.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0)).toBe(n);
  expect(amount(begun,'plasteel')).toBe(before.plasteel-80);expect(amount(begun,'advanced-component')).toBe(before.advanced-3);expect(amount(begun,'uranium')).toBe(available-10);
  await page.screenshot({path:info.outputPath('recon-armor-work-contact.png')});await saveReload(page,info,'unfinished-paid-exact');
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(()=>{const w=window.__lisiere.world;return w.piles.some(p=>p.item==='recon-armor'&&p.owner.type==='ground'&&w.stockpiles.some(s=>p.owner.type==='ground'&&s.x===p.owner.x&&s.z===p.owner.z&&s.filters.apparel))&&!w.pawns.some(p=>p.cooking?.recipe==='make-recon-armor');},undefined,{timeout:210_000});await pause(page);
  const finished=await world(page),suit=finished.piles.find(p=>p.item==='recon-armor')!;expect(suit.apparel).toBeDefined();expect(finished.piles.some(p=>p.item==='unfinished-recon-armor')).toBe(false);
  expect(amount(finished,'uranium')).toBe(available-10);expect(validateWorld(finished)).toEqual([]);
  await inspectPerson(page,f.pawnId,'gear');const priorPortrait=await page.locator('.appearance-inspection-portrait').getAttribute('src');await page.screenshot({path:info.outputPath('recon-armor-stored.png')});
  await act(page,{type:'order-equipment',pawnId:f.pawnId,itemId:suit.id,action:'wear',queue:false},'Enfiler la combinaison fabriquée, avec retrait réel du gilet et de la parka.');await closePanels(page);
  expect((await world(page)).pawns.find(p=>p.id===f.pawnId)!.equipmentTask!.duration).toBe(114);
  await page.locator('[data-speed="1"]').click();await page.waitForFunction(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);return p?.equipmentTask?.action==='wear'&&p.equipmentTask.progress>0;},f.pawnId,{timeout:12_000});await pause(page);
  const dressing=await saveReload(page,info,'wear114-in-progress-exact');expect(dressing.piles.find(p=>p.id===suit.id)!.owner.type).toBe('ground');
  await page.locator('[data-speed="6"]').click();await page.waitForFunction(id=>window.__lisiere.world.piles.find(p=>p.id===id)?.owner.type==='apparel',suit.id,{timeout:12_000});await pause(page);
  const worn=await world(page);expect(worn.piles.find(p=>p.id===suit.id)!.owner).toEqual({type:'apparel',pawnId:f.pawnId});expect(worn.piles.some(p=>p.owner.type==='apparel'&&p.owner.pawnId===f.pawnId&&(p.item==='flak-vest'||p.item==='cloth-parka'))).toBe(false);
  await inspectPerson(page,f.pawnId,'gear');await expect(page.locator('#equipment-apparel')).toContainText('Combinaison de reconnaissance');await expect(page.locator(`[data-pawn="${f.pawnId}"]`)).toHaveAttribute('data-apparel',/recon-armor/);
  expect(await page.locator('.appearance-inspection-portrait').getAttribute('src')).not.toBe(priorPortrait);await page.screenshot({path:info.outputPath('recon-armor-worn.png')});
  await act(page,{type:'order-equipment',pawnId:f.pawnId,itemId:suit.id,action:'remove',queue:false},'Retirer la combinaison sans perdre son identité ni sa qualité.');await closePanels(page);
  expect((await world(page)).pawns.find(p=>p.id===f.pawnId)!.equipmentTask!.duration).toBe(66);
  await page.locator('[data-speed="1"]').click();await page.waitForFunction(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);return p?.equipmentTask?.action==='remove'&&p.equipmentTask.progress>0;},f.pawnId,{timeout:8_000});await pause(page);
  const removing=await saveReload(page,info,'remove66-in-progress-exact');expect(removing.piles.find(p=>p.id===suit.id)!.owner.type).toBe('apparel');
  await page.locator('[data-speed="6"]').click();await page.waitForFunction(id=>window.__lisiere.world.piles.find(p=>p.id===id)?.owner.type==='ground',suit.id,{timeout:10_000});await pause(page);
  const final=await world(page),removed=final.piles.find(p=>p.id===suit.id)!;expect(removed.apparel?.quality).toBe(suit.apparel!.quality);expect(removed.apparel?.forbidden).toBe(true);expect(validateWorld(final)).toEqual([]);
  await inspectPerson(page,f.pawnId,'gear');await expect(page.locator('#equipment-apparel')).not.toContainText('Combinaison de reconnaissance');await page.screenshot({path:info.outputPath('recon-armor-removed.png')});
  expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});
});
