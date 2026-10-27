// V488 explicit safe-point speed policy, with real Runtime/Core/codec/observers.
// Actual Runtime/Clock/Core/codec/observers; only clocks and task transport are controlled.
import {afterEach,test,vi} from 'vitest';
import assert from 'node:assert/strict';
import {startSimulationWorker} from '../src/bridge/simulation-runtime';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {MotionRecorder} from '../src/bridge/motion-tracks';
import {PresentationChanges} from '../src/bridge/presentation-changes';
import {createWorld,applyCommand,stepWorld,serializeWorld} from '../src/sim/index';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization';
import {finalizeInitialWorldRegistry} from '../src/sim/world-map-context';
import {NATURAL_TERRAIN_BINDINGS_256} from '../src/sim/local-terrain-definitions-256';
import {newDoorState} from '../src/sim/door-rules';
import type {Request,Response} from '../src/bridge/protocol';
import type {World} from '../src/sim/types';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function prepared(closeAfter=3,raid=false){
 // Same declared NUM fixture and real boundary as qualified V486 pause tests.
 const w=createWorld(486031,32,32),pawn=w.pawns[0]!;w.tiles=Array.from({length:w.width*w.height},()=>({terrain:NATURAL_TERRAIN_BINDINGS_256.Soil}));w.structures=[];w.jobs=[];
 for(const p of w.pawns){p.jobId=null;p.path=[];p.state='idle';p.planCooldown=0;}
 const door={id:w.nextId++,kind:'door' as const,x:2,z:2,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,door:{...newDoorState(w.tick),open:true,from:1,closeAt:w.tick+closeAfter}};w.structures.push(door);
 assert.equal(applyCommand(w,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok,true);assert.equal(applyCommand(w,{type:'draft-move',pawnIds:[pawn.id],target:{x:pawn.x+3,z:pawn.z},queue:false}).ok,true);
 if(raid)w.raids={profile:'camp-raids-v1',rng:379,nextCheck:w.tick+1,serial:0,completed:0,departed:[]};finalizeInitialWorldRegistry(w);return {raw:serializeWorld(w),pawnId:pawn.id,doorId:door.id};
}
class RecordedMotion extends MotionRecorder{ticks:number[]=[];last?:World;override capture(w:World){super.capture(w);this.ticks.push(w.tick);this.last=structuredClone(w);}}
function harness(closeAfter=3,raid=false){
 const input=prepared(closeAfter,raid),messages:Response[]=[],rows:{world:World;packet:SnapshotMessage<true>}[]=[],order:string[]=[],phases:{tick:number;changed:boolean}[]=[],motion=new RecordedMotion(),posted:(()=>void)[]=[];
 let now=1000,wake=()=>{},id=0,failEncode=false;const origin=performance.timeOrigin;
 vi.spyOn(performance,'now').mockImplementation(()=>now);vi.spyOn(performance,'timeOrigin','get').mockReturnValue(origin);
 vi.stubGlobal('setInterval',(callback:()=>void,ms:number)=>{assert.equal(ms,20);wake=callback;return 1;});
 // Queue tasks, never run them recursively. Queued stale tasks are NOT discarded
 // by close/unref, so Runtime generation guards must do their own rejection.
 class ControlledChannel {
  port1:any;port2:any;
  constructor(){const first={onmessage:null as any,listeners:new Set<any>(),start(){},close(){},unref(){},addEventListener(_name:string,fn:any){this.listeners.add(fn);},removeEventListener(_name:string,fn:any){this.listeners.delete(fn);}};this.port1=first;this.port2={start(){},close(){},unref(){},postMessage(value:unknown){const data=structuredClone(value);posted.push(()=>{const event={data};first.onmessage?.call(first,event);for(const fn of first.listeners)fn.call(first,event);});}};}
 }
 vi.stubGlobal('MessageChannel',ControlledChannel);
 const capture=PresentationChanges.prototype.capture;vi.spyOn(PresentationChanges.prototype,'capture').mockImplementation(function(this:PresentationChanges,w:World){const changed=capture.call(this,w);phases.push({tick:w.tick,changed});return changed;});
 const encoder=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:1000}),encode=encoder.encode.bind(encoder);vi.spyOn(encoder,'encode').mockImplementation((w,ms,speed,checkpoint)=>{if(failEncode)throw Error('NUM safe-point publication failure');return encode(w,ms,speed,checkpoint);});
 const scope={onmessage:undefined as any};startSimulationWorker(scope as DedicatedWorkerGlobalScope,message=>{messages.push(structuredClone(message));order.push(message.type==='reply'?'reply:'+message.id:message.type);},encoder,(w:World,packet:SnapshotMessage<true>)=>{rows.push({world:structuredClone(w),packet:structuredClone(packet)});order.push('publication:'+w.tick+':'+packet.speed);},()=>motion);
 const request=(value:any)=>{const request={...value,id:++id} as Request,before=rows.length;scope.onmessage({data:request});const reply=messages.findLast((r):r is Extract<Response,{type:'reply'}>=>r.type==='reply'&&r.id===request.id);assert.ok(reply,'Real Runtime reply must exist');return {reply,rows:rows.slice(before),id:request.id};};
 const saved=()=>{const result=request({type:'save'});assert.equal(result.reply.ok,true,result.reply.reason);assert.equal(typeof result.reply.data,'string');return result.reply.data!;};
 assert.equal(request({type:'load',data:input.raw,threatPauseMode:'major'}).reply.ok,true);const initial=saved(),oracle=deserializeCampaign(initial),tick=oracle.tick;assert.equal(request({type:'speed',speed:6}).reply.ok,true);
 const lastTick=()=>motion.last?.tick??tick,runOne=()=>{const task=posted.shift();assert.ok(task,'Expected one posted internal task');const before=lastTick();task();return lastTick()-before;},drain=()=>{const deltas:number[]=[];for(let i=0;posted.length&&i<64;i++)deltas.push(runOne());assert.equal(posted.length,0,'Bounded transport drain');return deltas;};
 return {input,initial,messages,rows,order,phases,motion,oracle,tick,request,saved,lastTick,runOne,drain,queued:()=>posted.length,at(value:number){now=value;},wake(){wake();},slice(){const before=lastTick();wake();if(lastTick()===before&&posted.length)runOne();return lastTick()-before;},stamp(local:number){return {origin:origin-5000,at:local+5000};},fail(){failEncode=true;},allow(){failEncode=false;},oracleSteps(count:number){stepWorld(oracle as World,count);return serializeCampaign(oracle);}};
}
test.each([0,1,3,6])('NEW policy: speed%s applies to the current played point without old-speed catch-up',speed=>{
 const h=harness(1);h.at(1250);const result=h.request({type:'speed',speed,...speed===0?{pauseIntent:h.stamp(1100)}:{}});assert.equal(result.reply.ok,true);assert.equal(result.rows.at(-1)?.world.tick,h.tick);assert.equal(result.rows.at(-1)?.packet.speed,speed);assert.equal(h.saved(),h.initial);assert.ok(h.order.indexOf('publication:'+h.tick+':'+speed)<h.order.indexOf('reply:'+result.id));
});
test('one regular task plays at most one genuine Core tick; pause cancels only the remaining unplayed batch',()=>{
 const h=harness(1);h.at(1250);assert.equal(h.slice(),1,'Old synchronous9-tick loop must be RED');assert.equal(h.lastTick(),h.tick+1);assert.ok(h.queued()>0);const pause=h.request({type:'speed',speed:0});assert.equal(pause.reply.ok,true);assert.equal(pause.rows.at(-1)?.world.tick,h.tick+1);assert.ok(h.order.indexOf('publication:'+(h.tick+1)+':0')<h.order.indexOf('reply:'+pause.id));
 const captures=h.motion.ticks.length,publications=h.rows.length;h.drain();assert.equal(h.motion.ticks.length,captures);assert.equal(h.rows.length,publications);assert.equal(h.saved(),h.oracleSteps(1));assert.equal(h.rows.flatMap(r=>r.packet.audioCues??[]).filter(c=>c.kind==='door.close'&&c.tick===h.tick+1).length,1);assert.ok(h.rows.some(r=>(r.packet.motion?.find(t=>t.id===h.input.pawnId)?.segments.length??0)>0));const decoder=new SnapshotDecoder();for(const row of h.rows){const result=decoder.adopt(row.packet);assert.equal(result.status,'applied');if(result.status==='applied')assert.equal(result.world.tick,row.world.tick);}
});
test('known fractional phase survives normal pause and resume, without retaining any whole old debt',()=>{
 const h=harness(9);h.at(1020);assert.equal(h.slice(),0);h.at(1100);assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);h.drain();assert.equal(h.lastTick(),h.tick);
 h.at(5000);assert.equal(h.request({type:'speed',speed:1}).reply.ok,true);h.drain();assert.equal(h.lastTick(),h.tick);h.at(5047);assert.equal(h.slice(),1,'720 known fractional units +47ms*6 must reach one tick');assert.equal(h.saved(),h.oracleSteps(1));
});
test('invalid speed/stamp and refused load leave the current World and the remaining logical debt intact',()=>{
 const h=harness(9);h.at(1250);assert.equal(h.slice(),1);const whole=h.saved();
 for(const value of [{type:'speed',speed:2},{type:'speed',speed:0,pauseIntent:undefined},{type:'load',data:'not a save'}]){const result=h.request(value);assert.equal(result.reply.ok,false);assert.equal(result.reply.outcome,'refused');assert.equal(result.rows.length,0);assert.equal(h.saved(),whole);}
 assert.ok(h.queued()>0);assert.ok(h.drain().every(n=>n<=1));assert.equal(h.lastTick(),h.tick+9);assert.equal(h.saved(),h.oracleSteps(9));
});
test('old queued task after successful load cannot clear a new generation pending task',()=>{
 const h=harness(9);h.at(1250);assert.equal(h.slice(),1);assert.ok(h.queued()>0);h.at(1500);assert.equal(h.request({type:'load',data:h.input.raw}).reply.ok,true);assert.equal(h.request({type:'speed',speed:6}).reply.ok,true);h.at(1750);h.wake();assert.ok(h.queued()>=2);const newPlayed=h.lastTick()-h.tick;assert.ok(newPlayed>=0&&newPlayed<=1,'First regular wake may play one tick directly or post its task');
 assert.equal(h.runOne(),0,'Old generation must return before touching the new pending flag');assert.equal(h.lastTick(),h.tick+newPlayed);assert.equal(h.runOne(),1,'New generation remains runnable');assert.equal(h.lastTick(),h.tick+newPlayed+1);assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);h.drain();assert.equal(h.saved(),h.oracleSteps(newPlayed+1));
});
test('a real draft-move command between two logical ticks applies at the current tick and preserves the rest',()=>{
 const h=harness(9);h.at(1250);assert.equal(h.slice(),1);const pawn=h.motion.last!.pawns.find(p=>p.id===h.input.pawnId)!,command={type:'draft-move',pawnIds:[pawn.id],target:{x:pawn.x,z:pawn.z+2},queue:false};const result=h.request({type:'command',command});assert.equal(result.reply.ok,true);assert.equal(result.rows.at(-1)?.world.tick,h.tick+1);assert.deepEqual(result.rows.at(-1)?.world.pawns.find(p=>p.id===pawn.id)?.draft?.target,command.target);
 stepWorld(h.oracle as World,1);assert.equal(applyCommand(h.oracle as World,command as any).ok,true);assert.ok(h.drain().every(n=>n<=1));assert.equal(h.lastTick(),h.tick+9);assert.equal(h.saved(),h.oracleSteps(8));
});
test('logical batch preserves discrete phases and quiet tail rather than publishing every yielded tick',()=>{
 const h=harness(3),start=h.rows.length;h.at(1250);assert.equal(h.slice(),1);assert.ok(h.drain().every(n=>n<=1));assert.equal(h.lastTick(),h.tick+9);const rows=h.rows.slice(start),phase=new Map(h.phases.filter(p=>p.tick>h.tick).map(p=>[p.tick,p.changed]));assert.ok([...phase.values()].some(changed=>!changed),'Actual fixture must exercise quiet ticks');
 for(const row of rows)assert.ok(row.world.tick===h.tick+9||phase.get(row.world.tick)===true,'Quiet intermediate yield must not create a tail publication');assert.equal(rows.at(-1)?.world.tick,h.tick+9);assert.equal(h.saved(),h.oracleSteps(9));
});
test('real urgent first tick cancels queued remainder while retaining door audio, motion and pause token',()=>{
 const h=harness(1,true);h.at(1250);assert.equal(h.slice(),1);h.drain();assert.equal(h.lastTick(),h.tick+1);const urgent=h.rows.find(r=>r.packet.urgentThreats?.urgentHeld);assert.ok(urgent);assert.equal(urgent.packet.speed,0);assert.equal(urgent.packet.urgentThreats!.pauseRevision,1);assert.equal(h.saved(),h.oracleSteps(1));assert.equal(h.rows.flatMap(r=>r.packet.audioCues??[]).filter(c=>c.kind==='door.close').length,1);
});
test('publication fault preserves played prefix as unknown, stops pending work and allows validated replacement',()=>{
 const h=harness(1);h.at(1250);h.fail();h.slice();assert.equal(h.messages.filter(m=>m.type==='fault').length,1);assert.equal(h.motion.last?.tick,h.tick+1);const captures=h.motion.ticks.length;h.drain();assert.equal(h.motion.ticks.length,captures);assert.equal(h.request({type:'save'}).reply.outcome,'unknown');
 h.allow();h.at(1500);assert.equal(h.request({type:'load',data:h.input.raw}).reply.ok,true);assert.equal(h.saved(),h.initial);assert.equal(h.request({type:'speed',speed:6}).reply.ok,true);h.at(1750);assert.equal(h.slice(),1);assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);h.drain();assert.equal(h.saved(),h.oracleSteps(1));
});

