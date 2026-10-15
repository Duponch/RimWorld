import {expect,test,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {nativeV377Fixture,preparedV377LocalCheckpoint} from '../scenarios/secondary-site-v377';
import {world,pause,panel,expectWorld,observeErrors,saveKey} from './helpers';
import {perform,inspectPerson} from './player-actions';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {campaignPresentation} from '../../src/sim/secondary-site-presentation.ts';
import {groupMemberChoices} from '../../src/sim/group-authority.ts';
import {candidateAccess} from '../../src/sim/candidate-access.ts';
import {blockedCells,workNeighbours} from '../../src/sim/pathfinding.ts';
import {choppable} from '../../src/sim/plants.ts';
import type {World} from '../../src/sim/types.ts';

async function groupPanel(page:Page){await panel(page,'world');await page.locator('#world-tab-group').click();await expect(page.locator('[data-group-panel]')).toBeVisible();}
async function action(page:Page,name:string){const button=page.locator(`[data-group-action="${name}"]`);await expect(button).toHaveAttribute('aria-disabled','false');await button.click();}

/** Real visible destination selector. No forced click or world write. */
async function selectTile(page:Page,id:number){
  const select=page.locator('[data-planet-selection]');await expect(select).toBeVisible();
  await select.selectOption(String(id));await expect(select).toHaveValue(String(id));
}

async function ready(page:Page,ids:number[]){
  const available=async()=>ids.every(id=>groupMemberChoices(awaitedWorld!).some(c=>c.pawn.id===id&&c.ok));
  let awaitedWorld:World|undefined=await world(page);
  if(await available())return;
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>{awaitedWorld=await world(page);return available();},{timeout:20_000,message:'Membres réellement libres de leurs activités'}).toBe(true);
  await pause(page);
}

