import type { Cell } from './types.ts';

/** A destination is held after arrival; queued intentions acquire it on activation. */
export interface DraftState { lastActiveTick:number; target:Cell|null; queue:Cell[];holdFire?:true }
export type DraftCommand = {type:'draft';pawnIds:number[];enabled:boolean}
  | {type:'draft-move';pawnIds:number[];target:Cell;queue:boolean}
  | {type:'draft-stop';pawnIds:number[]}
  | {type:'fire-at-will';pawnIds:number[];enabled:boolean};
export const AUTO_UNDRAFT_TICKS=1000;
export const DRAFT_QUEUE_LIMIT=32;
export const sameCell=(a:Cell,b:Cell):boolean=>a.x===b.x&&a.z===b.z;
