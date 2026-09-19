import { isColonist } from './affiliation.ts';
import { lyingPatient,patientClaimed,bedsideAccess } from './care-access.ts';
export { lyingPatient } from './care-access.ts';
import { medicalTendQuality,medicalTendSpeed,treatmentTarget,treatmentTargets,treatmentBatch,urgentTreatment,type TendTask } from './care-rules.ts';
import { tendQuality,tendXp } from './medicine-rules.ts';
import { reserveMedicine,medicineTaskValid,pickupMedicine,consumeMedicine } from './medicine-logistics.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { medicalWorkRefusal } from './health-rules.ts';
import { healthRandom,updatePawnHealth,reconcilePawnHealth } from './health.ts';
import { tendInjury,tendMissingPart } from './injury-state.ts';
import { learnSkill } from './skills.ts';
import { blockedCells,reachableCells,routeToCell,workNeighbours,type Reachability } from './pathfinding.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { canStandAt } from './furniture-travel.ts';
import { carrierOf } from './rescue-state.ts';
import { clearQueuedOrders } from './player-orders.ts';
import { planCommandDrops,releaseWork } from './work-release.ts';
import type { NeedContext } from './needs.ts';
import type { Cell,CommandResult,Pawn,World } from './types.ts';

/** Completing or cancelling this service keeps accepted subsequent work.
 * Only an impossible physical drop needs the emergency cargo state. */
function releaseTending(world:World,doctor:Pawn):void {
  if(!releaseWork(world,doctor))interruptWork(world,doctor);
}

