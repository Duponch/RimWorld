import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {prepareGroupScenario} from '../../src/sim/group-scenario';
import {applyCommand,stepWorld,serializeCampaign,deserializeCampaign,validateWorld} from '../../src/sim/index';
import {configureSettlementLimit} from '../../src/sim/world-map-options';
import {settlementTileAction} from '../../src/sim/world-map-authority';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import type {CampaignState} from '../../src/sim/world-map-state';
import {pause,panel,observeErrors} from './helpers';

test.skip(process.env.WORLD_MAP_REGISTRY_255!=='1','ROOT: frozen registry sources and inputs; no historical campaign replay.');
function preparation(){
 const w=prepareGroupScenario(),run=(c:Parameters<typeof applyCommand>[1])=>{const r=applyCommand(w,c);if(!r.ok)throw Error(r.reason);};run({type:'planet-adopt'});const planet=w.planet;if(!planet||planet.revision===3)throw Error('Historical registry255 fixture requires its basic revision1/2 planet');configureSettlementLimit(w,5);
 const choices=planet.tiles.filter(t=>settlementTileAction(w,t.id).ok);if(choices.length<2)throw Error('No two admissible declared destinations.');
 const members=w.pawns.slice(0,2),ids:number[]=[];
 for(let i=0;i<2;i++){const source=w.piles.filter(p=>p.item==='survival-meal'&&p.owner.type==='ground'&&p.quantity===10)[i]!;run({type:'group-start',originMapId:0,memberIds:[members[i]!.id],sources:[{pileId:source.id,quantity:8}],destination:choices[i]!.id});ids.push(w.worldGroups!.selectedGroupId!);}
 const ready=()=>w.worldGroups!.groups.length===2&&w.worldGroups!.groups.every(r=>'members'in r.state&&r.state.phase==='at-site');
 for(let n=0;n<9000&&!ready();n++)stepWorld(w);if(!ready())throw Error('Real bounded prepared journeys did not arrive.');
 if(validateWorld(w).length)throw Error(validateWorld(w).join('; '));
 return {w,ids,members:members.map(p=>p.id),notice:'Independent declared32² Survivants scene. Two genuine formations, loading and journeys executed once in preparation until both actual arrivals. Native route remains paused: camp, colony conversion, abandonment, mapless reload and settlement. Not Aulnes, full campaign, planet parity or performance proof.'};
}
async function maps(page:Page){await page.keyboard.press('Escape');await panel(page,'world');await page.locator('#world-tab-maps').click();}
async function groups(page:Page){await page.keyboard.press('Escape');await panel(page,'world');await page.locator('#world-tab-group').click();}
async function confirm(page:Page,action:'S’installer'|'Abandonner'){const dialog=page.locator('.map-registry-confirmation');await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:action,exact:true}).click();await expect(dialog).toHaveCount(0);}
async function exported(page:Page,info:TestInfo,name:string){
 await pause(page);await page.keyboard.press('Escape');await panel(page,'menu');const waiting=page.waitForEvent('download');await page.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await waiting).saveAs(path);
 const state=deserializeCampaign(await decodeStoredSave(await readFile(path,'utf8')));expect(validateWorld(state)).toEqual([]);return {path,state};
}
async function reload(page:Page,path:string,expected:CampaignState){
 await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(path);await expect(front).toBeHidden({timeout:45_000});await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
 expect(await page.evaluate(()=>window.__lisiere.tick)).toBe(expected.tick);
 await expect(page.locator('#loading')).toHaveCount(0);
}
test('prepared actual caravans: camp, conversion, root abandonment, last-map loss, exact mapless reload and a new colony',async({page},info)=>{
 test.skip(!!process.env.WORLD_MAP_REGISTRY_255_INPUT,'Continue from the preserved mapless export; do not replay acquired transitions.');
 test.setTimeout(150_000);const f=preparation(),errors=observeErrors(page),initialTick=f.w.tick,report:Record<string,unknown>={complete:false,notice:f.notice,initialTick};
 const input=info.outputPath('actual-arrived-caravans.json');await writeFile(input,serializeCampaign(f.w));
 try{
  await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Options',exact:true}).click();await page.locator('#front-max-settlements').selectOption('3');await expect(page.locator('#front-max-settlements')).toBeEnabled();await front.getByRole('button',{name:'Retour',exact:true}).click();
  await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(input);await expect(front).toBeHidden({timeout:45_000});await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
  await groups(page);await page.getByLabel('Choisir une caravane').selectOption(String(f.ids[1]));await expect(page.getByLabel('Choisir une caravane')).toBeEnabled();await page.locator('[data-site-action="camp"]').click();await expect(page.locator('.map-registry-row')).toHaveCount(2,{timeout:30_000});
  const camp=await exported(page,info,'real-camp');expect(camp.state.worldMaps!.sites.map(m=>[m.id,m.kind])).toEqual([[0,'settlement'],[1,'camp']]);expect(camp.state.tick).toBe(initialTick);expect(camp.state.worldMaps!.sites[1]!.map!.width).toBe(200);report.camp={path:camp.path,tick:camp.state.tick};
  await maps(page);const second=page.locator('.map-registry-row[data-map-id="1"]');await second.getByRole('button',{name:'S’installer',exact:true}).click();await confirm(page,'S’installer');await expect(second).toContainText('Colonie');
  await page.screenshot({path:info.outputPath('01-two-actual-colonies.png')});
  const home=page.locator('.map-registry-row[data-map-id="0"]');await home.getByRole('button',{name:'Abandonner',exact:true}).click();await confirm(page,'Abandonner');await expect(home).toHaveCount(0);await expect(second).toHaveCount(1);
  await second.getByRole('button',{name:'Abandonner',exact:true}).click();await confirm(page,'Abandonner');await expect(page.locator('.game-shell')).toHaveClass(/campaign-only/);await expect(page.locator('.map-registry-row')).toHaveCount(0);
  const lost=await exported(page,info,'mapless-actual-caravan');expect(lost.state.worldMaps!.sites).toEqual([]);expect(Object.hasOwn(lost.state,'tiles')).toBe(false);expect(lost.state.worldGroups!.groups.map(g=>g.state.id)).toEqual([f.ids[0]]);expect(lost.state.tick).toBe(initialTick);report.mapless={path:lost.path};
  await reload(page,lost.path,lost.state);const reloaded=await exported(page,info,'mapless-reloaded');expect(serializeCampaign(reloaded.state)).toBe(serializeCampaign(lost.state));await page.screenshot({path:info.outputPath('02-mapless-caravan-and-world.png')});
  await groups(page);await page.getByLabel('Choisir une caravane').selectOption(String(f.ids[0]));await expect(page.getByLabel('Choisir une caravane')).toBeEnabled();await page.locator('[data-site-action="settle"]').click();await expect(page.locator('.game-shell')).not.toHaveClass(/campaign-only/,{timeout:30_000});
  const settled=await exported(page,info,'new-real-colony');expect(settled.state.worldMaps!.sites.map(m=>m.id)).toEqual([2]);expect(settled.state.worldMaps!.rootMapId).toBe(2);expect(settled.state.tick).toBe(initialTick);expect('pawns'in settled.state&&settled.state.pawns.map(p=>p.id)).toContain(f.members[0]);
  await reload(page,settled.path,settled.state);const last=await exported(page,info,'new-real-colony-reloaded');expect(serializeCampaign(last.state)).toBe(serializeCampaign(settled.state));
  await maps(page);await page.screenshot({path:info.outputPath('03-new-colony-same-traveller.png')});expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});report.final={path:last.path,tick:last.state.tick};report.complete=true;
 }finally{report.errors=errors;await writeFile(info.outputPath('summary.json'),JSON.stringify(report,null,2));}
});

