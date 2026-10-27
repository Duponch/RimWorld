/// <reference lib="webworker" />
import {pendingWorldEntry263} from '../sim/world-target-access-263';
import {prepareWorldTargetEntry263} from '../sim/world-target-entry-263';
import {validCaravanArrivalCommand261,takeCaravanTradeArrivals261} from '../sim/caravan-arrival-261';
import {validGeographicCreationSize262,validGeographicCreationSeason262} from '../sim/geographic-creation-options-262';
import {configuredGeographicStartClock256} from '../sim/geographic-start-clock-256';
import {geographicSurfaceTileClimateDefinition256} from '../sim/site-climate';
import {pendingCaravan261} from '../sim/caravan-incidents-261';
import {validCaravanCommand261} from '../sim/caravan-commands-261';
import {prepareActualBattlefieldEntry261} from '../sim/caravan-battlefield-entry-261';
import {isSchema256Or257} from '../sim/schema-compatibility-257.ts';
import {generateGeographicWorldDraft256,type GeographicWorldDraft256} from '../sim/world-geographic-draft';
import {captureGeneratedGeography256,type CampaignGeography256} from '../sim/world-geography-owner-256';
import {planetGeography256} from '../sim/planet-geography-256';
import {worldGenerationKey,validWorldGenerationSettings} from '../sim/world-generation-settings';
import {canPlaceWorldSettlement} from '../sim/world-settlement-placement';
import {createGeographicNewGame256} from '../sim/geographic-new-game-256';
import type {WorldCreationRequest256,WorldCreationTicket256} from '../ui/world-creation-contract';
import {validateWorld} from '../sim/serialization';
import {validStartingOriginalRequest256} from '../sim/starting-original-request-256';
import {ACTUAL_SHRINES_750_256} from '../sim/ancient-temple-orchestration-256';

import {prepareActualCampEntry256,prepareActualSettlementEntry257} from '../sim/group-camp-entry-256';
import {registeredCampaign} from '../sim/world-map-context';
import {groupEntryActions,validWorldMapCommand} from '../sim/world-map-authority';
import {GroupCampaignRuntime256} from '../sim/group-campaign-runtime-256';
import {GroupCaravanPhysical256} from '../sim/group-caravan-physical-256';
import {createGroupCampaignGeometry256} from '../sim/group-campaign-geometry-256';
import {preparePlanetNavigation256} from '../sim/planet-route-256';
import {configureSettlementLimit,validSettlementLimit} from '../sim/world-map-options';
import type {SettlementLimit,CampaignState} from '../sim/world-map-state';
import {selectedRegisteredMap} from '../sim/world-map-context';
import {campaignOnlySummary} from '../sim/world-map-presentation';
import {deserializeCampaign,serializeCampaign} from '../sim/serialization';
import { UrgentThreatObserver, validThreatPauseMode, type ThreatPauseMode } from './urgent-threats';
import {selectedMap} from '../sim/secondary-site-context';
import {campaignPresentation} from '../sim/secondary-site-presentation';
import { createScenarioWorld } from '../sim/new-game';
import { MotionRecorder } from './motion-tracks';
import { FixedClock } from './fixed-clock';
import { PresentationChanges } from './presentation-changes';
import { queryOrderOptions } from '../sim/player-orders';
import {queryBillWorkerOptions283} from '../sim/bill-worker-owners-283';
import { applyCommand, deserializeWorld, serializeWorld, stepWorld } from '../sim/index';
import type { World } from '../sim/types';
import type { Request, Response, SimulationFault } from './protocol';
import { MAP_SIZE_PRESETS } from '../sim/map-config';
import { SnapshotEncoder,type SnapshotMessage } from './snapshots';
import { AudioCueRecorder } from './audio-cues';

/** Both fixed entrypoints execute this identical authoritative engine. The
 * closed entry supplies its concrete transport encoder; public default stays
 * complete. Request ordering, clocks, ACK and SAVE never select that boundary. */
