import {mapExitRetiredOriginMatches261} from './caravan-map-exit-save-261.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
import {geographicLongitudeOffsetCore256} from './site-climate.ts';
import type {CampaignMapPresentation,CampaignSummary} from './world-map-state.ts';
import type {CampaignState} from './world-map-state.ts';
import type {WorldPawnOwner256} from './world-pawn-state-256.ts';
/** Foreign-key evidence for physical origins and259 settlement memories only. Never a live map, marker, grid or UI action. */
export interface WorldPawnOriginMap256 {mapId:number;tile:number;removedAt:number;settledAt?:number}
export function worldPawnOriginProjection256(root:CampaignState):{worldPawnOrigins?:WorldPawnOriginMap256[]} {
 if(!isSchema256Or257(root.schemaVersion)||!root.worldMaps)return {};
 const needed=new Set([...root.worldPawns?.owners??[],...root.worldPawns?.discardedMechanical259??[],...root.worldPawns?.heldCaskets259??[]].flatMap(r=>r.originMapId===null||root.worldMaps!.sites.some(m=>m.id===r.originMapId)?[]:[r.originMapId]));
 if((Number(root.schemaVersion)===259||Number(root.schemaVersion)===260||root.schemaVersion===261))for(const m of root.worldGroups?.lostMemories??[])if(m.kind==='new-colony-settled'&&!root.worldMaps.sites.some(s=>s.id===m.mapId))needed.add(m.mapId);
 if(root.schemaVersion===261)for(const m of root.worldGroups?.lostMemories??[])if(m.caravanCession261&&!root.worldMaps.sites.some(s=>s.id===m.mapId))needed.add(m.mapId);
 const worldPawnOrigins=root.worldMaps.retired.flatMap(r=>needed.has(r.id)&&r.tile!==null?[{mapId:r.id,tile:r.tile,removedAt:r.removedAt,...(Number(root.schemaVersion)===259||Number(root.schemaVersion)===260||root.schemaVersion===261)&&r.settledAt!==undefined?{settledAt:r.settledAt}:{}}]:[]);
 return worldPawnOrigins.length?{worldPawnOrigins}:{};
}
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const data=(v:object,k:PropertyKey)=>{const d=Object.getOwnPropertyDescriptor(v,k);return d&&'value'in d&&d.enumerable?d:undefined;};
/** Strict256 scalar transport before nested readers, including ownundefined,
 * accessor/inherited/hidden metadata refusal. No Thing/map namespace merge. */
export function validWorldPawnOriginProjection256(value:object,version:number,tick:number,nextId:number,tileCount:number,liveMapIds:ReadonlySet<number>):boolean {
 const field=Object.getOwnPropertyDescriptor(value,'worldPawnOrigins');if(!field)return !('worldPawnOrigins'in value);
 if(!isSchema256Or257(version)||!('value'in field)||!field.enumerable||!Array.isArray(field.value)||field.value.length>nextId||Reflect.ownKeys(field.value).length!==field.value.length+1)return false;
 const ids=new Set<number>();
 for(let i=0;i<field.value.length;i++){
  const entry=data(field.value,String(i));if(!entry)return false;const r=entry.value;
  if(!r||typeof r!=='object'||Array.isArray(r)||Object.getPrototypeOf(r)!==Object.prototype||Reflect.ownKeys(r).length!==(Object.hasOwn(r,'settledAt')?4:3)||!Reflect.ownKeys(r).every(k=>typeof k==='string'&&['mapId','tile','removedAt',...(version===259||version===260||version===261)?['settledAt']:[]].includes(k)&&!!data(r,k)))return false;
  if(!int(r.mapId)||ids.has(r.mapId)||liveMapIds.has(r.mapId)||!int(r.tile,0,tileCount-1)||!int(r.removedAt,0,tick)||Object.hasOwn(r,'settledAt')&&!int(r.settledAt,0,r.removedAt))return false;ids.add(r.mapId);
 }
 return true;
}
/** This first retired-origin producer is the actual Camp MapRemoved entry.
 * It binds removal to the row's captured absolute entry clock and geographic
 * source context. A different future ExitMap producer needs its own contract. */
export function worldPawnRetiredOriginMatches256(row:WorldPawnOwner256,origin:WorldPawnOriginMap256):boolean {
 if(Object.hasOwn(row,'entryKind261'))return mapExitRetiredOriginMatches261(row,origin);
 const c=row.context.climate,site=row.context.site;
 if(row.originMapId!==origin.mapId||c?.revision!==4||site?.revision!==3||c.tileId!==origin.tile||site.tileId!==origin.tile||row.destroyed!==true&&origin.removedAt*10>row.clockCore)return false;
 const absolute=(c.calendarOrigin+origin.removedAt-c.adoptedAt)*10-geographicLongitudeOffsetCore256(c.definition.longitude);
 return Number.isSafeInteger(absolute)&&absolute>=0&&(row.destroyed===true||row.entryKind259==='caravan-exit'?row.enteredAtAbsCore<=absolute: absolute===row.enteredAtAbsCore);
}

/** A settlement memory may use this SAME scalar proof without inventing a Pawn origin. */
export function settlementMemoryUsesRetiredOrigin259(value:Pick<CampaignMapPresentation|CampaignSummary,'lostMemories'>|undefined,origin:WorldPawnOriginMap256,version:number):boolean {
 return (version===259||version===260||version===261)&&origin.settledAt!==undefined&&!!value?.lostMemories.some(m=>m.kind==='new-colony-settled'&&m.mapId===origin.mapId&&m.at===origin.settledAt);
}
