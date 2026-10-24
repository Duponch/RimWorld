// Uses the real FrameOwner and public strict guard as the differential oracle.
import {expect,test,vi} from 'vitest';
import {ResidentFilthFrameOwner,isOwnedResidentFilthCopyInternal as rowProof,isOwnedResidentFilthItemListInternal as listProof} from '../src/bridge/resident-filth-section';
import {createFirefoamLaneValidatorsInternal290} from '../src/sim/firefoam-save-290';
import {validFirefoamHistoricalTransport290 as strictHistorical,validFirefoamWorld290 as strictWorld} from '../src/sim/firefoam-save-290';
import type {SnapshotMessage} from '../src/bridge/snapshots';
import type {World} from '../src/sim/types';
import {deconstructionCamp} from './scenarios/deconstruction';
type Data=Record<string,unknown>;
const dirt=(id:number)=>({id,kind:'dirt',x:1,z:1,thickness:1});
const foam=(id:number,tick=20)=>({id,kind:'firefoam',x:2,z:3,thickness:1,grownCore:tick*10,expiresAfterCore:300000,nextCheckCore:tick*10+1});
export function ownerFixture(rows:Data[],literal=false){
 const owner=new ResidentFilthFrameOwner();
 const packet={type:'snapshot',kind:'checkpoint',epoch:1,revision:1,stepMs:0,speed:0,
  world:{tick:20,nextId:1_000_000,width:128,height:128,filth:0}} as unknown as SnapshotMessage<true>;
 const raw={epoch:1,revision:1,tick:20,checkpoint:true,section:literal?{mode:'literal',value:{rng:1,cleaned:0,items:rows}}:
  {mode:'items',reset:true,count:rows.length,header:{rng:1,cleaned:0,items:0},removed:[],upserted:rows}};
 const draft=owner.prepare(packet,raw);if(!draft||draft==='stale')throw Error('real owner preparation');
 const filth=draft.packet.world.filth!;return {owner,packet,draft,filth,items:filth.items};
}
const validators=()=>createFirefoamLaneValidatorsInternal290(Object.getOwnPropertyDescriptor,undefined,rowProof,listProof);
function pair(raw:unknown,fast:ReturnType<typeof validators>,version=293){const a=fast.historical(raw,version);expect(a).toBe(strictHistorical(raw,version));return a;}

