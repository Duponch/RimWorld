import {CRYPTOSLEEP_ENTER_CORE_271,CRYPTOSLEEP_OPEN_CORE_271,isPlayerCasket271,cryptosleepInteraction271,type CryptosleepTask271} from './cryptosleep-state-271.ts';
import {cryptosleepContinuationReason271} from './cryptosleep-task-271.ts';
import {sameRescueEdge} from './rescue-save.ts';
import {carrierOf} from './rescue-state.ts';
import type {Pawn,World} from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validCryptosleepTaskField271(p:unknown,version:number,tick:number,nextId:number):boolean {
 if(!record(p))return false;if(!Object.hasOwn(p,'cryptosleepTask'))return true;
 const d=Object.getOwnPropertyDescriptor(p,'cryptosleepTask'),t=d?.value;
 if(version!==271||!d?.enumerable||!Object.hasOwn(d,'value')||!record(t))return false;
 if(!Reflect.ownKeys(t).every(k=>{const d=Object.getOwnPropertyDescriptor(t,k);return typeof k==='string'&&d?.enumerable===true&&Object.hasOwn(d,'value');}))return false;
 const carry=t.action==='carry',keys=['casketId','action','phase','progressCore','lastWorkedAt',...carry?['patientId']:[]];
 if(Reflect.ownKeys(t).length!==keys.length||!Reflect.ownKeys(t).every(k=>typeof k==='string'&&keys.includes(k)&&Object.getOwnPropertyDescriptor(t,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(t,k)!,'value'))||!int(t.casketId,1,nextId-1)||!int(t.lastWorkedAt,0,tick)||!int(t.progressCore)||t.progressCore%10!==0)return false;
 if(carry&&!int(t.patientId,1,nextId-1))return false;
 const work=t.phase==='closing'||t.phase==='opening';
 return (t.action==='enter'?(t.phase==='approach'||t.phase==='closing'):t.action==='open'?(t.phase==='approach'||t.phase==='opening'):carry&&(t.phase==='approach'||t.phase==='carry'||t.phase==='closing'))
  &&(work?t.lastWorkedAt===tick&&t.progressCore<(t.action==='open'?CRYPTOSLEEP_OPEN_CORE_271:CRYPTOSLEEP_ENTER_CORE_271):t.progressCore===0);
}
function conflicts(p:Pawn):boolean {
 return p.jobId!==null||!!(p.haul||p.cooking||p.need||p.research||p.ward||p.feed||p.tend||p.surgery||p.rescue||p.animalRescue||p.animalHandling||p.animalCare||p.animalFeed||p.trade||p.orbitalTrade||p.deepWork||p.hunting||p.cleaning||p.firefighting||p.burial||p.equipmentTask||p.recreation.task||p.openCasket||p.priorityWork||p.shooting?.order||p.melee?.order)||p.orders.active!==null||p.orders.queue.length>0;
}
/** RAW/public reconstruction guard: derived claims and actual local originals,
 * with no route search, mutation, held-world simulation or permissive fallback. */
export function validateCryptosleepTasks271(w:World):string[] {
 const errors:string[]=[],caskets=new Set<number>(),patients=new Set<number>();
 for(const p of w.pawns){
  if(!validCryptosleepTaskField271(p,w.schemaVersion,w.tick,w.nextId)){errors.push('Invalid or future cryptosleep task.');continue;}
  const t:CryptosleepTask271|undefined=p.cryptosleepTask;if(!t)continue;
  if(cryptosleepContinuationReason271(w,p)||caskets.has(t.casketId)||conflicts(p)||!['moving','working'].includes(p.state))errors.push('Invalid cryptosleep authority, activity or casket claim.');
  caskets.add(t.casketId);
  const target=w.structures.find(s=>s.id===t.casketId&&isPlayerCasket271(s));
  if(!target||!isPlayerCasket271(target))continue;const cell=cryptosleepInteraction271(target);
  if(t.phase==='closing'||t.phase==='opening'){
   if(p.x!==cell.x||p.z!==cell.z||p.moveCooldown!==0||(p.motion?.end??0)>w.tick||p.path.length||p.state!=='working')errors.push('Cryptosleep work lost continuous settled contact.');
  }
  if(t.action!=='carry')continue;
  const patient=w.pawns.find(q=>q.id===t.patientId);
  if(!patient||patient===p||patients.has(t.patientId!)){errors.push('Invalid or duplicate cryptosleep patient.');continue;}
  patients.add(patient.id);
  if(t.phase==='carry'||t.phase==='closing'){
   if(carrierOf(w,patient.id)!==p||patient.x!==p.x||patient.z!==p.z||patient.moveCooldown!==p.moveCooldown||!sameRescueEdge(patient.motion,p.motion))errors.push('Cryptosleep patient does not share the carrier edge.');
   if(patient.need||patient.path.length||patient.medicalSleep||patient.cryptosleepTask||patient.rescue||patient.jobId!==null||patient.haul||patient.cooking||patient.tend||patient.feed||patient.surgery||patient.recreation.task||patient.orders.active!==null||patient.orders.queue.length)errors.push('Cryptosleep passenger still owns another service.');
  }
 }
 return errors;
}
export function validCryptosleepTaskTransport271(w:World):boolean {try{return validateCryptosleepTasks271(w).length===0;}catch{return false;}}
