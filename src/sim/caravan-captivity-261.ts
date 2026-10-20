import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import type {World,Pawn} from './types.ts';
import type {AwayGroup} from './group-capture.ts';
import type {CampaignState} from './world-map-state.ts';
import type {CaptiveWorldPawn261} from './caravan-encounter-state-261.ts';
import {registeredCampaign} from './world-map-context.ts';
import {worldPawnActiveBoundary256} from './world-pawn-life-256.ts';
import {validWorldAffiliationForeignKeys259,clearActualGuest259} from './world-affiliation-259.ts';
import {nativeWorldPawnOrderCurrent256,commitNativeWorldPawnOrder256} from './world-pawn-native-order-256.ts';
import {passNativeWorldPawnOrder256} from './native-world-pawn-order-256.ts';
import {cancelWorldPawnGC256} from './world-pawn-gc-256.ts';
import {unclaimDetachedActorBed256} from './actor-map-bed-256.ts';
import {caravanMtbEvent261} from './caravan-incident-calculation-261.ts';
import {WORLD_FACTION_DEFINITIONS_256} from './world-faction-catalog.ts';
import type {WorldPawnsState256} from './world-pawn-state-256.ts';
import type {WorldPawnOwner256} from './world-pawn-state-256.ts';
import type {WildAnimal} from './wildlife-state.ts';

export interface PreparedCaravanCession261 {rows:WorldPawnOwner256[];state:WorldPawnsState256;nativeAfter:WorldPawnsState256['nativeOrder'];current():boolean;commit():void}
export type PreparedCaptivity261=({ok:true;row:CaptiveWorldPawn261}&PreparedCaravanCession261)|{ok:false;reason:string};
/** A caravan Pawn was already in native WorldPawns. Its existing TRUE exit date
 * survives the ownership transfer; no PassedToWorld/auto-tend/faction reroll is
 * replayed. PreKidnapped clears guest status and bed ownership at this real act. */
export function prepareCaravanCaptivity261(w:World,g:AwayGroup,p:Pawn,factionId:number):PreparedCaptivity261 {
 const root=registeredCampaign(w),state=root.worldPawns,factions=root.worldFactions;
 if((Number(w.schemaVersion)!==261&&(Number(w.schemaVersion)!==262&&!isSchema263OrLater(Number(w.schemaVersion))))||!state||!factions||!g.members.includes(p)||!validWorldAffiliationForeignKeys259(p,factions)||!p.worldAffiliation259||p.worldAffiliation259.factionId===factionId||!factions.factions.some(f=>f.id===factionId&&f.id!==factions.playerFactionId)||state.owners.some(r=>r.actor===p||r.actor.id===p.id)||!nativeWorldPawnOrderCurrent256(state,state.nativeOrder))return {ok:false,reason:'La captivité ne possède pas les autorités réelles.'};
 const origin=g.reorganization?.memberOrigins.find(o=>o.pawnId===p.id);
 if(!origin||!Number.isSafeInteger(origin.enteredAtAbsCore))return {ok:false,reason:'La vraie date d’entrée mondiale du membre est absente.'};
 // Current supported away dossiers have no live map work to clean. A missing
 // reset notifier is refused before a payment, not cleared to make it fit.
 if(p.mental?.crisis||p.need||p.melee||p.shooting||p.trade||p.interruptedCargo||p.burning||p.path.length||p.motion)return {ok:false,reason:'Le départ de ce dossier personnel doit être résolu avant la cession.'};
 const preview=structuredClone(p);clearActualGuest259(preview);unclaimDetachedActorBed256(preview);
 const row:CaptiveWorldPawn261={kind:'human',actor:preview,factionId:preview.worldAffiliation259!.factionId,
  originMapId:origin.originMapId,context:origin.context,clockCore:root.tick*10,enteredAtAbsCore:origin.enteredAtAbsCore!,entryKind259:'caravan-exit',mode:'active',items:[],packed:[],captivity261:{factionId,atCore:root.tick*10}};
 const boundary=worldPawnActiveBoundary256(row,root.schemaVersion,root.tick*10);if(boundary)return {ok:false,reason:boundary};
 const actorBefore=JSON.stringify(p),tick=root.tick,membership=state.owners.slice(),nativeBefore=state.nativeOrder;
 let nativeAfter=nativeBefore;if(nativeAfter)nativeAfter=passNativeWorldPawnOrder256(nativeAfter,p.id,false);
 let used=false;
 const current=()=>!used&&root.tick===tick&&root.worldPawns===state&&root.worldFactions===factions&&g.members.includes(p)&&JSON.stringify(p)===actorBefore&&state.owners.length===membership.length&&state.owners.every((r,i)=>r===membership[i])&&nativeWorldPawnOrderCurrent256(state,nativeBefore);
 return {ok:true,row,rows:[row],state,nativeAfter,current,commit(){
  if(!current())throw Error('Stale real captivity transfer');used=true;
  clearActualGuest259(p);unclaimDetachedActorBed256(p);delete p.allowedAreaId;p.path=[];p.planCooldown=0;p.moveCooldown=0;
  row.actor=p;cancelWorldPawnGC256(state);state.owners.push(row);commitNativeWorldPawnOrder256(state,nativeBefore,nativeAfter);
 }};
}
/** Already-admitted CaravanMember animals become actual Free WorldPawns after
 * being removed from that holder. There is no new PassToWorld, faction draw,
 * date rewrite, auto-tend or invented clinical suspension at this boundary. */