test('resume the actual paused mapless export: loader exit, exact reload and same traveller founding a new colony',async({page},info)=>{
 test.skip(!process.env.WORLD_MAP_REGISTRY_255_INPUT,'ROOT continuation from the exact acquired mapless export only.');test.setTimeout(150_000);
 const input=process.env.WORLD_MAP_REGISTRY_255_INPUT!,bytes=await readFile(input),sha256=createHash('sha256').update(bytes).digest('hex');expect(sha256).toBe('567d92a8b3e61418838021eb6e5aaf5d4d4d680e98a3445e3bc42c8e0fac3533');
 const source=deserializeCampaign(await decodeStoredSave(bytes.toString('utf8')));expect(source.tick).toBe(2879);expect(source.worldMaps!.sites).toEqual([]);expect(source.worldGroups!.groups).toHaveLength(1);
 const group=source.worldGroups!.groups[0]!.state;if(!('members'in group))throw Error('Expected the original genuine departed caravan.');const goods=group.items.map(p=>({id:p.id,item:p.item,quantity:p.quantity})),members=group.members.map(p=>p.id),errors=observeErrors(page),report:Record<string,unknown>={complete:false,input,sha256,playedTicks:0};
 try{
  await reload(page,input,source);const first=await exported(page,info,'mapless-reloaded');expect(serializeCampaign(first.state)).toBe(serializeCampaign(source));await page.keyboard.press('Escape');await maps(page);await page.screenshot({path:info.outputPath('01-confirmed-globe-without-loading-overlay.png')});
  await groups(page);await page.getByLabel('Choisir une caravane').selectOption(String(group.id));await expect(page.getByLabel('Choisir une caravane')).toBeEnabled();await page.locator('[data-site-action="settle"]').click();await expect(page.locator('.game-shell')).not.toHaveClass(/campaign-only/,{timeout:30_000});
  // The confirmed map precedes preparation of its resident GPU pipelines.
  // Wait for actual player input, rather than treating the first terrain frame as readiness.
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60_000});
  const settled=await exported(page,info,'new-real-colony');expect(settled.state.worldMaps!.sites.map(m=>m.id)).toEqual([2]);expect(settled.state.worldMaps!.rootMapId).toBe(2);expect(settled.state.tick).toBe(source.tick);if(!('pawns'in settled.state))throw Error('The new genuine map must have its inhabitants.');expect(settled.state.pawns.map(p=>p.id)).toEqual(members);for(const old of goods)expect(settled.state.piles.find(p=>p.id===old.id)).toMatchObject(old);
  await reload(page,settled.path,settled.state);const final=await exported(page,info,'new-real-colony-reloaded');expect(serializeCampaign(final.state)).toBe(serializeCampaign(settled.state));await maps(page);await page.screenshot({path:info.outputPath('02-new-colony-original-traveller-and-goods.png')});
  expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});report.complete=true;report.final={path:final.path,tick:final.state.tick};
 }finally{report.errors=errors;await writeFile(info.outputPath('summary.json'),JSON.stringify(report,null,2));}
});
