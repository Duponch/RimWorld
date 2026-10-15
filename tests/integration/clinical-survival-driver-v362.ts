/* PRIVATE preparation, never run. ROOT adoption destination:
 * tests/integration/clinical-survival-driver-v362.ts, beside existing UI helpers. */
import {expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors,tool,cell} from './helpers';
import {perform,revealCells} from './player-actions';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {canPlaceHumanSleepingSpot} from '../../src/sim/human-sleeping-spot';
import {rescueReason} from '../../src/sim/rescue';
import {rescueBedAvailable} from '../../src/sim/medical-beds';
import {tendingReason} from '../../src/sim/tending';
import {carrierOf} from '../../src/sim/rescue-state';
import {serviceCell} from '../../src/sim/service-reservations';
import {canDesignate} from '../../src/sim/engine';
import {ITEM_DEFINITIONS,type ItemId} from '../../src/sim/items';
import {INGEST_TICKS} from '../../src/sim/eating';
import {physicalEatingFactor} from '../../src/sim/health-rules';
import type {World,Pawn,Command,MaterialPile} from '../../src/sim/types';

const BASE='tmp/early-access-v360/native-01/visitor-care-v360-V360-rea-fdf37-e-and-clinical-continuation/';
export const V362_INPUT=BASE+'final.json',V362_INPUT_SHA='19cbd5219d27e335e99f9885dc2af1fb5d86cf605a2f30d684dc4467f62a8884';
const PARENT=BASE+'ledger.json',PARENT_SHA='1faef6af182e8284e3d5abbffc49722539547275e0f6d3e86bf9a322e2cac17b';
const ORIGINALS=[18530,18532,18534],PATIENTS=[19768,19771],LEONIE=18534,IRIS=18530,TARGET=19771,DOOR=18648,OLD_BED=19081,HORIZON=78605,GAP=8;
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const stationary=(w:World,p:Pawn)=>p.moveCooldown===0&&(p.motion?.end??w.tick)<=w.tick;
const local=(w:World,id:number)=>w.pawns.find(p=>p.id===id);
const person=(w:World,id:number)=>local(w,id)??w.visitors?.departed.find(d=>d.pawn.id===id)?.pawn;
const possessions=(w:World,id:number)=>[...w.piles,...(w.visitors?.departed.find(d=>d.pawn.id===id)?.items??[])].filter(p=>'pawnId' in p.owner&&p.owner.pawnId===id);
const colonial=(w:World,item:string)=>w.piles.filter(p=>p.item===item&&(p.owner.type==='ground'||p.owner.type==='pawn'&&ORIGINALS.includes(p.owner.pawnId)));
const incidents=(w:World)=>({raid:w.raids?.serial??0,small:w.smallIncidents?.incidents??0,flu:w.fluIncidents?.episodes??0,immune:w.fluIncidents?.immuneDiseases?.episodes??0,blight:w.miscIncidents?.cropBlights?.count??0,heat:w.miscIncidents?.heatwaves??0,cold:w.miscIncidents?.weather?.coldSnaps??0,eclipse:w.miscIncidents?.weather?.eclipses??0,flashstorm:w.flashstorm?.storms??0,pod:w.podRescues?.serial??0,fire:w.fires?.ledger.ignitions??0});
class Stop extends Error{constructor(readonly reason:string,readonly detail:unknown){super(reason);}}
type Checkpoint={name:string;path:string;sha256:string;tick:number;reloaded:boolean;screenshot:boolean;provenance:string};
type Ledger={version:362;originSha:string;inputSha:string;parentLedgerSha:string;checkpoint?:Checkpoint;resumeAllowed:boolean;secondSpotId?:number;secondBedId?:number;shelfId?:number;milestones:{inheritedMealFinished?:number;secondCarry?:number;secondDeposit?:number;shelfPlanned?:number;shelfFinished?:number};clinical:unknown[];nutrition:unknown[];production:unknown[];segments:unknown[];truncated:boolean};
type Meal={pawnId:number;name:string;sourceId:number;carryId:number;item:ItemId;quantity:number;source?:MaterialPile;sourceTick:number;sourceRemainder?:number;heldTick:number;lastTick:number;lastIngestTick?:number;lastProgress?:number;lastHunger?:number;invalidReason?:string;invalidAt?:number;ingestTick?:number;completion?:unknown};

