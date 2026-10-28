import {removedMapCore297} from './retired-map-clock-297.ts';
import {validationCore297} from './core-phase-297.ts';
import {worldPawnPhysicalCore297} from './world-pawn-physical-clock-297.ts';
import {isSchema286OrLater} from './schema-compatibility-257.ts';
import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {mapExitRetiredOriginMatches261} from './caravan-map-exit-save-261.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
import {geographicLongitudeOffsetCore256} from './site-climate.ts';
import type {CampaignMapPresentation,CampaignSummary} from './world-map-state.ts';
import type {CampaignState} from './world-map-state.ts';
import type {WorldPawnOwner256} from './world-pawn-state-256.ts';
/** Foreign-key evidence for physical origins,259 memories and286 linked shelf
 * groups. Never a live map, occupant, marker, grid or UI action. */
export interface WorldPawnOriginMap256 {mapId:number;tile:number;removedAt:number;removedAtCore297?:number;settledAt?:number}
export function worldPawnOriginProjection256(root:CampaignState):{worldPawnOrigins?:WorldPawnOriginMap256[]} {
 if(!isSchema256Or257(root.schemaVersion)||!root.worldMaps)return {};
 const needed=new Set([...root.worldPawns?.owners??[],...root.worldPawns?.discardedMechanical259??[],...root.worldPawns?.heldCaskets259??[],...root.worldPawns?.heldPlayerCaskets271??[],...root.worldPawns?.heldShipCaskets277??[]].flatMap(r=>r.originMapId===null||root.worldMaps!.sites.some(m=>m.id===r.originMapId)?[]:[r.originMapId]));
 if((Number(root.schemaVersion)===259||Number(root.schemaVersion)===260||(Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||isSchema263OrLater(Number(root.schemaVersion))))))for(const m of root.worldGroups?.lostMemories??[])if(m.kind==='new-colony-settled'&&!root.worldMaps.sites.some(s=>s.id===m.mapId))needed.add(m.mapId);
 if((Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||isSchema263OrLater(Number(root.schemaVersion)))))for(const m of root.worldGroups?.lostMemories??[])if(m.caravanCession261&&!root.worldMaps.sites.some(s=>s.id===m.mapId))needed.add(m.mapId);
 if(isSchema263OrLater(Number(root.schemaVersion)))for(const g of root.worldGroups?.groups??[])if(g.localMapId===null&&g.retreat261?.autoJoinable===true&&!root.worldMaps.sites.some(s=>s.id===g.originMapId))needed.add(g.originMapId);
 if(isSchema286OrLater(root.schemaVersion))for(const g of root.linkedStorage286?.groups??[])if(!root.worldMaps.sites.some(s=>s.id===g.originMapId))needed.add(g.originMapId);
 const worldPawnOrigins=root.worldMaps.retired.flatMap(r=>needed.has(r.id)&&r.tile!==null?[{mapId:r.id,tile:r.tile,removedAt:r.removedAt,...r.removedAtCore297!==undefined?{removedAtCore297:r.removedAtCore297}:{},...(Number(root.schemaVersion)===259||Number(root.schemaVersion)===260||(Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||isSchema263OrLater(Number(root.schemaVersion)))))&&r.settledAt!==undefined?{settledAt:r.settledAt}:{}}]:[]);
 return worldPawnOrigins.length?{worldPawnOrigins}:{};
}
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const data=(v:object,k:PropertyKey)=>{const d=Object.getOwnPropertyDescriptor(v,k);return d&&'value'in d&&d.enumerable?d:undefined;};
/** Strict256 scalar transport before nested readers, including ownundefined,
 * accessor/inherited/hidden metadata refusal. No Thing/map namespace merge. */
