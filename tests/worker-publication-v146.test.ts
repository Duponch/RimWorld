import { afterEach, expect, test, vi } from 'vitest';
import { createWorld, serializeWorld } from '../src/sim/index.ts';
import { MotionRecorder } from '../src/bridge/motion-tracks.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes.ts';
import type { Request, Response } from '../src/bridge/protocol.ts';
import type { World } from '../src/sim/types.ts';

const scenario = vi.hoisted(() => ({ initialTick: 0 }));

vi.mock('../src/bridge/fixed-clock.ts', () => ({
  FixedClock: class {
    reset(): void {}
    advance(_now: number, speed: number): number { return speed > 0 ? 1 : 0; }
  },
}));

vi.mock('../src/sim/index.ts', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/sim/index.ts')>();
  return {
    ...actual,
    stepWorld(world: World): void {
      world.tick++;
      if (world.tick === scenario.initialTick + 1) {
        const pawn = world.pawns[0]!;
        pawn.state = 'moving';
        pawn.motion = { from: { x: pawn.x, z: pawn.z }, to: { x: pawn.x + 1, z: pawn.z },
          start: world.tick, end: world.tick + 2, speedFactor: 1, terrainDelay: 0 };
      }
    },
    applyCommand(world: World): { ok: true } {
      world.pawns[0]!.state = 'working';
      return { ok: true };
    },
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

test('worker publishes phase and batch ticks once, then captures same-tick commands and resync', async () => {
  const source = createWorld(146, 32, 32), saved = serializeWorld(source);
  scenario.initialTick = source.tick;
  const packets: Response[] = [];
  const scope: { onmessage?: (event: MessageEvent<Request>) => void; postMessage: (message: Response) => void } = {
    postMessage: message => packets.push(structuredClone(message)),
  };
  let wake: (() => void) | undefined;
  vi.stubGlobal('self', scope);
  vi.stubGlobal('setInterval', (callback: () => void) => { wake = callback; return 1; });
  const phases = vi.spyOn(PresentationChanges.prototype, 'capture');
  const motion = vi.spyOn(MotionRecorder.prototype, 'capture');
  await import('../src/bridge/simulation.worker.ts');
  const request = (value: Request) => scope.onmessage!({ data: value } as MessageEvent<Request>);
  request({ type: 'load', id: 1, data: saved });
  request({ type: 'speed', id: 2, speed: 1 });
  wake!(); // New pawn state and motion: a phase snapshot inside the tick.
  wake!(); // Only continuous time changes: one snapshot at the batch end.
  request({ type: 'command', id: 3, command: { type: 'clear-orders', pawnId: source.pawns[0]!.id } });
  request({ type: 'resync', id: 4 });

  expect(packets.map(packet => packet.type)).toEqual([
    'snapshot', 'reply', 'snapshot', 'reply', 'snapshot', 'snapshot', 'snapshot', 'reply', 'snapshot', 'reply',
  ]);
  const snapshots = packets.filter(packet => packet.type === 'snapshot');
  expect(snapshots.map(packet => [packet.kind, packet.epoch, packet.revision, packet.world.tick, packet.speed])).toEqual([
    ['checkpoint', 1, 1, source.tick, 0],
    ['delta', 1, 2, source.tick, 1],
    ['delta', 1, 3, source.tick + 1, 1],
    ['delta', 1, 4, source.tick + 2, 1],
    ['delta', 1, 5, source.tick + 2, 1],
    ['checkpoint', 1, 6, source.tick + 2, 1],
  ]);
  expect(snapshots[2]!.motion!.find(track => track.id === source.pawns[0]!.id)?.segments).toHaveLength(1);
  expect(snapshots[3]!.motion).toEqual(snapshots[2]!.motion);
  expect(snapshots[4]!.world.pawns[0]!.state).toBe('working');
  expect(snapshots[5]!.motion).toEqual(snapshots[4]!.motion);
  expect(phases).toHaveBeenCalledTimes(6);
  expect(motion).toHaveBeenCalledTimes(6);
});
