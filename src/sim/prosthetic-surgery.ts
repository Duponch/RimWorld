import { workPriority } from './work-types.ts';
import { backgroundWorkRefusal } from './colonist-backgrounds.ts';
import { surgeryRequestReason,medicalSurgerySpeed,surgerySuccessChance,surgeryBaseXp } from './surgery-rules.ts';
import { WOODEN_PARTS,installWoodenPart } from './artificial-parts.ts';
import { resolveSurgeryOutcome } from './surgery-outcomes.ts';
import { administerAnesthetic,canAdministerAnesthetic } from './anesthetic.ts';
import { medicalWorkRefusal } from './health-rules.ts';
import { lyingPatient,patientClaimed,bedsideAccess } from './care-access.ts';
import { rescueBedAvailable } from './medical-beds.ts';
import { carrierOf } from './rescue-state.ts';
import { currentMedicalBed,bedSurgeryFactor } from './hospital-medical-stats.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { canStandAt } from './furniture-travel.ts';
import { medicineAllowed } from './medicine-rules.ts';
import { updatePawnHealth,reconcilePawnHealth,healthRandom } from './health.ts';
import { learnSkill } from './skills.ts';
import { captureCleanliness } from './filth-room.ts';
import { surgeryOutdoors } from './surgery-room.ts';
import { releaseWork } from './work-release.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { planImplantIngredients,validImplantTaskRelations,gatherImplantIngredient,implantIngredientsReady,consumeImplantIngredients } from './surgery-ingredients.ts';
import type { SurgeryTask } from './surgery-state.ts';
import type { Reachability } from './pathfinding.ts';
import type { NeedContext } from './needs.ts';
import type { Cell,Pawn,World } from './types.ts';

const release=(w:World,d:Pawn):void=>{if(!releaseWork(w,d))interruptWork(w,d);};
export function implantSurgeryReason(w:World,d:Pawn,p:Pawn|undefined,accepted=false):string|undefined {
  const task=accepted?d.surgery:undefined,request=p?.surgeryRequest;
  const refusal=backgroundWorkRefusal(d,'doctor')??medicalWorkRefusal(d);if(refusal)return refusal;
  if(workPriority(d,'doctor')===0)return 'Médecin est désactivé.';
  if(d.interruptedCargo)return 'Déposer la cargaison avant l’opération.';
  if(w.schemaVersion<210||!p||p===d||!request?.implant)return 'Aucune demande de prothèse valide.';
  if(d.skills.medicine.level<WOODEN_PARTS[request.implant].medicineSkill)return 'Médecine 3 est requise pour poser cette prothèse.';
  const reason=surgeryRequestReason(p,request.part,{implant:request.implant,...task?.consumedMedicine?{allowAnesthetic:true as const}:{}});if(reason)return reason;
  if(task&&(task.implant!==request.implant||task.part!==request.part))return 'La prothèse demandée a changé.';
  if(task?.consumedMedicine&&!medicineAllowed(p,task.consumedMedicine))return 'Le plafond médical du patient interdit ce médicament.';
  if(!lyingPatient(p)||carrierOf(w,p.id))return 'Le patient doit être installé dans un lit.';
  const bed=currentMedicalBed(w,p,false);
  if(!bed||!rescueBedAvailable(w,bed,p,d.id)||p.x!==bed.x||p.z!==bed.z||task&&task.bedId!==bed.id)return 'Le lit du patient n’est plus disponible.';
  if(patientClaimed(w,p.id,d))return 'Le patient est déjà pris en charge.';
  if(task&&(Math.abs(task.spot.x-bed.x)+Math.abs(task.spot.z-bed.z)!==1||!canStandAt(w,task.spot)||reservedServiceCells(w,d.id).has(task.spot.z*w.width+task.spot.x)))return 'Le chevet n’est plus disponible.';
  return undefined;
}
export function implantSurgeryProposal(w:World,d:Pawn,p:Pawn,reach:Reachability):{task:SurgeryTask;path:Cell[]}|undefined {
  if(implantSurgeryReason(w,d,p))return;
  const access=bedsideAccess(w,d,p,reach);if(!access)return;
  const planned=planImplantIngredients(w,d,p,access.spot,reach);if(!planned)return;
  return {path:planned.path,task:{patientId:p.id,part:p.surgeryRequest!.part,implant:p.surgeryRequest!.implant,bedId:currentMedicalBed(w,p,false)!.id,spot:access.spot,ingredients:planned.ingredients,phase:'pickup',progress:0,workCore:0}};
}
export function processImplantSurgery(w:World,d:Pawn,context:NeedContext,doctorGlow:()=>number,patientGlow:(cell:Cell)=>number):void {
  const task=d.surgery;if(!task?.implant)return;
  const p=w.pawns.find(p=>p.id===task.patientId);
  if(d.health&&d.health.tick<w.tick)updatePawnHealth(w,d);
  if(p?.health&&p.health.tick<w.tick)updatePawnHealth(w,p);
  if(d.surgery!==task)return;
  if(!p||implantSurgeryReason(w,d,p,true)||!validImplantTaskRelations(w,d,p,task)){release(w,d);return;}
  if(task.ingredients?.some(i=>i.stage!=='placed')){if(!gatherImplantIngredient(w,d,task,context))release(w,d);return;}
  if(d.moveCooldown>0)return;
  if(d.x!==task.spot.x||d.z!==task.spot.z){context.move(task.spot,true);return;}
  if(!task.consumedMedicine){
    const item=implantIngredientsReady(w,d,p,task);
    if(!item||!canAdministerAnesthetic(p.health!)){release(w,d);return;}
    // All clinical, ownership and capacity guards precede the random draw and
    // this atomic consumption of the three physically delivered ingredients.
    if(!administerAnesthetic(p.health!,()=>healthRandom(w))){release(w,d);return;}
    consumeImplantIngredients(w,task);task.consumedMedicine=item;task.phase='work';
    reconcilePawnHealth(w,p);
    context.event(`${d.name} anesthésie ${p.name} et commence la pose de la prothèse.`);
  }
  d.state='working';d.path=[];task.workCore+=10;
  task.progress+=10*medicalSurgerySpeed(d,doctorGlow());
  if(task.progress<WOODEN_PARTS[task.implant].work)return;
  learnSkill(d.skills.medicine,surgeryBaseXp(task.workCore),d);
  const bed=w.structures.find(s=>s.id===task.bedId)!;
  const capture=captureCleanliness(w),room=capture.room(bed);
  const chance=surgerySuccessChance({doctor:d,medicine:task.consumedMedicine,bedQuality:bed.quality,bedSurgeryFactor:bedSurgeryFactor(bed,w),recipeFactor:1,patientGlow:patientGlow(bed),roomCleanliness:room?.cleanliness??null,outdoors:surgeryOutdoors(w,bed,capture)});
  const outcome=resolveSurgeryOutcome(p.health!,task.part,chance,()=>healthRandom(w),{allowMissingPart:true});
  p.health=outcome.record;
  const success=outcome.kind==='success'&&installWoodenPart(p.health,task.part,task.implant);
  delete p.surgeryRequest;reconcilePawnHealth(w,p);
  context.event(success?`${d.name} a posé la prothèse « ${WOODEN_PARTS[task.implant].label} » à ${p.name}.`:`La pose de la prothèse de ${p.name} a échoué (${outcome.kind}) ; les matériaux ont été utilisés et des soins peuvent être nécessaires.`);
  release(w,d);
}
