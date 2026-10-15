/* PRIVATE ROOT preparation. Adoption: tests/integration/raid-defense-infection-driver.ts.
 * New explicit infection/care mandate from real74727; every earlier ledger remains forbidden. */
import {expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors,settledCells} from './helpers';
import {perform,revealCells} from './player-actions';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {doorOpenness} from '../../src/sim/door-rules';
import {structureMaxHp} from '../../src/sim/thing-damage-rules';
import {violentWorkRefusal} from '../../src/sim/colonist-backgrounds';
import {meleeContact} from '../../src/sim/melee-space';
import {meleeTools} from '../../src/sim/melee-statistics';
import {tendingReason} from '../../src/sim/tending';
import {draftedTendingReason,draftedTendingProposal} from '../../src/sim/drafted-tending';
import {blockedCells,reachableCells} from '../../src/sim/pathfinding';
import {rescueReason} from '../../src/sim/rescue';
import {currentMedicalBed} from '../../src/sim/hospital-medical-stats';
import {treatmentTarget,treatmentTargets} from '../../src/sim/care-rules';
import type {World,Pawn,Command,Cell} from '../../src/sim/types';

const SOURCE='tmp/early-access-defense/contact-74657/native-01/raid-defense-contact-Real--3a717-ical-care-from-injured74657/';
const INPUT=SOURCE+'conservation.json',INPUT_SHA='93a013da2fcd85964af6f47ab592b0fafc223fa75f9ed900044e035175309090';
const PARENT_SHA='4a92616e2e7547a76a01900fa5ac465c3af5ad8a27393a5bd6a97f6bb3656d48';
const ORIGINALS=[18530,18532,18534],PATIENTS=[19768,19771],IRIS=18530,GAEL=18532,LEONIE=18534,VISITOR=19771,INFECTION=1,ENEMY=19852,DOOR=18648,RIFLE=18558,END=75327;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const stationary=(w:World,p:Pawn)=>p.moveCooldown===0&&(p.motion?.end??w.tick)<=w.tick;
const inside=(c:Cell)=>c.x>=121&&c.x<=124&&c.z>=111&&c.z<=114;
const person=(w:World,id:number)=>w.pawns.find(p=>p.id===id)??w.visitors?.departed.find(d=>d.pawn.id===id)?.pawn;
const pawn=(w:World,id:number)=>w.pawns.find(p=>p.id===id)!;
const owned=(w:World,id:number)=>[...w.piles,...(w.visitors?.departed.find(d=>d.pawn.id===id)?.items??[])].filter(p=>'pawnId' in p.owner&&p.owner.pawnId===id);
class Stop extends Error{constructor(readonly reason:string,readonly detail:unknown){super(reason);}}

