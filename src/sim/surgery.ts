import { surgeryRequestReason,medicalSurgerySpeed,surgerySuccessChance,surgeryBaseXp,SURGERY_WORK } from './surgery-rules.ts';
import { amputateSurgicalLimb } from './surgery-anatomy.ts';
import { resolveSurgeryOutcome } from './surgery-outcomes.ts';
import { administerAnesthetic,canAdministerAnesthetic } from './anesthetic.ts';
import { medicalWorkRefusal } from './health-rules.ts';
import { lyingPatient,patientClaimed,bedsideAccess } from './care-access.ts';
import { rescueBedAvailable } from './medical-beds.ts';
import { carrierOf } from './rescue-state.ts';
import { currentMedicalBed,bedSurgeryFactor } from './hospital-medical-stats.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { canStandAt } from './furniture-travel.ts';
import { medicineTaskValid,reserveMedicalMedicine,pickupMedicalMedicine,consumeMedicine } from './medicine-logistics.ts';
import { medicineAllowed } from './medicine-rules.ts';
import { updatePawnHealth,reconcilePawnHealth,healthRandom } from './health.ts';
import { learnSkill } from './skills.ts';
import { captureCleanliness } from './filth-room.ts';
import { surgeryOutdoors } from './surgery-room.ts';
import { releaseWork } from './work-release.ts';
import { interruptWork } from './interrupted-cargo.ts';
import type { SurgeryCommand,SurgeryTask } from './surgery-state.ts';
import type { Reachability } from './pathfinding.ts';
import type { NeedContext } from './needs.ts';
import type { Cell,CommandResult,Pawn,World } from './types.ts';

