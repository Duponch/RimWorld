import {registeredCampaign,registeredMap,flushRegisteredMap} from './world-map-context.ts';
import {campHasActiveThreat260,campReformThreatReason260} from './camp-reform-threats-260.ts';
import type {World} from './types.ts';
import type {CampaignState} from './world-map-state.ts';
/** Battlefield alone ignores fogged enemies, through its actual map-parent rule. */
export const battlefieldHasActiveThreat261=(w:World)=>campHasActiveThreat260(w,true);
export const battlefieldReformReason261=(w:World)=>campReformThreatReason260(w,true);
/** One actual map-owner pass after physical combat, no offered/load history. */
export function advanceBattlefieldVictory261(root:CampaignState):void {
 if((Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&Number(root.schemaVersion)!==263)))return;
 for(const site of root.worldMaps?.sites??[]){
  const b=site.battlefield261;if(site.kind!=='battlefield'||!b||b.won)continue;
  const map=registeredMap(root,site.id);if(!map||battlefieldHasActiveThreat261(map))continue;
  b.won=true;if(site.campPressure){site.campPressure.notifyAtCore=null;site.campPressure.alert=true;}
  root.worldGroups!.events.push({tick:root.tick,type:'command',message:'La caravane a remporté la bataille. Les sorties et la réforme sont disponibles sous leurs conditions réelles.'});
  if(root.worldGroups!.events.length>80)root.worldGroups!.events.splice(0,root.worldGroups!.events.length-80);flushRegisteredMap(map);
 }
}
