import { afterEach, expect, test, vi } from 'vitest';
import type { Request, Response } from '../src/bridge/protocol';
// Existing SIM/codec doubles below are transport fixtures, not Core qualification.
// Capture task messages so no live Node port can fire after mock restoration.
function captureWorkerTasks488(){
 const posted:(()=>void)[]=[];
 vi.stubGlobal('MessageChannel',class {port1={onmessage:undefined as undefined|((event:{data:unknown})=>void),unref(){}};port2={unref(){},postMessage:(data:unknown)=>{const owned=structuredClone(data);posted.push(()=>this.port1.onmessage?.({data:owned}));}};});
 return {drain(){for(let n=0;posted.length&&n<64;n++)posted.shift()!();expect(posted).toHaveLength(0);}};
}
const control = vi.hoisted(() => ({ kind: '', steps: 0 }));
vi.mock('../src/sim/new-game', () => ({ createScenarioWorld: () => ({ tick: 0 }) }));
vi.mock('../src/sim/serialization', () => ({ deserializeCampaign(data:string) { if(data==='bad')throw Error('invalid'); return JSON.parse(data); }, serializeCampaign:JSON.stringify }));
vi.mock('../src/sim/index', () => ({
  deserializeWorld(data: string) { if (data === 'bad') throw Error('invalid'); return JSON.parse(data); },
  serializeWorld: JSON.stringify,
  applyCommand(w: any) { w.secondarySite = { map: { wildlife: { animals: [] } } }; return { ok: true }; },
  stepWorld(w: any) {
    control.steps++; w.tick++;
    const target = w.secondarySite?.map ?? w;
    if (control.kind === 'raid') target.raids = { active: { id: 17, startedAt: w.tick, members: [20], phase: 'assault' } };
    if (control.kind === 'manhunter') target.wildlife = { animals: [{ id: 30, state: 'idle', manhunter: { startedAtCore: 10 * w.tick } }] };
    control.kind = '';
  },
}));
vi.mock('../src/sim/player-orders', () => ({ queryOrderOptions: () => [] }));
vi.mock('../src/sim/secondary-site-presentation', () => ({ campaignPresentation: (w: unknown) => w }));
vi.mock('../src/bridge/fixed-clock', () => ({ FixedClock: class { private reserved=0;reset() {this.reserved=0;}advance(_now: number, speed: number) { return speed > 0 ? 15 : 0; } reserve(_now:number,speed:number){return this.reserved=speed>0?15:0;}consume(){if(!this.reserved)return false;this.reserved--;return true;}cancelUnplayed(){this.reserved=0;} } }));
vi.mock('../src/bridge/motion-tracks', () => ({ MotionRecorder: class { reset() {} capture() {} snapshot() { return []; } } }));
vi.mock('../src/bridge/audio-cues', () => ({ AudioCueRecorder: class { reset() {} capture() {} drain() { return []; } } }));
vi.mock('../src/bridge/presentation-changes', () => ({ PresentationChanges: class { capture() { return false; } } }));
vi.mock('../src/bridge/snapshots', () => ({ SnapshotEncoder: class { revision = 0; discardDraftPreview() {} encode(world: unknown, stepMs: number, speed: number, checkpoint: boolean) { return { type: 'snapshot', kind: checkpoint ? 'checkpoint' : 'delta', epoch: 1, revision: ++this.revision, world, stepMs, speed }; } } }));
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); control.kind = ''; control.steps = 0; });
async function fixture() {
  const packets: Response[] = []; let wake!: () => void;
  const scope = { onmessage: undefined as unknown as (e: MessageEvent<Request>) => void, postMessage: (p: Response) => packets.push(structuredClone(p)) };
  vi.stubGlobal('self', scope); vi.stubGlobal('setInterval', (fn: () => void) => { wake = fn; return 1; });
  const tasks=captureWorkerTasks488();
  await import('../src/bridge/simulation.worker');
  const request = (p: Request) => scope.onmessage({ data: p } as MessageEvent<Request>);
  const latest = () => packets.filter(p => p.type === 'snapshot').at(-1)! as Extract<Response, { type: 'snapshot' }>;
  return { packets, request, latest, wake: () => {wake();tasks.drain();} };
}
test('declared transport batch stops at first confirmed remote arrival and only known explicit resume clears pause', async () => {
  const f = await fixture(); f.request({ type: 'load', id: 1, data: '{"tick":10}', threatPauseMode: 'major' });
  f.request({ type: 'command', id: 2, command: { type: 'secondary-enter' } });
  f.request({ type: 'speed', id: 3, speed: 6 });
  control.kind = 'raid'; f.wake();
  expect(control.steps).toBe(1); expect(f.latest()).toMatchObject({ speed: 0, world: { tick: 11 }, urgentThreats: { pauseRevision: 1, urgentHeld: true, rows: [{ site: 'secondary', kind: 'raid' }] } });
  f.request({ type: 'speed', id: 4, speed: 6 }); expect(f.latest().speed).toBe(0);
  f.request({ type: 'speed', id: 5, speed: 6, options: { explicit: true, token: { generation: 1, pauseRevision: 0 } } }); expect(f.latest().speed).toBe(0);
  f.request({ type: 'speed', id: 6, speed: 1, options: { explicit: true, token: { generation: 1, pauseRevision: 1 } } }); expect(f.latest().speed).toBe(1);
});
test('speed confirms the current point; a later task discovers its threat and stale explicit resume cannot erase it', async () => {
  const f = await fixture(); f.request({ type: 'load', id: 1, data: '{"tick":10}' }); f.request({ type: 'speed', id: 2, speed: 6 });
  control.kind = 'raid'; f.request({ type: 'speed', id: 3, speed: 6, options: { explicit: true, token: { generation: 1, pauseRevision: 0 } } });
  expect(control.steps).toBe(0);expect(f.latest().speed).toBe(6);expect(f.latest().world.tick).toBe(10);
  f.wake();
  expect(control.steps).toBe(1); expect(f.latest().speed).toBe(0); expect(f.latest().world.tick).toBe(11);
  f.request({type:'speed',id:4,speed:6,options:{explicit:true,token:{generation:1,pauseRevision:0}}});expect(f.latest().speed).toBe(0);expect(control.steps).toBe(1);
});
test('refused replacement keeps prior mode; live change never resumes and next Single is observed', async () => {
  const f = await fixture(); f.request({ type: 'load', id: 1, data: '{"tick":10}', threatPauseMode: 'major' });
  f.request({ type: 'load', id: 2, data: 'bad', threatPauseMode: 'any-threat' }); expect(f.packets.at(-1)).toMatchObject({ ok: false, outcome: 'refused' });
  f.request({ type: 'speed', id: 3, speed: 1 }); control.kind = 'manhunter'; f.wake();
  expect(f.latest().speed).toBe(1); expect(f.latest().urgentThreats!.pauseRevision).toBe(0);
  f.request({ type: 'threat-pause-mode', id: 4, mode: 'any-threat' });
  control.kind = 'manhunter'; f.wake(); expect(f.latest().speed).toBe(0);
  f.request({ type: 'threat-pause-mode', id: 5, mode: 'never' }); expect(f.latest().speed).toBe(0);
});
