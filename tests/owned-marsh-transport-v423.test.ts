import {afterEach,expect,test,vi} from 'vitest';
import {createOwnedMarshTransportOwner,validateMarshTransport,type OwnedMarshTransportOwner} from '../src/sim/marsh.ts';
import * as terrainRuntime from '../src/sim/natural-terrain-runtime-256.ts';
import type {OwnedResourceReuseWitness} from '../src/sim/owned-validation-resources.ts';
import type {Resource,Tile,World} from '../src/sim/types.ts';
import {bridgeWorkshopV387} from './scenarios/bridge-v387.ts';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotAdoption,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {createWorld} from '../src/sim/index.ts';

afterEach(()=>vi.restoreAllMocks());
/** Declared guard fixture, not a generated save or acquired gameplay history. */
function fixture():World {
 const {world:w}=bridgeWorkshopV387(16);w.structures=[];w.jobs=[];w.growingZones=[];
 w.tiles=w.tiles.map(()=>({terrain:'soil-natural'}));w.tiles[0]={terrain:'mud'};w.tick=10;
 w.resources=[1,2,3].map<Resource>(x=>({id:w.nextId++,kind:'tree',species:'maple',x,z:1,amount:1}));
 return w;
}
const retained=(w:World):World=>({...w});
function replaced(w:World,ordinal=1,patch:Partial<Resource>={growth:.5}):World {
 const next=retained(w);next.resources=[...w.resources];next.resources[ordinal]={...w.resources[ordinal]!,...patch};return next;
}
const reuse=(previous:World,ordinals:readonly number[]=[]):OwnedResourceReuseWitness=>({kind:'sparse',previous,updated:ordinals.map(afterOrdinal=>({id:previous.resources[afterOrdinal]!.id,afterOrdinal}))});
function observe(owner:OwnedMarshTransportOwner,w:World,changedTiles:readonly number[]|undefined,witness?:OwnedResourceReuseWitness){
 const original=terrainRuntime.readNaturalPlantSubstrate256,visits:Tile[]=[];
 // Transparent module-call observer; no getter or writer is added to World.
 // This observes traversal coverage, not elapsed time or speed.
 const spy=vi.spyOn(terrainRuntime,'readNaturalPlantSubstrate256').mockImplementation(tile=>{visits.push(tile as Tile);return original(tile);});
 try{return {errors:owner.validate(w,changedTiles,witness),walks:visits.length};}finally{spy.mockRestore();}
}
function prime(owner:OwnedMarshTransportOwner,w:World):void {
 expect(observe(owner,w,[])).toEqual({errors:[],walks:w.resources.filter(r=>r.kind!=='rock').length});owner.commit(w);
}
function same(owner:OwnedMarshTransportOwner,w:World,changedTiles:readonly number[]|undefined,witness:OwnedResourceReuseWitness|undefined,walks:number):string[]{
 const before=structuredClone(w),expected=validateMarshTransport(w,w.schemaVersion,changedTiles),actual=observe(owner,w,changedTiles,witness);
 expect(actual).toEqual({errors:expected,walks});expect(w).toEqual(before);return actual.errors;
}

test('same-tick replacements validate only their entire selected substrate; commit enables the exact next empty edge',()=>{
 const w=fixture(),before=structuredClone(w),owner=createOwnedMarshTransportOwner();prime(owner,w);
 const next=replaced(w);expect(next.tick).toBe(w.tick);
 expect(same(owner,next,[],reuse(w,[1]),1)).toEqual([]);expect(w).toEqual(before);
 // A successful local guard is still pending, not a confirmed predecessor.
 same(owner,retained(next),[],reuse(next),3);owner.discard();
 same(owner,next,[],reuse(w,[1]),1);owner.commit(next);
 const empty=retained(next);same(owner,empty,[],reuse(next),0);owner.commit(empty);
 const later=replaced(empty,2);later.tick++;same(owner,later,[],reuse(empty,[2]),1);
});

