import {mockRequestId298} from './request-id-binding298';
// Current297 analogue of the unchanged V488 historical suite. No legacy load bypass.
// Real Runtime, physical Engine, clocks, Macro observers, Full codec and phase staging.
// Only the monotonic wall clock and task delivery are controlled; no Native authority.
import {afterEach,test,vi} from 'vitest';
import assert from 'node:assert/strict';
import {startSimulationWorker} from '../src/bridge/simulation-runtime';
import {SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {TerrainJournalSnapshotEncoder} from '../src/bridge/terrain-journal-encoder';
import {captureCoreActor297} from '../src/bridge/core-phase-data-297';
import {CorePhaseFrameOwner297} from '../src/bridge/core-phase-owner-297';
import type {CorePhaseEnvelope297} from '../src/bridge/core-phase-projection-297';
import {MotionRecorder} from '../src/bridge/motion-tracks';
import {PresentationChanges} from '../src/bridge/presentation-changes';
import {createWorld,applyCommand,serializeWorld} from '../src/sim/index';
import {advanceWorldCore297} from '../src/sim/engine';
import {effectiveCore297} from '../src/sim/core-phase-297';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization';
import {finalizeInitialWorldRegistry} from '../src/sim/world-map-context';
import {NATURAL_TERRAIN_BINDINGS_256} from '../src/sim/local-terrain-definitions-256';
import {newDoorState} from '../src/sim/door-rules';
import type {Request,Response} from '../src/bridge/protocol';
import type {World} from '../src/sim/types';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function prepared(closeAfter=3,raid=false){
 const w=createWorld(486031,32,32),pawn=w.pawns[0]!;
 assert.equal(Number(w.schemaVersion),297);assert.equal(effectiveCore297(w),0);
 w.tiles=Array.from({length:w.width*w.height},()=>({terrain:NATURAL_TERRAIN_BINDINGS_256.Soil}));w.structures=[];w.jobs=[];
 for(const p of w.pawns){p.jobId=null;p.path=[];p.state='idle';p.planCooldown=0;}
 const door={id:w.nextId++,kind:'door' as const,x:2,z:2,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,door:{...newDoorState(w.tick),open:true,from:1,closeAt:w.tick+closeAfter}};w.structures.push(door);
 assert.equal(applyCommand(w,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok,true);
 assert.equal(applyCommand(w,{type:'draft-move',pawnIds:[pawn.id],target:{x:pawn.x+3,z:pawn.z},queue:false}).ok,true);
 assert.equal(effectiveCore297(w),0,'A validated command may arm an edge, never play a future Core');
 if(raid)w.raids={profile:'camp-raids-v1',rng:379,nextCheck:w.tick+1,serial:0,completed:0,departed:[]};
 finalizeInitialWorldRegistry(w);return {raw:serializeWorld(w),pawnId:pawn.id,doorId:door.id};
}
class RecordedMotion extends MotionRecorder {
 cores:number[]=[];last?:World;
 override capture(w:World){super.capture(w);this.cores.push(effectiveCore297(w));this.last=structuredClone(w);}
}
type FullRow={world:World;packet:SnapshotMessage<true>};
type PhaseRow={world:World;packet:CorePhaseEnvelope297};
type Publication={kind:'full'|'phase';core:number;at:number;audio:readonly {kind:string;tick:number}[]};
function harness(closeAfter=3,raid=false){
 const input=prepared(closeAfter,raid),messages:Response[]=[],rows:FullRow[]=[],phaseRows:PhaseRow[]=[],publications:Publication[]=[],order:string[]=[],motion=new RecordedMotion(),posted:(()=>void)[]=[];
 const frameOwner=new CorePhaseFrameOwner297();let trueFull:World|undefined,trueFullJson:string|undefined;
 let now=1000,wake=()=>{},id=0,failPublication=false;const origin=performance.timeOrigin;
 vi.spyOn(performance,'now').mockImplementation(()=>now);vi.spyOn(performance,'timeOrigin','get').mockReturnValue(origin);
 vi.stubGlobal('setInterval',(callback:()=>void,ms:number)=>{assert.equal(ms,20);wake=callback;return 1;});
 // A stale task remains physically queued, making generation guards observable.
 class ControlledChannel {
  port1:any;port2:any;
  constructor(){const first={onmessage:null as any,listeners:new Set<any>(),start(){},close(){},unref(){},addEventListener(_name:string,fn:any){this.listeners.add(fn);},removeEventListener(_name:string,fn:any){this.listeners.delete(fn);}};this.port1=first;this.port2={start(){},close(){},unref(){},postMessage(value:unknown){const data=structuredClone(value);posted.push(()=>{const event={data};first.onmessage?.call(first,event);for(const fn of first.listeners)fn.call(first,event);});}};}
 }
 vi.stubGlobal('MessageChannel',ControlledChannel);
 const encoder=new TerrainJournalSnapshotEncoder(),encode=encoder.encode.bind(encoder);
 vi.spyOn(encoder,'encode').mockImplementation((w,ms,speed,checkpoint)=>{if(failPublication)throw Error('Current297 Full publication failure');return encode(w,ms,speed,checkpoint);});
 const physical=(w:World)=>w.pawns.map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,path:p.path,moveCooldown:p.moveCooldown,motion:p.motion}));
 const scope={onmessage:undefined as any};
 startSimulationWorker(scope as DedicatedWorkerGlobalScope,message=>{messages.push(structuredClone(message));order.push(message.type==='reply'?'reply:'+message.id:message.type);},encoder,
  (w:World,packet:SnapshotMessage<true>)=>{
   const world=structuredClone(w),owned=structuredClone(packet);rows.push({world,packet:owned});
   assert.ok(owned.corePhase297,'Every297 Full has its actual physical watermark');
   const projection=frameOwner.adoptFull(world,owned.epoch,owned.revision,owned.motion,owned.corePhase297,owned.speed as 0|1|3|6);
   assert.equal(projection.core,effectiveCore297(world));assert.equal(projection.world,world);assert.deepEqual(physical(projection.world),physical(world));trueFull=world;trueFullJson=JSON.stringify(world);
   publications.push({kind:'full',core:projection.core,at:now,audio:owned.audioCues??[]});order.push('publication:'+projection.core+':'+owned.speed);
  },()=>motion,
  (w:World,packet:CorePhaseEnvelope297)=>{
   if(failPublication)throw Error('Current297 phase publication failure');
   const world=structuredClone(w),owned=structuredClone(packet),projection=frameOwner.commit(frameOwner.prepare(owned));
   assert.equal(projection.core,effectiveCore297(world));
   if(owned.type==='actor-frontier-297'){
    assert.ok(trueFull);assert.equal(projection.world,trueFull);assert.equal(JSON.stringify(projection.world),trueFullJson,'Authentic Full is not rewritten by actor frontiers');assert.equal(effectiveCore297(projection.world),projection.anchor.core);assert.equal(projection.actorScene.core,projection.core);
    for(const[index,p]of world.pawns.entries())assert.deepEqual(captureCoreActor297('human',index,projection.actorScene.humans[index] as World['pawns'][number]),captureCoreActor297('human',index,p));
    for(const[index,a]of(world.wildlife?.animals??[]).entries())assert.deepEqual(captureCoreActor297('animal',index,projection.actorScene.animals[index]!),captureCoreActor297('animal',index,a));
    for(const[index,m]of(world.mechanoids??[]).entries())assert.deepEqual(captureCoreActor297('mechanical',index,projection.actorScene.mechanical[index]!),captureCoreActor297('mechanical',index,m));
   }else assert.deepEqual(physical(projection.world),physical(world));
   phaseRows.push({world,packet:owned});publications.push({kind:'phase',core:projection.core,at:now,audio:owned.audioCues});order.push('phase:'+projection.core);
  });
 const request=(value:any)=>{const request={...value,id:++id} as Request,before=rows.length;scope.onmessage({data:request});const reply=messages.findLast((r):r is Extract<Response,{type:'reply'}>=>r.type==='reply'&&r.id===mockRequestId298(request));assert.ok(reply,'The real Runtime must reply');return {reply,rows:rows.slice(before),id:mockRequestId298(request)};};
 const saved=()=>{const result=request({type:'save'});assert.equal(result.reply.ok,true,result.reply.reason);assert.equal(typeof result.reply.data,'string');return result.reply.data!;};
 assert.equal(request({type:'load',data:input.raw,threatPauseMode:'major'}).reply.ok,true);
 const initial=saved(),oracle=deserializeCampaign(initial),core=effectiveCore297(oracle);assert.equal(core,0);assert.equal(request({type:'speed',speed:6}).reply.ok,true);
 const lastCore=()=>motion.last?effectiveCore297(motion.last):core;
 const runOne=()=>{const task=posted.shift();assert.ok(task,'Expected a posted internal task');const before=lastCore();task();const delta=lastCore()-before;assert.ok(delta===0||delta===1,'One task commits at most one complete physical Core');return delta;};
 const drain=()=>{const deltas:number[]=[];for(let i=0;posted.length&&i<512;i++)deltas.push(runOne());assert.equal(posted.length,0,'Bounded transport drain');return deltas;};
 const oracleCores=(count:number)=>{for(let n=0;n<count;n++){const before=effectiveCore297(oracle),result=advanceWorldCore297(oracle);assert.equal(result.core,before+1);}return serializeCampaign(oracle);};
 const assertFullDecoder=()=>{const decoder=new SnapshotDecoder();for(const row of rows){const admitted=decoder.adopt(row.packet);assert.equal(admitted.status,'applied',JSON.stringify({reason:admitted.status==='resync'?admitted.reason:undefined,kind:row.packet.kind,tick:row.packet.world.tick,phaseCore297:row.packet.world.phaseCore297,coreMetadata:row.packet.corePhase297?.core}));if(admitted.status==='applied')assert.equal(effectiveCore297(admitted.world),effectiveCore297(row.world));}};
 return {input,initial,messages,rows,phaseRows,publications,order,motion,oracle,core,frameOwner,request,saved,lastCore,runOne,drain,oracleCores,assertFullDecoder,queued:()=>posted.length,
  at(value:number){now=value;},wake(){wake();},slice(){const before=lastCore();wake();if(lastCore()===before&&posted.length)runOne();return lastCore()-before;},stamp(local:number){return {origin:origin-5000,at:local+5000};},fail(){failPublication=true;},allow(){failPublication=false;},
  doorCues(){return publications.flatMap(row=>row.audio).filter(cue=>cue.kind==='door.close');}};
}

