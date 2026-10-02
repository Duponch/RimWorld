import type { Cell, MaterialPile, Pawn } from './types.ts';

/** One short return trip to the same colony. The off-map phases own the
 * original person and their possessions; map arrays own them before exit. */
export type ScoutState =
  | { phase:'loading'; pawnId:number; sourcePileId:number; quantity:2|3; startedAt:number }
  | { phase:'leaving'; pawnId:number; foodPileId:number; quantity:2|3; startedAt:number; exit:Cell|null }
  | { phase:'travelling'|'awaiting-entry'; pawn:Pawn; items:MaterialPile[]; foodPileId:number; quantity:2|3; startedAt:number; departedAt:number; returnAt:number; consumed:number; entry:Cell };

export type ScoutCommand =
  | { type:'scout-start'; pawnId:number; pileId:number; quantity:2|3 }
  | { type:'scout-cancel' }
  | { type:'scout-unload'; pawnId:number };

export const SCOUT_TRIP_TICKS = 1500;
export const SCOUT_RETURN_RETRY_TICKS = 20;
