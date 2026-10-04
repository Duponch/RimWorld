import { expect,test } from 'vitest';
import { applyCommercialBuy,applyCommercialSell,ensureCommercialPost,quoteCommercial,quoteCommercialSell,validCivilianPostShape } from '../src/sim/commercial-post.ts';
import { commercialPawnMass } from '../src/sim/commercial-mass.ts';
import { COMMERCIAL_RESTOCK_TICKS } from '../src/sim/commercial-state.ts';
import type { CommercialBuyLine } from '../src/sim/commercial-state.ts';
import type { MaterialPile,World } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';

/** Prepared transaction boundary. The companion cargo test performs the journey. */
function atPost():World {
  const w=medicalCamp(3,16),pawn=w.pawns[0]!;
  pawn.hunger=95;pawn.rest=95;pawn.skills.social={level:0,xp:0,dailyXp:0,passion:0};
  const items=w.piles.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===pawn.id);
  w.piles=w.piles.filter(i=>!items.includes(i));w.pawns=w.pawns.filter(p=>p!==pawn);
  const add=(item:MaterialPile['item'],kind:MaterialPile['kind'],quantity:number,damage?:number)=>{
    const pile:MaterialPile={id:w.nextId++,item,kind,quantity,owner:{type:'inventory',pawnId:pawn.id},...damage?{damage}:{}};items.push(pile);return pile;
  };
  const food=add('survival-meal','food',3);add('cloth','textile',75,7);add('muffalo-wool','textile',60);
  w.commercialTrip={phase:'at-post',pawn,items,foodPileId:food.id,foodQuantity:3,silverQuantity:0,cargo:{cloth:75,'muffalo-wool':60},sold:{cloth:0,'muffalo-wool':0},silverEarned:0,
    startedAt:w.tick-750,departedAt:w.tick-750,entry:{x:0,z:0},consumed:0,silverPaid:0,bought:{medicine:0,component:0},arrivedAt:w.tick,decisionUntil:w.tick+250};
  expect(ensureCommercialPost(w)).toBe(true);return w;
}
const trip=(w:World)=>{const t=w.commercialTrip;if(!t||t.phase!=='at-post')throw Error('Missing post visit');return t;};
const sales=(w:World,cloth=60,wool=40):CommercialBuyLine[]=>[
  {pileId:trip(w).items.find(i=>i.item==='cloth')!.id,quantity:cloth},
  {pileId:trip(w).items.find(i=>i.item==='muffalo-wool')!.id,quantity:wool},
];
const quote=(w:World,lines:CommercialBuyLine[])=>{const q=quoteCommercialSell(w,lines);if(!q.ok)throw Error(q.reason);return q;};
const total=(w:World,item:string)=>[...w.piles,...trip(w).items,...w.civilianPost!.stock].filter(i=>i.item===item).reduce((n,i)=>n+i.quantity,0);
function refuse(w:World,lines:CommercialBuyLine[],signature:string){const before=structuredClone(w);expect(applyCommercialSell(w,{type:'commercial-sell',lines,quote:signature}).ok).toBe(false);expect(w).toEqual(before);}

test('V203 sale with no initial silver conserves owners/conditions and finances purchases beyond the initial purse',()=>{
  const w=atPost(),lines=sales(w),before=structuredClone(w),q=quote(w,lines),cloth=trip(w).items.find(i=>i.item==='cloth')!,rng=w.rng,privateRng=w.civilianPost!.rng;
  const totals={cloth:total(w,'cloth'),wool:total(w,'muffalo-wool'),silver:total(w,'silver'),medicine:total(w,'medicine'),component:total(w,'component')};
  // Independent Core arithmetic: 60*1.5*.6*1.02 + 40*2.7*.6*1.02 = 121.176.
  expect(q.totalSilver).toBe(121);expect(q.remainingSilver).toBe(121);expect(w).toEqual(before);
  expect(applyCommercialSell(w,{type:'commercial-sell',lines,quote:q.signature})).toEqual({ok:true});
  expect(trip(w)).toMatchObject({silverQuantity:0,silverEarned:121,sold:{cloth:60,'muffalo-wool':40}});
  expect(trip(w).items.find(i=>i.id===cloth.id)).toMatchObject({quantity:15,damage:7,owner:{type:'inventory'}});
  expect(w.civilianPost!.stock.find(i=>i.item==='cloth')).toMatchObject({quantity:60,damage:7});
  expect(w.civilianPost).toMatchObject({silverPaid:121,sold:{cloth:60,'muffalo-wool':40},transactions:1,recent:[{silver:121,medicine:0,component:0,sold:{cloth:60,'muffalo-wool':40}}]});
  expect(quote(w,[]).goods.map(g=>g.available)).toEqual([15,20]);
  const buyLines=['medicine','component'].map(item=>({pileId:w.civilianPost!.stock.find(i=>i.item===item)!.id,quantity:1})),buy=quoteCommercial(w,buyLines);
  if(!buy.ok)throw Error(buy.reason);
  expect(buy.totalSilver).toBe(69);expect(applyCommercialBuy(w,{type:'commercial-buy',lines:buyLines,quote:buy.signature})).toEqual({ok:true});
  expect(trip(w)).toMatchObject({silverEarned:121,silverPaid:69,bought:{medicine:1,component:1}});
  expect(total(w,'cloth')).toBe(totals.cloth);expect(total(w,'muffalo-wool')).toBe(totals.wool);expect(total(w,'silver')).toBe(totals.silver);
  expect(total(w,'medicine')).toBe(totals.medicine);expect(total(w,'component')).toBe(totals.component);
  expect(trip(w).items.filter(i=>i.item==='silver').reduce((n,i)=>n+i.quantity,0)).toBe(52);
  expect(commercialPawnMass(trip(w).pawn,trip(w).items)).toEqual(buy.mass);expect(w.rng).toBe(rng);expect(w.civilianPost!.rng).toBe(privateRng);
  expect(validCivilianPostShape(w.civilianPost,w.tick,w.nextId,185)).toBe(true);expect(validCivilianPostShape(w.civilianPost,w.tick,w.nextId,184)).toBe(false);
});

