import { isPlayerPatient } from './affiliation.ts';
import { captureReason,completeCapture } from './capture.ts';
import { medicalWorkRefusal } from './health-rules.ts';
import { updatePawnHealth } from './health.ts';
import { rescueBedAvailable } from './medical-beds.ts';
import { carrierOf,rescueClaim,syncPatient } from './rescue-state.ts';
import { blockedCells,reachableCells,routeToCell,type Reachability } from './pathfinding.ts';
import { clearQueuedOrders } from './player-orders.ts';
import { planCommandDrops,releaseWork } from './work-release.ts';
import type { NeedContext } from './needs.ts';
import type { Cell,CommandResult,Pawn,World } from './types.ts';

export const wantsRescue=(p:Pawn):boolean=>isPlayerPatient(p)&&p.state==='downed'&&!(p.need?.kind==='sleep'&&p.need.bedId!==null&&p.need.phase==='sleep');
export function rescueReason(world:World,actor:Pawn,patient:Pawn|undefined):string|undefined {
  return medicalWorkRefusal(actor)??((patient?.prisoner?actor.priorities.warden:actor.priorities.doctor)===0?`${patient?.prisoner?'Geôlier':'Médecin'} est désactivé dans le tableau Travail.`
    :actor.collapsePending||world.restRules==='legacy'&&actor.rest===0?'Ce colon doit récupérer de son épuisement.'
    :carrierOf(world,actor.id)?'Ce colon est transporté.'
    :actor.interruptedCargo?'La cargaison doit être déposée avant le secours.'
    :!patient||patient===actor||!wantsRescue(patient)?'Cette personne ne nécessite pas de secours vers un lit.'
    :rescueClaim(world,patient.id,actor.id)?'Une autre personne a réservé ce secours.':undefined);
}
export function rescueProposal(world:World,actor:Pawn,patient:Pawn,reach:Reachability):{patientId:number;bedId:number;path:Cell[]}|undefined {
  if(rescueReason(world,actor,patient))return;
  const path=routeToCell(world,patient,reach);if(!path)return;
  const rank=(id:number,medical?:true)=>medical?0:patient.bedId===id?1:2;
  const beds=world.structures.filter(b=>rescueBedAvailable(world,b,patient,actor.id)).sort((a,b)=>
    rank(a.id,a.medical)-rank(b.id,b.medical)||(a.x-patient.x)**2+(a.z-patient.z)**2-(b.x-patient.x)**2-(b.z-patient.z)**2||a.id-b.id);
  for(const bed of beds)if(routeToCell(world,bed,reach))return {patientId:patient.id,bedId:bed.id,path};
}
export function startRescue(world:World,actor:Pawn,proposal:{patientId:number;bedId:number;path:Cell[]},forced=false,capture=false):void {
  const bed=world.structures.find(b=>b.id===proposal.bedId)!,patient=world.pawns.find(p=>p.id===proposal.patientId)!;
  if(!bed.medical&&!capture)patient.bedId=bed.id;
  actor.rescue={patientId:proposal.patientId,bedId:proposal.bedId,phase:'approach',...(capture?{capture:true as const}:{})};
  actor.path=proposal.path;actor.state='moving';actor.planCooldown=0;
  if(forced)actor.orders.active='rescue';
}
export function applyRescue(world:World,command:{pawnId:number;patientId:number;queue:boolean}):CommandResult {
  const actor=world.pawns.find(p=>p.id===command.pawnId),patient=world.pawns.find(p=>p.id===command.patientId);
  const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(!actor||!patient||typeof command.queue!=='boolean')return fail('Colon ou patient introuvable.');
  if(command.queue)return fail('Le secours direct ne peut pas encore être ajouté à une file.');
  const reason=rescueReason(world,actor,patient);if(reason)return fail(reason);
  const proposal=rescueProposal(world,actor,patient,reachableCells(world,actor,blockedCells(world),new Set()));
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
    const task=actor.rescue,patient=world.pawns.find(p=>p.id===task.patientId),bed=world.structures.find(s=>s.id===task.bedId);
    if(!patient||(task.capture?!!captureReason(world,actor,patient,true):!wantsRescue(patient))||!bed||!rescueBedAvailable(world,bed,patient,actor.id,!!task.capture)||medicalWorkRefusal(actor))releaseWork(world,actor);
  }
}
export function processRescue(world:World,actor:Pawn,context:NeedContext):void {
  const task=actor.rescue;if(!task)return;
  const patient=world.pawns.find(p=>p.id===task.patientId),bed=world.structures.find(s=>s.id===task.bedId);
  // Finish the previous physiological interval under its previous posture,
  // regardless of which actor was processed first in this tick.
  if(patient&&patient.health&&!patient.health.death&&patient.health.tick<world.tick)updatePawnHealth(world,patient);
  if(!patient||(task.capture?!!captureReason(world,actor,patient,true):!wantsRescue(patient))||!bed||!rescueBedAvailable(world,bed,patient,actor.id,!!task.capture)){releaseWork(world,actor);return;}
  actor.state='moving';
  if(task.phase==='approach'){
    if(actor.x!==patient.x||actor.z!==patient.z){context.move(patient,true);return;}
    if(patient.moveCooldown>0)return;
    patient.need=null;delete patient.medicalSleep;patient.path=[];
    task.phase='carry';actor.path=[];actor.planCooldown=0;syncPatient(world,actor);
    context.event(`${actor.name} prend ${patient.name} pour le porter vers un lit.`);
  }
  if(actor.x!==bed.x||actor.z!==bed.z){context.move(bed,true);syncPatient(world,actor);return;}
  if(task.capture&&!completeCapture(world,patient))return;
  // The mover has completed the captured edge before entering this processor.
  delete actor.rescue;actor.orders.active=null;actor.path=[];actor.state='idle';actor.planCooldown=0;
  patient.motion=null;patient.moveCooldown=0;
  if(!bed.medical)patient.bedId=bed.id;
  // Admission may finish after a captive recovers during transport. Only a
  // still-downed patient is installed in the lying service immediately; a
  // mobile captive chooses medical rest, sleep or food on its next turn.
  if(patient.state==='downed')patient.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:bed.x,z:bed.z}};
  else {patient.need=null;patient.state='idle';patient.planCooldown=0;patient.needCooldown=0;}
  context.event(task.capture?`${actor.name} a capturé ${patient.name} et l’a installé dans un lit de prison${bed.medical?' médical':''}.`:`${actor.name} a installé ${patient.name} dans un lit${bed.medical?' médical':''}.`);
}
