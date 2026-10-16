import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {foodReadabilityWorkshopV393} from '../scenarios/food-readability-v393';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';

test.skip(process.env.FOOD_READABILITY_V393!=='1','ROOT opt-in only: adopt/freeze V393 first.');
async function guide(page:Page,open:boolean){const shell=page.locator('.learning-readout');if(await shell.evaluate(n=>(n as HTMLDetailsElement).open)!==open)await shell.locator(':scope > summary').click();if(open){const row=page.locator('[data-first-day-section="food"]');if(!await row.evaluate(n=>(n as HTMLDetailsElement).open))await row.locator(':scope > summary').click();}}
async function stop(page:Page){await page.keyboard.press('Escape');await pause(page);}
async function exportReload(page:Page,info:TestInfo){
  await guide(page,false);await stop(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);await panel(page,'menu');
  const manager=page.locator('[data-save-manager]');await manager.locator('[data-save-manager-name]').fill('V393 vrai repas engagé après régime corrigé');await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');const pending=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const file=info.outputPath('real-ingestion-exact.json');await(await pending).saveAs(file);expect(deserializeWorld(await decodeStoredSave(await readFile(file,'utf8')))).toEqual(before);
  await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(file);await expect(page.locator('.front-menu')).toBeHidden({timeout:30_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await stop(page);await expectWorld(page,before);await info.attach('real-ingestion-exact',{path:file,contentType:'application/json'});return before;
}

test('V393 forbidden abundant stock → actual Assignations correction → finding removed → owned meal and exact reload',async({page},info)=>{
  test.setTimeout(120_000);const errors=observeErrors(page),f=foodReadabilityWorkshopV393(),file=info.outputPath('declared-food-readability-preparation.json');await writeFile(file,f.initial);
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(file);
    await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await stop(page);await expectWorld(page,f.world);
    const alert=page.locator('[data-alert="food-policy-blocked"]'),foodRow=page.locator('[data-first-day-section="food"]');await expect(alert).toBeVisible();await expect(page.locator('#food')).toHaveText('18.0');
    expect(await page.locator('#food').evaluate(n=>n.previousElementSibling?.textContent)).toBe('Stock physique');
    await guide(page,true);await expect(foodRow).toHaveAttribute('data-status','started');await expect(foodRow).toContainText('régime(s) sans type autorisé constaté');await expect(foodRow).toContainText('ne garantit ni accès');
    await page.screenshot({path:info.outputPath('01-abundant-stock-and-real-policy-finding.png')});await guide(page,false);await alert.click();await expect(page.locator('#assign-panel')).toBeVisible();
    const assignment=page.locator(`[data-assignment-pawn="${f.pawnId}"] .policy-status`);await expect(assignment).toContainText('Aucun aliment autorisé parmi les piles fraîches');
    await page.locator('#manage-food-policies').click();await expect(page.locator('#food-policy-dialog')).toBeVisible();await page.locator('#food-policy-choice').selectOption(String(f.policyId));
    await page.locator('[data-allowed-food="survival-meal"]').check();await page.locator('#apply-food-policy').click();await expect(page.locator('#food-policy-feedback')).toContainText('Régime appliqué');
    await page.locator('#close-food-policies').click();await expect(alert).toHaveCount(0);await expect(assignment).not.toContainText('Aucun aliment autorisé parmi les piles fraîches');
    const corrected=await world(page);await writeFile(info.outputPath('corrected-world.json'),JSON.stringify(corrected));expect(corrected.tick).toBe(f.world.tick);expect(corrected.piles).toEqual(f.world.piles);expect(corrected.pawns[0]!.hunger).toBe(f.world.pawns[0]!.hunger);expect(corrected.pawns[0]!.need).toBeNull();
    await page.keyboard.press('Escape');await guide(page,true);await expect(foodRow).toHaveAttribute('data-status','ready');await expect(foodRow).toContainText('type autorisé parmi les piles examinées');expect((await world(page)).tick).toBe(corrected.tick);await guide(page,false);
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id);return p?.need?.kind==='eat'&&p.need.phase==='ingest'&&p.need.progress>0;},f.pawnId,{polling:20,timeout:15_000});await stop(page);
    const ingest=await world(page);await writeFile(info.outputPath('engaged-world.json'),JSON.stringify(ingest));const eater=ingest.pawns.find(p=>p.id===f.pawnId)!;
    if(eater.need?.kind!=='eat')throw Error('Le vrai repas a quitté sa fenêtre d’ingestion.');const task=eater.need,cargo=ingest.piles.find(p=>p.id===task.carryPileId)!;
    expect(task.sourcePileId).toBe(f.pileId);expect(task.quantity).toBe(1);expect(cargo).toMatchObject({item:'survival-meal',quantity:1,owner:{type:'pawn',pawnId:f.pawnId}});expect(eater.moveCooldown).toBe(0);expect(eater.motion?.end??0).toBeLessThanOrEqual(ingest.tick);
    await guide(page,true);await expect(foodRow).not.toHaveAttribute('data-status','ready');await expect(foodRow).toContainText('repas engagé(s) conservé(s)');await page.screenshot({path:info.outputPath('02-real-owned-meal-still-engaged.png')});
    const resumed=await exportReload(page,info);expect(resumed.pawns.find(p=>p.id===f.pawnId)!.need).toEqual(task);
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(id=>!window.__lisiere.world.pawns.find(p=>p.id===id)?.need,f.pawnId,{timeout:10_000});await stop(page);
    const final=await world(page);await writeFile(info.outputPath('final-world.json'),JSON.stringify(final));expect(final.piles.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0)).toBe(19);expect(final.piles.some(p=>p.id===cargo.id)).toBe(false);expect(final.pawns.find(p=>p.id===f.pawnId)!.hunger).toBeGreaterThan(corrected.pawns[0]!.hunger);
    expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);await expect(alert).toHaveCount(0);await guide(page,true);await page.screenshot({path:info.outputPath('03-real-meal-completed-finite-stock.png')});
    expect(await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident}))).toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});
    await writeFile(info.outputPath('native-summary.json'),JSON.stringify({notice:f.notice,start:f.world.tick,correctedAt:corrected.tick,ingestingAt:ingest.tick,reloadedAt:resumed.tick,completedAt:final.tick,pawnId:f.pawnId,sourceId:f.pileId,cargoId:cargo.id,consumed:1,remaining:19,errors,scope:'One prepared32² finite scene, real policy UI correction while paused, type-compatibility finding removed at the same tick, real pickup/contact/ingestion and exact engaged-meal reload. No post-import World writes, automatic availability promise, natural production, paste-access or performance qualification.'},null,2));
  }catch(error){const failed=await world(page).catch(()=>undefined);if(failed)await writeFile(info.outputPath('failure-world.json'),JSON.stringify(failed));throw error;}
});
