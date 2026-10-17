import type {CampaignState} from './world-map-state.ts';
/** A scalar world-object view of an actual retired Camp. This ID is never a
 * live map, Thing owner, target for map-view or instruction to generate one. */
export interface RetiredCampMarker256 {retiredMapId:number;tile:number;removedAt:number;markerUntilCore:number}
export function retiredCampMarkerProjection256(root:CampaignState):{retiredCamps?:RetiredCampMarker256[]} {
 if(root.schemaVersion<256)return {};
 const retiredCamps=(root.worldMaps?.retired??[]).flatMap(row=>row.kind==='camp'&&row.tile!==null&&row.markerUntilCore!==undefined&&row.markerUntilCore>root.tick*10?
  [{retiredMapId:row.id,tile:row.tile,removedAt:row.removedAt,markerUntilCore:row.markerUntilCore}]:[]);
 return retiredCamps.length?{retiredCamps}:{};
}
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const data=(v:object,k:PropertyKey)=>{const d=Object.getOwnPropertyDescriptor(v,k);return d&&'value'in d&&d.enumerable?d:undefined;};
/** Exact prospective transport metadata. RAW remains worldMaps.retired; no
 * inactive map/actor/grid is admitted through this presentation field. */
export function validRetiredCampMarkerProjection256(value:object,version:number,tick:number,nextId:number,tileCount:number,liveIds:ReadonlySet<number>,liveTiles:ReadonlySet<number>):boolean {
 const field=Object.getOwnPropertyDescriptor(value,'retiredCamps');if(!field)return !('retiredCamps'in value);
 if(version<256||!('value'in field)||!field.enumerable||!Array.isArray(field.value)||field.value.length>nextId||Reflect.ownKeys(field.value).length!==field.value.length+1||!Number.isSafeInteger(tick*10))return false;
 const ids=new Set<number>(),tiles=new Set<number>();
 for(let index=0;index<field.value.length;index++){
  const entry=data(field.value,String(index));if(!entry)return false;const row=entry.value;
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.getPrototypeOf(row)!==Object.prototype||Reflect.ownKeys(row).length!==4||!Reflect.ownKeys(row).every(k=>typeof k==='string'&&['retiredMapId','tile','removedAt','markerUntilCore'].includes(k)&&!!data(row,k)))return false;
  if(!integer(row.retiredMapId)||ids.has(row.retiredMapId)||liveIds.has(row.retiredMapId)||!integer(row.tile,0,tileCount-1)||tiles.has(row.tile)||liveTiles.has(row.tile)||!integer(row.removedAt,0,tick)||!integer(row.markerUntilCore,tick*10+1)||row.markerUntilCore!==row.removedAt*10+1800000)return false;
  ids.add(row.retiredMapId);tiles.add(row.tile);
 }
 return true;
}
