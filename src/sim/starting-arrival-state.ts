import type {Cell,MaterialPile,Pawn} from './types.ts';

/** Quantized original presentation: 2.5 s falling, then 2 s closed at 1×. */
export const STARTING_ARRIVAL_FALL_TICKS=15;
export const STARTING_ARRIVAL_OPEN_DELAY=12;
export const STARTING_ARRIVAL_PROFILE='crashlanded-pods-v1' as const;
export interface StartingArrivalPod {
  id:number;cell:Cell;pawn:Pawn;items:MaterialPile[];
  /** Ground destinations decided at creation, one per loose held pile. */
  drops:{pileId:number;cell:Cell}[];
}
export interface StartingArrivalPending {
  profile:typeof STARTING_ARRIVAL_PROFILE;phase:'incoming'|'landed';
  start:0;landAt:number;openAt:number;personalTick:0;pods:StartingArrivalPod[];
}
/** A visual receipt owns no Pawn, item or retired capsule Thing. */
export interface StartingArrivalOpened {
  profile:typeof STARTING_ARRIVAL_PROFILE;phase:'opened';
  start:0;landAt:number;openAt:number;openedAt:number;cells:Cell[];
}
export type StartingArrivalState=StartingArrivalPending|StartingArrivalOpened|import("./starting-pod-state-256.ts").CoreStartingArrival256;
