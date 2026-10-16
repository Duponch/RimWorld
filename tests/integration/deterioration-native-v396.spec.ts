import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {deteriorationWorkshopV396} from '../scenarios/deterioration-v396';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {deteriorationExposure} from '../../src/sim/deterioration-rules';
import {DETERIORATION_INTERVAL} from '../../src/sim/deterioration-content';
import {CARRY_CAPACITY} from '../../src/sim/definitions';
import {ITEM_DEFINITIONS} from '../../src/sim/items';
import {world,pause,panel,expectWorld,observeErrors,cell} from './helpers';
import {perform,revealCells,inspectPerson} from './player-actions';

test.skip(process.env.DETERIORATION_V396!=='1','ROOT opt-in before page fixture; adopt/freeze V396 first.');
const NATIVE_QUANTITY=10;
async function reloadExact(page:Page,info:TestInfo){
  await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);
  await writeFile(info.outputPath('carried-world.json'),JSON.stringify(before),'utf8');
  await page.keyboard.press('Escape');await panel(page,'menu');const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('V396 tissu réellement porté');
  await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath('carried-exact-export.json');await(await download).saveAs(path);
  expect(deserializeWorld(await decodeStoredSave(await readFile(path,'utf8')))).toEqual(before);
  await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(path);
  await expect(page.locator('.front-menu')).toBeHidden({timeout:60_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await pause(page);await expectWorld(page,before);await page.keyboard.press('Escape');return before;
}

test('V396 finite exposed cloth: real rare damage, source-to-cargo haul/exact reload, shelf protection at two ordinary checks',async({page},info)=>{
  test.setTimeout(120_000);
  // Explicit prepared quantity, verified before serialization/import. Unit fixture default remains 50.
  expect(CARRY_CAPACITY).toBe(10);expect(NATIVE_QUANTITY).toBeLessThanOrEqual(CARRY_CAPACITY);
  const f=deteriorationWorkshopV396(32,NATIVE_QUANTITY),initial=f.world,errors=observeErrors(page),rotation={value:0};
  const source=initial.piles.find(p=>p.id===f.pileId)!;
  expect(initial.schemaVersion).toBe(252);expect(initial.width).toBe(32);expect(initial.height).toBe(32);
  expect(validateWorld(initial)).toEqual([]);expect(source.quantity).toBe(NATIVE_QUANTITY);expect(source.damage??0).toBe(0);
  expect(initial.piles.filter(p=>p.item==='cloth')).toEqual([source]);
  expect(initial.piles.some(p=>p.owner.type==='ground'&&p.owner.x===f.shelfCell.x&&p.owner.z===f.shelfCell.z)).toBe(false);
  expect(initial.deterioration).toMatchObject({revision:1,rng:1,lastTick:initial.tick-24});expect(initial.pawns[0]!.priorities.haul).toBe(0);
  expect(deteriorationExposure(initial,source)).toMatchObject({status:'outside',baseRate:4,rate:4,terrainFactor:0});
  const path=info.outputPath('declared-finite-cloth-and-shelf.json');await writeFile(path,f.initial,'utf8');
  async function inspectPile(pileId:number){
    await page.keyboard.press('Escape');const w=await world(page),pile=w.piles.find(p=>p.id===pileId);
    if(!pile||pile.owner.type!=='ground')throw Error('Ground inspection requires the tracked cloth identity to be physically on the map: '+pileId);
    const c={x:pile.owner.x,z:pile.owner.z};await revealCells(page,[c]);
    for(let n=0;n<w.pawns.length+w.structures.length+3;n++){
      await cell(page,c.x,c.z);if(await page.locator('#cell-title').textContent()===ITEM_DEFINITIONS[pile.item].label)return;
    }
    throw Error('Pointer inspection did not select the tracked cloth pile: '+pileId);
  }
  async function inspectExposure(pileId:number,label:string,rate:string){
    await inspectPile(pileId);await expect(page.locator('#cell-description')).toContainText(label);
    await page.locator('#cell-information').click();const dialog=page.locator('#object-information');await expect(dialog).toBeVisible();
    await expect(dialog.locator('.object-information-stat').filter({hasText:'Exposition'})).toContainText(label);
    const mean=dialog.locator('.object-information-stat').filter({hasText:'Détérioration moyenne'});await expect(mean).toContainText(rate);await mean.click();
    await expect(dialog.locator('#object-information-explanation')).toContainText('pas une date garantie');
    await expect(dialog.locator('#object-information-explanation')).toContainText('ni du feu ni de la pourriture');
  }
  async function runTo(phase:'damaged'|'carried'|'stored'|'protected-checks',pileId=f.pileId,stopTick=0){
    await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({phase,pawnId,sourcePileId,pileId,shelf,quantity,stopTick})=>{
      const w=window.__lisiere.world,p=w.piles.find(p=>p.id===pileId),pawn=w.pawns.find(p=>p.id===pawnId),haul=pawn?.haul;
      const carry=haul?.carryPileId===null||haul?.carryPileId===undefined?undefined:w.piles.find(p=>p.id===haul.carryPileId);
      const ready=phase==='damaged'?(p?.damage??0)>0
        :phase==='carried'?haul?.phase==='deliver'&&haul.sourcePileId===sourcePileId&&haul.carryPileId!==sourcePileId&&haul.quantity===quantity
          &&carry?.owner.type==='pawn'&&carry.owner.pawnId===pawnId&&!w.piles.some(p=>p.id===sourcePileId)
        :phase==='stored'?p?.owner.type==='ground'&&p.owner.x===shelf.x&&p.owner.z===shelf.z&&!haul
        :(w.deterioration?.lastTick??-1)>=stopTick;
      if(!ready)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },{phase,pawnId:f.pawnId,sourcePileId:f.pileId,pileId,shelf:f.shelfCell,quantity:NATIVE_QUANTITY,stopTick},{polling:20,timeout:15_000});
    await pause(page);return world(page);
  }
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(path);
    await expect(front).toBeHidden({timeout:60_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
    await pause(page);await expectWorld(page,initial);await inspectExposure(f.pileId,'Au sol exposé','4 PV/jour');
    await page.screenshot({path:info.outputPath('01-exposed-finite-stock-mean-rate.png')});await page.keyboard.press('Escape');
    const damaged=await runTo('damaged'),worn=damaged.piles.find(p=>p.id===f.pileId)!;
    expect(worn).toMatchObject({id:source.id,item:source.item,quantity:NATIVE_QUANTITY,owner:source.owner,damage:1});
    expect(damaged.deterioration!.rng).not.toBe(initial.deterioration!.rng);await inspectPile(f.pileId);
    await expect(page.locator('.cell-health-caption strong')).toContainText('79 / 80');
    await writeFile(info.outputPath('real-first-damage.json'),JSON.stringify(damaged),'utf8');
    await page.keyboard.press('Escape');await perform(page,{reason:'Ranger réellement les dix tissus dans l’étagère dédiée.',
      command:{type:'priority',pawnId:f.pawnId,work:'haul',value:1}},rotation);
    const carried=await runTo('carried'),carrier=carried.pawns.find(p=>p.id===f.pawnId)!,haul=carrier.haul!;
    expect(validateWorld(carried)).toEqual([]);
    expect(haul).toMatchObject({sourcePileId:f.pileId,quantity:NATIVE_QUANTITY,phase:'deliver'});
    expect(haul.carryPileId).not.toBeNull();expect(haul.carryPileId).not.toBe(f.pileId);
    const carryPileId=haul.carryPileId!,cargo=carried.piles.find(p=>p.id===carryPileId)!;
    expect(carried.piles.find(p=>p.id===f.pileId)).toBeUndefined();
    expect(cargo).toMatchObject({id:carryPileId,item:source.item,quantity:NATIVE_QUANTITY,damage:worn.damage,owner:{type:'pawn',pawnId:f.pawnId}});
    expect(carried.piles.filter(p=>p.item==='cloth')).toEqual([cargo]);
    expect(Math.max(Math.abs(carrier.x-f.shelfCell.x),Math.abs(carrier.z-f.shelfCell.z)),'Pause cargo before arrival at shelf.').toBeGreaterThan(1);
    expect(deteriorationExposure(carried,cargo)).toMatchObject({status:'not-ground',rate:0});
    await inspectPerson(page,f.pawnId,'gear');await expect(page.locator('#equipment-cargo')).toContainText('Tissu');
    await expect(page.locator('#equipment-cargo')).toContainText('×10');await page.screenshot({path:info.outputPath('02-new-cargo-identity-physically-carried.png')});
    const resumed=await reloadExact(page,info);
    expect(resumed).toEqual(carried);expect(resumed.pawns.find(p=>p.id===f.pawnId)!.haul).toEqual(haul);
    expect(resumed.piles.find(p=>p.id===carryPileId)).toEqual(cargo);expect(resumed.piles.find(p=>p.id===f.pileId)).toBeUndefined();
    const stored=await runTo('stored',carryPileId),protectedPile=stored.piles.find(p=>p.id===carryPileId)!;
    expect(stored.piles.find(p=>p.id===f.pileId)).toBeUndefined();
    expect(protectedPile).toMatchObject({id:carryPileId,item:source.item,quantity:NATIVE_QUANTITY,damage:worn.damage,owner:{type:'ground',...f.shelfCell}});
    expect(deteriorationExposure(stored,protectedPile)).toMatchObject({status:'protected-shelf',rate:0});
    const final=await runTo('protected-checks',carryPileId,stored.deterioration!.lastTick+2*DETERIORATION_INTERVAL);
    await writeFile(info.outputPath('final-world.json'),JSON.stringify(final),'utf8');
    expect(validateWorld(final)).toEqual([]);expect(final.piles.find(p=>p.id===carryPileId)).toEqual(protectedPile);
    expect(final.piles.find(p=>p.id===f.pileId)).toBeUndefined();
    expect(final.deterioration!.lastTick).toBe(stored.deterioration!.lastTick+2*DETERIORATION_INTERVAL);
    expect(final.deterioration!.rng).toBe(stored.deterioration!.rng);expect(final.destroyed).toEqual(initial.destroyed);
    expect(final.piles.reduce((n,p)=>n+(p.item==='cloth'?p.quantity:0),0)).toBe(NATIVE_QUANTITY);
    await inspectExposure(carryPileId,'Protégé par une étagère','0 PV/jour');await page.screenshot({path:info.outputPath('03-cargo-stock-shelf-two-normal-checks.png')});
    await page.keyboard.press('Escape');const graphics=await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident}));
    await writeFile(info.outputPath('native-summary.json'),JSON.stringify({notice:f.notice,sourcePileId:f.pileId,carryPileId,shelfId:f.shelfId,
      preparedQuantity:NATIVE_QUANTITY,carryCapacity:CARRY_CAPACITY,
      ticks:{initial:initial.tick,damaged:damaged.tick,carried:carried.tick,stored:stored.tick,final:final.tick},
      firstDamage:worn.damage,finalDamage:final.piles.find(p=>p.id===carryPileId)!.damage,finalQuantity:NATIVE_QUANTITY,
      checksAfterStorage:(final.deterioration!.lastTick-stored.deterioration!.lastTick)/DETERIORATION_INTERVAL,errors,graphics,
      scope:'One honestly declared prepared32² scene with 10 cloth within verified carrying capacity. Ordinary rare pass with initial phase/private RNG fixed before import; no live reset or accelerated wear. Real source-to-new-cargo haul, exact carried reload before shelf arrival, same cargo identity deposited, two ordinary protected checks. No endurance, other terrain, rain or performance qualification.'},null,2),'utf8');
    expect(graphics).toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});expect(errors).toEqual([]);
  }catch(error){try{await writeFile(info.outputPath('failure-world.json'),JSON.stringify(await world(page)),'utf8');}catch{/* Preserve the original import failure. */}throw error;}
});