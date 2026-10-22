import {healthRandom} from './health.ts';
import {registeredMap} from './world-map-context.ts';
import {worldSettlementAccess256} from './world-faction-access.ts';
import {planetGeography256} from './planet-geography-256.ts';
import {worldSurfaceApproxDistance} from './world-surface-distances.ts';
import {geographicAverageTileSize256} from './planet-route-256.ts';
import {previewTradeRequestItinerary284} from './group-travel-estimate.ts';
import {TRADE_REQUEST_CONTENT_284} from './trade-request-content-284.ts';
import {captureTradeRequestAvailability284} from './trade-request-accessibility-284.ts';
import {captureTradeRequestWealth284,tradeRequestCountDraw284,tradeRequestQuantity284,tradeRequestRewardBudget284,tradeRequestDuration284} from './trade-request-rules-284.ts';
import {draftTradeRequestRewards284} from './trade-request-rewards-284.ts';
import {roundTradeSilver} from './trade-prices.ts';
import {TRADE_REQUEST_MAX_ENTRIES_284} from './trade-request-holder-284.ts';
import {canLogTradeRequest284} from './trade-request-runtime-284.ts';
import type {CampaignState} from './world-map-state.ts';
import type {TradeRequest284} from './trade-request-state-284.ts';

const no=(reason:string)=>({ok:false as const,reason});
const writable=(v:object,key:string)=>Object.getOwnPropertyDescriptor(v,key)?.writable===true;
/** Natural calendar and declared stimuli use the same producer. No fake
 * destination, stock, people, ingredients or favorable destination retry. */
export function prepareTradeRequestBirth284(root:CampaignState):{ok:false;reason:string}|{ok:true;request:TradeRequest284;current():boolean;commit():void} {
 const registry=root.tradeRequests284,maps=root.worldMaps,factions=root.worldFactions,planet=root.planet,tick=root.tick,nextId=root.nextId,rng=root.rng;
 const homeRow=maps?.sites.find(s=>s.kind==='settlement'&&s.tile!==null),home=homeRow&&registeredMap(root,homeRow.id);
 if(Number(root.schemaVersion)!==284||!registry||!maps||!factions||planet?.revision!==3||!homeRow||homeRow.tile===null||!home||registry.entries.length>=TRADE_REQUEST_MAX_ENTRIES_284||!Number.isSafeInteger(registry.nextId+1))return no('La demande exige une colonie et les registres mondiaux réels.');
 const surface=planetGeography256(planet).surface,average=geographicAverageTileSize256(planet),center=surface.tiles[homeRow.tile]!.center;
 const candidates=factions.settlements.filter(s=>{
  const access=worldSettlementAccess256(factions,s.id),faction=factions.factions.find(f=>f.id===s.factionId),leader=factions.leaders.find(l=>l.factionId===s.factionId);
  return access.ok&&access.canTrade&&faction&&leader&&leader.pawn.state!=='dead'&&!leader.pawn.health?.death
   &&worldSurfaceApproxDistance(center,surface.tiles[s.tile]!.center,average)<32
   &&!registry.entries.some(q=>q.settlementId===s.id&&(q.status==='offered'||q.status==='accepted'));
 });
 if(!candidates.length)return no('Aucun établissement réel disponible à proximité.');
 const random={rng},draw=()=>healthRandom(random),settlement=candidates[Math.floor(draw()*candidates.length)]!,leader=factions.leaders.find(l=>l.factionId===settlement.factionId)!;
 const route=previewTradeRequestItinerary284(home,[homeRow.tile,settlement.tile]);if(!route.ok)return no(route.reason);
 const durationCore=tradeRequestDuration284(route.durationCore,draw());if(durationCore===undefined)return no('Le trajet impose plus de28jours pour cette demande.');
 const wealth=captureTradeRequestWealth284(home),availability=captureTradeRequestAvailability284(root,home),seed=maps.campaignSeed;
 const eligible=TRADE_REQUEST_CONTENT_284.map(def=>({def,quantity:tradeRequestQuantity284(def.baseMarketValue,wealth.value,tradeRequestCountDraw284(seed,tick*10,def.family))}))
  .filter(({def,quantity})=>{const a=availability.get(def.family);return a?.makeable&&a.potential>=quantity;});
 if(!eligible.length)return no('Aucun produit demandable dont le potentiel actuel suffise.');
 const chosen=eligible[Math.floor(draw()*eligible.length)]!,access=worldSettlementAccess256(factions,settlement.id);if(!access.ok)return no(access.reason);
 const budget=tradeRequestRewardBudget284(chosen.def.baseMarketValue,chosen.quantity,wealth.value,draw()),id=registry.nextId;
 const rewards=draftTradeRequestRewards284({requestId:id,family:chosen.def.family,budget,goodwill:access.goodwill,allowGoodwill:true,nextId,tick,rng:random.rng});if(!rewards)return no('Aucune récompense originale représentable.');
 random.rng=rewards.rng;
 const request:TradeRequest284={id,homeMapId:homeRow.id,settlementId:settlement.id,factionId:settlement.factionId,giverId:leader.pawn.id,tile:settlement.tile,settlementName:settlement.name,
  offeredAtCore:tick*10,offerExpiresAtCore:tick*10+roundTradeSilver((4+4*draw())*60000),durationCore,
  family:chosen.def.family,quantity:chosen.quantity,baseMarketValue:chosen.def.baseMarketValue,wealth,rewardBudget:budget,
  options:rewards.options,dismissed:false,status:'offered',cleanup:[]};
 const entries=registry.entries,entryRefs=entries.slice(),nextRequestId=registry.nextId,source=()=>JSON.stringify([home.pawns,home.piles,home.packed,home.structures,home.resources,home.tiles,home.research,factions,maps.sites.map(s=>[s.id,s.tile,s.kind,s.map]),root.worldGroups]);
 const before=source(),candidate=JSON.stringify(request);let used=false;
 const current=()=>!used&&root.schemaVersion===284&&root.tick===tick&&root.nextId===nextId&&root.rng===rng&&root.tradeRequests284===registry&&root.worldMaps===maps&&root.worldFactions===factions&&root.planet===planet&&registry.nextId===nextRequestId&&registry.entries===entries&&entries.length===entryRefs.length&&entries.every((q,i)=>q===entryRefs[i])&&registeredMap(root,homeRow.id)===home&&source()===before&&JSON.stringify(request)===candidate
  &&canLogTradeRequest284(root)&&writable(root,'nextId')&&writable(root,'rng')&&writable(registry,'nextId')&&writable(entries,'length')&&Object.isExtensible(entries);
 if(!current())return no('Les destinataires de cette offre ne sont pas modifiables.');
 return {ok:true,request,current,commit(){if(!current())throw Error('Trade request birth changed before commit');used=true;entries.push(request);registry.nextId++;root.nextId=rewards.nextId;root.rng=random.rng;}};
}
