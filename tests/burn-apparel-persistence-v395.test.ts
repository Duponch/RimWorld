import {expect,test} from 'vitest';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validBurnApparelHistoricalTransport,validBurnApparelTransport} from '../src/sim/burn-apparel-save.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {newCookingBill,cookingSpot} from '../src/sim/cooking-bills.ts';
import {PRODUCTION_WORK_SCALE} from '../src/sim/production-recipes.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {SCHEMA_VERSION,type World,type Structure} from '../src/sim/types.ts';
import {equipmentCamp} from './scenarios/equipment.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';

const as250=(w:World)=>{(w as {schemaVersion:number}).schemaVersion=250;return w;};
/** Declared save-boundary states, not a claimed played production chronology. */
function prepared(stage:'source'|'held'|'placed'='source'){
 const w=equipmentCamp(1),p=w.pawns[0]!;w.piles=[];p.priorities.haul=1;p.priorities.cook=0;
 if(w.fires)w.fires.clockCore=w.tick*10;
 const station:Structure=fixtureBuilding(w,'campfire',12,12);station.material='wood';
 const bill=newCookingBill(w.nextId++,'burn-apparel');bill.filters['cloth-shirt']=true;station.bills=[bill];
 const spot=cookingSpot(station),cell={x:spot.x,z:spot.z-1},source={x:8,z:12};
 addMaterial(w,'apparel',1,stage==='held'?{type:'pawn',pawnId:p.id}:{type:'ground',...stage==='placed'?cell:source},'cloth-shirt');
 const pile=w.piles.at(-1)!;
 p.cooking={recipe:'burn-apparel',stationId:station.id,billId:bill.id,spot,actionCell:stage==='source'?source:spot,
  phase:stage==='placed'?'work':'gather',progress:stage==='placed'?3*PRODUCTION_WORK_SCALE:0,productId:null,storageId:null,
  ingredients:[{pileId:pile.id,item:'cloth-shirt',quantity:1,stage,cell}]};
 Object.assign(p,stage==='placed'?{...spot,state:'working'}:{x:7,z:12,state:'moving'});refreshStock(w);
 return {w,p,pile,station,bill};
}
function checkpoint(w:World){return new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,0)));}

test.each(['source','held','placed'] as const)('251 whole apparel at %s keeps original owner, condition and task through file/full Decoder',stage=>{
 const {w,p,pile}=prepared(stage),before=JSON.stringify(w);
 expect(validBurnApparelTransport(w)).toBe(true);expect(validateWorld(w)).toEqual([]);
 expect(deserializeWorld(serializeWorld(w))).toEqual(w);
 const adopted=checkpoint(w);expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
 expect(JSON.stringify(w)).toBe(before);expect(p.priorities.cook).toBe(0);expect(pile.quantity).toBe(1);
});

test('a prepared queued whole-input reservation survives; duplicate queues and held queued cargo are refused',()=>{
 const {w,p}=prepared('source'),task=p.cooking!;p.cooking=null;p.orders.queue=[{cooking:task}];p.state='idle';
 expect(validBurnApparelTransport(w)).toBe(true);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
 expect(checkpoint(w).status).toBe('applied');
 const twice=structuredClone(w);twice.pawns[0]!.orders.queue.push(structuredClone(twice.pawns[0]!.orders.queue[0]!));expect(validBurnApparelTransport(twice)).toBe(false);
 const held=structuredClone(w);held.pawns[0]!.orders.queue[0]={cooking:{...task,ingredients:[{...task.ingredients[0]!,stage:'held'}]}};
 expect(validBurnApparelTransport(held)).toBe(false);
});

test('250 validates both original maps then migrates only the version; inactive corruption is not repaired',()=>{
 const {w}=preparedCassandraExpedition();as250(w);const before=JSON.stringify(w);
 const next=deserializeWorld(before);expect(next).toEqual({...w,schemaVersion:SCHEMA_VERSION});expect(JSON.stringify(w)).toBe(before);
 const bad=structuredClone(w);bad.secondarySite!.map.pawns[0]!.orders.queue='bad' as never;
 expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
});

