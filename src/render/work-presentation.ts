import type { Job,Pawn } from '../sim/types';

/** Values 0–10 are the existing locomotion, rest and combat poses. */
export const WORK_POSE = { mine:11, chop:12, build:13, craft:14 } as const;

export function pawnWorkPose(pawn:Pawn,job:Job|undefined):number {
  if(pawn.state!=='working'||pawn.stun)return 0;
  if(job?.kind==='mine')return WORK_POSE.mine;
  if(job?.kind==='chop'||job?.kind==='cut'||job?.clearance)return WORK_POSE.chop;
  if(job?.kind==='harvest'||job?.kind==='sow'||pawn.cooking||pawn.research)return WORK_POSE.craft;
  if(job)return WORK_POSE.build;
  return 0;
}
