import {prepareAnimalAreaRemoval287,type AnimalAreaOwnerPlan287} from './animal-area-owners-287.ts';
import type {World,Pawn} from './types.ts';
import type {CampaignState} from './world-map-state.ts';
import {registeredCampaign,registeredMapId,registeredMapForValidation} from './world-map-context.ts';
import {campaignPhysicalCaptures} from './campaign-people.ts';
export interface PawnMapAreas {revision:1;assignments:{mapId:number;areaId:number}[]}
type Holder=Pawn&{mapAreas?:PawnMapAreas};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const fields=(v:Record<string,unknown>,keys:readonly string[])=>Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,String(i))!,'value')).every(Boolean);
export function validPawnMapAreasRecord(p:Record<string,unknown>,version:number,nextId:number):boolean {
 const d=Object.getOwnPropertyDescriptor(p,'mapAreas');if(!d)return true;
 if(version<256||!Object.hasOwn(d,'value')||!object(d.value)||!fields(d.value,['revision','assignments'])||d.value.revision!==1||!dense(d.value.assignments,nextId-1))return false;
 const maps=new Set<number>();for(const row of d.value.assignments){if(!object(row)||!fields(row,['mapId','areaId'])||!int(row.mapId)||maps.has(row.mapId)||!int(row.areaId,1,nextId-1))return false;maps.add(row.mapId);}return true;
}
/** Existing area-domain guards own the number of definitions. This metadata
 * publishes only their original IDs, never a parallel quota or cell grid. */
export function validMapAreaIds(value:unknown,nextId:number):value is number[] {
 return dense(value,nextId-1)&&value.every(id=>int(id,1,nextId-1))&&new Set(value).size===value.length;
}
export function mapAreaReferences(w:World):Map<number,readonly number[]>|undefined {
 const root=registeredCampaign(w);
 if(root.worldMaps){const result=new Map<number,readonly number[]>();for(const site of root.worldMaps.sites){const map=registeredMapForValidation(root,site.id);if(!map)return;result.set(site.id,(map.allowedAreas??[]).map(a=>a.id));}return result;}
 const metadata=w.campaignMap?.revision===2?w.campaignMap.maps:(w as unknown as {maps?:{id:number;areaIds?:number[]}[]}).maps;
 if(!Array.isArray(metadata))return;
 const result=new Map<number,readonly number[]>();for(const row of metadata){if(!object(row)||!int(row.id)||!validMapAreaIds(row.areaIds,w.nextId)||result.has(row.id))return;result.set(row.id,row.areaIds);}return result;
}
export function validPawnMapAreaBindings(p:Pawn,w:World,localAlias:boolean):boolean {
 if(!validPawnMapAreasRecord(p as unknown as Record<string,unknown>,w.schemaVersion,w.nextId))return false;
 const holder=p as Holder;if(!holder.mapAreas)return true;
 const table=mapAreaReferences(w);if(!table)return false;
 for(const row of holder.mapAreas.assignments)if(!table.get(row.mapId)?.includes(row.areaId))return false;
 if(!localAlias)return p.allowedAreaId===undefined&&!Object.hasOwn(p,'allowedAreaReturn');
 const id=registeredMapId(w)??(w.campaignMap?.revision===2?w.campaignMap.activeMapId:undefined);if(id===undefined)return false;
 return holder.mapAreas.assignments.find(row=>row.mapId===id)?.areaId===p.allowedAreaId;
}
function localMapId(w:World):number {const id=registeredMapId(w);if(id===undefined||!registeredCampaign(w).worldMaps?.sites.some(m=>m.id===id))throw Error('No real local map for an area setting');return id;}
/** Pure preview uses the original actual local owner; no future clone is
 * admitted as a second Pawn. Its returned metadata belongs to a command draft. */
export function planCurrentMapArea(w:World,p:Pawn,areaId:number|null):PawnMapAreas {
 if(w.schemaVersion<256||!w.pawns.includes(p))throw Error('Area setting requires the actual local Pawn');const id=localMapId(w),holder=p as Holder;
 if(areaId!==null&&!w.allowedAreas?.some(a=>a.id===areaId))throw Error('Unknown actual local area');
 const rows=holder.mapAreas?.assignments??[],next=rows.filter(row=>row.mapId!==id);if(areaId!==null)next.push({mapId:id,areaId});return {revision:1,assignments:next};
}
/** Called only after the existing command's refusal/drop preflight. */
export function rememberCurrentMapArea(w:World,p:Pawn,areaId:number|null):void {if(w.schemaVersion>=256)p.mapAreas=planCurrentMapArea(w,p,areaId);}
/** A real departure preserves the existing setting by Map reference and clears
 * only its local alias. No metadata is added during migration or rendering. */
