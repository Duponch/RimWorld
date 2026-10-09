import type { SurgicalLimb } from './surgery-anatomy.ts';
import type { WoodenPartKind,WoodenPartSite } from './artificial-parts-types.ts';
import type { MedicineItem,TendMedicine } from './medicine-rules.ts';
import type { Cell,Pawn,World } from './types.ts';

export type SurgicalPart=SurgicalLimb|WoodenPartSite;
export interface SurgicalIngredient {
  pileId:number;item:'wood'|MedicineItem;quantity:number;
  stage:'source'|'held'|'placed';cell:Cell;
}
/** Patient intent survives the ordinary work interruption caused by anesthesia. */
export interface SurgeryRequest {part:SurgicalPart;requestedAt:number;implant?:WoodenPartKind}
/** One physical medical service. Medicine is owned only before administration. */
export interface SurgeryTask {
  patientId:number;part:SurgicalPart;bedId:number;spot:Cell;
  implant?:WoodenPartKind;ingredients?:SurgicalIngredient[];
  phase:'pickup'|'approach'|'work';
  medicine?:TendMedicine;
  consumedMedicine?:MedicineItem;
  progress:number;
  /** Actual Core time worked, independent of the dynamic speed multiplier. */
  workCore:number;
}
export type SurgeryCommand={type:'surgery-request';pawnId:number;part:SurgicalLimb}|{type:'surgery-cancel';pawnId:number}
  |{type:'surgery-install';pawnId:number;part:WoodenPartSite;implant:WoodenPartKind};

/** Release state only; the common work release owns physical cargo drops. */
export function releaseSurgeryState(world:World,doctor:Pawn):void {
  const task=doctor.surgery;
  if(task?.consumedMedicine){const patient=world.pawns.find(p=>p.id===task.patientId);if(patient)delete patient.surgeryRequest;}
  delete doctor.surgery;
}