/** Closed future meal witness. Held inputs have no pickup history. */
function mealObserver(initial:World){
 const meals=new Map<number,Meal>(),ground=new Map<number,{tick:number;pile:MaterialPile}>(),used=new Set<string>();
 for(const p of initial.pawns){const n=p.need;if(n?.kind!=='eat'||n.carryPileId===null||n.sourcePileId===null)continue;const c=initial.piles.find(i=>i.id===n.carryPileId);if(c)meals.set(c.id,{pawnId:p.id,name:p.name,sourceId:n.sourcePileId,carryId:c.id,item:c.item,quantity:n.quantity,sourceTick:-1,heldTick:initial.tick,lastTick:initial.tick,invalidReason:'Held at input; source history absent',invalidAt:initial.tick});}
 const observe=(w:World)=>{
  const byId=new Map(w.piles.map(p=>[p.id,p]));
  const invalidate=(m:Meal,reason:string)=>{m.invalidReason??=reason;m.invalidAt??=w.tick;};
  for(const p of w.pawns.filter(p=>ORIGINALS.includes(p.id))){const n=p.need;if(n?.kind!=='eat'||n.forced||n.carryPileId===null||n.sourcePileId===null)continue;const c=byId.get(n.carryPileId);if(!c||meals.has(c.id))continue;
   const prior=ground.get(n.sourcePileId),m:Meal={pawnId:p.id,name:p.name,sourceId:n.sourcePileId,carryId:c.id,item:c.item,quantity:n.quantity,source:prior?.pile,sourceTick:prior?.tick??-1,heldTick:w.tick,lastTick:w.tick};meals.set(c.id,m);
   if(!prior||w.tick-prior.tick>GAP||prior.pile.owner.type!=='ground'||c.kind!=='food'||c.owner.type!=='pawn'||c.owner.pawnId!==p.id||c.quantity!==n.quantity||prior.pile.item!==c.item){invalidate(m,'No fresh exact ground source/custody');continue;}
   const s=byId.get(m.sourceId);
   if(c.id===prior.pile.id){if(prior.pile.quantity!==m.quantity)invalidate(m,'Whole pickup quantity mismatch');}
   else if(prior.pile.quantity<=m.quantity||!s||s.owner.type!=='ground'||s.owner.x!==prior.pile.owner.x||s.owner.z!==prior.pile.owner.z||s.item!==m.item||s.quantity!==prior.pile.quantity-m.quantity||s.quantity<=0)invalidate(m,'Split source/remainder mismatch');else m.sourceRemainder=s.quantity;
  }
  for(const m of meals.values()){
   if(m.invalidReason||m.completion)continue;const p=local(w,m.pawnId),n=p?.need,c=byId.get(m.carryId);if(!p){invalidate(m,'Actor absent');continue;}
   if(w.tick-m.lastTick>GAP){invalidate(m,'Observed gap exceeds8');continue;}
   if(m.sourceRemainder!==undefined){const s=byId.get(m.sourceId),old=m.source;if(!old||old.owner.type!=='ground'||!s||s.owner.type!=='ground'||s.owner.x!==old.owner.x||s.owner.z!==old.owner.z||s.item!==m.item||s.quantity!==m.sourceRemainder){invalidate(m,'Observed source changed');continue;}}
   const matching=n?.kind==='eat'&&!n.forced&&n.sourcePileId===m.sourceId&&n.carryPileId===m.carryId&&n.quantity===m.quantity;
   if(!matching){
    const events=w.events.filter(e=>e.tick>(m.lastIngestTick??w.tick)&&e.tick<=w.tick&&e.message===`${m.name} a mangé une portion (${m.quantity} × ${ITEM_DEFINITIONS[m.item].label}) à table.`),key=events.length===1?`${events[0]!.tick}:${events[0]!.message}`:undefined;
    if(m.lastIngestTick!==undefined&&w.tick-m.lastIngestTick>0&&w.tick-m.lastIngestTick<=GAP&&!c&&p.hunger>(m.lastHunger??100)&&w.pawns.filter(q=>q.name===m.name).length===1&&events.length===1&&key&&!used.has(key)){used.add(key);m.completion={event:events[0],tick:w.tick,hunger:p.hunger};}else invalidate(m,'Interrupted/restarted or ambiguous completion');m.lastTick=w.tick;continue;
   }
   if(n?.kind!=='eat'){invalidate(m,'Unexpected task type');continue;}
   if(!c||c.item!==m.item||c.quantity!==m.quantity||c.owner.type!=='pawn'||c.owner.pawnId!==p.id){invalidate(m,'Cargo no longer exact');continue;}
   if(n.phase==='ingest'){
    if(!n.dining||n.dining.tableId===null||n.dining.seatId===null||!stationary(w,p)||p.x!==n.dining.target.x||p.z!==n.dining.target.z||physicalEatingFactor(p)>1){invalidate(m,'Nonstationary/unseated ingest or changed rate contract');continue;}
    if(m.ingestTick===undefined){if(n.progress>GAP){invalidate(m,'Fresh ingest history missed');continue;}m.ingestTick=w.tick;}
    if(m.lastProgress!==undefined&&n.progress<m.lastProgress){invalidate(m,'Ingest progress restarted');continue;}
    m.lastProgress=n.progress;m.lastIngestTick=w.tick;m.lastHunger=p.hunger;
   }else if(m.ingestTick!==undefined)invalidate(m,'Ingest interrupted');m.lastTick=w.tick;
  }
  ground.clear();for(const p of w.piles)if(p.kind==='food'&&p.owner.type==='ground')ground.set(p.id,{tick:w.tick,pile:structuredClone(p)});
 };
 observe(initial);return {observe,values:()=>[...meals.values()]};
}

