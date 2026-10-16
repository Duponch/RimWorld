import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {marshNativeV385} from '../scenarios/marsh-native-v385';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {navigationCosts} from '../../src/sim/furniture-travel';
import {TRAVEL_TICKS,edgeLength} from '../../src/sim/travel-timing';
import type {Cell,Command,World} from '../../src/sim/types';
import {world,pause,panel,expectWorld,observeErrors,cell,tool,settledCells,dragRectangle} from './helpers';
import {perform,revealCells} from './player-actions';

// Module-level opt-in: a global integration run must not construct a page.
test.skip(process.env.MARSH_V385!=='1','ROOT opt-in only; adopt/freeze schema246 first.');
const atomic=(w:World)=>({tiles:w.tiles,resources:w.resources,piles:w.piles,structures:w.structures,jobs:w.jobs,growingZones:w.growingZones,stockpiles:w.stockpiles,nextId:w.nextId,rng:w.rng});
async function exportReload(page:Page,info:TestInfo,name:string){
  await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);
  await page.keyboard.press('Escape');await panel(page,'menu');const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('V385 '+name);
  await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath(name+'.json');await(await download).saveAs(path);
  expect(deserializeWorld(await decodeStoredSave(await readFile(path,'utf8')))).toEqual(before);
  await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(path);
  await expect(page.locator('.front-menu')).toBeHidden({timeout:30_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:30_000});
  await pause(page);await expectWorld(page,before);await page.keyboard.press('Escape');
  await info.attach(name,{path,contentType:'application/json'});return before;
}

