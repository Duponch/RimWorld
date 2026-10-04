import { expect,test } from 'vitest';
import { commercialDemoCamp } from './helpers/commercial-demo-v193';
import { addMaterial,refreshStock } from '../src/sim/materials';
import { previewCommercialLoading } from '../src/sim/commercial-loading';
import { ensureCommercialPost,quoteCommercial,quoteCommercialSell,applyCommercialSell } from '../src/sim/commercial-post';
import { commercialCargoSources,commercialPhaseView,commercialPurchaseCommand,commercialSaleCommand } from '../src/ui/commercial-panel';
import type { World } from '../src/sim/types';

function textileCamp() {
  const fixture=commercialDemoCamp(),w=fixture.world;
  w.piles=w.piles.filter(i=>i.item!=='silver');
  addMaterial(w,'textile',75,{type:'ground',x:8,z:12},'cloth');
  addMaterial(w,'textile',5,{type:'ground',x:9,z:12},'cloth');
  addMaterial(w,'textile',60,{type:'ground',x:10,z:12},'muffalo-wool');
  refreshStock(w);return fixture;
}

/** Explicit arrival boundary for read-only UI projection/dispatch checks.
 * Physical loading, travel and return belong to the native/domain scenarios. */
function saleBoundary():World {
  const {world:w,pawnId,foodPileId}=textileCamp(),pawn=w.pawns.find(p=>p.id===pawnId)!;
  const source=w.piles.find(i=>i.id===foodPileId)!;source.quantity=1;
  const food={...structuredClone(source),id:w.nextId++,quantity:3,owner:{type:'inventory' as const,pawnId}};
  const textiles=w.piles.filter(i=>i.item==='cloth'||i.item==='muffalo-wool');for(const i of textiles)i.owner={type:'inventory',pawnId};
  w.pawns=w.pawns.filter(p=>p!==pawn);w.piles=w.piles.filter(i=>!textiles.includes(i));w.tick+=750;pawn.health!.tick=w.tick;
  w.commercialTrip={phase:'at-post',pawn,items:[food,...textiles],foodPileId:food.id,foodQuantity:3,silverQuantity:0,cargo:{cloth:80,'muffalo-wool':60},
    sold:{cloth:0,'muffalo-wool':0},silverEarned:0,startedAt:w.tick-750,departedAt:w.tick-750,entry:{x:0,z:12},consumed:0,silverPaid:0,bought:{medicine:0,component:0},arrivedAt:w.tick,decisionUntil:w.tick+250};
  expect(ensureCommercialPost(w)).toBe(true);return w;
}

test('floor source projection shows exact reservations and excludes possessions outside the floor',()=>{
  const {world:w,pawnId}=textileCamp(),cloth=w.piles.find(i=>i.item==='cloth')!;
  addMaterial(w,'textile',4,{type:'inventory',pawnId},'cloth');
  w.pawns[1]!.haul={sourcePileId:cloth.id,carryPileId:null,quantity:12,phase:'pickup',destination:{type:'aside',x:11,z:12}};
  const before=JSON.stringify(w),sources=commercialCargoSources(w);
  expect(sources).toHaveLength(3);expect(sources.find(i=>i.pileId===cloth.id)).toMatchObject({quantity:75,reserved:12,available:63,cell:'8, 12'});
  expect(sources.reduce((n,i)=>n+i.quantity,0)).toBe(140);expect(JSON.stringify(w)).toBe(before);
});

test('departure preview admits zero silver only with actual positive textile sources and counts their Core masses',()=>{
  const {world:w,pawnId}=textileCamp(),p=w.pawns.find(p=>p.id===pawnId)!,cargo=commercialCargoSources(w).map(i=>({pileId:i.pileId,quantity:i.available}));
  const before=JSON.stringify(w);
  expect(previewCommercialLoading(w,p,3,0,cargo)).toEqual({grams:3*300+80*26+60*28,capacityGrams:35000});
  expect(previewCommercialLoading(w,p,3,0,[])).toBeNull();
  expect(previewCommercialLoading(w,p,3,0,[{pileId:cargo[0]!.pileId,quantity:76}])).toBeNull();
  expect(JSON.stringify(w)).toBe(before);
});

