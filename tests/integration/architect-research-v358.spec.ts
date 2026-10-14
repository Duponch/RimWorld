import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {medicalCamp} from '../scenarios/health';
import {fixtureBuilding} from '../scenarios/deconstruction';
import {createScenarioWorld} from '../../src/sim/new-game';
import {CLOTHING_RESEARCH_COST} from '../../src/sim/research';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {architectToolAvailable} from '../../src/ui/architect-availability';
import type {Tool,ArchitectCategory} from '../../src/ui/layout';
import {cell,expectWorld,observeErrors,panel,pause,world} from './helpers';
import {perform} from './player-actions';
import type {World} from '../../src/sim/types';

const front=(p:Page)=>p.locator('.front-menu');
const frontButton=(p:Page,name:string)=>front(p).getByRole('button',{name,exact:true});
async function catalogue(page:Page,w:World){
 await panel(page,'architect');
 const tools=await page.locator('#architect-panel [data-tool-category]').evaluateAll(nodes=>nodes.map(n=>({id:(n as HTMLElement).dataset.tool as Tool,category:(n as HTMLElement).dataset.toolCategory as ArchitectCategory})));
 const categories=[...new Set(tools.map(t=>t.category))];
 for(const category of categories){
  await page.locator(`[data-category="${category}"]`).click();
  const visible=await page.locator('#architect-panel [data-tool-category]').evaluateAll(nodes=>nodes.filter(n=>!(n as HTMLElement).hidden).map(n=>(n as HTMLElement).dataset.tool));
  expect(visible).toEqual(tools.filter(t=>t.category===category&&architectToolAvailable(w,t.id)).map(t=>t.id));
 }
}
function qualification(page:Page,info:TestInfo){
 const started=Date.now(),errors=observeErrors(page),lifecycle:unknown[]=[],checkpoints:unknown[]=[],observations:unknown[]=[];
 let last:World|undefined;
 page.on('crash',()=>lifecycle.push({kind:'crash',elapsedMs:Date.now()-started}));
 const read=async()=>{
  expect(errors).toEqual([]);expect(lifecycle).toEqual([]);
  if(Date.now()-started>140000)throw Error('V358 140s body bound');
  last=await world(page);observations.push({tick:last.tick,research:last.research});if(observations.length>32)observations.shift();return last;
 };
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
 const capture=async(name:string)=>{
  await pause(page);await closeMenu();const before=await read();expect(validateWorld(before)).toEqual([]);
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label='V358 '+name;
  await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);
  await page.locator('#browse-saves').click();const row=front(page).locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await frontButton(page,'Charger').click();await expectWorld(page,before);
  checkpoints.push({name,tick:before.tick,sha256:createHash('sha256').update(text).digest('hex'),reloaded:true});await closeMenu();return before;
 };
 const finish=async(failure:unknown,scope:string)=>{
  const path=info.outputPath('architect-v358-summary.json');await writeFile(path,JSON.stringify({version:358,elapsedMs:Date.now()-started,backend:await page.evaluate(()=>window.__lisiere?.backend).catch(()=>null),result:failure?'failed':'qualified',failure:String(failure??''),scope,errors,lifecycle,checkpoints,observations,last},null,2));await info.attach('architect-v358-summary',{contentType:'application/json',path});
 };
 return {read,capture,finish};
}

