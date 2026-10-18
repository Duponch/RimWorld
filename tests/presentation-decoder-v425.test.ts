import {afterEach,expect,test,vi} from 'vitest';
import {createWorld} from '../src/sim/index.ts';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {PresentationSnapshotDecoder} from '../src/bridge/presentation-decoder.ts';
import * as terrain from '../src/sim/natural-terrain-runtime-256.ts';
import type {World} from '../src/sim/types.ts';
import type {OwnedResourceReuseWitness,OwnedResourceBaseReuseWitness} from '../src/sim/owned-validation-resources.ts';

afterEach(()=>vi.restoreAllMocks());
// Declared small guard fixture, with the real encoder and admission chain.
function source(){
 const w=createWorld(425,16,16);w.tick=2000;w.deterioration!.lastTick=w.tick;
 w.resources=[2,3,4].map(x=>({id:w.nextId++,kind:'berries' as const,x,z:2,amount:10,growth:.3,growthTick:1900}));
 for(const r of w.resources)w.tiles[r.z*w.width+r.x]={terrain:'grass'};
 return w;
}
class ObservedDecoder extends PresentationSnapshotDecoder {
 readonly visits:{all:number|undefined;base:number|undefined;substrates:number}[]=[];
 protected override validateMarshTransport(w:World,tiles?:readonly number[],all?:OwnedResourceReuseWitness,base?:OwnedResourceBaseReuseWitness){
  const original=terrain.readNaturalPlantSubstrate256;let substrates=0;
  const spy=vi.spyOn(terrain,'readNaturalPlantSubstrate256').mockImplementation(tile=>{substrates++;return original(tile);});
  try{return super.validateMarshTransport(w,tiles,all,base);}finally{spy.mockRestore();this.visits.push({all:all?.updated.length,base:base?.updated.length,substrates});}
 }
}
function setup(){
 const w=source(),encoder=new SnapshotEncoder(),closed=new ObservedDecoder(),raw=new SnapshotDecoder();
 const packet=structuredClone(encoder.encode(w,0,1)),first=closed.adopt(packet);expect(first.status,JSON.stringify(first.status==='resync'?first:null)).toBe('applied');expect(raw.adopt(structuredClone(packet)).status).toBe('applied');
 return {w,encoder,closed,raw};
}
function applySame(closed:ObservedDecoder,raw:SnapshotDecoder,packet:SnapshotMessage<true>){
 const saved=structuredClone(packet),actual=closed.adopt(packet),expected=raw.adopt(structuredClone(packet));
 expect(actual.status).toBe('applied');expect(actual).toEqual(expected);expect(packet).toEqual(saved);return actual;
}

test('growth-only keeps exact values and every visual change while reusing substrate facts',()=>{
 const {w,encoder,closed,raw}=setup();
 for(const plant of w.resources){plant.growth=.3123456789012345;plant.growthTick=1999;}
 const packet=structuredClone(encoder.encode(w,0,1));expect(packet.kind).toBe('delta');if(packet.kind!=='delta')throw Error('delta required');
 expect(packet.resources!.upserted).toEqual([]);expect(packet.resources!.growth).toHaveLength(12);
 applySame(closed,raw,packet);expect(closed.visits.at(-1)).toEqual({all:3,base:0,substrates:0});
});

test('mixed same-tick upserts remain fully checked and a late refusal cannot confirm them',()=>{
 const {w,encoder,closed,raw}=setup();w.resources[0]!.damage=1;w.resources[1]!.growth=.5;
 const good=structuredClone(encoder.encode(w,0,1)),bad=structuredClone(good);Object.assign(bad.world,{snow:{revision:-1}});
 expect(closed.adopt(bad).status).toBe('resync');expect(closed.visits.at(-1)).toEqual({all:2,base:1,substrates:1});
 applySame(closed,raw,good);expect(closed.visits.at(-1)).toEqual({all:2,base:1,substrates:1});
 expect(closed.adopt(good)).toEqual({status:'stale'});
 w.resources[2]!.growth=.6;applySame(closed,raw,structuredClone(encoder.encode(w,0,1)));expect(closed.visits.at(-1)?.substrates).toBe(0);
});

test('terrain changes, resource order and checkpoint replacements restore complete substrate admission',()=>{
 const {w,encoder,closed,raw}=setup();
 w.tiles[0]={terrain:'soil-natural'};w.resources[0]!.growth=.4;
 applySame(closed,raw,structuredClone(encoder.encode(w,0,1)));expect(closed.visits.at(-1)?.substrates).toBe(3);
 w.resources.reverse();applySame(closed,raw,structuredClone(encoder.encode(w,0,1)));expect(closed.visits.at(-1)).toEqual({all:undefined,base:undefined,substrates:3});
 applySame(closed,raw,structuredClone(encoder.encode(w,0,1,true)));expect(closed.visits.at(-1)?.substrates).toBe(3);
});

test('bad growth clocks and substrate upserts are refused; packet flags cannot grant a base witness',()=>{
 const {w,encoder,closed}=setup();w.resources[0]!.growth=.5;
 const good=structuredClone(encoder.encode(w,0,1));if(good.kind!=='delta')throw Error('delta required');
 const badClock=structuredClone(good);badClock.resources!.growth![2]=w.tick+1;
 expect(closed.adopt(badClock).status).toBe('resync');
 const bad=structuredClone(good);bad.resources!.growth=undefined;bad.resources!.upserted=[{...w.resources[0]!,z:w.height}];Object.assign(bad.resources!,{baseUpdated:[],growthOnly:true});
 expect(closed.adopt(bad).status).toBe('resync');expect(closed.adopt(good).status).toBe('applied');
});

test('fixed client metadata refusal and exceptions stay atomic and permit exact retry',()=>{
 const {w,encoder,closed,raw}=setup();w.resources[0]!.growth=.5;const packet=structuredClone(encoder.encode(w,0,1));
 expect(closed.adopt(packet,()=>false).status).toBe('resync');
 expect(()=>closed.adopt(packet,()=>{throw Error('late metadata failure');})).toThrow('late metadata failure');
 applySame(closed,raw,packet);expect(closed.visits.at(-1)?.substrates).toBe(0);
});