export async function runRaidDefenseInfection(page:Page,info:TestInfo){
 expect(process.env.DEFENSE_INFECTION_WRAPPER).toBe('1');page.setDefaultTimeout(10000);
 const segment=process.env.DEFENSE_INFECTION_SEGMENT!,seconds=Number(process.env.DEFENSE_INFECTION_BODY_SECONDS??150);expect(segment).toMatch(/^[a-zA-Z0-9_-]{1,32}$/);expect(seconds>=100&&seconds<=150).toBe(true);
 const raw=await readFile(INPUT,'utf8');expect(hash(raw)).toBe(INPUT_SHA);const initial=deserializeWorld(raw);expect(initial).toEqual({...JSON.parse(raw),schemaVersion:initial.schemaVersion});expect(initial.tick).toBe(74727);expect(initial.schemaVersion).toBe(238);expect(validateWorld(initial)).toEqual([]);
 const parentText=await readFile(SOURCE+'ledger.json','utf8');expect(hash(parentText)).toBe(PARENT_SHA);const parent=JSON.parse(parentText);expect(parent.resumeAllowed).toBe(false);expect(parent.stop).toBe('new-infection');expect(parent.checkpoint).toMatchObject({sha256:INPUT_SHA,tick:74727,reloaded:false});
 expect(initial.raids?.active).toMatchObject({id:2,phase:'assault',deadline:77465,members:[ENEMY]});expect(initial.piles.find(p=>p.id===RIFLE)).toMatchObject({item:'bolt-action-rifle',quantity:1,owner:{type:'equipment',pawnId:GAEL}});
 const errors=observeErrors(page),lifecycle:unknown[]=[],journal:unknown[]=[],ring:unknown[]=[],actions:unknown[]=[],geometry:unknown[]=[],combatTrace:unknown[]=[],structuralDamage:unknown[]=[],breaches:unknown[]=[],clinicalTrace:unknown[]=[],clinicalMilestones:unknown[]=[],gaelInjuries=new Set<number>(pawn(initial,GAEL).health?.injuries.map(i=>i.id)??[]),meleeStrikes=new Set<number>(),enemyInjuries=new Set<number>(pawn(initial,ENEMY).health?.injuries.map(i=>i.id)??[]),enemyStrikes=new Set<number>(),checkpoints:{name:string;path:string;sha256:string;tick:number;reloaded:boolean}[]=[],rotation={value:0};
 const started=Date.now();let visitorCareMode:string='dry',gaelCareMode:string='combat',infectionTreatedAt:number|undefined,rescueDepositedAt:number|undefined;let bodyStarted=started,deadline=Infinity,observeUntil=Infinity,loaded=false,finalizing=false,last:World|undefined,stage='input',stop='not-started',failure:unknown,exportFailure:unknown,fallback:unknown,backend:unknown,lastJournal=-1,lastKey='',civilSheltered=false,retreating=false,isolated=false,clinicalComplete=false,inheritedMeleeAt:number|undefined,raidOutcome:unknown;
 const injuries=new Map([...ORIGINALS,...PATIENTS].map(id=>[id,new Set(person(initial,id)?.health?.injuries.map(i=>i.id)??[])])),missing=new Map([...ORIGINALS,...PATIENTS].map(id=>[id,new Set(person(initial,id)?.health?.missing.map(i=>i.part)??[])])),infections=new Map([...ORIGINALS,...PATIENTS].map(id=>[id,new Set(person(initial,id)?.health?.infections?.cases.map(i=>i.id)??[])]));
 const property=PATIENTS.flatMap(id=>owned(initial,id).filter(p=>p.kind!=='food').map(p=>structuredClone(p))),initialDamage=new Map(initial.structures.map(s=>[s.id,s.damage??0]));
 const damageSeen=new Map(initialDamage);for(const s of initial.structures)if((s.damage??0)>0)structuralDamage.push({kind:'inherited-damage',tick:initial.tick,id:s.id,damage:s.damage,maxHp:structureMaxHp(s)});
 const push=(a:unknown[],v:unknown,max=192)=>{a.push(v);if(a.length>max)a.shift();};
 const crash=()=>lifecycle.push({kind:'pagecrash',elapsedMs:Date.now()-started}),closed=()=>lifecycle.push({kind:'pageclose',elapsedMs:Date.now()-started}),disconnected=()=>lifecycle.push({kind:'browserdisconnected',elapsedMs:Date.now()-started});page.on('crash',crash);page.on('close',closed);const browser=page.context().browser();browser?.on('disconnected',disconnected);
 const guard=(w:World)=>{
  if(errors.length||lifecycle.length)throw new Stop('technical-event',{errors,lifecycle});
  for(const id of [...ORIGINALS,...PATIENTS]){const p=person(w,id);if(!p||p.state==='dead'||p.health?.death)throw new Stop('protected-death-or-loss',{id,tick:w.tick,p});if(ORIGINALS.includes(id)&&(p.state==='downed'||p.mental?.crisis||p.collapsePending))throw new Stop('original-incapacity',{id,tick:w.tick,p});
   if(ORIGINALS.includes(id)&&p.hunger<=12.5)throw new Stop('original-hunger-intervention-required',{id,tick:w.tick,hunger:p.hunger});
   if(id!==GAEL&&(p.health?.injuries.some(i=>!injuries.get(id)!.has(i.id))||p.health?.missing.some(i=>!missing.get(id)!.has(i.part))))throw new Stop('first-other-protected-injury',{id,tick:w.tick,p});
   if(p.health?.infections?.cases.some(i=>!infections.get(id)!.has(i.id)))throw new Stop('new-infection',{id,tick:w.tick,p});
   if(PATIENTS.includes(id)){expect(p).toMatchObject({faction:'outlanders',visitor:{group:5}});expect(p.visitor?.medicalGuestAt).toBe(person(initial,id)?.visitor?.medicalGuestAt);}
  }
  for(const [id,damage] of initialDamage){const s=w.structures.find(s=>s.id===id);if(!s){if(id===18663){if(!breaches.length){breaches.push({kind:'actual-west-wall-breach',id,tick:w.tick,previousDamage:damageSeen.get(id),qualification:'Wall really absent; no isolation claim'});isolated=false;}continue;}throw new Stop('other-structure-destruction',{id,tick:w.tick,damageBefore:damage});}const maximum=structureMaxHp(s),current=s.damage??0,previous=damageSeen.get(id)??damage;
   if(current!==previous){structuralDamage.push({kind:'actual-structure-damage-change',id,tick:w.tick,damageBefore:previous,damageNow:current,maxHp:maximum,remaining:maximum-current,repairQualified:false});damageSeen.set(id,current);}
   if(id!==18663&&maximum>0&&maximum-current<=maximum*.5)throw new Stop('structure-critical-hp',{id,tick:w.tick,s,maxHp:maximum,remaining:maximum-current});
  }
  if(w.pawns.some(p=>p.id!==ENEMY&&p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state))||w.wildlife?.animals.some(a=>a.manhunter&&!['dead','downed'].includes(a.state))||w.fires?.items.length||(w.raids?.serial??0)!==2)throw new Stop('new-danger',{tick:w.tick,raids:w.raids});
  const enemy=w.pawns.find(p=>p.id===ENEMY);if(enemy&&!['dead','downed'].includes(enemy.state)&&(inside(enemy)||enemy.motion&&enemy.motion.end>w.tick&&(inside(enemy.motion.from)||inside(enemy.motion.to))))push(journal,{kind:'actual-enemy-entry-or-entering-edge',tick:w.tick,enemy});
  if(civilSheltered)for(const id of [IRIS,LEONIE])if(!inside(pawn(w,id)))throw new Stop('civilian-left-refuge',{id,tick:w.tick});
  if(isolated&&(!w.structures.find(s=>s.id===DOOR)?.door?.forbidden||w.structures.find(s=>s.id===DOOR)?.door?.open||doorOpenness(w.structures.find(s=>s.id===DOOR)!,w.tick)!==0||ORIGINALS.some(id=>!inside(pawn(w,id)))))throw new Stop('isolation-lost',{tick:w.tick});
  for(const old of property){const id='pawnId' in old.owner?old.owner.pawnId:0;expect(owned(w,id).find(p=>p.id===old.id)).toMatchObject({id:old.id,item:old.item,quantity:old.quantity,owner:old.owner});}
  expect(w.piles.find(p=>p.id===RIFLE)).toMatchObject({item:'bolt-action-rifle',owner:{type:'equipment',pawnId:GAEL}});
  if(!finalizing&&w.tick>=END)throw new Stop('tick-bound',{tick:w.tick,overshoot:w.tick-END});if(!finalizing&&Date.now()>deadline)throw new Stop('body-bound',{tick:w.tick,stage});
 };
 const sample=(w:World)=>({tick:w.tick,stage,people:[...ORIGINALS,...PATIENTS,ENEMY].map(id=>person(w,id)),door:w.structures.find(s=>s.id===DOOR),doorFraction:w.structures.find(s=>s.id===DOOR)?doorOpenness(w.structures.find(s=>s.id===DOOR)!,w.tick):null,rifle:w.piles.find(p=>p.id===RIFLE),piles:w.piles.filter(p=>p.kind==='food'||p.kind==='medicine'||p.kind==='weapon'),raids:w.raids,events:w.events.slice(-15),projectiles:w.projectiles});
 const read=async(conserve=false)=>{
  const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);
  if(!finalizing){
   const g=pawn(w,GAEL),v=pawn(w,VISITOR),doctor=pawn(w,IRIS),enemy=w.pawns.find(p=>p.id===ENEMY);
   for(const injury of enemy?.health?.injuries??[])if(!enemyInjuries.has(injury.id)){enemyInjuries.add(injury.id);combatTrace.push({kind:'additional-enemy-injury',observedTick:w.tick,targetId:ENEMY,injury:structuredClone(injury),qualification:'Actual injury; attribution limited to observed combat state'});}
   if(g.melee?.strike&&g.melee.strike.atCore>initial.tick*10&&!meleeStrikes.has(g.melee.strike.atCore)){meleeStrikes.add(g.melee.strike.atCore);combatTrace.push({kind:'actual-gael-melee-strike',observedTick:w.tick,strike:structuredClone(g.melee.strike),motion:g.motion,stagger:g.stagger});}
   if(enemy?.melee?.strike&&enemy.melee.strike.atCore>initial.tick*10&&!enemyStrikes.has(enemy.melee.strike.atCore)){enemyStrikes.add(enemy.melee.strike.atCore);combatTrace.push({kind:'actual-enemy-melee-strike',observedTick:w.tick,strike:structuredClone(enemy.melee.strike),motion:enemy.motion,stagger:enemy.stagger});}
   for(const injury of g.health?.injuries??[])if(!gaelInjuries.has(injury.id)){gaelInjuries.add(injury.id);combatTrace.push({kind:'additional-gael-injury-conserved',tick:w.tick,injury:structuredClone(injury),bloodLoss:g.health?.bloodLoss,motion:g.motion,stagger:g.stagger});}
   const infection=v.health?.infections?.cases.find(c=>c.id===INFECTION);
   if(infection?.tend&&infectionTreatedAt===undefined){infectionTreatedAt=w.tick;clinicalMilestones.push({kind:'actual-existing-infection-tend-observed',tick:w.tick,patientId:VISITOR,infection:structuredClone(infection),doctor:structuredClone(doctor),qualification:'Tend persisted, not infection cured; the real quality/expiry and dry or medicine task remain visible'});}
   push(clinicalTrace,{tick:w.tick,visitorCareMode,gaelCareMode,visitor:{id:v.id,state:v.state,need:v.need,health:v.health,medicalSleep:v.medicalSleep,currentBed:currentMedicalBed(w,v)},gael:{id:g.id,state:g.state,need:g.need,health:g.health,medicalSleep:g.medicalSleep,currentBed:currentMedicalBed(w,g)},doctor:{id:doctor.id,state:doctor.state,draft:doctor.draft,tend:doctor.tend,rescue:doctor.rescue},medicine:w.piles.filter(p=>p.kind==='medicine'),events:w.events.filter(e=>e.tick>initial.tick&&(e.message.includes('de Gaël')||e.message.includes(v.name)))},256);
  }
  const value=sample(w);push(ring,value,16);const key=JSON.stringify([stage,visitorCareMode,gaelCareMode,...w.pawns.filter(p=>ORIGINALS.includes(p.id)||p.id===ENEMY||p.id===VISITOR).map(p=>[p.id,p.state,p.melee?.strike,p.tend?.phase,p.rescue?.phase,p.need?.kind]),w.raids?.active?.phase]);
  if(w.tick-lastJournal>=20||key!==lastKey){push(journal,value,256);lastJournal=w.tick;lastKey=key;}
  // Record the dangerous adopted state before a guard can stop this mandate.
  if(!conserve){guard(w);const technical=await page.evaluate(()=>window.__lisiere.incident);if(technical.graphicsFault||technical.simulationStopped)throw new Stop('technical-incident',technical);}
  return w;
 };
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
 const run=async(speed:1|6)=>{await pause(page);await read();await closeMenu();await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();};
 const wait=async(done:(w:World)=>boolean)=>{while(Date.now()<observeUntil){const w=await read();if(done(w))return w;await page.waitForTimeout(100);}throw new Stop('segment-bound',{tick:last?.tick,stage});};
 const act=async(command:Command,reason:string)=>{await pause(page);await read();await perform(page,{command,reason},rotation);const w=await read();actions.push({command,reason,tick:w.tick});return w;};
 const capture=async(name:string,reload:boolean,conserve=false)=>{
  await pause(page);await closeMenu();const before=await read(conserve);expect(validateWorld(before)).toEqual([]);expect(checkpoints.length).toBeLessThan(2);await page.screenshot({path:info.outputPath(name+'.png')});
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label=`Defense infection ${segment} ${name}`;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);const record={name,path,sha256:hash(text),tick:before.tick,reloaded:false};checkpoints.push(record);
  if(reload){await page.locator('#browse-saves').click();const front=page.locator('.front-menu'),row=front.locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front.getByRole('button',{name:'Charger',exact:true}).click();await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,before);record.reloaded=true;}
  await closeMenu();return before;
 };
 /** The actual tactical menu sends this dry clinical command. No hidden command API. */
 const dryTendVisible=async()=>{
  await pause(page);let w=await read();const doctor=pawn(w,IRIS),patient=pawn(w,VISITOR);
  const reason=draftedTendingReason(w,doctor,patient),proposal=reason?undefined:draftedTendingProposal(w,doctor,patient,reachableCells(w,doctor,blockedCells(w),new Set()));
  geometry.push({kind:'actual-drafted-care-admission',tick:w.tick,doctorId:IRIS,patientId:VISITOR,reason,proposal,ordinaryReason:tendingReason(w,doctor,patient),targets:treatmentTargets(patient),physicalBed:currentMedicalBed(w,patient)});
  if(reason||!proposal)return false;
  expect(treatmentTarget(patient)).toEqual({infectionId:INFECTION});
  await page.keyboard.press('Escape');await page.locator(`[data-pawn="${IRIS}"]`).click();await revealCells(page,[patient]);let point:{x:number;y:number}|undefined;
  for(let attempt=0;attempt<12;attempt++){
   await settledCells(page,[patient]);const frame=await page.evaluate(id=>{
    const canvas=document.querySelector<HTMLCanvasElement>('#viewport canvas')!,b=canvas.getBoundingClientRect(),body=window.__lisiere.projectPawn(id);if(!body)return null;
    const clear=[[0,0],[-10,0],[10,0],[0,-10],[0,10]].every(([dx,dy])=>document.elementFromPoint(body.x+dx,body.y+dy)===canvas);
    const preferred={x:b.x+b.width*.72,y:b.y+b.height*.30};let anchor:{x:number;y:number;score:number}|undefined;
    for(let y=b.top+18;y<b.bottom-18;y+=24)for(let x=b.left+18;x<b.right-18;x+=24){if(![[0,0],[-10,0],[10,0],[0,-10],[0,10]].every(([dx,dy])=>document.elementFromPoint(x+dx,y+dy)===canvas))continue;const score=Math.hypot(x-preferred.x,y-preferred.y);if(!anchor||score<anchor.score)anchor={x,y,score};}
    return {body,clear,anchor};
   },VISITOR);if(!frame)throw new Stop('patient-projection-absent',{tick:w.tick});if(frame.clear){point=frame.body;break;}if(!frame.anchor)throw new Stop('no-clear-canvas-pan',{tick:w.tick});
   await page.mouse.move(frame.anchor.x,frame.anchor.y);await page.mouse.down({button:'middle'});await page.mouse.move(frame.anchor.x+Math.max(-250,Math.min(250,frame.anchor.x-frame.body.x)),frame.anchor.y+Math.max(-180,Math.min(180,frame.anchor.y-frame.body.y)),{steps:8});await page.mouse.up({button:'middle'});
  }
  if(!point)throw new Stop('patient-body-not-visible',{tick:w.tick});expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');
  await page.mouse.click(point.x,point.y,{button:'right'});const button=page.locator(`[data-order-drafted-tend="${VISITOR}"]`);await expect(button).toBeVisible();await expect(button).toBeEnabled();await button.click();
  w=await wait(state=>pawn(state,IRIS).tend?.drafted===true&&pawn(state,IRIS).tend?.patientId===VISITOR);
  expect(pawn(w,IRIS).tend?.medicine).toBeUndefined();expect(pawn(w,IRIS).tend?.useMedicine).toBeUndefined();
  actions.push({kind:'actual-drafted-dry-tend-accepted',tick:w.tick,pawnId:IRIS,patientId:VISITOR,target:treatmentTarget(pawn(w,VISITOR)),tend:pawn(w,IRIS).tend});return true;
 };
 const inheritedCombat=(w:World)=>[GAEL,ENEMY].map(id=>{const p=pawn(w,id);return {id,state:p.state,x:p.x,z:p.z,draft:p.draft,melee:p.melee,shooting:p.shooting,motion:p.motion,stagger:p.stagger,health:p.health};});
 const stopFutureCombat=async()=>{
  await pause(page);const before=await read(),strike=structuredClone(pawn(before,GAEL).melee?.strike),motion=structuredClone(pawn(before,GAEL).motion),stagger=structuredClone(pawn(before,GAEL).stagger);
  await act({type:'draft-stop',pawnIds:[GAEL]},'Arrêter les seules attaques futures après la cessation réelle du combat');
  await act({type:'draft',pawnIds:[GAEL],enabled:false},'Laisser Patient/Repos choisir un vrai couchage, avec la récupération de combat conservée');
  const after=await read();expect(after.tick).toBe(before.tick);expect(pawn(after,GAEL).melee?.strike).toEqual(strike);expect(pawn(after,GAEL).motion).toEqual(motion);expect(pawn(after,GAEL).stagger).toEqual(stagger);gaelCareMode='rest';
 };
 const visitorBedCare=async()=>{
  await pause(page);let w=await read();
  // Fallback only after a genuine initial drafted admission/proposal refusal.
  if(pawn(w,IRIS).draft)await act({type:'draft',pawnIds:[IRIS],enabled:false},'Passer aux vrais services civils après le refus réel des soins mobilisés');
  w=await read();const patient=pawn(w,VISITOR),ordinary=tendingReason(w,pawn(w,IRIS),patient),rescue=rescueReason(w,pawn(w,IRIS),patient,true);
  geometry.push({kind:'actual-visitor-bed-care-admission',tick:w.tick,ordinary,rescue,patient,physicalBed:currentMedicalBed(w,patient),infectionTreatedAt});
  if(!ordinary){await act({type:'order-tend',pawnId:IRIS,patientId:VISITOR,queue:false},'Soigner les plaies restantes au vrai chevet avec les médicaments permis');visitorCareMode='medicine';}
  else if(!rescue){await act({type:'order-rescue',pawnId:IRIS,patientId:VISITOR,queue:false},'Secourir le visiteur réellement à terre vers le couchage choisi par les règles');visitorCareMode='rescue';}
  else throw new Stop('visitor-clinical-admission-refused',{tick:w.tick,ordinary,rescue,patient});
  await run(1);
 };
 try{
  const file=info.outputPath('literal-input.json');await writeFile(file,raw);await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(file);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,initial);loaded=true;bodyStarted=Date.now();deadline=bodyStarted+seconds*1000;observeUntil=deadline-18000;
  await pause(page);stage='initial';await capture('initial',true);let w=await read();const initialGael=pawn(w,GAEL),initialVisitor=pawn(w,VISITOR);
  expect(w.structures.some(s=>s.id===18663)).toBe(false);breaches.push({kind:'inherited-west-wall-breach',id:18663,observedAtInputTick:w.tick,parentLedgerSha:PARENT_SHA});
  expect(initialGael).toMatchObject({x:120,z:113,state:'idle',draft:{target:null,holdFire:true},melee:{order:{targetId:ENEMY},strike:{targetId:ENEMY,atCore:747165,untilCore:747285,tool:'left-fist',outcome:'hit'}},stagger:{sinceCore:747090,untilCore:747329}});
  expect(initialGael.motion).toMatchObject({from:{x:119,z:113},to:{x:120,z:113},end:74668.42393272147});expect(initialGael.health?.bloodLoss).toBe(3576096);expect(initialGael.health?.injuries.map(i=>i.id)).toEqual([17,18,19,20,21,22,23]);
  expect(initialGael.health?.injuries.find(i=>i.id===18)?.infection).toEqual({dueCore:790398,roomFactor:1000});
  expect(pawn(w,ENEMY)).toMatchObject({x:119,z:114,state:'idle',melee:{order:{targetId:GAEL},strike:{targetId:GAEL,atCore:747234,untilCore:747306,tool:'knife-blade',outcome:'miss'}}});expect(pawn(w,ENEMY).health?.injuries).toHaveLength(5);
  expect(pawn(w,IRIS)).toMatchObject({x:124,z:111,state:'idle'});expect(pawn(w,LEONIE)).toMatchObject({x:124,z:114,state:'idle'});expect(violentWorkRefusal(initialGael)).toBeUndefined();expect(violentWorkRefusal(pawn(w,IRIS))).toBeDefined();expect(violentWorkRefusal(pawn(w,LEONIE))).toBeDefined();
  expect(initialVisitor).toMatchObject({x:123,z:111,state:'downed',need:null,medicalSleep:true,visitor:{medicalGuestAt:72942},health:{bloodLoss:84568240,infections:{immunity:531170,cases:[{id:INFECTION,part:'right-second-toe',bornAt:74723,severity:1000000}]}}});expect(initialVisitor.health?.injuries).toHaveLength(16);expect(initialVisitor.health?.injuries.filter(i=>i.tended===undefined)).toHaveLength(12);expect(currentMedicalBed(w,initialVisitor)).toBeUndefined();
  civilSheltered=true;inheritedMeleeAt=initial.tick;
  combatTrace.push({kind:'inherited-engaged-combat',tick:w.tick,combat:structuredClone(inheritedCombat(w)),qualification:'Existing orders/strikes/cooldowns; no repeated attack or tactical movement command'});
  const inherited=structuredClone(inheritedCombat(w));stage='visitor-contact-dry-care';
  if(!await dryTendVisible()){await visitorBedCare();}else{w=await read();expect(w.tick).toBe(initial.tick);expect(inheritedCombat(w)).toEqual(inherited);await run(1);}
  while(Date.now()<observeUntil){
   w=await read();const g=pawn(w,GAEL),v=pawn(w,VISITOR),doctor=pawn(w,IRIS),enemy=w.pawns.find(p=>p.id===ENEMY);
   const ceased=!enemy||['dead','downed'].includes(enemy.state)||(!enemy.melee?.order&&(enemy.raid?.exiting===true||w.raids?.active?.phase==='withdraw'));
   push(geometry,{kind:'actual-concurrent-contact-and-care',tick:w.tick,gael:{state:g.state,melee:g.melee,motion:g.motion,stagger:g.stagger},enemy,contact:enemy?meleeContact(w,g,enemy):null,tools:meleeTools(w,g),visitorCareMode,gaelCareMode,doctor:{state:doctor.state,tend:doctor.tend,rescue:doctor.rescue}},192);
   if(!raidOutcome&&ceased){raidOutcome={tick:w.tick,target:enemy,raids:w.raids,qualification:'Actual incapacity/withdrawal; raid conclusion and healing remain distinct'};stage='combat-release';await stopFutureCombat();await run(1);continue;}
   if(!raidOutcome&&g.melee?.order?.targetId!==ENEMY)throw new Stop('inherited-melee-mandate-ended',{tick:w.tick,gael:g,enemy});
   if(visitorCareMode==='dry'){
    if(infectionTreatedAt!==undefined){
     const condition=v.health?.infections?.cases.find(c=>c.id===INFECTION),events=w.events.filter(e=>e.tick>initial.tick&&e.message===`Iris a traité une infection de ${v.name} sans médicament.`);
     expect(condition?.tend).toBeDefined();expect(events.length).toBeGreaterThan(0);expect(w.piles.filter(p=>p.kind==='medicine')).toEqual(initial.piles.filter(p=>p.kind==='medicine'));
     clinicalMilestones.push({kind:'first-real-dry-infection-treatment',tick:w.tick,condition,events,qualification:'Real dry quality/expiry retained; no medicine spent and no cure claimed'});
     visitorCareMode='complete';clinicalMilestones.push({kind:'visitor-urgent-infection-goal-observed-task-continues',tick:w.tick,doctor,remainingTargets:treatmentTargets(v),qualification:'The accepted dry task continues naturally; old untreated bruises do not block future urgent Gaël care'});
    }
    else if(doctor.tend?.patientId!==VISITOR||!doctor.tend.drafted)throw new Stop('accepted-dry-care-ended-before-infection-tend',{tick:w.tick,doctor,patient:v});
   }
   if(visitorCareMode==='rescue'){
    const bed=currentMedicalBed(w,v);
    if(bed&&!doctor.rescue){
     await pause(page);w=await read();const p=pawn(w,VISITOR),actualBed=currentMedicalBed(w,p);expect(actualBed).toBeDefined();rescueDepositedAt=w.tick;
     actions.push({kind:'actual-visitor-bed-deposit',tick:w.tick,patient:p,bed:actualBed,qualification:'Physical need.sleep/position and finished rescue, not a reservation'});
     const reason=tendingReason(w,pawn(w,IRIS),p);if(reason)throw new Stop('ordinary-visitor-care-admission-refused',{tick:w.tick,reason});
     await act({type:'order-tend',pawnId:IRIS,patientId:VISITOR,queue:false},'Soigner les vraies plaies restantes du visiteur après son dépôt physique');visitorCareMode='medicine';stage='visitor-ordinary-treatment';await run(1);continue;
    }
    if(!doctor.rescue&&v.state==='downed'&&!bed)throw new Stop('accepted-rescue-ended-before-bed-deposit',{tick:w.tick,doctor,patient:v});
   }
   if(visitorCareMode==='medicine'){
    if(infectionTreatedAt!==undefined){
     visitorCareMode='complete';clinicalMilestones.push({kind:'visitor-urgent-infection-goal-observed',tick:w.tick,patient:v,remainingTargets:treatmentTargets(v),qualification:'Existing infection tended; remaining old wounds and immunity stay distinct'});
    }else if(doctor.tend?.patientId!==VISITOR)throw new Stop('accepted-visitor-care-ended-before-current-treatments',{tick:w.tick,doctor,patient:v,target:treatmentTarget(v)});
   }
   if(gaelCareMode==='rest'&&currentMedicalBed(w,g)&&g.state==='resting'&&stationary(w,g)&&visitorCareMode==='complete'){
    await pause(page);w=await read();const patient=pawn(w,GAEL);expect(currentMedicalBed(w,patient)).toBeDefined();
    actions.push({kind:'actual-gael-patient-bed-rest',tick:w.tick,patient,bed:currentMedicalBed(w,patient),qualification:'Voluntary Patient/Rest in the actual physical bed; no forced lying command'});
    if(pawn(w,IRIS).draft)await act({type:'draft',pawnIds:[IRIS],enabled:false},'Démobiliser la médecin pour les soins civils au vrai chevet de Gaël');w=await read();
    const reason=tendingReason(w,pawn(w,IRIS),pawn(w,GAEL));if(reason)throw new Stop('ordinary-gael-care-admission-refused',{tick:w.tick,reason});
    await act({type:'order-tend',pawnId:IRIS,patientId:GAEL,queue:false},'Prioriser les vraies blessures de Gaël après la cessation réelle du combat et son repos au lit');gaelCareMode='tend';stage='gael-ordinary-treatment';await run(1);continue;
   }
   if(gaelCareMode==='tend'){
    const firstTended=g.health?.injuries.some(i=>i.tended!==undefined&&pawn(initial,GAEL).health?.injuries.find(old=>old.id===i.id)?.tended===undefined),events=w.events.filter(e=>e.tick>initial.tick&&e.message.startsWith('Iris a traité ')&&e.message.includes('de Gaël '));
    if(firstTended&&events.length){gaelCareMode='complete';clinicalMilestones.push({kind:'first-real-gael-treatment-observed',tick:w.tick,patient:g,events,remainingTargets:treatmentTargets(g),qualification:'First actual treatment only; remaining wounds, blood loss and risks remain'});}
    else if(doctor.tend?.patientId!==GAEL)throw new Stop('accepted-gael-care-ended-before-current-treatments',{tick:w.tick,doctor,patient:g,target:treatmentTarget(g)});
   }
   if(raidOutcome&&visitorCareMode==='complete'&&gaelCareMode==='complete'){
    await pause(page);w=await read();const g=pawn(w,GAEL),v=pawn(w,VISITOR);
    expect(g.health?.injuries.some(i=>i.tended!==undefined&&pawn(initial,GAEL).health?.injuries.find(old=>old.id===i.id)?.tended===undefined)).toBe(true);expect(v.health?.infections?.cases.find(c=>c.id===INFECTION)?.tend).toBeDefined();
    clinicalComplete=true;stop='combat-ceased-and-infection-and-first-gael-care-observed';break;
   }
   await page.waitForTimeout(100);
  }
  if(!clinicalComplete)throw new Stop('contact-and-care-window-bound',{tick:last?.tick,horizon:END,infectionTreatedAt,rescueDepositedAt,visitorCareMode,gaelCareMode,raidOutcome});
 }catch(e){failure=e instanceof Stop?{reason:e.reason,detail:e.detail}:e;stop=e instanceof Stop?e.reason:'technical-or-oracle-error';}
 finally{
  finalizing=true;if(loaded&&!page.isClosed()&&checkpoints.length<2)try{stage=failure?'conservation':'issue';await capture(stage,!failure,!!failure);}catch(e){exportFailure=String(e);}
  if(last){const validation=validateWorld(last);if(!validation.length){const text=serializeWorld(last),path=info.outputPath('last-adopted.json');await writeFile(path,text);fallback={path,tick:last.tick,sha256:hash(text),provenance:'Last adopted read, not UI export'};}else fallback={validation:validation.slice(0,12),count:validation.length};}
  const ledger={kind:'explicit-existing-infection-and-contact-care',inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,newMandate:true,priorV362ResumeStillForbidden:true,priorDefenseResumeStillForbidden:true,priorContinuationResumeStillForbidden:true,priorFlankResumeStillForbidden:true,segment,checkpoint:checkpoints.at(-1),resumeAllowed:false,priorContactResumeStillForbidden:true,stop,actions,raidOutcome,inheritedMeleeAt,infectionTreatedAt,rescueDepositedAt,visitorCareMode,gaelCareMode,clinicalComplete,clinicalMilestones,clinicalTrace,structuralDamage,breaches};const ledgerPath=info.outputPath('ledger.json'),text=JSON.stringify(ledger,null,2);await writeFile(ledgerPath,text);
  const report=info.outputPath('raid-defense-summary.json');await writeFile(report,JSON.stringify({segment,inputPath:INPUT,inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,inputSchema:JSON.parse(raw).schemaVersion,adoptedSchema:initial.schemaVersion,channel:'chrome',backend,bodyMs:Date.now()-bodyStarted,overallMs:Date.now()-started,stop,failure:failure instanceof Error?{message:failure.message,stack:failure.stack}:failure,exportFailure,tactic:'inherited-melee-and-contact-dry-infection-care-then-physical-bed-care',civilSheltered,retreating,isolated,inheritedMeleeAt,infectionTreatedAt,rescueDepositedAt,visitorCareMode,gaelCareMode,clinicalComplete,clinicalMilestones,clinicalTrace,structuralDamage,breaches,raidOutcome,raidCleared:!!last&&!last.raids?.active&&last.raids?.last?.id===2,interventionQualified:stop==='combat-ceased-and-infection-and-first-gael-care-observed'&&!failure&&!exportFailure,campaignQualified:false,allVisitorsSaved:false,ammunitionCounterInvented:false,combatTrace,geometry,actions,checkpoints,ledger:{path:ledgerPath,sha256:hash(text)},errors,lifecycle,journal,ring,fallback,last:last?sample(last):null},null,2));await info.attach('raid defense summary',{contentType:'application/json',path:report});page.off('crash',crash);page.off('close',closed);browser?.off('disconnected',disconnected);
 }
 if(failure)throw failure instanceof Error?failure:new Error(JSON.stringify(failure));expect(exportFailure).toBeUndefined();expect(stop,'Unfinished combat or care remains a conserved partial result').toBe('combat-ceased-and-infection-and-first-gael-care-observed');expect(checkpoints.at(-1)?.reloaded).toBe(true);
}