test('V358 actual new colony shows only researched Architect buildings and reloads exactly',async({page},info)=>{
 test.skip(process.env.V358!=='1','ROOT opt-in UI qualification.');test.setTimeout(180000);page.setDefaultTimeout(20000);
 const q=qualification(page,info);let failure:unknown;
 try{
  await page.goto('/?e2e');await frontButton(page,'Nouvelle partie').click();await frontButton(page,'Suivant').click();
  await front(page).getByRole('radio',{name:'Récit d’aventure',exact:true}).check();await front(page).getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();await frontButton(page,'Suivant').click();
  await page.locator('#front-seed').fill('42');await frontButton(page,'Générer').click();await frontButton(page,'Suivant').click();await front(page).locator('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();await frontButton(page,'Démarrer').click();
  await expect(front(page)).toBeHidden({timeout:90000});await pause(page);const initial=await q.read();expect(initial.width).toBe(250);expect(initial.schemaVersion).toBe(236);
  expect(initial.research?.complexFurniture?.completedAt).toBeDefined();expect(initial.research?.stonecutting?.completedAt).toBeDefined();expect(initial.research?.completedAt).toBe(0);
  await catalogue(page,initial);await page.locator('[data-category="production"]').click();await expect(page.locator('[data-tool="machining-table"]')).toBeHidden();await expect(page.locator('[data-tool="tailor-bench"]')).toBeVisible();await expect(page.locator('[data-tool="research-bench"]')).toBeVisible();await expect(page.locator('[data-tool="fueled-stove"]')).toBeVisible();await page.screenshot({path:info.outputPath('new-colony-production.png')});
  await page.locator('#architect-panel [data-close-panel]').click();await expect(page.locator('#orders-open')).toBeVisible();await expect(page.locator('#zones-open')).toBeVisible();await q.capture('new-colony');await catalogue(page,await q.read());
 }catch(error){failure=error;throw error;}finally{await q.finish(failure,'Actual five-page250² new game, all existing categories and exact reload. No natural campaign or FPS proof.');}
});

test('V358 real completion refreshes an open Architect and a different start restores its own gates',async({page},info)=>{
 test.skip(process.env.V358!=='1','ROOT opt-in prepared UI qualification.');test.setTimeout(180000);page.setDefaultTimeout(20000);
 const q=qualification(page,info);let failure:unknown;
 try{
  // Prepared near-completion state isolates the UI transition. No natural
  // research-duration or V356 campaign progress is credited to this fixture.
  const initial=medicalCamp(1,32),pawn=initial.pawns[0]!;delete pawn.background;pawn.mood=80;
  Object.assign(fixtureBuilding(initial,'research-bench',16,16),{material:'wood'});
  initial.research={project:null,points:CLOTHING_RESEARCH_COST-200000};expect(validateWorld(initial)).toEqual([]);
  const input=info.outputPath('prepared-input.json');await writeFile(input,serializeWorld(initial));await page.goto('/?e2e');await frontButton(page,'Charger une partie').click();await front(page).locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);await pause(page);
  await catalogue(page,initial);await page.locator('[data-category="production"]').click();await expect(page.locator('[data-tool="tailor-bench"]')).toBeHidden();await q.capture('unfinished');
  await panel(page,'architect');await page.locator('[data-category="production"]').click();await page.locator('[data-tool="art-bench"]').click();await panel(page,'architect');await expect(page.locator('#construction-material-controls')).toBeVisible();await page.locator('#construction-material').selectOption('wood');await cell(page,8,8);
  await expect.poll(async()=>(await q.read()).jobs.some(j=>j.kind==='art-bench'&&j.x===8&&j.z===8&&j.material==='wood')).toBe(true);await page.keyboard.press('Escape');
  await panel(page,'research');await page.locator('[data-research-start]').click();await perform(page,{reason:'Achever la recherche par le vrai travailleur et sa priorité UI',command:{type:'priority',pawnId:pawn.id,work:'research',value:1}},{value:0});await page.locator('#work-panel [data-close-panel]').click();await panel(page,'architect');await page.locator('[data-category="production"]').click();await expect(page.locator('[data-tool="tailor-bench"]')).toBeHidden();await page.locator('[data-speed="1"]').click();
  while((await q.read()).research?.completedAt===undefined)await page.waitForTimeout(100);
  await expect(page.locator('#architect-panel')).toBeVisible();await expect(page.locator('[data-category="production"]')).toHaveClass(/active/);await expect(page.locator('[data-tool="tailor-bench"]')).toBeVisible();await expect(page.locator('[data-tool="electric-tailor-bench"]')).toBeVisible();await pause(page);const completed=await q.read();expect(completed.research?.points).toBeGreaterThanOrEqual(CLOTHING_RESEARCH_COST);expect(completed.research?.project).toBeNull();await page.screenshot({path:info.outputPath('completed-production.png')});await q.capture('completed');await catalogue(page,await q.read());
  const other=createScenarioWorld(42,32,'survivors');expect(validateWorld(other)).toEqual([]);expect(other.research?.completedAt).toBeDefined();expect(other.research?.complexFurniture?.completedAt).toBeUndefined();const next=info.outputPath('other-start.json');await writeFile(next,serializeWorld(other));
  await page.locator('[data-category="furniture"]').click();await expect(page.locator('[data-tool="shelf"]')).toBeHidden();
  await page.locator('[data-category="production"]').click();await page.locator('[data-tool="tailor-bench"]').click();await expect(page.locator('[data-tool="tailor-bench"]')).toHaveClass(/active/);
  // The real Menu/load path also resets the tool. This is not an isolated
  // test of a direct snapshot replacement while bypassing that player path.
  await panel(page,'menu');await page.locator('#browse-saves').click();await front(page).locator('input[type=file]').setInputFiles(next);await expectWorld(page,other);await pause(page);await expect(page.locator('[data-tool].active')).toHaveCount(0);await catalogue(page,other);await page.locator('[data-category="furniture"]').click();await expect(page.locator('[data-tool="shelf"]')).toBeHidden();await expect(page.locator('[data-tool="bed"]')).toBeVisible();await page.screenshot({path:info.outputPath('other-start-furniture.png')});await q.capture('other-start');
 }catch(error){failure=error;throw error;}finally{await q.finish(failure,'Prepared32² near-completion, real worker/UI priority, live visibility then Survivors starting research and exact reloads. No natural campaign or FPS proof.');}
});
