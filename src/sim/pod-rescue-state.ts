import type { PackedFurniture } from './furniture-rules.ts';
import type { Cell,MaterialPile,Pawn } from './types.ts';

export const POD_RESCUE_LIMIT=32;
/** Short local staging for the 3D arrival, not Core drop-pod timings. */
export const POD_RESCUE_FALL_TICKS=6;
export const POD_RESCUE_OPEN_TICKS=4;
/** Both origins use technical neutral outlanders; independent records the
 * absence of an affiliation without introducing a new global faction. */
export type PodRescueOrigin='independent'|'outlander';
export interface PodRescuePawn {incidentId:number;admittedAt?:number}
export interface PodRescuePending {id:number;start:number;landAt:number;openAt:number;cell:Cell;seed:number;origin?:PodRescueOrigin}
export interface PodRescueIncident {
  id:number;start:number;openedAt:number;pawnId:number;tendedAt?:number;
  origin?:PodRescueOrigin;
  decision?:{at:number;outcome:'joined'|'left';admittedAt:number};
  result?:'dead'|'captured'|'departed'|'joined';resolvedAt?:number;
}
/** Frozen evidence at departure; these owners are never map inventory. */
export interface PodRescueDeparture {incidentId:number;tick:number;pawn:Pawn;items:MaterialPile[];packed?:PackedFurniture[]}
export interface PodRescueState {
  profile:'civilian-pod-rescue-v1';serial:number;pending?:PodRescuePending;
  incidents:PodRescueIncident[];departed:PodRescueDeparture[];
}
