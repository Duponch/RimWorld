import { interruptWork } from './interrupted-cargo.ts';
import { allowedAreaServicesAllowed } from './allowed-area-services.ts';
import { allowedAreaAllows,allowedAreaReason } from './allowed-area-state.ts';
import { bedSlotCell } from './bed-slots.ts';
import { isCarePatient } from './affiliation.ts';
import { captureReason,completeCapture } from './capture.ts';
import { medicalWorkRefusal } from './health-rules.ts';
import { backgroundWorkRefusal } from './colonist-backgrounds.ts';
import { updatePawnHealth } from './health.ts';
import { rescueBedAvailable,rescueBedPlaces,medicalBedPreference } from './medical-beds.ts';
import { carrierOf,rescueClaim,syncPatient } from './rescue-state.ts';
import { blockedCells,reachableCells,routeToCell,type Reachability } from './pathfinding.ts';
import { clearQueuedOrders } from './player-orders.ts';
import { processPrisonerRelease,reconcileRelease } from './prisoner-release.ts';
import { processArrest,reconcileArrest } from './arrest.ts';
import { planCommandDrops,releaseWork } from './work-release.ts';
import type { NeedContext } from './needs.ts';
import type { BedSlot,Cell,CommandResult,Pawn,World } from './types.ts';

export interface RescueProposal {patientId:number;bedId:number;path:Cell[];bedSlot?:BedSlot}

