import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand,stepWorld,validateWorld } from '../src/sim/index.ts';
import { quoteCommercial } from '../src/sim/commercial-post.ts';
import type { World } from '../src/sim/types.ts';
import { commercialCamp } from './helpers/commercial-v193.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';

function prepared():World {
  const {world:w,pawnId,foodId}=commercialCamp();
  fixtureBuilding(w,'wall',12,12);
  expect(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:600}).ok).toBe(true);
  return w;
}
function until(w:World,phase:NonNullable<World['commercialTrip']>['phase'],limit=1100):void {
  for(let i=0;i<limit&&w.commercialTrip?.phase!==phase;i++)stepWorld(w);
  expect(w.commercialTrip?.phase).toBe(phase);
}
function atPost():World {
  const w=prepared();until(w,'outbound');until(w,'at-post');
  expect(validateWorld(w)).toEqual([]);return w;
}
function adopted(decoder:SnapshotDecoder,packet:SnapshotMessage):World {
  const result=decoder.adopt(packet);expect(result.status).toBe('applied');
  if(result.status!=='applied')throw Error(result.status);
  return result.world;
}
function basket(w:World) {
  const stock=w.civilianPost!.stock;
  return ['medicine','component'].map(item=>({pileId:stock.find(p=>p.item===item)!.id,quantity:1}));
}

test('V193 actual loading, departure, purchase, return and unloading preserve immutable bridge ownership',()=>{
  const w=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),phases=new Set<string>();
  let prior:World|undefined,priorJson='';
  const publish=()=>{
    if(prior)expect(JSON.stringify(prior)).toBe(priorJson);
    const next=adopted(decoder,structuredClone(encoder.encode(w,0,1)));
    expect(next).toEqual(w);const t=next.commercialTrip;
    if(t){
      phases.add(t.phase);
      if('pawn' in t){
        expect(next.pawns.some(p=>p.id===t.pawn.id)).toBe(false);
        expect(next.piles.some(p=>t.items.some(i=>i.id===p.id))).toBe(false);
        expect(t.items.every(i=>'pawnId' in i.owner&&i.owner.pawnId===t.pawn.id)).toBe(true);
      }
    }
    prior=next;priorJson=JSON.stringify(next);return next;
  };
  publish();
  for(let i=0;i<300&&w.commercialTrip?.phase!=='outbound';i++){stepWorld(w);publish();}
  expect(w.commercialTrip?.phase).toBe('outbound');
  until(w,'at-post');publish();
  const visit=w.commercialTrip;if(visit?.phase!=='at-post')throw Error('Expected physical arrival');
  const pawnId=visit.pawn.id,lines=basket(w),quote=quoteCommercial(w,lines);
  if(!quote.ok)throw Error(quote.reason);
  const purchaseTick=w.tick;
  expect(applyCommand(w,{type:'commercial-buy',lines,quote:quote.signature}).ok).toBe(true);
  expect(w.tick).toBe(purchaseTick);const purchased=publish().commercialTrip;
  if(purchased?.phase!=='at-post')throw Error('Expected purchased visit');
  const acquired=purchased.items.filter(i=>i.item==='medicine'||i.item==='component').map(i=>i.id);
  expect(acquired).toHaveLength(2);
  expect(applyCommand(w,{type:'commercial-return'}).ok).toBe(true);publish();
  until(w,'unloading');const returned=publish();
  expect(returned.pawns.filter(p=>p.id===pawnId)).toHaveLength(1);
  for(const id of acquired)expect(returned.piles.find(i=>i.id===id)?.owner).toEqual({type:'inventory',pawnId});
  for(let i=0;i<200&&w.commercialTrip;i++){stepWorld(w);publish();}
  expect(w.commercialTrip).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  for(const id of acquired)expect(prior!.piles.find(i=>i.id===id)?.owner.type).toBe('ground');
  expect([...phases]).toEqual(['loading','leaving','outbound','at-post','returning','unloading']);
});

