import { afterEach, expect, test, vi } from 'vitest';
import { SimulationClient } from '../src/bridge/SimulationClient';
import { GameSession, SAVE_KEY, PREVIOUS_KEY } from '../src/ui/game-session';
import type { Response, Request } from '../src/bridge/protocol';

vi.mock('../src/bridge/snapshots', () => ({
  SnapshotDecoder: class {
    epoch = 0;
    adopt(packet: { epoch: number; world: unknown }) {
      const replaced = packet.epoch !== this.epoch;
      this.epoch = packet.epoch;
      return { status: 'applied', world: packet.world, replaced };
    }
  },
}));

class Transport {
  static current: Transport;
  onmessage?: (event: MessageEvent<Response>) => void;
  onerror?: (event: ErrorEvent) => void;
  onmessageerror?: () => void;
  requests: Request[] = [];
  terminate = vi.fn();
  constructor() { Transport.current = this; }
  postMessage(request: Request) { this.requests.push(request); }
  deliver(packet: Response) { this.onmessage!({ data: packet } as MessageEvent<Response>); }
  checkpoint(epoch: number, revision = 1) {
    this.deliver({ type: 'snapshot', kind: 'checkpoint', epoch, revision, speed: 0, stepMs: 0, world: { tick: epoch } } as Response);
  }
}
function fixture() {
  vi.useFakeTimers(); vi.stubGlobal('Worker', Transport);
  const client = new SimulationClient(), transport = Transport.current;
  return { client, transport };
}
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test('timeout signals unknown outcome, retains ordering and resolves a late reply only after its checkpoint', async () => {
  const { client, transport } = fixture(), status = vi.fn(), errors = vi.fn(), resolved = vi.fn();
  client.onRequestStatus = status; client.onError = errors;
  const load = client.load('C').then(resolved), request = transport.requests[0]!;
  await vi.advanceTimersByTimeAsync(15_001);
  expect(resolved).not.toHaveBeenCalled(); expect(status).toHaveBeenCalledWith(expect.objectContaining({ state: 'waiting', type: 'load' }));
  expect(errors).toHaveBeenCalledWith(expect.stringContaining('inconnu'));
  transport.deliver({ type: 'reply', id: request.id, ok: true, checkpoint: { epoch: 4, revision: 1 } });
  await flush(); expect(resolved).not.toHaveBeenCalled();
  transport.checkpoint(3); await flush(); expect(resolved).not.toHaveBeenCalled();
  transport.checkpoint(4); await load; expect(resolved).toHaveBeenCalledOnce();
  const command = client.command({ type: 'clear-orders', pawnId: 1 });
  transport.deliver({ type: 'reply', id: transport.requests.at(-1)!.id, ok: true }); await command;
  expect(transport.requests.map(request => request.type)).toEqual(['load', 'command']);
  client.dispose();
});

