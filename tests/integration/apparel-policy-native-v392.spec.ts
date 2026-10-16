import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {apparelPolicyWorkshopV392} from '../scenarios/apparel-policy-v392';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {APPAREL,APPAREL_MATERIALS,type ApparelItem} from '../../src/sim/apparel-rules';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
import {inspectPerson} from './player-actions';

test.skip(process.env.APPAREL_POLICY_V392!=='1','ROOT opt-in only: adopt/freeze V392 first.');
async function stop(page:Page){await page.keyboard.press('Escape');await pause(page);}
async function exportReload(page:Page,info:TestInfo){
  await stop(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);await panel(page,'menu');
  const manager=page.locator('[data-save-manager]');await manager.locator('[data-save-manager-name]').fill('V392 filtres confirmés et trajet automatique');
  await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const pending=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const file=info.outputPath('automatic-wear-route-exact.json');await(await pending).saveAs(file);
  expect(deserializeWorld(await decodeStoredSave(await readFile(file,'utf8')))).toEqual(before);
  await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(file);
  await expect(page.locator('.front-menu')).toBeHidden({timeout:30_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await stop(page);await expectWorld(page,before);await info.attach('automatic-wear-route-exact',{path:file,contentType:'application/json'});return before;
}

test('V392 actual shared outfit filters, unchanged owners/Auto/forced, then due physical wear with exact reload',async({page},info)=>{
  test.setTimeout(120_000);const errors=observeErrors(page),f=apparelPolicyWorkshopV392();
  const initialTuque=f.world.piles.find(p=>p.id===f.tuqueId)!,initialHelmet=f.world.piles.find(p=>p.id===f.helmetId)!,initialShirt=f.world.piles.find(p=>p.id===f.shirtId)!;
  const file=info.outputPath('declared-apparel-policy-preparation.json');await writeFile(file,f.initial);
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(file);
    await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await stop(page);await expectWorld(page,f.world);await panel(page,'assign');
    const auto=page.locator(`[data-apparel-automation-pawn="${f.pawnId}"]`),otherAuto=page.locator(`[data-apparel-automation-pawn="${f.otherId}"]`);
    await expect(auto).toBeChecked();await expect(otherAuto).not.toBeChecked();await page.locator('#manage-apparel-policies').click();
    const dialog=page.locator('#apparel-policy-dialog');await expect(dialog).toBeVisible();await expect(page.locator('#apparel-policy-choice')).toHaveValue(String(f.policyId));
    for(const p of f.world.pawns)await expect(page.locator('#apparel-policy-users')).toContainText(p.name);
    const tuqueCheck=page.locator('[data-apparel-allowed-item="muffalo-wool-tuque"]');await expect(tuqueCheck).not.toBeChecked();await tuqueCheck.check();
    await page.locator('[data-apparel-allowed-material="muffalo-wool"]').check();
    await page.locator('#apparel-min-quality').selectOption('normal');await page.locator('#apparel-max-quality').selectOption('good');
    await page.locator('#apparel-min-hp').fill('51');await page.locator('#apparel-max-hp').fill('100');
    expect(await world(page)).toEqual(f.world);const before=await world(page);await page.locator('#apply-apparel-policy').click();
    await expect(page.locator('#apparel-policy-feedback')).toContainText('Politique appliquée');const applied=await world(page);await writeFile(info.outputPath('applied-world.json'),JSON.stringify(applied));
    // Oracle clone only: no live World mutation or calendar wake-up is used.
    const expected=structuredClone(before),old=expected.apparelPolicies!.find(p=>p.id===f.policyId)!;
    expected.apparelPolicies=expected.apparelPolicies!.map(p=>p.id!==f.policyId?p:{...old,allowedItems:(Object.keys(APPAREL) as ApparelItem[]).filter(id=>id==='cloth-shirt'||id==='muffalo-wool-tuque'),allowedMaterials:APPAREL_MATERIALS.filter(id=>id==='cloth'||id==='muffalo-wool'),minQuality:'normal',maxQuality:'good',minHitPointsPercent:.51,maxHitPointsPercent:1});
    expect(applied).toEqual(expected);expect(applied.pawns.find(p=>p.id===f.pawnId)!.nextApparelCheckAt).toBe(f.dueAt);
    await expect(auto).toBeChecked();await expect(otherAuto).not.toBeChecked();await expect(page.locator(`[data-apparel-clear-forced-pawn="${f.otherId}"]`)).toBeVisible();
    await page.screenshot({path:info.outputPath('01-shared-filters-confirmed-no-physical-change.png')});
    await page.locator('#close-apparel-policies').click();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({pawnId,itemId})=>{const p=window.__lisiere.world.pawns.find(p=>p.id===pawnId);return p?.equipmentTask?.automatic===true&&p.equipmentTask.action==='wear'&&p.equipmentTask.itemId===itemId;},{pawnId:f.pawnId,itemId:f.tuqueId},{polling:20,timeout:15_000});await stop(page);
    const walking=await world(page);await writeFile(info.outputPath('automatic-route-world.json'),JSON.stringify(walking));
    expect(walking.tick).toBeGreaterThanOrEqual(f.dueAt);expect(walking.pawns.find(p=>p.id===f.pawnId)!.equipmentTask).toMatchObject({itemId:f.tuqueId,action:'wear',automatic:true});
    expect(walking.piles.find(p=>p.id===f.tuqueId)!.owner).toEqual(initialTuque.owner);expect(walking.piles.find(p=>p.id===f.helmetId)).toEqual(initialHelmet);
    const resumed=await exportReload(page,info);expect(resumed.pawns.find(p=>p.id===f.pawnId)!.equipmentTask).toEqual(walking.pawns.find(p=>p.id===f.pawnId)!.equipmentTask);
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(id=>window.__lisiere.world.piles.find(p=>p.id===id)?.owner.type==='apparel',f.tuqueId,{timeout:15_000});await stop(page);
    const final=await world(page);await writeFile(info.outputPath('final-world.json'),JSON.stringify(final));const pawn=final.pawns.find(p=>p.id===f.pawnId)!,tuque=final.piles.find(p=>p.id===f.tuqueId)!;
    expect(tuque.owner).toEqual({type:'apparel',pawnId:f.pawnId});expect(tuque.apparel).toEqual(initialTuque.apparel);expect(tuque.apparel!.forced).toBeUndefined();
    expect(Math.abs(pawn.x-f.storage.x)+Math.abs(pawn.z-f.storage.z)).toBeLessThanOrEqual(1);expect(pawn.moveCooldown).toBe(0);expect(pawn.motion?.end??0).toBeLessThanOrEqual(final.tick);
    expect(final.piles.find(p=>p.id===f.shirtId)).toEqual(initialShirt);expect(final.piles.find(p=>p.id===f.helmetId)).toEqual(initialHelmet);expect(final.piles).toHaveLength(f.world.piles.length);
    expect(pawn.apparelAutomation).toBe(true);expect(final.pawns.find(p=>p.id===f.otherId)!.apparelAutomation).toBe(false);expect(final.apparelPolicies).toEqual(applied.apparelPolicies);
    expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);await inspectPerson(page,f.pawnId,'gear');
    await expect(page.locator(`[data-apparel-information="${f.tuqueId}"]`)).toBeVisible();await expect(page.locator(`[data-apparel-forced="${f.tuqueId}"]`)).toHaveCount(0);
    await page.screenshot({path:info.outputPath('02-policy-tuque-worn-after-real-route-and-contact.png')});
    expect(await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident}))).toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});
    await writeFile(info.outputPath('native-summary.json'),JSON.stringify({notice:f.notice,appliedAt:applied.tick,dueAt:f.dueAt,walkingAt:walking.tick,reloadedAt:resumed.tick,wornAt:final.tick,pawnId:f.pawnId,otherId:f.otherId,policyId:f.policyId,tuqueId:f.tuqueId,helmetId:f.helmetId,errors,scope:'One prepared32² V388-derived fixture, actual filter edit with exact metadata-only conservation, existing deadline, real automatic route/contact and exact in-route reload. No live World writes, immediate wear gift, natural crafting, inactive-map UI journey or performance qualification.'},null,2));
  }catch(error){const failed=await world(page).catch(()=>undefined);if(failed)await writeFile(info.outputPath('failure-world.json'),JSON.stringify(failed));throw error;}
});