test('V193 real encoder exposes post creation and an exchange in separate deltas at the same tick',()=>{
  const w=prepared();until(w,'outbound');
  const t=w.commercialTrip;if(t?.phase!=='outbound')throw Error('Expected actual departure');
  stepWorld(w,t.arrivesAt-w.tick-1);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const before=adopted(decoder,structuredClone(encoder.encode(w,0,1))),beforeJson=JSON.stringify(before);
  expect(before.civilianPost).toBeUndefined();stepWorld(w);
  const arrivalPacket=structuredClone(encoder.encode(w,0,1));expect(arrivalPacket.kind).toBe('delta');
  const arrival=adopted(decoder,arrivalPacket),arrivalJson=JSON.stringify(arrival),tick=w.tick;
  expect(arrival.commercialTrip?.phase).toBe('at-post');expect(arrival.civilianPost?.transactions).toBe(0);
  const lines=basket(w),quote=quoteCommercial(w,lines);if(!quote.ok)throw Error(quote.reason);
  expect(applyCommand(w,{type:'commercial-buy',lines,quote:quote.signature}).ok).toBe(true);
  const boughtPacket=structuredClone(encoder.encode(w,0,1));expect(boughtPacket.kind).toBe('delta');
  expect(boughtPacket.world.tick).toBe(tick);
  const bought=adopted(decoder,boughtPacket);
  expect(bought.civilianPost).toMatchObject({transactions:1,silverReceived:quote.totalSilver,bought:{medicine:1,component:1}});
  expect(bought.commercialTrip).toMatchObject({phase:'at-post',silverPaid:quote.totalSilver,bought:{medicine:1,component:1}});
  expect(bought).toEqual(w);expect(JSON.stringify(before)).toBe(beforeJson);expect(JSON.stringify(arrival)).toBe(arrivalJson);
  const identical=structuredClone(encoder.encode(w,0,1));
  expect(adopted(decoder,identical)).toEqual(bought);
});

test('V193 malformed post, stock, future phases and conservation refuse a delta without adopting its revision',()=>{
  const w=atPost(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const baseline=adopted(decoder,structuredClone(encoder.encode(w,0,1))),saved=JSON.stringify(baseline);
  const good=structuredClone(encoder.encode(w,0,1));expect(good.kind).toBe('delta');
  const mutations:((meta:World)=>void)[]=[
    meta=>meta.civilianPost!.stockedAt=meta.tick+1,
    meta=>meta.civilianPost!.generation=0,
    meta=>meta.civilianPost!.stock.find(i=>i.item==='medicine')!.quantity=Number.MAX_SAFE_INTEGER,
    meta=>(meta.civilianPost!.stock[0] as unknown as Record<string,unknown>).owner={type:'ground',x:0,z:0},
    meta=>(meta.commercialTrip as unknown as Record<string,unknown>).decisionUntil=meta.tick+251,
    meta=>(meta.commercialTrip as unknown as Record<string,unknown>).returnAt=meta.tick+750,
    meta=>{const trip=meta.commercialTrip!;if('items' in trip)trip.items.find(i=>i.item==='silver')!.quantity--;},
    meta=>{const trip=meta.commercialTrip!;if('pawn' in trip)trip.pawn.surgeryRequest={part:'left-arm',requestedAt:meta.tick};},
  ];
  for(const mutate of mutations){
    const bad=structuredClone(good);mutate(bad.world as World);
    expect(decoder.adopt(bad).status).toBe('resync');expect(JSON.stringify(baseline)).toBe(saved);
  }
  expect(adopted(decoder,good)).toEqual(w);
});

test('V193 post and off-map identities cannot alias another owner or map entity through a delta',()=>{
  const w=atPost(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const baseline=adopted(decoder,structuredClone(encoder.encode(w,0,1))),saved=JSON.stringify(baseline);
  const good=structuredClone(encoder.encode(w,0,1));
  const mutations:((meta:World)=>void)[]=[
    meta=>meta.civilianPost!.stock[0]!.id=meta.pawns[0]!.id,
    meta=>{const t=meta.commercialTrip!;if('items' in t)meta.civilianPost!.stock[0]!.id=t.items.find(i=>i.item==='silver')!.id;},
    meta=>{const t=meta.commercialTrip!;if('items' in t)t.items.find(i=>i.item==='silver')!.id=meta.civilianPost!.stock[0]!.id;},
    meta=>{const t=meta.commercialTrip!;if('items' in t)t.items.find(i=>i.item==='silver')!.id=meta.structures[0]!.id;},
    meta=>{const t=meta.commercialTrip!;if('items' in t)t.items.find(i=>i.item==='silver')!.id=meta.pawns[0]!.id;},
    meta=>{const t=meta.commercialTrip!;if('pawn' in t)t.items.find(i=>i.item==='silver')!.id=t.pawn.id;},
  ];
  for(const mutate of mutations){
    const bad=structuredClone(good);mutate(bad.world as World);
    expect(decoder.adopt(bad).status).toBe('resync');expect(JSON.stringify(baseline)).toBe(saved);
  }
  expect(adopted(decoder,good)).toEqual(w);
});

test('V193 commercial fields are refused in a legacy checkpoint without replacing the decoder world',()=>{
  const w=atPost(),encoder=new SnapshotEncoder(),good=structuredClone(encoder.encode(w,0,1)),decoder=new SnapshotDecoder();
  expect(good.kind).toBe('checkpoint');
  const bad=structuredClone(good);(bad.world as unknown as {schemaVersion:number}).schemaVersion=179;
  expect(decoder.adopt(bad).status).toBe('resync');expect(adopted(decoder,good)).toEqual(w);
});
