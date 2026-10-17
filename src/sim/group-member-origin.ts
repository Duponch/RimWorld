import {geographicLongitudeOffsetCore256} from './site-climate.ts';
import type {World} from './types.ts';
import type {GroupMemberOrigin,GroupMemberProjectionContext} from './group-reorganization-state.ts';
import {validGroupMapContext} from './world-map-context-save.ts';
import {registeredCampaign,registeredMapForValidation,brandCampaignContext,brandLossProjection,boundWorldGroup,projectedGroupMemberContext} from './world-map-context.ts';
/** Only the small admitted provenance header is compared, never map cells. */
export function sameGroupHeaderValue(a:unknown,b:unknown):boolean {
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const left=Object.keys(a),right=Object.keys(b);return left.length===right.length&&left.every(k=>Object.hasOwn(b,k)&&sameGroupHeaderValue((a as Record<string,unknown>)[k],(b as Record<string,unknown>)[k]));
}
export function groupMemberOriginAuthority(world:World,origin:GroupMemberOrigin):boolean {
 const root=registeredCampaign(world);
 if(!validGroupMapContext(origin.context,root.tick,root.schemaVersion,root))return false;
 if(origin.enteredAtAbsCore!==undefined){const c=origin.context.climate;if(root.schemaVersion<259||c?.revision!==4||!Number.isSafeInteger(origin.enteredAtAbsCore)||origin.enteredAtAbsCore<0)return false;const now=(c.calendarOrigin+root.tick-c.adoptedAt)*10-geographicLongitudeOffsetCore256(c.definition.longitude);const born=c.calendarOrigin*10-geographicLongitudeOffsetCore256(c.definition.longitude);if(origin.enteredAtAbsCore<born||origin.enteredAtAbsCore>now)return false;}
 if(!root.worldMaps){const fact=projectedGroupMemberContext(world,origin.pawnId);return !!fact&&fact.originMapId===origin.originMapId&&sameGroupHeaderValue(fact.context,origin.context);}
 const map=registeredMapForValidation(root,origin.originMapId),archived=root.worldGroups?.abandonedContents.find(a=>a.mapId===origin.originMapId),source=map??archived?.context;
 if(!source)return false;
 return (['seed','width','height','climate','site','scenario'] as const).every(k=>sameGroupHeaderValue(origin.context[k],source[k]));
}
/** Read-only validation context. This is never selected, stepped or saved and
 * never installs a map cache or fabricates a larger map for foreign people. */
export function groupPersonValidationView(world:World,origin?:GroupMemberOrigin):World {
 if(!origin)return world;
 const root=registeredCampaign(world),map=registeredMapForValidation(root,origin.originMapId),archive=root.worldGroups?.abandonedContents.find(a=>a.mapId===origin.originMapId);
 const fact=projectedGroupMemberContext(world,origin.pawnId);
 const view={...world,...origin.context,...map?.allowedAreas?{allowedAreas:map.allowedAreas}:{}};
 if(!map?.allowedAreas)delete view.allowedAreas;
 if(map?.filth||archive?.filthPresent||fact?.filthPresent)brandLossProjection(view,true);
 brandCampaignContext(view,root,origin.originMapId,boundWorldGroup(world));return view;
}
/** Projection receipts are captured only from the actual raw owner registry. */
export function captureGroupMemberContexts(world:World,rows:readonly GroupMemberOrigin[]):GroupMemberProjectionContext[] {const root=registeredCampaign(world);return rows.map(origin=>({...origin,filthPresent:!!registeredMapForValidation(root,origin.originMapId)?.filth||root.worldGroups!.abandonedContents.some(a=>a.mapId===origin.originMapId&&a.filthPresent)}));}
/** The metadata guard calls this before installing the operation-local witness. */
export function validProjectedMemberContexts(value:unknown,origins:readonly GroupMemberOrigin[]|undefined,tick:number,nextId:number,authority?:Pick<World,'schemaVersion'|'planet'|'worldMaps'|'campaignMap'>):value is GroupMemberProjectionContext[]|undefined {
 if(origins===undefined)return value===undefined;
 if(!Array.isArray(value)||Reflect.ownKeys(value).length!==value.length+1||value.length!==origins.length)return false;
 for(const origin of origins){if(!origin||typeof origin!=='object'||Array.isArray(origin)||Object.getPrototypeOf(origin)!==Object.prototype||Reflect.ownKeys(origin).length!==(Object.hasOwn(origin,'enteredAtAbsCore')?4:3)||Reflect.ownKeys(origin).some(k=>typeof k!=='string'||!['pawnId','originMapId','context',...(authority?.schemaVersion??255)>=259?['enteredAtAbsCore']:[]].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(origin,k)!,'value'))||!Number.isSafeInteger(origin.pawnId)||!Number.isSafeInteger(origin.originMapId)||origin.originMapId<0||!validGroupMapContext(origin.context,tick,authority?.schemaVersion??255,authority))return false;}
 const ids=new Set<number>();
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!Object.hasOwn(d,'value'))return false;
  const row:unknown=d.value;if(!row||typeof row!=='object'||Array.isArray(row)||Object.getPrototypeOf(row)!==Object.prototype)return false;
  const keys=Reflect.ownKeys(row);if(keys.length!==(Object.hasOwn(row,'enteredAtAbsCore')?5:4)||keys.some(k=>typeof k!=='string'||!['pawnId','originMapId','context','filthPresent',...(authority?.schemaVersion??255)>=259?['enteredAtAbsCore']:[]].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(row,k)!,'value')))return false;
  const r=row as GroupMemberProjectionContext,origin=origins.find(o=>o.pawnId===r.pawnId);
  if(!Number.isSafeInteger(r.pawnId)||r.pawnId<1||r.pawnId>=nextId||ids.has(r.pawnId)||!origin||r.originMapId!==origin.originMapId||typeof r.filthPresent!=='boolean'||!validGroupMapContext(r.context,tick,authority?.schemaVersion??255,authority)||origin.enteredAtAbsCore!==r.enteredAtAbsCore||Object.hasOwn(r,'enteredAtAbsCore')&&((authority?.schemaVersion??255)<259||!Number.isSafeInteger(r.enteredAtAbsCore)||r.enteredAtAbsCore!<0)||!sameGroupHeaderValue(origin.context,r.context))return false;ids.add(r.pawnId);
 }
 return true;
}