import {afterEach,describe,expect,it,vi} from 'vitest';
import {MessageChannel as NodeMessageChannel} from 'node:worker_threads';
import {MainFrameAdmissionFIFO,MAIN_FRAME_ADMISSION_CAPACITY,type MainFrameAdmissionHost} from '../src/bridge/main-frame-admission-fifo';
import {captureNativeMessageForDeferred} from '../src/bridge/native-message-capture';
import {createNativeCloneResidentLane} from '../src/bridge/native-clone-resident';
import {SimulationClient,type SnapshotReader} from '../src/bridge/SimulationClient';
import type {Request,Response} from '../src/bridge/protocol';
import type {World} from '../src/sim/types';

class Host implements MainFrameAdmissionHost {
 time=100;tasks:(()=>void)[]=[];errors:unknown[]=[];closed=0;posts=0;
 now(){return this.time;}
 post(task:()=>void){this.posts++;this.tasks.push(task);}
 report(error:unknown){this.errors.push(error);}
 close(){this.closed++;}
 turn(){const task=this.tasks.shift();if(!task)throw Error('No actual posted macro task');task();}
}
const microtasks=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('MAIN FIFO scheduling, no native-provenance claim',()=>{
 it('keeps every publication/control in exact order and drains one entry per frame',async()=>{
  const host=new Host(),seen:string[]=[],queue=new MainFrameAdmissionFIFO(()=>true,()=>{throw Error('overflow');},host);
  for(const name of ['checkpoint','reply-init','delta1','audio','reply-save','delta2'])queue.enqueue(()=>seen.push(name));
  expect(seen).toEqual([]);expect(host.tasks).toHaveLength(0);
  await microtasks();expect(seen).toEqual([]);
  queue.drainFrame();expect(seen).toEqual(['checkpoint']);expect(queue.diagnostics().depth).toBe(5);
  await microtasks();expect(seen).toEqual(['checkpoint']);
  for(let frame=0;frame<5;frame++)queue.drainFrame();
  expect(seen).toEqual(['checkpoint','reply-init','delta1','audio','reply-save','delta2']);
  expect(queue.diagnostics()).toMatchObject({received:6,dispatched:6,maxDepth:6,depth:0});queue.close();
 });
 it('runs startup immediately without needing a renderer then keeps its correlated reply queued',()=>{
  const host=new Host(),seen:string[]=[];let frame=false;
  const queue=new MainFrameAdmissionFIFO(()=>frame,()=>{throw Error('overflow');},host);
  queue.enqueue(()=>{seen.push('init-checkpoint');frame=true;});
  queue.enqueue(()=>seen.push('init-reply'));
  expect(seen).toEqual(['init-checkpoint']);expect(queue.diagnostics().depth).toBe(1);
  queue.drainFrame();expect(seen).toEqual(['init-checkpoint','init-reply']);queue.close();
 });
 it('uses separate macro turns during load/renderer loss, never a Promise microtask batch',async()=>{
  const host=new Host(),seen:number[]=[];let frame=true;
  const queue=new MainFrameAdmissionFIFO(()=>frame,()=>{throw Error('overflow');},host);
  for(let n=1;n<=3;n++)queue.enqueue(()=>seen.push(n));
  frame=false;queue.notifyAvailability();queue.notifyAvailability();expect(host.tasks).toHaveLength(1);
  await microtasks();expect(seen).toEqual([]);
  host.turn();expect(seen).toEqual([1]);expect(host.tasks).toHaveLength(1);
  await microtasks();expect(seen).toEqual([1]);
  host.turn();expect(seen).toEqual([1,2]);host.turn();expect(seen).toEqual([1,2,3]);queue.close();
 });
 it('the real default MessageChannel host yields a microtask checkpoint between dispatched entries',async()=>{
  vi.stubGlobal('MessageChannel',NodeMessageChannel);
  let frame=true,complete!:()=>void;const done=new Promise<void>(resolve=>{complete=resolve;});
  const seen:number[]=[],afterTurn:number[][]=[],queue=new MainFrameAdmissionFIFO(()=>frame,()=>{throw Error('overflow');});
  try{
   for(let n=1;n<=3;n++)queue.enqueue(()=>{seen.push(n);queueMicrotask(()=>afterTurn.push([...seen]));if(n===3)complete();});
   frame=false;queue.notifyAvailability();await microtasks();expect(seen).toEqual([]);
   await done;await microtasks();expect(afterTurn).toEqual([[1],[1,2],[1,2,3]]);
  }finally{queue.close();}
 });
 it('does not let a stale macro dispatch another entry when a frame becomes available',()=>{
  const host=new Host(),seen:number[]=[];let frame=true;
  const queue=new MainFrameAdmissionFIFO(()=>frame,()=>{throw Error('overflow');},host);
  queue.enqueue(()=>seen.push(1));queue.enqueue(()=>seen.push(2));frame=false;queue.notifyAvailability();
  frame=true;host.turn();expect(seen).toEqual([]);
  queue.drainFrame();expect(seen).toEqual([1]);expect(host.tasks).toHaveLength(0);
  queue.drainFrame();expect(seen).toEqual([1,2]);queue.close();
 });
 it('keeps reentrant enqueue behind pending work and refuses a nested frame drain',()=>{
  const host=new Host(),seen:string[]=[],queue=new MainFrameAdmissionFIFO(()=>true,()=>{throw Error('overflow');},host);
  queue.enqueue(()=>{seen.push('A');queue.enqueue(()=>seen.push('C'));queue.drainFrame();});
  queue.enqueue(()=>seen.push('B'));queue.drainFrame();expect(seen).toEqual(['A']);
  queue.drainFrame();expect(seen).toEqual(['A','B']);queue.drainFrame();expect(seen).toEqual(['A','B','C']);queue.close();
 });
 it('reports a thrown dispatch once and preserves the following entry for a later frame',()=>{
  const host=new Host(),seen:string[]=[],error=Error('dispatch callback');
  const queue=new MainFrameAdmissionFIFO(()=>true,()=>{throw Error('overflow');},host);
  queue.enqueue(()=>{throw error;});queue.enqueue(()=>seen.push('next'));
  queue.drainFrame();expect(host.errors).toEqual([error]);expect(seen).toEqual([]);
  queue.drainFrame();expect(seen).toEqual(['next']);expect(queue.diagnostics().dispatched).toBe(2);queue.close();
 });
 it('bounds the backlog, closes once on overflow, and never dispatches abandoned entries',()=>{
  const host=new Host(),overflow=vi.fn(),seen=vi.fn();let frame=true;
  const queue=new MainFrameAdmissionFIFO(()=>frame,overflow,host);
  for(let n=0;n<MAIN_FRAME_ADMISSION_CAPACITY;n++)expect(queue.enqueue(seen)).toBe(true);
  frame=false;queue.notifyAvailability();expect(host.tasks).toHaveLength(1);
  expect(queue.enqueue(seen)).toBe(false);expect(overflow).toHaveBeenCalledOnce();expect(host.closed).toBe(1);
  host.turn();queue.drainFrame();expect(queue.enqueue(seen)).toBe(false);expect(seen).not.toHaveBeenCalled();
  expect(queue.diagnostics()).toMatchObject({closed:true,depth:0,overflow:1});queue.close();expect(host.closed).toBe(1);
 });
 it('old-source pending task stays inert after close while a fresh source gets its own FIFO',()=>{
  const oldHost=new Host(),freshHost=new Host(),seen:string[]=[];let frame=true;
  const old=new MainFrameAdmissionFIFO(()=>frame,()=>{},oldHost);old.enqueue(()=>seen.push('old'));
  frame=false;old.notifyAvailability();old.close();
  const fresh=new MainFrameAdmissionFIFO(()=>true,()=>{},freshHost);fresh.enqueue(()=>seen.push('fresh'));
  oldHost.turn();old.drainFrame();expect(seen).toEqual([]);
  fresh.drainFrame();expect(seen).toEqual(['fresh']);fresh.close();
 });
 it('records actual dispatch/adoption lag and does not subtract ticks across epochs',()=>{
  const host=new Host();let queue:MainFrameAdmissionFIFO;
  queue=new MainFrameAdmissionFIFO(()=>true,()=>{},host);
  queue.enqueue(()=>{host.time=115;queue.recordApplied(10);},{arrivalAt:100,epoch:1,tick:10});
  queue.enqueue(()=>queue.recordApplied(20),{arrivalAt:101,epoch:1,tick:20});
  host.time=110;queue.drainFrame();expect(queue.diagnostics()).toMatchObject({tickLag:10,maxTickLag:10,arrivalToDispatchCount:1,arrivalToAdoptCount:1,arrivalToAdoptMaxMs:15});
  queue.enqueue(()=>queue.recordApplied(1),{epoch:2,tick:1});expect(queue.diagnostics().tickLag).toBeNull();
  queue.drainFrame();queue.drainFrame();expect(queue.diagnostics()).toMatchObject({appliedEpoch:2,appliedTick:1,tickLag:0});queue.close();
 });
});