async function form(page:Page,ids:number[],destination:number,rations:number,info:TestInfo,label:string){
  await ready(page,ids);await groupPanel(page);
  const before=await world(page);expect(before.group).toBeUndefined();
  await page.locator('[data-group-draft-cleanup]').click();
  for(const input of await page.locator('[data-group-pile] input[aria-label^="Charger "]').all())await input.fill('');
  for(const id of ids)await page.locator(`[data-group-member="${id}"] input[type="checkbox"]`).check();
  let remaining=rations;const sources:{pileId:number;quantity:number}[]=[];
  for(const p of before.piles)if(remaining&&p.owner.type==='ground'&&p.item==='survival-meal'&&!p.foodPoison){
    const quantity=Math.min(remaining,4,p.quantity);sources.push({pileId:p.id,quantity});remaining-=quantity;
    await page.locator(`[data-group-pile="${p.id}"] input[aria-label^="Charger "]`).fill(String(quantity));
  }
  expect(remaining,'Provisions réelles présentes sur cette carte').toBe(0);
  await selectTile(page,destination);await page.locator('[data-group-preview="formation"]').click();
  await expect(page.locator('[data-group-route]')).toContainText('Route proposée');await action(page,'start');
  await page.waitForFunction(()=>window.__lisiere.world.group?.phase==='gathering');
  const forming=await world(page);expect(forming.group).toMatchObject({phase:'gathering',memberIds:ids,destination,ledger:{foodLoaded:0}});
  expect(forming.piles).toEqual(before.piles);
  await page.screenshot({path:info.outputPath(label+'-formation.png')});
  await page.locator('[data-speed="1"]').click();
  const inventoryBefore=before.piles.filter(p=>p.item==='survival-meal'&&p.owner.type==='inventory'&&ids.includes(p.owner.pawnId)).reduce((n,p)=>n+p.quantity,0);
  await page.waitForFunction(({ids,rations,inventoryBefore})=>{
    const g=window.__lisiere.world.group;if(!g)return false;
    if('manifest' in g)return g.manifest.some(line=>line.carriedPileId!==undefined);
    if(!('members' in g)||g.members.length!==ids.length||g.members.some(p=>!ids.includes(p.id))
      ||g.ledger.foodLoaded!==rations||g.baseline.food!==inventoryBefore+rations)return false;
    const food=g.items.filter(p=>p.item==='survival-meal'&&p.owner.type==='inventory');
    return food.every(p=>p.owner.type==='inventory'&&ids.includes(p.owner.pawnId))
      &&food.reduce((n,p)=>n+p.quantity,0)===g.baseline.food-g.ledger.foodConsumed;
  },{ids,rations,inventoryBefore},{polling:50,timeout:25_000});
  await pause(page);await groupPanel(page);
  const picked=await world(page),g=picked.group;if(!g)throw Error('Le groupe attendu a quitté le checkpoint de prise.');
  let pickup:Record<string,unknown>;
  if('manifest' in g){
    expect(g.manifest.some(line=>line.carriedPileId!==undefined)).toBe(true);
    await expect(page.locator('[data-group-manifest]')).toContainText('Pile prise #');
    pickup={kind:'contact-receipt',tick:picked.tick,phase:g.phase,foodLoaded:g.ledger.foodLoaded};
  }else if('members' in g){
    expect(g.members.map(p=>p.id).sort()).toEqual([...ids].sort());expect(g.ledger.foodLoaded).toBe(rations);
    expect(g.baseline.food).toBe(inventoryBefore+rations);
    const food=g.items.filter(p=>p.item==='survival-meal'&&p.owner.type==='inventory');
    expect(food.every(p=>p.owner.type==='inventory'&&ids.includes(p.owner.pawnId))).toBe(true);
    expect(food.reduce((n,p)=>n+p.quantity,0)).toBe(g.baseline.food-g.ledger.foodConsumed);
    expect(new Set([...picked.piles,...g.items].map(p=>p.id)).size).toBe(picked.piles.length+g.items.length);
    const goods=page.locator('.group-details > section').filter({has:page.getByRole('heading',{name:'Biens portés',exact:true})});
    for(const pile of food){
      const row=goods.locator('tbody tr').filter({hasText:'#'+pile.id});await expect(row).toHaveCount(1);
      await expect(row.locator('td').nth(1)).toHaveText(String(pile.quantity));
      const owner=g.members.find(p=>pile.owner.type==='inventory'&&p.id===pile.owner.pawnId)!;
      await expect(row.locator('td').nth(2)).toHaveText(owner.name+' · Inventaire');
    }
    pickup={kind:'physical-travelling-inventory',tick:picked.tick,phase:g.phase,foodLoaded:g.ledger.foodLoaded,
      foodConsumed:g.ledger.foodConsumed,inventory:food.map(p=>({id:p.id,quantity:p.quantity,owner:p.owner}))};
  }else throw Error('Le groupe a déjà terminé sa phase de voyage ; conserver ce checkpoint pour diagnostic.');
  await page.screenshot({path:info.outputPath(label+'-pickup.png')});
  await page.locator('[data-speed="6"]').click();
  return {tick:forming.tick,sources,pickup};
}

async function enter(page:Page,tile:number,ids:number[],info:TestInfo,label:string){
  await page.waitForFunction(tile=>{const g=window.__lisiere.world.group;return g?.phase==='at-site'&&g.tile===tile;},tile,{timeout:50_000});
  await pause(page);await groupPanel(page);
  const button=page.locator('[data-site-action="enter"]');await expect(button).toHaveAttribute('aria-disabled','false');await button.click();
  await page.waitForFunction(tile=>window.__lisiere.world.expeditionSite?.tile===tile,tile);
  await page.locator('[data-speed="6"]').click();await page.waitForFunction(()=>!window.__lisiere.world.group,undefined,{timeout:15_000});await pause(page);
  const current=await world(page);expect(current.campaignMap?.active).toBe('secondary');
  expect(current.pawns.map(p=>p.id).sort()).toEqual([...ids].sort());expect(Object.hasOwn(current,'secondarySite')).toBe(false);
  await inspectPerson(page,ids[0]!,'gear');await page.screenshot({path:info.outputPath(label+'-site.png')});
  return current;
}

