import {expect,test} from 'vitest';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/index.ts';
import {validBuildingFuelShape} from '../src/sim/biofuel-save.ts';
import {validTorchHistoricalTransport,validTorchTransport} from '../src/sim/torch-save.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {equipmentCamp} from './scenarios/equipment.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';
import type {HaulTask,Structure,World} from '../src/sim/types.ts';

function torch(w:World):Structure {
  const s:Structure={id:w.nextId++,kind:'torch-lamp',x:8,z:8,orientation:0,footprint:'standard',material:'wood',fuel:{ticks:12000,burned:0,autoRefuel:true,burnRemainder:0}};
  w.structures.push(s);return s;
}
const as248=(w:World):World=>{(w as {schemaVersion:number}).schemaVersion=248;return w;};

test('248 validates both original maps before a neutral249 migration, preserving literal people, policies and paused continuation',()=>{
  const {w}=preparedCassandraExpedition();as248(w);const before=structuredClone(w),raw=JSON.stringify(w);
  const next=deserializeWorld(raw);expect(next).toEqual({...before,schemaVersion:249});expect(JSON.stringify(w)).toBe(raw);
  expect(validateWorld(next)).toEqual([]);expect(deserializeWorld(serializeWorld(next))).toEqual(next);
});

test('future torch kinds in jobs, structures, queued targets, archives, secondary maps and packet upserts refuse before migration',()=>{
  const probes:Array<(w:Record<string,any>)=>void>=[
    w=>w.structures.push({kind:'torch-lamp',fuel:{ticks:12000,burned:0,autoRefuel:true,burnRemainder:0}}),
    w=>w.jobs.push({kind:'torch-lamp'}),w=>w.jobs.push({kind:'deconstruct',deconstruction:{kind:'torch-lamp'}}),
    w=>w.pawns[0].orders.queue.push({kind:'torch-lamp'}),w=>w.packed.push({building:{kind:'torch-lamp'}}),
    w=>w.visitors={departed:[{packed:[{building:{kind:'torch-lamp'}}]}]},
  ];
  for(const probe of probes){const w=as248(equipmentCamp(1));probe(w);const raw=JSON.stringify(w);expect(()=>deserializeWorld(raw)).toThrow(/torch/i);expect(JSON.stringify(w)).toBe(raw);}
  const {w}=preparedCassandraExpedition();as248(w);(w.secondarySite!.map.structures as unknown as Array<{kind:string}>).push({kind:'torch-lamp'});
  expect(()=>deserializeWorld(JSON.stringify(w))).toThrow(/torch/i);
  expect(validTorchHistoricalTransport({world:{schemaVersion:248},structures:{upserted:[{kind:'torch-lamp'}]}},248)).toBe(false);
});

test('historical guard does not read grids, catches malformed getters/cycles and leaves safe labels alone',()=>{
  const archived={name:'torch-lamp'};for(const key of ['tiles','resources','planet'])Object.defineProperty(archived,key,{enumerable:true,get:()=>{throw Error('Ignored grid');}});
  expect(validTorchHistoricalTransport({pawns:[archived]},248)).toBe(true);
  const cycle:Record<string,unknown>={};cycle.owner=cycle;
  expect(validTorchHistoricalTransport({pawns:[cycle]},248)).toBe(false);
  expect(validTorchHistoricalTransport({get structures(){throw Error('Malformed domain');}},248)).toBe(false);
});

