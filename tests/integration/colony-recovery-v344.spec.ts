import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {world,pause,panel,expectWorld,observeErrors,cell} from './helpers';
import {perform,revealCells} from './player-actions';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {doorOpenness} from '../../src/sim/door-rules';
import type {World,Pawn,Command,WorldEvent} from '../../src/sim/types';

// One actual V342 branch. No fixtures, live World writes, expiry assumption or cure claim.
const IDS=[18530,18532,18534],IRIS=18530,GAEL=18532,DOCTOR=18534,DOOR=18648,ENEMY=18565,SEED=3398550437;
const INPUT_SHA='4cb33f349ab2dc64d5e4107f7fe02129cff9a6c8ae50ba8091266ca6d89029a4';
const V340_SHA='8477b29fec55f7dbe657ec3df05bb4a4047b3fde123ca4b1f91bc9fb5a6f0560';
const ORIGIN_SHA='e6eea52468ce91196a2a3b816b1df488e09acf47a498bfddb6891bb810a21925';
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
type Ledger={version:344;seed:number;people:number[];origin:{path:string;tick:number;sha256:string};inheritedV342:unknown;
  snapshotTick?:number;snapshotSha256?:string;responses:unknown[];notes:unknown[];events:WorldEvent[];
  checkpoints:{name:string;path:string;tick:number;sha256:string;reloaded:boolean;proof:unknown}[]};
const inside=(c:{x:number;z:number})=>c.x>120&&c.x<125&&c.z>110&&c.z<115;
async function observe(page:Page){return page.evaluate(({ids,door,enemy})=>{
  const w=window.__lisiere.world;return {tick:w.tick,seed:w.seed,backend:window.__lisiere.backend,incident:window.__lisiere.incident,
    people:w.pawns.filter(p=>ids.includes(p.id)),door:w.structures.find(s=>s.id===door),enemy:w.wildlife?.animals.find(a=>a.id===enemy),
    supplies:w.piles.filter(p=>['medicine','herbal-medicine','survival-meal','simple-meal','rice'].includes(p.item)),events:w.events};
},{ids:IDS,door:DOOR,enemy:ENEMY});}
type Observation=Awaited<ReturnType<typeof observe>>;
const pawn=(w:World,id:number)=>w.pawns.find(p=>p.id===id)!;
const stationary=(p:Pawn,tick:number)=>p.moveCooldown===0&&(p.motion?.end??0)<=tick;
const enemyInside=(s:Observation)=>!!s.enemy&&(inside(s.enemy)||!!s.enemy.motion&&s.enemy.motion.end>s.tick
  &&(inside(s.enemy.motion.from)||inside(s.enemy.motion.to)));
const isolated=(s:Observation)=>!!s.door?.door&&!s.door.door.open&&doorOpenness(s.door,s.tick)===0&&!!s.enemy&&!enemyInside(s)
  &&!s.people.some(p=>p.rescue?.patientId===GAEL&&p.rescue.phase==='carry')&&stationary(s.people.find(p=>p.id===GAEL)!,s.tick);

async function forbidDoor(page:Page){
  await page.keyboard.press('Escape');const target=(await world(page)).structures.find(s=>s.id===DOOR)!;expect(target).toMatchObject({kind:'door',x:125,z:114});
  for(let attempt=0;attempt<8;attempt++){
    await revealCells(page,[target]);await cell(page,target.x,target.z);
    if(await page.locator('#door-controls').isVisible()&&await page.locator('#door-forbidden').isVisible())break;
  }
  await expect(page.locator('#door-controls')).toBeVisible();await expect(page.locator('#cell-title')).toContainText('Porte');
  await page.locator('#door-forbidden').check();await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===DOOR)?.door?.forbidden).toBe(true);
  await page.keyboard.press('Escape');
}
async function orderFieldCare(page:Page){
  await page.keyboard.press('Escape');await page.locator(`[data-pawn="${DOCTOR}"]`).click();const patient=pawn(await world(page),GAEL);
  await revealCells(page,[patient]);const point=await page.evaluate(id=>window.__lisiere.projectPawn(id),GAEL);if(!point)throw Error('Actual patient body is outside the visible map.');
  expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');await page.mouse.click(point.x,point.y,{button:'right'});
  const action=page.locator(`[data-order-drafted-tend="${GAEL}"]`);await expect(action).toBeEnabled();await expect(action).toContainText('sans médicament');await action.click();
  await expect.poll(async()=>pawn(await world(page),DOCTOR).tend).toMatchObject({patientId:GAEL,drafted:true,phase:'approach'});await page.keyboard.press('Escape');
}