test('all replacements, including rock transitions and unknown species, retain the source-array first refusal order',()=>{
 const w=fixture(),owner=createOwnedMarshTransportOwner();prime(owner,w);
 const next=replaced(w,2,{x:0,z:w.height});next.resources[0]={...w.resources[0]!,species:'cypress'};
 expect(same(owner,next,[],reuse(w,[2,0]),1)).toEqual(['Plant violates its actual substrate profile.']);owner.discard();
 const outside=replaced(w,0,{x:0,z:w.height});outside.resources[2]={...w.resources[2]!,species:'cypress'};
 expect(same(owner,outside,[],reuse(w,[2,0]),0)).toEqual(['Plant outside terrain.']);owner.discard();
 const rockBase=fixture();rockBase.resources[1]={...rockBase.resources[1]!,kind:'rock',species:undefined};const rocks=createOwnedMarshTransportOwner();prime(rocks,rockBase);
 const badTree=replaced(rockBase,1,{kind:'tree',species:'cypress'});
 expect(same(rocks,badTree,[],reuse(rockBase,[1]),1)).toEqual(['Plant violates its actual substrate profile.']);rocks.discard();
 const goodTree=replaced(rockBase,1,{kind:'tree',species:'cypress',x:0,z:0});same(rocks,goodTree,[],reuse(rockBase,[1]),1);rocks.commit(goodTree);
 const backToRock=replaced(goodTree,1,{kind:'rock',species:undefined,x:0,z:goodTree.height});same(rocks,backToRock,[],reuse(goodTree,[1]),0);
 const unknown=replaced(w,1,{species:undefined,x:0,z:0});same(owner,unknown,[],reuse(w,[1]),1);
});

test('tiles, structures, construction, sowing and growing zones stay at their complete historical frontiers',()=>{
 const w=fixture(),owner=createOwnedMarshTransportOwner();prime(owner,w);
 const structure=retained(w);structure.structures=[{id:w.nextId+1,kind:'wall',material:'wood',x:0,z:0,orientation:0,footprint:'standard'}];
 expect(same(owner,structure,[],reuse(w),0)).toEqual(['Building lacks actual terrain support.']);owner.discard();
 const construction=retained(w);construction.jobs=[{id:w.nextId+2,kind:'wall',material:'wood',x:0,z:0,orientation:0,footprint:'standard'} as never];
 expect(same(owner,construction,[],reuse(w),0)).toEqual(['Construction lacks actual terrain support.']);owner.discard();
 const sowing=retained(w);sowing.jobs=[{id:w.nextId+3,kind:'sow',x:0,z:0} as never];
 expect(same(owner,sowing,[],reuse(w),0)).toEqual(['Sowing lacks fertile unlayered terrain.']);owner.discard();
 const zone=retained(w);zone.growingZones=[{id:w.nextId+4,cells:[0],plant:'rice',allowSow:true,allowCut:true}];
 expect(same(owner,zone,[],reuse(w),0)).toEqual(['Growing zone on infertile terrain.']);owner.discard();
 const tile=retained(w);tile.tiles=[...w.tiles];tile.tiles[0]={terrain:'unknown-terrain' as never};
 expect(same(owner,tile,[0],reuse(w),0)).toEqual(['Invalid or future natural terrain.']);owner.discard();
 const beneath=replaced(w,1);beneath.tiles=[...w.tiles];beneath.tiles[beneath.resources[1]!.z*w.width+beneath.resources[1]!.x]={terrain:'soil-natural',floor:'wood-planks'};
 // Even a falsely empty changed-tile list cannot reuse a different tile Array.
 expect(same(owner,beneath,[],reuse(w,[1]),2)).toEqual(['Plant violates its actual substrate profile.']);
});

