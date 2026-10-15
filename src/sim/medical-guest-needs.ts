import { isBedKind } from './bed-kinds.ts';
import { isAdmittedGuest } from './affiliation.ts';
import { treatmentTarget,medicalRestNeeded } from './care-rules.ts';
import { processNeeds,type NeedContext } from './needs.ts';
import { patientProposal,startPatientRest } from './patient-rest.ts';
import type { Pawn,World } from './types.ts';

/** Shared clinical services for admitted guests only. This does not own their
 * faction, visit/capsule agenda, departure, possessions or recruitment. */
export function processMedicalGuestNeeds(w:World,p:Pawn,ctx:NeedContext,medicalOnly=false):boolean {
  if(!isAdmittedGuest(p))return false;
  const medical=!!(treatmentTarget(p)||medicalRestNeeded(p));
  // Visitors resume their own departure once the clinical service ends. Pods
  // retain their historical ordinary-needs-before-exit behavior.
  if(medicalOnly&&!medical&&!(p.need?.kind==='sleep'&&p.need.medical))return false;
  // Recovery continues after the person can stand, on the actual bed service.
  if(medical&&p.need?.kind==='sleep'&&p.need.phase==='sleep'&&p.need.bedId!==null&&!p.need.medical)
    p.need.medical=treatmentTarget(p)?'patient':'bedrest';
  if(medical&&!p.need&&p.planCooldown===0){
    const goals=new Set(w.structures.filter(b=>isBedKind(b.kind)&&!b.prisoner).map(b=>b.z*w.width+b.x));
    if(goals.size){
      const reach=ctx.search(goals);if(!reach)return true;
      const proposal=patientProposal(w,p,reach);if(proposal)startPatientRest(w,p,proposal);
    }
    p.planCooldown=20;
  }
  if(processNeeds(w,p,ctx))return true;
  // An unavailable bed is not a successful recovery or a reason to archive.
  if(medical){p.path=[];p.state='idle';return true;}
  return !!(p.need||p.interruptedCargo||p.burning);
}