test('late accepted replacement keeps A recovery and the session lock until preparation finishes', async () => {
  const { client, transport } = fixture();
  const data = new Map([[SAVE_KEY, 'C'], [PREVIOUS_KEY, 'B']]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  let release!: () => void;
  const prepare = vi.fn(() => new Promise<void>(resolve => { release = resolve; }));
  const session = new GameSession(client, () => storage, prepare); session.hasWorld = true;
  const load = session.load(SAVE_KEY); await flush();
  const saveRequest = transport.requests[0]!;
  transport.deliver({ type: 'reply', id: saveRequest.id, ok: true, data: 'A' }); await flush();
  const request = transport.requests.at(-1)!; expect(request.type).toBe('load'); expect(data.get(PREVIOUS_KEY)).toBe('A');
  await vi.advanceTimersByTimeAsync(15_001);
  expect(session.busy).toBe(true); expect(data.get(PREVIOUS_KEY)).toBe('A');
  await expect(session.create(1, 32, 'sentry')).rejects.toThrow('en cours');
  transport.checkpoint(2); transport.deliver({ type: 'reply', id: request.id, ok: true, checkpoint: { epoch: 2, revision: 1 } });
  await flush(); expect(prepare).toHaveBeenCalledOnce(); expect(session.busy).toBe(true);
  release(); await load; expect(session.busy).toBe(false); expect(data.get(PREVIOUS_KEY)).toBe('A'); expect(data.get(SAVE_KEY)).toBe('C');
  client.dispose();
});

test('confirmed refusal restores B; hard stop preserves A and permits recovery through a fresh transport', async () => {
  const { client, transport } = fixture();
  const data = new Map([[SAVE_KEY, 'C'], [PREVIOUS_KEY, 'B']]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const session = new GameSession(client, () => storage, async () => {}); session.hasWorld = true;
  client.onFault = () => session.markSimulationStopped();
  const first = session.load(SAVE_KEY); const refusal = expect(first).rejects.toThrow('bad'); await flush();
  transport.deliver({ type: 'reply', id: transport.requests.at(-1)!.id, ok: true, data: 'A' }); await flush();
  transport.deliver({ type: 'reply', id: transport.requests.at(-1)!.id, ok: false, outcome: 'refused', reason: 'bad' });
  await refusal; expect(data.get(PREVIOUS_KEY)).toBe('B');
  const second = session.load(SAVE_KEY); const interrupted = expect(second).rejects.toThrow('stopped'); await flush();
  transport.deliver({ type: 'reply', id: transport.requests.at(-1)!.id, ok: true, data: 'A' }); await flush();
  client.stop('stopped'); client.stop('again'); await interrupted;
  expect(transport.terminate).toHaveBeenCalledOnce(); expect(data.get(PREVIOUS_KEY)).toBe('A'); expect(session.busy).toBe(false);
  client.restartForReplacement();
  const restored = session.load(PREVIOUS_KEY); await flush();
  const fresh = Transport.current; expect(fresh.requests.map(request => request.type)).toEqual(['load']);
  fresh.checkpoint(1); fresh.deliver({ type: 'reply', id: fresh.requests[0]!.id, ok: true, checkpoint: { epoch: 1, revision: 1 } });
  await restored; expect(data.get(PREVIOUS_KEY)).toBe('A'); client.dispose();
});

test('a timed out non-idempotent command is never retried or reported refused', async () => {
  const { client, transport } = fixture(), completed = vi.fn();
  const command = client.command({ type: 'clear-orders', pawnId: 1 }).then(completed);
  await vi.advanceTimersByTimeAsync(45_000); expect(completed).not.toHaveBeenCalled(); expect(transport.requests).toHaveLength(1);
  transport.deliver({ type: 'reply', id: transport.requests[0]!.id, ok: true, data: 'done' });
  await command; expect(completed).toHaveBeenCalledWith('done'); client.dispose();
});

test('an invalid replacement after a stopped worker releases exclusivity without touching its recovery', async () => {
  const { client, transport } = fixture(), data = new Map([[PREVIOUS_KEY, 'A']]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const session = new GameSession(client, () => storage, async () => {}); session.hasWorld = true;
  client.onFault = () => session.markSimulationStopped();
  transport.deliver({ type: 'fault', speed: 0, reason: 'tick incomplete' });
  const load = session.loadExternal(async () => 'bad'); const refused = expect(load).rejects.toThrow('invalid'); await flush();
  expect(transport.requests.map(request => request.type)).toEqual(['load']);
  transport.deliver({ type: 'reply', id: transport.requests[0]!.id, ok: false, outcome: 'unknown', reason: 'invalid' });
  await refused; expect(session.busy).toBe(false); expect(data.get(PREVIOUS_KEY)).toBe('A'); client.dispose();
});

test('replacement acceptance follows its authoritative acknowledgement once and survives graphics failure after a fault', async () => {
  const { client, transport } = fixture(), data = new Map([[PREVIOUS_KEY, 'A']]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const order: string[] = [], accepted = vi.fn(() => { order.push('accepted'); });
  const prepare = vi.fn(async () => { order.push('prepare'); throw Error('graphics failed'); });
  const session = new GameSession(client, () => storage, prepare, accepted); session.hasWorld = true;
  client.onFault = () => session.markSimulationStopped();
  transport.deliver({ type: 'fault', speed: 0, reason: 'tick incomplete' });
  const load = session.loadExternal(async () => 'C'), failure = expect(load).rejects.toThrow('graphics failed');
  await flush(); const request = transport.requests[0]!;
  expect(request.type).toBe('load'); expect(accepted).not.toHaveBeenCalled();
  transport.checkpoint(2); await flush(); expect(accepted).not.toHaveBeenCalled();
  transport.deliver({ type: 'reply', id: request.id, ok: true, checkpoint: { epoch: 2, revision: 1 } });
  await failure;
  expect(accepted).toHaveBeenCalledOnce(); expect(order).toEqual(['accepted', 'prepare']);
  expect(session.hasWorld).toBe(true); expect(session.busy).toBe(false); expect(data.get(PREVIOUS_KEY)).toBe('A');
  const saving = session.save(); await flush();
  const saveRequest = transport.requests.at(-1)!; expect(saveRequest.type).toBe('save');
  transport.deliver({ type: 'reply', id: saveRequest.id, ok: true, data: 'C' }); await saving;
  expect(data.get(SAVE_KEY)).toBe('C'); expect(accepted).toHaveBeenCalledOnce(); client.dispose();
});