export async function runClinicalSurvival(page:Page,info:TestInfo){
 page.setDefaultTimeout(10000);
 const segment=process.env.V362_SEGMENT??'01',seconds=Number(process.env.V362_BODY_SECONDS??120);
 expect(segment).toMatch(/^[a-zA-Z0-9_-]{1,32}$/);expect(seconds>=100&&seconds<=150).toBe(true);expect(INGEST_TICKS).toBeGreaterThan(GAP);
 const inputPath=process.env.V362_INPUT??V362_INPUT,inputSha=process.env.V362_INPUT_SHA??V362_INPUT_SHA,raw=await readFile(inputPath,'utf8');
 expect(digest(raw)).toBe(inputSha);const initial=deserializeWorld(raw);expect(initial).toEqual({...JSON.parse(raw),schemaVersion:initial.schemaVersion});expect(validateWorld(initial)).toEqual([]);expect(initial.tick).toBeLessThan(HORIZON);
 const parentText=await readFile(PARENT,'utf8');expect(digest(parentText)).toBe(PARENT_SHA);const parent=JSON.parse(parentText);expect(parent.checkpoint).toMatchObject({sha256:V362_INPUT_SHA,tick:72605});
 let ledger:Ledger;
 if(process.env.V362_LEDGER){const text=await readFile(process.env.V362_LEDGER,'utf8');expect(digest(text)).toBe(process.env.V362_LEDGER_SHA);ledger=JSON.parse(text);expect(ledger).toMatchObject({version:362,originSha:V362_INPUT_SHA,parentLedgerSha:PARENT_SHA,resumeAllowed:true,checkpoint:{sha256:inputSha,tick:initial.tick,reloaded:true}});ledger.inputSha=inputSha;}
 else{expect(inputSha).toBe(V362_INPUT_SHA);expect(initial.tick).toBe(72605);ledger={version:362,originSha:V362_INPUT_SHA,inputSha,parentLedgerSha:PARENT_SHA,resumeAllowed:true,milestones:{},clinical:(parent.careResults??[]).map((result:unknown)=>({historicalV360:true,result})),nutrition:[],production:[],segments:[],truncated:false};}
 expect(ledger.segments.some(s=>typeof s==='object'&&s!==null&&'segment' in s&&s.segment===segment),'Segment name must be new in the cumulative ledger').toBe(false);
 const started=Date.now(),errors=observeErrors(page),rotation={value:0},lifecycle:unknown[]=[],actions:unknown[]=[],journal:unknown[]=[],ring:unknown[]=[],checkpoints:Checkpoint[]=[],meal=mealObserver(initial);
 let bodyStarted=started,deadline=Infinity,observeUntil=Infinity,last:World|undefined,loaded=false,finalizing=false,stage='input',stop='not-started',failure:unknown,exportFailure:unknown,fallback:unknown,backend:unknown,lastJournal=-1,lastKey='';
 const segmentProgress:unknown[]=[],progressKeys=new Set<string>(),workStarts=new Map<string,number>();
 const mark=(key:string,value:unknown)=>{if(last&&last.tick>initial.tick&&!progressKeys.has(key)){progressKeys.add(key);segmentProgress.push(value);}};
 const baseline=incidents(initial),injuries=new Map(initial.pawns.map(p=>[p.id,new Set(p.health?.injuries.map(i=>i.id)??[])])),missing=new Map(initial.pawns.map(p=>[p.id,new Set(p.health?.missing.map(m=>m.part)??[])])),infection=new Map(initial.pawns.map(p=>[p.id,new Set(p.health?.infections?.cases.map(i=>i.id)??[])]));
 const alive=initial.pawns.filter(p=>p.state!=='dead'&&!p.health?.death).map(p=>p.id),property=PATIENTS.flatMap(id=>possessions(initial,id).filter(p=>p.kind!=='food').map(p=>structuredClone(p))),personalFood=PATIENTS.flatMap(id=>possessions(initial,id).filter(p=>p.kind==='food').map(p=>({id:p.id,owner:p.owner})));
 const seenEvents=new Set<string>(),doctorReads=new Map<number,{tick:number;p:Pawn;patients:Pawn[];cargo?:MaterialPile}>();
 const push=(a:unknown[],value:unknown,max=256)=>{a.push(value);if(a.length>max){a.shift();ledger.truncated=true;}};
 const onCrash=()=>lifecycle.push({kind:'pagecrash',elapsedMs:Date.now()-started}),onClose=()=>lifecycle.push({kind:'pageclose',elapsedMs:Date.now()-started}),onDisconnect=()=>lifecycle.push({kind:'browserdisconnected',elapsedMs:Date.now()-started});
 page.on('crash',onCrash);page.on('close',onClose);const browser=page.context().browser();browser?.on('disconnected',onDisconnect);
 const guard=(w:World)=>{
  if(errors.length||lifecycle.length)throw new Stop('technical-event',{errors,lifecycle});
  for(const id of alive){const p=person(w,id);if(!p||p.state==='dead'||p.health?.death)throw new Stop('new-death-or-loss',{id,tick:w.tick,p});}
  for(const id of [...ORIGINALS,...PATIENTS]){const p=person(w,id);if(!p)throw new Stop('person-loss',{id});if(ORIGINALS.includes(id)&&(p.state==='downed'||p.mental?.crisis||p.collapsePending))throw new Stop('original-incapacity',{id,tick:w.tick,p});
   if(p.health?.injuries.some(i=>!injuries.get(id)?.has(i.id))||p.health?.missing.some(m=>!missing.get(id)?.has(m.part)))throw new Stop('new-injury',{id,tick:w.tick});
   if(p.health?.infections?.cases.some(i=>!infection.get(id)?.has(i.id)))throw new Stop('new-infection',{id,tick:w.tick});
   if(ORIGINALS.includes(id))expect(physicalEatingFactor(p)).toBeLessThanOrEqual(1);
   if(PATIENTS.includes(id)){expect(p).toMatchObject({faction:'outlanders',visitor:{group:5}});expect(p.prisoner).toBeUndefined();expect(p.podRescue).toBeUndefined();const old=person(initial,id)?.visitor?.medicalGuestAt;if(old!==undefined)expect(p.visitor?.medicalGuestAt).toBe(old);}
  }
  if(w.pawns.some(p=>p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state))||w.visitors?.groups.some(g=>g.hostile&&g.members.some(id=>{const p=local(w,id);return p&&!['dead','downed'].includes(p.state);}))||w.wildlife?.animals.some(a=>a.manhunter&&!['dead','downed'].includes(a.state))||w.fires?.items.length)throw new Stop('danger',{tick:w.tick});
  const now=incidents(w),interventionKeys=['raid','small','flu','immune','blight','heat','cold','flashstorm','fire'] as const;
  if(interventionKeys.some(k=>now[k]>baseline[k]))throw new Stop('intervention-incident',{tick:w.tick,before:baseline,after:now,events:w.events.slice(-12)});
  for(const old of property){const id='pawnId' in old.owner?old.owner.pawnId:0;expect(possessions(w,id).find(p=>p.id===old.id),'Personal visitor property is not colony supply').toMatchObject({id:old.id,item:old.item,quantity:old.quantity,owner:old.owner});}
  for(const old of personalFood){const id='pawnId' in old.owner?old.owner.pawnId:0,p=possessions(w,id).find(p=>p.id===old.id);if(p)expect(p.owner).toEqual(old.owner);else expect(w.piles.find(p=>p.id===old.id)).toBeUndefined();}
  if(!w.structures.some(s=>s.id===DOOR)||!w.structures.some(s=>s.id===OLD_BED))throw new Stop('shelter-loss',{tick:w.tick});
  // Health/danger is checked first. The first adopted snapshot crossing the
  // bound is conserved, without actions or new favorable credits afterward.
  if(!finalizing&&w.tick>=HORIZON)throw new Stop('day-horizon',{tick:w.tick,overshoot:w.tick-HORIZON});
  if(!finalizing&&Date.now()>deadline)throw new Stop('body-bound',{tick:w.tick,stage});
 };
 const sample=(w:World)=>({tick:w.tick,stage,elapsedMs:Date.now()-started,people:[...ORIGINALS,...PATIENTS].map(id=>person(w,id)),door:w.structures.find(s=>s.id===DOOR),beds:w.structures.filter(s=>s.kind==='sleeping-spot'),medicine:w.piles.filter(p=>p.item==='medicine'),colonyMedicine:colonial(w,'medicine').reduce((n,p)=>n+p.quantity,0),food:w.piles.filter(p=>p.kind==='food'),wood:colonial(w,'wood'),stove:w.structures.find(s=>s.id===18884),fields:w.resources.filter(r=>r.kind==='rice').slice(0,12).map(r=>({id:r.id,x:r.x,z:r.z,growth:r.growth,growthTick:r.growthTick,bornAt:r.plantLife?.bornAt})),jobs:w.jobs,groups:w.visitors?.groups,departed:w.visitors?.departed.map(d=>({id:d.pawn.id,pawn:d.pawn,items:d.items})),incidents:incidents(w),events:w.events.slice(-12)});
 const observeClinical=(w:World)=>{
  for(const d of w.pawns.filter(p=>ORIGINALS.includes(p.id))){const previous=doctorReads.get(d.id),task=d.tend;
   if(task?.medicine&&!colonial(w,'medicine').some(p=>p.id===task.medicine!.sourcePileId)&&![19676,19678].includes(task.medicine.sourcePileId))throw new Stop('foreign-medical-source',{doctorId:d.id,task,tick:w.tick});
   if(previous&&w.tick>previous.tick&&w.tick-previous.tick<=GAP){for(const before of previous.patients){const p=person(w,before.id);if(!p)continue;const changed=p.health?.injuries.filter(i=>i.tended!==undefined&&before.health?.injuries.some(o=>o.id===i.id&&o.tended===undefined))??[];
    const events=w.events.filter(e=>e.tick>previous.tick&&e.tick<=w.tick&&e.message.startsWith(d.name+' a traité ')&&e.message.includes(' de '+p.name+' '));
    if(changed.length&&events.length===1){const e=events[0]!,key=JSON.stringify(e);if(!seenEvents.has(key)){seenEvents.add(key);const c=previous.cargo,now=c?w.piles.find(x=>x.id===c.id):undefined,task=previous.p.tend,dose=c&&task?.patientId===p.id&&task.medicine?.carryPileId===c.id&&task.medicine.item===c.item&&c.item==='medicine'&&c.owner.type==='pawn'&&c.owner.pawnId===d.id&&c.quantity-(now?.quantity??0)===1&&e.message.endsWith(`avec ${ITEM_DEFINITIONS[c.item].label}.`);push(ledger.clinical,{kind:'actual-tend-event',tick:w.tick,doctorId:d.id,patientId:p.id,injuries:changed.map(i=>({id:i.id,tended:i.tended})),event:e,medicineBefore:c,medicineAfter:now,doseObserved:!!dose,sourceToCargoQualified:false,xpBefore:previous.p.skills.medicine.xp,xpAfter:d.skills.medicine.xp},128);}}
    const f=previous.p.feed,c=previous.cargo;if(f?.patientId===p.id&&f.phase==='feed'&&c&&c.id===f.carryPileId&&c.kind==='food'&&c.quantity===f.quantity&&c.owner.type==='pawn'&&c.owner.pawnId===d.id){const label=ITEM_DEFINITIONS[c.item].label,text=`${p.name} a mangé une portion (${c.quantity} × ${label}) au lit, avec l’aide de ${d.name}.`,events=w.events.filter(e=>e.tick>previous.tick&&e.tick<=w.tick&&e.message===text);if(events.length===1&&!w.piles.some(x=>x.id===c.id)&&p.hunger>before.hunger){const key=JSON.stringify(events[0]);if(!seenEvents.has(key)){seenEvents.add(key);push(ledger.nutrition,{kind:'actual-bed-feed',patientId:p.id,doctorId:d.id,event:events[0],cargo:c,hungerBefore:before.hunger,hungerAfter:p.hunger,sourceToCargoQualified:false},128);}}}
   }}
   const carried=w.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===d.id&&(p.item==='medicine'||p.kind==='food'));
   if(task||d.feed)push(journal,{kind:'clinical-logistics',tick:w.tick,doctorId:d.id,tend:task,feed:d.feed,source:task?.medicine?w.piles.find(p=>p.id===task.medicine!.sourcePileId):undefined,cargo:carried},256);
   doctorReads.set(d.id,{tick:w.tick,p:structuredClone(d),patients:PATIENTS.map(id=>person(w,id)).filter((p):p is Pawn=>!!p).map(p=>structuredClone(p)),cargo:carried?structuredClone(carried):undefined});
  }
  for(const e of w.events.filter(e=>e.tick>initial.tick&&/a cuisiné/.test(e.message))){const key=JSON.stringify(e);if(!seenEvents.has(key)){seenEvents.add(key);push(ledger.production,{event:e,outputHistoryQualified:false,food:w.piles.filter(p=>p.kind==='food')},128);}}
 };
 const observeProgress=(w:World)=>{
  for(const result of [...ledger.clinical,...ledger.nutrition]){const r=result as {kind?:string;tick?:number;event?:unknown};if(['actual-tend-event','actual-bed-feed'].includes(r.kind??'')&&(r.tick??0)>initial.tick)mark(JSON.stringify(r.event),{kind:r.kind,tick:r.tick,event:r.event});}
  for(const m of meal.values())if(m.completion)mark('meal:'+m.carryId,{kind:'new-natural-meal-qualified',cargoId:m.carryId,completion:m.completion});
  for(const id of PATIENTS){const p=person(w,id),old=person(initial,id);if(!p||!old)continue;
   const departure=w.visitors?.departed.find(d=>d.pawn.id===id&&d.tick>initial.tick);if(departure)mark('departure:'+id,{kind:'actual-visitor-departure',id,tick:departure.tick});
   if(local(w,id)&&old.state==='downed'&&p.state!=='downed')mark('mobility:'+id,{kind:'patient-no-longer-downed',id,tick:w.tick,limits:'Observed posture, not complete cure'});
   const need=p.need;if(local(w,id)&&need?.kind==='sleep'&&need.phase==='sleep'&&w.structures.some(s=>s.id===need.bedId&&s.medical)&&p.rest>=old.rest+1)mark('rest:'+id,{kind:'medical-rest-gained',id,tick:w.tick,restBefore:old.rest,rest:p.rest});
  }
  for(const d of w.pawns.filter(p=>ORIGINALS.includes(p.id))){const t=d.tend?.phase==='tend'?d.tend:d.feed?.phase==='feed'?d.feed:undefined;
   if(t&&PATIENTS.includes(t.patientId)){const key=`work:${d.id}:${t.patientId}:${d.tend?'tend':'feed'}`,start=workStarts.get(key);if(start===undefined)workStarts.set(key,t.progress);else if(t.progress>=start+5)mark(key,{kind:'real-clinical-work-progress',doctorId:d.id,patientId:t.patientId,tick:w.tick,progressBefore:start,progress:t.progress});}
   if(d.rescue?.patientId===TARGET){const old=local(initial,d.id)!;if(Math.abs(d.x-old.x)+Math.abs(d.z-old.z)>=1)mark('route:'+d.id,{kind:'real-rescue-route-progress',actorId:d.id,tick:w.tick,from:{x:old.x,z:old.z},to:{x:d.x,z:d.z},phase:d.rescue.phase});}
  }
 };
 const needsSlow=(w:World)=>stage==='inherited-meal'||w.tick>=HORIZON-12||w.tick>=74070&&w.tick<=74120||meal.values().some(m=>!m.invalidReason&&!m.completion&&m.ingestTick!==undefined);
 const read=async(conserve=false)=>{const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);if(!conserve){guard(w);const fault=await page.evaluate(()=>window.__lisiere.incident);if(fault.graphicsFault||fault.simulationStopped)throw new Stop('technical-incident',fault);if(!finalizing){meal.observe(w);observeClinical(w);observeProgress(w);if(await page.locator('[data-speed="0"]').getAttribute('aria-pressed')!=='true'){const target=needsSlow(w)?1:6,button=page.locator(`[data-speed="${target}"]`);if(await button.getAttribute('aria-pressed')!=='true')await button.click();}}}const value=sample(w);push(ring,value,16);const key=JSON.stringify([stage,...w.pawns.filter(p=>ORIGINALS.includes(p.id)||PATIENTS.includes(p.id)).map(p=>[p.id,p.state,p.rescue?.phase,p.tend?.phase,p.feed?.phase,p.need?.kind])]);if(key!==lastKey||w.tick-lastJournal>=90){push(journal,value);lastKey=key;lastJournal=w.tick;}return w;};
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
 const run=async(speed:1|6)=>{await pause(page);const w=await read();await closeMenu();await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed===6&&needsSlow(w)?1:speed}"]`).click();};
 const wait=async(done:(w:World)=>boolean)=>{while(Date.now()<observeUntil){const w=await read();if(done(w))return w;await page.waitForTimeout(100);}throw new Stop('segment-bound',{tick:last?.tick,stage});};
 const capture=async(name:string,reload=true,screenshot=false,conserve=false)=>{
  await pause(page);await closeMenu();const before=await read(conserve);expect(validateWorld(before)).toEqual([]);expect(checkpoints.length).toBeLessThan(3);
  if(screenshot){expect(checkpoints.filter(c=>c.screenshot).length).toBeLessThan(2);await page.screenshot({path:info.outputPath(name+'.png')});}
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label=`V362 ${segment} ${name}`;
  await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);
  const record:Checkpoint={name,path,sha256:digest(text),tick:before.tick,reloaded:false,screenshot,provenance:'UI export; not reloaded'};checkpoints.push(record);
  if(reload){await page.locator('#browse-saves').click();const front=page.locator('.front-menu'),row=front.locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front.getByRole('button',{name:'Charger',exact:true}).click();await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,before);record.reloaded=true;record.provenance='UI export and exact reload';}
  ledger.checkpoint=record;await info.attach(name,{contentType:'application/json',path});await closeMenu();return before;
 };
 const act=async(command:Command,reason:string)=>{await pause(page);await read();await perform(page,{command,reason},rotation);const w=await read();push(actions,{command,reason,tick:w.tick});return w;};
 const deposited=(w:World)=>{const p=local(w,TARGET),n=p?.need;return !!p&&n?.kind==='sleep'&&n.phase==='sleep'&&n.bedId!==null&&w.structures.some(s=>s.id===n.bedId&&s.medical)&&stationary(w,p)&&!carrierOf(w,TARGET);};
 const ensureSpot=async()=>{
  await pause(page);let w=await read(),spot=w.structures.find(s=>s.kind==='sleeping-spot'&&s.x===122&&s.z===114&&s.orientation===1);
  if(!spot){expect(canPlaceHumanSleepingSpot(w,{type:'designate',kind:'sleeping-spot',x:122,z:114,orientation:1}).ok).toBe(true);await page.keyboard.press('Escape');await tool(page,'sleeping-spot');
   const angle=async()=>{const text=(await page.locator('#placement-orientation').innerText()).trim();expect(text).toMatch(/^(0|90|180|270)°$/);return Number(text.replace('°',''))/90;};
   for(let n=0;n<4&&await angle()!==1;n++)await page.keyboard.press('e');expect(await angle()).toBe(1);rotation.value=1;
   await revealCells(page,[{x:122,z:114},{x:123,z:114}]);await cell(page,122,114);w=await wait(state=>state.structures.some(s=>s.kind==='sleeping-spot'&&s.x===122&&s.z===114&&s.orientation===1));spot=w.structures.find(s=>s.kind==='sleeping-spot'&&s.x===122&&s.z===114&&s.orientation===1)!;push(actions,{kind:'actual-floorbed-adopted',tick:w.tick,spot});
  }
  ledger.secondSpotId=spot.id;if(!spot.medical)await act({type:'medical-bed',bedId:spot.id,enabled:true},'Définir le second couchage réel comme médical');
  w=await read();expect(w.structures.find(s=>s.id===spot!.id)).toMatchObject({kind:'sleeping-spot',orientation:1,x:122,z:114,medical:true});
 };
 let shelfRetry=initial.tick;
 const optionalShelf=async(w:World)=>{
  if(process.env.V362_SHELF!=='1'||!ledger.milestones.secondDeposit||w.tick>=74070||w.tick<shelfRetry)return;
  const s=w.structures.find(s=>s.kind==='small-shelf'&&s.x===121&&s.z===114);if(s){if(!ledger.milestones.shelfFinished){ledger.shelfId=s.id;ledger.milestones.shelfFinished=w.tick;push(ledger.production,{kind:'shelf-finished-observed',tick:w.tick,structure:s,storage:w.stockpiles,piles:w.piles.filter(p=>p.owner.type==='ground'&&p.owner.x===121&&p.owner.z===114),paymentHistoryQualified:false},128);}return;}
  if(ledger.milestones.shelfPlanned||w.jobs.some(j=>j.kind==='small-shelf'&&j.x===121&&j.z===114))return;
  const cmd:Command={type:'designate',kind:'small-shelf',x:121,z:114,orientation:0,material:'wood'},issue=w.pawns.some(p=>{const c=serviceCell(p);return c?.x===121&&c.z===114;}),admission=canDesignate(w,cmd);
  if(issue||!admission.ok||colonial(w,'wood').reduce((n,p)=>n+p.quantity,0)<10){push(journal,{kind:'shelf-deferred',tick:w.tick,serviceReserved:issue,admission});shelfRetry=w.tick+90;return;}
  const after=await act(cmd,'Petite étagère réelle sur la réserve, seulement après dépôt médical et admission');ledger.milestones.shelfPlanned=after.tick;await run(6);
 };
 try{
  expect(person(initial,TARGET)).toMatchObject({faction:'outlanders',visitor:{group:5}});expect(initial.structures.find(s=>s.id===OLD_BED)).toMatchObject({kind:'sleeping-spot',medical:true,x:124,z:112});
  expect(initial.structures.find(s=>s.id===DOOR)).toMatchObject({door:{forbidden:false}});
  const file=info.outputPath('literal-input.json');await writeFile(file,raw);await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(file);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,initial);loaded=true;
  bodyStarted=Date.now();deadline=bodyStarted+seconds*1000;observeUntil=deadline-18000;await pause(page);stage='initial';await capture('initial');let w=await read();
  if(!ledger.milestones.inheritedMealFinished){const n=local(w,IRIS)?.need;if(n?.kind==='eat'&&n.carryPileId===19793){const hunger=local(w,IRIS)!.hunger;stage='inherited-meal';await run(1);w=await wait(state=>{const need=local(state,IRIS)?.need;return need?.kind!=='eat'||need.carryPileId!==19793;});await pause(page);w=await read();if(w.piles.some(p=>p.id===19793)||local(w,IRIS)!.hunger<=hunger)throw new Stop('inherited-meal-interrupted',{tick:w.tick,cargoId:19793});push(ledger.nutrition,{kind:'inherited-meal-finished-observed',tick:w.tick,cargoId:19793,sourceToCargoQualified:false,explanation:'Travel cargo already present in input; no fresh pickup qualification'},128);}
   ledger.milestones.inheritedMealFinished=w.tick;
  }
  if(!ledger.milestones.secondDeposit){stage='second-medical-place';await ensureSpot();w=await read();}
  if(!ledger.milestones.secondDeposit&&local(w,TARGET)&&!deposited(w)){
   const existing=w.pawns.find(p=>p.rescue?.patientId===TARGET);
   if(existing){ledger.secondBedId=existing.rescue!.bedId??undefined;push(journal,{kind:'resumed-rescue',tick:w.tick,actorId:existing.id,task:existing.rescue});}
   else{const d=local(w,LEONIE)!,p=local(w,TARGET)!,bed=w.structures.find(s=>s.id===ledger.secondSpotId)!;expect(d.draft).toBeUndefined();const stamp=p.visitor?.medicalGuestAt,reason=rescueReason(w,d,p,true);if(reason||!rescueBedAvailable(w,bed,p,d.id))throw new Stop('rescue-admission-refused',{tick:w.tick,reason,bedId:bed.id});stage='civil-rescue-order';w=await act({type:'order-rescue',pawnId:LEONIE,patientId:TARGET,queue:false},'Secourir le second visiteur vers le couchage médical réellement disponible');expect(local(w,LEONIE)?.rescue).toMatchObject({patientId:TARGET,phase:'approach'});expect(local(w,TARGET)?.visitor?.medicalGuestAt).toBe(stamp);ledger.secondBedId=local(w,LEONIE)?.rescue?.bedId??undefined;}
   stage='rescue-physical';await run(6);let carryCaptured=false;
   while(Date.now()<observeUntil){w=await read();const carrier=carrierOf(w,TARGET);
    if(carrier&&!ledger.milestones.secondCarry){ledger.milestones.secondCarry=w.tick;ledger.secondBedId=carrier.rescue?.bedId??undefined;mark('pickup',{kind:'new-second-pickup',tick:w.tick,actorId:carrier.id});push(ledger.clinical,{kind:'actual-second-pickup',tick:w.tick,actorId:carrier.id,task:carrier.rescue,patient:local(w,TARGET),qualification:'Medical admission observed only on actual custody pickup'},128);}
    if(carrier&&!carryCaptured&&checkpoints.length<2){await run(1);await pause(page);w=await read();if(carrierOf(w,TARGET)){stage='actual-carry';await revealCells(page,[local(w,TARGET)!]);await capture('actual-carry',true,true);carryCaptured=true;}stage='rescue-physical';await run(6);}
    if(deposited(w)){ledger.milestones.secondDeposit??=w.tick;mark('deposit',{kind:'new-second-deposit',tick:w.tick});const p=local(w,TARGET)!,n=p.need;ledger.secondBedId=n?.kind==='sleep'?n.bedId??undefined:ledger.secondBedId;push(ledger.clinical,{kind:'actual-second-deposit',tick:w.tick,patient:p,bedId:ledger.secondBedId,qualification:'Downed/rest and actual bed, not recovery'},128);break;}
    await page.waitForTimeout(100);
   }
   if(!ledger.milestones.secondDeposit)throw new Stop('segment-bound',{tick:last?.tick,stage});
  }else if(!ledger.milestones.secondDeposit&&deposited(w)){ledger.milestones.secondDeposit=w.tick;push(journal,{kind:'existing-deposit-at-input',tick:w.tick,patientId:TARGET});}
  else if(ledger.milestones.secondDeposit)push(journal,{kind:'historical-deposit-not-reordered',tick:w.tick,patient:person(w,TARGET)});
  await pause(page);w=await read();stage='ordinary-clinical-needs';
  const patient=local(w,TARGET),engaged=w.pawns.some(p=>p.tend?.patientId===TARGET||p.feed?.patientId===TARGET);
  if(patient&&!engaged&&patient.health?.injuries.some(i=>i.tended===undefined)){
   const d=[IRIS,LEONIE].map(id=>local(w,id)).find(p=>p&&!p.need&&!p.draft&&!p.rescue&&!p.tend&&!p.feed&&!p.interruptedCargo&&!tendingReason(w,p,patient));
   if(d)await act({type:'order-tend',pawnId:d.id,patientId:TARGET,queue:false},'Soin civil au chevet réel avec médicaments de la colonie');
   else push(journal,{kind:'ordinary-provider-wait',tick:w.tick,reason:'No currently free admissible doctor; no need override'});
  }
  await run(6);let speed:1|6=6;
  while(Date.now()<observeUntil){w=await read();
   await optionalShelf(w);w=await read();const witness=meal.values().find(m=>!m.invalidReason&&!m.completion&&m.ingestTick!==undefined);
   const nearIncident=w.tick>=74070&&w.tick<=74120,next:1|6=witness||nearIncident?1:6;if(next!==speed){await run(next);speed=next;}
   await page.waitForTimeout(100);
  }
  if(stop==='not-started')stop='segment-bound';
 }catch(e){if(e instanceof Stop&&['segment-bound','day-horizon','body-bound'].includes(e.reason)){stop=e.reason;push(journal,{kind:'planned-bound',reason:e.reason,detail:e.detail});}else{failure=e instanceof Stop?{reason:e.reason,detail:e.detail}:e;stop=e instanceof Stop?e.reason:'technical-or-oracle-error';ledger.resumeAllowed=false;}}
 finally{
  finalizing=true;
  if(loaded&&!page.isClosed()&&checkpoints.length<3)try{stage=failure?'conservation':'final';if(!failure)await capture('final',true,true);else await capture('conservation',false,true,true);}catch(e){exportFailure=e instanceof Error?{message:e.message,stack:e.stack}:e;ledger.resumeAllowed=false;if(e instanceof Stop&&!failure){failure={reason:e.reason,detail:e.detail};stop=e.reason;if(checkpoints.length<3&&!page.isClosed())try{stage='conservation';await capture('conservation',false,true,true);}catch(second){exportFailure={first:exportFailure,conservation:String(second)};}}}
  if(last){const errors=validateWorld(last);if(!errors.length){const text=serializeWorld(last),path=info.outputPath('last-adopted.json');await writeFile(path,text);fallback={path,sha256:digest(text),tick:last.tick,provenance:'Last adopted read, not UI export'};}else fallback={validation:errors.slice(0,12),count:errors.length};}
  for(const result of meal.values().filter(m=>!!m.completion))push(ledger.nutrition,{kind:'future-natural-table-meal-qualified',result},128);
  const report=info.outputPath('clinical-survival-summary.json'),segmentQualified=!failure&&!exportFailure&&segmentProgress.length>0;
  push(ledger.segments,{segment,inputSha,startTick:initial.tick,endTick:last?.tick,stop,report,segmentQualified,segmentProgress,clinicalGoalCompleted:false},64);
  const ledgerPath=info.outputPath('ledger.json'),text=JSON.stringify(ledger,null,2);await writeFile(ledgerPath,text);await writeFile(report,JSON.stringify({version:362,segment,inputPath,inputSha,parentLedgerSha:PARENT_SHA,channel:'chrome',backend,bodyMs:Date.now()-bodyStarted,overallMs:Date.now()-started,stop,segmentQualified,segmentProgress,observedHorizonOvershoot:last?Math.max(0,last.tick-HORIZON):0,partialReason:!failure&&!segmentQualified?'No new clinical/durable progress; exact checkpoint remains available':undefined,failure:failure instanceof Error?{message:failure.message,stack:failure.stack}:failure,exportFailure,allVisitorsSaved:false,campaignQualified:false,clinicalGoalCompleted:false,feedThreshold:26,actions,checkpoints,ledger:{path:ledgerPath,sha256:digest(text),resumeAllowed:ledger.resumeAllowed},inheritedMealId:19793,meals:meal.values(),personalNonfoodBaseline:property,errors,lifecycle,journal,ring,fallback,last:last?sample(last):null},null,2));await info.attach('V362 summary',{contentType:'application/json',path:report});
  page.off('crash',onCrash);page.off('close',onClose);browser?.off('disconnected',onDisconnect);
 }
 if(failure)throw failure instanceof Error?failure:new Error(JSON.stringify(failure));expect(exportFailure,'Final exact checkpoint required; a fallback is not a successful UI reload').toBeUndefined();expect(last!.tick).toBeGreaterThan(initial.tick);expect(segmentProgress.length,'No new observed clinical/durable progress in this segment: honest partial checkpoint, not a PASS from historical carry').toBeGreaterThan(0);expect(checkpoints.at(-1)?.reloaded).toBe(true);
}
