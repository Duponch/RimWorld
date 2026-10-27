import { afterEach, expect, test, vi } from 'vitest';
import type { Request, Response } from '../src/bridge/protocol';

// Existing SIM/codec doubles below are transport fixtures, not Core qualification.
// Capture task messages so no live Node port can fire after mock restoration.
function captureWorkerTasks488(){
 const posted:(()=>void)[]=[];
 vi.stubGlobal('MessageChannel',class {port1={onmessage:undefined as undefined|((event:{data:unknown})=>void),unref(){}};port2={unref(){},postMessage:(data:unknown)=>{const owned=structuredClone(data);posted.push(()=>this.port1.onmessage?.({data:owned}));}};});
 return {drain(){for(let n=0;posted.length&&n<64;n++)posted.shift()!();expect(posted).toHaveLength(0);}};
}
const control = vi.hoisted(() => ({ fail: '', steps: 0 }));
vi.mock('../src/sim/new-game', () => ({ createScenarioWorld: () => ({ tick: 0 }) }));
vi.mock('../src/sim/serialization', () => ({ deserializeCampaign(data:string) { if(data==='bad')throw Error('invalid'); return JSON.parse(data); }, serializeCampaign:JSON.stringify }));
vi.mock('../src/sim/index', () => ({
  deserializeWorld: (data: string) => { if (data === 'bad') throw Error('invalid'); return JSON.parse(data); },
  serializeWorld: (world: unknown) => JSON.stringify(world),
  applyCommand: () => ({ ok: true }),
  stepWorld: (world: { tick: number }) => { control.steps++; world.tick++; if (control.fail === 'step') throw Error('step'); },
}));
vi.mock('../src/sim/player-orders', () => ({ queryOrderOptions: () => [] }));
vi.mock('../src/bridge/fixed-clock', () => ({ FixedClock: class { private reserved=0;reset() {this.reserved=0;}advance(_now: number, speed: number) { return speed > 0 ? 1 : 0; } reserve(_now:number,speed:number){return this.reserved=speed>0?1:0;}consume(){if(!this.reserved)return false;this.reserved--;return true;}cancelUnplayed(){this.reserved=0;} } }));
vi.mock('../src/bridge/motion-tracks', () => ({ MotionRecorder: class { reset() {} capture() { if (control.fail === 'capture') throw Error('capture'); } snapshot() { return []; } } }));
vi.mock('../src/bridge/audio-cues', () => ({ AudioCueRecorder: class { reset() {} capture() {} drain() { return []; } } }));
vi.mock('../src/bridge/presentation-changes', () => ({ PresentationChanges: class { capture() { return false; } } }));
vi.mock('../src/bridge/snapshots', () => ({ SnapshotEncoder: class {
  epoch = 0; revision = 0; world?: unknown;
  // Loads first discard an uncommitted world-creation preview. This scheduling
  // double has no preview; keep that existing lifecycle method available.
  discardDraftPreview() {}
  encode(world: unknown, stepMs: number, speed: number, checkpoint: boolean) {
    if (control.fail === 'encode') throw Error('encode');
    if (world !== this.world) { this.world = world; this.epoch++; }
    return { type: 'snapshot', kind: checkpoint ? 'checkpoint' : 'delta', epoch: this.epoch, revision: ++this.revision, world, stepMs, speed };
  }
} }));

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); control.fail = ''; control.steps = 0; });

test.each(['step', 'capture', 'encode', 'send'])('worker stops once on fatal %s and requires a validated replacement', async stage => {
  const packets: Response[] = [];
  let wake!: () => void;
  const scope = { onmessage: undefined as unknown as (event: MessageEvent<Request>) => void,
    postMessage(packet: Response) { if (control.fail === 'send' && packet.type === 'snapshot') throw Error('send'); packets.push(structuredClone(packet)); } };
  vi.stubGlobal('self', scope); vi.stubGlobal('setInterval', (callback: () => void) => { wake = callback; return 1; });
  captureWorkerTasks488();
  await import('../src/bridge/simulation.worker');
  const request = (packet: Request) => scope.onmessage({ data: packet } as MessageEvent<Request>);
  request({ type: 'load', id: 1, data: '{"tick":7}' });
  expect(packets.at(-1), JSON.stringify(packets)).toMatchObject({ type: 'reply', id: 1, ok: true, checkpoint: { epoch: 1 } });
  expect(packets.filter(packet => packet.type === 'snapshot').at(-1)).toMatchObject({ kind: 'checkpoint', world: { tick: 7 }, speed: 0 });
  request({ type: 'speed', id: 2, speed: 1 });
  expect(packets.at(-1)).toMatchObject({ type: 'reply', id: 2, ok: true });
  control.fail = stage; wake();
  const steps = control.steps; wake(); wake();
  expect(control.steps).toBe(steps); expect(packets.filter(packet => packet.type === 'fault')).toHaveLength(1);
  expect(packets.find(packet => packet.type === 'fault')).toMatchObject({ speed: 0, tick: 8 });
  request({ type: 'speed', id: 3, speed: 6 }); request({ type: 'save', id: 4 });
  expect(packets.at(-1)).toMatchObject({ type: 'reply', id: 4, ok: false, outcome: 'unknown' });
  request({ type: 'load', id: 5, data: 'bad' }); expect(packets.at(-1)).toMatchObject({ type: 'reply', id: 5, ok: false, outcome: 'refused' });
  wake(); expect(control.steps).toBe(steps);
  control.fail = '';
  request({ type: 'load', id: 6, data: '{"tick":20}' });
  expect(packets.at(-1)).toMatchObject({ type: 'reply', id: 6, ok: true, checkpoint: { epoch: 2 } });
  request({ type: 'speed', id: 7, speed: 1 }); wake(); expect(control.steps).toBe(steps + 1);
  expect(packets.filter(packet => packet.type === 'fault')).toHaveLength(1);
});

test('a publication failure after replacement is unknown and blocks further save rather than promising rollback', async () => {
  const packets: Response[] = [];
  const scope = { onmessage: undefined as unknown as (event: MessageEvent<Request>) => void, postMessage(packet: Response) { packets.push(structuredClone(packet)); } };
  vi.stubGlobal('self', scope); vi.stubGlobal('setInterval', () => 1);
  captureWorkerTasks488();
  await import('../src/bridge/simulation.worker');
  control.fail = 'encode';
  scope.onmessage({ data: { type: 'load', id: 1, data: '{"tick":30}' } } as MessageEvent<Request>);
  expect(packets).toHaveLength(2); expect(packets[0]).toMatchObject({ type: 'fault', tick: 30, speed: 0 });
  expect(packets[1]).toMatchObject({ type: 'reply', id: 1, ok: false, outcome: 'unknown' });
  scope.onmessage({ data: { type: 'save', id: 2 } } as MessageEvent<Request>);
  expect(packets.at(-1)).toMatchObject({ type: 'reply', id: 2, ok: false, outcome: 'unknown' });
  expect(packets.filter(packet => packet.type === 'fault')).toHaveLength(1);
});
