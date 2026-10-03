import type { World } from './types.ts';

/** Count original off-map owners without projecting their possessions into
 * local stocks or allocating a combined World. The trips are exclusive. */
export function civilianAway(w:World) {
  return w.scout&&(w.scout.phase==='travelling'||w.scout.phase==='awaiting-entry')?w.scout:
    w.commercialTrip&&'pawn' in w.commercialTrip?w.commercialTrip:undefined;
}
export function civilianAdmissionFits(w:World,pawns=0,piles=0):boolean {
  const away=civilianAway(w);
  return w.pawns.length+Number(!!away)+pawns<=w.width*w.height
    &&w.piles.length+(away?.items.length??0)+piles<=32768;
}
