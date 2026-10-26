// PRIVATE candidate for tests/presentation-natural-reuse-v486.test.ts.
// Imports below deliberately target that final path. No test has been run here.
import {afterAll,afterEach,beforeAll,beforeEach,expect,test,vi} from 'vitest';
import * as plants from '../src/sim/plants';
import {createWorld,stepWorld} from '../src/sim/engine';
import {serializeCampaign,validateWorld} from '../src/sim/serialization';
import {finalizeInitialWorldRegistry} from '../src/sim/world-map-context';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';
import {campaignOnlySummary} from '../src/sim/world-map-presentation';
import {markTerrainCellChanged} from '../src/sim/terrain-mutation-journal';
import {TerrainJournalSnapshotEncoder} from '../src/bridge/terrain-journal-encoder';
import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';
import type {SnapshotMessage} from '../src/bridge/snapshots';
import type {World} from '../src/sim/types';

type Packet=SnapshotMessage<true>;
interface OwnedEncoder extends TerrainJournalSnapshotEncoder {
 takeNatural(packet:Packet):ReturnType<WorkerNaturalAppearance['capture']>;
 clearNatural():void;
}
const lane=vi.hoisted(()=>({args:undefined as unknown[]|undefined,messages:[] as unknown[]}));
vi.mock('../src/bridge/simulation-runtime',()=>({startSimulationWorker:(...args:unknown[])=>{lane.args=args;}}));
let Constructor:new()=>OwnedEncoder,readerCalls:()=>number;
beforeAll(async()=>{
 vi.stubGlobal('self',{postMessage:(message:unknown)=>lane.messages.push(message)});
 await import('../src/bridge/presentation.worker');
 expect(lane.args).toBeDefined();expect(typeof lane.args![3]).toBe('function');
 Constructor=(lane.args![2] as OwnedEncoder).constructor as new()=>OwnedEncoder;
},120000); // Cold entry transform is preparation, not a simulation deadline.
beforeEach(()=>{const spy=vi.spyOn(plants,'createPlantGrowthReader');readerCalls=()=>spy.mock.calls.length;lane.messages.length=0;});
afterEach(()=>{vi.restoreAllMocks();});
afterAll(()=>{vi.unstubAllGlobals();});

function wire(value:unknown):unknown {
 if(ArrayBuffer.isView(value))return {type:value.constructor.name,bytes:Buffer.from(value.buffer,value.byteOffset,value.byteLength).toString('hex')};
 if(value instanceof ArrayBuffer)return {type:'ArrayBuffer',bytes:Buffer.from(value).toString('hex')};
 if(Array.isArray(value))return value.map(wire);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,wire(v)]));
 return typeof value==='number'&&Object.is(value,-0)?{number:'-0'}:value;
}
function fixture(){
 // Declared, unplayed numerical World. Generation, registry and validation are real.
 const root=createWorld(486087,32,32),plant=root.resources.find(r=>r.kind==='berries')!;
 expect(plant).toBeDefined();plant.growth=.25;plant.growthTick=root.tick;
 finalizeInitialWorldRegistry(root);expect(validateWorld(root)).toEqual([]);serializeCampaign(root);
 const world=campaignPresentation(root),plantId=plant.id;expect(world.schemaVersion).toBe(296);
 return {root,world,plantId};
}
function harness(owned=new Constructor()){
 const data=fixture(),oracle=new TerrainJournalSnapshotEncoder(),natural=new WorkerNaturalAppearance();
 const read=(checkpoint=false)=>{
  const before=JSON.stringify(data.root),packet=oracle.encode(data.world,0,0,checkpoint),appearance=natural.capture(data.world,packet),calls=readerCalls();
  const actualPacket=owned.encode(data.world,0,0,checkpoint),actualAppearance=owned.takeNatural(actualPacket);
  expect(wire({packet:actualPacket,appearance:actualAppearance})).toEqual(wire({packet,appearance}));
  expect(JSON.stringify(data.root)).toBe(before);
  return {packet:actualPacket,appearance:actualAppearance,strictReads:readerCalls()-calls};
 };
 return {...data,owned,oracle,natural,read};
}

test('fixed entry genuinely reuses only a complete same-tick predecessor and preserves owned typed wire',()=>{
 const h=harness();expect(h.read().strictReads).toBe(1);const silent=h.read();
 expect(silent.packet.kind).toBe('delta');expect(silent.strictReads).toBe(0);expect(silent.appearance.upsert).toEqual([]);
 const crops=silent.appearance.crops,columns=[crops.ids,crops.ordinals,crops.growth,crops.flags,crops.removed];
 expect(crops.format).toBe('columns-v1');expect(columns.map(column=>column.constructor)).toEqual([Float64Array,Uint32Array,Float64Array,Uint8Array,Float64Array]);
 for(const column of columns){expect(column.length).toBe(0);expect(column.byteOffset).toBe(0);expect(column.byteLength).toBe(0);expect(column.buffer.byteLength).toBe(0);}
 expect(new Set(columns.map(column=>column.buffer)).size).toBe(5);
 const again=h.read();expect(again.strictReads).toBe(0);const next=again.appearance.crops;
 expect(new Set([...columns.map(column=>column.buffer),next.ids.buffer,next.ordinals.buffer,next.growth.buffer,next.flags.buffer,next.removed.buffer]).size).toBe(10);
 expect(h.read(true).strictReads).toBe(1);expect(h.read().strictReads).toBe(0);
 const priorTick=h.world.tick;stepWorld(h.root,1);expect(campaignPresentation(h.root)).toBe(h.world);expect(h.world.tick).toBe(priorTick+1);
 expect(h.read().strictReads).toBe(1);expect(h.read().strictReads).toBe(0);
});

