/// <reference lib="webworker" />
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {Request,Response} from '../src/bridge/protocol';
// Worker scheduling doubles only. Does not generate a map or validate owners.
// Camp-only scheduling composition; the unimplemented creation factory is not imported.
const h=vi.hoisted(()=>({root:{schemaVersion:256,tick:90,rng:17,nextId:30,planet:{revision:3},worldMaps:{sites:[] as {id:number;tile:number}[]},worldGroups:{groups:[{state:{id:7,tile:8}}]}},sent:[] as Response[],revision:0,tick:undefined as (()=>void)|undefined,settlement:vi.fn(),commit:vi.fn(),discard:vi.fn(),step:vi.fn(),scope:{} as DedicatedWorkerGlobalScope}));
vi.mock('../src/sim/group-campaign-runtime-256',()=>({GroupCampaignRuntime256:class{bootstrap(){}step(){}}}));
vi.mock('../src/sim/group-caravan-physical-256',()=>({GroupCaravanPhysical256:class{}}));
vi.mock('../src/sim/group-campaign-geometry-256',()=>({createGroupCampaignGeometry256:()=>({})}));
vi.mock('../src/sim/planet-route-256',()=>({preparePlanetNavigation256:()=>{}}));
vi.mock('../src/sim/group-camp-entry-256',()=>({prepareActualSettlementEntry257:function*(){h.settlement();try{yield {phase:'shrines750'};yield {phase:'hives1120'};return {status:'ready',commit:h.commit};}finally{h.discard();}},prepareActualCampEntry256:function*(){try{yield {phase:'plants900',completed:1,total:2};yield {phase:'animals1200'};return {status:'ready',commit:h.commit};}finally{h.discard();}}}));
vi.mock('../src/sim/world-map-authority',()=>({groupEntryActions:()=>({camp:{ok:true},settle:{ok:true}}),validWorldMapCommand:()=>true}));
vi.mock('../src/sim/world-map-context',()=>({registeredCampaign:(v:unknown)=>v,selectedRegisteredMap:()=>h.root}));
vi.mock('../src/sim/world-map-options',()=>({configureSettlementLimit:()=>{},validSettlementLimit:()=>true}));
vi.mock('../src/sim/world-map-presentation',()=>({campaignOnlySummary:()=>({})}));
vi.mock('../src/sim/secondary-site-context',()=>({selectedMap:(v:unknown)=>v}));
vi.mock('../src/sim/secondary-site-presentation',()=>({campaignPresentation:(v:unknown)=>v}));
vi.mock('../src/sim/serialization',()=>({deserializeCampaign:()=>h.root,serializeCampaign:()=>''}));
vi.mock('../src/sim/new-game',()=>({createScenarioWorld:()=>h.root}));
vi.mock('../src/sim/index',()=>({applyCommand:()=>({ok:true}),deserializeWorld:()=>h.root,serializeWorld:()=>'',stepWorld:h.step,validateWorld:()=>[]}));
vi.mock('../src/sim/player-orders',()=>({queryOrderOptions:()=>[]}));
vi.mock('../src/bridge/urgent-threats',()=>({validThreatPauseMode:()=>true,UrgentThreatObserver:class{bootstrap(){}prepareMaps(){}capture(){return false;}snapshot(){return {};}token(){return {};}requestedSpeed(speed:number){return speed;}}}));
vi.mock('../src/bridge/fixed-clock',()=>({FixedClock:class{reset(){}advance(_now:number,speed:number){return speed?1:0;}}}));
vi.mock('../src/bridge/snapshots',()=>({SnapshotEncoder:class{discardDraftPreview(){}encode(world:unknown,_ms:number,speed:number){return {type:'snapshot',epoch:1,revision:++h.revision,world,speed};}}}));
vi.mock('../src/bridge/motion-tracks',()=>({MotionRecorder:class{reset(){}capture(){}snapshot(){return [];}}}));
vi.mock('../src/bridge/presentation-changes',()=>({PresentationChanges:class{capture(){return false;}}}));
vi.mock('../src/bridge/audio-cues',()=>({AudioCueRecorder:class{reset(){}capture(){}drain(){return [];}}}));
function send(request:Request){h.scope.onmessage!({data:request} as MessageEvent<Request>);}
const replies=(id:number)=>h.sent.filter((m):m is Extract<Response,{type:'reply'}>=>m.type==='reply'&&m.id===id);
const command=()=>send({id:20,type:'command',command:{type:'group-enter',groupId:7,mode:'camp'}});
beforeEach(async()=>{vi.useFakeTimers();vi.resetModules();h.sent=[];h.revision=0;h.root.worldMaps.sites=[];h.commit.mockReset().mockImplementation(()=>{h.root.worldMaps.sites.push({id:1,tile:8});return {ok:true};});h.discard.mockClear();h.settlement.mockClear();h.step.mockClear();h.scope={postMessage:(m:Response)=>h.sent.push(structuredClone(m))} as unknown as DedicatedWorkerGlobalScope;vi.stubGlobal('self',h.scope);vi.stubGlobal('setInterval',(fn:()=>void)=>{h.tick=fn;return 1;});await import('../src/bridge/simulation.worker');send({id:1,type:'init',seed:1,size:250});expect(replies(1)[0],JSON.stringify(h.sent)).toMatchObject({ok:true});h.sent=[];});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();});
describe('ordered Camp worker',()=>{
 it('a refused final entry preserves source fields and leaves speed zero',async()=>{
  h.commit.mockReturnValueOnce({ok:false,reason:'Actual entry refused'});command();await vi.advanceTimersByTimeAsync(30);
  expect(replies(20)[0]).toMatchObject({ok:false,outcome:'refused',reason:'Actual entry refused'});expect(h.root.worldMaps.sites).toHaveLength(0);expect(h.root.rng).toBe(17);expect(h.root.nextId).toBe(30);expect(h.step).not.toHaveBeenCalled();
 });

 it('publishes pause, yields, commits once and publishes before final ACK',async()=>{
  command();h.tick!();expect(h.step).not.toHaveBeenCalled();expect(h.sent[0]).toMatchObject({type:'snapshot',speed:0});expect(replies(20)).toHaveLength(0);expect(h.commit).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(10);expect(h.commit).toHaveBeenCalledTimes(1);expect(h.step).not.toHaveBeenCalled();
  const ack=replies(20)[0]!;expect(ack.ok).toBe(true);expect(ack.checkpoint).toBeDefined();const at=h.sent.indexOf(ack);expect(h.sent[at-1]).toMatchObject({type:'snapshot',speed:0,epoch:ack.checkpoint!.epoch,revision:ack.checkpoint!.revision});
 });
 it('wrong cancellation cannot cancel; matching cancellation discards without commit or resume',async()=>{
  command();send({id:21,type:'camp-entry-cancel',operationId:20,groupId:8});expect(replies(21)[0]!.ok).toBe(false);
  send({id:22,type:'speed',speed:6});expect(replies(22)[0]).toMatchObject({ok:false,outcome:'refused'});
  send({id:23,type:'camp-entry-cancel',operationId:20,groupId:7});expect(replies(23)[0]!.ok).toBe(true);expect(replies(20)).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(5);expect(replies(20)[0]).toMatchObject({ok:false,outcome:'refused',data:'{"campEntry":"cancelled"}'});expect(h.commit).not.toHaveBeenCalled();expect(h.discard).toHaveBeenCalledTimes(1);expect(h.root.worldMaps.sites).toHaveLength(0);expect(h.step).not.toHaveBeenCalled();
 });
 it('late cancel never claims rollback and concurrent load is refused',async()=>{
  command();send({id:24,type:'load',data:'ignored'});expect(replies(24)[0]).toMatchObject({ok:false,outcome:'refused'});
  await vi.advanceTimersByTimeAsync(10);expect(h.commit).toHaveBeenCalledTimes(1);send({id:25,type:'camp-entry-cancel',operationId:20,groupId:7});expect(replies(25)[0]).toMatchObject({ok:false,outcome:'refused'});expect(h.root.worldMaps.sites).toHaveLength(1);expect(h.step).not.toHaveBeenCalled();
 });
});