export function tendingReason(world:World,doctor:Pawn,patient:Pawn|undefined,accepted=false):string|undefined {
  return medicalWorkRefusal(doctor)??(!accepted&&doctor.priorities.doctor===0?'Médecin est désactivé.'
    :doctor.interruptedCargo?'La cargaison doit être déposée avant les soins.'
    :!accepted&&(doctor.collapsePending||world.restRules==='legacy'&&doctor.rest===0)?'Ce colon doit récupérer de son épuisement.'
    :!patient||!isColonist(patient)?'Patient de la colonie introuvable.'
    :patient===doctor&&(world.schemaVersion<49||!doctor.selfTend)?'Les auto-soins sont désactivés dans Santé.'
    :patient!==doctor&&!lyingPatient(patient)||carrierOf(world,patient.id)?'Le patient doit être installé dans un lit.'
    :!treatmentTarget(patient)?'Aucune plaie autorisée ne nécessite un traitement.'
    :patientClaimed(world,patient.id,doctor)?'Ce patient est déjà réservé par un médecin.':undefined);
}
export function tendingProposal(world:World,doctor:Pawn,patient:Pawn,reach:Reachability):{task:TendTask;path:Cell[]}|undefined {
  if(tendingReason(world,doctor,patient))return;
  const prepare=(task:TendTask,path:Cell[])=>({task,path:reserveMedicine(world,doctor,patient,task,reach)??path});
  if(patient===doctor){
    // Self-treatment needs no bed. If currently using furniture, leave its
    // service physically for an adjacent work cell under the 3D stop contract.
    const reserved=reservedServiceCells(world,doctor.id);
    for(const spot of [{x:doctor.x,z:doctor.z},...workNeighbours(doctor)])if(canStandAt(world,spot)&&!reserved.has(spot.z*world.width+spot.x)){
      const path=routeToCell(world,spot,reach);if(path)return prepare({...(world.schemaVersion>=50&&urgentTreatment(doctor)?{urgent:true as const}:{}),patientId:doctor.id,spot,phase:'approach',progress:0},path);
    }
    return;
  }
  const best=bedsideAccess(world,doctor,patient,reach);
  return best?prepare({patientId:patient.id,spot:best.spot,phase:'approach',progress:0},best.path):undefined;
}
export function tendingPlaceValid(world:World,doctor:Pawn,patient:Pawn,task:TendTask):boolean {
  const distance=Math.abs(task.spot.x-patient.x)+Math.abs(task.spot.z-patient.z);
  return canStandAt(world,task.spot)&&(patient===doctor?(task.phase==='pickup'||distance<=(task.phase==='approach'?1:0)):distance===1);
}
export function startTending(doctor:Pawn,proposal:{task:TendTask;path:Cell[]},forced=false):void {
  doctor.tend=proposal.task;doctor.path=proposal.path;doctor.state='moving';doctor.planCooldown=0;if(forced)doctor.orders.active='tend';
}
export function applyTending(world:World,command:{pawnId:number;patientId:number;queue:boolean}):CommandResult {
  const doctor=world.pawns.find(p=>p.id===command.pawnId),patient=world.pawns.find(p=>p.id===command.patientId);
  const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(!doctor||!patient||typeof command.queue!=='boolean')return fail('Colon ou patient introuvable.');
  if(command.queue)return fail('La file de soins n’est pas encore disponible.');
  const reason=tendingReason(world,doctor,patient);if(reason)return fail(reason);
  const proposal=tendingProposal(world,doctor,patient,reachableCells(world,doctor,blockedCells(world),new Set()));
  if(!proposal)return fail('Aucune place de soin accessible au chevet.');
  const drops=planCommandDrops(world,{type:'order-tend',...command});if(!drops||!releaseWork(world,doctor,drops))return fail('Pas de place pour déposer la cargaison.');
  // A direct order is the ordinary provider, even for a bleeding actor.
  delete proposal.task.urgent;
  clearQueuedOrders(world,doctor);delete doctor.priorityWork;startTending(doctor,proposal,true);return {ok:true};
}
export function reconcileTending(world:World):void {
  for(const d of world.pawns)if(d.tend){const p=world.pawns.find(p=>p.id===d.tend!.patientId);
    if(tendingReason(world,d,p,true)||d.priorities.doctor===0&&d.orders.active!=='tend'||!p||!tendingPlaceValid(world,d,p,d.tend)||!medicineTaskValid(world,d,p,d.tend))releaseTending(world,d);
  }
}
export function processTending(world:World,doctor:Pawn,context:NeedContext,light:()=>number,search:()=>Reachability|null=context.search):void {
  const task=doctor.tend;if(!task)return;const patient=world.pawns.find(p=>p.id===task.patientId)!;
  if(patient?.health&&patient.health.tick<world.tick&&!patient.health.death)updatePawnHealth(world,patient);
  if(tendingReason(world,doctor,patient,true)||!medicineTaskValid(world,doctor,patient,task)){releaseTending(world,doctor);return;}
  if(task.phase==='find-medicine'){
    const reach=search();if(!reach)return;
    task.phase='approach';doctor.path=reserveMedicine(world,doctor,patient,task,reach)??[];doctor.state='moving';
  }
  if(task.phase==='pickup'){pickupMedicine(world,doctor,context);return;}
  if(doctor.x!==task.spot.x||doctor.z!==task.spot.z){context.move(task.spot,true);return;}
  task.duration??=Math.max(1,Math.floor(600/medicalTendSpeed(doctor,light())));
  task.phase='tend';doctor.state='working';doctor.path=[];task.progress+=10;
  if(task.progress<task.duration)return;
  const item=task.medicine?.item,batch=treatmentBatch(treatmentTargets(patient),!!item);if(!batch.length){releaseTending(world,doctor);return;}
  // XP is awarded at a completed treatment before its quality stat is queried.
  learnSkill(doctor.skills.medicine,tendXp(item),doctor);
  const quality=medicalTendQuality(doctor);
  for(const target of batch)if(target.injuryId!==undefined)tendInjury(patient.health!,target.injuryId,tendQuality(quality,healthRandom(world),doctor===patient,item));
  else tendMissingPart(patient.health!,target.part);
  consumeMedicine(world,task);
  reconcilePawnHealth(world,patient);
  context.event(`${doctor.name} a traité ${batch.length} plaie(s) ${doctor===patient?'sur soi':`de ${patient.name}`} ${item?`avec ${ITEM_DEFINITIONS[item].label}`:'sans médicament'}.`);
  task.progress-=task.duration;
  if(!treatmentTarget(patient)||task.urgent&&doctor===patient){releaseTending(world,doctor);if(task.urgent){doctor.planCooldown=0;doctor.needCooldown=0;}}
  else if(task.useMedicine&&!task.medicine){task.phase='find-medicine';doctor.state='moving';}
}