describe('deferred native message representation only',()=>{
 it('retains the exact World/patch references, privately copies only selected controls',()=>{
  const world={tick:4},patch={removed:[],upserted:[]},urgent={rows:[{id:1}]},motion={rows:[{id:2}]},audio=[{kind:'test'}];
  const raw={type:'resident-publication',publication:{type:'snapshot',kind:'delta',epoch:1,revision:2,baseRevision:1,world,piles:patch,urgentThreats:urgent,motion,audioCues:audio}};
  const held=captureNativeMessageForDeferred(raw) as typeof raw;
  expect(held).not.toBe(raw);expect(held.publication).not.toBe(raw.publication);expect(held.publication.world).toBe(world);expect(held.publication.piles).toBe(patch);
  expect(held.publication.urgentThreats).not.toBe(urgent);expect(held.publication.urgentThreats).toEqual(urgent);
  urgent.rows[0]!.id=9;motion.rows[0]!.id=9;audio[0]!.kind='changed';
  expect(held.publication.urgentThreats.rows[0]!.id).toBe(1);expect(held.publication.motion.rows[0]!.id).toBe(2);expect(held.publication.audioCues[0]!.kind).toBe('test');
  expect(Object.isFrozen(held)).toBe(true);expect(Object.isFrozen(held.publication.urgentThreats.rows)).toBe(true);expect(Object.isFrozen(world)).toBe(false);
  let reads=0;const opaqueWorld={get pawns(){reads++;throw Error('World must not be observed by transport capture');}};
  const opaque=captureNativeMessageForDeferred({type:'resident-publication',publication:{world:opaqueWorld}}) as {publication:{world:unknown}};
  expect(opaque.publication.world).toBe(opaqueWorld);expect(reads).toBe(0);
 });
 it('retains checkpoint ACK identity values and refuses accessors without invoking them',()=>{
  const checkpoint={epoch:3,revision:8},raw={type:'reply',id:7,ok:true,checkpoint};
  const held=captureNativeMessageForDeferred(raw) as typeof raw;checkpoint.revision=99;
  expect(held.checkpoint).toEqual({epoch:3,revision:8});expect(Object.isFrozen(held.checkpoint)).toBe(true);
  let reads=0;const getter={type:'reply',id:7,get checkpoint(){reads++;return {epoch:3,revision:8};}};
  expect(()=>captureNativeMessageForDeferred(getter)).toThrow();expect(reads).toBe(0);
 });
});

