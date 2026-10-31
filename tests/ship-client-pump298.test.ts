// Transport-only host, real client/pump/decoder and real32x32 checkpoints.
// Replies below are declared wire data, NOT a gameplay preflight/finalizer.
import {afterEach,expect,test,vi} from 'vitest';
import {createHook} from 'node:async_hooks';
import {SimulationClient} from '../src/bridge/SimulationClient';
import {SnapshotEncoder} from '../src/bridge/snapshots';
import {createWorld,serializeWorld} from '../src/sim/index';
import {SHIP_FRAME_MAXIMUM_DELTA_298,type ShipFrameRequest298,type ShipFrameAck298} from '../src/bridge/ship-countdown-wire-298.ts';
import type {ShipClientCountdownState298} from '../src/bridge/ship-frame-pump-298.ts';
import type {Request,Response} from '../src/bridge/protocol';

const ports:Port[]=[];
class Port {
 onmessage?:((event:MessageEvent<unknown>)=>void)|null;onerror?:unknown;onmessageerror?:unknown;
 posts:Request[]=[];terminated=0;
 postMessage(request:Request):void{this.posts.push(structuredClone(request));}
 terminate():void{this.terminated++;}
 emit(value:Response):void{this.onmessage?.({data:structuredClone(value)} as MessageEvent<unknown>);}
}
class Client extends SimulationClient {protected override createWorker():Worker{const port=new Port();ports.push(port);return port as unknown as Worker;}}
type Settled<T>={ok:true;value:T}|{ok:false;error:unknown};
const observe=<T>(value:Promise<T>):Promise<Settled<T>>=>value.then(v=>({ok:true as const,value:v}),error=>({ok:false as const,error}));
function rows<T extends Request['type']>(port:Port,type:T):Extract<Request,{type:T}>[]{return port.posts.filter(p=>p.type===type) as Extract<Request,{type:T}>[];}
function last<T extends Request['type']>(port:Port,type:T):Extract<Request,{type:T}>{const result=rows(port,type).at(-1);if(!result)throw Error('Missing real client post '+type);return result;}
function ack(port:Port,frame:ShipFrameRequest298,extra:Partial<ShipFrameAck298>={}):void{
 port.emit({type:'ship-frame-ack-298',ownerEpoch:frame.ownerEpoch,generation:frame.generation,sequence:frame.sequence,accepted:true,active:true,outcome:'waiting',...extra});
}
async function loadValid(client:Client,port:Port,ownerEpoch=1){
 // Same constructor/producer pattern as pause-intent-client-v486. No Engine
 // step, terminal service, fake decoder, hand-written World or schema patch.
 const world=createWorld(298618,32,32),raw=serializeWorld(world),loading=observe(client.load(raw)),request=last(port,'load');let settled=false;void loading.then(()=>{settled=true;});
 const packet=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:1000}).encode(world,0,0,true);
 port.emit({type:'reply',id:request.id,ok:true,shipOwnerEpoch298:ownerEpoch,checkpoint:{epoch:packet.epoch,revision:packet.revision}});
 await Promise.resolve();expect(settled).toBe(false);
 port.emit({...packet,motion:[],urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]}});
 const result=await loading;expect(result.ok).toBe(true);expect(client.hasActiveMap).toBe(true);return {world,raw};
}
async function setup(){
 vi.useFakeTimers();const client=new Client(),port=ports.at(-1)!,states:ShipClientCountdownState298[]=[];client.onShipCountdownState298=s=>states.push(s);
 try{return {client,port,states,...await loadValid(client,port)};}catch(error){client.dispose();throw error;}
}
async function launch(client:Client,port:Port,generation=1):Promise<void>{
 // Positive computerId is transport metadata here. This host does not execute
 // a launch preflight; those actual-runtime contracts are a distinct lane.
 const starting=observe(client.launchShip298(123)),request=last(port,'ship-launch-298');
 port.emit({type:'reply',id:request.id,ok:true,shipOwnerEpoch298:request.ownerEpoch,data:JSON.stringify({ok:true,ownerEpoch:request.ownerEpoch,generation,active:true})});
 expect((await starting).ok).toBe(true);expect(client.shipCountdownActive298).toBe(true);
}
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();ports.length=0;});

