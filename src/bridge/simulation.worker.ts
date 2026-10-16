/// <reference lib="webworker" />
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
import { applyCommand, deserializeWorld, serializeWorld, stepWorld } from '../sim/index';
import type { World } from '../sim/types';
import type { Request, Response, SimulationFault } from './protocol';
import { MAP_SIZE_PRESETS } from '../sim/map-config';
import { SnapshotEncoder } from './snapshots';
import { AudioCueRecorder } from './audio-cues';

const scope = self as unknown as DedicatedWorkerGlobalScope;
let world: CampaignState | undefined;
let maxSettlements:SettlementLimit=1;
let speed = 1;
let threatPauseMode: ThreatPauseMode = 'major';
const urgentThreats = new UrgentThreatObserver();
const clock=new FixedClock();clock.reset(performance.now());
let lastPublishedTick=-1;
let stepMs = 0;
let fault: SimulationFault | undefined;
const send = (message: Response) => scope.postMessage(message);
const snapshots = new SnapshotEncoder({structureDelta:true,minimumStructures:1000});
const motion = new MotionRecorder();
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
    const visible=visibleWorld();if(!visible){const header=snapshots.campaignHeader(checkpoint);send({type:'campaign-only',...header,stepMs,speed,summary:campaignOnlySummary(world),urgentThreats:urgentThreats.snapshot()});lastPublishedTick=world.tick;return header;}
    const packet = snapshots.encode(visible, stepMs, speed, checkpoint);
    send({...packet, urgentThreats: urgentThreats.snapshot(), motion:motion.snapshot(),...cues.length?{audioCues:cues}:{}});
    published = { epoch: packet.epoch, revision: packet.revision };
  }
  lastPublishedTick=world?.tick??-1;
  return published;
};
const publish = (checkpoint = false) => {
  if (world) {urgentThreats.prepareMaps(world);const visible=visibleWorld();if(visible){presentationChanges.capture(visible);motion.capture(visible);audioCues.capture(visible);}}
  return publishCapturedTick(checkpoint);
};

function stopFatal(error: unknown): void {
  if (fault) return;
  speed = 0;
  clock.reset(performance.now());
  fault = { type: 'fault', speed: 0, ...(world ? { tick: world.tick } : {}),
    reason: `La simulation est arrêtée après une erreur. Le dernier tick peut être incomplet ; rechargez une colonie validée pour reprendre. ${error instanceof Error ? error.message : String(error)}` };
  send(fault);
}

scope.onmessage = ({ data: request }: MessageEvent<Request>) => {
  let mutating = false;
  let adoptedReplacement = false;
  try {
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
      maxSettlements=request.maxSettlements??maxSettlements;configureSettlementLimit(created,maxSettlements);world=created;
      adoptedReplacement = true;
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
      maxSettlements=request.maxSettlements??maxSettlements;configureSettlementLimit(restored,maxSettlements);world = restored; adoptedReplacement = true; speed = 0; motion.reset();
      threatPauseMode = request.threatPauseMode ?? threatPauseMode;
      urgentThreats.bootstrap(world);
      fault = undefined;
      audioCues.reset();
      clock.reset(performance.now());
    } else if (request.type === 'speed') {
      if (![0, 1, 3, 6].includes(request.speed)) throw new Error('Vitesse invalide.');
      const beforeAdvance = urgentThreats.token();
      if (!advanceSimulation(performance.now())) throw new Error(fault!.reason);
      speed = urgentThreats.requestedSpeed(request.speed, request.options, beforeAdvance);
    } else {
      if (!world) throw new Error('La simulation ne répond pas encore.');
      if(request.type==='order-options') {
        data=JSON.stringify(queryOrderOptions(selectedMap(world as World),request.pawnId,request,request.queue));
      } else if (request.type === 'command') {
        mutating = true;
        const result = applyCommand(world as World, request.command);
        if (!result.ok) { mutating = false; throw new Error(result.reason ?? 'Ordre refusé.'); }
        if (result.affected !== undefined) data = JSON.stringify({ affected: result.affected, skipped: result.skipped });
      } else if (request.type === 'save') {
        data = serializeCampaign(world);
      }
    }
    const checkpoint = request.type === 'init' || request.type === 'load' || request.type === 'resync';
    // An observer/encoder/publication failure must stop further mutation too.
    let publication: { epoch: number; revision: number } | undefined;
    try { if(request.type!=='order-options')publication = publish(checkpoint); }
    catch (error) { stopFatal(error); throw error; }
    if (adoptedReplacement) fault = undefined;
    send({ type: 'reply', id: request.id, ok: true, data, ...(checkpoint && publication ? { checkpoint: publication } : {}) });
  } catch (error) {
    if (mutating || adoptedReplacement) stopFatal(error);
    const unknown = adoptedReplacement || mutating || (fault && request.type !== 'init' && request.type !== 'load');
    send({ type: 'reply', id: request.id, ok: false, outcome: unknown ? 'unknown' : 'refused', reason: error instanceof Error ? error.message : String(error) });
  }
};

// Fixed gameplay clock. Wall-clock time never enters the simulation core.
function advanceSimulation(now:number):boolean {
  if(fault){clock.reset(now);return false;}
  if(!world){clock.reset(now);return true;}
  try {
  const ticks=clock.advance(now,speed);
  if (ticks > 0) {
    let simulationMs=0;
    for(let i=0;i<ticks;i++) {
      urgentThreats.prepareMaps(world);
      const started=performance.now();stepWorld(world);simulationMs+=performance.now()-started;stepMs=simulationMs/(i+1);
      const paused = urgentThreats.capture(world, threatPauseMode);
      if (paused) { speed = 0; clock.reset(now); }
      const visible=visibleWorld();if(visible){motion.capture(visible);audioCues.capture(visible);}
      const changed = visible?presentationChanges.capture(visible):false;
      if (changed || paused) publishCapturedTick();
      if (paused) break;
    }
  }
  // Supply confirmed motion every active batch (20 ms), including batches
  // without discrete events. Do not duplicate a phase snapshot of the last tick.
  if(ticks>0&&lastPublishedTick!==world.tick)publishCapturedTick();
  return true;
  } catch (error) {
    // World may already have been partially mutated. Never publish it or
    // pretend to restore the last snapshot; replacement validates a fresh one.
    stopFatal(error);
    return false;
  }
}
setInterval(()=>advanceSimulation(performance.now()),20);
