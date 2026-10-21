import {expect,test} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isSchema275OrLater,isSchema276OrLater} from '../src/sim/schema-compatibility-257.ts';
import {validShipHullField276,validShipHullBuilding276,validShipPartHistoricalTransport276} from '../src/sim/ship-part-save-276.ts';
import {validShipReactorContinuation275,validShipReactorWorld275} from '../src/sim/ship-reactor-save-275.ts';
import {validateShipReactorThreats275,validShipReactorThreatContinuation275} from '../src/sim/ship-reactor-threat-save-275.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {stepWorld} from '../src/sim/engine.ts';
import type {Structure,World} from '../src/sim/types.ts';

test('276 adds hull kinds exclusively, while275 components continue and277 remains closed',()=>{
 expect(isSchema275OrLater(275)).toBe(true);expect(isSchema275OrLater(276)).toBe(true);
 expect(isSchema276OrLater(276)).toBe(true);
 for(const version of [275,277,276.5,'276',NaN])expect(isSchema276OrLater(version)).toBe(false);
 const header={width:32,height:32,nextId:20};
 for(const kind of ['ship-beam','ship-engine'] as const)for(const orientation of [0,1,2,3] as const){
  const part={id:10,kind,x:16,z:16,orientation,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
  expect(validShipHullBuilding276(part,276,header)).toBe(true);
  for(const version of [275,277])expect(validShipHullBuilding276(part,version,header)).toBe(false);
  expect(validShipHullField276({kind},276,'job')).toBe(true);expect(validShipHullField276(part,276,'packed')).toBe(false);
  for(const mutate of [
   {...part,damage:400},{...part,damage:0},{...part,x:0,z:0},{...part,quality:undefined},
   {...part,shipReactor275:undefined},{...part,material:'plasteel'},{...part,power:{on:true,parentId:null}},
   {...part,power:{on:false,parentId:1}},{...part,power:{on:false,parentId:null,switchOn:false}},
  ])expect(validShipHullBuilding276(mutate,276,header)).toBe(false);
 }
});

test('275 historical fences cover actual namespaces and sparse public upserts, without reading terrain or getters',()=>{
 const entries=[
  {structures:[{kind:'ship-beam'}]}, {jobs:[{kind:'ship-engine'}]}, {research:{shipEngine:false}},
  {research:{project:'ship-engine'}}, {research:{progress:{'ship-engine':0}}},
  {worldMaps:{sites:[{map:{structures:[{kind:'ship-engine'}]}}]}},
  {worldPawns:{owners:[{packed:[{building:{kind:'ship-beam'}}]}]}},
  {worldGroups:{abandonedContents:[{humans:[{packed:[{building:{kind:'ship-engine'}}]}]}]}},
  {stockpiles:[{items:{'ship-beam':false}}]}, {stockpiles:[{allowed:['ship-engine']}]},
  {world:{schemaVersion:275},structures:{removed:[],upserted:[{kind:'ship-beam'}]}},
 ];
 for(const raw of entries){expect(validShipPartHistoricalTransport276(raw,275)).toBe(false);expect(validShipPartHistoricalTransport276(raw,276)).toBe(true);expect(validShipPartHistoricalTransport276(raw,277)).toBe(false);}
 let reads=0;const ordinary={structures:[{kind:'wall'}],research:{shipBasics:{points:0}}};
 Object.defineProperty(ordinary,'resources',{enumerable:true,get(){reads++;throw Error('No terrain walk');}});
 expect(validShipPartHistoricalTransport276(ordinary,275)).toBe(true);
 const accessor={};Object.defineProperty(accessor,'structures',{enumerable:true,get(){reads++;throw Error('No getter');}});
 expect(validShipPartHistoricalTransport276(accessor,275)).toBe(false);
 const part={id:10,kind:'ship-engine',x:16,z:16,orientation:0,footprint:'standard',material:'steel'};
 Object.defineProperty(part,'power',{enumerable:true,get(){reads++;throw Error('No getter');}});
 expect(validShipHullBuilding276(part,276,{width:32,height:32,nextId:20})).toBe(false);expect(reads).toBe(0);
});

const SOURCE_275='tmp/ship-reactor-v451/native-ui/2026-10-21T21-55-10-451Z/played-startup.json';
const SHA_275='43db8af22cfc5f4db9d880601d7fda91ebc6721c6d90a13e51a80b9dbfd764d0';
function acquired(){
 const text=readFileSync(SOURCE_275,'utf8');expect(createHash('sha256').update(text).digest('hex')).toBe(SHA_275);
 const before=JSON.parse(text) as World;expect(before.schemaVersion).toBe(275);
 const w=deserializeWorld(text);expect(w.schemaVersion).toBe(276);expect(validateWorld(w)).toEqual([]);
 return {w,before,text};
}

test.skipIf(!existsSync(SOURCE_275))('the acquired native V451 activation migrates by number alone, preserving reactor and pressure through a real step and both public readers',()=>{
 const {w,before,text}=acquired();expect(JSON.parse(serializeWorld(w))).toEqual({...before,schemaVersion:276});
 expect(validShipReactorWorld275(w)).toBe(true);expect(validateShipReactorThreats275(w)).toEqual([]);
 expect(validShipReactorContinuation275(before,w)).toBe(true);expect(validShipReactorThreatContinuation275(before,w)).toBe(true);
 const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const packet=structuredClone(encoder.encode(w,0,0));
 expect(decoder.adopt(structuredClone(packet)).status).toBe('applied');expect(resident.adopt(structuredClone(packet)).status).toBe('applied');
 const prior=structuredClone(w),twin=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(twin);
 expect(serializeWorld(twin)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
 expect(validShipReactorContinuation275(prior,w)).toBe(true);expect(validShipReactorThreatContinuation275(prior,w)).toBe(true);
 expect(w.shipReactorThreats275!.adoptedAtCore).toBe(before.shipReactorThreats275!.adoptedAtCore);
 expect(w.structures.find(s=>s.kind==='ship-reactor')!.shipReactor275).toEqual(before.structures.find(s=>s.kind==='ship-reactor')!.shipReactor275);
 const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 expect(decoder.adopt(structuredClone(delta)).status).toBe('applied');expect(resident.adopt(delta).status).toBe('applied');
 expect(readFileSync(SOURCE_275,'utf8')).toBe(text);
},120000);

test.skipIf(!existsSync(SOURCE_275))('275 RAW and public checkpoint/delta refuse276 content in real saved domains and keep the admitted old world',()=>{
 const {before,text}=acquired(),encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const packet=structuredClone(encoder.encode(before,0,0));if(packet.kind!=='checkpoint')throw Error('Expected original275 checkpoint');
 const accepted=decoder.adopt(structuredClone(packet)),shown=resident.adopt(structuredClone(packet));
 expect(accepted.status).toBe('applied');expect(shown.status).toBe('applied');if(accepted.status!=='applied'||shown.status!=='applied')throw Error('Original275 rejected');
 const retained=structuredClone(accepted.world),retainedShown=structuredClone(shown.world);
 for(const mutate of [
  (w:World)=>Object.assign(w.research!,{shipEngine:false}),
  (w:World)=>{w.structures.find(s=>s.kind==='ship-reactor')!.kind='ship-engine';},
 ]){
  const bad=JSON.parse(text) as World;mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  const full=structuredClone(packet);mutate(full.world);
  expect(new SnapshotDecoder().adopt(structuredClone(full)).status).toBe('resync');expect(new ResidentPresentationAssembler().adopt(full).status).toBe('resync');
 }
 Object.assign(before.research!,{shipEngine:undefined});const delta=structuredClone(encoder.encode(before,0,0));expect(delta.kind).toBe('delta');
 expect(decoder.adopt(structuredClone(delta)).status).toBe('resync');expect(resident.adopt(delta).status).toBe('resync');
 expect(accepted.world).toEqual(retained);expect(shown.world).toEqual(retainedShown);
},120000);

test.skipIf(!existsSync(SOURCE_275))('276 admits declared existing hull parts on the actual native map, but refuses packed, duplicate-ID and future derivatives',()=>{
 const {w}=acquired();
 // These two owned pieces are an explicit hostile-input preparation. Their
 // paid construction and research are covered by the separate engine tests.
 const beam:Structure={id:w.nextId++,kind:'ship-beam',x:6,z:15,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
 const engine:Structure={id:w.nextId++,kind:'ship-engine',x:11,z:15,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
 w.structures.push(beam,engine);expect(validateWorld(w)).toEqual([]);const text=serializeWorld(w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
 const packet=new SnapshotEncoder().encode(w,0,0);expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('applied');expect(new ResidentPresentationAssembler().adopt(structuredClone(packet)).status).toBe('applied');
 const packed=JSON.parse(text) as World;packed.structures=packed.structures.filter(s=>s.id!==beam.id);packed.packed.push({building:beam,owner:{type:'ground',x:6,z:15}});
 expect(()=>deserializeWorld(JSON.stringify(packed))).toThrow();
 const collision=JSON.parse(text) as World;collision.structures.find(s=>s.id===beam.id)!.id=collision.pawns[0]!.id;expect(()=>deserializeWorld(JSON.stringify(collision))).toThrow();
 const future=JSON.parse(text);future.schemaVersion=277;expect(()=>deserializeWorld(JSON.stringify(future))).toThrow();expect(validShipReactorContinuation275(w,future)).toBe(false);expect(validShipReactorThreatContinuation275(w,future)).toBe(false);
},120000);
