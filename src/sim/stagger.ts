import { mergeSlowIntervals,travelEnd } from './travel-timing.ts';
import { syncPatient } from './rescue-state.ts';
import type { Pawn,World } from './types.ts';

export interface StaggerState { sinceCore:number; untilCore:number }
export const BULLET_STAGGER_CORE_TICKS=95;
/** Current natural adult: size 1, duration stat 1; other races/gear must supply
 * their actual stats before using this producer. No RNG or damage prerequisite. */
export function applyBulletStagger(world:World,pawn:Pawn,atCore:number,stoppingPower:number):void {
  if(!Number.isSafeInteger(atCore)||atCore<Math.max(0,(world.tick-1)*10)||atCore>world.tick*10||!Number.isFinite(stoppingPower)||stoppingPower<0)throw new RangeError('Invalid bullet stagger input');
  if(stoppingPower+.001<1)return;
  const at=atCore/10,previous=pawn.stagger;
  pawn.stagger={sinceCore:previous&&previous.untilCore>=atCore?previous.sinceCore:atCore,untilCore:Math.max(previous?.untilCore??0,atCore+BULLET_STAGGER_CORE_TICKS)};
  const m=pawn.motion;
  if(m&&m.end>at) {
    const stagger=mergeSlowIntervals([...(m.stagger??[]),{start:Math.max(m.start,at),end:pawn.stagger.untilCore/10}]);
    const updated={...m,stagger};updated.end=travelEnd(updated);
    pawn.motion=updated;pawn.moveCooldown=Math.max(0,updated.end-world.tick);syncPatient(world,pawn);
  }
}
export function expireStaggers(world:World):void {
  for(const p of world.pawns)if(p.stagger&&p.stagger.untilCore<=world.tick*10)delete p.stagger;
}
export function validStagger(value:unknown,version:number,tick:number):boolean {
  if(value===undefined)return true;
  if(version<57||!value||typeof value!=='object')return false;
  const s=value as StaggerState;
  return Object.keys(s).every(k=>k==='sinceCore'||k==='untilCore')&&Number.isSafeInteger(s.sinceCore)&&s.sinceCore>=0&&s.sinceCore<=tick*10&&Number.isSafeInteger(s.untilCore)&&s.untilCore>tick*10&&s.untilCore<=tick*10+95&&s.untilCore-s.sinceCore>=95;
}