test('resource edits, order, recorded tile writes and copied roof context invalidate the proof',()=>{
 const h=harness();h.read();h.read();const plant=h.world.resources.find(r=>r.id===h.plantId)!;
 const mutations:ReadonlyArray<readonly [string,()=>void,number]>=[
  ['growth',()=>{plant.growth=.5;},0],['negative-zero',()=>{plant.growth=-0;},0],
  // The unchanged public codec compares growth with !== and can retain -0.
  // Our stronger proof stays conservatively cold for that +0/-0 mismatch.
  ['positive-zero',()=>{plant.growth=0;},1],
  ['blight',()=>{plant.blight={since:0,severity:.1,lastHarmTick:0,nextCheck:500,rng:123};},0],
  ['order',()=>{[h.world.resources[0],h.world.resources[1]]=[h.world.resources[1]!,h.world.resources[0]!];},0],
  ['tile',()=>{h.world.tiles[0]!.floor='wood-planks';markTerrainCellChanged(h.world.tiles,0);},0],
  ['roof',()=>{h.world.roofing??={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[],thick:[]}};h.world.roofing.constructed.push(1);},0]];
 for(const [name,mutate,nextReads] of mutations){
  mutate();expect(h.read().strictReads,name).toBe(1);expect(h.read().strictReads,name+' repeat').toBe(nextReads);
 }
 // Unknown descriptor shapes are allowed no proof; the real strict reader still runs.
 const zones=h.world.growingZones;Object.defineProperty(h.world,'growingZones',{enumerable:true,configurable:true,get:()=>zones});
 expect(h.read().strictReads).toBe(1);expect(h.read().strictReads).toBe(1);
});

test('copied, stale or replayed packets cannot consume another sidecar, and retry checkpoints',()=>{
 for(const mode of ['copy','stale','replay'] as const){const {world}=fixture(),e=new Constructor(),first=e.encode(world,0,0);e.takeNatural(first);
  const current=e.encode(world,0,0);if(mode==='replay')e.takeNatural(current);
  expect(()=>e.takeNatural(mode==='copy'?{...current}:mode==='stale'?first:current)).toThrow('Natural sidecar');
  const retry=e.encode(world,0,0);expect(retry.kind).toBe('checkpoint');expect(e.takeNatural(retry).checkpoint).toBe(true);
 }
});

test('real mapless callback clears the owned predecessor and return to a local map is a complete checkpoint',()=>{
 const e=lane.args![2] as OwnedEncoder,h=harness(e);h.read();expect(h.read().strictReads).toBe(0);
 const expected=h.oracle.campaignHeader(),header=e.campaignHeader();expect(header).toEqual(expected);h.natural.clear();
 const transport=e.encodeCampaignSummary(campaignOnlySummary(h.root),false),message={type:'campaign-only',...header,stepMs:0,speed:0,summary:transport.state,...transport.geography?{geography:transport.geography}:{}};
 (lane.args![1] as (message:unknown)=>void)(message);
 expect(lane.messages.at(-1)).toEqual({type:'resident-publication',version:2,publication:message,natural:null});
 const returned=h.read();expect(returned.packet.kind).toBe('checkpoint');expect(returned.appearance.checkpoint).toBe(true);expect(returned.strictReads).toBe(1);
});

test('late Natural failure after packet preparation forces a complete retry and never mutates the numerical World',()=>{
 const h=harness();h.read();h.read();h.world.resources.find(r=>r.id===h.plantId)!.growth=.75;
 const before=JSON.stringify(h.root),sentinel=Error('NUM late Natural reader failure');
 vi.mocked(plants.createPlantGrowthReader).mockImplementationOnce(()=>{throw sentinel;});
 expect(()=>h.owned.encode(h.world,0,0)).toThrow(sentinel);
 const retry=h.owned.encode(h.world,0,0),appearance=h.owned.takeNatural(retry);
 expect(retry.kind).toBe('checkpoint');expect(appearance.checkpoint).toBe(true);expect(Object.hasOwn(appearance,'baseRevision')).toBe(false);
 expect(JSON.stringify(h.root)).toBe(before);
});

test('public Natural capture stays strict despite copied flags or a fake third proof argument',()=>{
 const {world}=fixture(),e=new TerrainJournalSnapshotEncoder(),n=new WorkerNaturalAppearance();n.capture(world,e.encode(world,0,0));
 const packet=e.encode(world,0,0);Object.defineProperty(world,'resources',{get(){throw Error('NUM public strict resources');}});
 const attempted=n.capture as unknown as (world:World,packet:unknown,proof:unknown)=>unknown;
 expect(()=>attempted.call(n,world,{...packet,reuse:true,inputsUnchanged:true},{allow:true})).toThrow('NUM public strict resources');
});
