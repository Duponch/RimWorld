import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import type {World} from './types.ts';
import type {WorldTargetConstruction263} from './world-target-construction-263.ts';
/** Save admission derives dimensions and kind from the actual registry. The
 * unpublished generator passes its own readonly construction contract. */
export function registeredWorldTargetContext263(w:World):WorldTargetConstruction263|undefined {
 const root=registeredCampaign(w);if(Number(root.schemaVersion)!==263)return undefined;
 const projection=w.campaignMap?.revision===2?w.campaignMap:undefined,map=(root.worldMaps?.sites??projection?.maps??[]).find(m=>m.id===(root.worldMaps?registeredMapId(w):projection?.activeMapId)),t=map?.target263,dimensions=root.worldMaps?.mapSize??projection?.mapSize;if(!map||!t||!dimensions)return undefined;
 return t.kind==='foreign-settlement'?{kind:t.kind,settlementId:t.settlementId,factionId:t.factionId,dimensions}
  :{kind:t.kind,siteId:t.siteId,factionId:root.worldSites263?.entries.find(s=>s.id===t.siteId)?.factionId??null,dimensions};
}