test('V344 literal injured branch, release, isolated retreat and first dry field treatment',async({page},info)=>{
  test.skip(!process.env.V344_INPUT,'Requires literal V342 tick66474 and its SHA-bound version342 sidecar.');test.setTimeout(240000);page.setDefaultTimeout(10000);
  const started=Date.now(),deadline=started+180000,input=resolve(process.env.V344_INPUT!),errors=observeErrors(page),rotation={value:0},ring:Observation[]=[];
  let e!:Ledger,raw='',loaded=false,failure:unknown,last:Observation|undefined,completed=false,baseline:Pawn[]=[];
  let work:{tick:number;progress:number;skill:Pawn['skills']['medicine']}|undefined;
  const front=()=>page.locator('.front-menu'),has=(name:string)=>e.checkpoints.some(c=>c.name===name&&c.reloaded);
  const run=async()=>{await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
  const guard=(s:Observation)=>{
    if(s.incident.graphicsFault||s.incident.simulationStopped)throw Error('Technical incident; preserve the confirmed outcome.');
    if(s.people.length!==3||s.people.some(p=>p.state==='dead'||p.health?.death||p.prisoner||p.mental?.crisis
      ||p.state==='downed'&&baseline.find(b=>b.id===p.id)?.state!=='downed'))throw Error('Death or new original-person incapacity; pause for ROOT.');
    if(!s.door)throw Error('Shelter door destroyed; exposure must not be hidden.');if(enemyInside(s))throw Error('Gazelle entered the shelter or has a captured edge into it.');
    for(const p of s.people.filter(p=>p.id===IRIS||p.id===DOCTOR)){
      const original=baseline.find(b=>b.id===p.id)!;
      if(p.health?.injuries.some(i=>i.severity>0&&(!original.health?.injuries.some(b=>b.id===i.id)||i.severity>(original.health?.injuries.find(b=>b.id===i.id)?.severity??0)))
        ||p.health?.missing.some(m=>!original.health?.missing.some(b=>b.part===m.part)))throw Error('New injury or aggravation of Iris/Leonie; prior Iris5195 remains part of the baseline.');
    }
  };
  const act=async(command:Command,reason:string)=>{await perform(page,{command,reason},rotation);await page.keyboard.press('Escape');e.responses.push({tick:(await world(page)).tick,command,reason});};
  const capture=async(name:string,qualify?:(w:World,s:Observation)=>void,reload=true)=>{
    await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);last=await observe(page);
    if(name!=='failure-outcome')guard(last);qualify?.(before,last);expect(before.pawns.filter(p=>IDS.includes(p.id)).map(p=>p.id).sort((a,b)=>a-b)).toEqual(IDS);
    await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
    const manager=page.locator('[data-save-manager]'),label='V344 '+name;await manager.locator('[data-save-manager-name]').fill(label);
    await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
    const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
    const path=info.outputPath(name+'.json');await(await download).saveAs(path);const data=await readFile(path,'utf8');expect(deserializeWorld(data)).toEqual(before);
    const record={name,path,tick:before.tick,sha256:sha(data),reloaded:false,proof:last};e.checkpoints.push(record);e.snapshotTick=before.tick;e.snapshotSha256=record.sha256;
    if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});
      await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
    await writeFile(path+'.evidence.json',JSON.stringify(e,null,2));await info.attach(name,{contentType:'application/json',path});await page.keyboard.press('Escape');return before;
  };
  try{
    raw=await readFile(input,'utf8');expect(sha(raw)).toBe(INPUT_SHA);const literal=JSON.parse(raw) as World,initial=deserializeWorld(raw);
    expect([literal.schemaVersion,literal.tick]).toEqual([232,66474]);expect(initial).toEqual({...literal,schemaVersion:233});expect(validateWorld(initial)).toEqual([]);
    const side=JSON.parse(await readFile(resolve(process.env.V344_EVIDENCE??input+'.evidence.json'),'utf8'));
    expect([side.version,side.seed,side.snapshotTick,side.snapshotSha256]).toEqual([342,SEED,66474,INPUT_SHA]);expect(side.people).toEqual(IDS);
    expect([side.origin.tick,side.origin.sha256]).toEqual([66431,V340_SHA]);expect([side.inheritedV340.origin.tick,side.inheritedV340.origin.sha256]).toEqual([39073,ORIGIN_SHA]);
    expect([initial.seed,initial.width,initial.height]).toEqual([SEED,250,250]);baseline=initial.pawns.filter(p=>IDS.includes(p.id));expect(baseline.map(p=>p.id).sort((a,b)=>a-b)).toEqual(IDS);
    expect(pawn(initial,IRIS).rescue).toMatchObject({patientId:GAEL,phase:'carry'});expect(pawn(initial,IRIS).health?.injuries).toContainEqual({id:1,part:'left-leg',kind:'bruise',severity:5195,bornAt:66474});
    expect(pawn(initial,GAEL).state).toBe('downed');expect(pawn(initial,DOCTOR).draft).toBeTruthy();const untended=pawn(initial,GAEL).health!.injuries.filter(i=>i.tended===undefined).map(i=>i.id),initialSkill=pawn(initial,DOCTOR).skills.medicine;
    e={version:344,seed:SEED,people:IDS,origin:{path:input,tick:initial.tick,sha256:sha(raw)},inheritedV342:side,responses:[],notes:[],events:[],checkpoints:[]};
    await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);
    await expectWorld(page,initial);await pause(page);expect(await world(page)).toEqual(initial);loaded=true;guard(await observe(page));
    await act({type:'draft',pawnIds:[IRIS],enabled:true},'Interrompre le portage exposé, avec corps et arête conservés');
    await capture('draft-drop',w=>{expect(pawn(w,IRIS).rescue).toBeUndefined();expect(pawn(w,IRIS).draft).toBeTruthy();
      expect([pawn(w,GAEL).x,pawn(w,GAEL).z,pawn(w,GAEL).motion,pawn(w,GAEL).moveCooldown]).toEqual([pawn(initial,GAEL).x,pawn(initial,GAEL).z,pawn(initial,GAEL).motion,pawn(initial,GAEL).moveCooldown]);});
    e.notes.push({tick:initial.tick,release:'Carrier relationship released only; patient movement is not yet finished.'});
    await act({type:'draft-move',pawnIds:[IRIS],target:{x:124,z:111},queue:false},'Retrait intérieur réel d’Iris');
    await expect.poll(async()=>pawn(await world(page),IRIS).draft?.target).toEqual({x:124,z:111});await forbidDoor(page);
    e.responses.push({tick:(await world(page)).tick,doorPolicy:'forbidden',qualification:'Future passage blocked; no instant closure or cancellation of committed edges.'});await run();
    while(Date.now()<deadline){
      const s=await observe(page);last=s;ring.push(s);if(ring.length>20)ring.shift();expect(s.seed).toBe(SEED);expect(s.backend).toBe('WebGPU');guard(s);
      for(const event of s.events)if(event.tick>initial.tick&&!e.events.some(v=>v.tick===event.tick&&v.type===event.type&&v.message===event.message))e.events.push(event);
      const iris=s.people.find(p=>p.id===IRIS)!,patient=s.people.find(p=>p.id===GAEL)!,doctor=s.people.find(p=>p.id===DOCTOR)!;
      if(!has('isolated-retreat')&&iris.x===124&&iris.z===111&&stationary(iris,s.tick)&&isolated(s)){
        await capture('isolated-retreat',(w,at)=>{expect(isolated(at)).toBe(true);expect([pawn(w,IRIS).x,pawn(w,IRIS).z]).toEqual([124,111]);});await run();continue;
      }
      if(has('isolated-retreat')&&!has('order')){
        await pause(page);const at=await observe(page);guard(at);if(!isolated(at))throw Error('Actual isolation or stationary patient lost before care.');
        await orderFieldCare(page);e.responses.push({tick:(await world(page)).tick,action:'accepted real dry field order only',doctorId:DOCTOR,patientId:GAEL});
        await capture('order',w=>expect(pawn(w,DOCTOR).tend).toMatchObject({drafted:true,patientId:GAEL,phase:'approach'}));await run();continue;
      }
      if(has('order')&&!isolated(s))throw Error('Actual isolation or stationary patient lost during care.');
      if(doctor.tend?.drafted&&doctor.tend.patientId===GAEL&&doctor.tend.phase==='approach'&&!has('approach')
        &&(doctor.x!==pawn(initial,DOCTOR).x||doctor.z!==pawn(initial,DOCTOR).z||!!doctor.motion&&doctor.motion.end>s.tick)){
        await capture('approach',w=>{expect(pawn(w,DOCTOR).tend).toMatchObject({drafted:true,patientId:GAEL,phase:'approach'});
          expect(pawn(w,DOCTOR).x!==pawn(initial,DOCTOR).x||pawn(w,DOCTOR).z!==pawn(initial,DOCTOR).z||!!pawn(w,DOCTOR).motion).toBe(true);});await run();continue;
      }
      const treated=patient.health?.injuries.filter(i=>untended.includes(i.id)&&i.tended!==undefined)??[];
      const event=work?s.events.find(v=>v.tick>work!.tick&&v.tick<=s.tick&&v.message.startsWith(doctor.name+' a traité ')&&v.message.includes('de '+patient.name)&&v.message.endsWith('sans médicament.')):undefined;
      const earned=doctor.skills.medicine.dailyXp>initialSkill.dailyXp&&(doctor.skills.medicine.xp>initialSkill.xp||doctor.skills.medicine.level>initialSkill.level);
      if(treated.length&&work&&event&&earned&&has('tend')&&has('approach')){
        e.notes.push({tick:s.tick,firstActualTreatment:{injuries:treated,work,event,skillBefore:initialSkill,skillAfter:doctor.skills.medicine}});
        await capture('first-treated',w=>expect(pawn(w,GAEL).health!.injuries.some(i=>untended.includes(i.id)&&i.tended!==undefined)).toBe(true));completed=true;break;
      }
      if(doctor.tend?.drafted&&doctor.tend.patientId===GAEL&&doctor.tend.phase==='tend'&&doctor.tend.progress>0){
        expect(Math.abs(doctor.x-patient.x)+Math.abs(doctor.z-patient.z)).toBe(1);expect(doctor.tend.medicine).toBeUndefined();expect(doctor.tend.useMedicine).toBeUndefined();
        work??={tick:s.tick,progress:doctor.tend.progress,skill:doctor.skills.medicine};
        if(!has('tend')){await capture('tend',w=>expect(pawn(w,DOCTOR).tend).toMatchObject({drafted:true,patientId:GAEL,phase:'tend'}));await run();continue;}
      }else if(!treated.length)work=undefined;
      await page.waitForTimeout(150);
    }
    if(!completed)throw Error('Three-minute recovery attempt budget reached; partial real outcome preserved.');expect(errors).toEqual([]);
  }catch(error){failure=error;e?.notes.push({failure:String(error),ui:await page.evaluate(()=>({notice:document.querySelector('#notice')?.textContent,
      order:document.querySelector('[data-order-drafted-tend]')?.textContent,reason:document.querySelector<HTMLButtonElement>('[data-order-drafted-tend]')?.title}))});throw error;}
  finally{
    let exportFailure:unknown;if(loaded&&failure)try{await capture('failure-outcome',undefined,false);}catch(error){exportFailure=error;e.notes.push({exportFailure:String(error)});}
    const path=info.outputPath('colony-recovery-summary.json');await writeFile(path,JSON.stringify({input,inputSha256:raw?sha(raw):null,elapsedMs:Date.now()-started,
      result:failure||exportFailure?'partial-failure':completed?'first-dry-treatment':'not-loaded',failure:String(failure??exportFailure??''),
      qualification:'One literal natural casualty branch and first dry treatment only; no cure, safe reserve, hostile expiry or durable campaign recovery certified.',evidence:e??null,last,errors,observations:ring},null,2));
    await info.attach('colony-recovery-summary',{contentType:'application/json',path});
  }
});