describe('ordered geographic settlement dispatch, scheduling doubles only',()=>{
 it('routes S’installer through the250 preparation, pause/progress and checkpoint before ACK',async()=>{
  send({id:40,type:'command',command:{type:'group-enter',groupId:7,mode:'settle'}});
  expect(h.settlement).toHaveBeenCalledTimes(1);expect(h.commit).not.toHaveBeenCalled();h.tick!();expect(h.step).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(10);expect(h.commit).toHaveBeenCalledTimes(1);
  const ack=replies(40)[0]!;expect(ack.ok).toBe(true);expect(h.sent[h.sent.indexOf(ack)-1]).toMatchObject({type:'snapshot',speed:0,epoch:ack.checkpoint!.epoch,revision:ack.checkpoint!.revision});
  expect(h.sent.some(m=>m.type==='camp-entry-progress'&&m.progress.phase==='shrines750')).toBe(true);
 });
 it('matching existing cancellation discards a settlement candidate without claiming rollback',async()=>{
  send({id:40,type:'command',command:{type:'group-enter',groupId:7,mode:'settle'}});
  send({id:41,type:'camp-entry-cancel',operationId:40,groupId:7});
  expect(replies(41)[0]!.ok).toBe(true);await vi.advanceTimersByTimeAsync(10);
  expect(replies(40)[0]).toMatchObject({ok:false,outcome:'refused'});expect(h.commit).not.toHaveBeenCalled();expect(h.discard).toHaveBeenCalledTimes(1);expect(h.root.worldMaps.sites).toHaveLength(0);expect(h.step).not.toHaveBeenCalled();
 });
});
