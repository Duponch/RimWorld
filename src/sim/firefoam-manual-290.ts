import {isFirefoamPopper290} from './firefoam-content-290.ts';
import {startFirefoamWick290} from './firefoam-290.ts';
import {isColonist} from './affiliation.ts';
import {medicalWorkRefusal,pawnBody} from './health-rules.ts';
import {allowedAreaReason} from './allowed-area-state.ts';
import {blockedCells,reachableCells,routeToJob,canStopAt,adjacent} from './pathfinding.ts';
import {reservedServiceCells} from './service-reservations.ts';
import {groupOnMapMember} from './group-state.ts';
import {scoutOnMapId} from './caravan-trip.ts';
import {commercialOnMapId} from './commercial-trip.ts';
import {planCommandDrops,releaseWork} from './work-release.ts';
import {clearQueuedOrders} from './player-orders.ts';
import type {NeedContext} from './needs.ts';
import type {Cell,CommandResult,Pawn,Structure,World} from './types.ts';

export const FIREFOAM_MANUAL_USE_CORE_290=100;
export interface FirefoamManualTask290 {structureId:number;phase:'approach'|'use';progressCore:number;lastWorkedAt:number}
export interface FirefoamTriggerCommand290 {type:'firefoam-trigger';pawnId:number;structureId:number}
export type FirefoamManualIntent290={ok:false;reason:string}|{ok:true;pawn:Pawn;target:Structure;path:Cell[]};
const target=(w:World,id:number)=>w.structures.find(s=>s.id===id&&isFirefoamPopper290(s.kind)&&!!s.firefoam290);
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
function data(value:unknown,keys:readonly string[]):value is Record<string,unknown> {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
 const own=Reflect.ownKeys(value);return own.length===keys.length&&own.every(k=>typeof k==='string'&&keys.includes(k))&&keys.every(k=>{
  const d=Object.getOwnPropertyDescriptor(value,k);return !!d&&d.enumerable&&Object.hasOwn(d,'value');
 });
}
export function validFirefoamTriggerCommand290(raw:unknown,version:number,nextId:number):raw is FirefoamTriggerCommand290 {
 try{return (version===290||(version===291||version===292))&&integer(nextId,1)&&data(raw,['type','pawnId','structureId'])&&raw.type==='firefoam-trigger'
  &&integer(raw.pawnId,1,nextId-1)&&integer(raw.structureId,1,nextId-1);}catch{return false;}
}
/** Absent is handled by the owner-field fence; explicit undefined is invalid. */
export function validFirefoamManualTask290(raw:unknown,version:number,tick:number,nextId:number):raw is FirefoamManualTask290 {
 try{return (version===290||(version===291||version===292))&&integer(tick)&&integer(nextId,1)&&data(raw,['structureId','phase','progressCore','lastWorkedAt'])
  &&integer(raw.structureId,1,nextId-1)&&(raw.phase==='approach'||raw.phase==='use')
  &&integer(raw.progressCore,0,FIREFOAM_MANUAL_USE_CORE_290-10)&&raw.progressCore%10===0
  &&(raw.phase!=='approach'||raw.progressCore===0)&&integer(raw.lastWorkedAt,0,tick);}catch{return false;}
}
export function validFirefoamManualField290(owner:unknown,version:number,tick=Number.MAX_SAFE_INTEGER,nextId=Number.MAX_SAFE_INTEGER):boolean {
 try{
  if(!owner||typeof owner!=='object'||Array.isArray(owner))return false;
  const field=Object.getOwnPropertyDescriptor(owner,'firefoamTask290');if(!field)return !('firefoamTask290'in owner);
  return Object.hasOwn(field,'value')&&field.enumerable===true&&validFirefoamManualTask290(field.value,version,tick,nextId);
 }catch{return false;}
}

/** Local Pawn records are humans; animals/mechanoids have separate owners and
 * cannot acquire this civilian order. Medical refusal supplies the real hand
 * capacity check; no firefighting skill/priority or doctor's role is required. */
export const firefoamManualCapable290=(p:Pawn,tick:number):boolean=>isColonist(p)&&!p.prisoner&&!p.visitor&&!p.podRescue&&!p.raid
 &&!p.draft&&!p.mental?.crisis&&!p.burning&&!p.flee&&!p.bombRefuge
 &&!(p.stun&&p.stun.untilCore>tick*10)&&!medicalWorkRefusal(p)&&pawnBody(p).capacities.manipulation>0
 &&!['dead','downed'].includes(p.state);
