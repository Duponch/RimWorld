import { expect,test } from 'vitest';
import { commercialDemoCamp } from './helpers/commercial-demo-v193';
import { ensureCommercialPost,quoteCommercial } from '../src/sim/commercial-post';
import { commercialMass } from '../src/sim/commercial-mass';
import { previewCommercialLoading } from '../src/sim/commercial-loading';
import { addMaterial } from '../src/sim/materials';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { commercialPhaseView,commercialPurchaseCommand } from '../src/ui/commercial-panel';
import type { CommercialTrip } from '../src/sim/commercial-state';
import type { World } from '../src/sim/types';

/** Explicit arrival boundary for pure UI projections and dispatch factories.
 * This fixture does not claim loading, travel, consumption or browser proof. */
function postBoundary():World {
  const {world:w,pawnId,foodPileId}=commercialDemoCamp(),pawn=w.pawns.find(p=>p.id===pawnId)!;
  const source=w.piles.find(i=>i.id===foodPileId)!;source.quantity=1;
  const food={...structuredClone(source),id:w.nextId++,quantity:3,owner:{type:'inventory' as const,pawnId}};
  const silver=w.piles.filter(i=>i.item==='silver');for(const i of silver)i.owner={type:'inventory',pawnId};
  w.pawns=w.pawns.filter(p=>p!==pawn);w.piles=w.piles.filter(i=>!silver.includes(i));w.tick+=750;
  pawn.health!.tick=w.tick;
  w.commercialTrip={phase:'at-post',pawn,items:[food,...silver],foodPileId:food.id,foodQuantity:3,silverQuantity:600,
    startedAt:w.tick-750,departedAt:w.tick-750,entry:{x:0,z:12},consumed:0,silverPaid:0,bought:{medicine:0,component:0},arrivedAt:w.tick,decisionUntil:w.tick+250};
  expect(ensureCommercialPost(w)).toBe(true);return w;
}

test('the public starting helper has actual floor sources, no granted manifest or post, and survives strict save/reload',()=>{
  const {world:w,foodPileId,silverPileIds}=commercialDemoCamp();
  expect(w.pawns).toHaveLength(3);expect(w.width).toBe(32);expect(w.commercialTrip).toBeUndefined();expect(w.civilianPost).toBeUndefined();
  expect(w.piles.find(i=>i.id===foodPileId)).toMatchObject({item:'survival-meal',quantity:4,owner:{type:'ground',x:5,z:12}});
  expect(silverPileIds.map(id=>w.piles.find(i=>i.id===id)!.quantity)).toEqual([500,100]);
  expect(w.piles.every(i=>i.owner.type==='ground')).toBe(true);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('preparation and carried weight include actual gear and differ from floor resources without mutating owners',()=>{
  const {world:w,pawnId}=commercialDemoCamp(),pawn=w.pawns.find(p=>p.id===pawnId)!;
  addMaterial(w,'weapon',1,{type:'equipment',pawnId},'revolver');
  const before=JSON.stringify(w),rng=w.rng;
  expect(commercialMass(w,pawn)).toEqual({grams:1400,capacityGrams:35000});
  expect(previewCommercialLoading(w,pawn,3,600)).toEqual({grams:7100,capacityGrams:35000});
  expect(previewCommercialLoading(w,pawn,3,0)).toBeNull();
  expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);
});

test('arrival projects real stock, exact selected identities, prices, remaining silver and prospective capacity',()=>{
  const w=postBoundary(),before=JSON.stringify(w),rng=w.rng,preview=quoteCommercial(w,[]);expect(preview.ok).toBe(true);if(!preview.ok)throw new Error(preview.reason);
  const medicine=preview.goods.find(g=>g.item==='medicine')!,component=preview.goods.find(g=>g.item==='component')!;
  const lines=[{pileId:medicine.pileId,quantity:2},{pileId:component.pileId,quantity:3}],q=quoteCommercial(w,lines);expect(q.ok).toBe(true);if(!q.ok)throw new Error(q.reason);
  expect(q.selected.map(l=>[l.pileId,l.quantity])).toEqual(lines.map(l=>[l.pileId,l.quantity]));
  expect(q.totalSilver).toBeGreaterThan(0);expect(q.remainingSilver).toBe(600-q.totalSilver);
  expect(q.mass.grams).toBe(5700+1000+1800-q.totalSilver*8);
  const command=commercialPurchaseCommand(w,lines,q.signature);expect(command).toEqual({ok:true,command:{type:'commercial-buy',lines,quote:q.signature}});
  expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);
  lines[0]!.quantity=99;if(command.ok)expect(command.command.lines[0]!.quantity).toBe(2);
});

