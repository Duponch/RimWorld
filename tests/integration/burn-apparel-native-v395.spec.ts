import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {burnApparelWorkshopV395} from '../scenarios/burn-apparel-v395';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {productionWorkTotal} from '../../src/sim/production-recipes';
import {world,pause,panel,expectWorld,observeErrors,cell} from './helpers';
import {revealCells} from './player-actions';

test.skip(process.env.BURN_APPAREL_V395!=='1','ROOT opt-in before page fixture; adopt/freeze V395 first.');
async function reloadExact(page:Page,info:TestInfo){
  await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);
  await writeFile(info.outputPath('working-world.json'),JSON.stringify(before),'utf8');
  await page.keyboard.press('Escape');await panel(page,'menu');const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('V395 vêtement au poste, travail réel');
  await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath('working-exact-export.json');await(await download).saveAs(path);
  expect(deserializeWorld(await decodeStoredSave(await readFile(path,'utf8')))).toEqual(before);
  await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(path);
  await expect(page.locator('.front-menu')).toBeHidden({timeout:60_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await pause(page);await expectWorld(page,before);await page.keyboard.press('Escape');return before;
}

test('V395 prepared camp: explicit damaged-shirt filter, whole pickup/staging, exact work reload and zero-output burn',async({page},info)=>{
  test.setTimeout(120_000);const f=burnApparelWorkshopV395(32),initial=f.world,errors=observeErrors(page);
  expect(initial.schemaVersion).toBe(251);expect(validateWorld(initial)).toEqual([]);
  const source=initial.piles.find(p=>p.id===f.apparelId)!,helmet=initial.piles.find(p=>p.id===f.helmetId)!,protectedShirt=initial.piles.find(p=>p.id===f.protectedId)!;
  const station=initial.structures.find(s=>s.id===f.stationId)!,initialFuel=station.fuel!;
  expect(source).toMatchObject({quantity:1,owner:{type:'ground'},apparel:{hitPoints:35}});expect(source.apparel!.forbidden).toBeUndefined();
  expect(protectedShirt.apparel!.forbidden).toBe(true);expect(initial.pawns[0]!.priorities).toMatchObject({haul:1,cook:0});
  const initialPath=info.outputPath('declared-camp.json');await writeFile(initialPath,f.initial,'utf8');
  let billId=0;const total=productionWorkTotal('burn-apparel');
  async function inspect(){await page.keyboard.press('Escape');await revealCells(page,[station]);
    for(let i=0;i<initial.pawns.length+4;i++){await cell(page,station.x,station.z);if(await page.locator('[data-add-recipe="burn-apparel"]').isVisible())return;}
    throw Error('Real campfire inspection did not show the burn-apparel action.');}
  async function runTo(phase:'held'|'work'|'completed'){
    await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({phase,pawnId,apparelId,stationId,billId,total})=>{
      const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===pawnId),task=p?.cooking,pile=w.piles.find(p=>p.id===apparelId);
      const ready=phase==='held'?task?.recipe==='burn-apparel'&&task.ingredients.some(i=>i.pileId===apparelId&&i.stage==='held')&&pile?.owner.type==='pawn'
        :phase==='work'?task?.recipe==='burn-apparel'&&task.phase==='work'&&task.progress>0&&task.progress<total
        :!pile&&w.structures.find(s=>s.id===stationId)?.bills?.find(b=>b.id===billId)?.target===0;
      if(!ready)return false;
      // Same player pause control as the existing phase gates; no simulation write.
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },{phase,pawnId:f.pawnId,apparelId:f.apparelId,stationId:f.stationId,billId,total},{polling:20,timeout:15_000});
    await pause(page);return world(page);
  }
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(initialPath);
    await expect(front).toBeHidden({timeout:60_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
    await pause(page);await expectWorld(page,initial);await inspect();
    await page.locator('[data-add-recipe="burn-apparel"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===f.stationId)?.bills?.some(b=>b.recipe==='burn-apparel')).toBe(true);
    const added=(await world(page)).structures.find(s=>s.id===f.stationId)!.bills!.find(b=>b.recipe==='burn-apparel')!;billId=added.id;
    expect(Object.values(added.filters).every(on=>on===false)).toBe(true);expect(added.destination).toBe('drop');
    const form=page.locator(`[data-bill="${billId}"]`);await form.locator('details > summary').click();
    await expect(form.locator('[data-field="destination"]')).toHaveCount(0);await expect(form.locator('[data-field="flak-helmet"]')).toHaveCount(0);
    await expect(form.locator('[data-field="mode"] option')).toHaveCount(2);
    for(const item of Object.keys(added.filters))await expect(form.locator(`[data-field="${item}"]`)).not.toBeChecked();
    await form.locator('[data-field="cloth-shirt"]').setChecked(true);
    await form.locator('[data-field="hpMin"]').fill('0');await form.locator('[data-field="hpMax"]').fill('50');
    await form.locator('[data-field="qualityMin"]').selectOption('normal');await form.locator('[data-field="qualityMax"]').selectOption('normal');
    await form.locator(`[data-apply-bill="${billId}"]`).click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===f.stationId)!.bills!.find(b=>b.id===billId)!.smeltFilter)
      .toEqual({hpMin:0,hpMax:50,qualityMin:'normal',qualityMax:'normal'});
    const configured=await world(page);expect(configured.piles).toEqual(initial.piles);
    expect(Object.entries(configured.structures.find(s=>s.id===f.stationId)!.bills![0]!.filters).filter(([,on])=>on)).toEqual([['cloth-shirt',true]]);
    await page.screenshot({path:info.outputPath('01-explicit-shirt-filter-no-output.png')});

    const held=await runTo('held'),carried=held.piles.find(p=>p.id===f.apparelId)!;
    expect(carried).toMatchObject({id:source.id,item:source.item,quantity:1,apparel:source.apparel,owner:{type:'pawn',pawnId:f.pawnId}});
    await writeFile(info.outputPath('held-world.json'),JSON.stringify(held),'utf8');
    const working=await runTo('work'),worker=working.pawns.find(p=>p.id===f.pawnId)!,task=worker.cooking!;
    const ingredient=task.ingredients.find(i=>i.pileId===f.apparelId)!,placed=working.piles.find(p=>p.id===f.apparelId)!;
    expect(ingredient.stage).toBe('placed');expect(ingredient.quantity).toBe(1);
    expect(placed).toMatchObject({id:source.id,item:source.item,quantity:1,apparel:source.apparel,owner:{type:'ground',...ingredient.cell}});
    expect([worker.x,worker.z]).toEqual([task.spot.x,task.spot.z]);expect(worker.motion?.end??0).toBeLessThanOrEqual(working.tick);expect(worker.moveCooldown).toBe(0);
    expect(task.productId).toBeNull();expect(task.storageId).toBeNull();expect(task.progress).toBeGreaterThan(0);expect(task.progress).toBeLessThan(total);
    await inspect();await page.screenshot({path:info.outputPath('02-real-work-whole-shirt-at-campfire.png')});
    const resumed=await reloadExact(page,info);expect(resumed.pawns.find(p=>p.id===f.pawnId)!.cooking).toEqual(task);
    const final=await runTo('completed');await writeFile(info.outputPath('final-world.json'),JSON.stringify(final),'utf8');
    expect(validateWorld(final)).toEqual([]);expect(final.piles.find(p=>p.id===f.helmetId)).toEqual(helmet);expect(final.piles.find(p=>p.id===f.protectedId)).toEqual(protectedShirt);
    expect(final.piles.map(p=>p.id).sort((a,b)=>a-b)).toEqual(initial.piles.filter(p=>p.id!==f.apparelId).map(p=>p.id).sort((a,b)=>a-b));
    expect(final.pawns.find(p=>p.id===f.pawnId)!.cooking).toBeNull();
    expect(final.destroyed?.items?.['cloth-shirt']??0).toBe((initial.destroyed?.items?.['cloth-shirt']??0)+1);
    const fuel=final.structures.find(s=>s.id===f.stationId)!.fuel!;
    expect(fuel.ticks).toBeLessThan(initialFuel.ticks);expect(fuel.ticks+fuel.burned).toBe(initialFuel.ticks+initialFuel.burned);
    await inspect();await expect(page.locator(`[data-bill="${billId}"] [data-field="target"]`)).toHaveValue('0');
    await page.screenshot({path:info.outputPath('03-completed-one-garment-no-output.png')});
    const graphics=await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident}));
    await writeFile(info.outputPath('native-summary.json'),JSON.stringify({notice:f.notice,stationId:f.stationId,billId,apparelId:f.apparelId,
      helmetId:f.helmetId,protectedId:f.protectedId,ticks:{initial:initial.tick,held:held.tick,work:working.tick,final:final.tick},
      workAtReload:task.progress,totalWork:total,destroyedShirts:final.destroyed?.items?.['cloth-shirt'],fuel,errors,graphics,
      scope:'One declared prepared32² camp. Real UI bill, explicit HP/quality filters, one original garment carried and staged, exact work reload, destruction without output. No natural acquisition, electric power variant, fuel endurance or performance claim.'},null,2),'utf8');
    expect(graphics).toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});expect(errors).toEqual([]);
  }catch(error){try{await writeFile(info.outputPath('failure-world.json'),JSON.stringify(await world(page)),'utf8');}catch{/* Preserve original import failure. */}throw error;}
});