export const firefoamManualClaim290=(w:World,id:number,except?:number):boolean=>w.pawns.some(p=>p.id!==except&&p.firefoamTask290?.structureId===id);

/** The selected Touch cell is the existing path endpoint during approach,
 * then the actual logical contact cell. No second persistent target or claim. */
export function firefoamManualServiceCell290(p:Pawn,w:Pick<World,'structures'>):Cell|null {
 const task=p.firefoamTask290;if(!task)return null;
 const s=w.structures.find(s=>s.id===task.structureId&&isFirefoamPopper290(s.kind));if(!s)return null;
 const cell=task.phase==='use'?p:p.path.at(-1)??p;
 return adjacent(cell,s)?{x:cell.x,z:cell.z}:null;
}
/** UI and command admission share real capability, claim, area and routing.
 * Structures have no generic forbidden flag in this product: effective area,
 * removal and service ownership are the actual local restrictions. */
export function firefoamUseIntent290(w:World,c:FirefoamTriggerCommand290):FirefoamManualIntent290 {
 const fail=(reason:string):FirefoamManualIntent290=>({ok:false,reason});
 if(!validFirefoamTriggerCommand290(c,w.schemaVersion,w.nextId))return fail('Ordre de déclenchement invalide.');
 const p=w.pawns.find(p=>p.id===c.pawnId),s=target(w,c.structureId);
 if(!p||!firefoamManualCapable290(p,w.tick)||!s)return fail('Un colon libre, démobilisé et capable de manipuler doit rejoindre le dispositif installé.');
 if(groupOnMapMember(w,p.id))return fail('Terminez ou annulez la préparation du groupe avant cet ordre.');
 if(p.id===(scoutOnMapId(w)??commercialOnMapId(w)))return fail('Terminez ou annulez le voyage et son déchargement avant cet ordre.');
 if(firefoamManualClaim290(w,s.id,p.id))return fail('Ce dispositif est déjà réservé.');
 const reserved=reservedServiceCells(w,p.id),reach=reachableCells(w,p,blockedCells(w),reserved);
 const path=routeToJob(w,s,reach);if(path===null)return fail('Aucune vraie case de contact accessible n’est disponible.');
 const cell=path.at(-1)??p,reason=allowedAreaReason(w,p,cell);if(reason)return fail(reason);
 if(reserved.has(cell.z*w.width+cell.x)||!canStopAt(w,cell,reach))return fail('La case de contact est indisponible.');
 return {ok:true,pawn:p,target:s,path};
}
export function queryFirefoamUseReason290(w:World,pawnId:number,structureId:number):string|undefined {
 const intent=firefoamUseIntent290(w,{type:'firefoam-trigger',pawnId,structureId});return intent.ok?undefined:intent.reason;
}
export function releaseFirefoamManual290(p:Pawn):void {delete p.firefoamTask290;}
function cancel(w:World,p:Pawn):void {
 releaseFirefoamManual290(p);p.path=[];p.planCooldown=0;
 // Retire only future motion. An already acquired physical edge stays owned
 // by the existing movement layer until its confirmed end.
 if(p.moveCooldown===0&&(p.motion?.end??0)<=w.tick&&['working','moving'].includes(p.state))p.state='idle';
}
export function reconcileFirefoamManual290(w:World,p:Pawn):void {
 if(!p.firefoamTask290)return;
 const task=p.firefoamTask290,s=target(w,task.structureId),cell=firefoamManualServiceCell290(p,w);
 if((Number(w.schemaVersion)===290||(Number(w.schemaVersion)===291||Number(w.schemaVersion)===292))&&s&&firefoamManualCapable290(p,w.tick)&&!firefoamManualClaim290(w,s.id,p.id)
  &&cell&&!allowedAreaReason(w,p,cell)&&canStopAt(w,cell)&&!reservedServiceCells(w,p.id).has(cell.z*w.width+cell.x)
  &&(task.phase==='approach'||p.moveCooldown===0&&(p.motion?.end??0)<=w.tick&&p.path.length===0&&p.state==='working'))return;
 cancel(w,p);
}
/** Same-tick duplicate calls, skipped intervals or lost contact grant no work.
 * Entering contact establishes a baseline, never ten ticks before arrival. */
