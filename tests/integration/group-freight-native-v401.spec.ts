import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {groupFreightWorkshopV401} from '../scenarios/group-freight-v401';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {campaignPresentation} from '../../src/sim/secondary-site-presentation';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {previewGroupFormation} from '../../src/sim/group-authority';
import {captureHumanGoods,assertHumanGoodsPeople} from './aulnes-multimap-conservation-v397';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';

test.skip(process.env.GROUP_FREIGHT_V401!=='1','ROOT opt-in only: adopt253, freeze product and native sources first.');
const kg=(grams:number)=>(grams/1000).toLocaleString('fr-FR',{maximumFractionDigits:3})+' kg';
async function stop(page:Page){await page.keyboard.press('Escape');await pause(page);}
async function speed(page:Page,value:'1'|'6'){await page.keyboard.press('Escape');await page.locator(`[data-speed="${value}"]`).click();}
async function groupPanel(page:Page){await panel(page,'world');await page.locator('#world-tab-group').click();await expect(page.locator('[data-group-panel]')).toBeVisible();}
async function checkpoint(page:Page,info:TestInfo,name:string){
 await stop(page);await panel(page,'menu');const manager=page.locator('[data-save-manager]'),pending=page.waitForEvent('download');
 await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await pending).saveAs(path);
 // Preserve the actual complete download before any oracle can fail.
 const raw=await decodeStoredSave(await readFile(path,'utf8')),complete=deserializeWorld(raw),active=await world(page);
 expect(validateWorld(complete)).toEqual([]);expect(complete.secondarySite).toBeDefined();
 expect(JSON.parse(JSON.stringify(campaignPresentation(complete)))).toEqual(active);
 await info.attach(name,{path,contentType:'application/json'});return {complete,active,path};
}
async function exactReload(page:Page,info:TestInfo,name:string){
 const saved=await checkpoint(page,info,name);await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(saved.path);
 await expect(page.locator('.front-menu')).toBeHidden({timeout:30_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await stop(page);
 await expectWorld(page,saved.active);const after=await checkpoint(page,info,name+'-reloaded');expect(after.complete).toEqual(saved.complete);return after;
}

test('V401 prepared second site: partial wood and whole steel pickup, exact active reload, real home return and deposits',async({page},info)=>{
 test.setTimeout(120_000);const errors=observeErrors(page),f=groupFreightWorkshopV401(),initial=captureHumanGoods(f.world);
 const proof:Record<string,unknown>={complete:false,notice:f.notice,boundSeconds:120,scope:'One prepared32² second site and one ordinary return. No Aulnes campaign, healing, live World writes, FPS or GPU cost claim.'};
 const input=info.outputPath('prepared-local-freight.json');await writeFile(input,f.initial);
 try{
  await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(input);
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await stop(page);await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(f.world))));
  expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await groupPanel(page);
  for(const id of f.memberIds)await page.locator(`[data-group-member="${id}"] input[type=checkbox]`).check();
  const lines=[{pileId:f.woodId,quantity:f.woodQuantity},{pileId:f.steelId,quantity:f.steelQuantity},{pileId:f.foodId,quantity:f.foodQuantity}];
  for(const line of lines)await page.locator(`[data-group-pile="${line.pileId}"] input[aria-label^="Charger "]`).fill(String(line.quantity));
  await expect(page.locator(`[data-group-pile="${f.woodId}"] td`).nth(4)).toContainText(kg(400*f.woodQuantity));
  await expect(page.locator(`[data-group-pile="${f.steelId}"] td`).nth(4)).toContainText(kg(500*f.steelQuantity));
  await expect(page.locator(`[data-group-pile="${f.woodId}"] td`).nth(2)).toHaveText('12');await expect(page.locator(`[data-group-pile="${f.steelId}"] td`).nth(2)).toHaveText('4');
  const before=await world(page),preview=previewGroupFormation(before,f.memberIds,lines,before.planet!.homeTile);expect(preview.ok).toBe(true);if(!preview.ok)throw Error(preview.reason);
  await page.locator('[data-group-preview="formation"]').click();await expect(page.locator('[data-group-mass]')).toContainText(`Charge ${kg(preview.mass.grams)} / ${kg(preview.mass.capacityGrams)}`);
  const start=page.locator('[data-group-action="start"]');await expect(start).toHaveText('Former la caravane de retour');await expect(start).toHaveAttribute('aria-disabled','false');await start.click();
  await page.waitForFunction(()=>{const w=window.__lisiere.world;return w.group?.phase==='gathering';},undefined,{polling:100});const formed=await world(page);
  expect(formed.piles).toEqual(before.piles);expect(formed.group).toMatchObject({phase:'gathering',freight:{revision:1,woodLoaded:0,steelLoaded:0}});
  await page.screenshot({path:info.outputPath('01-freight-sources-mass-and-formation.png')});
  await speed(page,'1');
  await page.waitForFunction(woodId=>{
   const w=window.__lisiere.world,g=w.group;if(w.pawns.some(p=>p.state==='dead'||p.state==='downed'))throw Error('Real incapacity during freight loading.');
   return g?.phase==='loading'&&g.cursor>0&&g.cursor<g.manifest.length&&g.manifest.some(l=>l.pileId===woodId&&l.carriedPileId!==undefined);
  },f.woodId,{polling:100,timeout:25_000});await stop(page);
  // Exact complete state is exported before freight/identity assertions.
  const held=await exactReload(page,info,'active-partial-wood-loading');proof.activeCheckpoint={tick:held.complete.tick,path:held.path};
  const group=held.active.group;if(!group||!('manifest' in group))throw Error('The active physical loading checkpoint was missed; preserve failure, do not substitute an away checkpoint.');
  expect(group.phase).toBe('loading');expect(group.cursor).toBeLessThan(group.manifest.length);
  const receipt=group.manifest.find(l=>l.pileId===f.woodId&&l.carriedPileId!==undefined)!;expect(receipt.quantity).toBe(f.woodQuantity);expect(receipt.carriedPileId).not.toBe(f.woodId);
  const wood=held.active.piles.find(p=>p.id===receipt.carriedPileId)!;expect(wood).toMatchObject({item:'wood',quantity:f.woodQuantity,owner:{type:'inventory',pawnId:receipt.carrierId}});
  expect(held.active.piles.find(p=>p.id===f.woodId)).toMatchObject({item:'wood',quantity:12-f.woodQuantity,owner:{type:'ground',...f.woodCell}});
  expect(group.freight?.woodLoaded).toBe(f.woodQuantity);assertHumanGoodsPeople(initial,captureHumanGoods(held.complete));
  await groupPanel(page);await expect(page.locator('[data-group-manifest]')).toContainText('Pile prise #'+wood.id);
  const goods=page.locator('.group-details > section').filter({has:page.getByRole('heading',{name:'Biens portés',exact:true})});
  await expect(goods.locator('tbody tr').filter({hasText:'#'+wood.id}).locator('td').nth(3)).toHaveText(kg(f.woodQuantity*400));
  await page.screenshot({path:info.outputPath('02-active-pickup-reloaded-real-owner.png')});
  await speed(page,'6');
  await page.waitForFunction(()=>{
   const w=window.__lisiere.world,g=w.group;if(g&&'members' in g&&g.members.some(p=>p.state==='dead'||p.state==='downed'))throw Error('Real incapacity during return.');
   return !!g&&'members' in g&&g.freight?.woodLoaded===7&&g.freight.steelLoaded===4;
  },undefined,{polling:100,timeout:25_000});await stop(page);
  const travelling=await checkpoint(page,info,'both-materials-real-departure');const away=travelling.active.group;if(!away||!('members' in away))throw Error('Return group already entered: preserve checkpoint for diagnosis.');
  expect(away.freight).toEqual({revision:1,woodLoaded:7,steelLoaded:4});expect(away.baseline.freight).toEqual({wood:7,steel:4});
  expect(away.items.find(p=>p.id===wood.id)).toMatchObject({item:'wood',quantity:7,owner:{type:'inventory',pawnId:receipt.carrierId}});
  // Whole steel pickup keeps the source ID, unlike the partial wood split.
  expect(away.items.find(p=>p.id===f.steelId)).toMatchObject({item:'steel',quantity:4,owner:{type:'inventory'}});
  expect(travelling.complete.secondarySite!.map.piles.some(p=>p.id===f.steelId)).toBe(false);
  expect(travelling.complete.secondarySite!.map.piles.find(p=>p.id===f.woodId)).toMatchObject({quantity:5,owner:{type:'ground',...f.woodCell}});
  assertHumanGoodsPeople(initial,captureHumanGoods(travelling.complete));proof.departure={tick:travelling.complete.tick,woodId:wood.id,steelId:f.steelId,baseline:away.baseline.freight};
  await speed(page,'6');
  await page.waitForFunction(({ids,woodId,steelId})=>{
   const w=window.__lisiere.world;if(w.pawns.some(p=>ids.includes(p.id)&&(p.state==='dead'||p.state==='downed')))throw Error('Real incapacity at physical home return.');
   return !w.group&&ids.every(id=>w.pawns.some(p=>p.id===id))&&[woodId,steelId].every(id=>w.piles.some(p=>p.id===id&&p.owner.type==='ground'));
  },{ids:f.memberIds,woodId:wood.id,steelId:f.steelId},{polling:100,timeout:40_000});
  const deposited=await checkpoint(page,info,'home-materials-physically-deposited');proof.depositedCheckpoint={tick:deposited.complete.tick,path:deposited.path};
  expect(deposited.active.campaignMap?.active).toBe('home');expect(deposited.active.group).toBeUndefined();
  expect(deposited.active.piles.find(p=>p.id===wood.id)).toMatchObject({item:'wood',quantity:7,owner:{type:'ground'}});
  expect(deposited.active.piles.find(p=>p.id===f.steelId)).toMatchObject({item:'steel',quantity:4,owner:{type:'ground'}});
  expect(deposited.complete.secondarySite!.map.piles.find(p=>p.id===f.woodId)).toMatchObject({quantity:5,owner:{type:'ground',...f.woodCell}});
  assertHumanGoodsPeople(initial,captureHumanGoods(deposited.complete));
  // Endpoint receipts only: local stock may be spent normally after deposit.
  await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath('03-home-real-material-deposits.png')});
  expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});proof.complete=true;
 }catch(error){proof.error=error instanceof Error?error.message:String(error);try{const saved=await checkpoint(page,info,'failure-complete');proof.failure={path:saved.path,tick:saved.complete.tick};}catch(cause){proof.conservationError=String(cause);}throw error;}
 finally{proof.errors=errors;await writeFile(info.outputPath('proof.json'),JSON.stringify(proof,null,2));}
});