test.each([0,1,3,6])('297 speed%s applies at the current played Core without old-speed catch-up',speed=>{
 const h=harness(1);h.at(1250);const result=h.request({type:'speed',speed,...speed===0?{pauseIntent:h.stamp(1100)}:{}});
 assert.equal(result.reply.ok,true);assert.equal(effectiveCore297(result.rows.at(-1)!.world),h.core);assert.equal(result.rows.at(-1)?.packet.speed,speed);
 assert.equal(h.saved(),h.initial);assert.ok(h.order.indexOf('publication:'+h.core+':'+speed)<h.order.indexOf('reply:'+result.id));
});

test('one task pays one physical Core; pause preserves phase1; a local1 door closes only at real Core10',()=>{
 const h=harness(1);h.at(1250);assert.equal(h.slice(),1);assert.equal(h.lastCore(),h.core+1);assert.ok(h.queued()>0);
 const pause=h.request({type:'speed',speed:0});assert.equal(pause.reply.ok,true);assert.equal(effectiveCore297(pause.rows.at(-1)!.world),1);assert.equal(pause.rows.at(-1)!.world.tick,0);assert.equal(pause.rows.at(-1)!.world.phaseCore297,1);
 assert.ok(h.order.indexOf('publication:1:0')<h.order.indexOf('reply:'+pause.id));const captures=h.motion.cores.length,publications=h.publications.length;
 h.drain();assert.equal(h.motion.cores.length,captures);assert.equal(h.publications.length,publications);assert.equal(h.saved(),h.oracleCores(1));assert.equal(h.doorCues().length,0);
 h.at(1500);assert.equal(h.request({type:'speed',speed:6}).reply.ok,true);h.at(1525);assert.equal(h.slice(),1);h.drain();assert.equal(h.lastCore(),10);
 assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);assert.equal(h.saved(),h.oracleCores(9));assert.equal(h.doorCues().length,1);assert.equal(h.doorCues()[0]!.tick,1);
 assert.ok(h.rows.some(r=>(r.packet.motion?.find(t=>t.id===h.input.pawnId)?.segments.length??0)>0));h.assertFullDecoder();
});

