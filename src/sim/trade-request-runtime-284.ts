import {isSchema284OrLater} from './schema-compatibility-257.ts';
import {worldSettlementAccess256} from './world-faction-access.ts';
import {prepareTradeRewardCleanup284} from './trade-request-holder-284.ts';
import type {CampaignState} from './world-map-state.ts';
import type {TradeRequest284,TradeRequestCommand284} from './trade-request-state-284.ts';
import type {CommandResult} from './types.ts';

const no=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
const assignable=(v:object,key:string)=>Object.hasOwn(v,key)?Object.getOwnPropertyDescriptor(v,key)?.writable===true:Object.isExtensible(v);
export function canLogTradeRequest284(root:CampaignState):boolean {
 const events=root.worldGroups?.events;
 return !!events&&Object.isExtensible(events)&&Object.getOwnPropertyDescriptor(events,'length')?.writable===true&&Object.keys(events).every(k=>{const d=Object.getOwnPropertyDescriptor(events,k);return d?.writable===true&&d.configurable===true;});
}
export function logTradeRequest284(root:CampaignState,message:string):void {
 const events=root.worldGroups?.events;if(!events)return;
 events.push({tick:root.tick,type:'command',message});if(events.length>80)events.splice(0,events.length-80);
}
/** Called by the actual settlement-defeat commit while its original Site
 * proof exists. A later map removal cannot erase this quest's target history. */
export function noteTradeRequestDestinationLost284(root:CampaignState,settlementId:number,destroyedSiteId:number):void {
 if(!isSchema284OrLater(root.schemaVersion))return;
 const site=root.worldSites263?.entries.find(s=>s.id===destroyedSiteId&&s.kind==='destroyed-settlement'&&s.sourceSettlementId===settlementId);
 if(!site)return;
 for(const request of root.tradeRequests284?.entries??[])if(request.settlementId===settlementId&&request.factionId===site.factionId&&request.tile===site.tile&&!request.destinationLost)
  request.destinationLost={atCore:root.tick*10,destroyedSiteId};
}
/** True SIM continuation only. Loading/admission and every UI read stay pure.
 * The new optional family adopts now, never replays a former selected ticket. */
export function advanceTradeRequests284(root:CampaignState):void {
 if(!isSchema284OrLater(root.schemaVersion)||root.planet?.revision!==3||!root.worldMaps||!root.worldFactions)return;
 const core=root.tick*10;root.tradeRequests284??={revision:1,adoptedAtCore:core,nextId:1,entries:[]};
 for(const request of root.tradeRequests284.entries){
  if(request.status!=='offered'&&request.status!=='accepted')continue;
  const expiry=request.status==='offered'?request.offerExpiresAtCore:request.expiresAtCore!;
  let reason:'offer-expired'|'mission-expired'|'hostile'|undefined;
  if(core>=expiry)reason=request.status==='offered'?'offer-expired':'mission-expired';
  else if(request.status==='accepted'){
   const a=Math.min(request.factionId,root.worldFactions.playerFactionId),b=Math.max(request.factionId,root.worldFactions.playerFactionId);
   if(root.worldFactions.relations.some(r=>r.aId===a&&r.bId===b&&r.kind==='hostile'))reason='hostile';
  }
  if(!reason)continue;
  const cleanup=prepareTradeRewardCleanup284(request,request.options.map(o=>o.id),core,reason);
  if(!cleanup||!canLogTradeRequest284(root)||!['status','closed'].every(k=>assignable(request,k)))throw Error('Actual trade request close recipients are immutable');
  cleanup.commit();request.status=reason==='hostile'?'failed':'expired';request.closed={atCore:core,reason};
  logTradeRequest284(root,reason==='hostile'?`Demande de ${request.settlementName} échouée : la faction est devenue hostile.`:`Demande de ${request.settlementName} expirée.`);
 }
}
export function validTradeRequestCommand284(value:unknown):value is TradeRequestCommand284 {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
 const v=value as Record<string,unknown>,keys=Reflect.ownKeys(v),int=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0;
 if(keys.some(k=>typeof k!=='string'||!Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'))||!int(v.requestId))return false;
 return v.type==='trade-request-answer'?keys.length===3&&int(v.optionId)&&Number(v.optionId)<=3:
  v.type==='trade-request-dismiss'?keys.length===3&&typeof v.dismissed==='boolean':
  v.type==='trade-request-fulfill'?keys.length===5&&int(v.groupId)&&typeof v.confirm==='boolean'&&typeof v.quote==='string'&&v.quote.length>0&&v.quote.length<=262144:false;
}
export function answerTradeRequest284(root:CampaignState,command:Exclude<TradeRequestCommand284,{type:'trade-request-fulfill'}>):CommandResult {
 if(!isSchema284OrLater(root.schemaVersion)||!root.worldFactions||!root.tradeRequests284||!canLogTradeRequest284(root))return no('Cette demande commerciale est absente ou non modifiable.');
 const request=root.tradeRequests284.entries.find(q=>q.id===command.requestId),core=root.tick*10;
 if(!request||request.status!=='offered'||core>=request.offerExpiresAtCore)return no('Cette offre n’est plus disponible.');
 if(command.type==='trade-request-dismiss'){
  if(!assignable(request,'dismissed'))return no('Cette offre n’est pas modifiable.');
  request.dismissed=command.dismissed;return {ok:true};
 }
 const settlement=root.worldFactions.settlements.find(s=>s.id===request.settlementId),access=worldSettlementAccess256(root.worldFactions,request.settlementId);
 if(!settlement||settlement.factionId!==request.factionId||settlement.tile!==request.tile||!access.ok||!access.canTrade)return no('L’établissement destinataire n’est plus visitable.');
 if(!request.options.some(o=>o.id===command.optionId))return no('Choisissez une récompense de cette offre.');
 const expiry=core+request.durationCore;if(!Number.isSafeInteger(expiry))return no('L’échéance dépasse les limites de la campagne.');
 const discarded=request.options.filter(o=>o.id!==command.optionId).map(o=>o.id),cleanup=discarded.length?prepareTradeRewardCleanup284(request,discarded,core,'not-chosen'):undefined;
 if(discarded.length&&!cleanup||!['status','acceptedAtCore','expiresAtCore','selectedOptionId'].every(k=>assignable(request,k)))return no('Le choix ne peut pas être conservé.');
 cleanup?.commit();request.status='accepted';request.acceptedAtCore=core;request.expiresAtCore=expiry;request.selectedOptionId=command.optionId;
 logTradeRequest284(root,`Demande de ${request.settlementName} acceptée : la récompense choisie attend la livraison.`);
 return {ok:true};
}
export function activeTradeRequest284(root:CampaignState,id:number):TradeRequest284|undefined {
 const request=root.tradeRequests284?.entries.find(q=>q.id===id);
 return request?.status==='accepted'&&root.tick*10<request.expiresAtCore!?request:undefined;
}
