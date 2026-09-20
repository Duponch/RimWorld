/// <reference lib="webworker" />
import { createScenarioWorld } from '../sim/new-game';
import { MotionRecorder } from './motion-tracks';
import { FixedClock } from './fixed-clock';
import { PresentationChanges } from './presentation-changes';
import { queryOrderOptions } from '../sim/player-orders';
import { applyCommand, deserializeWorld, serializeWorld, stepWorld } from '../sim/index';
import type { World } from '../sim/types';
import type { Request, Response } from './protocol';
import { MAP_SIZE_PRESETS } from '../sim/map-config';
import { SnapshotEncoder } from './snapshots';

const scope = self as unknown as DedicatedWorkerGlobalScope;
let world: World | undefined;
let speed = 1;
const clock=new FixedClock();clock.reset(performance.now());
let lastPublishedTick=-1;
let stepMs = 0;
const send = (message: Response) => scope.postMessage(message);
const snapshots = new SnapshotEncoder();
const motion = new MotionRecorder();
const presentationChanges=new PresentationChanges();
const publish = (checkpoint = false) => {
  if (world) {presentationChanges.capture(world);motion.capture(world);send({...snapshots.encode(world, stepMs, speed, checkpoint), motion:motion.snapshot()});}
  lastPublishedTick=world?.tick??-1;
};

scope.onmessage = ({ data: request }: MessageEvent<Request>) => {
  try {
    let data: string | undefined;
    if (request.type === 'init') {
      if (request.size !== 32 && !(MAP_SIZE_PRESETS as readonly number[]).includes(request.size)) throw new Error('Taille de carte invalide.');
      const created=createScenarioWorld(request.seed, request.size, request.scenario);
      world=created;
      if(request.paused)speed=0;
      motion.reset();
      clock.reset(performance.now());
    } else if (request.type === 'load') {
      // A cold load needs no temporary colony. Validate completely before the
      // publication, preserving an existing world and clock on refusal.
      let restored: World;
      try { restored = deserializeWorld(request.data); }
      catch { throw new Error('Cette sauvegarde est illisible ou incompatible avec cette version. La colonie actuelle et vos sauvegardes sont conservées.'); }
      world = restored; speed = 0; motion.reset();
      clock.reset(performance.now());
    } else if (request.type === 'speed') {
      if (![0, 1, 3, 6].includes(request.speed)) throw new Error('Vitesse invalide.');
      advanceSimulation(performance.now());
      speed = request.speed;
    } else {
      if (!world) throw new Error('La simulation ne répond pas encore.');
      if(request.type==='order-options') {
        data=JSON.stringify(queryOrderOptions(world,request.pawnId,request,request.queue));
      } else if (request.type === 'command') {
        const result = applyCommand(world, request.command);
        if (!result.ok) throw new Error(result.reason ?? 'Ordre refusé.');
        if (result.affected !== undefined) data = JSON.stringify({ affected: result.affected, skipped: result.skipped });
      } else if (request.type === 'save') {
        data = serializeWorld(world);
      }
    }
    if(request.type!=='order-options')publish(request.type === 'resync');
    send({ type: 'reply', id: request.id, ok: true, data });
  } catch (error) {
    send({ type: 'reply', id: request.id, ok: false, reason: error instanceof Error ? error.message : String(error) });
  }
};

// Fixed gameplay clock. Wall-clock time never enters the simulation core.
function advanceSimulation(now:number):void {
  if(!world){clock.reset(now);return;}
  const ticks=clock.advance(now,speed);
  if (ticks > 0) {
    let simulationMs=0;
    for(let i=0;i<ticks;i++) {
      const started=performance.now();stepWorld(world);simulationMs+=performance.now()-started;stepMs=simulationMs/(i+1);
      motion.capture(world);
      if(presentationChanges.capture(world))publish();
    }
  }
  // Supply confirmed motion every active batch (20 ms), including batches
  // without discrete events. Do not duplicate a phase snapshot of the last tick.
  if(ticks>0&&lastPublishedTick!==world.tick)publish();
}
setInterval(()=>advanceSimulation(performance.now()),20);
