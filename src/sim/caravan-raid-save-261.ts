import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {validKidnapLord261} from './caravan-kidnap-lord-save-261.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import type {World} from './types.ts';
import type {CaravanRaidProvenance261} from './raid-state.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Reflect.ownKeys(v).length===allowed.length&&allowed.every(k=>Object.hasOwn(v,k));
export function validCaravanRaidProvenance261(value:unknown,w:World,startedAt:number,members?:readonly number[],atTick=w.tick):value is CaravanRaidProvenance261 {
 if((Number(w.schemaVersion)!==261&&(Number(w.schemaVersion)!==262&&!isSchema263OrLater(Number(w.schemaVersion))))||!int(startedAt,0,atTick)||!object(value)||value.revision!==1||!['assault','defend-caravan','pressure'].includes(String(value.kind))||!keys(value,['revision','kind',value.kind==='pressure'?'sourceMapId':'sourceGroupId','bornAtCore','factionId',...value.kind==='defend-caravan'?['traderId','guardIds','defendSpot']:[],...value.kind==='assault'&&Object.hasOwn(value,'kidnapLord261')?['kidnapLord261']:[]])||(value.kind==='pressure'?!int(value.sourceMapId):!int(value.sourceGroupId,1,(w.planet?.nextGroupId??1)-1))||value.bornAtCore!==startedAt*10||!int(value.factionId,1)||!w.worldFactions?.factions.some(f=>f.id===value.factionId&&f.id!==w.worldFactions!.playerFactionId))return false;
 if('kidnapLord261'in value&&(!Object.hasOwn(value,'kidnapLord261')||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,'kidnapLord261')!,'value')||!Object.getOwnPropertyDescriptor(value,'kidnapLord261')!.enumerable||!validKidnapLord261(value.kidnapLord261,w,startedAt,members,atTick)))return false;
 if(value.kind==='defend-caravan'){
  const guards=value.guardIds,spot=value.defendSpot;
  if(!int(value.traderId,1,w.nextId-1)||!Array.isArray(guards)||guards.length>w.nextId-1||new Set(guards).size!==guards.length||guards.some(id=>!int(id,1,w.nextId-1)||id===value.traderId)||members&&(!members.includes(value.traderId)||guards.some(id=>!members.includes(id)))||!object(spot)||!keys(spot,['x','z'])||!int(spot.x,0,w.width-1)||!int(spot.z,0,w.height-1))return false;
 }
 const root=registeredCampaign(w),mapId=registeredMapId(w),site=root.worldMaps?.sites.find(s=>s.id===mapId),projection=w.campaignMap?.revision===2?w.campaignMap.maps.find(s=>w.campaignMap?.revision===2&&s.id===w.campaignMap.activeMapId):undefined;
 const actual=site??projection,battlefield=actual?.battlefield261;
 if(value.kind==='assault'&&actual?.kind==='battlefield'&&battlefield?.kind==='peace-talks'){
  const offer=root.worldSites263?.entries.find(s=>s.kind==='peace-talks'&&s.id===battlefield.peaceTalksSiteId293);
  if((Number(w.schemaVersion)!==293&&(Number(w.schemaVersion)!==294&&(Number(w.schemaVersion)!==295&&(Number(w.schemaVersion)!==296&&!isCorePhysicalSchema297(Number(w.schemaVersion))))))||battlefield.factionId!==value.factionId||offer?.kind!=='peace-talks'||offer.tile!==actual.tile||offer.factionId!==value.factionId||offer.closed?.reason!=='resolved')return false;
  const result=offer.closed.result,attack=result.attack;
  return result.outcome==='disaster'&&result.groupId===value.sourceGroupId&&attack?.phase==='entered'&&attack.mapId===actual.id&&attack.atCore===value.bornAtCore
   &&(!members||members.length===attack.enemyIds.length&&members.every((id,i)=>id===attack.enemyIds[i]));
 }
 return site?site.kind==='battlefield'&&(value.kind==='pressure'?site.id===value.sourceMapId&&site.battlefield261?.factionId===value.factionId:site.battlefield261?.kind===(value.kind==='assault'?'ambush':'attacked-caravan')):projection?.kind==='battlefield'&&(value.kind!=='pressure'||projection.id===value.sourceMapId);
}