export const wantsRescue=(p:Pawn,forced=false):boolean=>(isCarePatient(p)||forced&&p.faction==='outlanders'&&!!p.podRescue)&&p.state==='downed'&&!(p.need?.kind==='sleep'&&p.need.bedId!==null&&p.need.phase==='sleep');
export function rescueReason(world:World,actor:Pawn,patient:Pawn|undefined,forced=false):string|undefined {
  if(!forced&&patient){const reason=allowedAreaReason(world,actor,patient);if(reason)return reason;}
  // Forced Rescue/Capture are Core menu services, not admitted work providers.
  if(!forced){const refusal=backgroundWorkRefusal(actor,patient?.prisoner?'warden':'doctor');if(refusal)return refusal;}
  return medicalWorkRefusal(actor)??(!forced&&(patient?.prisoner?actor.priorities.warden:actor.priorities.doctor)===0?`${patient?.prisoner?'Geôlier':'Médecin'} est désactivé dans le tableau Travail.`
    :actor.collapsePending||world.restRules==='legacy'&&actor.rest===0?'Ce colon doit récupérer de son épuisement.'
    :carrierOf(world,actor.id)?'Ce colon est transporté.'
    :actor.interruptedCargo?'La cargaison doit être déposée avant le secours.'
    :!patient||patient===actor||!wantsRescue(patient,forced)?'Cette personne ne nécessite pas de secours vers un lit.'
    :rescueClaim(world,patient.id,actor.id)?'Une autre personne a réservé ce secours.'
    :world.pawns.some(p=>p.id!==actor.id&&p.tend?.drafted&&p.tend.patientId===patient.id)?'Cette personne est réservée pour des soins mobilisés.':undefined);
}
export function rescueProposal(world:World,actor:Pawn,patient:Pawn,reach:Reachability,forced=false):RescueProposal|undefined {
  if(rescueReason(world,actor,patient,forced))return;
  const path=routeToCell(world,patient,reach);if(!path)return;
  const rank=(bed:import('./types.ts').Structure)=>bed.medical?medicalBedPreference(bed):patient.bedId===bed.id?2:3;
  const beds=world.structures.flatMap(b=>rescueBedPlaces(world,b,patient,actor.id).filter(place=>allowedAreaAllows(world,actor,place.cell)).map(place=>({bed:b,cell:place.cell,slot:place.bedSlot})))
    .sort((a,b)=>rank(a.bed)-rank(b.bed)||(a.cell.x-patient.x)**2+(a.cell.z-patient.z)**2-(b.cell.x-patient.x)**2-(b.cell.z-patient.z)**2||a.bed.id-b.bed.id||(a.slot??0)-(b.slot??0));
  for(const {bed,cell,slot} of beds)if(routeToCell(world,cell,reach))return {patientId:patient.id,bedId:bed.id,path,...(slot!==undefined?{bedSlot:slot}:{})};
}
export function startRescue(world:World,actor:Pawn,proposal:RescueProposal,forced=false,capture=false):void {
  const bed=world.structures.find(b=>b.id===proposal.bedId)!,patient=world.pawns.find(p=>p.id===proposal.patientId)!;
  if(bed.kind==='double-bed'&&(capture||proposal.bedSlot===undefined||!rescueBedAvailable(world,bed,patient,actor.id,false,proposal.bedSlot)))return;
  if(!bed.medical&&!capture){patient.bedId=bed.id;if(bed.kind==='double-bed')patient.bedSlot=proposal.bedSlot;else delete patient.bedSlot;}
  actor.rescue={patientId:proposal.patientId,bedId:proposal.bedId,phase:'approach',...(bed.kind==='double-bed'?{bedSlot:proposal.bedSlot}:{}),...(capture?{capture:true as const}:{})};
  actor.path=proposal.path;actor.state='moving';actor.planCooldown=0;
  if(forced)actor.orders.active='rescue';
}
export function applyRescue(world:World,command:{pawnId:number;patientId:number;queue:boolean}):CommandResult {
  const actor=world.pawns.find(p=>p.id===command.pawnId),patient=world.pawns.find(p=>p.id===command.patientId);
  const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(!actor||!patient||typeof command.queue!=='boolean')return fail('Colon ou patient introuvable.');
  if(command.queue)return fail('Le secours direct ne peut pas encore être ajouté à une file.');
  const reason=rescueReason(world,actor,patient,true);if(reason)return fail(reason);
  const proposal=rescueProposal(world,actor,patient,reachableCells(world,actor,blockedCells(world),new Set()),true);
  if(!proposal)return fail('Aucun patient et couchage admissible reliés par un accès praticable.');
  const drops=planCommandDrops(world,{type:'order-rescue',...command});
  if(!drops)return fail('Pas de place pour déposer la cargaison avant le secours.');
  if(!releaseWork(world,actor,drops))return fail('Impossible de libérer le travail précédent.');
  clearQueuedOrders(world,actor);delete actor.priorityWork;startRescue(world,actor,proposal,true);
  return {ok:true};
}
/** Cheap relationship checks; navigation is revalidated by the ordinary mover. */
export function reconcileRescues(world:World):void {
  for(const actor of world.pawns)if(actor.rescue){
    if(!allowedAreaServicesAllowed(world,actor)){if(!releaseWork(world,actor))interruptWork(world,actor);continue;}
    if(actor.rescue.release){reconcileRelease(world,actor);continue;}
    if(actor.rescue.arrest){reconcileArrest(world,actor);continue;}
    const task=actor.rescue,patient=world.pawns.find(p=>p.id===task.patientId),bed=world.structures.find(s=>s.id===task.bedId);
    if(!patient||!task.capture&&actor.orders.active!=='rescue'&&backgroundWorkRefusal(actor,patient.prisoner?'warden':'doctor')||(task.capture?!!captureReason(world,actor,patient,true):!wantsRescue(patient,actor.orders.active==='rescue'))||!bed
      ||bed.kind==='double-bed'&&(task.bedSlot===undefined||patient.bedId!==bed.id||patient.bedSlot!==task.bedSlot)
      ||!rescueBedAvailable(world,bed,patient,actor.id,!!task.capture,task.bedSlot)||medicalWorkRefusal(actor))releaseWork(world,actor);
  }
}
export function processRescue(world:World,actor:Pawn,context:NeedContext):void {
  if(!allowedAreaServicesAllowed(world,actor)){if(!context.release())interruptWork(world,actor);return;}
  const task=actor.rescue;if(!task)return;
  if(task.release){processPrisonerRelease(world,actor,context);return;}
  if(task.arrest){processArrest(world,actor,context);return;}
  const patient=world.pawns.find(p=>p.id===task.patientId),bed=world.structures.find(s=>s.id===task.bedId);
  // Finish the previous physiological interval under its previous posture,
  // regardless of which actor was processed first in this tick.
  if(patient&&patient.health&&!patient.health.death&&patient.health.tick<world.tick)updatePawnHealth(world,patient);
  if(!patient||!task.capture&&actor.orders.active!=='rescue'&&backgroundWorkRefusal(actor,patient.prisoner?'warden':'doctor')||(task.capture?!!captureReason(world,actor,patient,true):!wantsRescue(patient,actor.orders.active==='rescue'))||!bed
    ||bed.kind==='double-bed'&&(task.bedSlot===undefined||patient.bedId!==bed.id||patient.bedSlot!==task.bedSlot)
    ||!rescueBedAvailable(world,bed,patient,actor.id,!!task.capture,task.bedSlot)){releaseWork(world,actor);return;}
  const target=bed.kind==='double-bed'&&task.bedSlot!==undefined?bedSlotCell(bed,task.bedSlot):bed;
  if(!target){releaseWork(world,actor);return;}
  if(bed.kind==='double-bed'&&(actor.moveCooldown>0||(actor.motion?.end??0)>world.tick))return;
  actor.state='moving';
  if(task.phase==='approach'){
    if(actor.x!==patient.x||actor.z!==patient.z){context.move(patient,true);return;}
    if(patient.moveCooldown>0||bed.kind==='double-bed'&&(patient.motion?.end??0)>world.tick)return;
    patient.need=null;delete patient.medicalSleep;patient.path=[];
    task.phase='carry';actor.path=[];actor.planCooldown=0;syncPatient(world,actor);
    context.event(`${actor.name} prend ${patient.name} pour le porter vers un lit.`);
  }
  if(actor.x!==target.x||actor.z!==target.z){context.move(target,true);syncPatient(world,actor);return;}
  if(bed.kind==='double-bed')syncPatient(world,actor);
  if(task.capture&&!completeCapture(world,patient))return;
  // Admission follows the actual bed deposit, never the order or pickup.
  if(!task.capture&&patient.faction==='outlanders'&&patient.podRescue)patient.podRescue.admittedAt??=world.tick;
  // The mover has completed the captured edge before entering this processor.
  delete actor.rescue;actor.orders.active=null;actor.path=[];actor.state='idle';actor.planCooldown=0;
  patient.motion=null;patient.moveCooldown=0;
  if(!bed.medical){patient.bedId=bed.id;if(bed.kind==='double-bed')patient.bedSlot=task.bedSlot;else delete patient.bedSlot;}
  // Admission may finish after a captive recovers during transport. Only a
  // still-downed patient is installed in the lying service immediately; a
  // mobile captive chooses medical rest, sleep or food on its next turn.
  if(patient.state==='downed')patient.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:target.x,z:target.z}};
  else {patient.need=null;patient.state='idle';patient.planCooldown=0;patient.needCooldown=0;}
  context.event(task.capture?`${actor.name} a capturé ${patient.name} et l’a installé dans un lit de prison${bed.medical?' médical':''}.`:`${actor.name} a installé ${patient.name} dans un lit${bed.medical?' médical':''}.`);
}
