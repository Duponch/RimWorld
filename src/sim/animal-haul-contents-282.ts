import {isSchema282OrLater} from './schema-compatibility-257.ts';
import type {MaterialPile,World} from './types.ts';
/** Map-local CarryTracker adaptation inside the original inventory holder.
 * Existing unrelated caravan freight keeps its established counting rules. */
export function animalHaulContents282(w:Pick<World,'wildlife'>&{schemaVersion:number},p:MaterialPile):boolean {
 const o=p.owner;if(o.type!=='inventory'||!isSchema282OrLater(w.schemaVersion))return false;
 const a=w.wildlife?.animals.find(a=>a.id===o.pawnId),t=a?.haul;
 return !!a?.domestic&&a.state!=='dead'&&!!t&&t.phase!=='pickup'&&t.carryPileId===p.id;
}
