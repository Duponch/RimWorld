import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {medicalCamp} from '../scenarios/health';
import {fixtureBuilding} from '../scenarios/deconstruction';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {expectWorld,observeErrors,panel,pause,world} from './helpers';
import {perform} from './player-actions';
import type {World} from '../../src/sim/types';

// Prepared32² UI qualification, separate from the natural V356 campaign.
function fixture(){
 const w=medicalCamp(1,32),pawn=w.pawns[0]!;pawn.name='Chercheur V357';pawn.mood=80;delete pawn.background;
 const bench=fixtureBuilding(w,'research-bench',16,16);Object.assign(bench,{material:'wood'});
 return {w,pawnId:pawn.id,benchId:bench.id};
}
const front=(p:Page)=>p.locator('.front-menu');
test('V357 research guidance: existing panel destinations, real work and exact save continuation',async({page},info)=>{
 test.skip(process.env.V357!=='1','ROOT opt-in prepared UI qualification.');test.setTimeout(180000);page.setDefaultTimeout(12000);
 const started=Date.now(),deadline=started+120000,{w:initial,pawnId,benchId}=fixture(),errors=observeErrors(page),lifecycle:unknown[]=[],checkpoints:unknown[]=[],observations:unknown[]=[];
 page.on('crash',()=>lifecycle.push({kind:'crash',elapsedMs:Date.now()-started}));
 const read=async()=>{expect(errors).toEqual([]);expect(lifecycle).toEqual([]);if(Date.now()>deadline)throw Error('V357120s body bound');const w=await world(page);observations.push({tick:w.tick,project:w.research?.project,points:w.research?.points,pawn:w.pawns.find(p=>p.id===pawnId)});if(observations.length>64)observations.shift();return w;};
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
 const capture=async(name:string)=>{
  await pause(page);await closeMenu();const before=await read();expect(validateWorld(before)).toEqual([]);
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label='V357 '+name;
  await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);
  await page.locator('#browse-saves').click();const row=front(page).locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front(page).getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);
  checkpoints.push({name,tick:before.tick,sha256:createHash('sha256').update(text).digest('hex'),reloaded:true});await closeMenu();return before;
 };
 let last:World|undefined,backend:unknown,failure:unknown;
 try{
  expect(validateWorld(initial)).toEqual([]);const input=info.outputPath('prepared-input.json');await writeFile(input,serializeWorld(initial));
  await page.goto('/?e2e');await front(page).getByRole('button',{name:'Charger une partie',exact:true}).click();await front(page).locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);await pause(page);backend=await page.evaluate(()=>window.__lisiere.backend);
  const alert=page.locator('[data-alert="research-project"]');await expect(alert).toBeVisible();await expect(alert).not.toHaveAttribute('title',/.+/);
  await alert.focus();await page.keyboard.press('Enter');await expect(page.locator('#research-panel')).toBeVisible();await expectWorld(page,initial);
  await expect(page.locator('[data-research-readiness]')).toContainText('désactivée');await page.screenshot({path:info.outputPath('research-unassigned.png')});
  await page.locator('[data-research-open-production]').click();await expect(page.locator('#architect-panel')).toBeVisible();await expect(page.locator('[data-category="production"]')).toHaveClass(/active/);await expectWorld(page,initial);
  await page.locator('#architect-panel [data-close-panel]').click();await panel(page,'research');await page.locator('[data-research-open-work]').click();await expect(page.locator('#work-panel')).toBeVisible();await expectWorld(page,initial);await page.locator('#work-panel [data-close-panel]').click();
  const guide=page.locator('.learning-readout');if(!await guide.evaluate(n=>(n as HTMLDetailsElement).open))await guide.locator(':scope > summary').click();
  await expect(page.locator('[data-first-day-section]')).toHaveCount(8);const research=page.locator('[data-first-day-section="research"]');await research.locator('summary').click();await research.getByRole('button',{name:'Ouvrir Recherche',exact:true}).click();await expect(page.locator('#research-panel')).toBeVisible();
  await capture('initial');await panel(page,'research');await page.locator('[data-research-start]').click();
  await expect(page.locator('[data-alert="research-project"]')).toHaveCount(0);await expect.poll(async()=>(await read()).research?.project).toBe('complex-clothing');
  await expect(page.locator('[data-research-readiness]')).toContainText('désactivée');
  await perform(page,{reason:'Affecter la recherche depuis la vraie table Travail',command:{type:'priority',pawnId,work:'research',value:1}},{value:0});
  await page.locator('#work-panel [data-close-panel]').click();await page.locator('[data-speed="1"]').click();
  while(true){last=await read();const pawn=last.pawns.find(p=>p.id===pawnId);if((last.research?.points??0)>0&&pawn?.research?.stationId===benchId&&pawn.state==='working')break;await page.waitForTimeout(100);}
  await pause(page);last=await read();const researcher=last.pawns.find(p=>p.id===pawnId)!;expect(researcher.research?.stationId).toBe(benchId);expect(last.research?.project).toBe('complex-clothing');expect(last.research?.completedAt).toBeUndefined();expect(last.research!.points).toBeGreaterThan(0);
  await panel(page,'research');await expect(page.locator('[data-research-readiness]')).toContainText('1');await expect(page.locator('[data-research-workers]')).toContainText('Chercheur V357');await page.screenshot({path:info.outputPath('research-working.png')});
  const work=await capture('working');await panel(page,'research');await page.locator('[data-research-pause]').click();await expect(page.locator('[data-alert="research-project"]')).toBeVisible();last=await read();expect(last.research?.project).toBeNull();expect(last.research?.points).toBe(work.research?.points);expect(last.pawns.find(p=>p.id===pawnId)?.research??null).toBeNull();
  await page.locator('#research-panel [data-close-panel]').click();await page.locator('[data-alert="research-project"]').focus();await page.keyboard.press('Space');await expect(page.locator('#research-panel')).toBeVisible();expect((await read()).tick).toBe(last.tick);expect(errors).toEqual([]);
 }catch(error){failure=error;throw error;}
 finally{const path=info.outputPath('research-guidance-v357-summary.json');await writeFile(path,JSON.stringify({version:357,prepared:true,initialTick:initial.tick,pawnId,benchId,backend,elapsedMs:Date.now()-started,result:failure?'failed':'qualified',failure:String(failure??''),errors,lifecycle,checkpoints,observations,last,scope:'Prepared32². UI destinations, project selection, actual priority and first research work/save. No completion, material construction, natural V356 campaign or FPS proof.'},null,2));await info.attach('research-guidance-v357-summary',{contentType:'application/json',path});}
});
