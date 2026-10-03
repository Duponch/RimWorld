import { expect,test } from 'vitest';
import { applyCommercialBuy,ensureCommercialPost,quoteCommercial } from '../src/sim/commercial-post.ts';
import { validateCommercialBindings,validateCommercialRegistry } from '../src/sim/commercial-save.ts';
import { civilianAdmissionFits,civilianAway } from '../src/sim/civilian-away.ts';
import { refreshStock } from '../src/sim/materials.ts';
import type { MaterialPile } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';

test('V193 admission counts the retained original owner and goods for both off-map trip families',()=>{
  for(const family of ['scout','commercial'] as const){
    const w=medicalCamp(2,16),pawn=w.pawns.pop()!;
    const items:MaterialPile[]=[{id:w.nextId++,kind:'food',item:'survival-meal',quantity:2,owner:{type:'inventory',pawnId:pawn.id}}];
    const base={pawn,items,foodPileId:items[0]!.id,startedAt:w.tick,departedAt:w.tick,consumed:0,entry:{x:0,z:0}};
    if(family==='scout')w.scout={...base,phase:'travelling',quantity:2,returnAt:w.tick+1500};
    else w.commercialTrip={...base,phase:'outbound',foodQuantity:2,silverQuantity:1,arrivesAt:w.tick+750,silverPaid:0,bought:{medicine:0,component:0}};
    expect(civilianAway(w)?.pawn).toBe(pawn);expect(civilianAway(w)?.items).toBe(items);
    // This helper consumes counts only. Sparse arrays exercise the admission
    // limit without manufacturing thousands of clinical or floor fixtures.
    w.pawns.length=255;w.piles.length=32767;
    expect(civilianAdmissionFits(w)).toBe(true);
    expect(civilianAdmissionFits(w,1,0)).toBe(false);expect(civilianAdmissionFits(w,0,1)).toBe(false);
    w.pawns.length=254;w.piles.length=32766;
    expect(civilianAdmissionFits(w,1,1)).toBe(true);
    if(w.scout)w.scout.phase='awaiting-entry';
    else {const t=w.commercialTrip!;if(t.phase!=='outbound')throw Error('Expected outbound');const {arrivesAt,...rest}=t;w.commercialTrip={...rest,phase:'awaiting-entry',arrivedAt:arrivesAt,leftPostAt:arrivesAt,returnAt:arrivesAt+750};}
    expect(civilianAdmissionFits(w,1,1)).toBe(true);expect(civilianAdmissionFits(w,2,0)).toBe(false);
  }
});

test('V193 a purchase cannot grow the retained map/traveller union beyond 32768 piles',()=>{
  // Prepared transaction boundary, not a simulated journey. The 250² map has
  // one real pile per free cell; no overlapping stacks fake the size bound.
  const w=medicalCamp(3,250),pawn=w.pawns[0]!;
  pawn.x=0;pawn.z=0;pawn.hunger=95;pawn.rest=95;
  w.pawns=w.pawns.filter(p=>p!==pawn);
  const items:MaterialPile[]=[
    {id:w.nextId++,kind:'food',item:'survival-meal',quantity:2,owner:{type:'inventory',pawnId:pawn.id}},
    {id:w.nextId++,kind:'silver',item:'silver',quantity:500,owner:{type:'inventory',pawnId:pawn.id}},
    {id:w.nextId++,kind:'silver',item:'silver',quantity:100,owner:{type:'inventory',pawnId:pawn.id}},
  ];
  w.commercialTrip={phase:'at-post',pawn,items,foodPileId:items[0]!.id,foodQuantity:2,silverQuantity:600,
    startedAt:w.tick-750,departedAt:w.tick-750,entry:{x:0,z:0},consumed:0,silverPaid:0,
    bought:{medicine:0,component:0},arrivedAt:w.tick,decisionUntil:w.tick+250};
  expect(ensureCommercialPost(w)).toBe(true);
  const occupied=new Set(w.pawns.map(p=>p.z*w.width+p.x));occupied.add(0);
  for(let cell=0;w.piles.length+items.length<32768;cell++){
    if(occupied.has(cell))continue;
    w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',x:cell%w.width,z:Math.floor(cell/w.width)}});
  }
  refreshStock(w);
  expect(w.piles.length+items.length).toBe(32768);
  expect(new Set([...w.piles,...items,...w.civilianPost!.stock].map(i=>i.id)).size).toBe(w.piles.length+items.length+w.civilianPost!.stock.length);
  expect(validateCommercialRegistry(w,180)).toEqual([]);expect(validateCommercialBindings(w,180)).toEqual([]);
  const lines=['medicine','component'].map(item=>({pileId:w.civilianPost!.stock.find(i=>i.item===item)!.id,quantity:1}));
  const quote=quoteCommercial(w,lines);if(!quote.ok)throw Error(quote.reason);
  const before=JSON.stringify(w);
  expect(applyCommercialBuy(w,{type:'commercial-buy',lines,quote:quote.signature}).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(before);
});
