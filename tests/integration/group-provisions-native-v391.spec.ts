import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {groupProvisionsWorkshopV391} from '../scenarios/group-provisions-v391';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {rotAge} from '../../src/sim/food-preservation';
import type {MaterialPile} from '../../src/sim/types';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';

test.skip(process.env.GROUP_PROVISIONS_V391!=='1','ROOT opt-in only: adopt and freeze V391 schema250 first.');
const units=(piles:readonly MaterialPile[],item:'pemmican'|'survival-meal')=>piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const provisions=(piles:readonly MaterialPile[])=>({rations:units(piles,'survival-meal'),pemmican:units(piles,'pemmican')});
async function stop(page:Page){await page.keyboard.press('Escape');await pause(page);}
async function speed(page:Page,value:'1'|'6'){await page.keyboard.press('Escape');await page.locator(`[data-speed="${value}"]`).click();}
async function groupPanel(page:Page){await panel(page,'world');await page.locator('#world-tab-group').click();await expect(page.locator('[data-group-panel]')).toBeVisible();}
async function action(page:Page,name:'start'|'return'){const b=page.locator(`[data-group-action="${name}"]`);await expect(b).toHaveAttribute('aria-disabled','false');await b.click();}
async function visibleProvisions(page:Page,piles:readonly MaterialPile[]){
  const count=provisions(piles),nutrition=(count.rations*90+count.pemmican*5)/100;
  await expect(page.locator('[data-group-mass]')).toContainText(`${count.rations} repas de survie · ${count.pemmican} unités de pemmican · nutrition disponible ${nutrition.toLocaleString('fr-FR',{maximumFractionDigits:2})}`);
  expect(await page.locator('[data-group-mass]').textContent()).not.toMatch(/autonomie|jours? de nourriture/);
}
async function exportReload(page:Page,info:TestInfo){
  await stop(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);await panel(page,'menu');
  const manager=page.locator('[data-save-manager]');await manager.locator('[data-save-manager-name]').fill('V391 provisions mixtes réellement consommées');
  await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const pending=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const file=info.outputPath('away-mixed-provisions-exact.json');await(await pending).saveAs(file);
  expect(deserializeWorld(await decodeStoredSave(await readFile(file,'utf8')))).toEqual(before);
  await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(file);
  await expect(page.locator('.front-menu')).toBeHidden({timeout:30_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await stop(page);await expectWorld(page,before);await info.attach('away-mixed-provisions-exact',{path:file,contentType:'application/json'});return before;
}

test('V391 prepared collective camp: real mixed pickup, policy-specific multi-ingestion, exact reload and physical return/unload',async({page},info)=>{
  test.setTimeout(150_000);const errors=observeErrors(page),f=groupProvisionsWorkshopV391(32);
  expect(f.world.schemaVersion).toBe(250);expect(f.world.group).toBeUndefined();expect(f.memberIds).toHaveLength(2);
  const source=f.world.piles.find(p=>p.id===f.pemmicanId)!,ration=f.world.piles.find(p=>p.id===f.rationId)!;
  expect(source).toMatchObject({item:'pemmican',quantity:60,owner:{type:'ground'}});expect(ration).toMatchObject({item:'survival-meal',quantity:4,owner:{type:'ground'}});
  const originalAge=rotAge(source,f.world.tick);expect(originalAge).toBeGreaterThan(0);
  const file=info.outputPath('declared-mixed-provisions-preparation.json');await writeFile(file,f.initial);
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(file);
    await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await stop(page);await expectWorld(page,f.world);await groupPanel(page);
    for(const id of f.memberIds)await page.locator(`[data-group-member="${id}"] input[type=checkbox]`).check();
    await page.locator(`[data-group-pile="${f.pemmicanId}"] input[aria-label^="Charger "]`).fill('60');
    await page.locator(`[data-group-pile="${f.rationId}"] input[aria-label^="Charger "]`).fill('4');
    await page.locator('[data-planet-selection]').selectOption(String(f.destination));await page.locator('[data-group-preview="formation"]').click();
    await expect(page.locator('[data-group-route]')).toContainText('Route proposée');await visibleProvisions(page,[source,ration]);await action(page,'start');
    await page.waitForFunction(()=>window.__lisiere.world.group?.phase==='gathering');const formed=await world(page);
    expect(formed.piles).toEqual(f.world.piles);expect(formed.group).toMatchObject({memberIds:f.memberIds,ledger:{foodLoaded:0},provisions:{revision:1,pemmicanLoadedUnits:0,pemmicanConsumedUnits:0,pemmicanSpoiledUnits:0}});
    await page.screenshot({path:info.outputPath('01-real-formation-mixed-provisions.png')});
    await speed(page,'1');await page.waitForFunction(()=>{const g=window.__lisiere.world.group;return !!g&&('manifest' in g?g.manifest.some(l=>l.carriedPileId!==undefined):'members' in g);},undefined,{polling:30,timeout:20_000});await stop(page);
    const pickup=await world(page);await writeFile(info.outputPath('pickup-world.json'),JSON.stringify(pickup));const picked=pickup.group!;
    if('manifest' in picked){
      const receipt=picked.manifest.find(l=>l.carriedPileId!==undefined)!;const pile=pickup.piles.find(p=>p.id===receipt.carriedPileId)!;
      expect(pile).toMatchObject({item:receipt.item,quantity:receipt.quantity,owner:{type:'inventory',pawnId:receipt.carrierId}});
      await groupPanel(page);await expect(page.locator('[data-group-manifest]')).toContainText('Pile prise #');
    }else if('members' in picked){
      expect(picked.items.some(p=>p.owner.type==='inventory'&&f.memberIds.includes(p.owner.pawnId)&&p.item==='pemmican')).toBe(true);
    }else throw Error('Le checkpoint de prise physique a déjà disparu ; conserver son état.');
    await speed(page,'6');await page.waitForFunction(()=>{const g=window.__lisiere.world.group;return !!g&&'members' in g&&(g.provisions?.pemmicanConsumedUnits??0)>1&&g.ledger.foodConsumed>0;},undefined,{polling:30,timeout:30_000});await stop(page);
    const ate=await world(page);await writeFile(info.outputPath('consumed-world.json'),JSON.stringify(ate));const g=ate.group!;
    if(!('members' in g))throw Error('Le groupe consommateur doit encore être le propriétaire hors carte.');
    expect(g.members.map(p=>p.id).sort()).toEqual([...f.memberIds].sort());expect(ate.pawns.some(p=>f.memberIds.includes(p.id))).toBe(false);
    expect(g.provisions).toMatchObject({revision:1,pemmicanLoadedUnits:60,pemmicanSpoiledUnits:0});expect(g.provisions!.pemmicanConsumedUnits).toBeGreaterThan(1);
    expect(g.baseline.pemmican).toBe(60);expect(g.baseline.food).toBe(4);expect(g.ledger.foodLoaded).toBe(4);
    expect(units(g.items,'pemmican')).toBe(60-g.provisions!.pemmicanConsumedUnits);expect(units(g.items,'survival-meal')).toBe(4-g.ledger.foodConsumed);
    for(const p of g.members){expect(p.hunger).toBeGreaterThan(f.world.pawns.find(before=>before.id===p.id)!.hunger);expect(p.foodPolicyId).toBe(f.world.pawns.find(before=>before.id===p.id)!.foodPolicyId);}
    for(const p of g.items.filter(p=>p.item==='pemmican')){expect(p.owner.type).toBe('inventory');expect(p.foodPoison).toEqual(source.foodPoison);expect(rotAge(p,ate.tick)).toBeGreaterThanOrEqual(originalAge);}
    expect(new Set([...ate.piles,...g.items].map(p=>p.id)).size).toBe(ate.piles.length+g.items.length);
    await groupPanel(page);await visibleProvisions(page,g.items);const goods=page.locator('.group-details > section').filter({has:page.getByRole('heading',{name:'Biens portés',exact:true})});
    for(const p of g.items.filter(p=>p.item==='pemmican'||p.item==='survival-meal')){
      const row=goods.locator('tbody tr').filter({hasText:'#'+p.id});await expect(row).toHaveCount(1);await expect(row.locator('td').nth(1)).toHaveText(String(p.quantity));
      if(p.owner.type!=='inventory')throw Error('Une provision réelle a perdu son propriétaire inventaire.');const ownerId=p.owner.pawnId;
      await expect(row.locator('td').nth(2)).toHaveText(g.members.find(p=>p.id===ownerId)!.name+' · Inventaire');
    }
    await page.screenshot({path:info.outputPath('02-policy-meals-consumed-owned-remainders.png')});
    const resumed=await exportReload(page,info);expect(resumed.group).toEqual(g);await groupPanel(page);await action(page,'return');
    await expect.poll(async()=>(await world(page)).group?.destination).toBe(ate.planet!.homeTile);
    await speed(page,'6');const returnHandle=await page.waitForFunction(ids=>{
      const w=window.__lisiere.world,g=w.group,onMap=ids.every(id=>w.pawns.some(p=>p.id===id));
      if(g?.phase==='unloading'&&onMap)return JSON.stringify({phase:g.phase,tick:w.tick,ledger:g.ledger,provisions:g.provisions});
      return !g&&onMap?JSON.stringify({phase:'complete',tick:w.tick}):false;
    },f.memberIds,{polling:20,timeout:45_000});
    const returnWitness=JSON.parse(await returnHandle.jsonValue() as string) as {phase:'unloading'|'complete';tick:number;ledger?:{foodConsumed:number};provisions?:{pemmicanConsumedUnits:number;pemmicanSpoiledUnits:number}};
    await stop(page);if((await world(page)).group){await speed(page,'1');await page.waitForFunction(()=>!window.__lisiere.world.group,undefined,{timeout:10_000});await stop(page);}
    const final=await world(page);await writeFile(info.outputPath('final-world.json'),JSON.stringify(final));
    expect(final.group).toBeUndefined();for(const id of f.memberIds)expect(final.pawns.some(p=>p.id===id&&p.state!=='dead'&&p.state!=='downed')).toBe(true);
    const finalFood=final.piles.filter(p=>p.item==='pemmican'||p.item==='survival-meal');expect(finalFood.length).toBeGreaterThan(0);
    expect(finalFood.every(p=>p.owner.type==='ground')).toBe(true);
    if(returnWitness.phase==='unloading'){
      expect(returnWitness.ledger).toBeDefined();expect(returnWitness.provisions).toBeDefined();
      expect(provisions(finalFood)).toEqual({rations:4-returnWitness.ledger!.foodConsumed,pemmican:60-returnWitness.provisions!.pemmicanConsumedUnits-returnWitness.provisions!.pemmicanSpoiledUnits});
    }else{
      // A coalesced snapshot may already contain the completed ground deposits.
      // Report that limit; never invent the terminal ledger or freeze the first meal.
      expect(units(finalFood,'pemmican')).toBeLessThanOrEqual(units(g.items,'pemmican'));expect(units(finalFood,'pemmican')).toBeGreaterThan(0);
      expect(units(finalFood,'survival-meal')).toBeLessThanOrEqual(units(g.items,'survival-meal'));expect(units(finalFood,'survival-meal')).toBeGreaterThanOrEqual(0);
    }
    for(const p of finalFood.filter(p=>p.item==='pemmican')){expect(rotAge(p,final.tick)).toBeGreaterThanOrEqual(originalAge);expect(p.foodPoison).toEqual(source.foodPoison);}
    expect(final.pawns.filter(p=>!f.memberIds.includes(p.id)).map(p=>p.id)).toEqual(f.world.pawns.filter(p=>!f.memberIds.includes(p.id)).map(p=>p.id));
    expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident}))).toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});
    await page.screenshot({path:info.outputPath('03-original-people-returned-real-provisions-unloaded.png')});
    await writeFile(info.outputPath('native-summary.json'),JSON.stringify({notice:f.notice,formedAt:formed.tick,pickupAt:pickup.tick,consumedAt:ate.tick,reloadedAt:resumed.tick,returnedAt:final.tick,memberIds:f.memberIds,pemmicanSourceId:f.pemmicanId,rationSourceId:f.rationId,consumedPemmicanUnitsAtReload:g.provisions!.pemmicanConsumedUnits,consumedRationsAtReload:g.ledger.foodConsumed,returnWitness,terminalLedgerObserved:returnWitness.phase==='unloading',remaining:provisions(finalFood),errors,scope:'One declared32² collective fixture, actual formation/pickup, policy-specific ingestion, exact off-map save/reload, real route return and ground unload. Terminal ledger is qualified only when an unloading snapshot exposes it; otherwise only final physical remainder bounds are qualified. No World mutation after import, personal journey, secondary site, natural production, rot expiry or performance qualification.'},null,2));
  }catch(error){const failed=await world(page).catch(()=>undefined);if(failed)await writeFile(info.outputPath('failure-world.json'),JSON.stringify(failed));throw error;}
});
