import {resumedSegmentRemainder} from './caravan-demand-selection-261.ts';
import type {CampaignState} from './world-map-state.ts';
import type {World} from './types.ts';
import type {AwayGroup,GroupMassCapture} from './group-capture.ts';
import {findPlanetRoute,planetQueryBudget,planetEdgeCost,planetCostContext} from './planet-navigation.ts';
import {copiedCaravanStory261,type EncounterMap261,type EncounterGroup261,type RetainedArrival261,type RetainedCaravan261,type CaravanStory261} from './caravan-encounter-state-261.ts';
import {validRetainedArrival261} from './caravan-encounter-save-261.ts';
import {registeredMap} from './world-map-context.ts';
import {temporaryRetainedOwner263} from './world-target-retained-263.ts';
import {worldTargetActions263} from './world-target-access-263.ts';
const f=Math.fround;
/** Capture the action of the actual order; ordinary historical orders retain
 * their existing automatic entry into the live origin map. */
export function captureCurrentArrival261(root:CampaignState,record:EncounterGroup261):RetainedArrival261 {
 const g=record.state;if(!('members'in g)||g.phase!=='travelling')return null;
 const explicit=record.arrival261;
 if(explicit&&explicit.tile===g.destination)return {...explicit.action};
 if(record.encounters261)return null;
 const origin=root.worldMaps?.sites.find(s=>s.id===record.originMapId);
 return origin&&origin.tile===g.destination?{kind:'enter',mapId:origin.id}:null;
}
export function captureRetainedCaravan261(group:AwayGroup,action:RetainedArrival261):RetainedCaravan261 {
 if(group.phase!=='travelling')return {passStory:true,next:null,destination:null};
 const s=group.segment;
 return {passStory:true,next:{tile:s?.to??group.tile,leftFraction:s?f(f(s.remainingCore)/f(s.totalCore)):0,paused:group.paused},
  destination:{tile:group.destination,action:action?{...action}:null}};
}
export type RetainedReformPlan261={kind:'ready';state:AwayGroup;retained:RetainedCaravan261;story:CaravanStory261|undefined;arrival:EncounterGroup261['arrival261']}|{kind:'deferred'};
/** Runs before B0's record signature and motion registration, not after commit.
 * Same mass capture controls new cost and later overload; no distance is paid.
 * No source map, record, inventory, allocator or RNG is written by this function. */
export function prepareRetainedReform261(root:CampaignState,site:EncounterMap261,next:AwayGroup,mass:GroupMassCapture,calendar:World):RetainedReformPlan261 {
 const old=temporaryRetainedOwner263(root,site)?.retained,planet=root.planet;
 if(!old||!planet)throw Error('Actual Battlefield retained owner required');
 const retained:RetainedCaravan261={passStory:false,next:old.next?{...old.next}:null,destination:old.destination?{tile:old.destination.tile,action:old.destination.action?{...old.destination.action}:null}:null};
 const projectedMaps=calendar.campaignMap?.revision===2?calendar.campaignMap.maps:[];
 const story=old.passStory?copiedCaravanStory261(site.story261):undefined;
 let arrival:EncounterGroup261['arrival261'];
 let state:AwayGroup={...next,destination:next.tile,phase:'stationary',route:[next.tile],segment:null,paused:false,stop:{kind:'stationary'}};
 if(root.worldMaps&&registeredMap(root,site.id)!==calendar||!root.worldMaps&&calendar.campaignMap?.revision===2&&calendar.campaignMap.activeMapId!==site.id)throw Error('Actual reform source calendar required');
 const cost=planetCostContext(calendar,mass);
 if(old.next&&old.next.tile!==next.tile){
  const route=findPlanetRoute(planet,next.tile,old.next.tile,cost,planetQueryBudget(planet));
  if(route.kind==='deferred')return {kind:'deferred'};
  if(route.kind==='found'&&route.tiles.length>1){
   const to=route.tiles[1]!,total=planetEdgeCost(planet,next.tile,to,cost);
   if(total!==undefined&&total>0){const totalCore=f(total),remainingCore=resumedSegmentRemainder(totalCore,old.next.leftFraction)!;
    state={...state,destination:old.next.tile,phase:'travelling',route:route.tiles.slice(1),segment:{from:next.tile,to,totalCore,remainingCore},paused:old.next.paused,stop:null};
   }
  }
 }
 if(old.destination&&old.destination.tile!==next.tile){
  const d=old.destination,action=d.action;
  const validAction=validRetainedArrival261(action,{version:root.schemaVersion,atCore:root.tick*10,tileCount:Number.MAX_SAFE_INTEGER,
   factionIds:new Set(root.worldFactions?.factions.map(f=>f.id)),mapIds:new Set(root.worldMaps?.sites.map(s=>s.id)??projectedMaps.map(s=>s.id)),siteIds263:new Set(root.worldSites263?.entries.filter(s=>(s.kind==='item-stash'||s.kind==='peace-talks')&&!s.closed).map(s=>s.id)),settlements:root.worldFactions?.settlements??[]})
   &&(action?.kind!=='enter'||(root.worldMaps?.sites??projectedMaps).some(s=>s.id===action.mapId&&s.tile===d.tile))
   &&(action?.kind!=='trade'||root.worldFactions!.settlements.some(s=>s.id===action.settlementId&&s.tile===d.tile))
   // This is the new reform draft, not yet a registered group. Validate only
   // its retained target here; the real arrival rechecks the actual owners.
   &&(action?.kind!=='peace-talks'||(Number(root.schemaVersion)===293||(Number(root.schemaVersion)===294||Number(root.schemaVersion)===295))&&!!root.worldSites263?.entries.some(s=>s.kind==='peace-talks'&&s.id===action.siteId&&s.tile===d.tile&&!s.closed&&root.tick*10<s.expiresAtCore))
   &&(action?.kind!=='attack-settlement'&&action?.kind!=='visit-site'||worldTargetActions263(root,action,d.tile).ok);
  retained.destination=null;
  // Native StartPath resets pause before checking the action/route, even when
  // that validation fails. Existing engaged fraction remains otherwise intact.
  state={...state,paused:false};
  if(validAction){
   const boundary=state.segment?.to??state.tile,route=findPlanetRoute(planet,boundary,d.tile,cost,planetQueryBudget(planet));
   if(route.kind==='deferred')return {kind:'deferred'};
   if(route.kind==='found'){
    state={...state,destination:d.tile,route:route.tiles,phase:'travelling',stop:null};
    if(action)arrival={tile:d.tile,action:{...action}};
   }
  }
 }
 return {kind:'ready',state,retained,story,arrival};
}