test('fuel keeps four strict fields, wet maximum, fractional range and no empty debt; other devices keep their contracts',()=>{
  const base={ticks:12000,burned:0,autoRefuel:true,burnRemainder:0};expect(validBuildingFuelShape(base,'torch-lamp',249,0)).toBe(true);
  // The complete numerator must fit the elapsed wet budget, not just its integer part.
  for(const tick of [0,1,2])for(let burned=0;burned<=9;burned++)for(let burnRemainder=0;burnRemainder<=4;burnRemainder++)
    expect(validBuildingFuelShape({...base,burned,burnRemainder},'torch-lamp',249,tick),`tick${tick} burned${burned} remainder${burnRemainder}`).toBe(burned*5+burnRemainder<=tick*19);
  for(const bad of [{...base,ticks:12001},{...base,burned:4},{...base,burnRemainder:5},{...base,ticks:0,burnRemainder:1},{...base,extra:true}])expect(validBuildingFuelShape(bad,'torch-lamp',249,1)).toBe(false);
  expect(validBuildingFuelShape(base,'torch-lamp',248,0)).toBe(false);
  expect(validBuildingFuelShape({...base,ticks:0},'torch-lamp',249,0)).toBe(true);
  expect(validBuildingFuelShape({ticks:12000,burned:0,autoRefuel:true},'campfire',248,0)).toBe(true);
  expect(validBuildingFuelShape({...base,ticks:12000},'campfire',249,0)).toBe(false);
});

test('torch rejects power/packed variants and keeps original fuel-carrier, contact and destination capacity',()=>{
  const w=equipmentCamp(1),s=torch(w),p=w.pawns[0]!;expect(validTorchTransport(w,249)).toBe(true);
  const extra=structuredClone(w);(extra.structures.find(v=>v.id===s.id)! as unknown as Record<string,unknown>).power={on:false,parentId:null};expect(validTorchTransport(extra,249)).toBe(false);
  const packed=structuredClone(w);packed.packed.push({building:packed.structures.find(v=>v.id===s.id)!,owner:{type:'ground',x:9,z:8}});expect(validTorchTransport(packed,249)).toBe(false);
  s.fuel={ticks:10800,burned:1200,autoRefuel:true,burnRemainder:4};p.x=7;p.z=8;p.path=[];p.state='working';p.orders.active='haul';
  addMaterial(w,'wood',2,{type:'pawn',pawnId:p.id});const held=w.piles.at(-1)!;
  const active:HaulTask={sourcePileId:held.id,quantity:2,phase:'deliver',destination:{type:'fuel',structureId:s.id,forced:true},carryPileId:held.id,serviceProgress:1};p.haul=active;
  expect(validTorchTransport(w,249)).toBe(true);
  held.owner={type:'ground',x:p.x,z:p.z};expect(validTorchTransport(w,249)).toBe(false);held.owner={type:'pawn',pawnId:p.id};
  p.x=3;expect(validTorchTransport(w,249)).toBe(false);p.x=7;
  active.quantity=3;expect(validTorchTransport(w,249)).toBe(false);active.quantity=2;
  addMaterial(w,'wood',2,{type:'ground',x:6,z:8});const source=w.piles.at(-1)!;
  p.orders.queue.push({sourcePileId:source.id,quantity:2,phase:'pickup',destination:{type:'fuel',structureId:s.id,forced:true},carryPileId:null});
  expect(validTorchTransport(w,249)).toBe(false);
});

test('Decoder rejects old future checkpoints and current invalid fuel deltas without changing the confirmed witness',()=>{
  const old=as248(equipmentCamp(1)),historicalEncoder=new SnapshotEncoder(),oldPacket=structuredClone(historicalEncoder.encode(old,0,0));
  torch(old);const future=structuredClone(historicalEncoder.encode(old,0,0));expect(new SnapshotDecoder().adopt(future).status).toBe('resync');
  expect(new SnapshotDecoder().adopt(oldPacket).status).toBe('applied');
  const w=equipmentCamp(1),s=torch(w),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Expected current checkpoint');
  const before=structuredClone(first.world);s.fuel!.burnRemainder=1;const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
  const bad=structuredClone(delta);bad.world.structures.find(v=>v.id===s.id)!.fuel!.burnRemainder=5;
  expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(before);expect(decoder.adopt(delta).status).toBe('applied');
});
