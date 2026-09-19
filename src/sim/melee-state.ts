import type { MeleeToolId } from './melee-statistics.ts';
export interface MeleeState {
  order:{targetId:number;startedDowned:boolean;auto?:'draft'|'response'}|null;
  /** Recovery is independent of the order and survives stop/move/undraft. */
  strike:{targetId:number;atCore:number;untilCore:number;tool:MeleeToolId;outcome:'hit'|'miss'|'dodge'}|null;
}
export type MeleeCommand={type:'melee';pawnIds:number[];targetId:number};
export function cancelMelee(pawn:{melee?:MeleeState}):void {
  if(pawn.melee?.strike)pawn.melee.order=null;else delete pawn.melee;
}
