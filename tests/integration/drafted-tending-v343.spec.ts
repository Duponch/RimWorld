import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {medicalCamp,controlledInjury} from '../scenarios/health';
import {reconcilePawnHealth} from '../../src/sim/health';
import {BLOOD_UNIT} from '../../src/sim/injury-rules';
import {addMaterial} from '../../src/sim/materials';
import {refreshStock} from '../../src/sim/index';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
import {perform,revealCells} from './player-actions';

// Prepared 32-cell feature scenes, explicitly separate from the exposed V342 campaign.
// Preparation occurs before a genuine file import; all subsequent commands use the UI.
function prepared(){
  const w=medicalCamp(2),[doctor,patient]=w.pawns;Object.assign(doctor!,{x:3,z:5,name:'Médecin pacifiste',background:{childhood:'quiet-child',adulthood:'medic'}});
  doctor!.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};Object.assign(patient!,{x:12,z:5,name:'Patient de terrain',medicalCare:'best'});
  controlledInjury(w,patient!,'left-arm',5000,'cut');controlledInjury(w,patient!,'right-arm',5000,'bruise');
  patient!.health!.bloodLoss=BLOOD_UNIT*.61;reconcilePawnHealth(w,patient!);
  addMaterial(w,'medicine',25,{type:'ground',x:4,z:5},'medicine');addMaterial(w,'medicine',5,{type:'ground',x:4,z:6},'medicine');refreshStock(w);return w;
}
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
const front=(page:Page)=>page.locator('.front-menu');
async function order(page:Page,doctorId:number,patientId:number){
  await page.keyboard.press('Escape');await page.locator(`[data-pawn="${doctorId}"]`).click();
  const patient=(await world(page)).pawns.find(p=>p.id===patientId)!;await revealCells(page,[patient]);
  const point=await page.evaluate(id=>window.__lisiere.projectPawn(id),patientId);if(!point)throw Error('Actual patient body is outside the visible map.');
  expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');
  await page.mouse.click(point.x,point.y,{button:'right'});const action=page.locator(`[data-order-drafted-tend="${patientId}"]`);
  await expect(action).toBeEnabled();await expect(action).toContainText('sans médicament');await action.click();
  await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===doctorId)?.tend).toMatchObject({patientId,drafted:true,phase:'approach'});
  await page.keyboard.press('Escape');
}