const release=(world:World,doctor:Pawn):void=>{if(!releaseWork(world,doctor))interruptWork(world,doctor);};
/** Sparse pending requests cost no clinical/topology query on other pawns. */
export function surgeryReason(world:World,doctor:Pawn,patient:Pawn|undefined,accepted=false):string|undefined {
  const task=accepted?doctor.surgery:undefined;
  if(medicalWorkRefusal(doctor))return medicalWorkRefusal(doctor);
  if(doctor.priorities.doctor===0)return 'Médecin est désactivé.';
  if(doctor.interruptedCargo)return 'Déposer la cargaison avant l’opération.';
  if(!patient||patient===doctor||!patient.surgeryRequest)return 'Aucune demande opératoire valide pour ce patient.';
  const part=patient.surgeryRequest.part;
  const reason=surgeryRequestReason(patient,part,task?.consumedMedicine?{allowAnesthetic:true}:{});if(reason)return reason;
  if(task&&task.part!==part)return 'Le membre demandé a changé.';
  if(task?.consumedMedicine&&!medicineAllowed(patient,task.consumedMedicine))return 'Le plafond médical du patient interdit ce médicament.';
  if(!lyingPatient(patient)||carrierOf(world,patient.id))return 'Le patient doit être installé dans un lit.';
  const bed=currentMedicalBed(world,patient,false);
  if(!bed||!rescueBedAvailable(world,bed,patient,doctor.id)||patient.x!==bed.x||patient.z!==bed.z||task&&task.bedId!==bed.id)return 'Le lit du patient n’est plus disponible.';
  if(patientClaimed(world,patient.id,doctor))return 'Le patient est déjà pris en charge.';
  if(task&&(Math.abs(task.spot.x-bed.x)+Math.abs(task.spot.z-bed.z)!==1||!canStandAt(world,task.spot)||reservedServiceCells(world,doctor.id).has(task.spot.z*world.width+task.spot.x)))return 'Le chevet n’est plus disponible.';
  return undefined;
}
export function surgeryProposal(world:World,doctor:Pawn,patient:Pawn,reach:Reachability):{task:SurgeryTask;path:Cell[]}|undefined {
  if(surgeryReason(world,doctor,patient))return;
  const access=bedsideAccess(world,doctor,patient,reach);if(!access)return;
  const task:SurgeryTask={patientId:patient.id,part:patient.surgeryRequest!.part,bedId:patient.need!.kind==='sleep'?patient.need!.bedId!:-1,spot:access.spot,phase:'approach',progress:0,workCore:0};
  const path=reserveMedicalMedicine(world,doctor,patient,task,reach,1);if(!path)return;
  return {task,path};
}
export function startSurgery(doctor:Pawn,proposal:{task:SurgeryTask;path:Cell[]}):void {
  doctor.surgery=proposal.task;doctor.path=proposal.path;doctor.state='moving';doctor.planCooldown=0;
}
export function applySurgery(world:World,command:SurgeryCommand):CommandResult {
  const patient=world.pawns.find(p=>p.id===command.pawnId);
  const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(world.schemaVersion<179||!patient)return fail('Patient ou version de partie invalide.');
  if(command.type==='surgery-cancel'){
    // Involuntary drop fallback retains each physical dose once; no refund.
    delete patient.surgeryRequest;
    for(const doctor of world.pawns)if(doctor.surgery?.patientId===patient.id)release(world,doctor);
    patient.planCooldown=0;return {ok:true};
  }
  const reason=surgeryRequestReason(patient,command.part);if(reason)return fail(reason);
  if(patient.surgeryRequest)return fail('Une opération est déjà demandée ; annulez-la pour changer de membre.');
  patient.surgeryRequest={part:command.part,requestedAt:world.tick};patient.planCooldown=0;
  for(const doctor of world.pawns)if(doctor.priorities.doctor>0)doctor.planCooldown=0;
  return {ok:true};
}
export function reconcileSurgery(world:World):void {
  for(const patient of world.pawns)if(patient.surgeryRequest){
    const administered=world.pawns.some(d=>d.surgery?.patientId===patient.id&&!!d.surgery.consumedMedicine);
    if(surgeryRequestReason(patient,patient.surgeryRequest.part,administered?{allowAnesthetic:true}:{}))delete patient.surgeryRequest;
  }
  for(const doctor of world.pawns)if(doctor.surgery){
    const patient=world.pawns.find(p=>p.id===doctor.surgery!.patientId);
    if(surgeryReason(world,doctor,patient,true)||!patient||!doctor.surgery.consumedMedicine&&!medicineTaskValid(world,doctor,patient,doctor.surgery))release(world,doctor);
  }
}
export function processSurgery(world:World,doctor:Pawn,context:NeedContext,doctorGlow:()=>number,patientGlow:(cell:Cell)=>number):void {
  const task=doctor.surgery;if(!task)return;
  const patient=world.pawns.find(p=>p.id===task.patientId);
  if(doctor.health&&doctor.health.tick<world.tick)updatePawnHealth(world,doctor);
  if(patient?.health&&patient.health.tick<world.tick)updatePawnHealth(world,patient);
  if(doctor.surgery!==task)return;
  if(surgeryReason(world,doctor,patient,true)||!patient||!task.consumedMedicine&&!medicineTaskValid(world,doctor,patient,task)){release(world,doctor);return;}
  if(task.phase==='pickup'){pickupMedicalMedicine(world,doctor,task,context);return;}
  if(doctor.moveCooldown>0)return;
  if(doctor.x!==task.spot.x||doctor.z!==task.spot.z){context.move(task.spot,true);return;}
  if(!task.consumedMedicine){
    if(!task.medicine||task.medicine.quantity!==1||!canAdministerAnesthetic(patient.health!)){release(world,doctor);return;}
    const item=task.medicine.item;
    // All nonrandom guards precede this single clinical/ownership transition.
    if(!administerAnesthetic(patient.health!,()=>healthRandom(world))){release(world,doctor);return;}
    consumeMedicine(world,task);task.consumedMedicine=item;task.phase='work';
    reconcilePawnHealth(world,patient);
    context.event(`${doctor.name} anesthésie ${patient.name} et commence l’opération.`);
  }
  doctor.state='working';doctor.path=[];task.workCore+=10;
  task.progress+=10*medicalSurgerySpeed(doctor,doctorGlow());
  if(task.progress<SURGERY_WORK)return;
  // The actual work-time XP precedes the surgery statistic in Core.
  learnSkill(doctor.skills.medicine,surgeryBaseXp(task.workCore),doctor);
  const bed=world.structures.find(s=>s.id===task.bedId)!;
  const capture=captureCleanliness(world),room=capture.room(bed);
  const chance=surgerySuccessChance({doctor,medicine:task.consumedMedicine!,bedQuality:bed.quality,bedSurgeryFactor:bedSurgeryFactor(bed),patientGlow:patientGlow(bed),roomCleanliness:room?.cleanliness??null,outdoors:surgeryOutdoors(world,bed,capture)});
  const outcome=resolveSurgeryOutcome(patient.health!,task.part,chance,()=>healthRandom(world));
  patient.health=outcome.record;
  if(outcome.kind==='success')amputateSurgicalLimb(patient.health,task.part);
  delete patient.surgeryRequest;
  reconcilePawnHealth(world,patient);
  context.event(outcome.kind==='success'?`${doctor.name} a amputé le membre infecté de ${patient.name}. Des soins postopératoires restent nécessaires.`:`L’opération de ${patient.name} a échoué (${outcome.kind}) ; les lésions nécessitent des soins.`);
  release(world,doctor);
}