test('a changed price or stock cannot dispatch a stale displayed basket; a refusal changes neither world nor random stream',()=>{
  const w=postBoundary(),g=quoteCommercial(w,[]);if(!g.ok)throw new Error(g.reason);
  const lines=[{pileId:g.goods[0]!.pileId,quantity:1}],old=quoteCommercial(w,lines);if(!old.ok)throw new Error(old.reason);
  w.civilianPost!.stock.find(i=>i.id===lines[0]!.pileId)!.quantity--;
  const before=JSON.stringify(w);expect(commercialPurchaseCommand(w,lines,old.signature)).toMatchObject({ok:false,reason:expect.stringContaining('devis')});
  expect(JSON.stringify(w)).toBe(before);
  const fresh=quoteCommercial(w,lines);if(!fresh.ok)throw new Error(fresh.reason);
  const trip=w.commercialTrip!;if(trip.phase!=='at-post')throw new Error('Expected arrival boundary.');
  const {decisionUntil:_deadline,...base}=trip;w.commercialTrip={...base,phase:'returning',leftPostAt:w.tick,returnAt:w.tick+750};
  const departed=JSON.stringify(w);expect(commercialPurchaseCommand(w,lines,fresh.signature)).toMatchObject({ok:false});expect(JSON.stringify(w)).toBe(departed);
});

test('empty, fractional, excessive and expired baskets remain refusals rather than a default purchase',()=>{
  const w=postBoundary(),g=quoteCommercial(w,[]);if(!g.ok)throw new Error(g.reason);
  const id=g.goods[0]!.pileId,before=JSON.stringify(w);
  for(const lines of [[],[{pileId:id,quantity:0}],[{pileId:id,quantity:1.5}],[{pileId:id,quantity:1000}]])expect(commercialPurchaseCommand(w,lines,'')).toMatchObject({ok:false});
  expect(JSON.stringify(w)).toBe(before);
  const trip=w.commercialTrip!;if(trip.phase!=='at-post')throw new Error('Expected arrival boundary.');
  const q=quoteCommercial(w,[{pileId:id,quantity:1}]);if(!q.ok)throw new Error(q.reason);
  w.tick=trip.decisionUntil+1;const expired=JSON.stringify(w);
  expect(commercialPurchaseCommand(w,[{pileId:id,quantity:1}],q.signature)).toMatchObject({ok:false});expect(JSON.stringify(w)).toBe(expired);
});

test('the panel describes bounded visit, suspended entry waiting and physical unload without changing continuation',()=>{
  const w=postBoundary(),trip=w.commercialTrip!;if(trip.phase!=='at-post')throw new Error('Expected arrival boundary.');
  const atPost=JSON.stringify(w),view=commercialPhaseView(w);
  expect(view.atPost).toBe(true);expect(view.canCancel).toBe(false);expect(view.status).toContain('60 min');expect(view.status).toContain('départ automatique');expect(view.needs).toContain('Ada');
  expect(view.mass).toEqual({grams:5700,capacityGrams:35000});expect(JSON.stringify(w)).toBe(atPost);
  const {decisionUntil:_deadline,...base}=trip;
  w.commercialTrip={...base,phase:'awaiting-entry',leftPostAt:w.tick,returnAt:w.tick};
  const waiting=JSON.stringify(w);expect(commercialPhaseView(w).status).toContain('besoins sont suspendus');expect(JSON.stringify(w)).toBe(waiting);
  w.pawns.push(trip.pawn);w.piles.push(...trip.items);w.commercialTrip={phase:'unloading',pawnId:trip.pawn.id,startedAt:w.tick,pendingPileIds:trip.items.map(i=>i.id)};
  const unloading=JSON.stringify(w),unload=commercialPhaseView(w);expect(unload.canCancel).toBe(true);expect(unload.atPost).toBe(false);expect(unload.status).toContain('dépose physiquement');expect(JSON.stringify(w)).toBe(unloading);
});

test('loading/leaving projections retain original map actor while outbound/returning describe the abstract journey',()=>{
  const {world:w,pawnId,foodPileId,silverPileIds}=commercialDemoCamp(),base={startedAt:w.tick,foodQuantity:3 as const,silverQuantity:600};
  const states:CommercialTrip[]=[
    {...base,phase:'loading',pawnId,manifest:[{sourcePileId:foodPileId,item:'survival-meal',quantity:3},{sourcePileId:silverPileIds[0]!,item:'silver',quantity:500},{sourcePileId:silverPileIds[1]!,item:'silver',quantity:100}],cursor:0},
    {...base,phase:'leaving',pawnId,foodPileId,exit:null},
  ];
  for(const state of states){w.commercialTrip=state;const before=JSON.stringify(w),view=commercialPhaseView(w);expect(view.canCancel).toBe(true);expect(view.needs).toContain('Ada');expect(JSON.stringify(w)).toBe(before);}
  const post=postBoundary(),trip=post.commercialTrip!;if(trip.phase!=='at-post')throw new Error('Expected arrival boundary.');
  const {arrivedAt:_arrived,decisionUntil:_deadline,...off}=trip;
  post.commercialTrip={...off,phase:'outbound',arrivesAt:post.tick+750};expect(commercialPhaseView(post).status).toContain('3 h');
  post.commercialTrip={...off,phase:'returning',arrivedAt:post.tick,leftPostAt:post.tick,returnAt:post.tick+750};expect(commercialPhaseView(post).status).toContain('revient');
});
