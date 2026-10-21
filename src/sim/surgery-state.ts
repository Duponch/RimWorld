import type { SurgicalLimb } from './surgery-anatomy.ts';
import type { ArtificialPartKind,ArtificialPartSite } from './artificial-parts-types.ts';
import type { MedicineItem,TendMedicine } from './medicine-rules.ts';
import type { Cell,Pawn,World } from './types.ts';

export type SurgicalPart=SurgicalLimb|ArtificialPartSite;
export interface SurgicalIngredient {
  pileId:number;item:'wood'|MedicineItem|import('./prosthetic-content-273.ts').ProstheticItem273;quantity:number;
  stage:'source'|'held'|'placed';cell:Cell;
}
/** Patient intent survives the ordinary work interruption caused by anesthesia. */
export interface SurgeryRequest {part:SurgicalPart;requestedAt:number;implant?:ArtificialPartKind;removeArtificial273?:ArtificialPartKind}
/** One physical medical service. Medicine is owned only before administration. */
export interface SurgeryTask {
  patientId:number;part:SurgicalPart;bedId:number;spot:Cell;
  implant?:ArtificialPartKind;removeArtificial273?:ArtificialPartKind;ingredients?:SurgicalIngredient[];
  phase:'pickup'|'approach'|'work';
  medicine?:TendMedicine;
  consumedMedicine?:MedicineItem;
  progress:number;
  /** Actual Core time worked, independent of the dynamic speed multiplier. */
  workCore:number;
}
export type SurgeryCommand={type:'surgery-request';pawnId:number;part:SurgicalLimb}|{type:'surgery-cancel';pawnId:number}
  |{type:'surgery-install';pawnId:number;part:ArtificialPartSite;implant:ArtificialPartKind}
  |{type:'surgery-remove-prosthetic';pawnId:number;part:ArtificialPartSite};

/** Release state only; the common work release owns physical cargo drops. */
export function releaseSurgeryState(world:World,doctor:Pawn):void {
  const task=doctor.surgery;
  if(task?.consumedMedicine){const patient=world.pawns.find(p=>p.id===task.patientId);if(patient)delete patient.surgeryRequest;}
  delete doctor.surgery;
}