// Real Node MessagePort deliveries exercise native Event getters/currentTarget
// and one-use transport scopes. This is not browser Worker/World admission proof.
function nativePort(){
 const channel=new NodeMessageChannel();
 vi.stubGlobal('Worker',function(){return channel.port1;});
 const lane=createNativeCloneResidentLane(),source=lane.createWorker();channel.port1.start();
 return {lane,source,send:(raw:unknown)=>channel.port2.postMessage(raw),close(){lane.close();channel.port1.close();channel.port2.close();}};
}
const publication=(epoch=1)=>({type:'resident-publication',publication:{type:'snapshot',kind:'checkpoint',epoch,revision:1,speed:0,stepMs:0,world:{tick:4}}});
describe('one-use deferred ticket transport bounds',()=>{

 it('rejects a wrong source, wrapper/synthetic event and retrieval after native dispatch',async()=>{
  const f=nativePort(),other=new NodeMessageChannel();let event!:MessageEvent,wrong:unknown,wrapped:unknown;
  try{
   await new Promise<void>(resolve=>{f.source.addEventListener('message',e=>{
    event=e;wrong=f.lane.takeDeferredMessage(other.port1 as unknown as Worker,e,()=>{});
    wrapped=f.lane.takeDeferredMessage(f.source,new Proxy(e,{}),()=>{});resolve();
   },{once:true});f.send(publication());});
   expect(wrong).toBeUndefined();expect(wrapped).toBeUndefined();
   expect(f.lane.takeDeferredMessage(f.source,event,()=>{})).toBeUndefined();
   let synthetic:unknown='not-dispatched';f.source.addEventListener('message',e=>{synthetic=f.lane.takeDeferredMessage(f.source,e,()=>{});},{once:true});
   f.source.dispatchEvent(new MessageEvent('message',{data:publication()}));expect(synthetic).toBeUndefined();
  }finally{f.close();other.port1.close();other.port2.close();}
 });


});

