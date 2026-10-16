import type {World} from '../sim/types';
import type {CampaignSummary,CampaignMapSummary,CampaignMapPresentation,CampaignGroupSummary} from '../sim/world-map-state';
import type {MapRegistryState,JumpToEntry} from './map-registry-panel';
export type CampaignUIState=World|CampaignSummary;
export function campaignUIFacts(value:CampaignUIState):CampaignSummary|CampaignMapPresentation|undefined {
 return 'activeMapId' in value?value:value.campaignMap?.revision===2?value.campaignMap:undefined;
}
export function mapDisplayName(map:Pick<CampaignMapSummary,'id'|'tile'|'kind'>):string {
 const kind=map.kind==='settlement'?(map.id===0?'Foyer':'Colonie'):map.kind==='camp'?'Camp temporaire':'Site conservé';
 return map.tile===null?kind:`${kind} · case ${map.tile}`;
}
export function groupDisplayLabel(group:CampaignGroupSummary):string {
 const phases={gathering:'Rassemblement',loading:'Chargement',leaving:'Sortie',travelling:'En voyage','at-site':'À destination','awaiting-entry':'Entrée en attente',unloading:'Dépôt'};
 return `${group.localMapId===null?'Caravane':'Formation'} ${group.id} · ${phases[group.phase]} · ${group.memberIds.length} personne(s)`;
}
export function readMapRegistryState(value:CampaignUIState):MapRegistryState|undefined {
 const facts=campaignUIFacts(value);if(!facts)return;
 return {tick:value.tick,selectedMapId:facts.activeMapId,maxSettlements:facts.maxSettlements,settlements:facts.maps.filter(map=>map.kind==='settlement').length,maps:facts.maps.map(map=>({
  id:map.id,tile:map.tile,name:mapDisplayName(map),kind:map.kind,active:map.selected,people:map.pawnCount,createdAt:map.createdAt,
  view:map.actions.view,settle:map.actions.settle,abandon:map.actions.abandon,
  abandonedPeople:map.abandonConsequences.pawns,groundItems:map.abandonConsequences.groundItems,structures:map.abandonConsequences.structures,
 }))};
}
export function readJumpToEntries(value:CampaignUIState):JumpToEntry[] {
 const facts=campaignUIFacts(value);if(!facts)return [];
 const result:JumpToEntry[]=facts.maps.map(map=>({kind:'map',id:map.id,label:mapDisplayName(map),active:map.selected}));
 for(const group of facts.groups)result.push({kind:'group',id:group.id,label:groupDisplayLabel(group),active:facts.activeMapId===null&&facts.selectedGroupId===group.id});
 return result;
}
export function readPlanetObjects(value:CampaignUIState|CampaignMapPresentation){
 const facts='tick' in value?campaignUIFacts(value):value;if(!facts)return {};
 return {maps:facts.maps.flatMap(map=>map.tile===null?[]:[{mapId:map.id,tile:map.tile,label:mapDisplayName(map),kind:map.kind,active:map.selected}]),groups:facts.groups.flatMap(group=>group.tile===null?[]:[{groupId:group.id,tile:group.tile,label:groupDisplayLabel(group),selected:group.id===facts.selectedGroupId}])};
}
