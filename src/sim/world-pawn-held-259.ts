import type {WorldPawnOwner256} from './world-pawn-state-256.ts';
import type {MaterialPile} from './types.ts';
import {isPerishable,rotAge,ROT_DAYS} from './food-preservation.ts';
import {TICKS_PER_DAY} from './types.ts';
/** No active WorldObject owns these retained inventory comps. Seal once at
 * the TRUE transfer, preserving every Thing/holder/quantity and old receipt. */
export function suspendWorldPawnGoods259(row:WorldPawnOwner256,atCore:number):void {
 if(!row.items.length&&!row.packed.length)return;
 if(!Number.isSafeInteger(atCore)||atCore<0||atCore%10)throw Error('Invalid actual held suspension frontier');
 row.heldAtCore259=atCore;
 for(const p of row.items)if(isPerishable(p.item)&&p.rot)p.rot={progress:rotAge(p,atCore/10),atTick:atCore/10,rate:0};
}
/** Checks one real suspended holder; no trial tick, ambient temperature,
 * frame-derived state or date normalization is part of this guard. */
export function validSuspendedWorldPawnGoods259(row:WorldPawnOwner256,atCore:number):boolean {
 if(!row.items.length&&!row.packed.length)return row.heldAtCore259===undefined;
 const held=row.heldAtCore259;if(!Number.isSafeInteger(held)||held!<0||held!%10||held!>atCore)return false;
 return row.items.every((p:MaterialPile)=>!isPerishable(p.item)||!!p.rot&&p.rot.rate===0&&p.rot.atTick===held!/10&&Number.isFinite(p.rot.progress)&&p.rot.progress>=0&&p.rot.progress<ROT_DAYS[p.item]*TICKS_PER_DAY);
}
