/** The order can be cancelled/replaced without erasing post-shot recovery. */
export interface ShootingState {
  order:{targetId:number;weaponId:number;startedDowned:boolean;auto?:import('./automatic-combat-state.ts').AutomaticAttack}|null;
  stance:({phase:'aim';startedAtCore:number;endsAtCore:number;targetStartedDowned:boolean}|{phase:'cooldown';startedAtCore:number;endsAtCore:number})|null;
}
export type ShootingCommand={type:'shoot';pawnIds:number[];targetId:number};

export function cancelShooting(pawn:{shooting?:ShootingState}):void {
  if(pawn.shooting?.stance?.phase==='cooldown')pawn.shooting.order=null;
  else delete pawn.shooting;
}
