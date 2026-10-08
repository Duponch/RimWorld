import type { MeleeState } from './melee-state.ts';
import type { Pawn,World } from './types.ts';

export interface PrisonBreakState {
  rng:number;
  lastAt?:number;
  active?:{startedAt:number;initiatorId:number};
}

export const PRISON_BREAK_CHECK_INTERVAL=250;
export const PRISON_BREAK_BASE_MTB_DAYS=60;
export const PRISON_BREAK_JOIN_RADIUS=20;
export const prisonBreakActive=(p:Pick<Pawn,'prisoner'>):boolean=>!!p.prisoner?.breakout?.active;

/** This recognizes the persisted mandate, not an arbitrary faction privilege.
 * Combat still owns target, reach, weapon, stance and physical-contact checks. */
export function prisonBreakMeleeOwned(world:World,p:Pawn,order:MeleeState['order']):boolean {
  return world.schemaVersion>=204&&world.pawns.includes(p)&&order?.auto==='prison-break'&&prisonBreakActive(p)
    &&p.prisoner?.releasedAt===undefined&&p.state!=='dead'&&p.state!=='downed'&&!p.health?.death
    &&!world.pawns.some(a=>a.rescue?.phase==='carry'&&a.rescue.patientId===p.id);
}

/** Core's piecewise linear history curve; days use the local 6000-tick day. */
export function prisonBreakHistoryFactor(days:number):number {
  if(days<=0)return 20;
  if(days<5)return 20-18.5*days/5;
  return days<10?1.5-.5*(days-5)/5:1;
}

/** Local adaptation: deterministic private stream, with no draw at adoption. */
export function seedPrisonBreak(seed:number,pawnId:number,capturedAt:number):number {
  let hash=(seed^Math.imul(pawnId,0x9e3779b1)^Math.imul(capturedAt,0x85ebca6b)^0x269b8ea1)>>>0;
  hash=Math.imul(hash^(hash>>>16),0x7feb352d);hash=Math.imul(hash^(hash>>>15),0x846ca68b);
  return ((hash^(hash>>>16))>>>0)||1;
}
export function nextPrisonBreakRandom(rng:number):{rng:number;value:number} {
  let next=rng;next^=next<<13;next^=next>>>17;next^=next<<5;next>>>=0;
  return {rng:next,value:next/0x100000000};
}
