import {registeredCampaign,withWorldGroup} from './world-map-context.ts';
import {validTradeRequestCommand284,answerTradeRequest284,logTradeRequest284,canLogTradeRequest284} from './trade-request-runtime-284.ts';
import {prepareTradeRequestFulfill284} from './trade-request-fulfill-284.ts';
import type {CommandResult,World} from './types.ts';

/** Campaign command is handled before local task reconciliation. It works
 * with another map selected or no remaining home map, using the real group. */
export function applyTradeRequestCommand284(w:World,value:unknown):CommandResult {
 if(!validTradeRequestCommand284(value))return {ok:false,code:'invalid-command',reason:'Commande de demande commerciale invalide.'};
 const root=registeredCampaign(w);
 if(Number(root.schemaVersion)!==284||!root.worldMaps||!root.worldGroups||!canLogTradeRequest284(root))return {ok:false,code:'invalid-command',reason:'Le registre de campagne est indisponible.'};
 if(value.type!=='trade-request-fulfill')return answerTradeRequest284(root,value);
 if(!value.confirm)return {ok:false,code:'invalid-command',reason:'Confirmez la remise des marchandises.'};
 return withWorldGroup(root,value.groupId,view=>{
  const plan=prepareTradeRequestFulfill284(view,value.requestId,value.groupId,value.quote);if(!plan.ok)return {ok:false as const,code:'invalid-command' as const,reason:plan.reason};
  if(!plan.current())return {ok:false as const,code:'invalid-command' as const,reason:'La demande ou la caravane a changé. Vérifiez la remise.'};
  plan.commit();const request=root.tradeRequests284!.entries.find(q=>q.id===value.requestId)!;
  logTradeRequest284(root,`Demande de ${request.settlementName} remplie : les marchandises sont remises et la récompense rejoint cette caravane.`);
  return {ok:true as const};
 })??{ok:false,code:'invalid-command',reason:'La véritable caravane est absente.'};
}
