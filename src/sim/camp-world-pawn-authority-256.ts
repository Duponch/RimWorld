import {worldPawnSituation256} from './world-pawn-capture-256.ts';
import type {WorldPawnOwner256} from './world-pawn-state-256.ts';
/** A missing fact is NOT Free, unseen or unrelated. No persistent history is
 * synthesized here. Terminal/starting rows short-circuit in the shared reader. */
export const actualCampWorldPawnSituation256=worldPawnSituation256;
/** A true SpawnSetup witness short-circuits Core weight to1, regardless of
 * any relationships. Missing history cannot prove unseen, unrelated or .1.
 * Called only for a REAL eligible candidate after Chance, never to omit it. */
export function actualCampWorldPawnWeight256(original:WorldPawnOwner256):1|undefined {
 const d=Object.getOwnPropertyDescriptor(original,'everSeenByPlayer');
 return d?.enumerable===true&&Object.hasOwn(d,'value')&&d.value===true?1:undefined;
}
