import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {reservedSource} from '../../src/sim/materials';
import {storageAt,storageCellAccepts} from '../../src/sim/shelf-storage';
import {equipmentOrderReason} from '../../src/sim/equipment';
import {apparelInsulation} from '../../src/sim/apparel-rules';
import type {World,Structure} from '../../src/sim/types';
import {world,pause,panel,expectWorld,observeErrors,cell} from './helpers';
import {perform,revealCells,inspectPerson} from './player-actions';

test.skip(process.env.AULNES_V386!=='1','ROOT opt-in before any page fixture; import the actual V386 private checkpoint.');
const digest=(raw:string)=>createHash('sha256').update(raw).digest('hex');
async function inspectStation(page:Page,w:World,s:Structure,billId:number){
  await page.keyboard.press('Escape');await revealCells(page,[s]);
  for(let i=0;i<w.pawns.length+5;i++){
    await cell(page,s.x,s.z);if(await page.locator(`[data-bill="${billId}"]`).isVisible())return;
  }
  throw Error(`Station ${s.id} bill ${billId} did not become visible through pointer selection.`);
}
async function exportReload(page:Page,info:TestInfo,name:string){
  await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);
  await page.keyboard.press('Escape');await panel(page,'menu');const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('Les Aulnes V386 · '+name);
  await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath(name+'.json');await(await download).saveAs(path);
  const exported=await readFile(path,'utf8');expect(deserializeWorld(await decodeStoredSave(exported))).toEqual(before);
  await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(path);
  await expect(page.locator('.front-menu')).toBeHidden({timeout:60_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await pause(page);await expectWorld(page,before);await page.keyboard.press('Escape');
  await info.attach(name,{path,contentType:'application/json'});return {world:before,path,sha256:digest(exported)};
}

test('V386 actual Aulnes checkpoint: wool bill, honest partial state or two manual wear orders, exact full export reload',async({page},info)=>{
  test.setTimeout(150_000);const input=process.env.AULNES_V386_CHECKPOINT;
  if(!input)throw Error('AULNES_V386_CHECKPOINT must name the actual encoded checkpoint produced by ROOT.');
  const inputPath=resolve(input),stored=await readFile(inputPath,'utf8'),raw=await decodeStoredSave(stored),initial=deserializeWorld(raw);
  expect(digest(raw)).toBe(process.env.AULNES_V386_RAW_SHA??'4a92ca20379ca217772186f852223c6daae707691d9aaafeffc6b45a2492bd75');
  expect(initial.schemaVersion).toBe(246);expect([initial.width,initial.height]).toEqual([250,250]);expect(initial.tick).toBeGreaterThanOrEqual(8794);
  expect(validateWorld(initial)).toEqual([]);const errors=observeErrors(page),rotation={value:0};
  const bench=initial.structures.find(s=>s.id===20988&&s.kind==='tailor-bench')!,electric=initial.structures.find(s=>s.id===20987)!;
  const bill=bench.bills!.find(b=>b.recipe==='tuque')!;expect(bill).toBeDefined();
  expect(bill).toMatchObject({mode:'times',filters:{cloth:false,'muffalo-wool':true},radius:32,destination:'stockpile'});
  const helmets=initial.piles.filter(p=>p.owner.type==='apparel'&&['flak-helmet','recon-helmet'].includes(p.item)).map(p=>({id:p.id,item:p.item,owner:p.owner}));
  const available=(w:World)=>w.piles.filter(p=>{
    if(p.item!=='muffalo-wool-tuque'||p.owner.type!=='ground'||reservedSource(w,p.id)>0)return false;
    const s=storageAt(w,p.owner);return !!s&&storageCellAccepts(w,s,p);
  }).sort((a,b)=>a.id-b.id);
  const inspectOnly=process.env.AULNES_V386_INSPECT_ONLY==='1';
  const recipientIds=[19871,20337],tickStop=initial.tick+1200;
  await page.goto('/?e2e');const front=page.locator('.front-menu');
  await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(inputPath);
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60_000});
  await pause(page);await expectWorld(page,initial);

  await inspectStation(page,initial,electric,electric.bills![0]!.id);
  await expect(page.locator(`[data-bill="${electric.bills![0]!.id}"]`)).toBeVisible();
  await inspectStation(page,initial,bench,bill.id);const form=page.locator(`[data-bill="${bill.id}"]`);
  await expect(form.locator('[data-field="target"]')).toHaveValue(String(bill.target));
  await form.locator('details > summary').click();
  await expect(form.locator('[data-field="muffalo-wool"]')).toBeChecked();await expect(form.locator('[data-field="cloth"]')).not.toBeChecked();
  await expect(form.locator('[data-field="destination"]')).toHaveValue('stockpile');
  const reasonAtImport=await page.locator(`[data-bill-reason="${bill.id}"]`).textContent();
  await page.screenshot({path:info.outputPath('01-atelier-actual-wool-bill.png')});
  let productionStop=inspectOnly?'read-only-preserved-checkpoint':'two-products-already-available';
  if(available(initial).length<2&&!inspectOnly){
    // Explicit ROOT-authorized reassignment of this real pickup (no cargo yet).
    // Salomé, Ada and Sacha retain their paid production and carried materials.
    const marin=initial.pawns.find(p=>p.id===20352)!;
    expect(marin.haul).toMatchObject({sourcePileId:26496,quantity:10,phase:'pickup',carryPileId:null});
    expect(marin.hunger).toBeGreaterThan(30);expect(marin.rest).toBeGreaterThan(30);
    const uranium=initial.piles.find(p=>p.id===26496)!,reserved=reservedSource(initial,uranium.id);
    await page.keyboard.press('Escape');await perform(page,{reason:'Marin est réaffectée normalement de sa prise encore vide vers la confection.',command:{type:'priority',pawnId:20352,work:'craft',value:1}},rotation);
    await page.keyboard.press('Escape');await perform(page,{reason:'Prioriser réellement la facture de deux tuques au poste manuel.',command:{type:'order-cook',pawnId:20352,structureId:20988,queue:false}},rotation);
    await page.keyboard.press('Escape');const reassigned=await world(page);
    expect(reassigned.piles).toEqual(initial.piles);expect(reassigned.piles.find(p=>p.id===26496)).toEqual(uranium);
    expect(reservedSource(reassigned,26496)).toBe(reserved-10);
    for(const id of [19869,20325,20343])expect(reassigned.pawns.find(p=>p.id===id)!.cooking).toEqual(initial.pawns.find(p=>p.id===id)!.cooking);
    expect(reassigned.pawns.find(p=>p.id===20352)!.cooking?.stationId).toBe(20988);
    await page.locator('[data-speed="6"]').click();const until=Date.now()+45_000;productionStop='short-window';
    while(Date.now()<until){
      const sample=await world(page),p=sample.pawns.find(p=>p.id===20352)!;
      if(available(sample).length>=2){productionStop='two-products-stored';break;}
      // Leave a worker-batch margin before the global1200tick ceiling.
      if(sample.tick>=tickStop-64){productionStop='tick-bound';break;}
      if(p.need||p.state==='downed'||p.state==='dead'||p.collapsePending||p.mental?.crisis||p.burning||p.hunger<=30||p.rest<=20){productionStop='need-or-danger';break;}
      await page.waitForTimeout(150);
    }
    await pause(page);
  }
  const assignmentSource=await world(page),eligible=available(assignmentSource);
  await inspectStation(page,assignmentSource,assignmentSource.structures.find(s=>s.id===20988)!,bill.id);
  const reasonAtDecision=await page.locator(`[data-bill-reason="${bill.id}"]`).textContent();
  await page.screenshot({path:info.outputPath('02-production-actual-state.png')});
  const unfinishedAtDecision=assignmentSource.piles.filter(p=>p.unfinished?.billId===bill.id).map(p=>({id:p.id,owner:p.owner,work:p.unfinished}));
  const assignments=eligible.length>=2?recipientIds.map((id,i)=>{
    const p=assignmentSource.pawns.find(p=>p.id===id);if(!p)throw Error('Historic recipient missing: '+id);
    return {pawnId:id,name:p.name,itemId:eligible[i]!.id,quality:eligible[i]!.apparel!.quality,reason:equipmentOrderReason(assignmentSource,p,eligible[i],'wear')??null};
  }):[];
  const canOrder=!inspectOnly&&assignments.length===2&&assignments.every(a=>a.reason===null)&&assignmentSource.tick<tickStop-64&&productionStop!=='need-or-danger';
  const ordered:{pawnId:number;itemId:number;tick:number}[]=[];
  let outcome:'two-real-tuques-worn'|'partial-no-two-free-products'|'partial-recipient-refusal'|'partial-window-or-need'|'partial-wear-not-finished'=canOrder?'partial-wear-not-finished':eligible.length<2?'partial-no-two-free-products':assignments.some(a=>a.reason!==null)?'partial-recipient-refusal':'partial-window-or-need';
  if(canOrder){
    for(const a of assignments){
      await pause(page);await perform(page,{reason:`${a.name} enfile une tuque réellement produite, sans changer sa politique.`,command:{type:'order-equipment',pawnId:a.pawnId,itemId:a.itemId,action:'wear',queue:false}},rotation);
      ordered.push({pawnId:a.pawnId,itemId:a.itemId,tick:(await world(page)).tick});await page.keyboard.press('Escape');
    }
    await page.locator('[data-speed="6"]').click();
    const until=Date.now()+30_000;
    // Bounded observation, never an injected success or an automatic replay.
    while(Date.now()<until){
      const sample=await world(page);
      if(assignments.every(a=>sample.piles.some(p=>p.id===a.itemId&&p.owner.type==='apparel'&&p.owner.pawnId===a.pawnId))){outcome='two-real-tuques-worn';break;}
      if(sample.tick>=tickStop-64||assignments.some(a=>{const p=sample.pawns.find(p=>p.id===a.pawnId)!;return !!p.need||p.state==='downed'||p.state==='dead'||p.collapsePending||!!p.mental?.crisis||!!p.burning;}))break;
      await page.waitForTimeout(150);
    }
    await pause(page);
    for(const a of assignments){
      await inspectPerson(page,a.pawnId,'gear');const current=await world(page),piece=current.piles.find(p=>p.id===a.itemId)!;
      if(piece.owner.type==='apparel'&&piece.owner.pawnId===a.pawnId){
        const row=page.locator('.equipment-apparel-row').filter({has:page.locator(`[data-apparel-information="${a.itemId}"]`)});
        await expect(row).toContainText('Tuque');const insulation=apparelInsulation(piece);await row.locator('.equipment-apparel-line').hover();
        await expect(page.locator('#game-tooltip')).toContainText(`Isolation froid ${insulation.cold.toFixed(1)} °C`);
        expect(piece.apparel!.quality).toBe(a.quality);
      }
      await page.screenshot({path:info.outputPath(`recipient-${a.pawnId}-actual-gear.png`)});
    }
  }else{
    for(const id of recipientIds){await inspectPerson(page,id,'gear');await expect(page.locator('#inspector')).toHaveAttribute('data-colonist-inspector-pawn',String(id));
      await page.screenshot({path:info.outputPath(`partial-recipient-${id}-actual-gear.png`)});}
    await expectWorld(page,assignmentSource);
  }
  const beforeExport=await world(page);
  expect(beforeExport.tick-initial.tick).toBeLessThanOrEqual(1200);
  for(const h of helmets)expect(beforeExport.piles.find(p=>p.id===h.id)).toMatchObject(h);
  expect(beforeExport.apparelPolicies).toEqual(initial.apparelPolicies);
  for(const id of recipientIds){const before=initial.pawns.find(p=>p.id===id)!,after=beforeExport.pawns.find(p=>p.id===id)!;
    expect(after.apparelPolicyId).toBe(before.apparelPolicyId);expect(after.apparelAutomation).toBe(before.apparelAutomation);}
  const exported=await exportReload(page,info,'aulnes-v386-actual-state-exact');
  expect(errors).toEqual([]);expect(await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident})))
    .toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});
  await writeFile(info.outputPath('aulnes-v386-native-summary.json'),JSON.stringify({inputPath,inputRawSha256:digest(raw),inputTick:initial.tick,finalTick:exported.world.tick,schema:246,outcome,productionStop,freeStoredProductIds:eligible.map(p=>p.id),billId:bill.id,billRemainingAtImport:bill.target,reasonAtImport,reasonAtDecision,unfinishedAtDecision,assignments,ordered,exportPath:exported.path,exportSha256:exported.sha256,errors,
    scope:'Actual ROOT-produced250² checkpoint. Partial production is reported honestly; any wearing uses real UI movement/contact. No textile, quality, needs, work, policies or history are granted.'},null,2));
});
