import { afterEach, expect, test, vi } from 'vitest';
import { SimulationClient } from '../src/bridge/SimulationClient';
import type { Response, Request } from '../src/bridge/protocol';
const decoder = vi.hoisted(() => ({ calls: 0, reject: false }));
vi.mock('../src/bridge/snapshots', () => ({ SnapshotDecoder: class { adopt(p: any) { decoder.calls++; return decoder.reject ? { status: 'resync' } : { status: 'applied', world: p.world, replaced: true }; } } }));
class Transport {
  static current: Transport; onmessage?: (e: MessageEvent<Response>) => void; onerror?: unknown; onmessageerror?: unknown;
  requests: Request[] = []; constructor() { Transport.current = this; } postMessage(p: Request) { this.requests.push(p); } terminate() {}
  deliver(p: unknown) { this.onmessage!({ data: p } as MessageEvent<Response>); }
}
afterEach(() => { vi.unstubAllGlobals(); decoder.calls = 0; decoder.reject = false; });
const packet = () => ({ type: 'snapshot', kind: 'checkpoint', epoch: 1, revision: 1, speed: 0, stepMs: 0, world: { tick: 20 }, urgentThreats: { generation: 1, serial: 1, pauseRevision: 1, urgentHeld: true, rows: [{ site: 'secondary', kind: 'raid', totalArrivals: 1, lastTick: 20, lastCount: 2, actorId: 17 }] } });
test('invalid metadata never touches Decoder; first nonzero packet survives failed adoption and delivers after successful adoption only once', () => {
  vi.stubGlobal('Worker', Transport); const client = new SimulationClient(), worker = Transport.current, order: string[] = [];
  client.onSnapshot = () => order.push('snapshot'); client.onUrgentThreats = r => { order.push('urgent'); expect(r.rows[0]!.delta).toBe(1); expect(client.getThreatPauseToken()).toEqual({ generation: 1, pauseRevision: 1 }); };
  const bad = packet(); bad.urgentThreats.serial = -1; worker.deliver(bad); expect(decoder.calls).toBe(0);
  decoder.reject = true; worker.deliver(packet()); expect(order).toEqual([]); expect(client.getThreatPauseToken().generation).toBe(0);
  decoder.reject = false; worker.deliver(packet()); worker.deliver(packet()); expect(order).toEqual(['snapshot','urgent','snapshot']);
  client.dispose();
});
test('gesture token is copied and confirmed preference is carried into init/load and transport replacement', async () => {
  vi.stubGlobal('Worker', Transport); const client = new SimulationClient(); const worker = Transport.current;
  const mode = client.setThreatPauseMode('any-threat'); worker.deliver({ type: 'reply', id: worker.requests.at(-1)!.id, ok: true }); await mode;
  const token = client.getThreatPauseToken(); const speed = client.setSpeed(6, { explicit: true, token }); token.pauseRevision = 99;
  expect(worker.requests.at(-1)).toMatchObject({ options: { token: { pauseRevision: 0 } } }); worker.deliver({ type: 'reply', id: worker.requests.at(-1)!.id, ok: true }); await speed;
  const firstLoad = client.load('A'); const firstFailure = expect(firstLoad).rejects.toThrow('stop'); expect(worker.requests.at(-1)).toMatchObject({ type: 'load', threatPauseMode: 'any-threat' });
  client.stop('stop'); await firstFailure; client.restartForReplacement();
  const secondLoad = client.load('B'); expect(Transport.current.requests[0]).toMatchObject({ type: 'load', threatPauseMode: 'any-threat' });
  const secondFailure = expect(secondLoad).rejects.toThrow(); client.dispose(); await secondFailure;
});