test('inactive real client sends no frame and allocates no Promise, timer or microtask per frame',async()=>{
 const f=await setup();
 try{
  const timeout=vi.spyOn(globalThis,'setTimeout'),interval=vi.spyOn(globalThis,'setInterval'),microtask=vi.spyOn(globalThis,'queueMicrotask');
  const before={posts:f.port.posts.length,timers:vi.getTimerCount(),timeout:timeout.mock.calls.length,interval:interval.mock.calls.length,microtask:microtask.mock.calls.length};
  let constructed=0,returnsUndefined=true;
  // PROMISE resource creation observes intrinsic async-function promises too.
  // Scope is synchronous and disabled before any Vitest assertion or await.
  const hook=createHook({init(_id,type){if(type==='PROMISE')constructed++;}});hook.enable();constructed=0;
  try{for(let i=0;i<1000;i++)if(f.client.feedShipFrame298(.016)!==undefined)returnsUndefined=false;}
  finally{hook.disable();}
  const after={posts:f.port.posts.length,timers:vi.getTimerCount(),timeout:timeout.mock.calls.length,interval:interval.mock.calls.length,microtask:microtask.mock.calls.length};
  expect(returnsUndefined).toBe(true);expect(constructed).toBe(0);expect(after).toEqual(before);expect(f.client.shipCountdownActive298).toBe(false);
 }finally{f.client.dispose();}
});

test('one512 budget includes flight; refusal retains values/sequence, explicit resume preserves FIFO, overflow is transport unknown',async()=>{
 const f=await setup();
 try{
  await launch(f.client,f.port);const values=Array.from({length:512},(_,i)=>i===0 ? .9 : i/10000),expected=values.map(v=>Math.fround(Math.min(v,SHIP_FRAME_MAXIMUM_DELTA_298)));
  for(const delta of values)f.client.feedShipFrame298(delta);
  expect(rows(f.port,'ship-frame-298')).toHaveLength(1);const first=last(f.port,'ship-frame-298');expect(first.deltas).toEqual([expected[0]]);
  ack(f.port,first,{accepted:false,active:true,outcome:'refused',reason:'Declared cooperative preparation'});
  const held=f.port.posts.length;f.client.feedShipFrame298(.2);expect(f.port.posts).toHaveLength(held);expect(f.client.shipCountdownActive298).toBe(false);
  await vi.advanceTimersByTimeAsync(1000);expect(f.port.posts).toHaveLength(held);
  f.client.resumeShipFramesAfterPreparation298();const retry=last(f.port,'ship-frame-298');expect(retry).toEqual(first);
  ack(f.port,retry);const rest=last(f.port,'ship-frame-298');expect(rest.sequence).toBe(2);expect(rest.deltas).toEqual(expected.slice(1));
  f.client.feedShipFrame298(.031);expect(rows(f.port,'ship-cancel-298')).toHaveLength(0); //511flight+1waiting=512
  f.client.feedShipFrame298(.032);expect(rows(f.port,'ship-cancel-298')).toHaveLength(1);expect(last(f.port,'ship-cancel-298')).toMatchObject({ownerEpoch:1,generation:1,reason:'transport'});
  const cut=f.port.posts.length,stateCount=f.states.length;ack(f.port,rest);expect(f.port.posts).toHaveLength(cut);expect(f.states).toHaveLength(stateCount);
  f.port.emit({type:'ship-countdown-state-298',ownerEpoch:2,generation:0,active:false,outcome:'unknown',reason:'Declared transport reset'});
  expect(f.client.shipCountdownActive298).toBe(false);expect(f.states.at(-1)).toMatchObject({ownerEpoch:2,generation:0,active:false,outcome:'unknown'});expect(f.states.some(s=>s.outcome==='departed')).toBe(false);expect(f.port.terminated).toBe(0);expect(f.client.hasActiveMap).toBe(true);
  const saving=observe(f.client.save()),save=last(f.port,'save');f.port.emit({type:'reply',id:save.id,ok:true,shipOwnerEpoch298:2,data:f.raw});expect(await saving).toEqual({ok:true,value:f.raw});
 }finally{f.client.dispose();}
});