export function rememberMapAreaDeparture(w:World,p:Pawn):void {
 if(w.schemaVersion<256)return;
 if(p.allowedAreaId!==undefined)rememberCurrentMapArea(w,p,p.allowedAreaId);
 delete p.allowedAreaId;delete p.allowedAreaReturn;
}
/** Pure entry preflight; no Pawn position, RNG, map or setting changes. */
export function mapAreaEntryAlias(w:World,p:Pawn):number|undefined {
 if(w.schemaVersion<256)return p.allowedAreaId;
 const id=localMapId(w),value=(p as Holder).mapAreas?.assignments.find(row=>row.mapId===id)?.areaId;
 if(value!==undefined&&!w.allowedAreas?.some(a=>a.id===value))throw Error('Stored area reference is no longer owned by this map');return value;
}
export interface MapAreaEntryPlan {areaId?:number;mapAreas?:PawnMapAreas}
export function prepareMapAreaEntry(root:CampaignState,p:Pawn,originMapId:number,targetMapId:number,targetAreaIds:readonly number[]):MapAreaEntryPlan {
 const holder=p as Holder;let mapAreas=holder.mapAreas;
 if(root.schemaVersion<256)return {areaId:p.allowedAreaId};
 if(!mapAreas&&p.allowedAreaId!==undefined){const actual=registeredMapForValidation(root,originMapId);if(!actual?.allowedAreas?.some(a=>a.id===p.allowedAreaId))throw Error('Legacy area has no real origin');mapAreas={revision:1,assignments:[{mapId:originMapId,areaId:p.allowedAreaId}]};}
 const areaId=mapAreas?.assignments.find(a=>a.mapId===targetMapId)?.areaId;
 if(areaId!==undefined&&!targetAreaIds.includes(areaId))throw Error('Stored target area no longer exists');return {...mapAreas?{mapAreas}:{},...areaId!==undefined?{areaId}:{}};
}
export function commitMapAreaEntry(p:Pawn,plan:MapAreaEntryPlan):void {if(plan.mapAreas)p.mapAreas=plan.mapAreas;applyMapAreaEntryAlias(p,plan.areaId);}
export function applyMapAreaEntryAlias(p:Pawn,areaId:number|undefined):void {if(areaId===undefined)delete p.allowedAreaId;else p.allowedAreaId=areaId;delete p.allowedAreaReturn;}
interface RemovedAreaUpdate {pawn:Holder;next?:PawnMapAreas;clearAlias:boolean;before:string}
export interface RemovedMapAreaPlan {updates:RemovedAreaUpdate[];animal287?:AnimalAreaOwnerPlan287}
/** All original living, contained, away, terminal and lost Pawn owners. Pure
 * capture before DeSpawn removes a map; it installs no runtime map cache. */
export function prepareRemovedMapAreas(root:CampaignState,mapId:number,areaIds:ReadonlySet<number>,includeAnimals=true):RemovedMapAreaPlan {
 const updates:RemovedAreaUpdate[]=[],seen=new Map<number,Pawn>();
 for(const capture of campaignPhysicalCaptures(root as World))for(const slot of capture.owners.pawnOwners){
  const p=slot.pawn! as Holder,previous=seen.get(p.id);if(previous){if(previous!==p)throw Error('Duplicate person while removing map areas');continue;}seen.set(p.id,p);
  const rows=p.mapAreas?.assignments,next=rows?.filter(row=>row.mapId!==mapId),clearAlias=p.allowedAreaId!==undefined&&areaIds.has(p.allowedAreaId);
  if(clearAlias||rows&&next!.length!==rows.length)updates.push({pawn:p,...rows?{next:{revision:1,assignments:next!}}:{},clearAlias,before:JSON.stringify([p.allowedAreaId,p.allowedAreaReturn,p.mapAreas])});
 }
 const animal287=includeAnimals&&Number(root.schemaVersion)===287?prepareAnimalAreaRemoval287(root,{mapId}):undefined;if(animal287&&!animal287.ok)throw Error(animal287.reason);
 return {updates,...animal287?.ok?{animal287}:{}};
}
export function removedMapAreasCurrent(plan:RemovedMapAreaPlan):boolean {return (!plan.animal287||plan.animal287.current()||plan.animal287.admittedCurrent())&&plan.updates.every(u=>JSON.stringify([u.pawn.allowedAreaId,u.pawn.allowedAreaReturn,u.pawn.mapAreas])===u.before);}
/** Admit every actual animal recipient before notification/departure writes. */
export function beginRemovedMapAreas287(plan:RemovedMapAreaPlan):void {if(plan.animal287&&!plan.animal287.admittedCurrent())plan.animal287.begin();}
/** No clinical field, item, movement edge or other map's setting is changed. */
export function commitRemovedMapAreas(plan:RemovedMapAreaPlan):void {if(plan.animal287){beginRemovedMapAreas287(plan);if(!plan.animal287.adoptAdmitted())throw Error('Stale admitted animal area recipients');}for(const row of plan.updates){if(row.next)row.pawn.mapAreas=row.next;if(row.clearAlias){delete row.pawn.allowedAreaId;delete row.pawn.allowedAreaReturn;}}}
/** Area deletion is the same reference removal restricted to one actual Map. */
export function forgetMapArea(w:World,areaId:number):void {
 if(w.schemaVersion<256)return;const id=localMapId(w),root=registeredCampaign(w),plan=prepareRemovedMapAreas(root,id,new Set([areaId]),false);
 // Deleting one definition preserves all other entries on that same map too.
 plan.updates=plan.updates.filter(row=>row.clearAlias||row.pawn.mapAreas?.assignments.some(a=>a.mapId===id&&a.areaId===areaId));
 for(const row of plan.updates)if(row.pawn.mapAreas)row.next={revision:1,assignments:row.pawn.mapAreas.assignments.filter(a=>!(a.mapId===id&&a.areaId===areaId))};
 commitRemovedMapAreas(plan);
}
/** Legacy individuals return to their genuine origin only; their existing
 * MapRemoved refusal remains in their driver before this preflight. */
export function prepareSameMapAreaReturn(w:World,p:Pawn):MapAreaEntryPlan {const id=localMapId(w);return prepareMapAreaEntry(registeredCampaign(w),p,id,id,(w.allowedAreas??[]).map(a=>a.id));}
