import {mockRequestId298} from './request-id-binding298';
import { afterEach, expect, test, vi } from 'vitest';
import { SimulationClient } from '../src/bridge/SimulationClient';
import type { Response, Request } from '../src/bridge/protocol';
const decoder = vi.hoisted(() => ({ calls: 0, reject: false }));
// Since V408 the client publishes the Decoder's admitted summary, not the
// packet directly. Keep that applied-result contract in this transport mock.
vi.mock('../src/bridge/snapshots', () => ({ SnapshotDecoder: class { adoptCampaignOnly(p: any) { decoder.calls++; return decoder.reject ? {status:'resync'} : {status:'applied',replaced:true,summary:p.summary}; } adopt(p: any) { decoder.calls++; return decoder.reject ? { status: 'resync' } : { status: 'applied', world: p.world, replaced: true }; } } }));
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
  const mode = client.setThreatPauseMode('any-threat'); worker.deliver({ type: 'reply', id: mockRequestId298(worker.requests.at(-1)!), ok: true }); await mode;
  const token = client.getThreatPauseToken(); const speed = client.setSpeed(6, { explicit: true, token }); token.pauseRevision = 99;
  expect(worker.requests.at(-1)).toMatchObject({ options: { token: { pauseRevision: 0 } } }); worker.deliver({ type: 'reply', id: mockRequestId298(worker.requests.at(-1)!), ok: true }); await speed;
  const firstLoad = client.load('A'); const firstFailure = expect(firstLoad).rejects.toThrow('stop'); expect(worker.requests.at(-1)).toMatchObject({ type: 'load', threatPauseMode: 'any-threat' });
  client.stop('stop'); await firstFailure; client.restartForReplacement();
  const secondLoad = client.load('B'); expect(Transport.current.requests[0]).toMatchObject({ type: 'load', threatPauseMode: 'any-threat' });
  const secondFailure = expect(secondLoad).rejects.toThrow(); client.dispose(); await secondFailure;
});


test('campaign-only is adopted before receipt and replacement ACK; limit setter patches only its own option',async()=>{vi.stubGlobal('Worker',Transport);const order:string[]=[];class Client extends SimulationClient {protected override deliverCampaignOnly(){order.push('campaign');}}const client=new Client(),worker=Transport.current;client.onUrgentThreats=()=>order.push('urgent');const load=client.load('mapless'),id=mockRequestId298(worker.requests.at(-1)!);worker.deliver({type:'reply',id,ok:true,checkpoint:{epoch:2,revision:1}});let settled=false;void load.then(()=>{settled=true;});await Promise.resolve();expect(settled).toBe(false);const p=packet(),campaign={type:'campaign-only',epoch:2,revision:1,stepMs:2,speed:0,summary:{tick:20},urgentThreats:p.urgentThreats};decoder.reject=true;worker.deliver(campaign);expect(client.campaignSummary).toBeUndefined();expect(order).toEqual([]);decoder.reject=false;worker.deliver(campaign);await load;expect(order).toEqual(['campaign','urgent']);expect(client.hasActiveMap).toBe(false);expect(client.campaignSummary).toMatchObject({tick:20});expect(settled).toBe(true);const mode=client.setThreatPauseMode('never'),modeId=mockRequestId298(worker.requests.at(-1)!),limit=client.setMaxSettlements(5),limitId=mockRequestId298(worker.requests.at(-1)!);expect(worker.requests.slice(-2)).toMatchObject([{type:'threat-pause-mode',mode:'never'},{type:'settlement-limit',maxSettlements:5}]);worker.deliver({type:'reply',id:modeId,ok:true});worker.deliver({type:'reply',id:limitId,ok:true});await Promise.all([mode,limit]);expect(client.maxSettlements).toBe(5);const refused=client.setMaxSettlements(3),rejection=expect(refused).rejects.toThrow();worker.deliver({type:'reply',id:mockRequestId298(worker.requests.at(-1)!),ok:false,outcome:'refused',reason:'Refus explicite'});await rejection;expect(client.maxSettlements).toBe(5);client.dispose();});
