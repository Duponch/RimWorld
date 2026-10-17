/** The faction registry is one campaign owner. Its real off-map Pawns must
 * never be registered once per local view or inferred from globe markers. */
import {validateWorldFactionRegistry256} from './world-faction-save.ts';
import {planetTileCount} from './planet-geography-256.ts';
import type {CampaignState} from './world-map-state.ts';
export function validateWorldFactionCampaign256(root:CampaignState,occupiedThingIds:ReadonlySet<number>,knownHumanIds:ReadonlySet<number>):string[] {
 const present=Object.hasOwn(root,'worldFactions');
 if(!present)return root.planet?.revision===3?['Geographic campaign is missing its actual factions.']:[];
 if(root.schemaVersion<256)return ['Future faction owner in historical campaign.'];
 if(root.planet?.revision!==3||!root.worldMaps||!root.worldGroups)return ['Faction owner requires its actual geographic campaign.'];
 return validateWorldFactionRegistry256(root.worldFactions,root.schemaVersion,{
  present,tick:root.tick,width:root.worldMaps.mapSize.width,height:root.worldMaps.mapSize.height,
  nextId:root.nextId,tileCount:planetTileCount(root.planet),postIds:new Set(root.worldGroups.posts.map(p=>p.id)),occupiedThingIds,knownHumanIds,
 });
}
