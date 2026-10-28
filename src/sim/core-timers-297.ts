import {effectiveCore297} from './core-phase-297.ts';
import type {World} from './types.ts';
/** Expiry of already-owned physical timers, without running physiology or AI. */
export function expirePhysicalActorTimers297(w:World):number[]{
 const core=effectiveCore297(w),changed:number[]=[];
 const expire=(actor:{id:number;stun?:{untilCore:number};stagger?:{untilCore:number}})=>{
  let dirty=false;if(actor.stun&&actor.stun.untilCore<=core){delete actor.stun;dirty=true;}
  if(actor.stagger&&actor.stagger.untilCore<=core){delete actor.stagger;dirty=true;}
  if(dirty)changed.push(actor.id);
 };
 for(const p of w.pawns)expire(p);
 for(const a of w.wildlife?.animals??[]){expire(a);if(a.sleepUntilCore!==undefined&&a.sleepUntilCore<=core){delete a.sleepUntilCore;if(!changed.includes(a.id))changed.push(a.id);}}
 for(const m of w.mechanoids??[])expire(m);
 return changed;
}
