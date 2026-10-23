import {registeredCampaign,registeredMapForValidation,registeredMapId} from './world-map-context.ts';
import type {CampaignState} from './world-map-state.ts';
import type {World} from './types.ts';

export type AnimalAreaReferences287=ReadonlyMap<number,ReadonlySet<number>>;
const int=(v:unknown,min=0):v is number=>Number.isSafeInteger(v)&&Number(v)>=min;
/** One operation-local FK table; no remote grid or invented map is needed. */
export function captureAnimalAreaReferences287(input:CampaignState):AnimalAreaReferences287|undefined {
 const root=registeredCampaign(input),refs=new Map<number,ReadonlySet<number>>();
 if(root.worldMaps){for(const site of root.worldMaps.sites){const map=registeredMapForValidation(root,site.id);if(!map||refs.has(site.id))return;refs.set(site.id,new Set((map.allowedAreas??[]).map(a=>a.id)));}return refs;}
 const local=input as World,metadata=local.campaignMap?.revision===2?local.campaignMap:input as unknown as {maps?:{id:number;areaIds?:number[]}[]};
 if(Array.isArray(metadata.maps)){for(const row of metadata.maps){if(!int(row.id)||refs.has(row.id)||!Array.isArray(row.areaIds)||row.areaIds.some(id=>!int(id,1)||id>=input.nextId)||new Set(row.areaIds).size!==row.areaIds.length)return;refs.set(row.id,new Set(row.areaIds));}return refs;}
 if(Array.isArray(local.tiles)){const id=registeredMapId(local);if(id===undefined)return;refs.set(id,new Set((local.allowedAreas??[]).map(a=>a.id)));return refs;}
}
