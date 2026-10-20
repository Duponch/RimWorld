import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {plainWorldPawnData256} from './world-pawn-save-256.ts';
import {validRetainedCaravan261,type EncounterValidation261} from './caravan-encounter-save-261.ts';
import {validWorldEntryTarget263,worldTargetAccess263} from './world-target-access-263.ts';
import type {CampaignState} from './world-map-state.ts';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const keys=(v:Record<string,unknown>,req:readonly string[],opt:readonly string[]=[])=>req.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(req.includes(k)||opt.includes(k)));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
/** Narrow envelope readers run only after plain-data admission, before any
 * local context is branded. No migration creates a target or a request. */
export function validMapTargetFields263(s:Record<string,unknown>,c:EncounterValidation261):boolean {
 const present=Object.hasOwn(s,'target263'),target=s.target263,isTarget=s.kind==='foreign-settlement'||s.kind==='quest-site';
 if(!isSchema263OrLater(c.version))return !present&&!isTarget;
 if(!isTarget)return !present;
 if(!present||!plainWorldPawnData256(target)||!obj(target)||target.revision!==1||target.kind!==s.kind||!s.encounters261||!validRetainedCaravan261(target.retained,c))return false;
 return target.kind==='foreign-settlement'?keys(target,['revision','kind','settlementId','factionId','retained'],['destroyedSiteId'])&&int(target.settlementId,1)&&int(target.factionId,1)&&c.factionIds.has(target.factionId)&&(!Object.hasOwn(target,'destroyedSiteId')||int(target.destroyedSiteId,1))
  :keys(target,['revision','kind','siteId','retained'])&&int(target.siteId,1);
}
export function validPendingWorldEntryFields263(r:Record<string,unknown>,c:EncounterValidation261):boolean {
 if(!Object.hasOwn(r,'pendingEntry263'))return true;
 const p=r.pendingEntry263,g=r.state;
 return isSchema263OrLater(c.version)&&plainWorldPawnData256(p)&&obj(p)&&keys(p,['revision','requestedAtCore','target'])&&p.revision===1&&p.requestedAtCore===c.atCore&&validWorldEntryTarget263(p.target)&&!!r.encounters261&&!Object.hasOwn(r,'pending261')&&r.localMapId===null&&obj(g)&&Array.isArray(g.members)&&g.members.length>0&&g.lastPersonalTick===c.atCore/10&&!g.segment&&(g.phase==='at-site'||g.phase==='awaiting-entry')&&g.tile===g.destination;
}
export function validSettlementAdmission263(s:Record<string,unknown>,version:number,tick:number,nextId:number):boolean {
 if(!Object.hasOwn(s,'attack263'))return true;
 const a=s.attack263;
 return isSchema263OrLater(version)&&plainWorldPawnData256(a)&&obj(a)&&keys(a,['revision','mapId','generatedAtCore','inhabitantIds'],['cooldownUntilCore'])&&a.revision===1&&(a.mapId===null||int(a.mapId))&&int(a.generatedAtCore,0,tick*10)&&a.generatedAtCore%10===0&&Array.isArray(a.inhabitantIds)&&a.inhabitantIds.length<=256&&a.inhabitantIds.every(id=>int(id,1,nextId-1))&&new Set(a.inhabitantIds).size===a.inhabitantIds.length&&(!Object.hasOwn(a,'cooldownUntilCore')||int(a.cooldownUntilCore));
}
/** References are checked against actual campaign owners, not a projected
 * fabricated Camp. Stale completed route intents remain serializable; an
 * unresolved generation request must still name its live real target. */
export function validateWorldTargetBindings263(root:CampaignState):string[] {
 if(!isSchema263OrLater(Number(root.schemaVersion)))return [];
 const maps=root.worldMaps?.sites??[],sites=root.worldSites263?.entries??[],settlements=root.worldFactions?.settlements??[];
 for(const map of maps){const t=map.target263;if(!t)continue;
  if(t.kind==='quest-site'){if(!sites.some(s=>s.kind==='item-stash'&&!s.closed&&s.id===t.siteId&&s.mapId===map.id&&s.tile===map.tile))return ['Quest Site map has no actual parent.'];}
  else if(t.destroyedSiteId!==undefined){if(!sites.some(s=>s.kind==='destroyed-settlement'&&s.id===t.destroyedSiteId&&s.sourceSettlementId===t.settlementId&&s.factionId===t.factionId&&s.tile===map.tile&&s.mapId===map.id))return ['Defeated base map has no actual destroyed parent.'];}
  else if(!settlements.some(s=>s.id===t.settlementId&&s.factionId===t.factionId&&s.tile===map.tile&&s.attack263?.mapId===map.id))return ['Foreign base map has no actual settlement parent.'];
 }
 for(const s of settlements)if(s.attack263?.mapId!==null&&s.attack263?.mapId!==undefined&&!maps.some(m=>m.id===s.attack263!.mapId&&m.target263?.kind==='foreign-settlement'&&m.target263.settlementId===s.id))return ['Settlement points to an absent base map.'];
 for(const r of root.worldGroups?.groups??[])if(r.pendingEntry263&&(!('members'in r.state)||!worldTargetAccess263(root,r.pendingEntry263.target,r.state.tile).ok))return ['Pending entry has no actual admissible world target.'];
 return [];
}
