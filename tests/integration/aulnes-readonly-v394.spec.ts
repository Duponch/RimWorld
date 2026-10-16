import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {SCHEMA_VERSION,type World,type Structure} from '../../src/sim/types';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {world,pause,panel,expectWorld,observeErrors,cell} from './helpers';
import {revealCells} from './player-actions';

// Gate before Playwright asks for a page. The normal integration run stays opt-in.
test.skip(process.env.AULNES_V394_READONLY!=='1','ROOT opt-in: inspect the actual V394 checkpoint without resuming time.');
const digest=(raw:string)=>createHash('sha256').update(raw).digest('hex');
const parentSha='dfd9302647b4d1cabaa8760a150209c6804a788f48a0b0596660318b4d1707ee';

// Reused V386 pointer path, without any production, assignment or apparel order.
async function inspectStation(page:Page,w:World,s:Structure,billId:number){
  await page.keyboard.press('Escape');await revealCells(page,[s]);
  for(let i=0;i<w.pawns.length+5;i++){
    await cell(page,s.x,s.z);
    if(await page.locator(`[data-bill="${billId}"]`).isVisible())return;
  }
  throw Error(`Station ${s.id}, bill ${billId}: real pointer inspection did not reveal the bill.`);
}
async function exportReload(page:Page,info:TestInfo){
  await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);
  await page.keyboard.press('Escape');await panel(page,'menu');
  const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('Les Aulnes V394 · lecture seule');
  await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');
  await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath('aulnes-v394-exact-export.json');await(await download).saveAs(path);
  const encoded=await readFile(path,'utf8'),raw=await decodeStoredSave(encoded);
  expect(deserializeWorld(raw)).toEqual(before);
  await page.locator('#browse-saves').click();
  await page.locator('.front-menu input[type=file]').setInputFiles(path);
  await expect(page.locator('.front-menu')).toBeHidden({timeout:60_000});
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await pause(page);await expectWorld(page,before);await page.keyboard.press('Escape');
  await info.attach('exact-export',{path,contentType:'application/json'});
  return {path,encodedSha256:digest(encoded),rawSha256:digest(raw)};
}