export function validWorldPawnOriginProjection256(value:object,version:number,tick:number,nextId:number,tileCount:number,liveMapIds:ReadonlySet<number>,coreNow297?:number):boolean {
 if(version===297&&!Number.isSafeInteger(validationCore297(version,tick,coreNow297)))return false;
 const field=Object.getOwnPropertyDescriptor(value,'worldPawnOrigins');if(!field)return !('worldPawnOrigins'in value);
 if(!isSchema256Or257(version)||!('value'in field)||!field.enumerable||!Array.isArray(field.value)||field.value.length>nextId||Reflect.ownKeys(field.value).length!==field.value.length+1)return false;
 const ids=new Set<number>();
 for(let i=0;i<field.value.length;i++){
  const entry=data(field.value,String(i));if(!entry)return false;const r=entry.value;
  if(!r||typeof r!=='object'||Array.isArray(r)||Object.getPrototypeOf(r)!==Object.prototype||Reflect.ownKeys(r).length!==(3+(Object.hasOwn(r,'settledAt')?1:0)+(Object.hasOwn(r,'removedAtCore297')?1:0))||!Reflect.ownKeys(r).every(k=>typeof k==='string'&&['mapId','tile','removedAt',...(version===297?['removedAtCore297']:[]),...(version===259||version===260||(version===261||(Number(version)===262||isSchema263OrLater(Number(version)))))?['settledAt']:[]].includes(k)&&!!data(r,k)))return false;
  if(!int(r.mapId)||ids.has(r.mapId)||liveMapIds.has(r.mapId)||!int(r.tile,0,tileCount-1)||!int(r.removedAt,0,tick)||!Number.isSafeInteger(removedMapCore297(r,version))||version===297&&removedMapCore297(r,version)>validationCore297(version,tick,coreNow297)||Object.hasOwn(r,'settledAt')&&!int(r.settledAt,0,r.removedAt))return false;ids.add(r.mapId);
 }
 return true;
}
/** This first retired-origin producer is the actual Camp MapRemoved entry.
 * It binds removal to the row's captured absolute entry clock and geographic
 * source context. A different future ExitMap producer needs its own contract. */
export function worldPawnRetiredOriginMatches256(row:WorldPawnOwner256,origin:WorldPawnOriginMap256,version=256):boolean {
 if(Object.hasOwn(row,'entryKind261'))return mapExitRetiredOriginMatches261(row,origin);
 const c=row.context.climate,site=row.context.site;
 if(row.originMapId!==origin.mapId||c?.revision!==4||site?.revision!==3||c.tileId!==origin.tile||site.tileId!==origin.tile||row.destroyed!==true&&removedMapCore297(origin,version)>worldPawnPhysicalCore297(row,version))return false;
 const absolute=(c.calendarOrigin+origin.removedAt-c.adoptedAt)*10-geographicLongitudeOffsetCore256(c.definition.longitude)+(version===297?removedMapCore297(origin,version)-origin.removedAt*10:0);
 return Number.isSafeInteger(absolute)&&absolute>=0&&(row.destroyed===true||row.entryKind259==='caravan-exit'?row.enteredAtAbsCore<=absolute: absolute===row.enteredAtAbsCore);
}

/** A settlement memory may use this SAME scalar proof without inventing a Pawn origin. */
export function settlementMemoryUsesRetiredOrigin259(value:Pick<CampaignMapPresentation|CampaignSummary,'lostMemories'>|undefined,origin:WorldPawnOriginMap256,version:number):boolean {
 return (version===259||version===260||(version===261||(Number(version)===262||isSchema263OrLater(Number(version)))))&&origin.settledAt!==undefined&&!!value?.lostMemories.some(m=>m.kind==='new-colony-settled'&&m.mapId===origin.mapId&&m.at===origin.settledAt);
}
/** The same authentic retired-map witness may describe a policy's origin,
 * without implying a WorldPawn exists or a retired map can be used. */
export function linkedStorageUsesRetiredOrigin286(value:Pick<CampaignState,'schemaVersion'|'linkedStorage286'>,origin:WorldPawnOriginMap256):boolean {
 return isSchema286OrLater(value.schemaVersion)&&!!value.linkedStorage286?.groups.some(g=>g.originMapId===origin.mapId);
}
