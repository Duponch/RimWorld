import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
import {perform} from './player-actions';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import type {World,Pawn,Command,WorldEvent} from '../../src/sim/types';

// Literal injured branch only. No fixtures, mutation, hostile-expiry assumption or cure claim.
const IDS=[18530,18532,18534],ACTOR=18530,PATIENT=18532,BED=19081,DOOR=18648,ENEMY=18565,SEED=3398550437;
const INPUT_SHA='8477b29fec55f7dbe657ec3df05bb4a4047b3fde123ca4b1f91bc9fb5a6f0560';
const ORIGIN_SHA='e6eea52468ce91196a2a3b816b1df488e09acf47a498bfddb6891bb810a21925';
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
type Ledger={version:342;seed:number;people:number[];origin:{path:string;tick:number;sha256:string};inheritedV340:unknown;
  snapshotTick?:number;snapshotSha256?:string;responses:unknown[];notes:unknown[];events:WorldEvent[];
  checkpoints:{name:string;path:string;tick:number;sha256:string;reloaded:boolean;proof:unknown}[]};
const capable=(p:Pawn)=>!p.health?.death&&!['downed','dead'].includes(p.state)&&!p.prisoner&&!p.mental?.crisis;
async function observe(page:Page){return page.evaluate(({ids,bed,door,enemy})=>{
  const w=window.__lisiere.world;return {tick:w.tick,seed:w.seed,backend:window.__lisiere.backend,incident:window.__lisiere.incident,
    people:w.pawns.filter(p=>ids.includes(p.id)),bed:w.structures.find(s=>s.id===bed),door:w.structures.find(s=>s.id===door),
    enemy:w.wildlife?.animals.find(a=>a.id===enemy),medicine:w.piles.filter(p=>['medicine','herbal-medicine','glitterworld-medicine'].includes(p.item)),events:w.events};
},{ids:IDS,bed:BED,door:DOOR,enemy:ENEMY});}
type Observation=Awaited<ReturnType<typeof observe>>;
const pair=(w:World)=>({actor:w.pawns.find(p=>p.id===ACTOR)!,patient:w.pawns.find(p=>p.id===PATIENT)!});
const carried=(w:World)=>{const {actor,patient}=pair(w);expect(actor.rescue).toMatchObject({patientId:PATIENT,bedId:BED,phase:'carry'});
  expect([patient.x,patient.z,patient.moveCooldown,patient.motion]).toEqual([actor.x,actor.z,actor.moveCooldown,actor.motion]);};
const dropped=(w:World)=>{const {actor,patient}=pair(w);expect(actor.rescue).toBeUndefined();expect([patient.x,patient.z]).toEqual([124,112]);
  expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:BED,target:{x:124,z:112}});expect(patient.motion).toBeNull();};