test('V394 actual Aulnes: read-only shared filters and real manual bill, exact export reload',async({page},info)=>{
  test.setTimeout(120_000);
  const input=process.env.AULNES_V394_CHECKPOINT,expectedSha=process.env.AULNES_V394_RAW_SHA;
  if(!input||!expectedSha||!/^[a-f\d]{64}$/i.test(expectedSha))
    throw Error('ROOT must provide AULNES_V394_CHECKPOINT and its exact 64-digit AULNES_V394_RAW_SHA.');
  const inputPath=resolve(input),stored=await readFile(inputPath,'utf8'),raw=await decodeStoredSave(stored);
  expect(digest(raw)).toBe(expectedSha.toLowerCase());
  const initial=deserializeWorld(raw);expect(validateWorld(initial)).toEqual([]);
  expect(initial.schemaVersion).toBe(SCHEMA_VERSION);expect([initial.width,initial.height]).toEqual([250,250]);
  expect(initial.tick).toBeGreaterThanOrEqual(10373);expect(initial.tick).toBeLessThanOrEqual(10733);
  const archivePath=resolve('public/test-saves/v386/les-aulnes-integrees.json');
  const archiveRaw=await decodeStoredSave(await readFile(archivePath,'utf8'));
  expect(digest(archiveRaw)).toBe(parentSha);
  // Read the immutable historical data only; do not rerun a producer or mutate it.
  const historical=JSON.parse(archiveRaw) as World;
  const previous=historical.apparelPolicies!.find(p=>p.id===4)!;expect(previous).toBeDefined();
  expect(previous.allowedItems).not.toContain('muffalo-wool-tuque');
  const expectedPolicy={...previous,allowedItems:[...previous.allowedItems,'muffalo-wool-tuque']};
  const policy=initial.apparelPolicies!.find(p=>p.id===4)!;expect(policy).toEqual(expectedPolicy);
  for(const id of [19871,20337])expect(initial.pawns.find(p=>p.id===id)).toMatchObject({apparelPolicyId:4,apparelAutomation:true});
  const bench=initial.structures.find(s=>s.id===20988&&s.kind==='tailor-bench')!;expect(bench).toBeDefined();
  const bill=bench.bills!.find(b=>b.id===26682)!;expect(bill).toBeDefined();
  expect(bill).toMatchObject({recipe:'tuque',mode:'times',filters:{cloth:false,'muffalo-wool':true},radius:32,destination:'stockpile'});
  const errors=observeErrors(page);
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.locator('input[type=file]').setInputFiles(inputPath);
    await expect(front).toBeHidden({timeout:60_000});
    await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
    await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60_000});
    await pause(page);await expectWorld(page,initial);

    await panel(page,'assign');await page.locator('#manage-apparel-policies').click();
    const dialog=page.locator('#apparel-policy-dialog');await expect(dialog).toBeVisible();
    await dialog.locator('#apparel-policy-choice').selectOption('4');
    await expect(dialog.locator('#apparel-policy-choice option:checked')).toHaveText(policy.label);
    const checks=await dialog.locator('[data-apparel-allowed-item],[data-apparel-allowed-material]').evaluateAll(nodes=>nodes.map(node=>{
      const input=node as HTMLInputElement;
      return {item:input.dataset.apparelAllowedItem,material:input.dataset.apparelAllowedMaterial,checked:input.checked};
    }));
    expect(checks.filter(c=>c.item).length).toBeGreaterThan(0);expect(checks.filter(c=>c.material).length).toBeGreaterThan(0);
    for(const check of checks){
      if(check.item)expect(check.checked,check.item).toBe(expectedPolicy.allowedItems.some(id=>id===check.item));
      if(check.material)expect(check.checked,check.material).toBe(policy.allowedMaterials.some(id=>id===check.material));
    }
    await expect(dialog.locator('[data-apparel-allowed-item="muffalo-wool-tuque"]')).toBeChecked();
    await expect(dialog.locator('#apparel-min-quality')).toHaveValue(policy.minQuality);
    await expect(dialog.locator('#apparel-max-quality')).toHaveValue(policy.maxQuality);
    await expect(dialog.locator('#apparel-min-hp')).toHaveValue(String(policy.minHitPointsPercent*100));
    await expect(dialog.locator('#apparel-max-hp')).toHaveValue(String(policy.maxHitPointsPercent*100));
    for(const id of [19871,20337])await expect(dialog.locator('#apparel-policy-users')).toContainText(initial.pawns.find(p=>p.id===id)!.name);
    await dialog.locator('[data-apparel-allowed-item="muffalo-wool-tuque"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('01-policy-four-wool-tuque-confirmed.png')});
    await dialog.locator('#close-apparel-policies').click();await page.keyboard.press('Escape');
    await expectWorld(page,initial);

    await inspectStation(page,initial,bench,bill.id);
    const form=page.locator(`[data-bill="${bill.id}"]`);await expect(form).toBeVisible();
    await expect(form.locator('[data-field="mode"]')).toHaveValue(bill.mode);
    await expect(form.locator('[data-field="target"]')).toHaveValue(String(bill.target));
    if(bill.suspended)await expect(form.locator('[data-field="suspended"]')).toBeChecked();
    else await expect(form.locator('[data-field="suspended"]')).not.toBeChecked();
    if(!await form.locator('details').evaluate(node=>(node as HTMLDetailsElement).open))await form.locator('details > summary').click();
    await expect(form.locator('[data-field="muffalo-wool"]')).toBeChecked();
    await expect(form.locator('[data-field="cloth"]')).not.toBeChecked();
    await expect(form.locator('[data-field="radius"]')).toHaveValue(String(bill.radius));
    await expect(form.locator('[data-field="destination"]')).toHaveValue(bill.destination);
    const billReason=await page.locator(`[data-bill-reason="${bill.id}"]`).textContent();
    expect(billReason).toContain('Production : tuque');expect(billReason).not.toContain('repas simple');
    await page.screenshot({path:info.outputPath('02-manual-workshop-actual-bill.png')});
    await expectWorld(page,initial);
    // Preserve the full observed state before the final export/device assertions.
    await writeFile(info.outputPath('observed-world.json'),JSON.stringify(await world(page)),'utf8');
    const exported=await exportReload(page,info);await expectWorld(page,initial);
    const graphics=await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident}));
    await writeFile(info.outputPath('native-summary.json'),JSON.stringify({inputPath,inputRawSha256:digest(raw),parentRawSha256:parentSha,
      tick:initial.tick,schema:initial.schemaVersion,size:[250,250],readOnly:true,policyId:4,stationId:bench.id,billId:bill.id,
      billRemaining:bill.target,billReason,tuques:initial.piles.filter(p=>p.item==='muffalo-wool-tuque').map(p=>({id:p.id,owner:p.owner})),
      exported,graphics,errors},null,2),'utf8');
    expect(graphics).toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});
    expect(errors).toEqual([]);
  }catch(error){
    try{await writeFile(info.outputPath('failure-world.json'),JSON.stringify(await world(page)),'utf8');}catch{/* Preserve the original failure if import did not finish. */}
    throw error;
  }
});
