import { mergeSlowIntervals,travelEnd } from './travel-timing.ts';
import { syncPatient } from './rescue-state.ts';
import type { Pawn,World } from './types.ts';
export interface StunState {sinceCore:number;untilCore:number}
/** Duration is a documented calibration (45 Core ticks): published sources
 * disagree. Stun pauses an edge in place; stagger only changes its pace. */
export function applyMeleeStun(world:World,pawn:Pawn,core:number):void {
  if(pawn.state==='dead')return;
  const previous=pawn.stun;
  pawn.stun={sinceCore:previous&&previous.untilCore>=core?previous.sinceCore:core,untilCore:Math.max(previous?.untilCore??0,core+45)};
  if(pawn.shooting?.stance?.phase==='aim')pawn.shooting.stance=null;
  const m=pawn.motion;
  if(m&&m.end>core/10){pawn.motion={...m,stuns:mergeSlowIntervals([...(m.stuns??[]),{start:Math.max(m.start,core/10),end:pawn.stun.untilCore/10}])};pawn.motion.end=travelEnd(pawn.motion);pawn.moveCooldown=Math.max(0,pawn.motion.end-world.tick);syncPatient(world,pawn);}
}
export const isStunned=(pawn:Pawn,core:number):boolean=>!!pawn.stun&&pawn.stun.untilCore>core;
