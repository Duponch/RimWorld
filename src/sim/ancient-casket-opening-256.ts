import {reservedServiceCells} from './service-reservations.ts';
import {ancientCasketOpenIntent256,ancientCasketOpenerCapable256 as capable,ancientCasketClaim256} from './ancient-casket-open-intent-256.ts';
export {ancientCasketClaim256} from './ancient-casket-open-intent-256.ts';
export {validAncientOpening256,validAncientOpeningField256} from './ancient-casket-state-256.ts';
import {allowedAreaReason} from './allowed-area-state.ts';
import {planCommandDrops,releaseWork} from './work-release.ts';
import {clearQueuedOrders} from './player-orders.ts';
import {ANCIENT_CASKET_OPEN_CORE_256,validAncientOpeningField256,ancientCasketInteraction256,ancientCasketHasContents256,isAncientCasket256,type AncientCasket256,type AncientCasketPawn256,type AncientCasketCommand256,type AncientCasketOpening256} from './ancient-casket-state-256.ts';
import {planAncientCasketRelease256} from './ancient-casket-release-256.ts';
import type {NeedContext} from './needs.ts';
import type {CommandResult,Pawn,World} from './types.ts';
const get=(w:World,id:number)=>w.structures.find(s=>s.id===id&&isAncientCasket256(s)) as unknown as AncientCasket256|undefined;
const fail=(reason:string):CommandResult=>({ok:false,reason});
export function releaseAncientCasketOpening256(p:Pawn):void {delete (p as AncientCasketPawn256).openCasket;}
export function reconcileAncientCasketOpening256(w:World,p:Pawn):void {
 const t=p.openCasket;if(!t)return;const target=get(w,t.casketId);if(capable(p)&&target&&ancientCasketHasContents256(target.casket))return;
 delete p.openCasket;p.path=[];p.planCooldown=0;if(p.moveCooldown===0&&(p.motion?.end??0)<=w.tick&&['working','moving'].includes(p.state))p.state='idle';
}
/** One confirmed local interval only. Calling twice at the same tick, a pause,
 * a skipped tick, loss of contact or a captured movement edge grants no work. */
export function advanceAncientOpeningContact256(t:AncientCasketOpening256,tick:number,contact:boolean):'wait'|'cancel'|'ready' {
 if(!Number.isSafeInteger(tick)||tick<t.lastWorkedAt||!contact)return 'cancel';
 if(t.phase==='approach'){t.phase='opening';t.progressCore=0;t.lastWorkedAt=tick;return 'wait';}
 if(tick===t.lastWorkedAt)return 'wait';
 if(tick!==t.lastWorkedAt+1)return 'cancel';
 t.lastWorkedAt=tick;t.progressCore+=10;return t.progressCore>=ANCIENT_CASKET_OPEN_CORE_256?'ready':'wait';
}
export function applyAncientCasketOpen256(w:World,c:AncientCasketCommand256):CommandResult {
 const intent=ancientCasketOpenIntent256(w,c);if(!intent.ok)return fail(intent.reason);
 const {pawn:p,target,path}=intent;
 const drops=planCommandDrops(w,{type:'clear-orders',pawnId:p.id});if(!drops||!releaseWork(w,p,drops))return fail('La cargaison doit pouvoir être déposée avant l’ouverture.');
 clearQueuedOrders(w,p);delete p.priorityWork;releaseAncientCasketOpening256(p);
 (p as AncientCasketPawn256).openCasket={casketId:target.id,phase:'approach',progressCore:0,lastWorkedAt:w.tick};
 p.path=path;p.state=path.length?'moving':'working';p.planCooldown=0;return {ok:true};
}
/** Integrate before ordinary work, using its existing exact movement context. */
export function processAncientCasketOpening256(w:World,p:Pawn,context:NeedContext):boolean {
 const task=(p as AncientCasketPawn256).openCasket;if(!task)return false;
 const target=get(w,task.casketId),cancel=()=>{releaseAncientCasketOpening256(p);p.path=[];p.planCooldown=0;if(p.state==='working')p.state='idle';};
 if(!target||!capable(p)||ancientCasketClaim256(w,target.id,p.id)||!ancientCasketHasContents256(target.casket)){cancel();return false;}
 const cell=ancientCasketInteraction256(target);if(allowedAreaReason(w,p,cell)||reservedServiceCells(w,p.id).has(cell.z*w.width+cell.x)){cancel();return false;}
 const contact=p.x===cell.x&&p.z===cell.z&&p.moveCooldown===0&&!(p.motion&&p.motion.end>w.tick);
 if(!contact){if(task.phase==='opening'){cancel();return false;}context.move(cell,true);return true;}
 p.path=[];p.state='working';const result=advanceAncientOpeningContact256(task,w.tick,true);
 if(result==='cancel'){cancel();return false;}if(result==='wait')return true;
 const release=planAncientCasketRelease256(w,target);if(!release.ok){context.event(release.reason);cancel();return false;}
 const committed=release.commit();if(!committed.ok){cancel();return false;}
 cancel();context.event(`${p.name} ouvre une capsule ancienne ; ${committed.retained} contenu(s) restent détenus si aucune sortie physique n’est disponible.`);return true;
}

/** Context validation shared by RAW and the private reconstructed snapshot,
 * before adoption. No route search, mutation, reservation creation or cache. */
export function validateAncientOpeningOwners256(w:World):string[] {
 const errors:string[]=[],claimed=new Set<number>();
 for(const pawn of w.pawns){if(!validAncientOpeningField256(pawn,w.schemaVersion,w.tick,w.nextId)){errors.push('Invalid or future actual casket opening task.');continue;}
  const task=(pawn as AncientCasketPawn256).openCasket;if(!task)continue;
  const target=get(w,task.casketId),cell=target?ancientCasketInteraction256(target):undefined;
  if(!target||!capable(pawn)||!ancientCasketHasContents256(target.casket)||claimed.has(task.casketId)||!cell||allowedAreaReason(w,pawn,cell)||reservedServiceCells(w,pawn.id).has(cell.z*w.width+cell.x)||pawn.jobId!==null||pawn.haul||pawn.cooking||pawn.need||pawn.research||pawn.ward||pawn.feed||pawn.tend||pawn.surgery||pawn.rescue||pawn.animalRescue||pawn.animalHandling||pawn.animalCare||pawn.animalFeed||pawn.trade||pawn.orbitalTrade||pawn.deepWork||pawn.hunting||pawn.cleaning||pawn.firefighting||pawn.burial||pawn.equipmentTask||pawn.recreation.task||pawn.orders.active!==null||pawn.orders.queue.length||pawn.priorityWork)errors.push('Actual casket opening context/claim is invalid.');
  else if(task.phase==='opening'&&(pawn.x!==cell.x||pawn.z!==cell.z||pawn.moveCooldown!==0||(pawn.motion?.end??0)>w.tick||pawn.path.length||pawn.state!=='working'))errors.push('Actual opening lost continuous settled contact.');
  claimed.add(task.casketId);
 }
 return errors;
}