test('unsupported headers, tile identities, full boundaries and incomplete patch metadata fall back to all resources',()=>{
 const w=fixture(),owner=createOwnedMarshTransportOwner();prime(owner,w);
 const full=(next:World,witness?:OwnedResourceReuseWitness,tiles:readonly number[]|undefined=[])=>{same(owner,next,tiles,witness,next.resources.filter(r=>r.kind!=='rock').length);owner.discard();};
 full(replaced(w));full(replaced(w),reuse(structuredClone(w),[1]));
 full(replaced(w),reuse(w,[0,1,2]));
 for(const field of ['schemaVersion','width','height','seed'] as const){const next=replaced(w);next[field]+=field==='schemaVersion'?-1:1;full(next,reuse(w,[1]));}
 const back=replaced(w);back.tick--;full(back,reuse(w,[1]));
 const site=replaced(w);site.site={...w.site,revision:w.site?.revision===3?2:3} as never;full(site,reuse(w,[1]));
 const tileCopy=replaced(w);tileCopy.tiles=[...w.tiles];full(tileCopy,reuse(w,[1]));
 full(replaced(w),reuse(w,[1]),[0]);
 // No explicit [] means the public complete tile path and complete plants.
 const next=replaced(w);expect(observe(owner,next,undefined,reuse(w,[1]))).toEqual({errors:validateMarshTransport(next,next.schemaVersion,undefined),walks:3});owner.discard();
 const emptyClone=retained(w);emptyClone.resources=[...w.resources];full(emptyClone,reuse(w));
 full(retained(w),reuse(w,[1]));
 const added=replaced(w);added.resources.push({...w.resources[0]!,id:w.nextId});full(added,reuse(w,[1]));
 const removed=replaced(w);removed.resources.pop();full(removed,reuse(w,[1]));
 const reordered=retained(w);reordered.resources=[...w.resources].reverse();full(reordered,reuse(w));
 const wrongId=replaced(w);wrongId.resources[1]!.id=w.nextId;full(wrongId,reuse(w,[1]));
 const badUpdates:unknown[]=[
  [{id:w.resources[1]!.id,afterOrdinal:-1}], [{id:w.resources[1]!.id,afterOrdinal:.5}],
  [{id:w.resources[1]!.id,afterOrdinal:3}], [{id:w.resources[1]!.id,afterOrdinal:1},{id:w.resources[1]!.id,afterOrdinal:1}],
  [{id:w.resources[0]!.id,afterOrdinal:1}], [{}], {},
 ];
 const hole:unknown[]=[];hole.length=1;badUpdates.push(hole,Object.create([{id:w.resources[1]!.id,afterOrdinal:1}]));
 const symbol=[{id:w.resources[1]!.id,afterOrdinal:1}];Object.defineProperty(symbol,Symbol('extra'),{value:0});badUpdates.push(symbol);
 let getterCalls=0;const getter:unknown[]=[];Object.defineProperty(getter,'0',{enumerable:true,get(){getterCalls++;return {id:w.resources[1]!.id,afterOrdinal:1};}});badUpdates.push(getter);
 for(const updated of badUpdates)full(replaced(w),{kind:'sparse',previous:w,updated} as OwnedResourceReuseWitness);
 expect(getterCalls).toBe(0);
 full(replaced(w),{...reuse(w,[1]),kind:'full'} as unknown as OwnedResourceReuseWitness);
 full(replaced(w),Object.create(reuse(w,[1])) as OwnedResourceReuseWitness);
});

test('late refusal, throw, stale-style discard and mismatched commit never publish a pending World',()=>{
 const w=fixture(),owner=createOwnedMarshTransportOwner();prime(owner,w);
 const next=replaced(w);same(owner,next,[],reuse(w,[1]),1);
 // The enclosing adoption refuses after Marsh, so its local success is discarded.
 owner.discard();same(owner,retained(next),[],reuse(next),3);owner.discard();same(owner,retained(w),[],reuse(w),0);owner.discard();
 const spy=vi.spyOn(terrainRuntime,'readNaturalPlantSubstrate256').mockImplementationOnce(()=>{throw Error('after original plant frontier');});
 try{expect(()=>owner.validate(next,[],reuse(w,[1]))).toThrow('after original plant frontier');}finally{spy.mockRestore();}
 owner.discard();same(owner,retained(next),[],reuse(next),3);owner.discard();same(owner,retained(w),[],reuse(w),0);
 // A stale packet never validates; discard must keep the last accepted base.
 owner.discard();same(owner,retained(w),[],reuse(w),0);owner.discard();
 same(owner,next,[],reuse(w,[1]),1);owner.commit(retained(next));
 same(owner,retained(w),[],reuse(w),3);owner.discard();
 const bad=replaced(w,1,{species:'cypress'});same(owner,bad,[],reuse(w,[1]),2);owner.commit(bad);
 same(owner,retained(bad),[],reuse(bad),2);
});

