import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {cremationAulnes} from '../helpers/cremation-v314.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {constructionCapacity,constructionRecipe,constructionSupplied,deliveredMaterial} from '../../src/sim/construction-materials.ts';
import {cookingSpot,newCookingBill} from '../../src/sim/cooking-bills.ts';
import type {Command,World} from '../../src/sim/types.ts';
import {cell,expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers.ts';
import {perform,revealCells} from './player-actions.ts';
import {writeTestFile} from '../test-output.ts';

test('V314 actual Aulnes: stone construction, owned-animal corpse, whole transport, suspension and zero-output cremation',async({playwright})=>{
  test.setTimeout(600000);const fixture=await cremationAulnes(),resumePath=process.env.CREMATION_V314_RESUME;
  const initial=resumePath?deserializeWorld(await readFile(resumePath,'utf8')):fixture.world;
  if(resumePath){const previous=initial.structures.find(s=>s.kind==='electric-crematorium')??initial.jobs.find(j=>j.kind==='electric-crematorium');if(previous)fixture.cell={x:previous.x,z:previous.z};}
  const browser=await playwright.chromium.launch({channel:'chrome',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5385',viewport:{width:2560,height:1440}});page.setDefaultTimeout(15000);
  const errors=observeErrors(page),checkpoints:{label:string;tick:number}[]=[],rotation={value:0};
  const act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);
  let stationId=initial.structures.find(s=>s.kind==='electric-crematorium'&&s.x===fixture.cell.x&&s.z===fixture.cell.z)?.id??0;
  let blueprintId=initial.jobs.find(j=>j.kind==='electric-crematorium'&&j.x===fixture.cell.x&&j.z===fixture.cell.z)?.id??0,pileId=0,billId=0;const clearedWalls:number[]=[];
  const station=(w:World)=>w.structures.find(s=>s.id===stationId)!;
  async function checkpoint(label:string){
    await pause(page);const snapshot=await world(page);expect(validateWorld(snapshot)).toEqual([]);
    await page.keyboard.press('Escape');await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(async()=>{const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);return raw?serializeWorld(deserializeWorld(await decodeStoredSave(raw))):null;}).toBe(serializeWorld(snapshot));
    await page.locator('#load').click();await expectWorld(page,snapshot);await page.keyboard.press('Escape');checkpoints.push({label,tick:snapshot.tick});
    await writeTestFile(test.info().outputPath(`checkpoint-${label}.json`),serializeWorld(snapshot));return snapshot;
  }
  async function runGate(predicate:string,args:Record<string,unknown>,timeout=90000,speed='6'){
    await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
    await page.waitForFunction(({predicate,args})=>{const w=window.__lisiere.world;if(!new Function('w','a',`return (${predicate});`)(w,args))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},{predicate,args},{polling:20,timeout});await pause(page);
  }
  async function inspectStation(){await page.keyboard.press('Escape');await revealCells(page,[station(await world(page))]);for(let n=0;n<20;n++){await cell(page,fixture.cell.x,fixture.cell.z);if(await page.locator('[data-add-recipe="cremate-corpse"]').isVisible())break;}await expect(page.locator('[data-add-recipe="cremate-corpse"]')).toBeVisible();}
  try{
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
    await page.evaluate(async({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await checkpoint(resumePath?'continuation':'baseline');
    if(!resumePath){
      for(const p of initial.pawns.filter(p=>!p.prisoner))for(const work of ['haul','cook','craft'] as const)if(p.priorities[work])await act({type:'priority',pawnId:p.id,work,value:0},'Conserver les sources de dépouilles pendant le parcours déclaré.');
      await act({type:'designate',kind:'electric-crematorium',material:'granite-blocks',orientation:0,...fixture.cell},'Construire le poste avec 150 blocs, 20 acier et 2 composants réellement disponibles.');
      blueprintId=(await world(page)).jobs.find(j=>j.kind==='electric-crematorium'&&j.x===fixture.cell.x&&j.z===fixture.cell.z)!.id;await checkpoint('blueprint');
    }
    for(let n=0;n<24&&!stationId;n++){
      const w=await world(page),job=w.jobs.find(j=>j.id===blueprintId);if(!job)break;if(constructionSupplied(w,job))break;
      const actors=w.pawns.filter(p=>!p.prisoner&&p.priorities.build>0&&p.state!=='dead'&&p.state!=='downed'&&p.hunger>30&&p.rest>20).sort((a,b)=>Math.hypot(a.x-job.x,a.z-job.z)-Math.hypot(b.x-job.x,b.z-job.z)||a.id-b.id).slice(0,2);
      expect(actors.length).toBeGreaterThan(0);for(const actor of actors){
        const live=await world(page),current=live.jobs.find(j=>j.id===job.id);if(!current||!constructionRecipe(current).ingredients.some(i=>constructionCapacity(live,current,i.item)>0))break;
        if(!(actor.haul?.destination.type==='job'&&actor.haul.destination.jobId===job.id))await act({type:'order-haul',pawnId:actor.id,target:{type:'job',jobId:job.id},queue:false},'Prioriser une livraison physique de matériaux au chantier.');
      }
      const delivered=constructionRecipe(job).ingredients.reduce((n,i)=>n+deliveredMaterial(w,job,i.item),0);
      await runGate('!w.jobs.some(j=>j.id===a.id)||w.piles.filter(p=>p.owner.type===\'job\'&&p.owner.jobId===a.id).reduce((n,p)=>n+p.quantity,0)>a.delivered',{id:job.id,delivered},45000);
    }
    const supplied=await world(page),job=supplied.jobs.find(j=>j.id===blueprintId);
    if(job){expect(constructionSupplied(supplied,job)).toBe(true);if(job.reservedBy===null){const actor=supplied.pawns.find(p=>!p.prisoner&&p.priorities.build>0&&p.skills.construction.level>=4&&p.hunger>30&&p.rest>20)!;await act({type:'order-job',pawnId:actor.id,jobId:job.id,queue:false},'Finir le poste après les vraies livraisons.');}}
    if(!stationId){await runGate('w.structures.some(s=>s.kind===\'electric-crematorium\'&&s.x===a.x&&s.z===a.z)',{...fixture.cell},180000);stationId=(await world(page)).structures.find(s=>s.kind==='electric-crematorium'&&s.x===fixture.cell.x&&s.z===fixture.cell.z)!.id;}
    let built=await checkpoint('built');expect(station(built)).toMatchObject({material:'granite-blocks'});if(!resumePath)expect(station(built).bills).toEqual([]);
    const spot=cookingSpot(station(built)),obstacle=built.structures.find(s=>s.kind==='wall'&&s.x===spot.x&&s.z===spot.z);
    if(obstacle){
      await act({type:'designate',kind:'deconstruct',targetId:obstacle.id,x:obstacle.x,z:obstacle.z},'Corriger le choix initial du site en déconstruisant physiquement le seul mur devant le poste.');
      const live=await world(page),job=live.jobs.find(j=>j.deconstruction?.structureId===obstacle.id)!;
      const actor=live.pawns.filter(p=>!p.prisoner&&p.priorities.build>0&&p.state!=='dead'&&p.state!=='downed'&&p.hunger>30&&p.rest>20).sort((a,b)=>b.skills.construction.level-a.skills.construction.level||a.id-b.id)[0]!;
      await act({type:'order-job',pawnId:actor.id,jobId:job.id,queue:false},'Prioriser la déconstruction réelle, avec son remboursement ordinaire.');
      await runGate('!w.structures.some(s=>s.id===a.id)',{id:obstacle.id});clearedWalls.push(obstacle.id);built=await checkpoint('front-cleared');
    }
    if(!station(built).power?.on){const scanner=built.structures.find(s=>s.kind==='ground-scanner'&&s.power?.on)!;expect(scanner).toBeDefined();await act({type:'power-flick',structureId:scanner.id,on:false},'Libérer la puissance du scanner par son interrupteur physique.');await runGate('w.structures.find(s=>s.id===a.id)?.power?.on===true',{id:stationId});built=await checkpoint('powered');}
    const animal=built.wildlife!.animals.find(a=>a.id===fixture.animalId),existing=built.piles.find(p=>p.corpse?.animalId===fixture.animalId);
    if(animal){await page.keyboard.press('Escape');await page.locator('[data-panel="animals"]').click();await page.locator(`[data-domestic-slaughter="${animal.id}"]`).check();await runGate('w.piles.some(p=>p.corpse?.animalId===a.id)',{id:animal.id},120000);}
    const body=await checkpoint('corpse'),pile=body.piles.find(p=>p.corpse?.animalId===fixture.animalId)??existing;expect(pile).toBeDefined();pileId=pile!.id;
    const source=structuredClone(pile!),witness=body.wildlife!.animals.find(a=>a.id===fixture.witnessId)!;expect(witness).toBeDefined();
    await inspectStation();if(!station(await world(page)).bills?.some(b=>b.recipe==='cremate-corpse'))await page.locator('[data-add-recipe="cremate-corpse"]').click();
    await expect.poll(async()=>station(await world(page)).bills?.some(b=>b.recipe==='cremate-corpse')).toBe(true);billId=station(await world(page)).bills!.find(b=>b.recipe==='cremate-corpse')!.id;
    const defaults=newCookingBill(billId,'cremate-corpse'),settings={...defaults,filters:Object.fromEntries(Object.keys(defaults.filters).map(i=>[i,i===source.item]))};
    await act({type:'bill-update',structureId:stationId,billId,settings},'Autoriser une seule dépouille animale réelle, avec tous les stades locaux.');
    const ready=await world(page),worker=ready.pawns.filter(p=>!p.prisoner&&p.state!=='downed'&&p.state!=='dead'&&p.hunger>30&&p.rest>20).sort((a,b)=>Math.hypot(a.x-fixture.cell.x,a.z-fixture.cell.z)-Math.hypot(b.x-fixture.cell.x,b.z-fixture.cell.z)||a.id-b.id)[0]!;
    await act({type:'priority',pawnId:worker.id,work:'haul',value:1},'Confier la crémation au travail Transport.');
    await act({type:'order-cook',pawnId:worker.id,structureId:stationId,queue:false},'Prioriser la collecte réelle de la dépouille vers le poste.');
    await runGate('w.pawns.some(p=>p.cooking?.recipe===\'cremate-corpse\'&&p.cooking.ingredients.some(i=>i.pileId===a.id&&i.stage===\'held\'))',{id:pileId},180000,'1');
    const held=await checkpoint('held');expect(held.piles.find(p=>p.id===pileId)).toMatchObject({item:source.item,quantity:1,corpse:source.corpse,owner:{type:'pawn',pawnId:worker.id}});
    await act({type:'bill-update',structureId:stationId,billId,settings:{...settings,suspended:true}},'Suspendre pendant le portage sans détruire la dépouille.');
    const suspended=await checkpoint('suspended');expect(suspended.piles.find(p=>p.id===pileId)).toMatchObject({item:source.item,quantity:1,corpse:source.corpse});expect(suspended.pawns.some(p=>p.cooking?.stationId===stationId)).toBe(false);
    await act({type:'bill-update',structureId:stationId,billId,settings},'Reprendre à partir du même corps physiquement conservé.');await act({type:'order-cook',pawnId:worker.id,structureId:stationId,queue:false},'Reprendre le transport vers le poste.');
    await runGate('w.pawns.some(p=>p.cooking?.recipe===\'cremate-corpse\'&&p.cooking.phase===\'work\'&&p.cooking.progress>0&&p.cooking.progress<180000)',{},180000,'1');
    const working=await checkpoint('work'),placed=working.piles.find(p=>p.id===pileId)!;expect(placed.owner.type).toBe('ground');expect(placed.corpse).toEqual(source.corpse);await inspectStation();await page.screenshot({path:test.info().outputPath('crematorium-bill.png')});
    const nextId=working.nextId,previous=working.destroyed?.items?.[source.item]??0;
    await runGate('!w.piles.some(p=>p.id===a.id)&&w.structures.find(s=>s.id===a.stationId).bills.find(b=>b.id===a.billId).target===0',{id:pileId,stationId,billId},30000,'1');
    const completed=await checkpoint('completed');expect(completed.destroyed?.items?.[source.item]).toBe(previous+1);expect(completed.pawns.some(p=>p.cooking?.stationId===stationId)).toBe(false);expect(completed.wildlife!.animals.some(a=>a.id===fixture.witnessId)).toBe(true);
    // nextId may change through unrelated ordinary colony production; a zero
    // output and one corpse ledger entry are the transaction's actual evidence.
    await runGate('w.tick>a.tick',{tick:completed.tick},30000,'1');const resumed=await checkpoint('ordinary-after');expect(resumed.piles.some(p=>p.id===pileId||p.corpse?.animalId===fixture.animalId)).toBe(false);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});
    await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({source:fixture.source,sha:fixture.sha,resumePath:resumePath??null,declaredDotation:[],clearedWalls,stationId,blueprintId,pileId,billId,workerId:worker.id,animalId:fixture.animalId,witnessId:fixture.witnessId,nextIdAtWork:nextId,checkpoints,errors,scope:'actual Aulnes with declared ordinary slaughter, prioritized construction and real Transport; human losses qualified by permanent tests, no natural waste campaign or performance claim'},null,2));
  }catch(error){await writeTestFile(test.info().outputPath('failed-world.json'),serializeWorld(await world(page)));await writeTestFile(test.info().outputPath('failed-diagnostic.json'),JSON.stringify({stationId,blueprintId,pileId,billId,checkpoints,errors,notice:await page.locator('#notice').textContent()},null,2));throw error;}
  finally{await page.close();await browser.close();}
});