test.describe('V343 prepared drafted treatment feature only',()=>{
  test.skip(process.env.V343!=='1','ROOT opt-in native feature scenes; no natural-campaign recovery claim.');
  for(const mode of ['treat','cancel'] as const)test(`V343 prepared pacifist field treatment ${mode}`,async({page},info)=>{
    test.setTimeout(240000);const started=Date.now(),errors=observeErrors(page),initial=prepared(),doctorId=initial.pawns[0]!.id,patientId=initial.pawns[1]!.id,rotation={value:0};
    const medicineBefore=initial.piles.filter(p=>p.kind==='medicine'),checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean}[]=[];
    let loaded=false,failure:unknown,last:unknown,completed=false;
    const read=()=>page.evaluate(({doctorId,patientId})=>{const w=window.__lisiere.world;return {tick:w.tick,backend:window.__lisiere.backend,
      doctor:w.pawns.find(p=>p.id===doctorId),patient:w.pawns.find(p=>p.id===patientId),medicine:w.piles.filter(p=>p.kind==='medicine')};},{doctorId,patientId});
    const capture=async(name:string,reload=true)=>{
      await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);last=await read();
      await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
      const manager=page.locator('[data-save-manager]'),label='V343 '+mode+' '+name;await manager.locator('[data-save-manager-name]').fill(label);
      await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
      const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
      const path=info.outputPath(name+'.json');await(await download).saveAs(path);const raw=await readFile(path,'utf8');expect(deserializeWorld(raw)).toEqual(before);
      const record={name,tick:before.tick,sha256:sha(raw),reloaded:false};checkpoints.push(record);
      if(reload){await page.locator('#browse-saves').click();const row=front(page).locator('label').filter({has:page.locator('strong').filter({hasText:label})});
        await row.locator('input[name="front-save"]').check();await front(page).getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
      await info.attach(name,{contentType:'application/json',path});await page.keyboard.press('Escape');return before;
    };
    const run=async()=>{await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
    try{
      expect(validateWorld(initial)).toEqual([]);expect(initial.schemaVersion).toBe(233);expect(initial.pawns[1]!.state).toBe('downed');
      const input=info.outputPath('prepared-field-input.json');await writeFile(input,serializeWorld(initial));
      await page.goto('/?e2e');await front(page).getByRole('button',{name:'Charger une partie',exact:true}).click();await front(page).locator('input[type=file]').setInputFiles(input);
      await expectWorld(page,initial);loaded=true;await pause(page);expect(await world(page)).toEqual(initial);
      await perform(page,{reason:'Préparation déclarée : mobiliser le médecin pacifiste à priorité Doctor0',command:{type:'draft',pawnIds:[doctorId],enabled:true}},rotation);
      await order(page,doctorId,patientId);const approach=await capture('approach');expect(approach.pawns[0]!.tend?.phase).toBe('approach');
      expect(approach.pawns[0]!.skills.medicine.xp).toBe(0);await run();
      await expect.poll(async()=>{const s=await read();last=s;return s.doctor?.tend?.phase;},{timeout:45000,intervals:[150]}).toBe('tend');
      const working=await capture('tend'),doctor=working.pawns.find(p=>p.id===doctorId)!,patient=working.pawns.find(p=>p.id===patientId)!;
      expect(doctor.draft).toBeTruthy();expect(doctor.tend).toMatchObject({drafted:true,phase:'tend'});expect(doctor.tend?.medicine).toBeUndefined();
      expect(Math.abs(doctor.x-patient.x)+Math.abs(doctor.z-patient.z)).toBe(1);expect(doctor.x).not.toBe(initial.pawns[0]!.x);
      expect(doctor.skills.medicine.xp).toBe(0);expect(patient.health!.injuries.every(i=>i.tended===undefined)).toBe(true);
      if(mode==='treat'){
        await run();await expect.poll(async()=>{const s=await read();last=s;return s.patient?.health?.injuries.every(i=>i.tended!==undefined);},{timeout:60000,intervals:[150]}).toBe(true);
        const final=await capture('final');expect(final.pawns.find(p=>p.id===doctorId)!.draft).toBeTruthy();
        expect(final.pawns.find(p=>p.id===doctorId)!.skills.medicine.xp).toBe(175000);expect(final.pawns.find(p=>p.id===patientId)!.state).toBe('downed');
        expect(final.piles.filter(p=>p.kind==='medicine')).toEqual(medicineBefore);
      }else{
        await page.locator(`[data-pawn="${doctorId}"]`).click();await page.locator('#clear-orders').click();
        await expect.poll(async()=>(await read()).doctor?.tend).toBeUndefined();expect((await read()).doctor?.draft).toBeTruthy();
        await capture('cleared');await order(page,doctorId,patientId);
        await perform(page,{reason:'Démobilisation réelle interrompt les soins tactiques',command:{type:'draft',pawnIds:[doctorId],enabled:false}},rotation);
        expect((await read()).doctor?.tend).toBeUndefined();await run();await expect.poll(async()=>(await read()).tick,{intervals:[150]}).toBeGreaterThan(working.tick+4);
        const final=await capture('cancelled');expect(final.pawns.find(p=>p.id===doctorId)!.tend).toBeUndefined();
        expect(final.pawns.find(p=>p.id===doctorId)!.skills.medicine.xp).toBe(0);expect(final.pawns.find(p=>p.id===patientId)!.health!.injuries.every(i=>i.tended===undefined)).toBe(true);
      }
      completed=true;expect(checkpoints.every(c=>c.reloaded)).toBe(true);expect(errors).toEqual([]);
    }catch(error){failure=error;throw error;}
    finally{
      let exportFailure:unknown;if(loaded&&failure)try{await capture('failure-continuation',false);}catch(error){exportFailure=error;}
      const path=info.outputPath('drafted-tending-summary.json');await writeFile(path,JSON.stringify({mode,elapsedMs:Date.now()-started,result:failure||exportFailure?'partial-failure':completed?'prepared-feature':'not-loaded',
        qualification:'Prepared 32-cell native scene only; no V342 recovery, cure or complete natural campaign certified.',failure:String(failure??exportFailure??''),checkpoints,last,errors},null,2));
      await info.attach('drafted-tending-summary',{contentType:'application/json',path});
    }
  });
});