test('rapid nonzero controls cancel only pending whole credit and rebase to the last chosen speed',()=>{
 const h=harness(9);h.at(1250);assert.equal(h.slice(),1);assert.equal(h.queued(),1);
 for(const [at,speed]of [[1260,3],[1265,1],[1270,6]]){h.at(at!);const result=h.request({type:'speed',speed});assert.equal(result.reply.ok,true);assert.equal(result.rows.at(-1)?.world.tick,h.tick+1);assert.equal(result.rows.at(-1)?.packet.speed,speed);}
 assert.ok(h.drain().every(n=>n===0),'Cancelled generations may not play any of their old whole credits');assert.equal(h.saved(),h.oracleSteps(1));h.at(1290);assert.equal(h.slice(),0);h.at(1298);assert.equal(h.slice(),1);assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);h.drain();assert.equal(h.saved(),h.oracleSteps(1));
});
test('resync between two real Core ticks publishes a checkpoint without dropping the remaining logical batch',()=>{
 const h=harness(3);h.at(1250);assert.equal(h.slice(),1);const before=h.saved(),resync=h.request({type:'resync'});assert.equal(resync.reply.ok,true);assert.ok(resync.reply.checkpoint);assert.equal(resync.rows.at(-1)?.packet.kind,'checkpoint');assert.equal(resync.rows.at(-1)?.world.tick,h.tick+1);assert.equal(h.saved(),before);assert.equal(h.queued(),1);
 assert.equal(h.drain().filter(n=>n===1).length,8);assert.equal(h.lastTick(),h.tick+9);assert.equal(h.saved(),h.oracleSteps(9));const decoder=new SnapshotDecoder();for(const row of h.rows){const result=decoder.adopt(row.packet);assert.equal(result.status,'applied');if(result.status==='applied')assert.equal(result.world.tick,row.world.tick);}assert.equal(h.rows.flatMap(r=>r.packet.audioCues??[]).filter(c=>c.kind==='door.close').length,1);
});
test('repeated20ms wakeups during continuations coalesce without resampling each tick or losing the next phase',()=>{
 const h=harness(3);h.at(1250);assert.equal(h.slice(),1);const captures=h.motion.ticks.length;h.at(1270);for(let n=0;n<20;n++)h.wake();assert.equal(h.motion.ticks.length,captures,'A busy logical batch records wake-due but does not play on the timer stack');assert.equal(h.queued(),1);
 const deltas=h.drain();assert.deepEqual(deltas,[1,1,1,1,1,1,1,1,0],'Eight old ticks then one coalesced new-batch sampling task');assert.equal(h.lastTick(),h.tick+9);h.at(1278);assert.equal(h.slice(),1,'20ms phase720 plus8ms phase288 must not be lost or sampled repeatedly');assert.equal(h.request({type:'speed',speed:0}).reply.ok,true);h.drain();assert.equal(h.saved(),h.oracleSteps(10));
});
