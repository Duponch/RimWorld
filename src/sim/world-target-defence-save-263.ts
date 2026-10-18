import {plainWorldPawnData256} from './world-pawn-save-256.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import type {World} from './types.ts';
import type {WorldTargetDefence263} from './world-target-defence-263.ts';

export type WorldDefenceConstruction263=Readonly<{source:WorldTargetDefence263['source'];factionId:number;bornAtCore:number}>;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const keys=(v:Record<string,unknown>,names:readonly string[])=>Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
/** Construction context comes from the real unpublished target generator.
 * Complete saves use the actual registered map-parent instead. Neither path
 * invents a raid/pending/faction when an old map has no defence owner. */
export function validWorldTargetDefence263(w:World,version:number,construction?:WorldDefenceConstruction263):boolean {
 const present=Object.hasOwn(w,'worldDefence263'),d=w.worldDefence263;
 if(version!==263)return !present;
 if(!present)return true;
 if(!plainWorldPawnData256(d)||!object(d)||!keys(d,['revision','bornAtCore','factionId','memberIds','defendSpot','radius','source'])||d.revision!==1||!int(d.bornAtCore,0,w.tick*10)||Number(d.bornAtCore)%10||!int(d.factionId,1)||!Array.isArray(d.memberIds)||d.memberIds.length<1||d.memberIds.length>256||d.memberIds.some(id=>!int(id,1,w.nextId-1))||new Set(d.memberIds).size!==d.memberIds.length||!object(d.defendSpot)||!keys(d.defendSpot,['x','z'])||!int(d.defendSpot.x,0,w.width-1)||!int(d.defendSpot.z,0,w.height-1)||d.radius!==28||!object(d.source))return false;
 const source=d.source,settled=Object.hasOwn(source,'settledAtCore');
 if(source.kind==='foreign-settlement'?!keys(source,['kind','settlementId',...settled?['settledAtCore']:[]])||!int(source.settlementId,1):!['outpost','turrets'].includes(String(source.kind))||!keys(source,['kind','siteId'])||!int(source.siteId,1))return false;
 const root=registeredCampaign(w),projection=w.campaignMap?.revision===2?w.campaignMap:undefined,parent=(root.worldMaps?.sites??projection?.maps??[]).find(m=>m.id===(root.worldMaps?registeredMapId(w):projection?.activeMapId)),target=parent?.target263;
 if(construction){if(settled)return false;const expected=construction.source,match=expected.kind==='foreign-settlement'?source.kind==='foreign-settlement'&&expected.settlementId===source.settlementId:source.kind!=='foreign-settlement'&&expected.kind===source.kind&&expected.siteId===source.siteId;if(construction.factionId!==d.factionId||construction.bornAtCore!==d.bornAtCore||!match)return false;}
 else if(settled){if(source.kind!=='foreign-settlement'||!int(source.settledAtCore,Number(d.bornAtCore),w.tick*10)||Number(source.settledAtCore)%10||parent?.kind!=='settlement'||parent.target263||source.settledAtCore!==Number(parent.settledAt)*10)return false;}
 else if(!target||(source.kind==='foreign-settlement'?target.kind!=='foreign-settlement'||target.settlementId!==source.settlementId||target.factionId!==d.factionId:target.kind!=='quest-site'||target.siteId!==source.siteId))return false;
 const factions=root.worldFactions??w.worldFactions;
 if(!factions||d.factionId===factions.playerFactionId||!factions.factions.some(f=>f.id===d.factionId))return false;
 return !w.pawns.some(p=>d.memberIds.includes(p.id)&&p.faction==='outlaws'&&!p.prisoner&&(p.worldAffiliation259?.factionId!==d.factionId||p.raid!==undefined||p.visitor!==undefined));
}
