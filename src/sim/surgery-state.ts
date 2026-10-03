import type { SurgicalLimb } from './surgery-anatomy.ts';
import type { MedicineItem,TendMedicine } from './medicine-rules.ts';
import type { Cell,Pawn,World } from './types.ts';

/** Patient intent survives the ordinary work interruption caused by anesthesia. */
export interface SurgeryRequest {part:SurgicalLimb;requestedAt:number}
/** One physical medical service. Medicine is owned only before administration. */
export interface SurgeryTask {
  patientId:number;part:SurgicalLimb;bedId:number;spot:Cell;
  phase:'pickup'|'approach'|'work';
  medicine?:TendMedicine;
  consumedMedicine?:MedicineItem;
  progress:number;
  /** Actual Core time worked, independent of the dynamic speed multiplier. */
  workCore:number;
}
export type SurgeryCommand={type:'surgery-request';pawnId:number;part:SurgicalLimb}|{type:'surgery-cancel';pawnId:number};

/** Release state only; the common work release owns physical cargo drops. */
export function releaseSurgeryState(world:World,doctor:Pawn):void {
  const task=doctor.surgery;
  if(task?.consumedMedicine){const patient=world.pawns.find(p=>p.id===task.patientId);if(patient)delete patient.surgeryRequest;}
  delete doctor.surgery;
}
