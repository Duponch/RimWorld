import {afterEach,expect,test,vi} from 'vitest';
import {startSimulationWorker} from '../src/bridge/simulation-runtime.ts';
import {SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {declaredReadyShip298} from './helpers/declared-ready-ship298.ts';
import type {ShipFrameAck298,ShipCountdownState298} from '../src/bridge/ship-countdown-wire-298.ts';

/* Four NEW runtime contracts. Only host task delivery/monotonic wall time are
 * controlled. The actual load owns its deserialized World; no input fixture,
 * fake coordinator, timer, finalizer or callback is substituted for that owner. */
type Wire=Record<string,any>;
const hosts:{close():void}[]=[];
afterEach(()=>{for(const h of hosts.splice(0))h.close();vi.restoreAllMocks();vi.unstubAllGlobals();});
function whole(text:string){const w=deserializeWorld(text);expect(validateWorld(w)).toEqual([]);expect(serializeWorld(w)).toBe(text);return w;}
function host(){
 let now=1000,wake=()=>{},id=0,closed=false,failNext=false;
 const posted:(()=>void)[]=[],messages:Wire[]=[],rows:Wire[]=[],attempted:Wire[]=[];
 const decoder=new SnapshotDecoder();let intervalRegistrations=0;
 vi.spyOn(performance,'now').mockImplementation(()=>now);
 vi.stubGlobal('setInterval',(callback:()=>void,ms:number)=>{expect(ms).toBe(20);intervalRegistrations++;wake=callback;return 1;});
 // Delivery adapter copied in shape from the current frontier Runtime harness.
 // Pending stale generation messages remain queued; the real scheduler owns
 // its generation/pending state and the real Runtime decides whether to step.
 class ControlledChannel {
  port1:any;port2:any;
  constructor(){const first={onmessage:null as any,listeners:new Set<any>(),start(){},close(){},unref(){},addEventListener(_n:string,f:any){this.listeners.add(f);},removeEventListener(_n:string,f:any){this.listeners.delete(f);}};this.port1=first;this.port2={start(){},close(){},unref(){},postMessage(value:unknown){const data=structuredClone(value);posted.push(()=>{if(closed)return;const event={data};first.onmessage?.call(first,event);for(const f of first.listeners)f.call(first,event);});}};}
 }
 vi.stubGlobal('MessageChannel',ControlledChannel);
 const scope={onmessage:undefined as any};
 startSimulationWorker(scope as DedicatedWorkerGlobalScope,message=>{
  const copy=structuredClone(message) as Wire;messages.push(copy);
  if(copy.type==='snapshot'){
   attempted.push(copy);
   // Declared transport fault AFTER a real encode, before delivery/adoption.
   if(failNext){failNext=false;throw Error('Declared one-shot publication transport failure');}
   const adopted=decoder.adopt(copy as SnapshotMessage<true>);
   expect(adopted.status,adopted.status==='resync'?adopted.reason:'').toBe('applied');
   rows.push(copy);
  }
 });
 const request=(payload:Wire)=>{const wire={...payload,id:++id};scope.onmessage({data:structuredClone(wire)});const reply=messages.findLast(m=>m.type==='reply'&&m.id===wire.id);expect(reply,'Real Runtime reply').toBeDefined();return reply!;};
 const saved=()=>{const r=request({type:'save'});expect(r.ok,r.reason).toBe(true);expect(typeof r.data).toBe('string');whole(r.data);return r.data as string;};
 const load=(raw:string)=>request({type:'load',data:raw,threatPauseMode:'major'});
 const launch=(epoch:number,computerId:number)=>{const r=request({type:'ship-launch-298',ownerEpoch:epoch,computerId});expect(r.ok,r.reason).toBe(true);const started=JSON.parse(r.data);expect(started).toMatchObject({ok:true,ownerEpoch:epoch,active:true});expect(started.generation).toBeGreaterThan(0);return {ownerEpoch:started.ownerEpoch as number,generation:started.generation as number};};
 const frame=(session:{ownerEpoch:number;generation:number},sequence:number,deltas:number[])=>{const at=messages.length;scope.onmessage({data:structuredClone({type:'ship-frame-298',...session,sequence,deltas})});const ack=messages.slice(at).findLast(m=>m.type==='ship-frame-ack-298');expect(ack,'Light frame ACK').toBeDefined();return ack as ShipFrameAck298;};
 const cancel=(session:{ownerEpoch:number;generation:number},reason:'menu'|'front'|'transport')=>{const at=messages.length;scope.onmessage({data:{type:'ship-cancel-298',...session,reason}});const state=messages.slice(at).findLast(m=>m.type==='ship-countdown-state-298');expect(state).toBeDefined();return state as ShipCountdownState298;};
 const pump=(ms:number)=>{now+=ms;wake();let turns=0;while(posted.length&&turns++<512)posted.shift()!();expect(posted).toHaveLength(0);};
 const h={messages,rows,attempted,request,saved,load,launch,frame,cancel,pump,decoder,
  intervals:()=>intervalRegistrations,failPublication(){failNext=true;},last:()=>rows.at(-1)!,
  close(){closed=true;posted.length=0;wake=()=>{};scope.onmessage=undefined;}};
 hosts.push(h);return h;
}
function loadReady(h:ReturnType<typeof host>,f:ReturnType<typeof declaredReadyShip298>){const r=h.load(f.text);expect(r.ok,r.reason).toBe(true);expect(r.shipOwnerEpoch298).toBeGreaterThan(0);return r.shipOwnerEpoch298 as number;}
function depart(h:ReturnType<typeof host>,session:{ownerEpoch:number;generation:number},sequence=1){
 const before=h.messages.length,ack=h.frame(session,sequence,Array.from({length:29},()=>.25));
 expect(ack).toMatchObject({accepted:true,active:false,outcome:'departed'});
 const events=h.messages.slice(before),publication=events.findIndex(m=>m.type==='snapshot'),ackIndex=events.findIndex(m=>m.type==='ship-frame-ack-298');
 expect(publication).toBeGreaterThanOrEqual(0);expect(ackIndex).toBeGreaterThan(publication);expect(events[publication].speed,'Credits forcePause already effective before Main ACK').toBe(0);
 return ack.departureId!;
}
function declaredUrgentVariant(){
 const f=declaredReadyShip298(),w=f.world;
 // NEW diagnostic variant, not a played/acquired campaign: one remaining human
 // and the public calendar used by the current responsive Runtime raid test.
 const p=startingPawn(w.nextId++,'Reste déclaré',3,3,1,80,w.seed,w.tick,w.schemaVersion);p.health??=createMedicalRecord(w.tick);w.pawns.push(p);
 w.raids={profile:'camp-raids-v1',rng:379,nextCheck:w.tick+1,serial:0,completed:0,departed:[]};
 expect(validateWorld(w),'Declared urgent variant must be a genuine Whole before load').toEqual([]);
 const text=serializeWorld(w);whole(text);return {...f,text};
}

test('real load refusal preserves the mandate, accepted replacement invalidates it, and publication failure stays unknown',()=>{
 const f=declaredReadyShip298(),h=host(),epoch=loadReady(h,f),session=h.launch(epoch,f.computer.id);
 const original=h.saved();expect(h.frame(session,1,[.25])).toMatchObject({accepted:true,outcome:'waiting'});
 const refused=h.load('Declared unreadable save');expect(refused).toMatchObject({ok:false,outcome:'refused',shipOwnerEpoch298:epoch});
 expect(h.frame(session,2,[.25])).toMatchObject({accepted:true,outcome:'waiting'});expect(h.saved()).toBe(original);
 const accepted=h.load(f.text);expect(accepted.ok,accepted.reason).toBe(true);expect(accepted.shipOwnerEpoch298).toBeGreaterThan(epoch);const newRaw=h.saved();
 expect(h.frame(session,3,[10])).toMatchObject({accepted:false,active:false,outcome:'refused'});expect(h.saved()).toBe(newRaw);
 const current=h.launch(accepted.shipOwnerEpoch298,f.computer.id);h.failPublication();const attempts=h.attempted.length;
 const unknown=h.load(f.text);expect(unknown).toMatchObject({ok:false,outcome:'unknown'});expect(h.attempted.length).toBe(attempts+1);expect(h.messages.some(m=>m.type==='fault')).toBe(true);
 expect(h.frame(current,1,[10])).toMatchObject({accepted:false,active:false,outcome:'refused'});
 // Unknown publication is not relabelled a delivered Whole. A new diagnostic
 // recovery load is explicit; no ACTUAL campaign or old owner is rewound.
 expect(h.request({type:'save'}).ok).toBe(false);const recovery=h.load(f.text);expect(recovery.ok,recovery.reason).toBe(true);whole(h.saved());
 expect(h.frame(current,1,[10])).toMatchObject({accepted:false,active:false});
});

test('waiting emits one light ACK and neither publishes nor advances Core, RNG, IDs or the saved World',()=>{
 const f=declaredReadyShip298(),h=host(),epoch=loadReady(h,f),session=h.launch(epoch,f.computer.id),before=h.saved(),w=whole(before);
 const at=h.messages.length,intervals=h.intervals(),timeout=vi.spyOn(globalThis,'setTimeout');
 expect(h.frame(session,1,[.25,.125,0])).toMatchObject({accepted:true,active:true,outcome:'waiting'});
 expect(h.messages.slice(at).map(m=>m.type)).toEqual(['ship-frame-ack-298']);expect(h.intervals()).toBe(intervals);expect(timeout).not.toHaveBeenCalled();
 h.pump(500);expect(h.messages.slice(at).map(m=>m.type)).toEqual(['ship-frame-ack-298']);const after=h.saved();expect(after).toBe(before);
 const copy=whole(after);expect([effectiveCore297(copy),copy.rng,copy.nextId]).toEqual([effectiveCore297(w),w.rng,w.nextId]);
});

test('real departure holds credits before ACK and after load, then closes to Normal while an actual urgent forcePause remains held',()=>{
 const f=declaredReadyShip298(),h=host(),epoch=loadReady(h,f);expect(h.request({type:'speed',speed:6}).ok).toBe(true);
 const session=h.launch(epoch,f.computer.id),departureId=depart(h,session),archive=h.saved(),archived=whole(archive);
 expect(archived.escapedShips298?.departures).toHaveLength(1);expect(archived.escapedShips298?.credits).toBe(departureId);
 for(const speed of [1,3,6])expect(h.request({type:'speed',speed})).toMatchObject({ok:false,outcome:'refused'});
 expect(h.request({type:'speed',speed:0}).ok).toBe(true);h.pump(1000);expect(h.saved()).toBe(archive);
 const loaded=host(),loadedReply=loaded.load(archive);expect(loadedReply.ok,loadedReply.reason).toBe(true);const loadedEpoch=loadedReply.shipOwnerEpoch298;
 expect(loaded.last().speed).toBe(0);expect(loaded.request({type:'speed',speed:1}).ok).toBe(false);loaded.pump(3000);expect(loaded.saved()).toBe(archive);
 // No Worker timer models the UI close. This one message is the declared END
 // of the three-second screen transition; its preceding time remained paused.
 expect(loaded.request({type:'ship-credits-continue-298',ownerEpoch:loadedEpoch,departureId}).ok).toBe(true);expect(loaded.last().speed).toBe(1);
 expect(whole(loaded.saved()).escapedShips298?.credits).toBeNull();loaded.pump(20);expect(effectiveCore297(whole(loaded.saved()))).toBeGreaterThan(effectiveCore297(archived));
 const urgentFixture=declaredUrgentVariant(),urgent=host(),urgentEpoch=loadReady(urgent,urgentFixture);expect(urgent.request({type:'speed',speed:1}).ok).toBe(true);urgent.pump(250);
 expect(urgent.rows.some(r=>r.urgentThreats?.urgentHeld),'The public raid producer must actually arm the urgent forcePause').toBe(true);whole(urgent.saved());
 const urgentSession=urgent.launch(urgentEpoch,urgentFixture.computer.id),urgentDeparture=depart(urgent,urgentSession),paused=whole(urgent.saved()),pausedCore=effectiveCore297(paused);
 urgent.pump(3000);expect(effectiveCore297(whole(urgent.saved()))).toBe(pausedCore);
 expect(urgent.request({type:'ship-credits-continue-298',ownerEpoch:urgentEpoch,departureId:urgentDeparture}).ok).toBe(true);expect(urgent.last().speed).toBe(0);expect(urgent.last().urgentThreats?.urgentHeld).toBe(true);
 expect(whole(urgent.saved()).escapedShips298?.credits).toBeNull();urgent.pump(1000);expect(effectiveCore297(whole(urgent.saved()))).toBe(pausedCore);
});

test('whole-batch rejection, duplicate/stale frames and explicit Menu/transport cancellation cannot consume hidden time',()=>{
 const f=declaredReadyShip298(),h=host(),epoch=loadReady(h,f),session=h.launch(epoch,f.computer.id);
 expect(h.frame(session,1,[.25])).toMatchObject({accepted:true,outcome:'waiting'});
 expect(h.frame(session,2,[.25,NaN])).toMatchObject({accepted:false,outcome:'refused'});expect(h.frame(session,2,[.25])).toMatchObject({accepted:true,outcome:'waiting'});
 expect(h.frame(session,2,[.25])).toMatchObject({accepted:false,outcome:'refused'});
 expect(h.frame({...session,ownerEpoch:epoch+1},3,[10]).accepted).toBe(false);expect(h.frame({...session,generation:session.generation+1},3,[10]).accepted).toBe(false);
 expect(h.frame(session,3,Array(512).fill(0))).toMatchObject({accepted:true,outcome:'waiting'});expect(h.frame(session,4,Array(513).fill(0)).accepted).toBe(false);expect(h.frame(session,4,[0]).accepted).toBe(true);
 expect(h.frame(session,5,Array(26).fill(.25))).toMatchObject({accepted:true,outcome:'waiting'});expect(h.frame(session,6,[.25])).toMatchObject({accepted:true,outcome:'departed'});expect(whole(h.saved()).escapedShips298?.departures).toHaveLength(1);
 const menu=host(),menuEpoch=loadReady(menu,f),old=menu.launch(menuEpoch,f.computer.id),raw=menu.saved();expect(menu.frame(old,1,[.25]).accepted).toBe(true);
 expect(menu.cancel(old,'menu')).toMatchObject({active:false,outcome:'cancelled'});expect(menu.frame(old,2,[10]).accepted).toBe(false);expect(menu.saved()).toBe(raw);
 const fresh=menu.launch(menuEpoch,f.computer.id);expect(menu.frame(fresh,1,[0]).accepted).toBe(true);expect(menu.cancel(old,'menu').outcome).toBe('refused');expect(menu.frame(fresh,2,[0]).accepted).toBe(true);
 const stopped=menu.cancel(fresh,'transport');expect(stopped).toMatchObject({active:false,outcome:'unknown',generation:0});expect(stopped.ownerEpoch).toBeGreaterThan(menuEpoch);expect(menu.frame(fresh,3,[10]).accepted).toBe(false);expect(menu.saved()).toBe(raw);
});
