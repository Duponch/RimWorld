import type { GroupState } from './group-state.ts';
import type { Pawn } from './types.ts';
import { backgroundWorkRefusal } from './colonist-backgrounds.ts';
import { hasMentalBreak } from './mental-state.ts';
import { treatmentTargets,treatmentBatch,medicalTendQuality } from './care-rules.ts';
import { MEDICINES,isMedicine,medicineAllowed } from './medicine-rules.ts';
import { medicalBleed,medicalStatus } from './injury-state.ts';
import { BLOOD_UNIT } from './injury-rules.ts';
import { commercialItemMassGrams } from './commercial-mass.ts';
import { resolveHumanTendBatch } from './care-resolution.ts';
import type { GroupMassCapture } from './group-capture.ts';

type ActiveGroup=Extract<GroupState,{members:unknown}>;
export interface ConsumedGroupMass {massRemovedGrams:number;removed:{pawnId:number;grams:number}[]}
/** Source-owner deltas replace one capture after actual ingestion/tending.
 * Death changes membership/capacity and requires Root's new owner capture. */
export function applyConsumedGroupMass(mass:GroupMassCapture,results:readonly ConsumedGroupMass[]):GroupMassCapture {
  const byId=new Map(mass.carriers.map(c=>[c.pawnId,{...c}]));
  let removed=0;
  for(const result of results){
    let subtotal=0;
    for(const loss of result.removed){
      const owner=byId.get(loss.pawnId);
      if(!owner||!Number.isSafeInteger(loss.grams)||loss.grams<0||loss.grams>owner.grams)throw Error('Invalid consumed owner mass');
      owner.grams-=loss.grams;subtotal+=loss.grams;
    }
    if(!Number.isSafeInteger(subtotal)||subtotal!==result.massRemovedGrams)throw Error('Invalid consumed group mass');
    removed+=subtotal;
  }
  const carriers=[...byId.values()],grams=mass.grams-removed;
  if(!Number.isSafeInteger(grams)||grams<0||grams!==carriers.reduce((n,c)=>n+c.grams,0))throw Error('Invalid remaining group mass');
  return Object.freeze({grams,capacityGrams:mass.capacityGrams,carriers:Object.freeze(carriers.map(c=>Object.freeze(c)))});
}
export interface GroupCareContext {
  tick:number;
  random():number;

}
/** Delta=10 Core. Local stable ID phase adapts Core's hash offset, without a
 * persisted cadence or tick+ID overflow. One consultation per crossing. */
export const groupDoctorTendDue=(person:Pawn,tick:number):boolean=>((tick%125)*10+person.id%1250)%1250<10;
/** Delivered infection/Flu definitions have lethalSeverity=1. The historical
 * Hediff.IsLethal getter is definition-based, not the extreme-stage threshold;
 * all their currently tendable cases therefore take the lethal priority. */
const deliveredLethalTendable=(person:Pawn):boolean=>treatmentTargets(person).some(t=>t.infectionId!==undefined||t.flu);
export function groupDoctorAllowed(group:ActiveGroup,doctor:Pawn,patient?:Pawn):boolean {
  return group.members.includes(doctor)&&doctor.state!=='dead'&&doctor.state!=='downed'&&
    (!doctor.health||medicalStatus(doctor.health)==='mobile')&&!hasMentalBreak(doctor)&&
    !backgroundWorkRefusal(doctor,'doctor')&&(doctor!==patient||doctor.selfTend===true);
}
export function humanGroupTendPriority(patient:Pawn,lethalTendable:boolean):number {
  const health=patient.health,bleed=health?medicalBleed(health):0;
  // medicalBleed is a full-blood fraction/day; 60000 Core/day. No future healing is guessed.
  const deathCore=bleed>0?(1-health!.bloodLoss/BLOOD_UNIT)/bleed*60000:Infinity;
  if(deathCore<15000)return 5-Math.max(0,deathCore)/15000;
  return lethalTendable?2.5:bleed>=.0001?1.5:.5;
}
/** Every admissible triggering doctor receives the certified hash consultation.
 * The chosen doctor can be someone else. No priorities, chevet or sleep filter. */