test('known fractional physical credit survives pause/resume without retaining whole old debt',()=>{
 const h=harness(9);h.at(1002);assert.equal(h.slice(),0);h.at(1100);assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);h.drain();assert.equal(h.lastCore(),0);
 h.at(5000);assert.equal(h.request({type:'speed',speed:1}).reply.ok,true);h.drain();assert.equal(h.lastCore(),0);
 h.at(5005);assert.equal(h.slice(),1,'720 sampled units +5ms*60 must reach exactly one Core');assert.equal(h.saved(),h.oracleCores(1));
});

test('invalid controls and refused load preserve the played phase and the remaining physical reservation',()=>{
 const h=harness(9);h.at(1250);assert.equal(h.slice(),1);const whole=h.saved();
 for(const value of [{type:'speed',speed:2},{type:'speed',speed:0,pauseIntent:undefined},{type:'load',data:'not a save'}]){const result=h.request(value);assert.equal(result.reply.ok,false);assert.equal(result.reply.outcome,'refused');assert.equal(result.rows.length,0);assert.equal(h.saved(),whole);}
 assert.ok(h.queued()>0);h.drain();assert.equal(h.lastCore(),90);assert.equal(h.saved(),h.oracleCores(90));
});

test('a stale task after real load cannot clear the replacement generation pending flag',()=>{
 const h=harness(9);h.at(1250);assert.equal(h.slice(),1);assert.ok(h.queued()>0);h.at(1500);
 assert.equal(h.request({type:'load',data:h.input.raw}).reply.ok,true);assert.equal(h.request({type:'speed',speed:6}).reply.ok,true);h.at(1750);h.wake();assert.ok(h.queued()>=2);
 const played=h.lastCore();assert.ok(played===0||played===1);assert.equal(h.runOne(),0,'Stale generation returns before touching replacement state');assert.equal(h.lastCore(),played);
 assert.equal(h.runOne(),1);assert.equal(h.lastCore(),played+1);assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);h.drain();assert.equal(h.saved(),h.oracleCores(played+1));
});