test('V385 prepared marsh outing: hover, refused sites, committed travel and civil wood return',async({page},info)=>{
  test.setTimeout(150_000);const errors=observeErrors(page),f=marshNativeV385(),rotation={value:0};
  expect(f.world.schemaVersion).toBe(246);expect(f.world.width).toBe(32);
  const path=info.outputPath('declared-marsh-preparation.json');await writeFile(path,f.initial);
  const act=async(command:Command,reason:string)=>{await pause(page);await perform(page,{command,reason},rotation);if(command.type!=='draft')await page.keyboard.press('Escape');};
  const point=async(c:Cell)=>{await revealCells(page,[c]);const [p]=await settledCells(page,[c]),b=(await page.locator('#viewport canvas').boundingBox())!;return {x:b.x+p!.x,y:b.y+p!.y};};
  await page.goto('/?e2e');const front=page.locator('.front-menu');
  await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(path);
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await pause(page);await expectWorld(page,f.world);
  const hover=await point(f.emptyWet);await page.mouse.move(hover.x,hover.y);
  await expect(page.locator('#map-hover-readout')).toBeVisible();await expect(page.locator('#map-hover-readout')).toContainText('Marais');
  await expect(page.locator('#map-hover-readout')).toContainText('fertilité 0 %');
  await expect(page.locator('#map-hover-readout')).toContainText('vitesse de déplacement 50 %');
  await page.screenshot({path:info.outputPath('01-marsh-hover.png')});

  // One empty wet patch, three actual UI attempts; no new witness world.
  const refusalBefore=await world(page);
  await tool(page,'growing');await revealCells(page,[f.emptyWet,{x:15,z:14}]);
  await dragRectangle(page,f.emptyWet,{x:15,z:14});await page.keyboard.press('Escape');
  expect(atomic(await world(page))).toEqual(atomic(refusalBefore));
  for(const kind of ['wall','power-conduit'] as const){
    await tool(page,kind);if(kind==='wall'){
      await panel(page,'architect');await page.locator('#construction-material').selectOption('wood');await page.locator('#architect-panel [data-close-panel]').click();
    }
    const p=await point(f.emptyWet);await page.mouse.move(p.x,p.y);
    // Generic construction previews communicate refusal through the ghost,
    // not a native title. Preserve the real UI and check the attempted action.
    await expect(page.locator('#viewport canvas')).not.toHaveAttribute('title');
    if(kind==='wall')await page.screenshot({path:info.outputPath('01b-forbidden-wall-preview.png')});
    await cell(page,f.emptyWet.x,f.emptyWet.z);await page.keyboard.press('Escape');
    expect(atomic(await world(page))).toEqual(atomic(refusalBefore));
  }

  await act({type:'draft',pawnIds:[f.pawnId],enabled:true},'Aller mobilisé au bois placé dans le marais.');
  const target=await point(f.marshCell);await page.mouse.click(target.x,target.y,{button:'right'});
  await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===f.pawnId)?.draft?.target).toEqual(f.marshCell);
  const committed=async(drafted:boolean)=>{
    await page.locator('[data-speed="1"]').click();
    const hit=await page.waitForFunction(({id,drafted})=>{
      const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id),m=p?.motion;
      if(!p||!!p.draft!==drafted||!m||m.end<=w.tick||w.tiles[m.to.z*w.width+m.to.x]?.terrain!=='marsh')return false;
      return {tick:w.tick,motion:structuredClone(m),haul:p.haul?structuredClone(p.haul):null};
    },{id:f.pawnId,drafted},{polling:20,timeout:15_000});
    const sample=await hit.jsonValue();if(!sample)throw Error('No committed marsh segment observed.');await pause(page);
    const m=sample.motion;expect(m.terrainDelay).toBe(3);
    expect(m.end-m.start).toBeCloseTo(TRAVEL_TICKS*edgeLength(m.from,m.to)/(m.speedFactor??1)+3,8);
    const w=await world(page),p=w.pawns.find(p=>p.id===f.pawnId)!,index=m.to.z*w.width+m.to.x,lookup=navigationCosts(w,p),search=drafted?1600:7000;
    expect(lookup.costs?.get(index)).toBe(search);expect(lookup.floors.get(index)).toBe(search);
    return {...sample,searchCost:search};
  };
  const mobilized=await committed(true),engaged=await world(page),traveler=engaged.pawns.find(p=>p.id===f.pawnId)!;
  expect(traveler.motion!.end).toBeGreaterThan(engaged.tick);
  const resumed=await exportReload(page,info,'committed-marsh-step-exact');
  expect(resumed.pawns.find(p=>p.id===f.pawnId)!.motion).toEqual(traveler.motion);
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(({id,target})=>{const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id);return !!p&&p.x===target.x&&p.z===target.z&&p.moveCooldown===0&&(!p.motion||p.motion.end<=w.tick);},{id:f.pawnId,target:f.marshCell},{timeout:20_000});await pause(page);
  await act({type:'draft',pawnIds:[f.pawnId],enabled:false},'Démobiliser après l’arrivée physique au centre humide.');
  await act({type:'priority',pawnId:f.pawnId,work:'haul',value:1},'Autoriser le transport civil du bois préparé.');
  await act({type:'order-haul',pawnId:f.pawnId,target:{type:'pile',pileId:f.sourceId},queue:false},'Rapporter les10bois au vrai stockage sec.');
  const civilian=await committed(false);expect(civilian.haul?.phase).toBe('deliver');expect(civilian.haul?.sourcePileId).toBe(f.sourceId);
  const carrying=await world(page),carrier=carrying.pawns.find(p=>p.id===f.pawnId)!,cargo=carrying.piles.find(p=>p.id===carrier.haul!.carryPileId)!;
  expect(cargo).toMatchObject({item:'wood',quantity:10,owner:{type:'pawn',pawnId:f.pawnId}});
  expect(civilian.motion.terrainDelay).toBe(mobilized.motion.terrainDelay);
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(({id,store})=>{const w=window.__lisiere.world;return !w.pawns.find(p=>p.id===id)?.haul&&w.piles.some(p=>p.item==='wood'&&p.quantity===10&&p.owner.type==='ground'&&p.owner.x===store.x&&p.owner.z===store.z);},{id:f.pawnId,store:f.storage},{timeout:20_000});await pause(page);
  const stored=await world(page),wood=stored.piles.filter(p=>p.item==='wood');expect(wood).toHaveLength(1);expect(wood[0]!.owner).toEqual({type:'ground',...f.storage});
  expect(wood[0]!.quantity).toBe(10);expect(stored.jobs).toHaveLength(0);expect(stored.growingZones).toHaveLength(0);
  await page.screenshot({path:info.outputPath('02-civil-return-dry-storage.png')});const final=await exportReload(page,info,'marsh-return-storage-exact');
  expect(errors).toEqual([]);expect(await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident})))
    .toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});
  await writeFile(info.outputPath('marsh-native-summary.json'),JSON.stringify({notice:f.notice,schema:246,start:f.world.tick,mobilized,civilian,resumedAt:resumed.tick,storedAt:stored.tick,final:final.tick,sourceId:f.sourceId,cargoId:cargo.id,storedId:wood[0]!.id,refused:['growing','wall','power-conduit'],errors,scope:'One prepared32² marsh outing, UI observations/rejections and real transported finite wood. Physical+3 differs from search1600/7000. No natural marsh generation, winter, fire or performance certification.'},null,2));
});
