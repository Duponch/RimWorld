// Actual Runtime/Core/codec. V488 supersedes advance-old; stamp validation remains compatible.
import {afterEach,expect,test,vi} from 'vitest';
import {startSimulationWorker} from '../src/bridge/simulation-runtime';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {MotionRecorder} from '../src/bridge/motion-tracks';
import {createWorld,applyCommand,serializeWorld,stepWorld} from '../src/sim/index';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization';
import {finalizeInitialWorldRegistry} from '../src/sim/world-map-context';
import {NATURAL_TERRAIN_BINDINGS_256} from '../src/sim/local-terrain-definitions-256';
import {newDoorState} from '../src/sim/door-rules';
import type {Request,Response} from '../src/bridge/protocol';
import type {World} from '../src/sim/types';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
type Stamp={origin:number;at:number};
type FutureSpeed=Omit<Extract<Request,{type:'speed'}>,'id'|'pauseIntent'>&{pauseIntent?:unknown};
function prepared(closeAfter=3,raid=false){
 const w=createWorld(486031,32,32),pawn=w.pawns[0]!;w.tiles=Array.from({length:w.width*w.height},()=>({terrain:NATURAL_TERRAIN_BINDINGS_256.Soil}));w.structures=[];w.jobs=[];
 for(const p of w.pawns){p.jobId=null;p.path=[];p.state='idle';p.planCooldown=0;}
 const door={id:w.nextId++,kind:'door' as const,x:2,z:2,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,door:{...newDoorState(w.tick),open:true,from:1,closeAt:w.tick+closeAfter}};w.structures.push(door);
 expect(applyCommand(w,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok).toBe(true);expect(applyCommand(w,{type:'draft-move',pawnIds:[pawn.id],target:{x:pawn.x+3,z:pawn.z},queue:false}).ok).toBe(true);
 if(raid)w.raids={profile:'camp-raids-v1',rng:379,nextCheck:w.tick+1,serial:0,completed:0,departed:[]};finalizeInitialWorldRegistry(w);return {raw:serializeWorld(w),pawnId:pawn.id,doorId:door.id};
}
class RecordedMotion extends MotionRecorder{ticks:number[]=[];last?:World;override capture(w:World){super.capture(w);this.ticks.push(w.tick);this.last=structuredClone(w);}}
function harness(closeAfter=3,raid=false){
 const input=prepared(closeAfter,raid),messages:Response[]=[],rows:{world:World;packet:SnapshotMessage<true>}[]=[],order:string[]=[],motion=new RecordedMotion();let now=1000,wake=()=>{},id=0,failPause=false;
 const posted:(()=>void)[]=[];const origin=performance.timeOrigin;vi.spyOn(performance,'now').mockImplementation(()=>now);vi.spyOn(performance,'timeOrigin','get').mockReturnValue(origin);
 vi.stubGlobal('setInterval',(callback:()=>void,ms:number)=>{expect(ms).toBe(20);wake=callback;return 1;});
 // Controlled host tasks: no real Node MessagePort can outlive afterEach.
 vi.stubGlobal('MessageChannel',class {port1={onmessage:undefined as undefined|((event:{data:unknown})=>void),unref(){}};port2={unref(){},postMessage:(data:unknown)=>{const owned=structuredClone(data);posted.push(()=>this.port1.onmessage?.({data:owned}));}};});
 const drain=()=>{for(let i=0;posted.length&&i<64;i++)posted.shift()!();expect(posted).toHaveLength(0);};
 const encoder=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:1000}),encode=encoder.encode.bind(encoder);vi.spyOn(encoder,'encode').mockImplementation((w,ms,speed,checkpoint)=>{if(failPause&&speed===0)throw Error('intent-publication-failure');return encode(w,ms,speed,checkpoint);});
 const scope={onmessage:undefined as unknown as(e:MessageEvent<Request>)=>void};startSimulationWorker(scope as unknown as DedicatedWorkerGlobalScope,message=>{messages.push(structuredClone(message));order.push(message.type==='reply'?'reply:'+message.id:message.type);},encoder,(w,packet)=>{rows.push({world:structuredClone(w),packet:structuredClone(packet)});order.push('publication:'+w.tick+':'+packet.speed);},()=>motion);
 const deliver=(request:Request)=>{const before=rows.length;scope.onmessage({data:request} as MessageEvent<Request>);const reply=messages.findLast((r):r is Extract<Response,{type:'reply'}>=>r.type==='reply'&&r.id===request.id);if(!reply)throw Error('Actual runtime reply absent');return {reply,rows:rows.slice(before),id:request.id};};
 const request=(value:FutureSpeed|Omit<Extract<Request,{type:'save'}>,'id'>|Omit<Extract<Request,{type:'load'}>,'id'>)=>deliver({...value,id:++id} as Request);
 // Deliberate CPU-handler boundary: define the descriptor without spreading or
 // reading pauseIntent. No claim that an accessor survives native structuredClone.
 const rawSpeed=(descriptor:PropertyDescriptor,inherited=false,speed=0)=>{const prototype=inherited?Object.create(Object.prototype):Object.prototype,request=Object.assign(Object.create(prototype),{id:++id,type:'speed',speed});Object.defineProperty(inherited?prototype:request,'pauseIntent',descriptor);return deliver(request as Request);};
 const saved=()=>{const result=request({type:'save'});expect(result.reply.ok,result.reply.reason).toBe(true);if(!result.reply.data)throw Error('Whole save absent');return result.reply.data;};
 expect(request({type:'load',data:input.raw,threatPauseMode:'major'}).reply.ok).toBe(true);const initial=saved(),oracle=deserializeCampaign(initial),tick=oracle.tick;expect(request({type:'speed',speed:6}).reply.ok).toBe(true);
 return {input,request,rawSpeed,saved,initial,oracle,tick,messages,rows,motion,order,drain,at(value:number){now=value;},wake(){wake();},stamp(local:number):Stamp{return {origin:origin-5000,at:local+5000};},oracleSteps(count:number){stepWorld(oracle as World,count);return serializeCampaign(oracle);},fail(){failPause=true;},allow(){failPause=false;}};
}
function assertDecoded(h:ReturnType<typeof harness>,tick:number){const decoder=new SnapshotDecoder();let last:World|undefined;for(const row of h.rows){const result=decoder.adopt(row.packet);expect(result.status).toBe('applied');if(result.status==='applied')last=result.world;}expect(last?.tick).toBe(tick);expect(last?.rng).toBe(h.oracle.rng);}

