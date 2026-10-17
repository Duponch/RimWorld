import {captureNativeWorldPawnFinderIds256,validNativeWorldPawnOrder256,restoreNativeWorldPawnOrder256,type NativeWorldPawnOrder256} from './native-world-pawn-order-256.ts';
import type {WorldPawnsState256,WorldPawnOwner256} from './world-pawn-state-256.ts';
/** Shape admission is performed by the envelope BEFORE this physical binding.
 * No reconstruction from the final array and no inferred empty set. */
export function validPhysicalWorldPawnOrder256(state:WorldPawnsState256,nextId:number):boolean {
 const d=Object.getOwnPropertyDescriptor(state,'nativeOrder');if(!d)return !('nativeOrder'in state);
 if(!d.enumerable||!Object.hasOwn(d,'value')||!validNativeWorldPawnOrder256(d.value,nextId,state.atCore))return false;
 try{orderedWorldPawnRows256(state);return true;}catch{return false;}
}
/** Legacy absence keeps the literal physical order. Native presence reads the
 * three REAL sets; the physical array remains their sole payload owner. */
export function orderedWorldPawnRows256(state:WorldPawnsState256):readonly WorldPawnOwner256[]{
 if(!Object.hasOwn(state,'nativeOrder')){if('nativeOrder'in state)throw Error('Inherited native WorldPawn order');return state.owners;}
 const order=state.nativeOrder;if(!order)throw Error('Missing actual native WorldPawn order');
 const rows=new Map<number,WorldPawnOwner256>();for(const r of state.owners){if(rows.has(r.actor.id))throw Error('Duplicate actual WorldPawn original');rows.set(r.actor.id,r);}
 const out:WorldPawnOwner256[]=[];
 for(const [key,mode] of [['alive','active'],['mothballed','mothballed'],['dead','dead']] as const)for(const id of order[key].slots){if(id===null)continue;const row=rows.get(id);if(!row||row.mode!==mode)throw Error('Native WorldPawn slot has no matching physical owner');rows.delete(id);out.push(row);}
 if(rows.size)throw Error('Physical WorldPawn missing its actual native slot');return out;
}
export function nativeWorldPawnOrderMutable256(state:WorldPawnsState256):boolean {
 const d=Object.getOwnPropertyDescriptor(state,'nativeOrder');return d?d.enumerable===true&&Object.hasOwn(d,'value')&&d.writable===true&&!!d.value&&frozen(d.value):!('nativeOrder'in state);
}
function frozen(order:NativeWorldPawnOrder256):boolean{
 if(!order||typeof order!=='object'||!Object.isFrozen(order))return false;
 const birth=Object.getOwnPropertyDescriptor(order,'birth');if(!birth||!Object.hasOwn(birth,'value')||!birth.value||!Object.isFrozen(birth.value))return false;
 return (['alive','mothballed','dead'] as const).every(k=>{const d=Object.getOwnPropertyDescriptor(order,k);if(!d||!Object.hasOwn(d,'value')||!d.value||!Object.isFrozen(d.value))return false;for(const p of ['slots','free']){const a=Object.getOwnPropertyDescriptor(d.value,p);if(!a||!Object.hasOwn(a,'value')||!Array.isArray(a.value)||!Object.isFrozen(a.value))return false;}return true;});
}
/** After COMPLETE RAW/full/delta admission only; no omitted historical state
 * is materialized, no final membership is used to infer a slot or free chain. */
export function freezeAdmittedNativeWorldPawnOrder256(owner:{nextId:number;worldPawns?:WorldPawnsState256}):void {
 const state=owner.worldPawns;if(!state||!Object.hasOwn(state,'nativeOrder'))return;
 if(!validPhysicalWorldPawnOrder256(state,owner.nextId))throw Error('Invalid native WorldPawn cold owner');
 if(!frozen(state.nativeOrder!))owner.worldPawns={...state,nativeOrder:restoreNativeWorldPawnOrder256(state.nativeOrder,owner.nextId,state.atCore)};
}
export function nativeWorldPawnOrderCurrent256(state:WorldPawnsState256,before:NativeWorldPawnOrder256|undefined):boolean {
 return nativeWorldPawnOrderMutable256(state)&&state.nativeOrder===before;
}
/** Invoke only inside the already-preflighted physical commit. No yield may
 * separate this assignment from the original transfer/mode change. */
export function commitNativeWorldPawnOrder256(state:WorldPawnsState256,before:NativeWorldPawnOrder256|undefined,after:NativeWorldPawnOrder256|undefined):void {
 if(!nativeWorldPawnOrderCurrent256(state,before)||!!before!==!!after)throw Error('Stale actual native WorldPawn order');
 if(before)state.nativeOrder=after!;
}
/** Exposes no payload or extra owner, useful only at the actual Finder scope. */
export function nativeWorldPawnFinderIds256(state:WorldPawnsState256){
 if(!state.nativeOrder)throw Error('Native WorldPawn history absent');orderedWorldPawnRows256(state);return captureNativeWorldPawnFinderIds256(state.nativeOrder);
}
/** MAIN's confirmed epoch header only, analogous to faction birth metadata.
 * This never certifies a RAW save or reconstructs slots from a previous frame. */
export function captureNativeWorldPawnBirth256(state:WorldPawnsState256|undefined):NativeWorldPawnOrder256['birth']|undefined {
 return state?.nativeOrder?Object.freeze({...state.nativeOrder.birth}):undefined;
}
export function sameNativeWorldPawnBirth256(before:NativeWorldPawnOrder256['birth']|undefined,state:WorldPawnsState256|undefined):boolean {
 const next=state?.nativeOrder?.birth;
 return before===undefined?next===undefined:next!==undefined&&before.atCore===next.atCore&&before.atAbsCore===next.atAbsCore&&before.firstThingId===next.firstThingId;
}