test('sale dispatch uses actual carried identities, copies its basket and remains independent from purchases',()=>{
  const w=saleBoundary(),preview=quoteCommercialSell(w,[]);if(!preview.ok)throw new Error(preview.reason);
  const cloth=preview.goods.find(g=>g.item==='cloth'&&g.available>=60)!,wool=preview.goods.find(g=>g.item==='muffalo-wool')!;
  const lines=[{pileId:cloth.pileId,quantity:60},{pileId:wool.pileId,quantity:40}],q=quoteCommercialSell(w,lines);if(!q.ok)throw new Error(q.reason);
  const before=JSON.stringify(w),command=commercialSaleCommand(w,lines,q.signature);
  expect(command).toEqual({ok:true,command:{type:'commercial-sell',lines,quote:q.signature}});
  expect(q.remainingSilver).toBe(q.totalSilver);expect(q.mass.grams).toBe(4660-60*26-40*28+q.totalSilver*8);
  expect(JSON.stringify(w)).toBe(before);lines[0]!.quantity=99;if(command.ok)expect(command.command.lines[0]!.quantity).toBe(60);
  if(!command.ok)throw new Error(command.reason);expect(applyCommercialSell(w,command.command)).toEqual({ok:true});
  const buyPreview=quoteCommercial(w,[]);if(!buyPreview.ok)throw new Error(buyPreview.reason);
  const buyLines=['medicine','component'].map(item=>({pileId:buyPreview.goods.find(g=>g.item===item)!.pileId,quantity:1})),purchase=quoteCommercial(w,buyLines);if(!purchase.ok)throw new Error(purchase.reason);
  expect(purchase.totalSilver).toBeGreaterThan(0);expect(purchase.totalSilver).toBeLessThanOrEqual(q.totalSilver);
  expect(commercialPurchaseCommand(w,buyLines,purchase.signature)).toMatchObject({ok:true,command:{type:'commercial-buy'}});
  const projectionBefore=JSON.stringify(w),view=commercialPhaseView(w);
  expect(view.possessions).toContain(`total encaissé : ${q.totalSilver} argent`);expect(view.possessions).toContain('Invendus');expect(view.possessions).toContain('ils reviennent au foyer');expect(JSON.stringify(w)).toBe(projectionBefore);
});

test('sale refusals cover stale funds, expired visits, empty and invalid quantities without changing world or RNG',()=>{
  const w=saleBoundary(),preview=quoteCommercialSell(w,[]);if(!preview.ok)throw new Error(preview.reason);
  const id=preview.goods[0]!.pileId,lines=[{pileId:id,quantity:1}],quote=quoteCommercialSell(w,lines);if(!quote.ok)throw new Error(quote.reason);
  const money=w.civilianPost!.stock.find(i=>i.item==='silver')!;money.quantity--;
  let before=JSON.stringify(w);expect(commercialSaleCommand(w,lines,quote.signature)).toMatchObject({ok:false,reason:expect.stringContaining('devis')});expect(JSON.stringify(w)).toBe(before);
  for(const basket of [[],[{pileId:id,quantity:0}],[{pileId:id,quantity:1.5}],[{pileId:id,quantity:76}]])expect(commercialSaleCommand(w,basket,'')).toMatchObject({ok:false});
  expect(JSON.stringify(w)).toBe(before);
  const trip=w.commercialTrip!;if(trip.phase!=='at-post')throw new Error('Expected visit.');w.tick=trip.decisionUntil+1;before=JSON.stringify(w);
  expect(commercialSaleCommand(w,lines,quote.signature)).toMatchObject({ok:false});expect(JSON.stringify(w)).toBe(before);
});
