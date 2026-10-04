/// <reference lib="webworker" />
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
let world: World | undefined;
let speed = 1;
const clock=new FixedClock();clock.reset(performance.now());
let lastPublishedTick=-1;
let stepMs = 0;
let fault: SimulationFault | undefined;
const send = (message: Response) => scope.postMessage(message);
const snapshots = new SnapshotEncoder();
const motion = new MotionRecorder();
const presentationChanges=new PresentationChanges();
const audioCues=new AudioCueRecorder();
// Tick publications use this only after the presentation observers captured that tick.
const publishCapturedTick = (checkpoint = false) => {
  let published: { epoch: number; revision: number } | undefined;
  if (world) {
    const cues=audioCues.drain();
    const packet = snapshots.encode(world, stepMs, speed, checkpoint);
    send({...packet, motion:motion.snapshot(),...cues.length?{audioCues:cues}:{}});
    published = { epoch: packet.epoch, revision: packet.revision };
  }
  lastPublishedTick=world?.tick??-1;
  return published;
};
const publish = (checkpoint = false) => {
  if (world) {presentationChanges.capture(world);motion.capture(world);audioCues.capture(world);}
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
    if (request.type === 'init') {
      if (request.size !== 32 && !(MAP_SIZE_PRESETS as readonly number[]).includes(request.size)) throw new Error('Taille de carte invalide.');
      const created=createScenarioWorld(request.seed, request.size, request.scenario,request.site);
      world=created;
      adoptedReplacement = true;
      fault = undefined;
      speed=request.paused?0:1;
      motion.reset();
      audioCues.reset();
      clock.reset(performance.now());
    } else if (request.type === 'load') {
      // A cold load needs no temporary colony. Validate completely before the
      // publication, preserving an existing world and clock on refusal.
      let restored: World;
      try { restored = deserializeWorld(request.data); }
      catch { throw new Error('Cette sauvegarde est illisible ou incompatible avec cette version. La colonie actuelle et vos sauvegardes sont conservées.'); }
      world = restored; adoptedReplacement = true; speed = 0; motion.reset();
      fault = undefined;
      audioCues.reset();
      clock.reset(performance.now());
    } else if (request.type === 'speed') {
      if (![0, 1, 3, 6].includes(request.speed)) throw new Error('Vitesse invalide.');
      if (!advanceSimulation(performance.now())) throw new Error(fault!.reason);
      speed = request.speed;
    } else {
      if (!world) throw new Error('La simulation ne répond pas encore.');
      if(request.type==='order-options') {
        data=JSON.stringify(queryOrderOptions(world,request.pawnId,request,request.queue));
      } else if (request.type === 'command') {
        mutating = true;
        const result = applyCommand(world, request.command);
        if (!result.ok) { mutating = false; throw new Error(result.reason ?? 'Ordre refusé.'); }
        if (result.affected !== undefined) data = JSON.stringify({ affected: result.affected, skipped: result.skipped });
      } else if (request.type === 'save') {
        data = serializeWorld(world);
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
      const started=performance.now();stepWorld(world);simulationMs+=performance.now()-started;stepMs=simulationMs/(i+1);
      motion.capture(world);
      audioCues.capture(world);
      if(presentationChanges.capture(world))publishCapturedTick();
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
