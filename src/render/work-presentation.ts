import type { Cell,Job,Pawn } from '../sim/types';

/** Values 0–10 are the existing locomotion, rest and combat poses. */
export const WORK_POSE = { mine:11, chop:12, build:13, craft:14, ground:16, groundMelee:17 } as const;

/** A body may lean into a neighbouring target, but its feet must stay outside
 * the target's physical silhouette. The simulation cell is never changed. */
export function workApproach(pawn:Cell,target:Cell|undefined,clearance=.55):Cell {
  if(!target)return {x:0,z:0};
  const dx=target.x-pawn.x,dz=target.z-pawn.z,distance=Math.hypot(dx,dz);
  if(distance<.001||distance>1.5)return {x:0,z:0};
  const reach=Math.min(.42,Math.max(0,distance-clearance));
  return {x:dx/distance*reach,z:dz/distance*reach};
}

export function pawnWorkPose(pawn:Pawn,job:Job|undefined):number {
  if(pawn.state!=='working'||pawn.stun)return 0;
  if(job?.kind==='mine')return WORK_POSE.mine;
  if(job?.kind==='chop'||job?.kind==='cut'||job?.clearance)return WORK_POSE.chop;
  if(job?.kind==='harvest'||job?.kind==='sow'||job?.kind==='lay-floor'||job?.kind==='remove-floor'||pawn.hunting?.phase==='finish'||pawn.cleaning||pawn.burial||pawn.equipmentTask||pawn.haul&&!pawn.haul.serviceProgress||pawn.cooking&&pawn.cooking.phase!=='work')return WORK_POSE.ground;
  if(pawn.cooking||pawn.research)return WORK_POSE.craft;
  if(job)return WORK_POSE.build;
  return 0;
}
