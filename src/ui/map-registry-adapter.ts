import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {settlementProximityWarning263} from '../sim/world-settlement-proximity-263';
import {settlementProximityText263} from './settlement-proximity-263';
import {worldSiteLabel263} from './world-target-ui-263';
import type {World} from '../sim/types';
import type {CampaignSummary,CampaignMapSummary,CampaignMapPresentation,CampaignGroupSummary} from '../sim/world-map-state';
import type {MapRegistryState,JumpToEntry} from './map-registry-panel';
import type {PlanetOverlay} from './planet-view';
export type CampaignUIState=World|CampaignSummary;
export function campaignUIFacts(value:CampaignUIState):CampaignSummary|CampaignMapPresentation|undefined {
 return 'activeMapId' in value?value:value.campaignMap?.revision===2?value.campaignMap:undefined;
}
export function mapDisplayName(map:Pick<CampaignMapSummary,'id'|'tile'|'kind'>):string {
 const kind=map.kind==='settlement'?(map.id===0?'Foyer':'Colonie'):map.kind==='camp'?'Camp temporaire':map.kind==='battlefield'?'Champ de bataille':map.kind==='foreign-settlement'?'Établissement étranger':map.kind==='quest-site'?'Site temporaire':'Site conservé';
 return map.tile===null?kind:`${kind} · case ${map.tile}`;
}
export function groupDisplayLabel(group:CampaignGroupSummary):string {
 const phases={gathering:'Rassemblement',loading:'Chargement',leaving:'Sortie',travelling:'En voyage',stationary:'À l’arrêt','at-site':'À destination','awaiting-entry':'Entrée en attente',unloading:'Dépôt'};
 return `${group.localMapId===null?'Caravane':'Formation'} ${group.id} · ${phases[group.phase]} · ${group.memberIds.length} personne(s)`;
}
export function readMapRegistryState(value:CampaignUIState):MapRegistryState|undefined {
 const facts=campaignUIFacts(value);if(!facts)return;
 return {tick:value.tick,selectedMapId:facts.activeMapId,maxSettlements:facts.maxSettlements,settlements:facts.maps.filter(map=>map.kind==='settlement').length,maps:facts.maps.map(map=>({
  ...map.campPressure?{campPressure:map.campPressure}:{},id:map.id,tile:map.tile,name:mapDisplayName(map),kind:map.kind,active:map.selected,people:map.pawnCount,createdAt:map.createdAt,
  view:map.actions.view,settle:map.actions.settle,abandon:map.actions.abandon,
  ...(isSchema263OrLater(Number(value.schemaVersion))&&map.tile!==null?{settleWarning263:()=>settlementProximityText263(settlementProximityWarning263(value,map.tile!))}:{}),
  abandonedPeople:map.abandonConsequences.pawns,groundItems:map.abandonConsequences.groundItems,structures:map.abandonConsequences.structures,
 }))};
}
export function readJumpToEntries(value:CampaignUIState):JumpToEntry[] {
 const facts=campaignUIFacts(value);if(!facts)return [];
 const result:JumpToEntry[]=facts.maps.map(map=>({kind:'map',id:map.id,label:mapDisplayName(map),active:map.selected}));
 for(const group of facts.groups)result.push({kind:'group',id:group.id,label:groupDisplayLabel(group),active:facts.activeMapId===null&&facts.selectedGroupId===group.id});
 return result;
}
/** Scalar confirmed object information, never a map-view/entry action. */
export function retiredCampTileInfo256(markers:readonly {tile:number;label:string}[]|undefined,tile:number):string {const marker=markers?.find(m=>m.tile===tile);return marker?` · ${marker.label}. Aucune carte locale. Ce marqueur disparaît 30 jours après le retrait.`:'';}
export function readPlanetObjects(value:CampaignUIState|CampaignMapPresentation):Pick<PlanetOverlay,'settlements'|'maps'|'groups'|'retiredCamps'|'worldSites'>{
 const facts='tick' in value?campaignUIFacts(value):value;if(!facts)return {};
 const registry='worldFactions' in value?value.worldFactions:undefined;
 const sites='worldSites263' in value?value.worldSites263?.entries:undefined,atCore='tick' in value?value.tick*10:0;
 return {...(sites?{worldSites:sites.filter(s=>s.kind==='destroyed-settlement'||!s.closed).map(s=>({siteId:s.id,tile:s.tile,label:worldSiteLabel263(s,atCore),kind:s.kind}))}:{}),...(registry?{settlements:registry.settlements.map(s=>({id:s.id,factionId:s.factionId,tile:s.tile,name:s.name}))}:{}),...(facts.retiredCamps?.length?{retiredCamps:facts.retiredCamps.map(marker=>({retiredMapId:marker.retiredMapId,tile:marker.tile,label:`Camp abandonné · case ${marker.tile}`}))}:{}),maps:facts.maps.flatMap(map=>map.tile===null?[]:[{mapId:map.id,tile:map.tile,label:mapDisplayName(map),kind:map.kind,active:map.selected}]),groups:facts.groups.flatMap(group=>group.tile===null?[]:[{groupId:group.id,tile:group.tile,label:groupDisplayLabel(group),selected:group.id===facts.selectedGroupId}])};
}
