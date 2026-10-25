/** Real fixed Worker contracts only; the native Playwright spec owns execution. */
import {createNativeCloneResidentLane} from '../../src/bridge/native-clone-resident';
import {ResidentVegetationAssembler} from '../../src/bridge/resident-vegetation-assembler';
import {readResidentWorkerMessage} from '../../src/bridge/resident-protocol';
import type {SnapshotAdoption,SnapshotMessage} from '../../src/bridge/snapshots';
// Small local assertions/registration for these seven native contracts only.
// Playwright is the test runner; there is no browser provider dependency.
type Case={name:string;run:()=>unknown|Promise<unknown>;timeout:number;skip:boolean};
const cases:Case[]=[];
let assertions=0;
function register(name:string,run:Case['run'],timeout=60000){cases.push({name,run,timeout,skip:false});}
const test=Object.assign(register,{
 skipIf:(skip:boolean)=>(name:string,run:Case['run'],timeout=60000)=>cases.push({name,run,timeout,skip}),
});
function equal(a:unknown,b:unknown,partial=false,seen=new WeakMap<object,WeakSet<object>>()):boolean{
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 const prototype=Object.getPrototypeOf(a);
 if(prototype!==Object.prototype&&prototype!==Array.prototype&&prototype!==null)return false;
 if(!partial&&prototype!==Object.getPrototypeOf(b))return false;
 let pair=seen.get(a);if(pair?.has(b))return true;if(!pair){pair=new WeakSet();seen.set(a,pair);}pair.add(b);
 const left=Reflect.ownKeys(a),right=Reflect.ownKeys(b);if(!partial&&left.length!==right.length)return false;
 return right.every(key=>Object.hasOwn(a,key)&&equal(Reflect.get(a,key),Reflect.get(b,key),partial,seen));
}
function expect(actual:unknown){
 const check=(ok:boolean,kind:string)=>{assertions++;if(!ok)throw Error('Browser assertion failed: '+kind);};
 return {
  toBe:(expected:unknown)=>check(Object.is(actual,expected),'toBe '+String(expected)+'; actual '+String(actual)),
  toEqual:(expected:unknown)=>check(equal(actual,expected),'toEqual'),
  toStrictEqual:(expected:unknown)=>check(equal(actual,expected),'toStrictEqual (prototype/own undefined/array holes/-0 preserved)'),
  toMatchObject:(expected:unknown)=>check(equal(actual,expected,true),'toMatchObject'),
  toBeGreaterThan:(expected:number)=>check(typeof actual==='number'&&actual>expected,'toBeGreaterThan '+expected),
 };
}
export async function runBrowserContracts(){
 if(typeof Worker!=='function'||typeof document==='undefined')throw Error('A real browser Worker and document are mandatory');
 const results:{name:string;status:'passed';assertions:number}[]=[];
 for(const item of cases){
  if(item.skip)throw Error('Browser contract unexpectedly skipped: '+item.name);
  const before=assertions;let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   await Promise.race([Promise.resolve().then(item.run),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Contract timeout: '+item.name)),item.timeout);})]);
   results.push({name:item.name,status:'passed',assertions:assertions-before});
  }catch(error){throw Error(item.name+': '+(error instanceof Error?error.stack:String(error)));}
  finally{if(timer)clearTimeout(timer);}
 }
 if(results.length!==8)throw Error('Expected exactly eight real Worker browser cases; found '+results.length);
 return {status:'passed',tests:results.length,assertions,results,renderer:false,scope:'Seven original clone contracts plus real Worker deferred receipt once/close/reentrance/header contracts; no renderer or Main scheduling claim'};
}


test.skipIf(typeof Worker!=='function'||typeof document==='undefined')('real Worker clone source, strict copy and independent authentic delta admission',async()=>{
 const lane=createNativeCloneResidentLane(),worker=lane.createWorker(),strict=new ResidentVegetationAssembler();
 const replies=new Map<number,{resolve:()=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 let nextId=0,copyNext=false,held:unknown;
 const request=(payload:Record<string,unknown>)=>new Promise<void>((resolve,reject)=>{
  const id=++nextId,timer=setTimeout(()=>{replies.delete(id);reject(Error('Worker reply timeout'));},12000);
  replies.set(id,{resolve,reject,timer});worker.postMessage({...payload,id});
 });
 worker.onmessage=event=>{
  try{
   lane.withWorkerMessage(worker,event,()=>{
    const data=readResidentWorkerMessage(event.data);
    if(data.type==='snapshot'){
     const reference=readResidentWorkerMessage(structuredClone(event.data));
     if(reference.type!=='snapshot')throw Error('strict snapshot');
     const expected=strict.adopt(reference);
     const selected=copyNext?readResidentWorkerMessage(structuredClone(event.data)):data;copyNext=false;
     if(selected.type!=='snapshot')throw Error('selected snapshot');
     const actual=lane.reader.adopt(selected);
     expect(expected.status).toBe('applied');expect(actual.status).toBe('applied');
     if(expected.status!=='applied'||actual.status!=='applied')throw Error('admission refused');
     expect(actual.world).toStrictEqual(expected.world);held=data;
    }else if(data.type==='reply'){
     const pending=replies.get(data.id);if(!pending)return;
     clearTimeout(pending.timer);replies.delete(data.id);
     if(data.ok)pending.resolve();else pending.reject(Error(data.reason??'refused'));
    }else if(data.type==='fault')throw Error(data.reason);
   });
  }catch(error){for(const p of replies.values()){clearTimeout(p.timer);p.reject(error instanceof Error?error:Error(String(error)));}replies.clear();}
 };
 try{
  await request({type:'init',seed:474,size:32,paused:true});
  expect(lane.diagnostics().fastAdoptions).toBe(1);
  expect(lane.diagnostics().fastLaneReads).toBeGreaterThan(0);
  // A synthetic Event targets the real Worker, but cannot mint isTrusted.
  const before=lane.diagnostics();
  worker.dispatchEvent(new MessageEvent('message',{data:{type:'reply',id:0,ok:true}}));
  expect(lane.diagnostics()).toEqual(before);
  copyNext=true;await request({type:'speed',speed:0});
  expect(lane.diagnostics()).toMatchObject({fastAdoptions:1,strictAdoptions:1});
  await request({type:'speed',speed:0});
  expect(lane.diagnostics()).toMatchObject({fastAdoptions:2,strictAdoptions:1});
  await request({type:'resync'});
  expect(lane.diagnostics().fastAdoptions).toBe(3);
  const count=lane.diagnostics().fastAdoptions;
  if(!held||typeof held!=='object'||!('type'in held)||held.type!=='snapshot')throw Error('retained snapshot');
  // The exact authentic object is now outside its callback/lease and stale.
  expect(lane.reader.adopt(held as Parameters<typeof lane.reader.adopt>[0]).status).toBe('stale');
  expect(lane.diagnostics().fastAdoptions).toBe(count);
 }finally{
  lane.close();worker.terminate();
  for(const p of replies.values())clearTimeout(p.timer);replies.clear();
 }
},60000);




type Data=Record<string,unknown>;
const snapshot=(raw:unknown):SnapshotMessage<true>|undefined=>{
 const row=raw as Data|undefined,p=row?.publication as SnapshotMessage<true>|undefined;
 return row?.type==='resident-publication'&&p?.type==='snapshot'?p:undefined;
};
const hiddenBranch=(row:object)=>new Proxy({...row,structures:[{kind:'firefoam-popper',material:'wood'}]},{
 has:(target,key)=>key==='structures'?false:Reflect.has(target,key),
});
async function realHarness(run:(h:{
 lane:ReturnType<typeof createNativeCloneResidentLane>;worker:Worker;
 send:(payload:Data)=>Promise<void>;
 seen:{actual:SnapshotAdoption;expected:SnapshotAdoption}[];
 before:(action:(packet:SnapshotMessage<true>)=>void)=>void;
})=>Promise<void>){
 const lane=createNativeCloneResidentLane(),worker=lane.createWorker(),strict=new ResidentVegetationAssembler();
 const references=new WeakMap<object,unknown>(),seen:{actual:SnapshotAdoption;expected:SnapshotAdoption}[]=[];
 const pending=new Map<number,{resolve:()=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 let sequence=0,mutate:((packet:SnapshotMessage<true>)=>void)|undefined;
 // The lane's private native capture listener was registered before this one.
 worker.addEventListener('message',event=>{
  const reference=structuredClone(event.data);references.set(event,reference);
  const packet=snapshot(event.data),copy=snapshot(reference);
  if(packet&&copy&&mutate){const action=mutate;mutate=undefined;action(packet);action(copy);}
 });
 worker.onmessage=event=>{
  try{lane.withWorkerMessage(worker,event,()=>{
   const data=readResidentWorkerMessage(event.data);
   if(data.type==='snapshot'){
    const reference=readResidentWorkerMessage(references.get(event));if(reference.type!=='snapshot')throw Error('reference snapshot');
    seen.push({expected:strict.adopt(reference),actual:lane.reader.adopt(data)});
   }else if(data.type==='reply'){
    const reply=pending.get(data.id);if(!reply)return;clearTimeout(reply.timer);pending.delete(data.id);
    if(data.ok)reply.resolve();else reply.reject(Error(data.reason??'refused'));
   }else if(data.type==='fault')throw Error(data.reason);
  });}catch(error){for(const reply of pending.values()){clearTimeout(reply.timer);reply.reject(error instanceof Error?error:Error(String(error)));}pending.clear();}
 };
 const send=(payload:Data)=>new Promise<void>((resolve,reject)=>{
  const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Worker reply timeout'));},12000);
  pending.set(id,{resolve,reject,timer});worker.postMessage({...payload,id});
 });
 try{await run({lane,worker,send,seen,before:action=>{mutate=action;}});}
 finally{lane.close();worker.terminate();for(const reply of pending.values())clearTimeout(reply.timer);pending.clear();}
}
const browser=typeof Worker==='function'&&typeof document!=='undefined';

test.skipIf(!browser)('R2 refuses an inserted self-erasing packet.world getter without invoking it',async()=>{
 const witnesses:{calls:number}[]=[];
 await realHarness(async h=>{
  h.before(packet=>{
   const world=packet.world,witness={calls:0};witnesses.push(witness);
   Object.defineProperty(packet,'world',{enumerable:true,configurable:true,get(){
    witness.calls++;
    Object.defineProperty(packet,'world',{value:world,writable:true,enumerable:true,configurable:true});
    return world;
   }});
  });
  await h.send({type:'init',seed:474,size:32,paused:true});
  expect(witnesses.length).toBe(2);for(const witness of witnesses)expect(witness.calls).toBe(0);
  expect(h.seen.at(-1)?.expected.status).toBe('resync');expect(h.seen.at(-1)?.actual.status).toBe('resync');
  expect(h.lane.diagnostics().fastAdoptions).toBe(0);
 });
},60000);

test.skipIf(!browser)('R2 rechecks a branded ancestor prototype after an unknown child reenters during Firefoam scanning',async()=>{
 const witnesses:{triggered:boolean;hasCalls:number}[]=[];
 await realHarness(async h=>{
  h.before(packet=>{
   const ancestor=packet.world.pawns[0] as unknown as Data;if(!ancestor)throw Error('fixture needs a pawn');
   const witness={triggered:false,hasCalls:0};witnesses.push(witness);
   const inherited=new Proxy(Object.prototype,{
    has:(target,key)=>{
     if(key!=='structures')return Reflect.has(target,key);
     witness.hasCalls++;
     // Old has-first does two inherited has calls, erases the evidence, and
     // reaches the next scanner with an ordinary prototype. Strict does one.
     if(witness.hasCalls===2){Object.setPrototypeOf(ancestor,Object.prototype);return false;}
     return true;
    },
   });
   ancestor.world=new Proxy({}, {
    getPrototypeOf:target=>{
     // Other earlier historical guards visit this same custody lane. Inject
     // specifically once inside Firefoam, after its ancestor plain check.
     if(!witness.triggered&&/firefoam-save-290\.ts/.test(new Error().stack??'')){
      witness.triggered=true;Object.setPrototypeOf(ancestor,inherited);
     }
     return Reflect.getPrototypeOf(target);
    },
   });
  });
  await h.send({type:'init',seed:474,size:32,paused:true});
  expect(witnesses.length).toBe(2);
  for(const witness of witnesses){expect(witness.triggered).toBe(true);expect(witness.hasCalls).toBe(1);}
  expect(h.seen.at(-1)?.expected.status).toBe('resync');expect(h.seen.at(-1)?.actual.status).toBe('resync');
  expect(h.lane.diagnostics().fastAdoptions).toBe(0);
 });
},60000);

test.skipIf(!browser)('R2 rejects a Proxy inserted by a listener after native capture and recovers at a fresh checkpoint',async()=>{
 await realHarness(async h=>{
  h.before(packet=>{
   const pawns=packet.world.pawns as unknown as object[];if(!pawns[0])throw Error('fixture needs a pawn');
   pawns[0]=hiddenBranch(pawns[0]);
  });
  await h.send({type:'init',seed:474,size:32,paused:true});
  expect(h.seen.at(-1)?.expected.status).toBe('resync');expect(h.seen.at(-1)?.actual.status).toBe('resync');
  expect(h.lane.diagnostics().fastAdoptions).toBe(0);
  await h.send({type:'resync'});
  const restored=h.seen.at(-1)!;expect(restored.expected.status).toBe('applied');expect(restored.actual.status).toBe('applied');
  if(restored.actual.status==='applied'&&restored.expected.status==='applied')expect(restored.actual.world).toStrictEqual(restored.expected.world);
  expect(h.lane.diagnostics().fastAdoptions).toBe(1);
 });
},60000);

test.skipIf(!browser)('R2 keeps a Proxy inserted into a retained predecessor on strict lane reads',async()=>{
 await realHarness(async h=>{
  await h.send({type:'init',seed:474,size:32,paused:true});
  const initial=h.seen.at(-1)!;expect(initial.actual.status).toBe('applied');expect(initial.expected.status).toBe('applied');
  if(initial.actual.status!=='applied'||initial.expected.status!=='applied')throw Error('initial admission');
  const actual=initial.actual.world.piles,expected=initial.expected.world.piles;
  if(!actual[0]||!expected[0])throw Error('fixture needs an initial supply pile');
  const oldActual=actual[0],oldExpected=expected[0];
  actual[0]=hiddenBranch(oldActual) as unknown as typeof oldActual;expected[0]=hiddenBranch(oldExpected) as unknown as typeof oldExpected;
  try{
   await h.send({type:'speed',speed:0});
   expect(h.seen.at(-1)?.expected.status).toBe('resync');expect(h.seen.at(-1)?.actual.status).toBe('resync');
   expect(h.lane.diagnostics().fastAdoptions).toBe(1);
  }finally{actual[0]=oldActual;expected[0]=oldExpected;}
  await h.send({type:'resync'});
  const restored=h.seen.at(-1)!;expect(restored.expected.status).toBe('applied');expect(restored.actual.status).toBe('applied');
  if(restored.actual.status==='applied'&&restored.expected.status==='applied')expect(restored.actual.world).toStrictEqual(restored.expected.world);
 });
},60000);

for(const mode of ['synthetic','wrapped'] as const)test.skipIf(!browser)('R2 '+mode+' Event on the actual source cannot grant a clone receipt',async()=>{
 const lane=createNativeCloneResidentLane(),worker=lane.createWorker();
 const pending=new Map<number,{resolve:()=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 let sequence=0,first=true;const observed:{last?:SnapshotAdoption}={};
 const send=(payload:Data)=>new Promise<void>((resolve,reject)=>{
  const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Worker reply timeout'));},12000);
  pending.set(id,{resolve,reject,timer});worker.postMessage({...payload,id});
 });
 const dispatch=(proof:MessageEvent<unknown>,raw:unknown)=>lane.withWorkerMessage(worker,proof,()=>{
  const data=readResidentWorkerMessage(raw);
  if(data.type==='snapshot')observed.last=lane.reader.adopt(data);
  else if(data.type==='reply'){
   const reply=pending.get(data.id);if(!reply)return;clearTimeout(reply.timer);pending.delete(data.id);
   if(data.ok)reply.resolve();else reply.reject(Error(data.reason??'refused'));
  }else if(data.type==='fault')throw Error(data.reason);
 });
 worker.onmessage=event=>{
  try{
   if(first&&snapshot(event.data)){
    first=false;
    if(mode==='synthetic')worker.dispatchEvent(new MessageEvent('message',{data:structuredClone(event.data)}));
    else dispatch(new Proxy(event,{}),event.data);
    return;
   }
   dispatch(event,event.data);
  }catch(error){for(const reply of pending.values()){clearTimeout(reply.timer);reply.reject(error instanceof Error?error:Error(String(error)));}pending.clear();}
 };
 try{
  await send({type:'init',seed:474,size:32,paused:true});
  expect(observed.last?.status).toBe('applied');expect(lane.diagnostics()).toMatchObject({fastAdoptions:0,strictAdoptions:1,fastLaneReads:0});
  await send({type:'resync'});
  expect(observed.last?.status).toBe('applied');expect(lane.diagnostics().fastAdoptions).toBe(1);
 }finally{lane.close();worker.terminate();for(const reply of pending.values())clearTimeout(reply.timer);pending.clear();}
},60000);

// This eighth registration is independent of the seven retained legacy cases.
// Only actual Worker message dispatch can mint these tickets; no trust getter,
// MessagePort stub, callback granting a receipt, or synthetic applied result.
test.skipIf(typeof Worker!=='function'||typeof document==='undefined')('FIFO real Worker deferred header capture, once, closed source and consumed reentrant ticket',async()=>{
 type Lane=ReturnType<typeof createNativeCloneResidentLane>;
 type Ticket=NonNullable<ReturnType<Lane['takeDeferredMessage']>>;
 const capture=(lane:Lane,worker:Worker,deliver:(raw:unknown,reference:unknown)=>void,mutateHeaders=false)=>new Promise<{ticket:Ticket;event:MessageEvent;reference:unknown}>((resolve,reject)=>{
  const timer=setTimeout(()=>{worker.removeEventListener('message',listen);reject(Error('Real Worker deferred snapshot timeout'));},12000);
  const listen=(event:MessageEvent<unknown>)=>{
   if(!snapshot(event.data))return;
   try{
    const reference=structuredClone(event.data),expected=snapshot(reference)!;
    expect(event.isTrusted).toBe(true);expect(event.currentTarget).toBe(worker);
    const ticket=lane.takeDeferredMessage(worker,event,raw=>deliver(raw,reference));
    expect(ticket===undefined).toBe(false);expect(lane.takeDeferredMessage(worker,event,()=>{throw Error('Duplicate ticket dispatched');})).toBe(undefined);
    if(!ticket)throw Error('Actual Worker Event did not produce a deferred ticket');
    // The original Node fixture used epoch1/tick4. Here both values come from
    // this actual SIM publication, without manufacturing a publication.
    expect(ticket).toMatchObject({epoch:expected.epoch,tick:expected.world.tick});expect(Number.isFinite(ticket.arrivalAt)).toBe(true);
    if(mutateHeaders){const raw=event.data as Data,p=snapshot(raw)! as unknown as Data;raw.version=-1;p.epoch=-1;p.revision=-1;}
    clearTimeout(timer);worker.removeEventListener('message',listen);
    // A later TASK is intentional: an await alone may checkpoint between
    // native listeners while Event.currentTarget is still the real source.
    setTimeout(()=>resolve({ticket,event,reference}),0);
   }catch(error){clearTimeout(timer);worker.removeEventListener('message',listen);reject(error);}
  };
  worker.addEventListener('message',listen);
 });
 const old=createNativeCloneResidentLane(),oldWorker=old.createWorker(),oldStrict=new ResidentVegetationAssembler();
 let dispatches=0,oldTicket:Ticket|undefined;const seen:number[]=[];
 try{
  const first=capture(old,oldWorker,(raw,reference)=>{
   dispatches++;const actual=readResidentWorkerMessage(raw),expected=readResidentWorkerMessage(reference);
   if(actual.type!=='snapshot'||expected.type!=='snapshot')throw Error('Deferred snapshot missing');
   expect(actual.epoch).toBe(expected.epoch);expect(actual.revision).toBe(expected.revision);
   const a=old.reader.adopt(actual),b=oldStrict.adopt(expected);expect(a.status).toBe('applied');expect(b.status).toBe('applied');
   if(a.status!=='applied'||b.status!=='applied')throw Error('Deferred authentic admission refused');expect(a.world).toStrictEqual(b.world);
  },true);
  oldWorker.postMessage({type:'init',id:1,seed:474,size:32,paused:true});
  const held=await first;expect(held.event.currentTarget).toBe(null);expect(dispatches).toBe(0);
  held.ticket.run();held.ticket.run();expect(dispatches).toBe(1);expect(old.diagnostics().fastAdoptions).toBe(1);
  const closing=capture(old,oldWorker,()=>seen.push(1));oldWorker.postMessage({type:'resync',id:2});oldTicket=(await closing).ticket;
  old.close();oldTicket.run();expect(seen).toEqual([]);
 }finally{old.close();oldWorker.terminate();}
 const fresh=createNativeCloneResidentLane(),freshWorker=fresh.createWorker(),freshStrict=new ResidentVegetationAssembler();
 const tickets:Ticket[]=[];let reentrantAttempts=0;
 try{
  const first=capture(fresh,freshWorker,(raw,reference)=>{
   seen.push(2);let error='';reentrantAttempts++;
   try{tickets[1]!.run();}catch(caught){error=caught instanceof Error?caught.message:String(caught);}
   expect(error).toBe('Reentrant deferred native receipt');
   const actual=readResidentWorkerMessage(raw),expected=readResidentWorkerMessage(reference);
   if(actual.type!=='snapshot'||expected.type!=='snapshot')throw Error('Fresh deferred snapshot missing');
   const a=fresh.reader.adopt(actual),b=freshStrict.adopt(expected);expect(a.status).toBe('applied');expect(b.status).toBe('applied');
   if(a.status!=='applied'||b.status!=='applied')throw Error('Fresh deferred admission refused');expect(a.world).toStrictEqual(b.world);
  });
  freshWorker.postMessage({type:'init',id:1,seed:475,size:32,paused:true});tickets.push((await first).ticket);
  const second=capture(fresh,freshWorker,()=>seen.push(3));freshWorker.postMessage({type:'resync',id:2});tickets.push((await second).ticket);
  expect(seen).toEqual([]);tickets[0]!.run();expect(seen).toEqual([2]);expect(reentrantAttempts).toBe(1);
  tickets[1]!.run();tickets[0]!.run();expect(seen).toEqual([2]);expect(fresh.diagnostics().fastAdoptions).toBe(1);
  oldTicket!.run();expect(seen).toEqual([2]);
 }finally{fresh.close();freshWorker.terminate();}
},90000);
