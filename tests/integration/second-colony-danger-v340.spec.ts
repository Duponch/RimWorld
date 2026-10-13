import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
import {perform} from './player-actions';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {shotPlan,shootingQueries} from '../../src/sim/shooting';
import {BLOOD_UNIT} from '../../src/sim/injury-rules';
import {violentWorkRefusal} from '../../src/sim/colonist-backgrounds';
import type {Pawn,Command,World,WorldEvent} from '../../src/sim/types';

// Opt-in literal V340 continuation. UI commands only; ROOT owns execution.
const IDS=[18530,18532,18534],GAEL=18532,ENEMY=18565,SEED=3398550437;
const INPUT_SHA='3773d1d2bf181083692a9c8da50ac98aa060feb68eaea9151b613c57471fadcb';
const ORIGIN_SHA='e6eea52468ce91196a2a3b816b1df488e09acf47a498bfddb6891bb810a21925';
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
type Evidence={version:number;seed:number;people:number[];snapshotSha256:string;snapshotTick:number;
  origin:{tick:number;sha256:string};harvest?:unknown;cargo?:unknown;products:unknown[];eaten:unknown[];
  notes:unknown[];events:WorldEvent[];checkpoints:{name:string;path:string;tick:number;sha256:string;reloaded:boolean;bilan:unknown}[];
  defense?:{originSha256:string;originTick:number;responses:unknown[]};[key:string]:unknown};
const capable=(p:Pawn)=>!p.health?.death&&!['dead','downed'].includes(p.state)&&!p.mental?.crisis&&!p.prisoner;
async function observe(page:Page){return page.evaluate(({ids,enemy})=>{
  const w=window.__lisiere.world,active=(a:{state:string;health?:{death?:unknown}})=>!a.health?.death&&!['dead','downed'].includes(a.state);
  return {tick:w.tick,seed:w.seed,backend:window.__lisiere.backend,incident:window.__lisiere.incident,
    people:w.pawns.filter(p=>ids.includes(p.id)),enemy:w.wildlife?.animals.find(a=>a.id===enemy),events:w.events,
    danger:[...(w.wildlife?.animals??[]).filter(a=>active(a)&&a.manhunter&&!a.manhunter.exhausted).map(a=>({id:a.id,x:a.x,z:a.z})),
      ...w.pawns.filter(p=>active(p)&&p.faction==='outlaws'&&!p.prisoner&&!p.raid?.exiting).map(p=>({id:p.id,x:p.x,z:p.z})),
      ...(w.mechanoids??[]).filter(active).map(m=>({id:m.id,x:m.x,z:m.z}))]};
},{ids:IDS,enemy:ENEMY});}
type Observation=Awaited<ReturnType<typeof observe>>;

