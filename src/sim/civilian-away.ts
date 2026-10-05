import type { World } from './types.ts';

/** Count original off-map owners without projecting their possessions into
 * local stocks or allocating a combined World. The trips are exclusive. */
export function civilianAway(w:World) {
  return w.scout&&(w.scout.phase==='travelling'||w.scout.phase==='awaiting-entry')?w.scout:
    w.commercialTrip&&'pawn' in w.commercialTrip?w.commercialTrip:undefined;
}
export function civilianAdmissionFits(w:World,pawns=0,piles=0):boolean {
  const away=civilianAwayCounts(w);
  return w.pawns.length+away.people+pawns<=w.width*w.height
    &&w.piles.length+away.piles+piles<=32768;
}

/** Active originals only; frozen terminal/archive owners do not reserve a map population slot. */
export function civilianAwayCounts(w:World):{people:number;piles:number} {
 const legacy=civilianAway(w),group=w.group&&'members' in w.group?w.group:undefined;
 return {people:Number(!!legacy)+(group?.members.length??0),piles:(legacy?.items.length??0)+(group?.items.length??0)};
}