// Prior advance-old and invocation-cutoff expectations are intentionally replaced
// by the human V488 policy; the original13 cases remain archived privately.
test('unstamped pause confirms only the current played state without old-speed catch-up',()=>{
 const h=harness(9);h.at(1250);const pause=h.request({type:'speed',speed:0});expect(pause.reply.ok).toBe(true);expect(pause.rows.at(-1)?.world.tick).toBe(h.tick);expect(h.saved()).toBe(h.oracleSteps(0));assertDecoded(h,h.tick);
});
test('valid earlier intent cannot replay time; already played audio and motion remain exact before the ACK',()=>{
 const h=harness(3);h.at(1100);h.wake();h.drain();expect(h.rows.at(-1)?.world.tick).toBe(h.tick+3);h.at(1250);const pause=h.request({type:'speed',speed:0,pauseIntent:h.stamp(1100)});expect(pause.reply.ok).toBe(true);expect(pause.rows.at(-1)?.world.tick).toBe(h.tick+3);expect(h.saved()).toBe(h.oracleSteps(3));assertDecoded(h,h.tick+3);
 expect(h.rows.flatMap(r=>r.packet.audioCues??[]).filter(c=>c.kind==='door.close'&&c.tick===h.tick+3)).toHaveLength(1);expect(pause.rows.at(-1)?.packet.motion?.find(t=>t.id===h.input.pawnId)?.segments.length).toBeGreaterThan(0);expect(h.motion.ticks.every(t=>t<=h.tick+3)).toBe(true);expect(h.order.indexOf('publication:'+(h.tick+3)+':0')).toBeLessThan(h.order.indexOf('reply:'+pause.id));
});
test('seven genuinely played ticks are never rolled back; retained fraction survives pause then1x',()=>{
 const h=harness(9);h.at(1200);h.wake();h.drain();expect(h.rows.at(-1)?.world.tick).toBe(h.tick+7);const before=h.saved();h.at(1250);const pause=h.request({type:'speed',speed:0,pauseIntent:h.stamp(1100)});expect(pause.reply.ok).toBe(true);expect(h.saved()).toBe(before);expect(pause.rows.at(-1)?.world.tick).toBe(h.tick+7);
 h.at(1300);expect(h.request({type:'speed',speed:1}).reply.ok).toBe(true);h.at(1434);h.wake();h.drain();expect(h.rows.at(-1)?.world.tick).toBe(h.tick+8);expect(h.saved()).toBe(h.oracleSteps(8));
});
test('future intent grants no catch-up; malformed intent and invalid speed refuse without mutation',()=>{
 const future=harness(9);future.at(1250);expect(future.request({type:'speed',speed:0,pauseIntent:future.stamp(9000)}).reply.ok).toBe(true);expect(future.saved()).toBe(future.oracleSteps(0));vi.restoreAllMocks();vi.unstubAllGlobals();
 for(const bad of [{origin:NaN,at:1100},{origin:0,at:Infinity},{at:1100},[0,1100]]){const h=harness(9),before=h.saved();h.at(1250);const refused=h.request({type:'speed',speed:0,pauseIntent:bad});expect(refused.reply).toMatchObject({ok:false,outcome:'refused'});expect(refused.rows).toEqual([]);expect(h.saved()).toBe(before);expect(h.messages.some(m=>m.type==='fault')).toBe(false);expect(h.request({type:'speed',speed:2,pauseIntent:h.stamp(1100)}).reply).toMatchObject({ok:false,outcome:'refused'});expect(h.saved()).toBe(before);expect(h.request({type:'speed',speed:0}).reply.ok).toBe(true);expect(h.saved()).toBe(h.oracleSteps(0));vi.restoreAllMocks();vi.unstubAllGlobals();}
});
test('a real urgent regular first tick still stops immediately with token, audio and motion intact',()=>{
 const h=harness(1,true);h.at(1100);h.wake();h.drain();const pause=h.request({type:'speed',speed:0,pauseIntent:h.stamp(1100)});expect(pause.reply.ok).toBe(true);expect(h.saved()).toBe(h.oracleSteps(1));expect(pause.rows.every(r=>r.world.tick===h.tick+1)).toBe(true);
 expect(pause.rows[0]?.packet).toMatchObject({speed:0,urgentThreats:{urgentHeld:true,pauseRevision:1,rows:[{kind:'raid'}]}});expect(h.rows.flatMap(r=>r.packet.audioCues??[]).filter(c=>c.kind==='door.close')).toHaveLength(1);expect(pause.rows.some(r=>(r.packet.motion?.find(t=>t.id===h.input.pawnId)?.segments.length??0)>0)).toBe(true);expect(h.motion.ticks.every(t=>t<=h.tick+1)).toBe(true);
});
test('pause-publication failure preserves the actual played prefix as unknown and replacement resets it',()=>{
 const h=harness(3);h.at(1100);h.wake();h.drain();h.at(1250);h.fail();const result=h.request({type:'speed',speed:0,pauseIntent:h.stamp(1100)});expect(result.reply).toMatchObject({ok:false,outcome:'unknown',reason:'intent-publication-failure'});h.oracleSteps(3);expect(h.motion.last?.tick).toBe(h.tick+3);expect(h.motion.last?.rng).toBe(h.oracle.rng);const count=h.motion.ticks.length;h.at(1450);h.wake();h.drain();expect(h.motion.ticks).toHaveLength(count);expect(h.request({type:'save'}).reply).toMatchObject({ok:false,outcome:'unknown'});
 h.allow();h.at(1500);expect(h.request({type:'load',data:h.input.raw}).reply.ok).toBe(true);const replaced=h.saved();expect(h.request({type:'speed',speed:6}).reply.ok).toBe(true);h.at(1550);expect(h.request({type:'speed',speed:0,pauseIntent:h.stamp(1100)}).reply.ok).toBe(true);expect(h.saved()).toBe(replaced);expect(h.messages.filter(m=>m.type==='fault')).toHaveLength(1);
});
test.each(['own-undefined','extra-key','symbol-key','origin-accessor','at-accessor','stamp-accessor'] as const)('malformed own pause intent%s refuses without invoking getters or spending old-speed debt',kind=>{
 const h=harness(9),before=h.saved(),stamp=h.stamp(1100);let calls=0,value:unknown=stamp,descriptor:PropertyDescriptor;
 if(kind==='own-undefined')value=undefined;
 if(kind==='extra-key')value={...stamp,extra:true};
 if(kind==='symbol-key')value={...stamp,[Symbol('extra')]:true};
 if(kind==='origin-accessor'||kind==='at-accessor'){const own={...stamp},key=kind==='origin-accessor'?'origin':'at';Object.defineProperty(own,key,{get(){calls++;return stamp[key];},enumerable:true,configurable:true});value=own;}
 descriptor=kind==='stamp-accessor'?{get(){calls++;return stamp;},enumerable:true,configurable:true}:{value,enumerable:true,configurable:true};
 h.at(1250);const refused=h.rawSpeed(descriptor);expect(refused.reply).toMatchObject({ok:false,outcome:'refused'});expect(refused.rows).toEqual([]);expect(calls).toBe(0);expect(h.saved()).toBe(before);expect(h.messages.some(m=>m.type==='fault')).toBe(false);
 expect(h.request({type:'speed',speed:0}).reply.ok).toBe(true);expect(h.saved()).toBe(h.oracleSteps(0));expect(calls).toBe(0);
});
test('inherited pause getter and every nonzero speed ignore the reserved field without reading it',()=>{
 for(const mode of ['inherited0',1,3,6] as const){const h=harness(9);let calls=0;h.at(1250);const result=h.rawSpeed({get(){calls++;return h.stamp(1100);},enumerable:true,configurable:true},mode==='inherited0',mode==='inherited0'?0:mode);expect(result.reply.ok).toBe(true);expect(calls).toBe(0);expect(h.saved()).toBe(h.oracleSteps(0));expect(h.messages.some(m=>m.type==='fault')).toBe(false);vi.restoreAllMocks();vi.unstubAllGlobals();}
});
