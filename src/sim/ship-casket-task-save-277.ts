import {isSchema277OrLater} from './schema-compatibility-257.ts';
import {isShipCasket277,type ShipCasketTask277} from './ship-casket-state-277.ts';
import {validShipCasketPatient277} from './ship-casket-intent-277.ts';
import {shipCasketContinuationReason277} from './ship-casket-task-277.ts';
import {shipCasketSubject277,shipCasketCarrierOf277} from './ship-casket-carry-277.ts';
import {shipCasketInteraction277} from './ship-casket-geometry-277.ts';
import {sameRescueEdge} from './rescue-save.ts';
import type {Pawn,World} from './types.ts';

const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validShipCasketTaskField277(p:unknown,version:number,tick:number,nextId:number):boolean {
 if(!plain(p))return false;if(!('shipCasketTask277'in p))return true;
 const d=Object.getOwnPropertyDescriptor(p,'shipCasketTask277'),t=d?.value;
 if(!isSchema277OrLater(version)||!d?.enumerable||!Object.hasOwn(d,'value')||!plain(t))return false;
 const carry=t.action==='carry',keys=['casketId','action','phase','progressCore','lastWorkedAt',...carry?['patient']:[]];
 if(Reflect.ownKeys(t).length!==keys.length||!Reflect.ownKeys(t).every(k=>{const d=Object.getOwnPropertyDescriptor(t,k);return typeof k==='string'&&keys.includes(k)&&d?.enumerable===true&&Object.hasOwn(d,'value');})||!int(t.casketId,1,nextId-1)||!int(t.lastWorkedAt,0,tick)||!int(t.progressCore,0,490)||t.progressCore%10!==0)return false;
 return (t.action==='enter'&&(t.phase==='approach'||t.phase==='closing')||carry&&validShipCasketPatient277(t.patient,nextId)&&(t.phase==='approach'||t.phase==='carry'||t.phase==='closing'))&&(t.phase==='closing'?t.lastWorkedAt===tick:t.progressCore===0);
}
function conflicts(p:Pawn):boolean {return p.jobId!==null||!!(p.haul||p.cooking||p.need||p.research||p.ward||p.feed||p.tend||p.surgery||p.rescue||p.animalRescue||p.animalHandling||p.animalCare||p.animalFeed||p.trade||p.orbitalTrade||p.deepWork||p.hunting||p.cleaning||p.firefighting||p.burial||p.equipmentTask||p.recreation.task||p.openCasket||p.cryptosleepTask||p.priorityWork||p.shooting?.order||p.melee?.order)||p.orders.active!==null||p.orders.queue.length>0;}
export function validateShipCasketTasks277(w:World):string[] {
 const errors:string[]=[],caskets=new Set<number>(),patients=new Set<string>();
 for(const p of w.pawns){
  if(!validShipCasketTaskField277(p,w.schemaVersion,w.tick,w.nextId)){errors.push('Invalid or future spatial casket task.');continue;}
  const t:ShipCasketTask277|undefined=p.shipCasketTask277;if(!t)continue;
  if(shipCasketContinuationReason277(w,p)||caskets.has(t.casketId)||conflicts(p)||!['moving','working'].includes(p.state)||p.draft&&(p.draft.target!==null||p.draft.queue.length))errors.push('Invalid spatial casket authority or exclusive activity.');
  caskets.add(t.casketId);const c=w.structures.find(s=>s.id===t.casketId&&isShipCasket277(s));if(!c)continue;
  const cell=shipCasketInteraction277(c,c.orientation);
  if(t.phase==='closing'&&(p.x!==cell.x||p.z!==cell.z||p.moveCooldown!==0||(p.motion?.end??0)>w.tick||p.path.length||p.state!=='working'))errors.push('Spatial casket closing lost settled contact.');
  if(t.action!=='carry'||!t.patient)continue;
  const key=`${t.patient.kind}:${t.patient.id}`,o=shipCasketSubject277(w,t.patient);if(!o||patients.has(key)){errors.push('Invalid or duplicate spatial casket patient.');continue;}patients.add(key);
  if(t.phase==='carry'||t.phase==='closing'){
   const a=o.kind==='human'?o.pawn:o.kind==='animal'?o.animal:o.mech;
   if(shipCasketCarrierOf277(w,t.patient)!==p||a.x!==p.x||a.z!==p.z||a.path.length||!sameRescueEdge(a.motion,p.motion)||(o.kind==='human'?o.pawn.moveCooldown!==p.moveCooldown:o.kind==='mechanical'&&o.mech.moveCooldown!==p.moveCooldown))errors.push('Spatial casket patient does not share its actual carrier edge.');
   if(o.kind==='human'&&(o.pawn.need||o.pawn.medicalSleep||o.pawn.shipCasketTask277||o.pawn.rescue||o.pawn.jobId!==null||o.pawn.haul||o.pawn.cooking||o.pawn.tend||o.pawn.feed||o.pawn.surgery||o.pawn.orders.active!==null||o.pawn.orders.queue.length))errors.push('Spatial passenger still owns another service.');
  }
 }
 return errors;
}
export function validShipCasketTaskTransport277(w:World):boolean {try{return validateShipCasketTasks277(w).length===0;}catch{return false;}}