test('V342 literal casualty, real rescue custody and first ordinary treatment',async({page},info)=>{
  test.skip(!process.env.V342_INPUT,'Requires the acquired V340 contact-loss export and its SHA-bound sidecar.');test.setTimeout(240000);
  page.setDefaultTimeout(10000);const started=Date.now(),deadline=started+180000,input=resolve(process.env.V342_INPUT!),errors=observeErrors(page),rotation={value:0};
  let e!:Ledger,raw='',loaded=false,failure:unknown,last:Observation|undefined,completed=false,tendOrdered=false;
  let work:{tick:number;progress:number}|undefined;const ring:Observation[]=[],front=()=>page.locator('.front-menu');
  const has=(name:string)=>e.checkpoints.some(c=>c.name===name&&c.reloaded);
  const run=async()=>{await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
  const act=async(command:Command,reason:string)=>{try{await perform(page,{command,reason},rotation);await page.keyboard.press('Escape');}
    catch(error){e.responses.push({command,reason,error:String(error),ui:await page.evaluate(()=>({notice:document.querySelector('#notice')?.textContent,
      actions:[...document.querySelectorAll<HTMLButtonElement>('[data-order-rescue],[data-order-tend]')].map(b=>({text:b.textContent,title:b.title,disabled:b.disabled}))}))});throw error;}};
  const capture=async(name:string,qualify?:(w:World)=>void,reload=true)=>{
    await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);qualify?.(before);
    expect(before.pawns.filter(p=>IDS.includes(p.id)).map(p=>p.id).sort((a,b)=>a-b)).toEqual(IDS);
    last=await observe(page);await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
    const manager=page.locator('[data-save-manager]'),label='V342 '+name;await manager.locator('[data-save-manager-name]').fill(label);
    await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
    const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
    const path=info.outputPath(name+'.json');await(await download).saveAs(path);const data=await readFile(path,'utf8');expect(deserializeWorld(data)).toEqual(before);
    const record={name,path,tick:before.tick,sha256:sha(data),reloaded:false,proof:last};e.checkpoints.push(record);e.snapshotTick=before.tick;e.snapshotSha256=record.sha256;
    if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});
      await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
    await writeFile(path+'.evidence.json',JSON.stringify(e,null,2));await info.attach(name,{contentType:'application/json',path});await page.keyboard.press('Escape');return before;
  };
  try{
    raw=await readFile(input,'utf8');const initial=deserializeWorld(raw);expect(validateWorld(initial)).toEqual([]);expect([sha(raw),initial.tick]).toEqual([INPUT_SHA,66431]);
    const side=JSON.parse(await readFile(resolve(process.env.V342_EVIDENCE??input+'.evidence.json'),'utf8'));
    expect([side.version,side.seed,side.snapshotTick,side.snapshotSha256]).toEqual([340,SEED,66431,INPUT_SHA]);expect(side.people).toEqual(IDS);
    expect([side.origin.tick,side.origin.sha256]).toEqual([39073,ORIGIN_SHA]);expect([initial.seed,initial.width,initial.height]).toEqual([SEED,250,250]);
    e={version:342,seed:SEED,people:IDS,origin:{path:input,tick:initial.tick,sha256:sha(raw)},inheritedV340:side,responses:[],notes:[],events:[],checkpoints:[]};
    const baseline=pair(initial),actorInjuries=baseline.actor.health?.injuries??[],untended=baseline.patient.health!.injuries.filter(i=>i.tended===undefined).map(i=>i.id);
    expect(baseline.patient.state).toBe('downed');expect(baseline.patient.health?.death).toBeUndefined();expect(capable(baseline.actor)).toBe(true);
    expect(baseline.actor.priorities.doctor).toBe(1);expect(initial.pawns.find(p=>p.id===18534)?.draft).toBeTruthy();
    expect(initial.structures.find(s=>s.id===BED)).toMatchObject({kind:'sleeping-spot',medical:true,x:124,z:112});expect(initial.structures.some(s=>s.id===DOOR)).toBe(true);
    expect(initial.wildlife?.animals.find(a=>a.id===ENEMY)?.manhunter?.exhausted).not.toBe(true);
    await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);
    await expectWorld(page,initial);await pause(page);expect(await world(page)).toEqual(initial);loaded=true;
    await act({type:'draft',pawnIds:[ACTOR],enabled:false},'Démobiliser Iris avant le secours civil réel');
    expect(pair(await world(page)).actor.draft).toBeUndefined();
    await act({type:'order-rescue',pawnId:ACTOR,patientId:PATIENT,queue:false},'Secours prioritaire réel vers le couchage médical existant, menace conservée');
    e.responses.push({tick:(await world(page)).tick,action:'accepted rescue order only; active threat and peaceful refuge retained',actorId:ACTOR,patientId:PATIENT,bedId:BED});
    await capture('rescue-order',w=>expect(pair(w).actor.rescue).toMatchObject({patientId:PATIENT,bedId:BED,phase:'approach'}));await run();
    while(Date.now()<deadline){
      const s=await observe(page);last=s;ring.push(s);if(ring.length>20)ring.shift();expect(s.seed).toBe(SEED);expect(s.backend).toBe('WebGPU');
      for(const event of s.events)if(event.tick>initial.tick&&!e.events.some(v=>v.tick===event.tick&&v.type===event.type&&v.message===event.message))e.events.push(event);
      const actor=s.people.find(p=>p.id===ACTOR)!,patient=s.people.find(p=>p.id===PATIENT)!;
      if(s.incident.graphicsFault||s.incident.simulationStopped)throw Error('Technical incident; confirmed outcome preserved.');
      if(s.people.length!==3||s.people.filter(p=>p.id!==PATIENT).some(p=>!capable(p))||patient.health?.death||patient.state==='dead')throw Error('Patient death or another original person unavailable; real outcome retained.');
      if(!s.door)throw Error('Shelter door destroyed; pause the exposed rescue attempt.');
      if(actor.health?.injuries.some(i=>i.severity>0&&(!actorInjuries.some(b=>b.id===i.id)||i.severity>(actorInjuries.find(b=>b.id===i.id)?.severity??0))))throw Error('First actual injury to Iris during rescue; pause for ROOT.');
      if(actor.rescue?.phase==='approach'&&!has('rescue-approach')&&(actor.x!==baseline.actor.x||actor.z!==baseline.actor.z||!!actor.motion)){
        await capture('rescue-approach',w=>{const d=pair(w).actor;expect(d.rescue).toMatchObject({patientId:PATIENT,bedId:BED,phase:'approach'});
          expect(d.x!==baseline.actor.x||d.z!==baseline.actor.z||!!d.motion,'Actual approach movement, not the accepted task alone').toBe(true);});await run();continue;
      }
      if(actor.rescue?.phase==='carry'&&!has('rescue-carry')){await capture('rescue-carry',carried);await run();continue;}
      if(!actor.rescue&&patient.need?.kind==='sleep'&&patient.need.bedId===BED&&patient.need.phase==='sleep'&&!has('medical-drop')){
        if(!has('rescue-carry'))throw Error('Medical drop seen without observed carried custody; no rescue credit.');
        await capture('medical-drop',dropped);await run();continue;
      }
      if(has('medical-drop')&&!tendOrdered){await pause(page);expect(pair(await world(page)).actor.draft).toBeUndefined();
        await act({type:'order-tend',pawnId:ACTOR,patientId:PATIENT,queue:false},'Premier soin ordinaire au chevet médical, sans guérison promise');
        tendOrdered=true;e.responses.push({tick:(await world(page)).tick,action:'accepted first treatment order only'});await run();continue;}
      const medicine=actor.tend?.medicine,pile=s.medicine.find(p=>p.id===medicine?.carryPileId);
      if(medicine&&pile&&pile.owner.type==='pawn'&&pile.owner.pawnId===ACTOR&&pile.quantity===medicine.quantity&&!has('medicine-cargo')){
        await capture('medicine-cargo',w=>{const d=pair(w).actor,m=d.tend?.medicine,p=w.piles.find(p=>p.id===m?.carryPileId);
          expect(m).toBeTruthy();expect(p).toMatchObject({item:m!.item,quantity:m!.quantity,owner:{type:'pawn',pawnId:ACTOR}});});await run();continue;
      }
      const treated=patient.health?.injuries.filter(i=>untended.includes(i.id)&&i.tended!==undefined)??[];
      const event=work?s.events.find(v=>v.tick>work!.tick&&v.tick<=s.tick&&v.message.startsWith(actor.name+' a traité ')&&v.message.includes('de '+patient.name)):undefined;
      if(treated.length&&work&&event&&has('rescue-approach')&&has('medical-drop')){e.notes.push({tick:s.tick,firstActualTreatment:{injuries:treated,work,event}});
        await capture('first-tend',w=>expect(pair(w).patient.health?.injuries.some(i=>untended.includes(i.id)&&i.tended!==undefined)).toBe(true));completed=true;break;}
      if(actor.tend?.patientId===PATIENT&&actor.tend.phase==='tend'&&actor.tend.progress>0&&Math.abs(actor.x-patient.x)+Math.abs(actor.z-patient.z)===1)
        work??={tick:s.tick,progress:actor.tend.progress};
      else if(!treated.length)work=undefined;
      await page.waitForTimeout(150);
    }
    if(!completed)throw Error('Three-minute physical rescue/treatment budget reached; acquired partial outcome only.');expect(errors).toEqual([]);
  }catch(error){failure=error;throw error;}
  finally{
    let exportFailure:unknown;if(loaded)try{await capture(failure?'failure-outcome':'outcome',undefined,!failure);}catch(error){exportFailure=error;e.notes.push({exportFailure:String(error)});}
    const path=info.outputPath('colony-rescue-summary.json');await writeFile(path,JSON.stringify({input,inputSha256:raw?sha(raw):null,elapsedMs:Date.now()-started,
      result:failure||exportFailure?'partial-failure':completed?'physical-rescue-and-first-tend':'not-loaded',failure:String(failure??exportFailure??''),
      qualification:'Unsafe UI-allowed rescue attempt; real losses are ordinary outcomes. No cure, full recovery, hostile expiry or campaign success certified.',evidence:e??null,last,errors,observations:ring},null,2));
    await info.attach('colony-rescue-summary',{contentType:'application/json',path});if(!failure&&exportFailure)throw exportFailure;
  }
});