test('a real draft command between two physical Cores applies at phase1 and preserves the reserved remainder',()=>{
 const h=harness(9);h.at(1250);assert.equal(h.slice(),1);const pawn=h.motion.last!.pawns.find(p=>p.id===h.input.pawnId)!,command={type:'draft-move' as const,pawnIds:[pawn.id],target:{x:pawn.x,z:pawn.z+2},queue:false};
 const result=h.request({type:'command',command});assert.equal(result.reply.ok,true);assert.equal(effectiveCore297(result.rows.at(-1)!.world),1);assert.deepEqual(result.rows.at(-1)?.world.pawns.find(p=>p.id===pawn.id)?.draft?.target,command.target);
 h.oracleCores(1);assert.equal(applyCommand(h.oracle as World,command).ok,true);h.drain();assert.equal(h.lastCore(),90);assert.equal(h.saved(),h.oracleCores(89));
});

test('20ms publication coalesces physical phases; an authoritative pause flushes the complete macro and phase frontier',()=>{
 const h=harness(3),start=h.publications.length;h.at(1250);assert.equal(h.slice(),1);h.drain();assert.equal(h.lastCore(),90);
 const delivered=h.publications.slice(start);assert.ok(delivered.length<90,'A 90-Core batch must not force ninety Full publications at one wall instant');assert.ok(h.phaseRows.length>0,'The real actor phase path must be exercised');
 for(let i=1;i<delivered.length;i++)assert.ok(delivered[i]!.at-delivered[i-1]!.at>=20,'Regular physical publication shares one 20ms budget');
 const pause=h.request({type:'speed',speed:0});assert.equal(pause.reply.ok,true);assert.equal(effectiveCore297(pause.rows.at(-1)!.world),90);assert.equal(h.frameOwner.currentCore,90);
 assert.equal(h.saved(),h.oracleCores(90));assert.equal(h.doorCues().length,1);assert.equal(h.doorCues()[0]!.tick,3);
});

