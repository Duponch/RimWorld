import {actualCampWorldPawnWeight256} from './camp-world-pawn-authority-256.ts';
import type {WorldPawnOwner256} from './world-pawn-state-256.ts';
/** Declared provisional animal-producer adaptation, NOT reconstructed history.
 * A true SpawnSetup witness keeps the primary weight. For an admitted animal
 * with absent history only, use uniform selection weight1; never write seen or
 * relations, omit a candidate, reroll, or relax redress/ownership admission.
 * The caller owns the explicit new-generator version gate. Historical readers
 * and malformed own fields (including accessors/undefined) remain strict. */
export function provisionalCampWorldPawnWeight261(original:WorldPawnOwner256):1|undefined {
 const actual=actualCampWorldPawnWeight256(original);if(actual!==undefined)return actual;
 return Object.getOwnPropertyDescriptor(original,'kind')?.value==='animal'&&!Object.hasOwn(original,'everSeenByPlayer')?1:undefined;
}
