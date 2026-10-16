import {expect,test} from 'vitest';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/index.ts';
import {validPemmicanHistoricalTransport,validPemmicanCatalogueDomains} from '../src/sim/pemmican-save.ts';
import {validPemmicanResearchTransport} from '../src/sim/research-save.ts';
import {validCookingOrder} from '../src/sim/player-cooking-save.ts';
import {PEMMICAN_RESEARCH_COST} from '../src/sim/research.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {equipmentCamp} from './scenarios/equipment.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';
import type {World} from '../src/sim/types.ts';

/** Prepared old envelope: remove only new default permissions from a fresh
 * fixture. No historical fixture/file is rewritten by this test. */
function historical(w:World):World {
  (w as {schemaVersion:number}).schemaVersion=247;
  for(const policy of w.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!=='pemmican');
  if(w.research)delete w.research.pemmican;
  for(const zone of w.stockpiles){delete (zone.filters as Record<string,unknown>).pemmican;if(zone.items)delete zone.items.pemmican;}
  return w;
}
test('247 migration preserves both maps, motion, policies and archives literally, granting only the schema number',()=>{
  const {w}=preparedCassandraExpedition();historical(w);
  const before=structuredClone(w),raw=JSON.stringify(w),next=deserializeWorld(raw);
  expect(next).toEqual({...before,schemaVersion:248});expect(JSON.stringify(w)).toBe(raw);
  expect(next.research?.pemmican).toBeUndefined();expect(validateWorld(next)).toEqual([]);
  expect(deserializeWorld(serializeWorld(next))).toEqual(next);
});

test('future pemmican tokens refuse before old migration across item, policy, progress, recipe, archives and either map',()=>{
  const probes:Array<(w:Record<string,any>)=>void>=[
    w=>w.piles.push({item:'pemmican'}),w=>w.foodPolicies[0].allowed.push('pemmican'),
    w=>w.research={...w.research,pemmican:{points:0}},w=>w.research={...w.research,project:'pemmican'},
    w=>w.pawns[0].orders.queue.push({cooking:{recipe:'make-pemmican'}}),
    w=>w.packed.push({building:{bills:[{recipe:'make-pemmican'}]}}),
    w=>w.spoiled.pemmican=1,w=>w.destroyed={lost:{pemmican:1}},
    w=>w.stockpiles.push({items:{pemmican:false}}),
    w=>w.visitors={departed:[{piles:[{item:'pemmican'}]}]},
    w=>w.pawns[0].health={foodPoisoning:{item:'pemmican'}},
  ];
  for(const probe of probes){
    const w=historical(equipmentCamp(1));probe(w);const raw=JSON.stringify(w);
    expect(()=>deserializeWorld(raw)).toThrow(/pemmican/i);expect(JSON.stringify(w)).toBe(raw);
  }
  const {w}=preparedCassandraExpedition();historical(w);
  (w.secondarySite!.map.piles as unknown as Array<{item:string}>).push({item:'pemmican'});
  expect(()=>deserializeWorld(JSON.stringify(w))).toThrow(/pemmican/i);
});

test('historical catalogue traversal ignores terrain/topology and safe text, but inspects delta upserts',()=>{
  const w={schemaVersion:247,pawns:[{name:'pemmican'}],foodPolicies:[]};
  Object.defineProperty(w,'tiles',{enumerable:true,get:()=>{throw Error('Terrain must not be read');}});
  Object.defineProperty(w,'resources',{enumerable:true,get:()=>{throw Error('Resource grid must not be read');}});
  Object.defineProperty(w,'planet',{enumerable:true,get:()=>{throw Error('Planet must not be read');}});
  expect(validPemmicanHistoricalTransport(w,247)).toBe(true);
  expect(validPemmicanHistoricalTransport({world:w,piles:{upserted:[{item:'pemmican'}]}},247)).toBe(false);
  expect(validPemmicanHistoricalTransport({world:w,piles:{upserted:[{item:'simple-meal'}]}},247)).toBe(true);
  const archived:{item:string;tiles?:unknown;resources?:unknown;planet?:unknown}={item:'simple-meal'};
  for(const key of ['tiles','resources','planet'])Object.defineProperty(archived,key,{enumerable:true,get:()=>{throw Error('Ignored archived grid must not be read');}});
  expect(validPemmicanCatalogueDomains({visitors:{departed:[archived]}},247)).toBe(true);
  const cyclic:Record<string,unknown>={};cyclic.owner=cyclic;
  expect(validPemmicanHistoricalTransport({world:w,piles:{upserted:[cyclic]}},247)).toBe(false);
  expect(validPemmicanCatalogueDomains({pawns:[cyclic]},247)).toBe(false);
  const malformed={get piles(){throw Error('Malformed pile domain');}};
  expect(validPemmicanCatalogueDomains(malformed,247)).toBe(false);
});

test('research progress is strict and queued pemmican keeps exact five-plus-five quotas, excluding milk',()=>{
  const w=equipmentCamp(1);w.research??={points:0,project:null};
  w.research.pemmican={points:PEMMICAN_RESEARCH_COST,completedAt:w.tick};
  expect(validPemmicanResearchTransport(w,248)).toBe(true);
  w.research.project='pemmican';expect(validPemmicanResearchTransport(w,248)).toBe(false);
  w.research.project=null;w.research.pemmican={points:PEMMICAN_RESEARCH_COST};expect(validPemmicanResearchTransport(w,248)).toBe(false);
  w.research.pemmican={points:PEMMICAN_RESEARCH_COST,completedAt:w.tick};
  const order={cooking:{recipe:'make-pemmican',stationId:1,billId:2,spot:{x:8,z:8},actionCell:{x:8,z:9},phase:'gather',progress:0,productId:null,storageId:null,
    ingredients:[{pileId:3,item:'hare-meat',quantity:5,stage:'source',cell:{x:7,z:8}},{pileId:4,item:'rice',quantity:5,stage:'source',cell:{x:9,z:8}}]}};
  expect(validCookingOrder(order,w)).toBe(true);
  const wrong=structuredClone(order);wrong.cooking.ingredients[0]!.quantity=4;wrong.cooking.ingredients[1]!.quantity=6;expect(validCookingOrder(wrong,w)).toBe(false);
  const milk=structuredClone(order);milk.cooking.ingredients[0]!.item='milk';expect(validCookingOrder(milk,w)).toBe(false);
  expect(validPemmicanResearchTransport(w,247)).toBe(false);
});

test('old checkpoint and delta reject future records without changing the last adopted snapshot',()=>{
  const w=historical(equipmentCamp(1)),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=structuredClone(encoder.encode(w,0,0)),accepted=decoder.adopt(first);expect(accepted.status).toBe('applied');
  if(accepted.status!=='applied')throw Error('Expected historical checkpoint');
  const before=structuredClone(accepted.world);
  const future=structuredClone(first);future.epoch++;future.world.research={...future.world.research!,pemmican:{points:0}};
  expect(decoder.adopt(future).status).toBe('resync');expect(accepted.world).toEqual(before);
  w.tick++;const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
  const bad=structuredClone(delta);bad.world.foodPolicies[0]!.allowed.push('pemmican');
  expect(decoder.adopt(bad).status).toBe('resync');expect(accepted.world).toEqual(before);
  const cyclic=structuredClone(delta);const domain:Record<string,unknown>={};domain.self=domain;
  (cyclic as unknown as {piles:unknown}).piles={upserted:[domain],removed:[]};
  expect(decoder.adopt(cyclic).status).toBe('resync');expect(accepted.world).toEqual(before);
  expect(decoder.adopt(delta).status).toBe('applied');
});
