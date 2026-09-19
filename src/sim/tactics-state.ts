import type { Cell,Pawn } from './types.ts';

/** Optional scenario mandate. Absence preserves the historical fixed sentry.
 * Decision deadlines are Core ticks; routes use the ordinary captured edges. */
export interface TacticsState { targetId:number|null; post:Cell|null; reviewAtCore:number }
export const newTactics=():TacticsState=>({targetId:null,post:null,reviewAtCore:0});
export function resetTactics(pawn:Pawn):void {
  if(pawn.tactics){pawn.tactics.targetId=null;pawn.tactics.post=null;pawn.tactics.reviewAtCore=0;}
}
