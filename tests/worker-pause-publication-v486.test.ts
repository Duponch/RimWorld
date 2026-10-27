import {afterEach,expect,test,vi} from 'vitest';
import {startSimulationWorker} from '../src/bridge/simulation-runtime';
import {LOCAL_TICKS_PER_SECOND} from '../src/bridge/clock-rate';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {MotionRecorder} from '../src/bridge/motion-tracks';
import {PresentationChanges} from '../src/bridge/presentation-changes';
import {createWorld,applyCommand,stepWorld,serializeWorld} from '../src/sim/index';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization';
import {finalizeInitialWorldRegistry} from '../src/sim/world-map-context';
import {newDoorState} from '../src/sim/door-rules';
import {NATURAL_TERRAIN_BINDINGS_256} from '../src/sim/local-terrain-definitions-256';
import type {Request,Response} from '../src/bridge/protocol';
import type {World} from '../src/sim/types';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const batchTicks=Math.floor(250*6*LOCAL_TICKS_PER_SECOND/1000);
function prepared(raid=false){
 // Fixed declared unit World, not a played campaign. Actual clock, SIM,
 // serializers, threat observer, motion/audio recorders and encoder remain real.
 const w=createWorld(486031,32,32),pawn=w.pawns[0]!;
 w.tiles=Array.from({length:w.width*w.height},()=>({terrain:NATURAL_TERRAIN_BINDINGS_256.Soil}));w.structures=[];w.jobs=[];
 for(const p of w.pawns){p.jobId=null;p.path=[];p.state='idle';p.planCooldown=0;}
 const door={id:w.nextId++,kind:'door' as const,x:2,z:2,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,
  door:{...newDoorState(w.tick),open:true,from:1,closeAt:w.tick+batchTicks}};
 w.structures.push(door);
 expect(applyCommand(w,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok).toBe(true);
 expect(applyCommand(w,{type:'draft-move',pawnIds:[pawn.id],target:{x:pawn.x+3,z:pawn.z},queue:false}).ok).toBe(true);
 if(raid)w.raids={profile:'camp-raids-v1',rng:379,nextCheck:w.tick+1,serial:0,completed:0,departed:[]};
 finalizeInitialWorldRegistry(w);return {raw:serializeWorld(w),pawnId:pawn.id,doorId:door.id};
}
class RecordedMotion extends MotionRecorder {
 readonly ticks:number[]=[];last:World|undefined;
 override capture(w:World){super.capture(w);this.ticks.push(w.tick);this.last=structuredClone(w);}
}
async function harness(raid=false,forcePhases=false){
 const input=prepared(raid),messages:Response[]=[],publications:{world:World;packet:SnapshotMessage<true>}[]=[],order:string[]=[];
 const posted:(()=>void)[]=[];let now=1000,wake=()=>{},id=0,failPauseEncode=false;
 vi.spyOn(performance,'now').mockImplementation(()=>now);
 const intervals:number[]=[];vi.stubGlobal('setInterval',(callback:()=>void,ms:number)=>{wake=callback;intervals.push(ms);return 1;});
 // Controlled host tasks prevent native Node MessagePort callbacks after a test.
 vi.stubGlobal('MessageChannel',class {port1={onmessage:undefined as undefined|((event:{data:unknown})=>void),unref(){}};port2={unref(){},postMessage:(data:unknown)=>{const owned=structuredClone(data);posted.push(()=>this.port1.onmessage?.({data:owned}));}};});
 const drain=()=>{for(let i=0;posted.length&&i<64;i++)posted.shift()!();expect(posted).toHaveLength(0);};
 const realCapture=PresentationChanges.prototype.capture;
 if(forcePhases)vi.spyOn(PresentationChanges.prototype,'capture').mockImplementation(function(this:PresentationChanges,w:World){realCapture.call(this,w);return true;});
 const encoder=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:1000}),motion=new RecordedMotion(),encode=encoder.encode.bind(encoder);
 vi.spyOn(encoder,'encode').mockImplementation((world,ms,speed,checkpoint)=>{if(failPauseEncode&&speed===0)throw Error('final pause encoding failed');return encode(world,ms,speed,checkpoint);});
 const scope={onmessage:undefined as unknown as (event:MessageEvent<Request>)=>void};
 startSimulationWorker(scope as unknown as DedicatedWorkerGlobalScope,message=>{messages.push(structuredClone(message));order.push(message.type==='reply'?'reply:'+message.id:message.type);},encoder,(world,packet)=>{publications.push({world:structuredClone(world),packet:structuredClone(packet)});order.push('publication:'+world.tick+':'+packet.speed);},()=>motion);
 const request=(value:Omit<Extract<Request,{type:'speed'}>,'id'>|Omit<Extract<Request,{type:'save'}>,'id'>|Omit<Extract<Request,{type:'load'}>,'id'>)=>{
  const request={...value,id:++id} as Request,before=publications.length;scope.onmessage({data:request} as MessageEvent<Request>);
  const reply=messages.findLast((message):message is Extract<Response,{type:'reply'}>=>message.type==='reply'&&message.id===id);if(!reply)throw Error('Actual runtime reply absent');return {reply,rows:publications.slice(before),id};
 };
 const saved=()=>{const result=request({type:'save'});expect(result.reply.ok,result.reply.reason).toBe(true);if(!result.reply.data)throw Error('Actual whole absent');return result.reply.data;};
 expect(request({type:'load',data:input.raw,threatPauseMode:'major'}).reply.ok).toBe(true);
 const initial=saved(),oracle=deserializeCampaign(initial),initialTick=oracle.tick;
 expect(request({type:'speed',speed:6}).reply.ok).toBe(true);
 return {input,messages,publications,order,motion,encoder,oracle,initialTick,intervals,request,saved,drain,
  setElapsed(ms:number){now=1000+ms;},wake(){wake();},failPause(){failPauseEncode=true;},
  oracleSteps(count:number){stepWorld(oracle as World,count);return serializeCampaign(oracle);}};
}
function decoded(rows:{packet:SnapshotMessage<true>}[]){
 const reader=new SnapshotDecoder();let result:World|undefined;
 for(const row of rows){const applied=reader.adopt(row.packet);expect(applied.status).toBe('applied');if(applied.status==='applied')result=applied.world;}
 return result;
}