test('a selected unknown species still reads malformed actual stone and cannot confirm after a throw',()=>{
 for(const stone of [123,[],{}]){
  const w=fixture();w.tiles[0]={terrain:'grass',stone:stone as never};
  const owner=createOwnedMarshTransportOwner();prime(owner,w);
  const next=replaced(w,1,{species:undefined,x:0,z:0}),before=structuredClone(w),saved=structuredClone(next);
  expect(()=>validateMarshTransport(next,next.schemaVersion,[])).toThrow(TypeError);
  expect(()=>owner.validate(next,[],reuse(w,[1]))).toThrow(TypeError);owner.discard();
  expect(w).toEqual(before);expect(next).toEqual(saved);same(owner,retained(w),[],reuse(w),0);
 }
});
test('RAW/public validation always re-reads mutable inputs and rejects malformed stone for unknown species',()=>{
 const w=fixture(),owner=createOwnedMarshTransportOwner();prime(owner,w);
 w.resources[1]!.species='cypress';
 expect(validateMarshTransport(w,w.schemaVersion,[])).toEqual(['Plant violates its actual substrate profile.']);
 expect(Reflect.apply(validateMarshTransport,undefined,[w,w.schemaVersion,[],()=>[]])).toEqual(['Plant violates its actual substrate profile.']);
 const old=fixture();expect(validateMarshTransport(old,255,[])).toEqual([]);old.tiles[old.resources[0]!.z*old.width+old.resources[0]!.x]={terrain:'water-shallow'};
 expect(validateMarshTransport(old,255,[])).toEqual(['Plant rooted in incompatible water.']);
 for(const stone of [123,[],{}]){
  const bad=fixture();bad.resources[0]!.species=undefined;bad.tiles[bad.resources[0]!.z*bad.width+bad.resources[0]!.x]={terrain:'grass',stone:stone as never};
  const before=structuredClone(bad);expect(()=>validateMarshTransport(bad,bad.schemaVersion,[])).toThrow(TypeError);expect(bad).toEqual(before);
  const fresh=createOwnedMarshTransportOwner();expect(()=>fresh.validate(bad,[],reuse(fixture()))).toThrow(TypeError);fresh.discard();expect(bad).toEqual(before);
 }
});

test('the real Decoder sparse producer keeps a late refused candidate unconfirmed and preserves retry and stale handling',()=>{
 class ClosedTerrainDecoder extends SnapshotDecoder {
  readonly owner=createOwnedMarshTransportOwner();
  readonly seen:(number|undefined)[]=[];
  override adopt(packet:SnapshotMessage<true>):SnapshotAdoption {
   this.owner.discard();
   try{const result=super.adopt(packet);if(result.status==='applied')this.owner.commit(result.world);else this.owner.discard();return result;}
   catch(error){this.owner.discard();throw error;}
  }
  protected override validateMarshTransport(next:World,changedTiles?:readonly number[],witness?:OwnedResourceReuseWitness):string[]{
   this.seen.push(witness?.updated.length);return this.owner.validate(next,changedTiles,witness);
  }
 }
 const source=createWorld(423,16,16),encoder=new SnapshotEncoder(),closed=new ClosedTerrainDecoder(),raw=new SnapshotDecoder();
 expect(source.resources.filter(r=>r.kind!=='rock').length).toBeGreaterThan(1);
 const adoptObserved=(packet:SnapshotMessage<true>)=>{
  const original=terrainRuntime.readNaturalPlantSubstrate256;let walks=0;
  const spy=vi.spyOn(terrainRuntime,'readNaturalPlantSubstrate256').mockImplementation(tile=>{walks++;return original(tile);});
  try{return {result:closed.adopt(packet),walks};}finally{spy.mockRestore();}
 };
 const checkpoint=structuredClone(encoder.encode(source,0,1)),savedCheckpoint=structuredClone(checkpoint);
 const first=closed.adopt(checkpoint);expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Expected checkpoint');
 expect(raw.adopt(structuredClone(checkpoint)).status).toBe('applied');const predecessor=structuredClone(first.world);
 const plant=source.resources.find(r=>r.kind!=='rock')!;expect(plant).toBeDefined();plant.damage=1;
 const good=structuredClone(encoder.encode(source,0,1));expect(good.kind).toBe('delta');
 const bad=structuredClone(good);Object.assign(bad.world,{snow:{revision:-1}});const savedBad=structuredClone(bad),savedGood=structuredClone(good);
 expect(adoptObserved(bad)).toEqual({result:{status:'resync',reason:'Snow surface clock, depth or owner invalid.'},walks:1});
 expect(first.world).toEqual(predecessor);expect(bad).toEqual(savedBad);
 const retry=adoptObserved(good);expect(retry.walks).toBe(1);
 const applied=retry.result,reference=raw.adopt(structuredClone(good));expect(applied.status).toBe('applied');expect(applied).toEqual(reference);
 expect(closed.seen).toEqual([undefined,1,1]);expect(first.world).toEqual(predecessor);
 expect(adoptObserved(good)).toEqual({result:{status:'stale'},walks:0});expect(closed.seen).toEqual([undefined,1,1]);
 const next=structuredClone(encoder.encode(source,0,1)),empty=adoptObserved(next);expect(empty.walks).toBe(0);
 const continued=empty.result,rawContinued=raw.adopt(structuredClone(next));
 expect(continued.status).toBe('applied');expect(continued).toEqual(rawContinued);expect(closed.seen.at(-1)).toBe(0);
 expect(checkpoint).toEqual(savedCheckpoint);expect(good).toEqual(savedGood);
});