class Port {
 onmessage?:((event:MessageEvent<unknown>)=>void)|null;onerror?:unknown;onmessageerror?:unknown;
 requests:Request[]=[];terminated=0;postMessage(request:Request){this.requests.push(request);}terminate(){this.terminated++;}
 emit(raw:unknown){this.onmessage?.({data:raw} as MessageEvent<unknown>);}
}
function clientTransport(){
 const ports:Port[]=[];let canFrame=false;
 const queues=new WeakMap<object,MainFrameAdmissionFIFO>();
 const queue=(client:object)=>{let q=queues.get(client);if(!q){q=new MainFrameAdmissionFIFO(()=>canFrame,()=>{throw Error('overflow');},new Host());queues.set(client,q);}return q;};
 class Client extends SimulationClient {
  protected override createWorker():Worker{const port=new Port();ports.push(port);return port as unknown as Worker;}
  protected override createDecoder():SnapshotReader{
   let epoch=0;
   return {adopt(packet){if(packet.kind!=='checkpoint')throw Error('Checkpoint-only transport test decoder');const replaced=packet.epoch!==epoch;epoch=packet.epoch;return {status:'applied',world:packet.world,replaced};},
    adoptCampaignOnly(){throw Error('not used');},prepareDraftPreview(){throw Error('not used');},authorizeDraftPreview(){throw Error('not used');},discardDraftPreview(){}};
  }
  protected override dispatchWorkerMessage(_source:Worker,event:MessageEvent<unknown>,dispatch:(raw:unknown)=>void){queue(this).enqueue(()=>dispatch(event.data));}
  protected override workerStopped(_source:Worker){queues.get(this)?.close();queues.delete(this);}
 }
 const client=new Client();return {client,ports,frame:()=>queue(client).drainFrame(),ready(value:boolean){canFrame=value;}};
}
const checkpoint=(epoch:number,tick=1)=>({type:'snapshot',kind:'checkpoint',epoch,revision:1,speed:0,stepMs:0,world:{tick} as World,urgentThreats:{generation:1,serial:0,pauseRevision:0,urgentHeld:false,rows:[]}} as Response);
describe('base client dispatch hook correlation (decoder double, no World proof)',()=>{
 it('startup checkpoint may create the renderer; init/load ACK still waits in the FIFO',async()=>{
  const f=clientTransport(),seen:number[]=[];let done=false;
  try{
   f.client.onSnapshot=world=>{seen.push(world.tick);f.ready(true);};
   const load=f.client.load('startup-raw').then(()=>{done=true;}),id=f.ports[0]!.requests[0]!.id;
   f.ports[0]!.emit(checkpoint(1));f.ports[0]!.emit({type:'reply',id,ok:true,checkpoint:{epoch:1,revision:1}});
   await microtasks();expect(seen).toEqual([1]);expect(done).toBe(false);
   f.frame();await load;expect(done).toBe(true);
   let replaced=false;const second=f.client.load('replacement-raw').then(()=>{replaced=true;}),nextId=f.ports[0]!.requests.at(-1)!.id;
   f.ports[0]!.emit({type:'reply',id:nextId,ok:true,checkpoint:{epoch:2,revision:1}});f.ports[0]!.emit(checkpoint(2,2));
   f.frame();await microtasks();expect(replaced).toBe(false);expect(seen).toEqual([1]);
   f.frame();await second;expect(replaced).toBe(true);expect(seen).toEqual([1,2]);
  }finally{f.client.dispose();}
 });
 it('stop discards an old queued delivery and restart requires the fresh source checkpoint',async()=>{
  const f=clientTransport(),seen:number[]=[];
  try{
   f.ready(true);f.client.onSnapshot=world=>seen.push(world.tick);
   const pending=f.client.load('old-raw'),rejected=pending.catch(error=>error);f.ports[0]!.emit(checkpoint(1));
   f.client.stop('intentional transport stop');expect((await rejected).message).toContain('intentional');
   f.client.restartForReplacement();const replacement=f.client.load('fresh-raw'),port=f.ports[1]!,id=port.requests[0]!.id;
   f.ports[0]!.emit(checkpoint(9,9));port.emit({type:'reply',id,ok:true,checkpoint:{epoch:2,revision:1}});port.emit(checkpoint(2,2));
   f.frame();await microtasks();expect(seen).toEqual([]);f.frame();await replacement;expect(seen).toEqual([2]);expect(f.ports[0]!.terminated).toBe(1);
  }finally{f.client.dispose();}
 });
});