test('V340 real manhunter intervention and exact civilian continuation',async({page},info)=>{
  test.skip(!process.env.V340_DEFENSE_INPUT,'Requires an acquired V340 export and SHA-bound sidecar.');test.setTimeout(480_000);
  const started=Date.now(),deadline=started+420_000,input=resolve(process.env.V340_DEFENSE_INPUT!),errors=observeErrors(page),rotation={value:0};
  let e!:Evidence,raw='',loaded=false,failure:unknown,resolved=false,last:Observation|undefined,civilianAt=0,lastLogAt=0;
  const ring:Observation[]=[],front=()=>page.locator('.front-menu'),closeContact=process.env.V340_CLOSE_CONTACT==='1',openRifle=process.env.V340_OPEN_RIFLE==='1';
  const guardPost=openRifle?{x:120,z:118}:{x:126,z:114};
  let healthSignature='';const baselineHealth=new Map<number,{severity:number;health:Pawn['health']}>();
  const act=async(command:Command,reason:string)=>{await perform(page,{command,reason},rotation);await page.keyboard.press('Escape');};
  const run=async()=>{await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
  const people=(w:World)=>w.pawns.filter(p=>IDS.includes(p.id));
  const capture=async(name:string,reload=true)=>{
    await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);
    expect(people(before).map(p=>p.id).sort((a,b)=>a-b)).toEqual(IDS);
    await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
    const manager=page.locator('[data-save-manager]'),label='V340 '+name;
    await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();
    await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
    const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
    const path=info.outputPath(name+'.json');await(await download).saveAs(path);const data=await readFile(path,'utf8');expect(deserializeWorld(data)).toEqual(before);
    last=await observe(page);const record={name,path,tick:before.tick,sha256:sha(data),reloaded:false,bilan:{people:last.people,enemy:last.enemy,danger:last.danger}};
    e.checkpoints.push(record);e.snapshotSha256=record.sha256;e.snapshotTick=before.tick;
    if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});
      await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
    await writeFile(path+'.evidence.json',JSON.stringify(e,null,2));await info.attach(name,{contentType:'application/json',path});
    await page.keyboard.press('Escape');return before;
  };
  try{
    raw=await readFile(input,'utf8');const initial=deserializeWorld(raw);expect(validateWorld(initial)).toEqual([]);
    if(openRifle){expect(closeContact).toBe(false);expect([sha(raw),initial.tick]).toEqual([INPUT_SHA,66123]);}
    e=JSON.parse(await readFile(resolve(process.env.V340_DEFENSE_EVIDENCE??input+'.evidence.json'),'utf8')) as Evidence;
    expect([e.version,e.seed,e.snapshotTick,e.snapshotSha256]).toEqual([340,SEED,initial.tick,sha(raw)]);expect(e.people).toEqual(IDS);
    expect([e.origin.tick,e.origin.sha256]).toEqual([39073,ORIGIN_SHA]);expect(e.harvest).toBeTruthy();expect(e.cargo).toBeTruthy();expect(e.products.length).toBeGreaterThanOrEqual(4);
    expect([initial.seed,initial.width,initial.height]).toEqual([SEED,250,250]);expect(people(initial).map(p=>p.id).sort((a,b)=>a-b)).toEqual(IDS);
    if(!e.defense){expect([sha(raw),initial.tick]).toEqual([INPUT_SHA,66123]);e.defense={originSha256:sha(raw),originTick:initial.tick,responses:[]};}
    expect([e.defense.originSha256,e.defense.originTick]).toEqual([INPUT_SHA,66123]);
    expect(initial.piles.find(p=>p.id===18558)).toMatchObject({item:'bolt-action-rifle',owner:{type:'equipment',pawnId:GAEL}});
    expect(initial.structures.find(s=>s.id===18648)).toMatchObject({kind:'door',x:125,z:114});
    expect(initial.structures.find(s=>s.id===19081)).toMatchObject({kind:'sleeping-spot',x:124,z:112});
    await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);
    await expectWorld(page,initial);await pause(page);expect(await world(page)).toEqual(initial);loaded=true;
    last=await observe(page);expect(last.backend).toBe('WebGPU');expect(last.danger.map(a=>a.id)).toEqual([ENEMY]);expect(last.people.every(capable)).toBe(true);
    for(const p of last.people)baselineHealth.set(p.id,{severity:p.health?.injuries.reduce((n,i)=>n+i.severity,0)??0,health:p.health});
    if(closeContact){
      const gael=last.people.find(p=>p.id===GAEL)!;expect(Math.hypot(last.enemy!.x-gael.x,last.enemy!.z-gael.z)).toBeLessThan(1.421);
      expect(last.people.every(p=>p.draft&&p.hunger>8)).toBe(true);
      const profiles=last.people.map(p=>({id:p.id,background:p.background,refusal:violentWorkRefusal(p)??null}));
      const fightingIDs=last.people.filter(p=>capable(p)&&p.draft&&!violentWorkRefusal(p)).map(p=>p.id);expect(fightingIDs).toContain(GAEL);
      e.defense.responses.push({tick:last.tick,attemptSha256:sha(raw),attemptTick:initial.tick,action:'ROOT-authorized close contact; existing injuries and peaceful refusals retained',profiles,fightingIDs,health:last.people.map(p=>({id:p.id,health:p.health}))});
      await act({type:'melee',pawnIds:fightingIDs,targetId:ENEMY},'Contact réel : seuls les combattants capables et autorisés affrontent la gazelle');
      await expect.poll(async()=>people(await world(page)).filter(p=>fightingIDs.includes(p.id)).map(p=>p.melee?.order?.targetId)).toEqual(fightingIDs.map(()=>ENEMY));
      await expect.poll(async()=>people(await world(page)).filter(p=>fightingIDs.includes(p.id)).map(p=>p.melee?.order?.auto??null)).toEqual(fightingIDs.map(()=>null));
      e.defense.responses.push({tick:(await world(page)).tick,attemptSha256:sha(raw),action:'accepted real melee orders; peaceful civilians remain in refuge',pawnIds:fightingIDs,targetId:ENEMY});
    }else{
      // Ready witnesses accepted orders only; arrival remains a physical observation.
      if(openRifle)e.defense.responses.push({attemptSha256:sha(raw),attemptTick:initial.tick,alternativeReload:true,guardPost,
        action:'ROOT-authorized alternative branch loaded through the game; previous injured contact branch retained',
        previousContactFailureSha256:'8477b29fec55f7dbe657ec3df05bb4a4047b3fde123ca4b1f91bc9fb5a6f0560'});
      await act({type:'draft',pawnIds:[GAEL],enabled:true},'Mobiliser Gaël seul pour la menace naturelle');
      await act({type:'draft-move',pawnIds:[GAEL],target:guardPost,queue:false},'Poste extérieur réel choisi pour la défense');
      await expect.poll(async()=>{const p=(await world(page)).pawns.find(p=>p.id===GAEL);return p?.draft?.target;}).toEqual(guardPost);
    }
    e.notes.push({tick:(await world(page)).tick,intervention:'danger-ready',closeContact,openRifle,guardPost,qualification:'Orders accepted only; actual injuries remain recorded, no recovery credited.'});
    await capture('danger-ready');if(closeContact)civilianAt=Date.now();await run();
    while(Date.now()<deadline){
      const s=await observe(page);last=s;ring.push(s);if(ring.length>24)ring.shift();expect(s.seed).toBe(SEED);expect(s.backend).toBe('WebGPU');
      for(const event of s.events)if(event.tick>initial.tick&&!e.events.some(v=>v.tick===event.tick&&v.type===event.type&&v.message===event.message))e.events.push(event);
      if(s.incident.simulationStopped||s.incident.graphicsFault)throw Error('Technical incident; preserve the confirmed World.');
      if(s.people.length!==3||s.people.some(p=>!capable(p)))throw Error('Original person dead, downed, prisoner or in crisis; ROOT intervention required.');
      if(closeContact){const health=s.people.map(p=>({id:p.id,health:p.health,severity:p.health?.injuries.reduce((n,i)=>n+i.severity,0)??0,
        severityDelta:(p.health?.injuries.reduce((n,i)=>n+i.severity,0)??0)-(baselineHealth.get(p.id)?.severity??0)}));
        const signature=JSON.stringify(health);if(signature!==healthSignature){healthSignature=signature;e.notes.push({tick:s.tick,closeContactHealth:health});}}
      const serious=s.people.filter(p=>p.health&&(p.health.bloodLoss>=BLOOD_UNIT*.15||!closeContact&&p.health.injuries.reduce((n,i)=>n+i.severity,0)>=10000
        ||p.health.missing.some(m=>m.bornAt>=initial.tick)));
      if(closeContact&&s.people.some(p=>p.hunger<=8))throw Error('Critical hunger during brief contact; paused for ROOT.');
      if(serious.length)throw Error('Serious new damage; ordinary medical care deferred to ROOT.');
      if(s.danger.some(a=>a.id!==ENEMY)||s.danger.length>1)throw Error('Additional natural threat; pause for ROOT.');
      if(!s.danger.length){
        if(!s.enemy||!s.enemy.health?.death&&!['dead','downed'].includes(s.enemy.state)&&!s.enemy.manhunter?.exhausted)throw Error('Threat absent without confirmed terminal/exhausted state.');
        await pause(page);for(const p of people(await world(page)).filter(p=>p.draft&&capable(p)))await act({type:'draft',pawnIds:[p.id],enabled:false},'Reprise des besoins civils après la menace');
        expect(people(await world(page)).every(p=>!p.draft)).toBe(true);
        e.defense.responses.push({tick:(await world(page)).tick,action:'ordinary civilian continuation; medical care deferred to ROOT',enemy:s.enemy,people:s.people});
        await capture('danger-resolved');resolved=true;break;
      }
      const distance=Math.min(...s.people.map(p=>Math.hypot(s.enemy!.x-p.x,s.enemy!.z-p.z)));
      if(civilianAt&&(Date.now()-civilianAt>35000||s.people.some(p=>p.id!==GAEL&&p.draft&&p.hunger<=8)))throw Error('Hungry civilians held too long; paused for ROOT instead of prolonged mobilization.');
      if(!closeContact&&!civilianAt&&distance<60){
        await pause(page);for(const [id,target] of [[18530,{x:121,z:111}],[18534,{x:123,z:111}]] as const){
          const p=(await world(page)).pawns.find(p=>p.id===id)!;if(!capable(p))throw Error('Civilian became unavailable before refuge order.');
          await act({type:'draft',pawnIds:[id],enabled:true},'Refuge bref devant la menace proche');await act({type:'draft-move',pawnIds:[id],target,queue:false},'Intérieur de l’abri existant');
          await expect.poll(async()=>{const p=(await world(page)).pawns.find(p=>p.id===id);return p?.draft?.target;}).toEqual(target);
        }
        civilianAt=Date.now();e.defense.responses.push({tick:(await world(page)).tick,action:'accepted brief refuge orders',hunger:s.people.map(p=>({id:p.id,hunger:p.hunger}))});await run();
      }
      if(!closeContact&&distance<45){
        await pause(page);const w=await world(page),shooter=w.pawns.find(p=>p.id===GAEL)!,target=w.wildlife?.animals.find(a=>a.id===ENEMY);
        if(target&&target.manhunter&&!target.manhunter.exhausted&&!target.health?.death&&!['dead','downed'].includes(target.state)&&capable(shooter)&&shooter.draft){
          const plan=shotPlan(w,shooter,ENEMY,shootingQueries(w));
          if(!('reason' in plan)&&(shooter.shooting?.order?.targetId!==ENEMY||shooter.shooting?.order?.auto)){
            await act({type:'shoot',pawnIds:[GAEL],targetId:ENEMY},'Viser uniquement la gazelle avec un plan réel autorisé');
            await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===GAEL)?.shooting?.order?.targetId).toBe(ENEMY);
            await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===GAEL)?.shooting?.order?.auto??null).toBe(null);
            e.defense.responses.push({tick:w.tick,action:'accepted real rifle order',shooterId:GAEL,targetId:ENEMY});
          }
        }
        await run();
      }
      if(Date.now()-lastLogAt>=30000){lastLogAt=Date.now();console.log('V340 danger '+JSON.stringify({tick:s.tick,distance,enemy:s.enemy,
        people:s.people.map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,hunger:p.hunger,mood:p.mood,draft:p.draft,health:p.health}))}));}
      await page.waitForTimeout(openRifle&&distance<60?500:2000);
    }
    if(!resolved)throw Error('Seven-minute natural intervention budget reached; preserve a red continuation.');expect(errors).toEqual([]);
  }catch(error){failure=error;throw error;}
  finally{
    let exportFailure:unknown;if(loaded)try{if(failure||!resolved)await capture('failure-continuation',false);}catch(error){exportFailure=error;e.notes.push({exportFailure:String(error)});}
    const path=info.outputPath('second-danger-summary.json');await writeFile(path,JSON.stringify({input,inputSha256:raw?sha(raw):null,elapsedMs:Date.now()-started,
      result:failure||exportFailure?'partial-failure':resolved?'danger-resolved':'not-loaded',failure:String(failure??exportFailure??''),
      qualification:'Actual threat outcome and exact reload only; no new food ingestion, durable recovery or full campaign certified.',evidence:e??null,last,errors,observations:ring},null,2));
    await info.attach('second-danger-summary',{contentType:'application/json',path});if(!failure&&exportFailure)throw exportFailure;
  }
});