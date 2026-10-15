/* Private proposal only. ROOT reviews, adopts and executes from exact issue86133.
 * Genuine PatientRest and civilian tending; no health, anatomy, inventory or RNG writes. */
import {expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
import {perform} from './player-actions';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {medicalBleed,medicalBleedUnits} from '../../src/sim/injury-state';
import {pawnBody} from '../../src/sim/health-rules';
import {isColonist} from '../../src/sim/affiliation';
import {patientProposal} from '../../src/sim/patient-rest';
import {currentMedicalBed} from '../../src/sim/hospital-medical-stats';
import {tendingReason,tendingProposal} from '../../src/sim/tending';
import {treatmentTargets} from '../../src/sim/care-rules';
import {blockedCells,reachableCells} from '../../src/sim/pathfinding';
import {constructionRecipe,constructionSupplied} from '../../src/sim/construction-materials';
import type {World,Pawn,Command} from '../../src/sim/types';

const SOURCE='tmp/early-access-defense/raid3-contact-continuation-adopted-01/native-01/raid-third-contact-continu-8fef3-etaining-anatomy-and-losses/';
const INPUT=SOURCE+'issue.json',INPUT_SHA='3f9d2672a857aa40e88a93e91756fa590f49f02d071b34fa412a1f9080f1f395';
const PARENT_SHA='7b51b1f8d2743b315f0aace907891cb0be1301b407e28b79429f9e4aa3b46d09';
const PARENT_SUMMARY_SHA='2508ec3d25707863e6a1c91523427e714b1b34464b532334f9ba3c1c5c0d1a41';
const PRODUCTIVE_SOURCE='tmp/early-access-productive-research/adopted-05/native-05/early-productive-research--961a2-energy-goal-only-in-summary/ledger.json';
const PRODUCTIVE_SHA='fca539be6d24875ca99f31a4f14525769222172cbdd61b3031c91d68d2057591';
const IRIS=18530,GAEL=18532,LEONIE=18534,ENEMY=20141,BED=19797,MIN_END=86533,END=86933;
const ORIGINALS=[IRIS,GAEL,LEONIE],PATIENTS=[19768,19771],PROTECTED=[...ORIGINALS,...PATIENTS],URGENT_INJURIES=[26,27,28];
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const stationary=(w:World,p:Pawn)=>p.moveCooldown===0&&(p.motion?.end??w.tick)<=w.tick;
const person=(w:World,id:number)=>w.pawns.find(p=>p.id===id)??w.visitors?.departed.find(d=>d.pawn.id===id)?.pawn;
const pawn=(w:World,id:number)=>w.pawns.find(p=>p.id===id)!;
const owned=(w:World,id:number)=>[...w.piles,...(w.visitors?.departed.find(d=>d.pawn.id===id)?.items??[])].filter(p=>'pawnId' in p.owner&&p.owner.pawnId===id);
const identity=(p:Pawn)=>({id:p.id,name:p.name,appearance:p.appearance,background:p.background,traits:p.traits});
class Stop extends Error{constructor(readonly reason:string,readonly detail:unknown){super(reason);}}

export async function runRaidThirdCare(page:Page,info:TestInfo){
 expect(process.env.DEFENSE_WRAPPER).toBe('1');page.setDefaultTimeout(10000);
 const segment=process.env.DEFENSE_SEGMENT!,seconds=Number(process.env.DEFENSE_BODY_SECONDS??150);
 expect(segment).toMatch(/^[a-zA-Z0-9_-]{1,32}$/);expect(seconds>=100&&seconds<=150).toBe(true);
 const raw=await readFile(INPUT,'utf8');expect(hash(raw)).toBe(INPUT_SHA);const initial=deserializeWorld(raw);
 expect(initial).toEqual({...JSON.parse(raw),schemaVersion:initial.schemaVersion});expect(initial.tick).toBe(86133);expect(validateWorld(initial)).toEqual([]);
 const parentText=await readFile(SOURCE+'ledger.json','utf8');expect(hash(parentText)).toBe(PARENT_SHA);const parent=JSON.parse(parentText);
 expect(parent).toMatchObject({kind:'explicit-raid-defense',intervention:'raid3-contact-continuation',resumeAllowed:false,inputSha:'c2c0c462102536f4ac4e77f2392711f5e81b4bd01a5a8bb337b33ae283f3239f',stop:'actual-threat-cessation',originTick:75566,horizon:111566});
 expect(parent.checkpoint).toMatchObject({sha256:INPUT_SHA,tick:86133,reloaded:true});
 const parentSummaryText=await readFile(SOURCE+'raid-contact-continuation-summary.json','utf8');expect(hash(parentSummaryText)).toBe(PARENT_SUMMARY_SHA);
 const productiveText=await readFile(PRODUCTIVE_SOURCE,'utf8');expect(hash(productiveText)).toBe(PRODUCTIVE_SHA);const productive=JSON.parse(productiveText);
 expect(productive).toMatchObject({protocol:'productive-research-v2',originTick:75566,horizon:111566,resumeAllowed:false,truncated:false});
 expect(parent.productiveParent).toMatchObject({protocol:'productive-research-v2',originTick:75566,horizon:111566,parentLedgerSha:PRODUCTIVE_SHA,fullLedgerSha256:PRODUCTIVE_SHA});expect(parent.productiveParent.fullLedger).toEqual(productive);
 const reviewPath=process.env.DEFENSE_ENTRY_REVIEW,reviewSha=process.env.DEFENSE_ENTRY_REVIEW_SHA;
 if(!reviewPath||!reviewSha)throw Error('ROOT must supply a distinct recovery mandate.');
 const reviewText=await readFile(reviewPath,'utf8');expect(hash(reviewText)).toBe(reviewSha);const review=JSON.parse(reviewText);
 expect(review).toMatchObject({kind:'raid3-care-entry-v1',newMandate:true,reviewedBy:'ROOT',priorLedgersRemainForbidden:true,source:{sha256:INPUT_SHA,ledgerSha256:PARENT_SHA,tick:86133,checkpointReloaded:true,parentResumeAllowed:false},careHorizon:END,careMinimumTick:MIN_END,productiveOrigin:75566,productiveHorizon:111566,knownInfections:[{pawnId:GAEL,ids:[1]},{pawnId:19771,ids:[1]}],enemyRecoveryStops:true,leonieHeldUntilUrgentCare:true});
 expect(initial.raids?.active).toBeUndefined();expect(initial.raids?.last).toMatchObject({id:3,tick:86130,reason:'defended',killed:0,downed:1});
 expect(pawn(initial,ENEMY)).toMatchObject({x:124,z:114,state:'downed',path:[]});
 expect(pawn(initial,GAEL)).toMatchObject({x:123,z:114,path:[],draft:{holdFire:true},melee:{order:null,strike:{targetId:ENEMY,atCore:861291,untilCore:861411,tool:'grip',outcome:'hit'}}});
 expect(pawn(initial,GAEL).health?.missing).toEqual([{part:'left-big-toe',bornAt:86111}]);expect(pawn(initial,GAEL).health?.bloodLoss).toBe(4841532);
 for(const id of URGENT_INJURIES)expect(pawn(initial,GAEL).health?.injuries.find(i=>i.id===id)).toMatchObject({id,bornAt:86053,severity:8499});
 expect(initial.structures.find(s=>s.id===BED)).toMatchObject({kind:'sleeping-spot',medical:true,x:122,z:114,orientation:1});
 expect(initial.structures.some(s=>s.id===18648||s.id===18661)).toBe(false);
 expect(initial.piles.find(p=>p.id===19678)).toMatchObject({kind:'medicine',quantity:10,owner:{type:'ground',x:124,z:114}});
 expect(initial.piles.find(p=>p.id===19776)).toMatchObject({kind:'medicine',quantity:3,owner:{type:'inventory',pawnId:19771}});
 const baseline=new Map(PROTECTED.map(id=>{const p=person(initial,id)!;return [id,{identity:structuredClone(identity(p)),nextId:p.health?.nextInjuryId??0,injuries:new Set(p.health?.injuries.map(i=>i.id)??[]),missing:new Set(p.health?.missing.map(m=>m.part)??[]),infections:new Set(p.health?.infections?.cases.map(c=>c.id)??[])}];}));
 const property=PATIENTS.flatMap(id=>owned(initial,id).filter(p=>p.kind!=='food').map(p=>structuredClone(p)));
 const initialDamage=new Map(initial.structures.map(s=>[s.id,s.damage??0])),initialStructureIds=new Set(initial.structures.map(s=>s.id));
 const initialPlans=initial.jobs.filter(j=>j.id>=20050&&j.id<=20061).map(j=>structuredClone(j));expect(initialPlans).toHaveLength(12);
 const errors=observeErrors(page),lifecycle:unknown[]=[],actions:unknown[]=[],clinicalTrace:unknown[]=[],medicineTrace:unknown[]=[],needsTrace:unknown[]=[],materialTrace:unknown[]=[],productiveEvidence:unknown[]=[],enemyTrace:unknown[]=[],milestones:unknown[]=[],artifactErrors:unknown[]=[],conservationDiagnostics:unknown[]=[],checkpoints:{name:string;path:string;sha256:string;tick:number;reloaded:boolean}[]=[],journal:unknown[]=[],ring:unknown[]=[],rotation={value:0};
 const started=Date.now();let bodyStarted=started,deadline=Infinity,observeUntil=Infinity,loaded=false,finalizing=false,last:World|undefined,stage='input',stop='not-started',failure:unknown,exportFailure:unknown,fallback:unknown,backend:unknown;
 let careStarted=false,urgentCompleteAt:number|undefined,leonieReleasedAt:number|undefined,lastJournal=-1;
 const keys=new Map<string,string>(),treated=new Set<number>(),paid=new Map<number,unknown>(),finished=new Set<number>();
 const strict=(list:unknown[],value:unknown)=>{if(list.length>=8192)throw new Stop('causal-capacity',{stage,tick:last?.tick});list.push(value);};
 const rolling=(list:unknown[],value:unknown,limit:number)=>{list.push(value);if(list.length>limit)list.shift();};
 const changed=(key:string,list:unknown[],value:unknown)=>{const next=JSON.stringify(value);if(keys.get(key)!==next){strict(list,{observedTick:last?.tick,...(value as object)});keys.set(key,next);}};
 const urgentDone=(w:World)=>URGENT_INJURIES.every(id=>treated.has(id))&&pawn(w,GAEL).health?.missing.some(m=>m.part==='left-big-toe'&&m.tended===true)&&medicalBleed(pawn(w,GAEL).health!)===0;
 const sample=(w:World)=>({tick:w.tick,stage,people:PROTECTED.map(id=>person(w,id)),enemy:w.pawns.find(p=>p.id===ENEMY),raids:w.raids,events:w.events.slice(-12)});
 const observe=(w:World)=>{
  const g=pawn(w,GAEL);if(!g)return;
  for(const id of URGENT_INJURIES){const injury=g.health?.injuries.find(i=>i.id===id);if(injury?.tended!==undefined&&!treated.has(id)){treated.add(id);strict(milestones,{kind:'actual-urgent-injury-tended',observedTick:w.tick,injury:structuredClone(injury)});}}
  changed('clinical',clinicalTrace,{patient:{...g,body:pawnBody(g),bed:currentMedicalBed(w,g),targets:treatmentTargets(g),bleed:g.health?medicalBleed(g.health):0,bleedUnits:g.health?medicalBleedUnits(g.health):0},doctor:pawn(w,IRIS),leonie:pawn(w,LEONIE)});
  // Custody is physical. A whole pickup may keep the source ID; no new-ID oracle.
  changed('medicine',medicineTrace,{piles:w.piles.filter(p=>p.kind==='medicine'),doctors:ORIGINALS.map(id=>({id,tend:pawn(w,id).tend})),events:w.events.filter(e=>e.tick>initial.tick&&e.message.includes('a traité'))});
  changed('needs',needsTrace,{people:PROTECTED.map(id=>{const p=person(w,id);return {id,state:p?.state,need:p?.need,feed:p?.feed,hunger:p?.hunger,rest:p?.rest,position:p?{x:p.x,z:p.z,motion:p.motion}:null};}),food:w.piles.filter(p=>p.kind==='food'),events:w.events.filter(e=>e.tick>initial.tick&&(e.message.includes('mangé')||e.message.includes('nourri')))});
  const planIds=new Set(initialPlans.map(j=>j.id));
  changed('materials',materialTrace,{wood:w.piles.filter(p=>p.item==='wood'),constructionCargo:w.piles.filter(p=>p.owner.type==='job'||p.owner.type==='pawn'&&['wood','steel','component'].includes(p.item)),jobs:w.jobs.filter(j=>planIds.has(j.id)),newStructures:w.structures.filter(s=>!initialStructureIds.has(s.id)),packed:w.packed,destroyed:w.destroyed,deconstructed:w.deconstructed});
  for(const plan of initialPlans){const job=w.jobs.find(j=>j.id===plan.id);if(job?.construction==='frame'&&constructionSupplied(w,job)&&!paid.has(plan.id)){const proof={kind:'physical-full-frame-payment-observed',observedTick:w.tick,jobId:job.id,recipe:structuredClone(constructionRecipe(job)),piles:w.piles.filter(p=>p.owner.type==='job'&&p.owner.jobId===job.id).map(p=>structuredClone(p))};paid.set(plan.id,proof);strict(productiveEvidence,proof);}
   const structure=w.structures.find(s=>!initialStructureIds.has(s.id)&&s.kind===plan.kind&&s.x===plan.x&&s.z===plan.z&&s.material===plan.material&&s.orientation===plan.orientation);
   if(structure&&!finished.has(plan.id)){finished.add(plan.id);strict(productiveEvidence,{kind:paid.has(plan.id)?'observed-completion-after-physical-frame-payment':'completion-without-payment-witness-unqualified',observedTick:w.tick,jobId:plan.id,structure:structuredClone(structure),payment:paid.get(plan.id)??null,jobStillPresent:!!job,jobPiles:w.piles.filter(p=>p.owner.type==='job'&&p.owner.jobId===plan.id),creditedToProductiveLedger:false});}}
  changed('enemy',enemyTrace,{pawn:w.pawns.find(p=>p.id===ENEMY),raids:w.raids});
  const value=sample(w);rolling(ring,value,12);if(w.tick-lastJournal>=40){rolling(journal,value,64);lastJournal=w.tick;}
 };
 const guard=(w:World)=>{
  if(errors.length||lifecycle.length)throw new Stop('technical-event',{errors,lifecycle});
  for(const id of PROTECTED){const p=person(w,id),b=baseline.get(id)!;if(!p||p.state==='dead'||p.health?.death)throw new Stop('protected-death-or-loss',{id,tick:w.tick,p});
   if(p.state==='downed'||p.mental?.crisis||p.collapsePending)throw new Stop('protected-incapacity-or-crisis',{id,tick:w.tick,p});
   if(ORIGINALS.includes(id)&&(!isColonist(p)||p.hunger<=12.5))throw new Stop('original-affiliation-or-hunger-danger',{id,tick:w.tick,p});
   if((p.health?.nextInjuryId??0)>b.nextId||p.health?.injuries.some(i=>!b.injuries.has(i.id))||p.health?.missing.some(m=>!b.missing.has(m.part)))throw new Stop('first-new-protected-damage',{id,tick:w.tick,p});
   if(p.health?.infections?.cases.some(c=>!b.infections.has(c.id)))throw new Stop('distinct-new-infection',{id,tick:w.tick,p});
   expect(identity(p)).toEqual(b.identity);const body=pawnBody(p);if(!body.canBeAwake||body.painShock||body.vitalFailure)throw new Stop('physiological-danger',{id,tick:w.tick,body,p});
  }
  const enemy=w.pawns.find(p=>p.id===ENEMY);if(enemy&&!['downed','dead'].includes(enemy.state))throw new Stop('enemy-recovered',{tick:w.tick,enemy});
  if(enemy?.melee?.order||enemy?.shooting?.order||enemy?.tactics?.targetId!=null)throw new Stop('hostile-target-or-order',{tick:w.tick,enemy});
  if(!enemy&&!w.raids?.departed.some(d=>d.pawnId===ENEMY&&d.group===3))throw new Stop('enemy-missing-without-physical-exit',{tick:w.tick});
  if(w.raids?.active||(w.raids?.serial??0)!==3||w.pawns.some(p=>p.id!==ENEMY&&p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state))||w.wildlife?.animals.some(a=>a.manhunter&&!['dead','downed'].includes(a.state))||w.fires?.items.length)throw new Stop('distinct-new-danger',{tick:w.tick,raids:w.raids});
  for(const [id,damage] of initialDamage){const s=w.structures.find(s=>s.id===id);if(!s||(s.damage??0)>damage)throw new Stop('new-structure-damage-or-loss',{tick:w.tick,id,s});}
  expect(w.structures.some(s=>s.id===18648||s.id===18661)).toBe(false);expect(w.destroyed).toEqual(initial.destroyed);expect(w.deconstructed).toEqual(initial.deconstructed);
  expect(w.packed).toEqual(initial.packed);for(const old of property){const id='pawnId' in old.owner?old.owner.pawnId:0;expect(owned(w,id).find(p=>p.id===old.id)).toMatchObject({id:old.id,item:old.item,quantity:old.quantity,owner:old.owner});}
  expect(w.piles.find(p=>p.id===18558)).toMatchObject({item:'bolt-action-rifle',quantity:1,owner:{type:'equipment',pawnId:GAEL}});
  if(leonieReleasedAt===undefined&&stage!=='releasing-leonie'){const l=pawn(w,LEONIE);if(!l.draft||l.x!==122||l.z!==112||l.path.length||!stationary(w,l))throw new Stop('held-civilian-left-refuge',{tick:w.tick,l});}
  if(w.tick>END||!finalizing&&w.tick===END)throw new Stop('care-tick-bound',{tick:w.tick});if(Date.now()>deadline)throw new Stop('body-bound',{tick:w.tick,stage});
 };
 const crash=()=>lifecycle.push({kind:'pagecrash',elapsedMs:Date.now()-started}),closed=()=>lifecycle.push({kind:'pageclose',elapsedMs:Date.now()-started}),disconnected=()=>lifecycle.push({kind:'browserdisconnected',elapsedMs:Date.now()-started});
 page.on('crash',crash);page.on('close',closed);const browser=page.context().browser();browser?.on('disconnected',disconnected);
 const read=async(conserve=false)=>{const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);if(conserve){try{observe(w);}catch(e){conservationDiagnostics.push({tick:w.tick,error:String(e),note:'Diagnostic failure cannot suppress UI conservation'});}}else{observe(w);guard(w);const technical=await page.evaluate(()=>window.__lisiere.incident);if(technical.graphicsFault||technical.simulationStopped)throw new Stop('technical-incident',technical);}return w;};
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
 const act=async(command:Command,reason:string)=>{await pause(page);await read();await perform(page,{command,reason},rotation);const w=await read();strict(actions,{command,reason,tick:w.tick});return w;};
 const run=async()=>{await pause(page);await read();await closeMenu();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
 const capture=async(name:string,reload:boolean,conserve=false)=>{
  await pause(page);await closeMenu();const before=await read(conserve);expect(validateWorld(before)).toEqual([]);expect(checkpoints.length).toBeLessThan(2);try{await page.screenshot({path:info.outputPath(name+'.png')});}catch(e){artifactErrors.push({name,kind:'screenshot-error',error:String(e),tick:before.tick});}
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label=`Defense ${segment} ${name}`;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);const record={name,path,sha256:hash(text),tick:before.tick,reloaded:false};checkpoints.push(record);
  if(reload){await page.locator('#browse-saves').click();const front=page.locator('.front-menu'),row=front.locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front.getByRole('button',{name:'Charger',exact:true}).click();await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,before);record.reloaded=true;}
  await closeMenu();return before;
 };
 try{
  const file=info.outputPath('literal-input.json');await writeFile(file,raw);await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(file);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,initial);loaded=true;bodyStarted=Date.now();deadline=bodyStarted+seconds*1000;observeUntil=deadline-18000;
  await pause(page);stage='initial';await capture('initial',true);if(artifactErrors.length)throw new Stop('initial-screenshot-failure',{artifactErrors});
  const before=await read(),g0=pawn(before,GAEL),inherited={strike:structuredClone(g0.melee?.strike),motion:structuredClone(g0.motion),stagger:structuredClone(g0.stagger)};
  await act({type:'draft-stop',pawnIds:[GAEL]},'Arrêter les seules attaques futures après la vraie défense, sans effacer la récupération engagée');
  let w=await act({type:'draft',pawnIds:[GAEL],enabled:false},'Démobiliser Gaël et laisser Patient/Repos choisir le vrai couchage médical');
  expect(w.tick).toBe(before.tick);expect(pawn(w,GAEL).melee?.strike).toEqual(inherited.strike);expect(pawn(w,GAEL).motion).toEqual(inherited.motion);expect(pawn(w,GAEL).stagger).toEqual(inherited.stagger);
  const proposal=patientProposal(w,pawn(w,GAEL),reachableCells(w,pawn(w,GAEL),blockedCells(w),new Set()));
  strict(milestones,{kind:'pure-patient-rest-admission',tick:w.tick,proposal,recovery:inherited});if(!proposal||proposal.bedId!==BED)throw new Stop('expected-medical-bed-not-admitted',{tick:w.tick,proposal});
  stage='actual-patient-rest';await run();
  while(Date.now()<observeUntil){w=await read();const g=pawn(w,GAEL);
   if(!careStarted&&currentMedicalBed(w,g)?.id===BED&&g.state==='resting'&&stationary(w,g)){
    await pause(page);w=await read();strict(milestones,{kind:'actual-patient-rest-observed',tick:w.tick,patient:structuredClone(pawn(w,GAEL)),bed:currentMedicalBed(w,pawn(w,GAEL))});
    if(pawn(w,IRIS).draft)w=await act({type:'draft',pawnIds:[IRIS],enabled:false},'Démobiliser Iris au vrai chevet, Léonie restant au refuge pendant l’urgence');
    const doctor=pawn(w,IRIS),patient=pawn(w,GAEL),reason=tendingReason(w,doctor,patient),tend=tendingProposal(w,doctor,patient,reachableCells(w,doctor,blockedCells(w),new Set()));
    if(reason||!tend)throw new Stop('civilian-tending-admission-refused',{tick:w.tick,reason,proposal:tend});
    w=await act({type:'order-tend',pawnId:IRIS,patientId:GAEL,queue:false},'Prioriser une seule fois les soins civils réels du moignon et des trois plaies récentes');
    expect(pawn(w,IRIS).tend?.patientId).toBe(GAEL);careStarted=true;stage='continuous-urgent-care';await run();continue;
   }
   if(careStarted&&urgentCompleteAt===undefined&&urgentDone(w)){
    await pause(page);w=await read();if(!urgentDone(w))throw new Stop('urgent-care-state-changed',{tick:w.tick});urgentCompleteAt=w.tick;
    strict(milestones,{kind:'three-injuries-and-stump-tended-bleeding-zero-observed',tick:w.tick,patient:structuredClone(pawn(w,GAEL)),targets:treatmentTargets(pawn(w,GAEL)),qualification:'Treated wounds and dressed stump; missing toe, blood loss and known infections remain real'});
    stage='releasing-leonie';w=await act({type:'draft',pawnIds:[LEONIE],enabled:false},'Rendre Léonie aux besoins et travaux ordinaires après les soins urgents observés');expect(pawn(w,LEONIE).draft).toBeUndefined();leonieReleasedAt=w.tick;strict(milestones,{kind:'actual-leonie-demobilized-after-urgent-care',tick:w.tick,pawn:structuredClone(pawn(w,LEONIE))});stage='ordinary-needs-after-urgent-care';await run();continue;
   }
   if(careStarted&&urgentCompleteAt===undefined&&pawn(w,IRIS).tend?.patientId!==GAEL)throw new Stop('urgent-care-ended-before-observed-targets',{tick:w.tick,doctor:pawn(w,IRIS),patient:g,targets:treatmentTargets(g)});
   if(urgentCompleteAt!==undefined&&leonieReleasedAt!==undefined&&w.tick>=MIN_END&&w.tick>=leonieReleasedAt+80){stop='urgent-care-and-short-ordinary-needs-window-observed';break;}
   await page.waitForTimeout(60);
  }
  if(stop==='not-started')throw new Stop('care-window-bound',{tick:last?.tick,urgentCompleteAt,leonieReleasedAt,horizon:END});
 }catch(e){failure=e instanceof Stop?{reason:e.reason,detail:e.detail}:e;stop=e instanceof Stop?e.reason:'technical-or-oracle-error';}
 finally{
  finalizing=true;
  if(loaded&&!page.isClosed()&&checkpoints.length<2)try{stage=failure?'conservation':'issue';await capture(stage,!failure,!!failure);}catch(e){exportFailure=String(e);if(!failure){failure=e instanceof Stop?{reason:e.reason,detail:e.detail}:e;stop=e instanceof Stop?e.reason:'final-export-error';}if(checkpoints.length<2&&!page.isClosed())try{stage='conservation';await capture('conservation',false,true);}catch(second){exportFailure=JSON.stringify({first:exportFailure,conservation:String(second)});}}
  const bodyEnded=Date.now();if(loaded&&!failure&&(bodyEnded>deadline||(last?.tick??END+1)>END)){failure={reason:bodyEnded>deadline?'body-bound':'care-tick-bound',detail:{tick:last?.tick,bodyMs:bodyEnded-bodyStarted,seconds}};stop=bodyEnded>deadline?'body-bound':'care-tick-bound';}
  if(!failure&&artifactErrors.length){failure={reason:'screenshot-failure',detail:artifactErrors};stop='screenshot-failure';}
  if(last){const validation=validateWorld(last);if(!validation.length){const text=serializeWorld(last),path=info.outputPath('last-adopted.json');await writeFile(path,text);fallback={path,tick:last.tick,sha256:hash(text),provenance:'Last adopted read; not a UI export'};}else fallback={validation};}
  const ledger={kind:'explicit-raid-recovery',intervention:'raid3-care',inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,newMandate:true,priorLedgersRemainForbidden:true,review:{path:reviewPath,sha256:reviewSha},productiveParent:{...structuredClone(parent.productiveParent),fullLedgerPath:PRODUCTIVE_SOURCE,fullLedgerSha256:PRODUCTIVE_SHA,fullLedger:structuredClone(productive)},defenseParent:{source:SOURCE,sha256:PARENT_SHA,summarySha256:PARENT_SUMMARY_SHA,ledger:structuredClone(parent)},originTick:75566,horizon:111566,careHorizon:END,careMinimumTick:MIN_END,segment,checkpoint:checkpoints.at(-1),resumeAllowed:false,stop,actions,milestones,clinicalTrace,medicineTrace,needsTrace,materialTrace,productiveEvidence,enemyTrace,urgentCompleteAt,leonieReleasedAt,productiveCreditApplied:false};
  const ledgerPath=info.outputPath('ledger.json'),text=JSON.stringify(ledger,null,2);await writeFile(ledgerPath,text);
  const summary=info.outputPath('raid-care-summary.json');await writeFile(summary,JSON.stringify({segment,inputPath:INPUT,inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,channel:'chrome',backend,bodyMs:bodyEnded-bodyStarted,overallMs:Date.now()-started,stop,failure:failure instanceof Error?{message:failure.message,stack:failure.stack}:failure,exportFailure,careStarted,urgentCompleteAt,leonieReleasedAt,milestones,clinicalTrace,medicineTrace,needsTrace,materialTrace,productiveEvidence,enemyTrace,actions,checkpoints,ledger:{path:ledgerPath,sha256:hash(text)},errors,lifecycle,artifactErrors,conservationDiagnostics,journal,ring,fallback,last:last?sample(last):null,enemyPermanentlyNeutralized:false,globalHealingQualified:false,productiveCreditApplied:false},null,2));await info.attach('raid care summary',{contentType:'application/json',path:summary});
  page.off('crash',crash);page.off('close',closed);browser?.off('disconnected',disconnected);
 }
 if(failure)throw failure instanceof Error?failure:new Error(JSON.stringify(failure));expect(exportFailure).toBeUndefined();expect(checkpoints.at(-1)?.reloaded).toBe(true);expect(last!.tick).toBeGreaterThanOrEqual(MIN_END);
}