test('only prepareItems ordinary arrays acquire array provenance; literal/foreign/wrapper do not',()=>{
 const a=ownerFixture([dirt(1)]),b=ownerFixture([dirt(2)],true);
 expect(listProof(a.items)).toBe(true);expect(listProof(b.items)).toBe(false);
 expect(rowProof(a.items[0]!)).toBe(true);expect(Object.isFrozen(a.items)).toBe(true);
 expect(listProof(Object.freeze([...a.items]))).toBe(false);expect(listProof(new Proxy(a.items,{}))).toBe(false);
});
test('second same-array admission avoids all row descriptors; public strict still reads them',()=>{
 const {filth,items}=ownerFixture([dirt(1),dirt(2)]),fast=validators();
 expect(pair({filth},fast)).toBe(true);
 const spy=vi.spyOn(Object,'getOwnPropertyDescriptor');
 try{
  expect(fast.historical({filth},293)).toBe(true);
  expect(spy.mock.calls.filter(([value])=>items.includes(value as never))).toHaveLength(0);
  spy.mockClear();expect(strictHistorical({filth},293)).toBe(true);
  expect(spy.mock.calls.some(([value])=>items.includes(value as never))).toBe(true);
 }finally{spy.mockRestore();}
});
test('versions and roles are independent; no trace-list success authorizes a thing list',()=>{
 const {filth,items}=ownerFixture([foam(1)]),fast=validators();
 expect(pair({filth},fast)).toBe(true);expect(pair({filth},fast,289)).toBe(false);
 expect(pair({filth},fast,290)).toBe(true);expect(pair({filth},fast)).toBe(true);
 expect(pair({items},fast)).toBe(false);expect(pair({filthFeet:{carried:items}},fast)).toBe(false);
});
test('historical packet warms the same list used immediately by reconstructed World admission',()=>{
 const f=ownerFixture([dirt(1),dirt(2)]),fast=validators();
 const world={...f.draft.packet.world,schemaVersion:293,pawns:[],structures:[],jobs:[],packed:[],resources:[],piles:[],stockpiles:[],growingZones:[]} as unknown as World;
 const packet={...f.draft.packet,world};
 expect(fast.historical(packet,293)).toBe(strictHistorical(packet,293));
 const spy=vi.spyOn(Object,'getOwnPropertyDescriptor');
 try{expect(fast.world(world)).toBe(true);
  expect(spy.mock.calls.filter(([value])=>f.items.includes(value as never))).toHaveLength(0);
 }finally{spy.mockRestore();}
 expect(strictWorld(world)).toBe(true);
});
test.each(['kind','firefoam290','firefoamTask290','coveredInFirefoam290'] as const)('live inherited %s after the filth header invalidates a warm list',key=>{
 const source:Data=dirt(1);if(key==='kind')delete source.kind;
 const {filth}=ownerFixture([source]),fast=validators();expect(pair({filth},fast)).toBe(true);
 const previous=Object.getOwnPropertyDescriptor(Object.prototype,key);let reads=0;
 function polluted(){return {filth:new Proxy({items:filth.items},{getOwnPropertyDescriptor(target,name){
  if(name==='items')Object.defineProperty(Object.prototype,key,{get(){reads++;return {};},configurable:true});
  return Reflect.getOwnPropertyDescriptor(target,name);
 }})};}
 try{expect(fast.historical(polluted(),293)).toBe(false);expect(reads).toBe(0);}
 finally{if(previous)Object.defineProperty(Object.prototype,key,previous);else Reflect.deleteProperty(Object.prototype,key);}
 try{expect(strictHistorical(polluted(),293)).toBe(false);expect(reads).toBe(0);}
 finally{if(previous)Object.defineProperty(Object.prototype,key,previous);else Reflect.deleteProperty(Object.prototype,key);}
 expect(pair({filth},fast)).toBe(true);
});
test('own kind masks inherited kind on every row, while a single missing kind is enough to refuse',()=>{
 const a=ownerFixture([dirt(1)]),b=ownerFixture([{id:2}]),fast=validators();
 expect(pair({filth:a.filth},fast)).toBe(true);expect(pair({filth:b.filth},fast)).toBe(true);
 // The parent must mask inherited kind too; otherwise its own fence rejects
 // before this list is reached. kind data is arbitrary on a world wrapper.
 try{
  Object.defineProperty(Object.prototype,'kind',{value:'foreign',configurable:true});
  expect(pair({kind:'world',filth:{kind:'filth',items:a.items}},fast)).toBe(true);
  expect(pair({kind:'world',filth:{kind:'filth',items:b.items}},fast)).toBe(false);
 }finally{Reflect.deleteProperty(Object.prototype,'kind');}
});
test('array wrappers/getters/nonstandard prototypes never borrow a list identity',()=>{
 const {items}=ownerFixture([dirt(1)]),fast=validators();expect(pair({filth:{items}},fast)).toBe(true);
 let gets=0;const wrapper=new Proxy(items,{get(target,key,receiver){gets++;return Reflect.get(target,key,receiver);}});
 expect(pair({filth:{items:wrapper}},fast)).toBe(true);expect(gets).toBeGreaterThan(0);
 const wrong=Object.setPrototypeOf([...items],null);expect(pair({filth:{items:wrong}},fast)).toBe(false);
 const accessor=[...items];Object.defineProperty(accessor,'0',{get(){throw Error('must not invoke');},enumerable:true});
 expect(pair({filth:{items:accessor}},fast)).toBe(false);
});
test('literal primitive, nested-array and alias behavior remains strict',()=>{
 const fast=validators();
 for(const items of [[null,undefined,0,'x',true],[[dirt(1)]],[dirt(1),dirt(1)]]){
  const {filth}=ownerFixture(items as unknown as Data[],true);
  expect(listProof(filth.items)).toBe(false);pair({filth},fast);pair({filth},fast);
 }
});
test('outer cycles remain invalid after a list became positive',()=>{
 const {filth}=ownerFixture([dirt(1)]),fast=validators();expect(pair({filth},fast)).toBe(true);
 const raw:Data={filth};raw.world=raw;expect(pair(raw,fast)).toBe(false);
});
test('Array.prototype inherited fields do not become row or own array fields',()=>{
 const {filth}=ownerFixture([dirt(1)]),fast=validators();expect(pair({filth},fast)).toBe(true);let reads=0;
 try{Object.defineProperty(Array.prototype,'firefoam290',{get(){reads++;return {};},configurable:true});
  expect(pair({filth},fast)).toBe(true);expect(reads).toBe(0);
 }finally{Reflect.deleteProperty(Array.prototype,'firefoam290');}
});
test.each([{firefoam290:undefined},{firefoamTask290:undefined},{coveredInFirefoam290:undefined}])('forbidden own fields never become positive: %j',extra=>{
 const {filth}=ownerFixture([{...dirt(1),...extra}]),fast=validators();
 expect(pair({filth},fast)).toBe(false);expect(pair({filth},fast)).toBe(false);
});
test('live local clocks/bounds/nextId and source ownership still run after a list hit',()=>{
 const w=deconstructionCamp(1,16),id=w.nextId++,a=ownerFixture([foam(id,w.tick)]),fast=validators();
 w.filth=a.filth;const check=()=>{const got=fast.world(w);expect(got).toBe(strictWorld(w));return got;};
 expect(check()).toBe(true);expect(check()).toBe(true);
 const tick=w.tick,width=w.width,next=w.nextId;
 w.tick++;expect(check()).toBe(false);w.tick=tick;
 w.width=2;expect(check()).toBe(false);w.width=width;
 w.nextId=id;expect(check()).toBe(false);w.nextId=next;
 w.firefoam290={rng:1,waves:[{id:w.nextId++,sourceId:id,center:{x:2,z:3},startedAtCore:w.tick*10,advancedAtCore:w.tick*10,
  cells:[3*w.width+2],damageOnlyCells:[],nextCell:1,affectedActorKeys:[]}]};expect(check()).toBe(false);
 w.filth={...w.filth,items:[]};expect(check()).toBe(true);w.filth=a.filth;expect(check()).toBe(false);
});
test('one-row delta creates a new array, an unchanged delta keeps the exact old one',()=>{
 const f=ownerFixture([dirt(1),dirt(2)]),fast=validators();f.owner.commit(f.draft.packet.world as World,f.draft);
 expect(pair({filth:f.filth},fast)).toBe(true);
 function prepare(revision:number,upserted:Data[]){
  const packet={...f.packet,kind:'delta',revision,baseRevision:revision-1,world:{...f.packet.world,tick:20+revision}} as unknown as SnapshotMessage<true>;
  const draft=f.owner.prepare(packet,{epoch:1,revision,baseRevision:revision-1,tick:20+revision,checkpoint:false,
   section:{mode:'items',reset:false,count:2,header:{rng:1,cleaned:0,items:0},removed:[],upserted}});
  if(!draft||draft==='stale')throw Error('delta');f.owner.commit(draft.packet.world as World,draft);return draft.packet.world.filth!;
 }
 const changed=prepare(2,[{...dirt(1),thickness:2}]);expect(changed.items).not.toBe(f.items);expect(listProof(changed.items)).toBe(true);
 expect(pair({filth:changed},fast)).toBe(true);expect(pair({filth:changed},fast)).toBe(true);
 const same=prepare(3,[]);expect(same.items).toBe(changed.items);expect(pair({filth:same},fast)).toBe(true);
});
// Two million strict visits are deliberate and excluded from routine selection.
test.skipIf(process.env.V475_LIST_BUDGET!=='1')('aliases consume every visit and preserve the exact 2m budget boundary',()=>{
 const {filth}=ownerFixture(Array.from({length:10_000},(_,n)=>dirt(n+1))),fast=validators();
 expect(pair({filth},fast)).toBe(true);
 for(const n of [199,200]){const raw={sites:Array.from({length:n},()=>({filth}))};expect(pair(raw,fast)).toBe(n===199);}
});
