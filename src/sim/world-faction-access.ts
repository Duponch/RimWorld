import {WORLD_FACTION_DEFINITIONS_256} from './world-faction-catalog.ts';
import type {WorldFactionRegistry256,WorldFactionSettlement256} from './world-faction-state.ts';
import {draftCommercialPostStock,type CommercialPostStockHeader} from './commercial-post-stock.ts';
import type {CivilianPost} from './commercial-state.ts';
import type {GroupState} from './group-state.ts';
export interface WorldSettlementPost256 {id:number;state:CivilianPost}
export type WorldSettlementAccess256={ok:false;reason:string}|{ok:true;settlement:WorldFactionSettlement256;goodwill:number;canTrade:boolean};
/** Pure inspection/admission. Unknown relations never silently become neutral. */
export function worldSettlementAccess256(registry:WorldFactionRegistry256,settlementId:number,viewerFactionId=registry.playerFactionId):WorldSettlementAccess256 {
 const settlement=registry.settlements.find(s=>s.id===settlementId),viewer=registry.factions.find(f=>f.id===viewerFactionId),owner=settlement&&registry.factions.find(f=>f.id===settlement.factionId);
 if(!settlement||!viewer||!owner||owner.hidden)return {ok:false,reason:'Établissement ou faction absent.'};
 if(owner.id===viewer.id)return {ok:true,settlement,goodwill:100,canTrade:false};
 const a=Math.min(viewer.id,owner.id),b=Math.max(viewer.id,owner.id),relation=registry.relations.find(r=>r.aId===a&&r.bId===b);
 if(!relation)return {ok:false,reason:'Relation de faction inconnue.'};
 return {ok:true,settlement,goodwill:relation.goodwill,canTrade:relation.kind!=='hostile'&&WORLD_FACTION_DEFINITIONS_256[owner.def].humanlike};
}
/** Read-only rows for a real UI; no scene search, active map or renderer write. */
export function worldFactionRows256(registry:WorldFactionRegistry256){return registry.factions.filter(f=>!f.hidden).map(f=>({id:f.id,def:f.def,name:f.name,
 leader:registry.leaders.find(l=>l.factionId===f.id)?.pawn,
 settlements:registry.settlements.filter(s=>s.factionId===f.id)}));}
/** Call only from the authoritative actual-arrival command boundary. Returns
 * a draft for the existing global post registry, never a second physical owner. */
export function draftWorldSettlementPost256(registry:WorldFactionRegistry256,settlementId:number,group:GroupState,posts:readonly WorldSettlementPost256[],header:CommercialPostStockHeader,nextPostId:number):
 {registry:WorldFactionRegistry256;post:WorldSettlementPost256;nextPostId:number;nextThingId:number}|undefined {
 const access=worldSettlementAccess256(registry,settlementId);if(!access.ok||!access.canTrade||!('members'in group)||group.phase!=='at-site'||group.tile!==access.settlement.tile||group.lastPersonalTick!==header.tick)return;
 const binding=access.settlement.postId,existing=binding===null?undefined:posts.find(p=>p.id===binding);if(binding!==null&&!existing)return;
 if(binding===null&&(!Number.isSafeInteger(nextPostId)||nextPostId<1||!Number.isSafeInteger(nextPostId+1)||posts.some(p=>p.id===nextPostId)))return;
 const draft=draftCommercialPostStock(header,existing?.state);if(!draft)return;
 const postId=binding??nextPostId,post={id:postId,state:draft.post};
 return {registry:binding===null?{...registry,settlements:registry.settlements.map(s=>s===access.settlement?{...s,postId}:s)}:registry,
  post,nextPostId:binding===null?nextPostId+1:nextPostId,nextThingId:draft.nextId};
}
/** Resolve on both quote and confirmation. It never substitutes canonicalPostId
 * or an unrelated stock when a target has not been physically visited. */
export function worldSettlementTradeTarget256(registry:WorldFactionRegistry256,settlementId:number,group:GroupState,posts:readonly WorldSettlementPost256[],tick:number):
 {settlementId:number;factionId:number;siteTile:number;postId:number;post:CivilianPost}|undefined {
 const access=worldSettlementAccess256(registry,settlementId);if(!access.ok||!access.canTrade||!('members'in group)||group.phase!=='at-site'||group.tile!==access.settlement.tile||group.lastPersonalTick!==tick||access.settlement.postId===null)return;
 const post=posts.find(p=>p.id===access.settlement.postId);return post?{settlementId:access.settlement.id,factionId:access.settlement.factionId,siteTile:access.settlement.tile,postId:post.id,post:post.state}:undefined;
}
/** Actual owned person references; integration adds these to the campaign human
 * registry/Thing census once, never to a local map pawn array. */
export const worldFactionPersonOwners256=(registry:WorldFactionRegistry256)=>registry.leaders.map(owner=>({kind:'faction-leader' as const,factionId:owner.factionId,clock:owner.clock,pawn:owner.pawn,items:owner.items,packed:owner.packed}));
