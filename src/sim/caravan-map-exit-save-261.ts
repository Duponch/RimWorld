import {geographicLongitudeOffsetCore256} from './site-climate.ts';
import type {WorldPawnOwner256} from './world-pawn-state-256.ts';
import type {WorldPawnOriginMap256} from './world-pawn-origin-projection-256.ts';
type MapExitRow261=WorldPawnOwner256&{entryKind261?:'map-exit';encounterBirth261?:unknown};
const own=(v:object,key:PropertyKey)=>Object.getOwnPropertyDescriptor(v,key);
/** Additional closed raw-header gate. The surrounding owner parser retains
 * its full original field allowlist, IDs, ownership and context validation. */
export function validMapExitHeader261(raw:object,version:number):boolean {
 const d=own(raw,'entryKind261');if(!d)return !('entryKind261'in raw);
 if(version!==261||!d.enumerable||!Object.hasOwn(d,'value')||d.value!=='map-exit')return false;
 const origin=own(raw,'originMapId');
 return !!origin&&Object.hasOwn(origin,'value')&&Number.isSafeInteger(origin.value)&&origin.value>=0&&!('entryKind259'in raw)&&!('encounterBirth261'in raw)&&!('startingPawnLeftBehind'in raw);
}
/** True map ExitMap entry is bounded by this context's real birth and the
 * current campaign time. It is never replaced by the later MapRemoved date. */
export function validMapExitReceipt261(input:WorldPawnOwner256,version:number,rootTick:number):boolean {
 if(!validMapExitHeader261(input,version))return false;const row=input as MapExitRow261;if(!row.entryKind261)return true;
 const c=row.context.climate,site=row.context.site;
 if(row.kind!=='human'||c?.revision!==4||site?.revision!==3||c.tileId!==site.tileId||!Number.isSafeInteger(rootTick)||rootTick<0)return false;
 const offset=geographicLongitudeOffsetCore256(c.definition.longitude),born=c.calendarOrigin*10-offset,now=(c.calendarOrigin+rootTick-c.adoptedAt)*10-offset;
 return Number.isSafeInteger(born)&&Number.isSafeInteger(now)&&now>=born&&Number.isSafeInteger(row.enteredAtAbsCore)&&row.enteredAtAbsCore>=0&&row.enteredAtAbsCore>=born&&row.enteredAtAbsCore<=now;
}
/** Caller uses this branch only when the marker is present; all ordinary
 * MapRemoved/caravan rows retain their existing strict matcher unchanged. */
export function mapExitRetiredOriginMatches261(input:WorldPawnOwner256,origin:WorldPawnOriginMap256):boolean {
 const row=input as MapExitRow261,c=row.context.climate,site=row.context.site;
 if(row.entryKind261!=='map-exit'||!validMapExitHeader261(row,261)||row.originMapId!==origin.mapId||c?.revision!==4||site?.revision!==3||c.tileId!==origin.tile||site.tileId!==origin.tile||row.destroyed!==true&&origin.removedAt*10>row.clockCore)return false;
 const offset=geographicLongitudeOffsetCore256(c.definition.longitude),born=c.calendarOrigin*10-offset,removed=(c.calendarOrigin+origin.removedAt-c.adoptedAt)*10-offset;
 return Number.isSafeInteger(born)&&Number.isSafeInteger(removed)&&removed>=born&&Number.isSafeInteger(row.enteredAtAbsCore)&&row.enteredAtAbsCore>=0&&row.enteredAtAbsCore>=born&&row.enteredAtAbsCore<=removed;
}