test('V203 whole textile transfer retains identity; stale stock, freight, negotiator and exhausted final payment refuse atomically',()=>{
  const whole=atPost(),pile=trip(whole).items.find(i=>i.item==='cloth')!,line=[{pileId:pile.id,quantity:75}],q=quote(whole,line);
  expect(applyCommercialSell(whole,{type:'commercial-sell',lines:line,quote:q.signature}).ok).toBe(true);
  expect(wholed(whole,pile.id)).toMatchObject({id:pile.id,quantity:75,damage:7});expect(trip(whole).items.some(i=>i.id===pile.id)).toBe(false);
  for(const change of [
    (w:World)=>{w.civilianPost!.stock.find(i=>i.item==='silver')!.quantity--;},
    (w:World)=>{trip(w).items.find(i=>i.item==='cloth')!.damage=8;},
    (w:World)=>{trip(w).pawn.skills.social!.level=1;},
    (w:World)=>{w.nextId=Number.MAX_SAFE_INTEGER-1;},
  ]){const w=atPost(),ls=sales(w),old=quote(w,ls);change(w);refuse(w,ls,old.signature);}
});
const wholed=(w:World,id:number)=>w.civilianPost!.stock.find(i=>i.id===id);

test('V203 missing post money, remote piles, duplicate/currency lines and full destination reject the complete sale',()=>{
  const w=atPost(),ls=sales(w),id=ls[0]!.pileId,money=w.civilianPost!.stock.find(i=>i.item==='silver')!.id;
  for(const bad of [[],[{pileId:id,quantity:0}],[{pileId:id,quantity:-1}],[{pileId:id,quantity:76}],[{pileId:id,quantity:1},{pileId:id,quantity:1}],[{pileId:money,quantity:1}]])refuse(w,bad,'none');
  const broke=atPost();broke.civilianPost!.stock=broke.civilianPost!.stock.filter(i=>i.item!=='silver');refuse(broke,sales(broke),'none');
  const full=atPost();while(full.civilianPost!.stock.length<512)full.civilianPost!.stock.push({id:full.nextId++,kind:'component',item:'component',quantity:1});
  const selected=sales(full),q=quote(full,selected);refuse(full,selected,q.signature);
});

test('V203 strict lazy restock replaces acquired textiles while preserving cumulative sales and the private RNG sequence',()=>{
  const w=atPost(),control=structuredClone(w),ls=sales(w),q=quote(w,ls);
  expect(applyCommercialSell(w,{type:'commercial-sell',lines:ls,quote:q.signature}).ok).toBe(true);
  const post=structuredClone(w.civilianPost);w.tick+=COMMERCIAL_RESTOCK_TICKS;expect(ensureCommercialPost(w)).toBe(true);expect(w.civilianPost).toEqual(post);
  w.tick++;control.tick=w.tick;expect(ensureCommercialPost(w)).toBe(true);expect(ensureCommercialPost(control)).toBe(true);
  expect(w.civilianPost!.stock.some(i=>i.item==='cloth'||i.item==='muffalo-wool')).toBe(false);
  expect(w.civilianPost!.stock.map(i=>[i.item,i.quantity])).toEqual(control.civilianPost!.stock.map(i=>[i.item,i.quantity]));
  expect(w.civilianPost!.rng).toBe(control.civilianPost!.rng);expect(w.civilianPost).toMatchObject({sold:{cloth:60,'muffalo-wool':40},silverPaid:121,transactions:1});
});

test('V203 stock cannot invent or omit textiles covered by sales, including after receipt retention and same-tick exchange',()=>{
  const w=atPost(),ls=sales(w),q=quote(w,ls),invented=structuredClone(w.civilianPost!);
  invented.stock.push({id:w.nextId++,kind:'textile',item:'cloth',quantity:1});
  expect(validCivilianPostShape(invented,w.tick,w.nextId)).toBe(false);
  expect(applyCommercialSell(w,{type:'commercial-sell',lines:ls,quote:q.signature}).ok).toBe(true);
  for(const quantity of [59,61]){
    const post=structuredClone(w.civilianPost!);post.stock.find(i=>i.item==='cloth')!.quantity=quantity;
    expect(validCivilianPostShape(post,w.tick,w.nextId)).toBe(false);
  }
  const retained=atPost(),clothId=trip(retained).items.find(i=>i.item==='cloth')!.id;
  for(let n=0;n<33;n++){
    const lines=[{pileId:clothId,quantity:1}],priced=quote(retained,lines);
    expect(applyCommercialSell(retained,{type:'commercial-sell',lines,quote:priced.signature})).toEqual({ok:true});
  }
  expect(retained.civilianPost!.recent).toHaveLength(32);expect(validCivilianPostShape(retained.civilianPost,retained.tick,retained.nextId)).toBe(true);
  const missing=structuredClone(retained.civilianPost!);missing.stock=missing.stock.filter(i=>i.item!=='cloth');
  expect(validCivilianPostShape(missing,retained.tick,retained.nextId)).toBe(false);
  const overflow=structuredClone(retained);overflow.civilianPost!.silverPaid=Number.MAX_SAFE_INTEGER;
  const more=[{pileId:clothId,quantity:1}],priced=quote(overflow,more);refuse(overflow,more,priced.signature);
});
