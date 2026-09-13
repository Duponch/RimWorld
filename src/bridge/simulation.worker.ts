/// <reference lib="webworker" />
import { MotionRecorder } from './motion-tracks';
import { applyCommand, createWorld, deserializeWorld, serializeWorld, stepWorld } from '../sim/index';
import type { World } from '../sim/types';
import type { Request, Response } from './protocol';
import { MAP_SIZE_PRESETS } from '../sim/map-config';
import { SnapshotEncoder } from './snapshots';

const scope = self as unknown as DedicatedWorkerGlobalScope;
let world: World | undefined;
let speed = 1;
let accumulator = 0;
let previous = performance.now();
let lastPublish = 0;
let stepMs = 0;
const send = (message: Response) => scope.postMessage(message);
const snapshots = new SnapshotEncoder();
const motion = new MotionRecorder();
const publish = (checkpoint = false) => {
  if (world) {motion.capture(world);send({...snapshots.encode(world, stepMs, speed, checkpoint), motion:motion.snapshot()});}
  lastPublish = performance.now();
};

scope.onmessage = ({ data: request }: MessageEvent<Request>) => {
  try {
    let data: string | undefined;
    if (request.type === 'init') {
      if (request.size !== 32 && !(MAP_SIZE_PRESETS as readonly number[]).includes(request.size)) throw new Error('Taille de carte invalide.');
      world = createWorld(request.seed, request.size, request.size);
      motion.reset();
      accumulator = 0;
      previous = performance.now();
    } else if (request.type === 'speed') {
      if (![0, 1, 3, 6].includes(request.speed)) throw new Error('Vitesse invalide.');
      speed = request.speed;
      accumulator = 0;
      previous = performance.now();
    } else {
      if (!world) throw new Error('La simulation ne répond pas encore.');
      if (request.type === 'command') {
        const result = applyCommand(world, request.command);
        if (!result.ok) throw new Error(result.reason ?? 'Ordre refusé.');
        if (result.affected !== undefined) data = JSON.stringify({ affected: result.affected, skipped: result.skipped });
      } else if (request.type === 'save') {
        data = serializeWorld(world);
      } else if (request.type === 'load') {
        const restored = deserializeWorld(request.data);
        world = restored; motion.reset();
        accumulator = 0;
        previous = performance.now();
      }
    }
    publish(request.type === 'resync');
    send({ type: 'reply', id: request.id, ok: true, data });
  } catch (error) {
    send({ type: 'reply', id: request.id, ok: false, reason: error instanceof Error ? error.message : String(error) });
  }
};

// Fixed 10 Hz gameplay clock. Wall-clock time never enters the simulation core.
setInterval(() => {
  const now = performance.now();
  const elapsed = Math.min(250, Math.max(0, now - previous));
  previous = now;
  if (!world || speed === 0) return;
  accumulator += elapsed * speed;
  const ticks = Math.min(15, Math.floor(accumulator / 100));
  if (ticks > 0) {
    const started = performance.now();
    for(let i=0;i<ticks;i++) {stepWorld(world);motion.capture(world);}
    stepMs = (performance.now() - started) / ticks;
    accumulator -= ticks * 100;
  }
  if (now - lastPublish >= 200) publish();
}, 50);