test('an urgent first macro interrupts the physical batch at Core10, retaining one real door cue and pause token',()=>{
 const h=harness(1,true);h.at(1250);assert.equal(h.slice(),1);for(let n=0;n<8;n++)assert.equal(h.runOne(),1);
 assert.equal(h.lastCore(),9);assert.equal(h.rows.some(r=>r.packet.urgentThreats?.urgentHeld),false);assert.equal(h.runOne(),1);h.drain();assert.equal(h.lastCore(),10);
 const urgent=h.rows.find(r=>r.packet.urgentThreats?.urgentHeld);assert.ok(urgent);assert.equal(urgent.packet.speed,0);assert.equal(urgent.packet.urgentThreats!.pauseRevision,1);assert.equal(effectiveCore297(urgent.world),10);
 assert.equal(h.saved(),h.oracleCores(10));assert.equal(h.doorCues().length,1);assert.equal(h.doorCues()[0]!.tick,1);
});

test('a publication fault retains the played Core as unknown and only a validated replacement clears it',()=>{
 const h=harness(1);h.at(1250);h.fail();h.slice();assert.equal(h.messages.filter(m=>m.type==='fault').length,1);assert.equal(h.lastCore(),1);
 const captures=h.motion.cores.length;h.drain();assert.equal(h.motion.cores.length,captures);assert.equal(h.request({type:'save'}).reply.outcome,'unknown');
 h.allow();h.at(1500);assert.equal(h.request({type:'load',data:h.input.raw}).reply.ok,true);assert.equal(h.saved(),h.initial);assert.equal(h.request({type:'speed',speed:6}).reply.ok,true);
 h.at(1750);assert.equal(h.slice(),1);assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);h.drain();assert.equal(h.saved(),h.oracleCores(1));
});

test('rapid nonzero changes cancel only whole unplayed credit and retain the last chosen speed',()=>{
 const h=harness(9);h.at(1250);assert.equal(h.slice(),1);assert.equal(h.queued(),1);
 for(const [at,speed]of [[1260,3],[1265,1],[1270,6]]){h.at(at!);const result=h.request({type:'speed',speed});assert.equal(result.reply.ok,true);assert.equal(effectiveCore297(result.rows.at(-1)!.world),1);assert.equal(result.rows.at(-1)?.packet.speed,speed);}
 assert.ok(h.drain().every(n=>n===0));assert.equal(h.saved(),h.oracleCores(1));h.at(1272);assert.equal(h.slice(),0);h.at(1273);assert.equal(h.slice(),1);
 assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);h.drain();assert.equal(h.saved(),h.oracleCores(1));
});

test('resync at phase1 publishes a complete checkpoint without dropping the physical reservation',()=>{
 const h=harness(3);h.at(1250);assert.equal(h.slice(),1);const before=h.saved(),resync=h.request({type:'resync'});assert.equal(resync.reply.ok,true);assert.ok(resync.reply.checkpoint);assert.equal(resync.rows.at(-1)?.packet.kind,'checkpoint');assert.equal(effectiveCore297(resync.rows.at(-1)!.world),1);
 assert.equal(h.saved(),before);assert.equal(h.queued(),1);assert.equal(h.drain().filter(n=>n===1).length,89);assert.equal(h.lastCore(),90);assert.equal(h.saved(),h.oracleCores(90));
 h.assertFullDecoder();assert.equal(h.doorCues().length,1);
});

test('repeated20ms wakeups coalesce during physical continuations and conserve the next sampled fractional credit',()=>{
 const h=harness(3);h.at(1250);assert.equal(h.slice(),1);const captures=h.motion.cores.length;h.at(1270);for(let n=0;n<20;n++)h.wake();assert.equal(h.motion.cores.length,captures);assert.equal(h.queued(),1);
 // 89 old credits + one new sampling of20ms*6*60=7.2Core. No repeated sampling.
 const deltas=h.drain();assert.equal(deltas.filter(n=>n===1).length,96);assert.equal(h.lastCore(),97);
 h.at(1273);assert.equal(h.slice(),1,'200 residual units +3ms*6*60 reaches one Core');assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);h.drain();assert.equal(h.saved(),h.oracleCores(98));
});