export function advanceFirefoamManualContact290(task:FirefoamManualTask290,tick:number,contact:boolean):'wait'|'cancel'|'ready' {
 if(!integer(tick)||tick<task.lastWorkedAt||!contact)return 'cancel';
 if(task.phase==='approach'){task.phase='use';task.progressCore=0;task.lastWorkedAt=tick;return 'wait';}
 if(tick===task.lastWorkedAt)return 'wait';
 if(tick!==task.lastWorkedAt+1)return 'cancel';
 task.lastWorkedAt=tick;task.progressCore+=10;return task.progressCore>=FIREFOAM_MANUAL_USE_CORE_290?'ready':'wait';
}
export function applyFirefoamTrigger290(w:World,c:FirefoamTriggerCommand290):CommandResult {
 const intent=firefoamUseIntent290(w,c);if(!intent.ok)return {ok:false,reason:intent.reason};
 const {pawn:p,path,target:s}=intent;
 const drops=planCommandDrops(w,{type:'clear-orders',pawnId:p.id});
 if(!drops||!releaseWork(w,p,drops))return {ok:false,reason:'La cargaison doit pouvoir être déposée avant le déclenchement.'};
 clearQueuedOrders(w,p);delete p.priorityWork;releaseFirefoamManual290(p);
 p.firefoamTask290={structureId:s.id,phase:'approach',progressCore:0,lastWorkedAt:w.tick};
 p.path=path;p.state=path.length?'moving':'working';p.planCooldown=0;return {ok:true};
}
/** Hook before ordinary work, after movement edges have settled. It never
 * arms from a query, a path reservation, arrival, or incomplete use progress. */
export function processFirefoamManual290(w:World,p:Pawn,context:NeedContext):boolean {
 const task=p.firefoamTask290;if(!task)return false;
 reconcileFirefoamManual290(w,p);if(!p.firefoamTask290)return false;
 const s=target(w,task.structureId),cell=firefoamManualServiceCell290(p,w);if(!s||!cell){cancel(w,p);return false;}
 const contact=p.x===cell.x&&p.z===cell.z&&p.moveCooldown===0&&(p.motion?.end??0)<=w.tick;
 if(!contact){if(task.phase==='use'){cancel(w,p);return false;}context.move(cell,true);return true;}
 p.path=[];p.state='working';const result=advanceFirefoamManualContact290(task,w.tick,true);
 if(result==='cancel'){cancel(w,p);return false;}if(result==='wait')return true;
 const armed=startFirefoamWick290(w,s,w.tick*10);cancel(w,p);
 if(armed)context.event(`${p.name} déclenche le dispositif anti-incendie après son intervention.`);
 return true;
}

/** Complete current-owner admission only. No route search or ownership
 * repair; off-map/archived task refusal belongs to the global owner fence. */
export function validateFirefoamManualOwners290(w:World):string[] {
 const errors:string[]=[],claimed=new Set<number>();
 for(const p of w.pawns){
  if(!validFirefoamManualField290(p,w.schemaVersion,w.tick,w.nextId)){errors.push('Invalid or future firefoam manual task.');continue;}
  const task=p.firefoamTask290;if(!task)continue;
  const s=target(w,task.structureId),cell=firefoamManualServiceCell290(p,w);
  if(!s||!firefoamManualCapable290(p,w.tick)||claimed.has(task.structureId)||!cell||allowedAreaReason(w,p,cell)
   ||!canStopAt(w,cell)||reservedServiceCells(w,p.id).has(cell.z*w.width+cell.x)
   ||p.jobId!==null||p.haul||p.cooking||p.need||p.research||p.ward||p.feed||p.tend||p.surgery||p.rescue||p.animalRescue
   ||p.animalHandling||p.animalCare||p.animalFeed||p.trade||p.orbitalTrade||p.brewing||p.deepWork||p.hunting||p.cleaning
   ||p.firefighting||p.burial||p.equipmentTask||p.recreation.task||p.openCasket||p.cryptosleepTask||p.shipCasketTask277
   ||p.coupleTask285||p.orders.active!==null||p.orders.queue.length||p.priorityWork)errors.push('Invalid actual firefoam manual contact/claim/engagement.');
  else if(task.phase==='use'&&(p.x!==cell.x||p.z!==cell.z||p.moveCooldown!==0||(p.motion?.end??0)>w.tick||p.path.length||p.state!=='working'))errors.push('Firefoam manual use lost continuous settled contact.');
  claimed.add(task.structureId);
 }
 return errors;
}