export function startSimulationWorker(scope:DedicatedWorkerGlobalScope,send:(message:Response)=>void,snapshots:SnapshotEncoder<true>=new SnapshotEncoder({structureDelta:true,minimumStructures:1000}),publishLocal?:(world:World,publication:SnapshotMessage<true>,originalPacket:SnapshotMessage<true>)=>void,createMotionRecorder:()=>MotionRecorder=()=>new MotionRecorder()):void {
let world: CampaignState | undefined;
let caravans:GroupCampaignRuntime256|undefined;
/** Build on the validated replacement BEFORE changing the active owner. The
 * immutable geometry scan belongs to this cold boundary, never a tick/RAF. */
function prepareCaravans(root:CampaignState):GroupCampaignRuntime256|undefined {
 if(root.schemaVersion<256||!root.worldMaps||!root.worldGroups||!root.planet)return;
 if(root.planet.revision===3)preparePlanetNavigation256(root.planet);
 const runtime=new GroupCampaignRuntime256(createGroupCampaignGeometry256(root),new GroupCaravanPhysical256());runtime.bootstrap(root);return runtime;
}
let maxSettlements:SettlementLimit=1;
let speed = 1;
let threatPauseMode: ThreatPauseMode = 'major';
const urgentThreats = new UrgentThreatObserver();
const clock=new FixedClock();clock.reset(performance.now());
// Core forcePause is a modal overlay, not an explicit player Pause. This
// bridge-only intent is never a saved World field or a permission to advance.
let neutralResume261:{root:CampaignState;pending:object;speed:number}|undefined;
function holdEncounterPause261(now:number):void {
 const root=world,pending=root&&pendingCaravan261(root)?.pending261;if(!root||!pending)return;
 if((pending.kind==='meeting'||pending.kind==='demand')&&pending.decision==='open'){
  if(!neutralResume261||neutralResume261.root!==root||neutralResume261.pending!==pending)neutralResume261={root,pending,speed};
 }else neutralResume261=undefined; // Fight/Attack/forced map keeps an actual pause.
 speed=0;clock.reset(now);
}
function resumeNeutralEncounter261(previous:object|undefined):void {
 const held=neutralResume261;if(!held||!world||held.root!==world||held.pending!==previous||pendingCaravan261(world))return;
 neutralResume261=undefined;speed=urgentThreats.snapshot().urgentHeld?0:held.speed;clock.reset(performance.now());
}
let lastPublishedTick=-1;
let stepMs = 0;
let fault: SimulationFault | undefined;
const motion = createMotionRecorder();
let presentationChanges=new PresentationChanges();
let observedWorld:World|undefined;
function visibleWorld():World|undefined {
  if(world?.worldMaps&&!selectedRegisteredMap(world)){observedWorld=undefined;return;}
  const current=campaignPresentation(world! as World);
  if(current!==observedWorld){motion.reset();audioCues.reset();presentationChanges=new PresentationChanges();observedWorld=current;}
  return current;
}
const audioCues=new AudioCueRecorder();
// Tick publications use this only after the presentation observers captured that tick.
const publishCapturedTick = (checkpoint = false) => {
  let published: { epoch: number; revision: number } | undefined;
  if (world) {
    const cues=audioCues.drain();
    const visible=visibleWorld();if(!visible){const header=snapshots.campaignHeader(checkpoint);send({type:'campaign-only',...header,stepMs,speed,...(()=>{const transport=snapshots.encodeCampaignSummary(campaignOnlySummary(world),checkpoint);return {summary:transport.state,...transport.geography?{geography:transport.geography}:{}};})(),urgentThreats:urgentThreats.snapshot()});lastPublishedTick=world.tick;for(const notice of takeCaravanTradeArrivals261(world))send({type:'caravan-trade-arrival',...notice,checkpoint:header});return header;}
    const packet = snapshots.encode(visible, stepMs, speed, checkpoint);
    const publication={...packet, urgentThreats: urgentThreats.snapshot(), motion:motion.snapshot(),...cues.length?{audioCues:cues}:{}};
    // The fixed resident entry observes this exact confirmed World synchronously.
    // Commands, ACK, public snapshots and SAVE retain their existing path.
    if(publishLocal)publishLocal(visible,publication,packet);else send(publication);
    published = { epoch: packet.epoch, revision: packet.revision };
  }
  lastPublishedTick=world?.tick??-1;
  if(world&&published)for(const notice of takeCaravanTradeArrivals261(world))send({type:'caravan-trade-arrival',...notice,checkpoint:published});
  return published;
};
const publish = (checkpoint = false) => {
  if (world) {urgentThreats.prepareMaps(world);const visible=visibleWorld();if(visible){presentationChanges.capture(visible);motion.capture(visible);audioCues.capture(visible);}}
  return publishCapturedTick(checkpoint);
};

function stopFatal(error: unknown): void {
  if (fault) return;
  neutralResume261=undefined;
  speed = 0;
  clock.reset(performance.now());
  fault = { type: 'fault', speed: 0, ...(world ? { tick: world.tick } : {}),
    reason: `La simulation est arrêtée après une erreur. Le dernier tick peut être incomplet ; rechargez une colonie validée pour reprendre. ${error instanceof Error ? error.message : String(error)}` };
  send(fault);
}

interface ActiveCamp256 {id:number;groupId:number;root:CampaignState;cancelled:boolean}
let activeCamp256:ActiveCamp256|undefined;
function cancelCamp256(request:Extract<Request,{type:'camp-entry-cancel'}>):void {
 const active=activeCamp256;
 if(!Number.isSafeInteger(request.operationId)||request.operationId<1||!Number.isSafeInteger(request.groupId)||request.groupId<1||!active||active.id!==request.operationId||active.groupId!==request.groupId){send({type:'reply',id:request.id,ok:false,outcome:'refused',reason:'Cette préparation est absente ou déjà terminée ; aucune annulation n’est garantie.'});return;}
 active.cancelled=true;
 send({type:'reply',id:request.id,ok:true,data:JSON.stringify({cancelRequested:true})});
}
function newCampCommand256(request:Request):boolean {
 if(request.type!=='command'||!validWorldMapCommand(request.command)||request.command.type!=='group-enter'||!['camp','settle'].includes(request.command.mode)||!isSchema256Or257(world?.schemaVersion)||world.planet?.revision!==3||!world.worldMaps)return false;
 const id=request.command.groupId,g=world.worldGroups?.groups.find(r=>r.state.id===id)?.state;
 return !world.worldMaps.sites.some(s=>s.tile===(g&&'tile'in g?g.tile:undefined));
}
async function handleCamp256(request:Extract<Request,{type:'command'}>):Promise<void> {
 let committing=false,owned:ActiveCamp256|undefined;
 try {
  if(fault)throw Error(fault.reason);
  if(activeCamp256)throw Error('Une préparation attend encore sa décision.');
  if(!world||!validWorldMapCommand(request.command)||request.command.type!=='group-enter'||!['camp','settle'].includes(request.command.mode))throw Error('Commande de création locale invalide.');
  const root=registeredCampaign(world),groupId=request.command.groupId,mode=request.command.mode==='settle'?'settle':'camp',permission=groupEntryActions(root,groupId)[mode];
  owned={id:request.id,groupId,root,cancelled:false};activeCamp256=owned;
  speed=0;clock.reset(performance.now());try{publish();}catch(error){stopFatal(error);throw error;}
  if(!permission.ok)throw Error(permission.reason??'Cette entrée est refusée.');
  send({type:'camp-entry-progress',id:request.id,groupId,progress:{phase:'preparing'}});
  const iterator=mode==='settle'?prepareActualSettlementEntry257(root,groupId):prepareActualCampEntry256(root,groupId);let completed=false;
  try {
   for(;;){
    const currentFault=readSimulationFault256();if(currentFault)throw Error(currentFault.reason);
    if(activeCamp256!==owned||owned.cancelled||world!==root)throw Error('La préparation de la carte locale a été annulée.');
    const step=iterator.next();
    if(step.done){
     completed=true;if(step.value.status==='blocked')throw Error(step.value.reason);
     if(activeCamp256!==owned||owned.cancelled||world!==root)throw Error('La préparation de la carte locale a été annulée.');
     committing=true;const result=step.value.commit(true);
     if(!result.ok){committing=false;throw Error(result.reason??'Entrée de la carte locale refusée.');}
     const checkpoint=publish(true);if(!checkpoint)throw Error('La carte confirmée n’a pas été publiée.');
     send({type:'reply',id:request.id,ok:true,checkpoint});return;
    }
    send({type:'camp-entry-progress',id:request.id,groupId,progress:step.value});await nextCampTurn256();
   }
  }finally{if(!completed)iterator.return({status:'blocked',phase:'cancelled',reason:'Unpublished Camp discarded'});}
 }catch(error){
  if(committing)stopFatal(error);
  send({type:'reply',id:request.id,ok:false,outcome:committing||fault?'unknown':'refused',...(owned?.cancelled?{data:JSON.stringify({campEntry:'cancelled'})}:{}),reason:error instanceof Error?error.message:String(error)});
 }finally{if(owned&&activeCamp256===owned){activeCamp256=undefined;clock.reset(performance.now());}}
}

const nextCampTurn256=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
// A message/publication callback can establish the fatal state between yields.
function readSimulationFault256():SimulationFault|undefined{return fault;}

/** One attempt per actual persisted pending owner. Explicit retry discards no
 * history/actors/RNG; a cold load prepares that SAME owner again. */
const attemptedEncounter261=new WeakSet<object>();
let activeEncounter261:{root:CampaignState;pending:object;groupId:number}|undefined;
function startEncounter261():void {
 const root=world,row=root&&pendingCaravan261(root),pending=row?.pending261;
 if(!root||!row||!pending)return;
 holdEncounterPause261(performance.now());
 if(pending.decision==='open'||activeEncounter261||activeCamp256||attemptedEncounter261.has(pending))return;
 attemptedEncounter261.add(pending);const owner={root,pending,groupId:row.state.id};activeEncounter261=owner;
 void (async()=>{
  let committed=false,finished=false;const iterator=prepareActualBattlefieldEntry261(root,owner.groupId);
  try {
   send({type:'caravan-encounter-progress',groupId:owner.groupId,phase:'preparing'});
   for(;;){
    if(fault)throw Error(fault.reason);
    if(world!==root||activeEncounter261!==owner||row.pending261!==pending)throw Error('La vraie préparation a été remplacée.');
    const step=iterator.next();
    if(step.done){finished=true;if(step.value.status==='blocked')throw Error(step.value.reason);
     const result=step.value.commit();if(!result.ok)throw Error(result.reason??'Entrée refusée.');committed=true;
     caravans?.encounterChanged261(root,owner.groupId);publish(true);
     send({type:'caravan-encounter-progress',groupId:owner.groupId,phase:'complete'});return;
    }
    send({type:'caravan-encounter-progress',groupId:owner.groupId,phase:step.value.phase});await nextCampTurn256();
   }
  }catch(error){if(committed)stopFatal(error);if(world===root)send({type:'caravan-encounter-progress',groupId:owner.groupId,phase:'refused',reason:error instanceof Error?error.message:String(error)});
  }finally{if(!finished)iterator.return({status:'blocked',phase:'cancelled',reason:'Unpublished battlefield discarded'});if(activeEncounter261===owner)activeEncounter261=undefined;clock.reset(performance.now());}
 })();
}

/** Same progress channel and one-attempt rule as actual Battlefield entry. */
const attemptedWorldEntry263=new WeakSet<object>();
let activeWorldEntry263:{root:CampaignState;pending:object;groupId:number}|undefined;
function worldTargetOrder263(request:Request):boolean {
 if(!world||request.type!=='command'||!validCaravanArrivalCommand261(request.command,world.schemaVersion))return false;
 const held=pendingWorldEntry263(world),c=request.command,g=held&&world.worldGroups?.groups.find(r=>r.state.id===held.groupId)?.state;
 return !!held&&!!g&&'members'in g&&c.groupId===held.groupId&&c.destination===g.tile&&(c.action===null||JSON.stringify(c.action)===JSON.stringify(held.pending.target));
}
function holdWorldEntry263(now:number):void {neutralResume261=undefined;speed=0;clock.reset(now);}
function startWorldEntry263():void {
 const root=world,held=root&&pendingWorldEntry263(root);if(!root||!held)return;
 holdWorldEntry263(performance.now());if(activeWorldEntry263||activeEncounter261||activeCamp256||attemptedWorldEntry263.has(held.pending))return;
 attemptedWorldEntry263.add(held.pending);const owner={root,pending:held.pending,groupId:held.groupId};activeWorldEntry263=owner;
 void(async()=>{
  let committed=false,finished=false;const iterator=prepareWorldTargetEntry263(root,owner.groupId);
  try{
   send({type:'caravan-encounter-progress',groupId:owner.groupId,phase:'preparing'});
   for(;;){
    if(fault)throw Error(fault.reason);
    if(world!==root||activeWorldEntry263!==owner||pendingWorldEntry263(root)?.pending!==owner.pending)throw Error('La préparation de cette entrée a été remplacée ou annulée.');
    const step=iterator.next();if(step.done){finished=true;if(step.value.status==='blocked')throw Error(step.value.reason);
     const result=step.value.commit();if(!result.ok)throw Error(result.reason??'Entrée refusée.');committed=true;
     caravans?.encounterChanged261(root,owner.groupId);publish(true);send({type:'caravan-encounter-progress',groupId:owner.groupId,phase:'complete'});return;
    }
    send({type:'caravan-encounter-progress',groupId:owner.groupId,phase:step.value.phase});await nextCampTurn256();
   }
  }catch(error){if(committed)stopFatal(error);if(world===root&&pendingWorldEntry263(root)?.pending===owner.pending)send({type:'caravan-encounter-progress',groupId:owner.groupId,phase:'refused',reason:error instanceof Error?error.message:String(error)});
  }finally{if(!finished)iterator.return({status:'blocked',phase:'cancelled',reason:'Unpublished world target discarded'});if(activeWorldEntry263===owner)activeWorldEntry263=undefined;clock.reset(performance.now());if(!fault)startWorldEntry263();}
 })();
}

type DraftRequest256=Extract<Request,{type:'world-draft-generate'|'world-draft-cancel'|'world-draft-confirm'|'world-draft-start'}>;
interface HeldWorldDraft256 {
 generation:number;request:WorldCreationRequest256;key:string;creationId?:number;cancelled?:boolean;
 draft?:GeographicWorldDraft256;owner?:CampaignGeography256;geographyId?:number;ticket?:WorldCreationTicket256;
}
let heldWorldDraft:HeldWorldDraft256|undefined,creatingDraftColony:HeldWorldDraft256|undefined,preparingWorldDraft:HeldWorldDraft256|undefined,lastDraftGeneration=0,ticketSerial=0;
const nextDraftTurn=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
function discardWorldDraft256():void {heldWorldDraft=undefined;snapshots.discardDraftPreview();}
function validDraftRequest256(v:WorldCreationRequest256):boolean {
 return !!v&&typeof v.seed==='string'&&validWorldGenerationSettings(v.settings)&&!!v.player&&v.player.scenario==='crashlanded'&&v.player.playerDef==='PlayerColony'&&typeof v.player.playerName==='string'&&v.player.playerName.trim().length>0&&v.player.playerName.length<=80&&!/[\u0000-\u001f\u007f-\u009f]/.test(v.player.playerName);
}
function sameTicket256(a:WorldCreationTicket256|undefined,b:WorldCreationTicket256):boolean {
 return !!a&&!!b&&a.generation===b.generation&&a.key===b.key&&a.tile===b.tile&&a.size===b.size&&a.season===b.season&&a.ticket===b.ticket&&!!b.player&&a.player.scenario===b.player.scenario&&a.player.playerDef===b.player.playerDef&&a.player.playerName===b.player.playerName;
}
function requireDraftSite256(d:HeldWorldDraft256,tile:number):void {
 if(!d.draft||!d.owner||!Number.isSafeInteger(tile)||tile<0||!canPlaceWorldSettlement(d.owner.surface.tiles,tile,{settlementTiles:new Set(d.draft.factions.settlements.map(s=>s.tile))}))throw Error('Le lieu de départ n’est plus disponible.');
}
/** This work never steps or replaces the old colony. Yielding is connection
 * scheduling only; it neither advances game clocks nor draws game RNG. */
async function handleWorldDraft256(request:DraftRequest256):Promise<void> {
 let committed=false,ownedCreation:HeldWorldDraft256|undefined;
 try{
  if(request.type==='world-draft-cancel'){
   if(!Number.isSafeInteger(request.generation)||request.generation<1)throw Error('Identité de préparation invalide.');
   const d=heldWorldDraft;
   if(!d||d.generation!==request.generation||request.operationId!==undefined&&(!Number.isSafeInteger(request.operationId)||request.operationId<1||d.creationId!==request.operationId)||creatingDraftColony===d&&request.operationId!==d.creationId)throw Error('Cette préparation est absente ou déjà terminée ; aucune annulation n’est garantie.');
   d.cancelled=true;discardWorldDraft256();
   send({type:'reply',id:request.id,ok:true,data:JSON.stringify({cancelRequested:true})});return;
  }
  {const actualFault=readSimulationFault256();if(actualFault)throw Error(actualFault.reason);}
  if(activeCamp256)throw Error('La préparation de la carte locale attend encore sa décision.');
  if(request.type==='world-draft-generate'){
   if(creatingDraftColony)throw Error('La création d’une colonie attend encore sa décision.');
   if(world&&speed!==0)throw Error('Mettez la partie en pause avant de préparer un monde.');
   if(!Number.isSafeInteger(request.generation)||request.generation<=lastDraftGeneration||!validDraftRequest256(request.request))throw Error('Paramètres de création invalides.');
   discardWorldDraft256();lastDraftGeneration=request.generation;
   const input:WorldCreationRequest256={seed:request.request.seed,settings:{...request.request.settings,factions:[...request.request.settings.factions]},player:{...request.request.player}},d:HeldWorldDraft256={generation:request.generation,key:worldGenerationKey(input.seed,input.settings),request:input};heldWorldDraft=d;preparingWorldDraft=d;
   const iterator=generateGeographicWorldDraft256({seed:input.seed,settings:input.settings,tick:0,nextThingId:1,playerDef:input.player.playerDef,playerName:input.player.playerName});
   let completed=false;
   try{
    for(;;){{const actualFault=readSimulationFault256();if(actualFault)throw Error(actualFault.reason);}if(heldWorldDraft!==d)throw Error('La préparation du monde a été annulée.');const result=iterator.next();if(result.done){d.draft=result.value;completed=true;break;}send({type:'world-draft-progress',id:request.id,generation:d.generation,progress:result.value});await nextDraftTurn();}
   }finally{if(!completed)iterator.return(undefined as never);}
   if(heldWorldDraft!==d)throw Error('La préparation du monde a été annulée.');
   if(!d.draft)throw Error('Le générateur n’a pas produit de monde.');
   if(d.draft.key!==d.key)throw Error('La clé du monde préparé a changé.');
   d.owner=captureGeneratedGeography256(d.draft);const geography=snapshots.reserveDraftPreview(d.owner);d.geographyId=geography.id;
   send({type:'world-draft-preview',id:request.id,generation:d.generation,key:d.key,request:input,geography,factions:d.draft.factions.factions.map(({id,name,def,hidden})=>({id,name,def,hidden})),settlements:d.draft.factions.settlements.map(({id,factionId,tile,name})=>({id,factionId,tile,name}))});
   send({type:'reply',id:request.id,ok:true});return;
  }
  const d=heldWorldDraft;
  if(!d||!d.draft||!d.owner||d.geographyId===undefined)throw Error('La préparation est perdue. Générez le monde à nouveau.');
  if(request.type==='world-draft-confirm'){
   const site=request.request;if(creatingDraftColony||!site||site.generation!==d.generation||site.key!==d.key||!validGeographicCreationSize262(site.size)||!validGeographicCreationSeason262(site.season)||request.geographyId!==d.geographyId)throw Error('Cette préparation ne correspond pas au lieu confirmé.');
   requireDraftSite256(d,site.tile);if(!Number.isSafeInteger(ticketSerial+1))throw Error('Identité de confirmation épuisée.');
   d.ticket={...site,ticket:`${d.generation}:${++ticketSerial}`,player:{...d.request.player}};
   send({type:'reply',id:request.id,ok:true,data:JSON.stringify(d.ticket)});return;
  }
  if(creatingDraftColony||!sameTicket256(d.ticket,request.ticket)||!validStartingOriginalRequest256(request.startingParty)||!validSettlementLimit(request.maxSettlements)||!validThreatPauseMode(request.threatPauseMode))throw Error('Le départ confirmé n’est plus disponible. Générez le monde à nouveau.');
  if(speed!==0&&world)throw Error('Mettez la partie en pause avant de créer une colonie.');
  requireDraftSite256(d,request.ticket.tile);d.ticket=undefined;d.creationId=request.id;creatingDraftColony=d;ownedCreation=d;
  const owner=d.owner,draft=d.draft,nextThingId=draft.nextThingId,playerFactionId=draft.factions.playerFactionId,iterator=createGeographicNewGame256({draft,geography:owner,tile:request.ticket.tile,size:request.ticket.size,season:request.ticket.season,scenario:'crashlanded',startingParty:request.startingParty},{shrines750:ACTUAL_SHRINES_750_256});
  let created:World|undefined,completed=false;
  try{
   for(;;){{const actualFault=readSimulationFault256();if(actualFault)throw Error(actualFault.reason);}if(heldWorldDraft!==d)throw Error('La création de la colonie a été annulée.');const result=iterator.next();if(result.done){created=result.value;completed=true;break;}send({type:'world-draft-progress',id:request.id,generation:d.generation,progress:result.value});await nextDraftTurn();}
  }finally{if(!completed)iterator.return(undefined as never);}
  if(heldWorldDraft!==d||!created)throw Error('La préparation est perdue. Générez le monde à nouveau.');
  const confirmedClock=configuredGeographicStartClock256(geographicSurfaceTileClimateDefinition256(owner.surface.tiles[request.ticket.tile]!),request.ticket.season);
  if(!isSchema256Or257(created.schemaVersion)||created.width!==request.ticket.size||created.height!==request.ticket.size||created.worldMaps?.mapSize.width!==request.ticket.size||created.worldMaps.mapSize.height!==request.ticket.size||created.worldMaps.calendarOrigin!==confirmedClock.calendarOrigin||created.climate?.revision!==4||created.climate.calendarOrigin!==confirmedClock.calendarOrigin||created.planet?.revision!==3||planetGeography256(created.planet)!==owner||created.site?.revision!==3||created.site.tileId!==request.ticket.tile||created.scenario?.id!==d.request.player.scenario||created.worldFactions!==draft.factions||created.nextId<nextThingId||created.worldFactions.playerFactionId!==playerFactionId||!created.worldFactions.factions.some(f=>f.id===playerFactionId&&f.def===d.request.player.playerDef&&f.name===d.request.player.playerName))throw Error('L’usine locale n’a pas conservé les propriétaires, dimensions ou calendrier du monde confirmé.');
  configureSettlementLimit(created,request.maxSettlements);const errors=validateWorld(created);if(errors.length)throw Error(`La colonie produite est invalide : ${errors[0]}`);
  // Sole authoritative replacement boundary. No old colony, clock or RNG was
  // touched before the complete local World and every owner passed validation.
  const createdCaravans=prepareCaravans(created);
  snapshots.authorizeDraftPreview(owner,d.geographyId);world=created;caravans=createdCaravans;neutralResume261=undefined;committed=true;maxSettlements=request.maxSettlements;threatPauseMode=request.threatPauseMode;speed=0;urgentThreats.bootstrap(world);motion.reset();audioCues.reset();fault=undefined;clock.reset(performance.now());
  const checkpoint=publish(true);if(!checkpoint)throw Error('Le checkpoint initial n’a pas été publié.');heldWorldDraft=undefined;
  send({type:'reply',id:request.id,ok:true,checkpoint});
 }catch(error){
  if(request.type==='world-draft-generate'&&heldWorldDraft?.generation===request.generation)discardWorldDraft256();
  if(committed)stopFatal(error);
  send({type:'reply',id:request.id,ok:false,outcome:committed||fault?'unknown':'refused',...(ownedCreation?.cancelled?{data:JSON.stringify({worldCreation:'cancelled'})}:{}),reason:error instanceof Error?error.message:String(error)});
 }finally{
  if(request.type==='world-draft-generate'&&preparingWorldDraft?.generation===request.generation){preparingWorldDraft=undefined;clock.reset(performance.now());}
  if(ownedCreation&&creatingDraftColony===ownedCreation){if(heldWorldDraft===ownedCreation)discardWorldDraft256();creatingDraftColony=undefined;clock.reset(performance.now());}
 }
}

scope.onmessage = ({ data: request }: MessageEvent<Request>) => {
  const targetOrder=worldTargetOrder263(request);
  const cancelTarget=targetOrder&&request.type==='command'&&validCaravanArrivalCommand261(request.command,world!.schemaVersion)&&request.command.action===null;
  if(activeWorldEntry263&&!['save','resync','init','load'].includes(request.type)&&!cancelTarget){send({type:'reply',id:request.id,ok:false,outcome:'refused',reason:'La préparation de ce site doit se terminer ou être annulée.'});return;}
  if(world&&pendingWorldEntry263(world)&&request.type==='command'&&!targetOrder){send({type:'reply',id:request.id,ok:false,outcome:'refused',reason:'Terminez ou annulez l’entrée réelle avant un autre ordre.'});return;}
  if(activeEncounter261&&!['save','resync','init','load'].includes(request.type)){send({type:'reply',id:request.id,ok:false,outcome:'refused',reason:'La préparation du champ de bataille doit se terminer.'});return;}
  if(world&&pendingCaravan261(world)&&request.type==='command'&&!validCaravanCommand261(request.command)){send({type:'reply',id:request.id,ok:false,outcome:'refused',reason:'Résolvez la rencontre réelle avant de donner un autre ordre.'});return;}
  if(request.type==='camp-entry-cancel'){cancelCamp256(request);return;}
  if(activeCamp256&&request.type!=='resync'){send({type:'reply',id:request.id,ok:false,outcome:'refused',reason:'La préparation de la carte locale doit se terminer ou être annulée.'});return;}
  if(request.type==='world-draft-cancel'){void handleWorldDraft256(request);return;}
  if((creatingDraftColony||preparingWorldDraft)&&request.type!=='resync'&&!(request.type==='world-draft-generate'&&!creatingDraftColony)){send({type:'reply',id:request.id,ok:false,outcome:'refused',reason:'La préparation de la nouvelle colonie attend encore sa décision.'});return;}
  if(request.type==='world-draft-generate'||request.type==='world-draft-confirm'||request.type==='world-draft-start'){void handleWorldDraft256(request);return;}
  if(request.type==='command'&&newCampCommand256(request)){void handleCamp256(request);return;}
  let mutating = false;
  let adoptedReplacement = false;
  try {
    if(request.type==='init'||request.type==='load')discardWorldDraft256();
    let data: string | undefined;
    if (fault && request.type !== 'init' && request.type !== 'load') throw new Error(fault.reason);
    if(request.type==='settlement-limit'){if(!validSettlementLimit(request.maxSettlements))throw Error('Plafond de colonies invalide.');maxSettlements=request.maxSettlements;if(world?.worldMaps)configureSettlementLimit(world,maxSettlements);
    }else if (request.type === 'threat-pause-mode') {
      if (!validThreatPauseMode(request.mode)) throw new Error('Mode de pause invalide.');
      threatPauseMode = request.mode;
    } else if (request.type === 'init') {
      if (request.threatPauseMode !== undefined && !validThreatPauseMode(request.threatPauseMode)) throw new Error('Mode de pause invalide.');
      if(request.maxSettlements!==undefined&&!validSettlementLimit(request.maxSettlements))throw Error('Plafond de colonies invalide.');
      if (request.size !== 32 && !(MAP_SIZE_PRESETS as readonly number[]).includes(request.size)) throw new Error('Taille de carte invalide.');
      const created=createScenarioWorld(request.seed, request.size, request.scenario,request.site,request.startingParty,request.startingWorld,request.surface);
      const createdCaravans=prepareCaravans(created);maxSettlements=request.maxSettlements??maxSettlements;configureSettlementLimit(created,maxSettlements);world=created;caravans=createdCaravans;
      adoptedReplacement = true;neutralResume261=undefined;
      threatPauseMode = request.threatPauseMode ?? threatPauseMode;
      urgentThreats.bootstrap(world);
      fault = undefined;
      speed=request.paused?0:1;
      motion.reset();
      audioCues.reset();
      clock.reset(performance.now());
    } else if (request.type === 'load') {
      if (request.threatPauseMode !== undefined && !validThreatPauseMode(request.threatPauseMode)) throw new Error('Mode de pause invalide.');
      // A cold load needs no temporary colony. Validate completely before the
      // publication, preserving an existing world and clock on refusal.
      if(request.maxSettlements!==undefined&&!validSettlementLimit(request.maxSettlements))throw Error('Plafond de colonies invalide.');
      let restored: CampaignState;
      try { restored = deserializeCampaign(request.data); }
      catch { throw new Error('Cette sauvegarde est illisible ou incompatible avec cette version. La colonie actuelle et vos sauvegardes sont conservées.'); }
      const restoredCaravans=prepareCaravans(restored);maxSettlements=request.maxSettlements??maxSettlements;configureSettlementLimit(restored,maxSettlements);world = restored;caravans=restoredCaravans; adoptedReplacement = true;neutralResume261=undefined; speed = 0; motion.reset();
      threatPauseMode = request.threatPauseMode ?? threatPauseMode;
      urgentThreats.bootstrap(world);
      fault = undefined;
      audioCues.reset();
      clock.reset(performance.now());
    } else if (request.type === 'speed') {
      if (![0, 1, 3, 6].includes(request.speed)) throw new Error('Vitesse invalide.');
      const beforeAdvance = urgentThreats.token();
      const now=performance.now();let cutoff=now;
      if(request.speed===0){
        const stamp=Object.getOwnPropertyDescriptor(request,'pauseIntent');
        if(stamp){
          if(!Object.hasOwn(stamp,'value'))throw Error('L’horodatage de pause est invalide.');
          const intent:unknown=stamp.value;
          if(!intent||typeof intent!=='object'||Array.isArray(intent))throw Error('L’horodatage de pause est invalide.');
          const prototype=Object.getPrototypeOf(intent),keys=Reflect.ownKeys(intent);
          if((prototype!==Object.prototype&&prototype!==null)||keys.length!==2||!keys.includes('origin')||!keys.includes('at'))throw Error('L’horodatage de pause est invalide.');
          const origin=Object.getOwnPropertyDescriptor(intent,'origin'),at=Object.getOwnPropertyDescriptor(intent,'at');
          if(!origin||!at||!Object.hasOwn(origin,'value')||!Object.hasOwn(at,'value')||typeof origin.value!=='number'||!Number.isFinite(origin.value)||typeof at.value!=='number'||!Number.isFinite(at.value))throw Error('L’horodatage de pause est invalide.');
          const local=at.value+(origin.value-performance.timeOrigin);
          if(!Number.isFinite(local))throw Error('L’horodatage de pause est invalide.');
          cutoff=Math.min(now,local);
        }
      }
      if (!advanceSimulation(now,request.speed===0,cutoff)) throw new Error(fault!.reason);
      if(world&&(pendingCaravan261(world)||pendingWorldEntry263(world))&&request.speed!==0)throw Error('La rencontre réelle conserve la simulation en pause jusqu’à sa décision.');
      speed = urgentThreats.requestedSpeed(request.speed, request.options, beforeAdvance);
      if(request.speed===0&&neutralResume261&&neutralResume261.root===world)neutralResume261.speed=0;
    } else {
      if (!world) throw new Error('La simulation ne répond pas encore.');
      if(request.type==='order-options') {
        data=JSON.stringify(queryOrderOptions(selectedMap(world as World),request.pawnId,request,request.queue));
      } else if(request.type==='bill-worker-options') {
        if(!Number.isSafeInteger(request.structureId)||request.structureId<1||!Number.isSafeInteger(request.billId)||request.billId<1)throw Error('Poste ou facture invalide.');
        const options=queryBillWorkerOptions283(selectedMap(world as World),request.structureId,request.billId);
        if(!options)throw Error('Cette facture ou son poste n’est plus disponible.');
        // Metadata replies never publish/capture a snapshot, change revision,
        // advance the clock or start a deferred map preparation.
        send({type:'reply',id:request.id,ok:true,data:JSON.stringify(options)});return;
      } else if (request.type === 'command') {
        mutating = true;
        const retry=validCaravanCommand261(request.command)&&request.command.type==='caravan-encounter-choice'&&request.command.choice==='retry'?pendingCaravan261(world)?.pending261:undefined;
        const previousEncounter=pendingCaravan261(world)?.pending261;
        const previousTarget=targetOrder?pendingWorldEntry263(world)?.pending:undefined;
        const result = applyCommand(world as World, request.command,caravans);
        if(result.ok&&retry)attemptedEncounter261.delete(retry);
        if(result.ok&&previousTarget&&pendingWorldEntry263(world)?.pending===previousTarget)attemptedWorldEntry263.delete(previousTarget);
        if (!result.ok) { mutating = false; throw new Error(result.reason ?? 'Ordre refusé.'); }
        resumeNeutralEncounter261(previousEncounter);
        if (result.affected !== undefined) data = JSON.stringify({ affected: result.affected, skipped: result.skipped });
      } else if (request.type === 'save') {
        data = serializeCampaign(world);
      }
    }
    const checkpoint = request.type === 'init' || request.type === 'load' || request.type === 'resync';
    // An observer/encoder/publication failure must stop further mutation too.
    let publication: { epoch: number; revision: number } | undefined;
    try { if(world&&pendingCaravan261(world))holdEncounterPause261(performance.now());if(world&&pendingWorldEntry263(world))holdWorldEntry263(performance.now());if(request.type!=='order-options')publication = publish(checkpoint); }
    catch (error) { stopFatal(error); throw error; }
    if (adoptedReplacement) fault = undefined;
    send({ type: 'reply', id: request.id, ok: true, data, ...(checkpoint && publication ? { checkpoint: publication } : {}) });
    startEncounter261();startWorldEntry263();
  } catch (error) {
    if (mutating || adoptedReplacement) stopFatal(error);
    const unknown = adoptedReplacement || mutating || (fault && request.type !== 'init' && request.type !== 'load');
    send({ type: 'reply', id: request.id, ok: false, outcome: unknown ? 'unknown' : 'refused', reason: error instanceof Error ? error.message : String(error) });
  }
};

// Fixed gameplay clock. Wall-clock time never enters the simulation core.
function advanceSimulation(now:number,deferFinalPublication=false,clockCutoff=now):boolean {
  if(fault){clock.reset(now);return false;}
  if(world&&pendingCaravan261(world)){holdEncounterPause261(now);startEncounter261();return true;}
  if(world&&pendingWorldEntry263(world)){holdWorldEntry263(now);startWorldEntry263();return true;}
  if(!world||activeEncounter261||activeWorldEntry263||activeCamp256||creatingDraftColony||preparingWorldDraft){clock.reset(now);return true;}
  try {
  const ticks=clock.advance(clockCutoff,speed);
  if (ticks > 0) {
    let simulationMs=0;
    for(let i=0;i<ticks;i++) {
      urgentThreats.prepareMaps(world);
      const started=performance.now();stepWorld(world,1,undefined,caravans);simulationMs+=performance.now()-started;stepMs=simulationMs/(i+1);
      const encounter=pendingCaravan261(world);
      const entry=pendingWorldEntry263(world),threatPaused=urgentThreats.capture(world, threatPauseMode),paused=!!encounter||!!entry||threatPaused;
      if(threatPaused){speed=0;clock.reset(now);}
      if(encounter)holdEncounterPause261(now);if(entry)holdWorldEntry263(now);
      const visible=visibleWorld();if(visible){motion.capture(visible);audioCues.capture(visible);}
      const changed = visible?presentationChanges.capture(visible):false;
      // A normal final tick and its immediate pause share one publication.
      // Every earlier phase and every urgent pause still publishes here.
      if ((changed || paused)&&(!deferFinalPublication||i<ticks-1||paused)) publishCapturedTick();
      if (paused) {if(encounter)startEncounter261();if(entry)startWorldEntry263();break;}
    }
  }
  // Supply confirmed motion every active batch (20 ms), including batches
  // without discrete events. Do not duplicate a phase snapshot of the last tick.
  if(ticks>0&&lastPublishedTick!==world.tick&&!deferFinalPublication)publishCapturedTick();
  return true;
  } catch (error) {
    // World may already have been partially mutated. Never publish it or
    // pretend to restore the last snapshot; replacement validates a fresh one.
    stopFatal(error);
    return false;
  }
}
setInterval(()=>advanceSimulation(performance.now()),20);

}
