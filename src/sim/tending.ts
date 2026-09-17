import { lyingPatient,patientClaimed,bedsideAccess } from './care-access.ts';
export { lyingPatient } from './care-access.ts';
import { dryTendQuality,medicalTendQuality,medicalTendSpeed,treatmentTarget,type TendTask } from './care-rules.ts';
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

export function tendingReason(world:World,doctor:Pawn,patient:Pawn|undefined,accepted=false):string|undefined {
  return medicalWorkRefusal(doctor)??(!accepted&&doctor.priorities.doctor===0?'Médecin est désactivé.'
    :doctor.interruptedCargo?'La cargaison doit être déposée avant les soins.'
    :!accepted&&(doctor.collapsePending||world.restRules==='legacy'&&doctor.rest===0)?'Ce colon doit récupérer de son épuisement.'
    :!patient?'Patient introuvable.'
    :patient===doctor&&(world.schemaVersion<49||!doctor.selfTend)?'Les auto-soins sont désactivés dans Santé.'
    :patient!==doctor&&!lyingPatient(patient)||carrierOf(world,patient.id)?'Le patient doit être installé dans un lit.'
    :!treatmentTarget(patient)?'Aucune plaie autorisée ne nécessite un traitement.'
    :patientClaimed(world,patient.id,doctor)?'Ce patient est déjà réservé par un médecin.':undefined);
}
export function tendingProposal(world:World,doctor:Pawn,patient:Pawn,reach:Reachability):{task:TendTask;path:Cell[]}|undefined {
  if(tendingReason(world,doctor,patient))return;
  if(patient===doctor){
    // Self-treatment needs no bed. If currently using furniture, leave its
    // service physically for an adjacent work cell under the 3D stop contract.
    const reserved=reservedServiceCells(world,doctor.id);
    for(const spot of [{x:doctor.x,z:doctor.z},...workNeighbours(doctor)])if(canStandAt(world,spot)&&!reserved.has(spot.z*world.width+spot.x)){
      const path=routeToCell(world,spot,reach);if(path)return {task:{patientId:doctor.id,spot,phase:'approach',progress:0},path};
    }
    return;
  }
  const best=bedsideAccess(world,doctor,patient,reach);
  return best?{task:{patientId:patient.id,spot:best.spot,phase:'approach',progress:0},path:best.path}:undefined;
}
export function tendingPlaceValid(world:World,doctor:Pawn,patient:Pawn,task:TendTask):boolean {
  const distance=Math.abs(task.spot.x-patient.x)+Math.abs(task.spot.z-patient.z);
  return canStandAt(world,task.spot)&&(patient===doctor?distance<=(task.phase==='approach'?1:0):distance===1);
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
  clearQueuedOrders(world,doctor);delete doctor.priorityWork;startTending(doctor,proposal,true);return {ok:true};
}
export function reconcileTending(world:World):void {
  for(const d of world.pawns)if(d.tend){const p=world.pawns.find(p=>p.id===d.tend!.patientId);
    if(tendingReason(world,d,p,true)||d.priorities.doctor===0&&d.orders.active!=='tend'||!p||!tendingPlaceValid(world,d,p,d.tend))releaseWork(world,d);
  }
}
export function processTending(world:World,doctor:Pawn,context:NeedContext,light:()=>number):void {
  const task=doctor.tend;if(!task)return;const patient=world.pawns.find(p=>p.id===task.patientId)!;
  if(patient?.health&&patient.health.tick<world.tick&&!patient.health.death)updatePawnHealth(world,patient);
  if(tendingReason(world,doctor,patient,true)){releaseWork(world,doctor);return;}
  if(doctor.x!==task.spot.x||doctor.z!==task.spot.z){context.move(task.spot,true);return;}
  task.duration??=Math.max(1,Math.floor(600/medicalTendSpeed(doctor,light())));
  task.phase='tend';doctor.state='working';doctor.path=[];task.progress+=10;
  if(task.progress<task.duration)return;
  const target=treatmentTarget(patient);if(!target){releaseWork(world,doctor);return;}
  // XP is awarded at a completed treatment before its quality stat is queried.
  learnSkill(doctor.skills.medicine,250000);
  if(target.injuryId!==undefined)tendInjury(patient.health!,target.injuryId,dryTendQuality(medicalTendQuality(doctor),healthRandom(world),doctor===patient));
  else tendMissingPart(patient.health!,target.part);
  reconcilePawnHealth(world,patient);
  context.event(doctor===patient?`${doctor.name} a traité une de ses plaies sans médicament.`:`${doctor.name} a traité une plaie de ${patient.name} sans médicament.`);
  task.progress-=task.duration;
  if(!treatmentTarget(patient))releaseWork(world,doctor);
}
