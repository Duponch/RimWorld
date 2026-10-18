import {validGeographicCreationSize262,validGeographicCreationSeason262,type GeographicCreationOptions262} from '../sim/geographic-creation-options-262';
import {worldGenerationKey,type WorldGenerationSettings} from '../sim/world-generation-settings';
import {isCampaignGeography256} from '../sim/world-geography-owner-256';
import {canPlaceWorldSettlement} from '../sim/world-settlement-placement';
import {validStartingOriginalRequest256,type StartingOriginalRequest256} from '../sim/starting-original-request-256';
import type {WorldCreationCallbacks256,WorldCreationRequest256,WorldCreationPreview256,WorldCreationTicket256,WorldCreationProgress256} from './world-creation-contract';
const copySettings=(s:WorldGenerationSettings)=>({...s,factions:[...s.factions]});
export const copyWorldCreationRequest256=(r:WorldCreationRequest256):WorldCreationRequest256=>({seed:r.seed,settings:copySettings(r.settings),player:{...r.player}});
const samePlayer=(a:WorldCreationRequest256['player'],b:WorldCreationRequest256['player'])=>a.scenario===b.scenario&&a.playerDef===b.playerDef&&a.playerName===b.playerName;
const aborted=()=>new DOMException('La préparation du monde a été annulée.','AbortError');
/** Small owner of this one menu operation. No world, generation, simulation,
 * clock, random stream or global cache; late callbacks cannot publish a draft. */
export function createWorldCreationFlow256(callbacks:WorldCreationCallbacks256){
 let serial=0,controller:AbortController|undefined,preview:WorldCreationPreview256|undefined,ticket:WorldCreationTicket256|undefined;
 function cancel(){serial++;controller?.abort();controller=undefined;preview=undefined;ticket=undefined;}
 return {
  cancel,
  get preview(){return preview;},get ticket(){return ticket;},
  async generate(input:WorldCreationRequest256,onProgress:(p:WorldCreationProgress256)=>void):Promise<WorldCreationPreview256>{
   cancel();const mine=serial,abort=new AbortController();controller=abort;const request=copyWorldCreationRequest256(input),key=worldGenerationKey(request.seed,request.settings);
   try{
    const next=await callbacks.generate(request,{signal:abort.signal,onProgress:p=>{if(mine!==serial||abort.signal.aborted)return;if(typeof p.phase!=='string'||!Number.isSafeInteger(p.completed)||!Number.isSafeInteger(p.total)||p.completed<0||p.total<0||p.completed>p.total)return;onProgress({...p});}});
    if(mine!==serial||abort.signal.aborted)throw aborted();
    if(!Number.isSafeInteger(next.generation)||next.generation<1||next.key!==key||!isCampaignGeography256(next.geography)||next.geography.surface.seedText!==request.seed||worldGenerationKey(next.request.seed,next.request.settings)!==key||!samePlayer(next.request.player,request.player)||worldGenerationKey(next.geography.surface.seedText,{...next.geography.surface.settings,factions:[...next.geography.definition.factions]})!==key)throw Error('Le monde reçu ne correspond pas aux paramètres confirmés.');
    const factions=new Set<number>(),settlements=new Set<number>();for(const f of next.factions){if(!Number.isSafeInteger(f.id)||f.id<1||factions.has(f.id)||typeof f.name!=='string'||typeof f.def!=='string'||typeof f.hidden!=='boolean')throw Error('Résumé des factions invalide.');factions.add(f.id);}
    for(const s of next.settlements){if(!Number.isSafeInteger(s.id)||s.id<1||settlements.has(s.id)||!factions.has(s.factionId)||!Number.isSafeInteger(s.tile)||!next.geography.surface.tiles[s.tile]||typeof s.name!=='string')throw Error('Résumé des implantations invalide.');settlements.add(s.id);}
    preview={...next,request:copyWorldCreationRequest256(request),factions:next.factions.map(f=>({...f})),settlements:next.settlements.map(s=>({...s}))};return preview;
   }finally{if(mine===serial&&!preview)controller=undefined;}
  },
  async confirmSite(tile:number,choices:GeographicCreationOptions262={size:250,season:'auto'}):Promise<WorldCreationTicket256>{
   const before=preview,mine=serial;if(!before)throw Error('Générez un monde avant de choisir le lieu.');
   if(!Number.isSafeInteger(tile)||!canPlaceWorldSettlement(before.geography.surface.tiles,tile,{settlementTiles:new Set(before.settlements.map(s=>s.tile))}))throw Error('Ce lieu de départ est indisponible.');
   if(!validGeographicCreationSize262(choices.size)||!validGeographicCreationSeason262(choices.season))throw Error('Choix de taille ou saison invalide.');
   const request={generation:before.generation,key:before.key,tile,size:choices.size,season:choices.season},next=await callbacks.confirmSite(request);
   if(mine!==serial||preview!==before)throw aborted();
   if(next.generation!==request.generation||next.key!==request.key||next.tile!==tile||next.size!==request.size||next.season!==request.season||typeof next.ticket!=='string'||!next.ticket.length||!samePlayer(next.player,before.request.player))throw Error('Le lieu confirmé ne correspond pas au monde présenté.');
   ticket={...next,player:{...next.player}};return ticket;
  },
  async start(startingParty:StartingOriginalRequest256,onProgress:(progress:WorldCreationProgress256)=>void=()=>{}):Promise<void>{
   const confirmed=ticket,before=preview,mine=serial;if(!confirmed||!before)throw Error('Confirmez le lieu de départ avant de démarrer.');
   // The worker consumes this exact ticket, and rejects a lost cache. There is
   // no seed fallback or second hidden geography generation in this layer.
   if(!validStartingOriginalRequest256(startingParty))throw Error('Les huit personnages confirmés sont requis.');
   const abort=controller;if(!abort||abort.signal.aborted)throw aborted();
   const party:StartingOriginalRequest256={...startingParty,selected:[{...startingParty.selected[0]},{...startingParty.selected[1]},{...startingParty.selected[2]}],roster:startingParty.roster.map(d=>({...d}))};
   await callbacks.start({...confirmed,player:{...confirmed.player}},party,{signal:abort.signal,onProgress:p=>{if(mine===serial&&!abort.signal.aborted)onProgress({...p});}});
   if(mine===serial&&preview===before){ticket=undefined;preview=undefined;controller=undefined;}
  },
 };
}