// V488 supersedes advance-old and final-tick fusion. Played phases are never
// withdrawn; the current safe-point publication precedes its speed ACK.
test('pause confirms a played batch without duplicating its real last-tick audio or losing motion',async()=>{
 const h=await harness();h.setElapsed(250);h.wake();h.drain();const paused=h.request({type:'speed',speed:0}),finalTick=h.initialTick+batchTicks;
 expect(paused.reply.ok).toBe(true);expect(paused.rows.map(row=>[row.world.tick,row.packet.speed])).toEqual([[finalTick,0]]);const final=paused.rows.at(-1)!;expect(final.world.structures.find(s=>s.id===h.input.doorId)?.door?.open).toBe(false);
 expect(h.publications.flatMap(row=>row.packet.audioCues??[]).filter(cue=>cue.kind==='door.close'&&cue.tick===finalTick)).toHaveLength(1);expect(final.packet.motion?.find(track=>track.id===h.input.pawnId)?.segments.length).toBeGreaterThan(0);for(let tick=h.initialTick+1;tick<=finalTick;tick++)expect(h.motion.ticks).toContain(tick);
 expect(final.packet.motion).toEqual(h.motion.snapshot());expect(h.saved()).toBe(h.oracleSteps(batchTicks));const applied=decoded(h.publications);expect(applied?.tick).toBe(finalTick);expect(applied?.rng).toBe(h.oracle.rng);expect(h.order.indexOf('publication:'+finalTick+':0')).toBeLessThan(h.order.indexOf('reply:'+paused.id));
});
test('every explicitly requested intermediate presentation phase remains at its played tick before pause0',async()=>{
 // Existing observer-control deliberately forces phase delivery; Core is real.
 const h=await harness(false,true),start=h.publications.length;h.setElapsed(250);h.wake();h.drain();const pause=h.request({type:'speed',speed:0});expect(pause.reply.ok).toBe(true);const rows=h.publications.slice(start),normal=rows.slice(0,-1);
 expect(normal.map(row=>[row.world.tick,row.packet.speed])).toEqual(Array.from({length:batchTicks},(_,i)=>[h.initialTick+i+1,6]));expect(rows.at(-1)?.world.tick).toBe(h.initialTick+batchTicks);expect(rows.at(-1)?.packet.speed).toBe(0);
 const oracle=deserializeCampaign(serializeCampaign(h.oracle));for(const row of normal){stepWorld(oracle as World,1);expect(row.world.tick).toBe(oracle.tick);expect(row.world.rng).toBe(oracle.rng);}expect(rows.flatMap(row=>row.packet.audioCues??[]).filter(cue=>cue.kind==='door.close')).toHaveLength(1);expect(h.saved()).toBe(h.oracleSteps(batchTicks));
});
test('nonzero controls apply at the current point; the20ms wake funds only the later real batch',async()=>{
 const h=await harness(false,true);expect(h.intervals).toEqual([20]);h.setElapsed(250);const changed=h.request({type:'speed',speed:3});expect(changed.reply.ok).toBe(true);expect(changed.rows.map(row=>[row.world.tick,row.packet.speed])).toEqual([[h.initialTick,3]]);
 const before=h.publications.length;h.setElapsed(500);h.wake();h.drain();const interval=h.publications.slice(before),additional=Math.floor(250*3*LOCAL_TICKS_PER_SECOND/1000);expect(interval.at(-1)?.world.tick).toBe(h.initialTick+additional);expect(interval.every(row=>row.packet.speed===3)).toBe(true);const pause=h.request({type:'speed',speed:0});expect(pause.rows).toHaveLength(1);expect(h.saved()).toBe(h.oracleSteps(additional));
});
test('a real regular first-step raid pause remains immediate and its urgent token survives a later manual pause',async()=>{
 const h=await harness(true),start=h.publications.length;h.setElapsed(Math.ceil(1000/(6*LOCAL_TICKS_PER_SECOND)));h.wake();h.drain();const pause=h.request({type:'speed',speed:0});expect(pause.reply.ok).toBe(true);const rows=h.publications.slice(start);
 expect(rows).toHaveLength(2);expect(rows.map(row=>row.world.tick)).toEqual([h.initialTick+1,h.initialTick+1]);for(const row of rows)expect(row.packet).toMatchObject({speed:0,urgentThreats:{urgentHeld:true,pauseRevision:1,rows:[{kind:'raid'}]}});expect(h.saved()).toBe(h.oracleSteps(1));expect(h.publications.at(-1)?.world.raids?.active).toBeDefined();
});
test('invalid speed refuses without mutation; subsequent manual pause does not acquire old credit',async()=>{
 const h=await harness(),before=h.saved();h.setElapsed(250);const refused=h.request({type:'speed',speed:2});expect(refused.reply).toMatchObject({ok:false,outcome:'refused'});expect(refused.rows).toEqual([]);expect(h.saved()).toBe(before);expect(h.request({type:'speed',speed:0}).reply.ok).toBe(true);expect(h.saved()).toBe(h.oracleSteps(0));expect(h.messages.some(message=>message.type==='fault')).toBe(false);
});
test('pause-publication failure is unknown, preserves the played batch and stops later simulation work',async()=>{
 const h=await harness();h.setElapsed(250);h.wake();h.drain();h.failPause();const failed=h.request({type:'speed',speed:0});expect(failed.reply).toMatchObject({ok:false,outcome:'unknown',reason:'final pause encoding failed'});expect(h.messages.filter(message=>message.type==='fault')).toHaveLength(1);expect(h.messages.find(message=>message.type==='fault')).toMatchObject({speed:0,tick:h.initialTick+batchTicks});
 const observed=structuredClone(h.motion.last),captures=h.motion.ticks.length;h.setElapsed(1000);h.wake();h.wake();h.drain();expect(h.motion.ticks).toHaveLength(captures);expect(h.motion.last).toEqual(observed);h.oracleSteps(batchTicks);expect(h.motion.last?.rng).toBe(h.oracle.rng);expect(h.motion.last?.structures.find(s=>s.id===h.input.doorId)?.door?.open).toBe(false);expect(h.request({type:'save'}).reply).toMatchObject({ok:false,outcome:'unknown'});expect(h.messages.filter(message=>message.type==='fault')).toHaveLength(1);
});