test('stale epoch/generation/sequence and retired Worker ACKs neither post nor wake a reserved cold request',async()=>{
 const f=await setup();let waiting:Promise<Settled<string|undefined>>|undefined;
 try{
  await launch(f.client,f.port);f.client.feedShipFrame298(.01);f.client.feedShipFrame298(.02);const first=last(f.port,'ship-frame-298');waiting=observe(f.client.load(f.raw));
  const held=f.port.posts.length,stateCount=f.states.length;
  for(const extra of [{ownerEpoch:2},{generation:2},{sequence:999}])ack(f.port,first,extra);
  expect(f.port.posts).toHaveLength(held);expect(f.states).toHaveLength(stateCount);
  f.client.stop('Declared transport retirement');expect((await waiting).ok).toBe(false);f.client.restartForReplacement();const fresh=ports.at(-1)!;
  await loadValid(f.client,fresh);await launch(f.client,fresh);f.client.feedShipFrame298(.03);const current=last(fresh,'ship-frame-298'),cold=observe(f.client.load(f.raw)),before=fresh.posts.length,states=f.states.length;
  // Numeric identities deliberately coincide; only the actual Worker differs.
  ack(f.port,current);expect(fresh.posts).toHaveLength(before);expect(f.states).toHaveLength(states);expect(rows(fresh,'load')).toHaveLength(1);
  ack(fresh,current);expect(rows(fresh,'load')).toHaveLength(2);const load=last(fresh,'load');fresh.emit({type:'reply',id:load.id,ok:false,outcome:'refused',shipOwnerEpoch298:1,reason:'Declared refusal after actual current ACK'});expect((await cold).ok).toBe(false);expect(f.client.shipCountdownActive298).toBe(true);
 }finally{f.client.dispose();if(waiting)await waiting;}
});

test('cold reservation precedes drain/refused load; Menu before launch posting and front after posting never reactivate the pump',async()=>{
 const f=await setup();
 try{
  await launch(f.client,f.port);f.client.feedShipFrame298(.01);f.client.feedShipFrame298(.02);const first=last(f.port,'ship-frame-298'),status=vi.fn();f.client.onRequestStatus=status;
  const loading=observe(f.client.load(f.raw)),loads=rows(f.port,'load').length;
  await expect(f.client.load(f.raw)).rejects.toMatchObject({outcome:'refused'});expect(rows(f.port,'load')).toHaveLength(loads);
  await vi.advanceTimersByTimeAsync(15001);expect(status).toHaveBeenCalledWith(expect.objectContaining({type:'load',state:'waiting'}));expect(rows(f.port,'load')).toHaveLength(loads);
  ack(f.port,first);const second=last(f.port,'ship-frame-298');expect(second.sequence).toBe(2);expect(rows(f.port,'load')).toHaveLength(loads);
  ack(f.port,second);expect(rows(f.port,'load')).toHaveLength(loads+1);const request=last(f.port,'load');f.port.emit({type:'reply',id:request.id,ok:false,outcome:'refused',shipOwnerEpoch298:1,reason:'Declared load refusal'});expect((await loading).ok).toBe(false);expect(f.client.shipCountdownActive298).toBe(true);
  f.client.feedShipFrame298(.03);const fresh=last(f.port,'ship-frame-298');expect(fresh).toMatchObject({ownerEpoch:1,generation:1,sequence:3,deltas:[Math.fround(.03)]});
  const launchCount=rows(f.port,'ship-launch-298').length,unposted=observe(f.client.launchShip298(123));f.client.cancelShipCountdown298('menu');expect((await unposted).ok).toBe(false);expect(rows(f.port,'ship-launch-298')).toHaveLength(launchCount);expect(last(f.port,'ship-cancel-298')).toMatchObject({reason:'menu',generation:1});
  const cut=f.port.posts.length;ack(f.port,fresh);expect(f.port.posts).toHaveLength(cut);f.port.emit({type:'ship-countdown-state-298',ownerEpoch:1,generation:2,active:false,outcome:'cancelled'});expect(f.client.shipCountdownActive298).toBe(false);
  const starting=observe(f.client.launchShip298(123)),posted=last(f.port,'ship-launch-298');f.client.cancelShipCountdown298('front');const stateMarker=f.states.length;
  f.port.emit({type:'reply',id:posted.id,ok:true,shipOwnerEpoch298:1,data:JSON.stringify({ok:true,ownerEpoch:1,generation:3,active:true})});expect((await starting).ok).toBe(true);expect(last(f.port,'ship-cancel-298')).toMatchObject({reason:'front',generation:3});expect(f.client.shipCountdownActive298).toBe(false);expect(f.states.slice(stateMarker).every(s=>!s.feeding)).toBe(true);
  const monotone=f.states.length;f.port.emit({type:'ship-countdown-state-298',ownerEpoch:1,generation:1,active:false,outcome:'refused'});expect(f.states).toHaveLength(monotone);
  f.port.emit({type:'ship-countdown-state-298',ownerEpoch:1,generation:4,active:false,outcome:'cancelled'});const final=f.port.posts.length;f.client.feedShipFrame298(.1);expect(f.port.posts).toHaveLength(final);expect(f.client.shipCountdownActive298).toBe(false);expect(f.states.some(s=>s.outcome==='departed')).toBe(false);
 }finally{f.client.dispose();}
});