test('250 refuses the future recipe in bills, tasks, queues, packs, archives, inactive map and sparse structure envelopes',()=>{
 const probes:Array<(w:Record<string,any>)=>void>=[
  w=>w.structures.push({kind:'campfire',bills:[{recipe:'burn-apparel'}]}),
  w=>w.pawns[0].cooking={recipe:'burn-apparel'},
  w=>w.pawns[0].orders.queue.push({cooking:{recipe:'burn-apparel'}}),
  w=>w.jobs.push({furniture:{bills:[{recipe:'burn-apparel'}]}}),
  w=>w.packed.push({building:{bills:[{recipe:'burn-apparel'}]}}),
  w=>w.visitors={departed:[{pawn:{cooking:{recipe:'burn-apparel'}}}]},
  w=>w.groupLosses=[{pawn:{orders:{queue:[{cooking:{recipe:'burn-apparel'}}]}}}],
 ];
 for(const probe of probes){const w=as250(equipmentCamp(1));probe(w);const before=JSON.stringify(w);
  expect(validBurnApparelHistoricalTransport(w,250)).toBe(false);expect(()=>deserializeWorld(before)).toThrow(/apparel-burning/i);expect(JSON.stringify(w)).toBe(before);
 }
 const {w}=preparedCassandraExpedition();as250(w);(w.secondarySite!.map.structures as unknown as any[]).push({bills:[{recipe:'burn-apparel'}]});
 expect(()=>deserializeWorld(JSON.stringify(w))).toThrow(/apparel-burning/i);
 expect(validBurnApparelHistoricalTransport({world:{schemaVersion:250},structures:{upserted:[{bills:[{recipe:'burn-apparel'}]}]}},250)).toBe(false);
});

test('historical reading skips large grids before getters, catches malformed/cyclic domains, and does not reject labels',()=>{
 const archived:Record<string,unknown>={label:'burn-apparel'};for(const key of ['tiles','resources','planet'])Object.defineProperty(archived,key,{enumerable:true,get(){throw Error('Ignored grid');}});
 expect(validBurnApparelHistoricalTransport({pawns:[archived]},250)).toBe(true);
 const cyclic:Record<string,unknown>={};cyclic.self=cyclic;
 expect(validBurnApparelHistoricalTransport({pawns:[cyclic]},250)).toBe(false);
 expect(validBurnApparelHistoricalTransport({get structures(){throw Error('Malformed domain');}},250)).toBe(false);
 expect(validBurnApparelHistoricalTransport({world:{schemaVersion:250},structures:{upserted:[cyclic]}},250)).toBe(false);
});

test('current input/output/filter/owner corruption refuses before saving or adoption without changing the prepared source',()=>{
 const original=prepared('held').w,before=JSON.stringify(original);
 const probes:Array<(w:Record<string,any>)=>void>=[
  w=>w.pawns[0].cooking.phase='interrupted',w=>w.pawns[0].cooking.phase='output',
  w=>w.pawns[0].cooking.workTicks=1,w=>w.pawns[0].cooking.storageQuantity=1,
  w=>w.pawns[0].cooking.productId=w.piles[0].id,w=>w.pawns[0].cooking.ingredients[0].quantity=2,
  w=>w.piles[0].apparel.forbidden=true,w=>w.piles[0].owner={type:'inventory',pawnId:w.pawns[0].id},
  w=>w.structures[0].bills[0].filters['cloth-shirt']=false,
  w=>w.structures[0].bills[0].smeltFilter.hpMin=101,
  w=>{w.piles[0].item='flak-helmet';w.pawns[0].cooking.ingredients[0].item='flak-helmet';},
  w=>{w.structures[0].bills[0].recipe='simple-meal';},
 ];
 for(const probe of probes){const bad=structuredClone(original);probe(bad);expect(validBurnApparelTransport(bad)).toBe(false);expect(()=>serializeWorld(bad)).toThrow();expect(checkpoint(bad).status).toBe('resync');}
 expect(JSON.stringify(original)).toBe(before);
});

test('old full/delta future markers refuse without replacing the last adopted owner graph',()=>{
 const w=as250(equipmentCamp(1));if(w.fires)w.fires.clockCore=w.tick*10;
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const full=structuredClone(encoder.encode(w,0,0));const first=decoder.adopt(full);expect(first.status).toBe('applied');
 if(first.status!=='applied')throw Error('Expected baseline adoption');const before=JSON.stringify(first.world);
 const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 const bad=structuredClone(delta);(bad.world.pawns[0] as unknown as Record<string,unknown>).cooking={recipe:'burn-apparel'};
 expect(decoder.adopt(bad).status).toBe('resync');expect(JSON.stringify(first.world)).toBe(before);
 const sparse=structuredClone(delta) as unknown as Record<string,any>;delete sparse.world.structures;
 sparse.structures={upserted:[{bills:[{recipe:'burn-apparel'}]}],removed:[]};
 expect(decoder.adopt(sparse as never).status).toBe('resync');expect(JSON.stringify(first.world)).toBe(before);
 const last=decoder.adopt(delta);expect(last.status).toBe('applied');if(last.status==='applied')expect(last.world).toEqual(w);
});
