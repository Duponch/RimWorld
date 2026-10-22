import {isSchema274OrLater} from './schema-compatibility-257.ts';
import {noteTradeRequestDestinationLost284} from './trade-request-runtime-284.ts';
import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {plainWorldPawnData256} from './world-pawn-save-256.ts';
import {activeThreat} from './affiliation.ts';
import {registeredMap,registeredMapId} from './world-map-context.ts';
import {WORLD_FACTION_DEFINITIONS_256,worldRelationKind256} from './world-faction-catalog.ts';
import {worldRelationAfterChange274} from './world-diplomacy-274.ts';
import type {CampaignState,WorldMapRecord} from './world-map-state.ts';
const writable=(o:object,k:string)=>{const d=Object.getOwnPropertyDescriptor(o,k);return d?Object.hasOwn(d,'value')&&d.writable===true:!(k in o)&&Object.isExtensible(o);};
/** Site/Settlement MapRemoved is part of the existing owner transaction,
 * including actual WorldPawns transfer, beds/areas, lost goods and memories.
 * No timeout, defeat or inhabitant reset is offered merely by load. */
export function prepareWorldTargetMapRemoval263(root:CampaignState,map:WorldMapRecord):{current():boolean;commit():void}|null {
 if(!isSchema263OrLater(Number(root.schemaVersion))||!map.target263)return null;
 const registry=root.worldSites263,factions=root.worldFactions,target=map.target263,core=root.tick*10,settlement=target.kind==='foreign-settlement'?factions?.settlements.find(s=>s.id===target.settlementId):undefined,site=target.kind==='quest-site'?registry?.entries.find(s=>s.id===target.siteId):target.destroyedSiteId!==undefined?registry?.entries.find(s=>s.id===target.destroyedSiteId):undefined;
 if(!registry||!factions||!Number.isSafeInteger(core+60000)||(settlement?!settlement.attack263||settlement.attack263.mapId!==map.id:!site||site.mapId!==map.id))throw Error('Actual263 removed map parent unavailable');
 const entries=registry.entries,source=settlement??site!,before=JSON.stringify(source),attack=settlement?.attack263;
 const current=()=>plainWorldPawnData256(source)&&root.worldSites263===registry&&root.worldFactions===factions&&registry.entries===entries&&map.target263===target&&JSON.stringify(source)===before&&(settlement?factions.settlements.includes(settlement)&&settlement.attack263===attack&&writable(settlement,'attack263'):entries.includes(site!))&&writable(registry,'entries')&&(!site||site.kind!=='item-stash'||['mapId','closed','items'].every(k=>writable(site,k)));
 if(!current())throw Error('Actual263 map parent is immutable');
 return {current,commit(){
  // The enclosing synchronous transaction already admitted current() before
  // moving any original. This tail cannot refuse after WorldPawns publication.
  if(settlement){const retained=new Set((root.worldPawns?.owners??[]).filter(r=>r.kind==='human'&&r.factionId===settlement.factionId).map(r=>r.actor.id));settlement.attack263={...attack!,mapId:null,cooldownUntilCore:core+60000,inhabitantIds:attack!.inhabitantIds.filter(id=>retained.has(id))};}
  else if(site?.kind==='item-stash'){site.mapId=null;site.items=[];site.closed={atCore:core,reason:'map-removed',lost:[]};}
  else registry.entries=entries.filter(s=>s!==site);
 }};
}
/** A foreign base is defeated only when its actual faction has no active
 * humanlike threat. Fleeing players do not set a win bit or kill anybody.
 * The same existing map receives the real DestroyedSettlement parent. */
export function advanceForeignSettlementDefeat263(root:CampaignState):void {
 if(!isSchema263OrLater(Number(root.schemaVersion))||!root.worldMaps||!root.worldFactions||!root.worldSites263)return;
 const factions=root.worldFactions,registry=root.worldSites263,core=root.tick*10;
 for(const record of root.worldMaps.sites){const t=record.target263;if(record.kind!=='foreign-settlement'||t?.kind!=='foreign-settlement'||t.destroyedSiteId!==undefined)continue;
  const settlement=factions.settlements.find(s=>s.id===t.settlementId),map=registeredMap(root,record.id);if(!settlement||!map||registeredMapId(map)!==record.id)continue;
  if(map.pawns.some(p=>p.worldAffiliation259?.factionId===t.factionId&&!p.prisoner&&activeThreat(p)))continue;
  if(!Number.isSafeInteger(registry.nextId+1))throw Error('World Site identity exhausted');
  const id=registry.nextId++;registry.entries.push({kind:'destroyed-settlement',id,tile:record.tile!,factionId:t.factionId,createdAtCore:core,mapId:record.id,sourceSettlementId:settlement.id});t.destroyedSiteId=id;
  noteTradeRequestDestinationLost284(root,settlement.id,id);
  factions.settlements=factions.settlements.filter(s=>s!==settlement);
  const faction=factions.factions.find(f=>f.id===t.factionId)!;if(!factions.settlements.some(s=>s.factionId===t.factionId))faction.lifecycle259={revision:1,defeated:true,temporary:faction.lifecycle259?.temporary??false};
  for(const other of factions.factions){if(other.hidden||other.id===factions.playerFactionId||other.id===faction.id)continue;
   const hostile=factions.relations.find(r=>r.aId===Math.min(other.id,faction.id)&&r.bId===Math.max(other.id,faction.id));if(hostile?.kind!=='hostile')continue;
   const player=factions.relations.find(r=>r.aId===Math.min(other.id,factions.playerFactionId)&&r.bId===Math.max(other.id,factions.playerFactionId));if(!player||WORLD_FACTION_DEFINITIONS_256[other.def].permanentEnemy)continue;player.goodwill=Math.min(100,player.goodwill+20);player.kind=isSchema274OrLater(Number(root.schemaVersion))?worldRelationAfterChange274(player.kind,player.goodwill):worldRelationKind256(player.goodwill);
  }
  root.worldGroups!.events.push({tick:root.tick,type:'command',message:'Les défenseurs de l’établissement étranger sont vaincus ; sa carte devient un établissement détruit.'});if(root.worldGroups!.events.length>80)root.worldGroups!.events.splice(0,root.worldGroups!.events.length-80);
 }
}