export function prepareCaravanAnimalCession261(root:CampaignState,g:AwayGroup,animals:readonly WildAnimal[]):({ok:true}&PreparedCaravanCession261)|{ok:false;reason:string} {
 const state=root.worldPawns,factions=root.worldFactions;
 if((Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&!isSchema263OrLater(Number(root.schemaVersion))))||!state||!factions||!animals.length||!g.animalOwners||g.lastPersonalTick!==root.tick||!nativeWorldPawnOrderCurrent256(state,state.nativeOrder))return {ok:false,reason:'Les propriétaires animaux mondiaux ne sont pas disponibles.'};
 const tick=root.tick,before=state.nativeOrder,membership=state.owners.slice(),snapshots=animals.map(a=>JSON.stringify(a)),rows:WorldPawnOwner256[]=[];
 let after=before;
 for(const actor of animals){
  const origin=g.animalOwners.origins.find(o=>o.pawnId===actor.id);
  if(!g.animalOwners.members.includes(actor)||!origin||!Number.isSafeInteger(origin.enteredAtAbsCore)||state.owners.some(r=>r.actor===actor||r.actor.id===actor.id)||actor.state==='dead'||actor.health?.death)return {ok:false,reason:'Un animal cédé n’a plus sa vraie provenance de caravane.'};
  const row:WorldPawnOwner256={kind:'animal',actor,factionId:actor.domestic?factions.playerFactionId:null,originMapId:origin.originMapId,context:origin.context,clockCore:tick*10,enteredAtAbsCore:origin.enteredAtAbsCore!,entryKind259:'caravan-exit',mode:'active',free:true,items:[],packed:[]};
  const boundary=worldPawnActiveBoundary256(row,root.schemaVersion,tick*10);if(boundary)return {ok:false,reason:boundary};rows.push(row);if(after)after=passNativeWorldPawnOrder256(after,actor.id,false);
 }
 let used=false;
 const current=()=>!used&&root.tick===tick&&root.worldPawns===state&&root.worldFactions===factions&&state.owners.length===membership.length&&state.owners.every((r,i)=>r===membership[i])&&animals.every((a,i)=>g.animalOwners?.members.includes(a)&&JSON.stringify(a)===snapshots[i])&&nativeWorldPawnOrderCurrent256(state,before);
 return {ok:true,rows,state,nativeAfter:after,current,commit(){if(!current())throw Error('Stale actual animal cession');used=true;cancelWorldPawnGC256(state);state.owners.push(...rows);commitNativeWorldPawnOrder256(state,before,after);}};
}
/** Call once after the real WorldPawns personal pass. Only the faction tracker
 * operates here; age, health, tending and needs remain their existing owners.
 * Every15051Core boundary inside this confirmed ten-Core interval is visited. */
export function advanceCaravanCaptivity261(root:CampaignState):void {
 if((Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&!isSchema263OrLater(Number(root.schemaVersion))))||root.tick<1||!root.worldPawns||!root.worldFactions)return;
 const rows=root.worldPawns.owners as CaptiveWorldPawn261[],factions=root.worldFactions;
 for(const row of rows)if(row.destroyed===true)delete row.captivity261;
 const first=(root.tick-1)*10+1,last=root.tick*10;
 if(Math.floor((first-1)/15051)===Math.floor(last/15051))return;
 const atCore=Math.floor(last/15051)*15051;
 const ordered=rows.filter(r=>r.captivity261).sort((a,b)=>a.captivity261!.factionId-b.captivity261!.factionId||b.captivity261!.atCore-a.captivity261!.atCore||b.actor.id-a.actor.id);
 for(const row of ordered){
  const captivity=row.captivity261!,faction=factions.factions.find(f=>f.id===captivity.factionId);
  if(!faction||row.kind!=='human'||!row.actor.worldAffiliation259||row.free||row.actor.worldAffiliation259.hostFactionId!==null||row.actor.worldAffiliation259.guestStatus!=='Guest')throw Error('Invalid actual kidnapped tracker owner');
  if(captivity.atCore>=atCore)continue;
  if(!caravanMtbEvent261(30,15051,root))continue;
  // Native tracker SetFaction removes the captivity reference. Since this
  // original has no other holder, its resulting situation is now truly Free;
  // this is not a second PassToWorld or a release back into the player's party.
  row.factionId=faction.id;row.actor.worldAffiliation259={...row.actor.worldAffiliation259,factionId:faction.id};
  const relation=factions.relations.find(r=>r.aId===Math.min(faction.id,factions.playerFactionId)&&r.bId===Math.max(faction.id,factions.playerFactionId));
  if(!relation)throw Error('Missing actual captor/player relation');
  row.actor.faction=relation.kind==='hostile'?'outlaws':'outlanders';
  delete row.captivity261;if(row.mode!=='dead'&&row.actor.state!=='dead'&&!row.actor.health?.death)row.free=true;
 }
}