export function advanceGroupCare(group:ActiveGroup,c:GroupCareContext):ConsumedGroupMass {
  if(group.lastPersonalTick!==c.tick)throw Error('Care precedes group personal frontier');
  const removed:ConsumedGroupMass['removed']=[];
  for(const trigger of group.members){
    if(!groupDoctorAllowed(group,trigger)||!groupDoctorTendDue(trigger,c.tick))continue;
    const patients=group.members.filter(p=>p.state!=='dead'&&treatmentTargets(p).length)
      .map(p=>({p,rank:humanGroupTendPriority(p,deliveredLethalTendable(p))})).sort((a,b)=>b.rank-a.rank);
    let patient:Pawn|undefined,doctor:Pawn|undefined;
    for(const candidate of patients){
      let best=-1;
      for(const owner of group.members)if(groupDoctorAllowed(group,owner,candidate.p)){
        const stat=medicalTendQuality(owner);
        if(stat>best){best=stat;doctor=owner;}
      }
      if(doctor){patient=candidate.p;break;}
    }
    if(!patient||!doctor)continue;
    let medicine:ActiveGroup['items'][number]|undefined,bestPotency=-1;
    for(const pile of group.items){const owner=pile.owner;if(owner.type==='inventory'&&group.members.some(p=>p.id===owner.pawnId&&p.state!=='dead')&&isMedicine(pile.item)&&medicineAllowed(patient,pile.item)){
      if(!Number.isSafeInteger(pile.quantity)||pile.quantity<1)throw Error('Invalid medicine inventory');
      if(MEDICINES[pile.item].potency>bestPotency){medicine=pile;bestPotency=MEDICINES[pile.item].potency;}
    }}
    const item=medicine&&isMedicine(medicine.item)?medicine.item:undefined;
    const batch=treatmentBatch(treatmentTargets(patient),!!item);
    if(!batch.length)continue;
    const sourceIndex=medicine?group.items.indexOf(medicine):-1,sourceOwner=medicine?.owner;
    const grams=item?commercialItemMassGrams(item):undefined;
    // Initial bounded mass catalog admits industrial medicine only. Herbal or
    // glitterworld can be added after their mass/admission owners are delivered.
    if(medicine&&(sourceIndex<0||sourceOwner?.type!=='inventory'||grams===undefined))throw Error('Invalid medicine ownership/mass profile');
    const medicineUsed=group.ledger.medicineUsed+(item?1:0);
    if(!Number.isSafeInteger(medicineUsed)||medicineUsed<0)throw Error('Invalid medicine consumption counter');
    const record=structuredClone(patient.health!);
    // Preserve identity for self treatment: doctorDraft must be patientDraft when self.
    const patientDraft={...patient,health:record},doctorDraft=doctor===patient?patientDraft:doctor;
    resolveHumanTendBatch(patientDraft,doctorDraft,batch,{random:c.random,awardJobXp:false,medicine:item,bedOffset:0,infectionRoomFactor:()=>1000});
    patient.health=record;
    if(medicine&&item){
      if(medicine.quantity===1)group.items.splice(sourceIndex,1);else medicine.quantity--;
      if(sourceOwner?.type!=='inventory'||grams===undefined)throw Error('Changed medicine ownership/profile');
      group.ledger.medicineUsed=medicineUsed;removed.push({pawnId:sourceOwner.pawnId,grams});
    }
  }
  const massRemovedGrams=removed.reduce((sum,r)=>sum+r.grams,0);
  if(!Number.isSafeInteger(massRemovedGrams))throw Error('Care mass overflow');
  return {massRemovedGrams,removed};
}