async function exportCampaign(page:Page,info:TestInfo,name:string){
  await pause(page);await panel(page,'menu');
  const manager=page.locator('[data-save-manager]'),pending=page.waitForEvent('download');
  await manager.locator('[data-save-manager-action="export"]').click();
  const download=await pending,path=info.outputPath(name+'.json');await download.saveAs(path);
  const raw=await readFile(path,'utf8'),complete=deserializeWorld(raw),active=await world(page);
  expect(validateWorld(complete)).toEqual([]);expect(complete.secondarySite,'L’export conserve les deux cartes').toBeDefined();
  expect(complete.tick).toBe(active.tick);
  expect(JSON.parse(JSON.stringify(campaignPresentation(complete)))).toEqual(active);
  await info.attach(name,{path,contentType:'application/json'});return {complete,active,raw,path};
}

/** Exact existing acquisition; this opt-in never regenerates or edits it. */
async function native04Resume(){
  const directory=resolve('tmp/multimap-v377/native-04/secondary-site-v377-V377-n-8ab74-e-reload-return-and-revisit'),
    checkpointPath=resolve(directory,'expedition-reloaded-complete.json'),parentProofPath=resolve(directory,'proof.json');
  const [raw,parentRaw]=await Promise.all([readFile(checkpointPath,'utf8'),readFile(parentProofPath,'utf8')]);
  const sha=(text:string)=>createHash('sha256').update(text).digest('hex'),checkpointSha256=sha(raw),proofSha256=sha(parentRaw);
  expect(checkpointSha256).toBe('6f3508b3bfa0ff46850ce3460eff4827e88cf253afbf85a215066e8747af972f');
  expect(proofSha256).toBe('789a6572caa8327302f07eb0e21be564c4c07a80c37c7edc8027989a166e5659');
  const parent=JSON.parse(parentRaw) as {preparation:{memberIds:number[];residentId:number;tile:number};cut:{tick:number;treeId:number;jobId:number};fullCampaignReloadExact:boolean};
  expect(parent.fullCampaignReloadExact).toBe(true);expect(parent.cut).toEqual({tick:1826,treeId:346,jobId:536});
  const initial=deserializeWorld(raw);expect(initial.tick).toBe(1826);expect(initial.group).toBeUndefined();
  expect(initial.secondarySite?.selected).toBe(true);expect(initial.secondarySite?.map.group).toBeUndefined();
  expect(initial.secondarySite?.visit?.memberIds).toEqual(parent.preparation.memberIds);
  expect(initial.secondarySite?.tile).toBe(parent.preparation.tile);
  expect(initial.secondarySite!.map.resources.some(r=>r.id===parent.cut.treeId)).toBe(false);
  expect(serializeWorld(initial),'Entrée exacte, sans normalisation ni mutation préparatoire').toBe(raw);
  return {raw,fixture:{initial,...parent.preparation,notice:'REPRISE EXACTE NATIVE04 AU TICK1826 : aller, entrée, coupe346 et export/recharge déjà acquis. Ce parcours ne les rejoue pas et qualifie seulement retour physique puis revisite.'},
    parent:{checkpointPath,checkpointSha256,parentProofPath,proofSha256,cut:parent.cut,fullCampaignReloadExact:parent.fullCampaignReloadExact}};
}
const localOnly=process.env.V377_NATIVE_MODE==='local',resumeOnly=process.env.V377_NATIVE_MODE==='resume-native04';
test(resumeOnly?'V377 exact native04 checkpoint: physical return and revisit':localOnly?'V377 prepared local checkpoint: native work, complete save/reload, physical return and revisit':'V377 native fixed-neighbour route: physical formation, second map, work, complete save/reload, return and revisit',async({page},info)=>{
  test.setTimeout(240_000);page.setDefaultTimeout(10_000);
  const errors=observeErrors(page),proof:Record<string,unknown>={complete:false,mode:resumeOnly?'resume-native04':localOnly?'prepared-local':'full-ui',boundSeconds:240};
  const resume=resumeOnly?await native04Resume():undefined;
  const f=resume?.fixture??(localOnly?preparedV377LocalCheckpoint():nativeV377Fixture()),initial=f.initial,ids=f.memberIds;
  if(resume)proof.parent=resume.parent;
  proof.preparation={notice:f.notice,tick:initial.tick,tile:f.tile,memberIds:ids,residentId:f.residentId};
  const initialRaw=resume?.raw??serializeWorld(initial);await writeFile(info.outputPath(resume?'resumed-input.json':'prepared-input.json'),initialRaw);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:initialRaw});
    await page.goto('/?scenario=camp&e2e&size=32',{waitUntil:'domcontentloaded'});await expect(page.locator('#loading')).toBeHidden({timeout:60000});await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60000});await pause(page);
    await panel(page,'menu');await page.locator('#load').click();
    await expectWorld(page,localOnly||resumeOnly?JSON.parse(JSON.stringify(campaignPresentation(initial))):initial);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{const adapter=await navigator.gpu?.requestAdapter(),i=adapter?.info;return {vendor:i?.vendor,architecture:i?.architecture,device:i?.device,description:i?.description,fallback:(i as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter??(adapter as unknown as {isFallbackAdapter?:boolean}|null)?.isFallbackAdapter??null};});
    expect(hardware.fallback).not.toBe(true);expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);proof.hardware=hardware;
    if(!localOnly&&!resumeOnly){
      await groupPanel(page);
      for(const width of [1280,1440]){
        await page.setViewportSize({width,height:1000});
        for(const speed of [0,1,3,6])expect(await page.locator(`[data-speed="${speed}"]`).evaluate(button=>{
          const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(hit===button||button.contains(hit));
        }),`Temps ${speed} accessible avec Monde ouvert à ${width}px`).toBe(true);
      }
      proof.timeControlsUncovered=true;
      await action(page,'adopt');await page.waitForFunction(()=>!!window.__lisiere.world.planet);
      expect((await world(page)).planet!.tiles[(await world(page)).planet!.homeTile]!.neighbours).toContain(f.tile);
      proof.outbound=await form(page,ids,f.tile,8,info,'outbound');await enter(page,f.tile,ids,info,'first-entry');
    }
    let exported:Pick<Awaited<ReturnType<typeof exportCampaign>>,'complete'|'active'>,cutTreeId:number;
    if(resume){
      exported={complete:initial,active:JSON.parse(JSON.stringify(campaignPresentation(initial))) as World};
      cutTreeId=resume.parent.cut.treeId;
      proof.inherited={cut:resume.parent.cut,fullCampaignReloadExact:true,notice:'Acquis natif04 liés au parent ; aucun nouvel aller, coupe ou cycle de recharge revendiqué ici.'};
    }else{
    const local=await world(page),blocked=blockedCells(local),queries=local.pawns.map(p=>candidateAccess(local,p,blocked,new Set(),true));
    const tree=local.resources.filter(r=>r.kind==='tree'&&choppable(local,r)&&workNeighbours(r).some(c=>c.x>=0&&c.z>=0&&c.x<local.width&&c.z<local.height&&queries.some(q=>q.has(c.z*local.width+c.x))))
      .sort((a,b)=>Math.abs(a.x-local.pawns[0]!.x)+Math.abs(a.z-local.pawns[0]!.z)-Math.abs(b.x-local.pawns[0]!.x)-Math.abs(b.z-local.pawns[0]!.z))[0];
    expect(tree,'Arbre mature accessible du véritable site').toBeDefined();if(!tree)throw Error('Aucun arbre accessible');
    for(const pawnId of ids)await perform(page,{reason:'Coupe ordinaire sur le second site',command:{type:'priority',pawnId,work:'gather',value:1}},{value:0});
    await perform(page,{reason:'Modifier réellement le site pour la revisite',command:{type:'designate',kind:'chop',x:tree.x,z:tree.z}},{value:0});
    const chop=(await world(page)).jobs.find(j=>j.kind==='chop'&&j.x===tree.x&&j.z===tree.z)!;
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id=>window.__lisiere.world.pawns.some(p=>p.jobId===id&&p.state==='working'),chop.id,{timeout:25_000});await pause(page);
    await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath('site-chop-contact.png')});
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(id=>!window.__lisiere.world.resources.some(r=>r.id===id),tree.id,{timeout:25_000});await pause(page);
    const cut=await world(page);expect(cut.piles.some(p=>p.item==='wood'&&p.quantity>0&&p.owner.type==='ground')).toBe(true);
    for(const pawnId of ids)await perform(page,{reason:'Terminer la coupe avant le retour',command:{type:'priority',pawnId,work:'gather',value:0}},{value:0});
    proof.cut={tick:cut.tick,treeId:tree.id,jobId:chop.id};
    await groupPanel(page);await page.locator('[data-site-action="home"]').click();await page.waitForFunction(()=>window.__lisiere.world.campaignMap?.active==='home');
    expect((await world(page)).pawns.map(p=>p.id)).toEqual([f.residentId]);await groupPanel(page);await page.locator('[data-site-action="secondary"]').click();await page.waitForFunction(()=>window.__lisiere.world.campaignMap?.active==='secondary');
    await panel(page,'menu');const name='V377-'+(localOnly?'prepared-local':'full-ui'),manager=page.locator('[data-save-manager]');
    await manager.locator('[data-save-manager-name]').fill(name);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
    exported=await exportCampaign(page,info,'expedition-complete');
    expect(exported.complete.pawns.map(p=>p.id)).toEqual([f.residentId]);expect(exported.complete.secondarySite!.map.pawns.map(p=>p.id).sort()).toEqual([...ids].sort());
    expect(exported.complete.secondarySite!.map.resources.some(r=>r.id===tree.id)).toBe(false);
    await page.locator('#browse-saves').click();const front=page.locator('.front-menu');
    const row=front.locator('label').filter({has:page.locator('strong').filter({hasText:new RegExp('^'+name+'$')})});
    await row.locator('input[name="front-save"]').check();await front.getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,exported.active);
    const reloaded=await exportCampaign(page,info,'expedition-reloaded-complete');expect(reloaded.complete).toEqual(exported.complete);proof.fullCampaignReloadExact=true;
    cutTreeId=tree.id;
    }
    await page.keyboard.press('Escape');
    proof.returnPreparation=await form(page,ids,exported.complete.planet!.homeTile,ids.length,info,'return');
    await page.waitForFunction(()=>window.__lisiere.world.campaignMap?.active==='home'&&!!window.__lisiere.world.group&&'members' in window.__lisiere.world.group,undefined,{timeout:25_000});
    await page.waitForFunction(ids=>{const w=window.__lisiere.world;return !w.group&&ids.every(id=>w.pawns.some(p=>p.id===id));},ids,{timeout:50_000});await pause(page);
    const returned=await world(page);expect(returned.pawns.map(p=>p.id).sort()).toEqual([...ids,f.residentId].sort());
    expect(returned.piles.some(p=>p.owner.type==='inventory'&&ids.includes(p.owner.pawnId))).toBe(false);
    await page.screenshot({path:info.outputPath('home-returned.png')});proof.returnedAt=returned.tick;
    proof.revisitPreparation=await form(page,ids,f.tile,ids.length,info,'revisit');const revisited=await enter(page,f.tile,ids,info,'revisit');
    expect(revisited.resources.some(r=>r.id===cutTreeId)).toBe(false);expect(revisited.piles.some(p=>p.item==='wood'&&p.quantity>0&&p.owner.type==='ground')).toBe(true);
    const final=await exportCampaign(page,info,'revisited-complete');expect(final.complete.secondarySite!.createdAt).toBe(exported.complete.secondarySite!.createdAt);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});proof.revisitedAt=revisited.tick;proof.complete=true;
  }catch(error){proof.error=error instanceof Error?error.message:String(error);proof.incident=await page.evaluate(()=>window.__lisiere.incident).catch(()=>null);const active=await page.evaluate(()=>JSON.stringify(window.__lisiere.world)).catch(()=>null);if(active)await writeFile(info.outputPath('last-active-projection.json'),active);
    try{const saved=await exportCampaign(page,info,'failure-complete');proof.failureExport={path:saved.path,tick:saved.complete.tick,sha256:createHash('sha256').update(saved.raw).digest('hex')};}catch(cause){proof.conservationError=String(cause);}
    throw error;
  }finally{proof.errors=errors;await writeFile(info.outputPath('proof.json'),JSON.stringify(proof,null,2));await info.attach('proof',{path:info.outputPath('proof.json'),contentType:'application/json'});}
});
