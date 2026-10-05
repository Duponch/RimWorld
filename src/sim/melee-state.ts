import type { MeleeToolId } from './melee-statistics.ts';
import type { World } from './types.ts';
export interface MeleeState {
  order:{structure?:true;targetId:number;startedDowned:boolean;auto?:'draft'|'response'|'social'|'mental'|'retaliation';untilCore?:number;jobUntilCore?:number}|null;
  /** Recovery is independent of the order and survives stop/move/undraft. */
  strike:{structure?:import('./types.ts').Cell;targetId:number;atCore:number;untilCore:number;tool:MeleeToolId;outcome:'hit'|'miss'|'dodge'}|null;
}
export type MeleeCommand={type:'melee';pawnIds:number[];targetId:number;structure?:true};
export function cancelMelee(pawn:{melee?:MeleeState}):void {
  if(pawn.melee?.strike)pawn.melee.order=null;else delete pawn.melee;
}

/** Removal ends the target's mandate immediately, including owners waiting in
 * recovery or on a committed edge. Those physical consequences remain owned. */
export function releaseStructureMelee(world:Pick<World,'pawns'|'mechanoids'>,targetId:number):void {
  for(const pawn of world.pawns)if(pawn.melee?.order?.structure&&pawn.melee.order.targetId===targetId){
    cancelMelee(pawn);pawn.path=[];
  }
  for(const mech of world.mechanoids??[])if(mech.melee?.order?.structure&&mech.melee.order.targetId===targetId){
    cancelMelee(mech);mech.path=[];if(mech.raid)mech.raid.goal=null;
  }
}
