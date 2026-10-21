/** The faction registry is one campaign owner. Its real off-map Pawns must
 * never be registered once per local view or inferred from globe markers. */
import {validateWorldFactionRegistry256} from './world-faction-save.ts';
import {planetTileCount} from './planet-geography-256.ts';
import {createGiftReceiptProvenance274} from './diplomatic-gift-provenance-274.ts';
import type {CampaignState} from './world-map-state.ts';
export function validateWorldFactionCampaign256(root:CampaignState,occupiedThingIds:ReadonlySet<number>,knownHumanIds:ReadonlySet<number>):string[] {
 const giftProvenance=createGiftReceiptProvenance274(root.worldFactions,root.schemaVersion);
 const validGifts=()=>{
  for(const post of root.worldGroups?.posts??[])if(!giftProvenance(post.state,post.id))return false;
  // Registered campaigns validate every original above. Unregistered legacy
  // owners may expose only this alias; a gift without factions is orphaned.
  return !!root.worldGroups||!('civilianPost'in root)||giftProvenance(root.civilianPost);
 };
 const present=Object.hasOwn(root,'worldFactions');
 if(!present)return !validGifts()?['Invalid diplomatic gift recipient provenance.']:root.planet?.revision===3?['Geographic campaign is missing its actual factions.']:[];
 if(root.schemaVersion<256)return ['Future faction owner in historical campaign.'];
 if(root.planet?.revision!==3||!root.worldMaps||!root.worldGroups)return ['Faction owner requires its actual geographic campaign.'];
 const errors=validateWorldFactionRegistry256(root.worldFactions,root.schemaVersion,{
  present,tick:root.tick,width:root.worldMaps.mapSize.width,height:root.worldMaps.mapSize.height,
  nextId:root.nextId,tileCount:planetTileCount(root.planet),postIds:new Set(root.worldGroups.posts.map(p=>p.id)),occupiedThingIds,knownHumanIds,
 });
 return errors.length?errors:validGifts()?[]:['Invalid diplomatic gift recipient provenance.'];
}
