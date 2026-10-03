import { expect,test } from 'vitest';
import { applyCommercialBuy,ensureCommercialPost,quoteCommercial,validCivilianPostShape,validateCivilianPost } from '../src/sim/commercial-post.ts';
import { COMMERCIAL_RESTOCK_TICKS } from '../src/sim/commercial-state.ts';
import { newApparelState,type ApparelItem } from '../src/sim/apparel-rules.ts';
import { newWeaponState } from '../src/sim/equipment-rules.ts';
import type { CommercialBuyLine } from '../src/sim/commercial-state.ts';
import type { MaterialPile,World } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';

/** Prepared domain boundary; integration tests must perform the real journey. */
function atPost(silver=600):World {
  const w=medicalCamp(3,16),pawn=w.pawns[0]!;
  pawn.hunger=95;pawn.rest=95;pawn.skills.social={level:0,xp:0,dailyXp:0,passion:0};
  const items=w.piles.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===pawn.id);
  w.piles=w.piles.filter(i=>!items.includes(i));w.pawns=w.pawns.filter(p=>p!==pawn);
  const food:MaterialPile={id:w.nextId++,kind:'food',item:'survival-meal',quantity:3,owner:{type:'inventory',pawnId:pawn.id}};items.push(food);
  let remaining=silver;
  while(remaining){const quantity=Math.min(500,remaining);items.push({id:w.nextId++,kind:'silver',item:'silver',quantity,owner:{type:'inventory',pawnId:pawn.id}});remaining-=quantity;}
  w.commercialTrip={phase:'at-post',pawn,items,foodPileId:food.id,foodQuantity:3,silverQuantity:silver,startedAt:w.tick-750,departedAt:w.tick-750,
    entry:{x:0,z:0},consumed:0,silverPaid:0,bought:{medicine:0,component:0},arrivedAt:w.tick,decisionUntil:w.tick+250};
  expect(ensureCommercialPost(w)).toBe(true);return w;
}
const inventory=(w:World)=>{const t=w.commercialTrip;if(!t||!('items' in t))throw new Error('Missing inventory');return t.items;};
function q(w:World,lines:CommercialBuyLine[]){const result=quoteCommercial(w,lines);if(!result.ok)throw new Error(result.reason);return result;}
function refuse(w:World,lines:CommercialBuyLine[],signature:string){const before=structuredClone(w);expect(applyCommercialBuy(w,{type:'commercial-buy',lines,quote:signature}).ok).toBe(false);expect(w).toEqual(before);}

test('private stock uses inclusive Core ranges and lazy strict restock, preserving World RNG and counters',()=>{
  for(const seed of [1,2,17,0xffffffff]){
    const w=medicalCamp(2,16);w.seed=seed;const rng=w.rng;
    expect(ensureCommercialPost(w)).toBe(true);const post=w.civilianPost!;
    const units=(item:string)=>post.stock.filter(p=>p.item===item).reduce((s,p)=>s+p.quantity,0);
    expect(units('silver')).toBeGreaterThanOrEqual(800);expect(units('silver')).toBeLessThanOrEqual(3000);
    expect(units('component')).toBeGreaterThanOrEqual(20);expect(units('component')).toBeLessThanOrEqual(70);
    expect(units('medicine')).toBeGreaterThanOrEqual(25);expect(units('medicine')).toBeLessThanOrEqual(50);
    expect(validateCivilianPost(w,180)).toEqual([]);expect(w.rng).toBe(rng);
    const original=structuredClone(post),id=w.nextId;
    w.tick+=COMMERCIAL_RESTOCK_TICKS;expect(ensureCommercialPost(w)).toBe(true);expect(w.civilianPost).toEqual(original);expect(w.nextId).toBe(id);
    w.tick++;expect(ensureCommercialPost(w)).toBe(true);expect(w.civilianPost!.generation).toBe(2);expect(w.civilianPost!.stockedAt).toBe(w.tick);expect(w.rng).toBe(rng);
  }
});

test('arrival stock allocation overflow refuses without consuming any private or World randomness',()=>{
  const w=medicalCamp(2,16);w.nextId=Number.MAX_SAFE_INTEGER-1;const before=structuredClone(w);
  expect(ensureCommercialPost(w)).toBe(false);expect(w).toEqual(before);
});

test('quote is read-only, rounds the net once and buys goods into the original off-map inventory',()=>{
  const w=atPost(),post=w.civilianPost!,m=post.stock.find(p=>p.item==='medicine')!,c=post.stock.find(p=>p.item==='component')!;
  const lines=[{pileId:m.id,quantity:1},{pileId:c.id,quantity:1}],before=structuredClone(w),quoted=q(w,lines);
  expect(quoted.totalSilver).toBe(69);expect(quoted.remainingSilver).toBe(531);expect(w).toEqual(before);
  const all=(item:string)=>inventory(w).filter(p=>p.item===item).reduce((s,p)=>s+p.quantity,0)+w.civilianPost!.stock.filter(p=>p.item===item).reduce((s,p)=>s+p.quantity,0);
  const totals={silver:all('silver'),medicine:all('medicine'),component:all('component')},rng=w.rng,stockRng=post.rng;
  expect(applyCommercialBuy(w,{type:'commercial-buy',lines,quote:quoted.signature})).toEqual({ok:true});
  expect(w.commercialTrip!.phase).toBe('at-post');expect(inventory(w).filter(p=>p.item==='medicine').at(-1)).toMatchObject({quantity:1,owner:{type:'inventory'}});
  expect(all('silver')).toBe(totals.silver);expect(all('medicine')).toBe(totals.medicine);expect(all('component')).toBe(totals.component);
  expect(w.civilianPost).toMatchObject({transactions:1,silverReceived:69,bought:{medicine:1,component:1}});
  expect(w.rng).toBe(rng);expect(w.civilianPost!.rng).toBe(stockRng);expect(validateCivilianPost(w,180)).toEqual([]);
  const resumed=structuredClone(w);expect(q(resumed,[])).toEqual(q(w,[]));
});

test('whole damaged product preserves its identity, while stale stock/money/gear and last split overflow refuse atomically',()=>{
  const w=atPost(1000),m=w.civilianPost!.stock.find(p=>p.item==='medicine')!;m.damage=7;
  const lines=[{pileId:m.id,quantity:m.quantity}],quoted=q(w,lines),identity=m.id,quantity=m.quantity;
  expect(applyCommercialBuy(w,{type:'commercial-buy',lines,quote:quoted.signature}).ok).toBe(true);
  expect(inventory(w).find(p=>p.id===identity)).toMatchObject({quantity,damage:7,owner:{type:'inventory'}});
  for(const change of [
    (v:World)=>{v.civilianPost!.stock.find(p=>p.item==='medicine')!.quantity--;},
    (v:World)=>{inventory(v).find(p=>p.item==='silver')!.quantity--;},
    (v:World)=>{const t=v.commercialTrip;if(!t||t.phase!=='at-post')throw new Error('Missing trader');inventory(v).push({id:v.nextId++,kind:'apparel',item:'flak-vest',quantity:1,owner:{type:'apparel',pawnId:t.pawn.id},apparel:newApparelState('flak-vest')});},
  ]){
    const v=atPost(),product=v.civilianPost!.stock.find(p=>p.item==='medicine')!,selection=[{pileId:product.id,quantity:1}],old=q(v,selection);change(v);refuse(v,selection,old.signature);
  }
  const v=atPost(),product=v.civilianPost!.stock.find(p=>p.item==='medicine')!,selection=[{pileId:product.id,quantity:1}],old=q(v,selection);
  v.nextId=Number.MAX_SAFE_INTEGER;refuse(v,selection,old.signature);
});

test('negative, duplicate, currency, unaffordable and overweight selections cannot partially transfer goods',()=>{
  const w=atPost(1),post=w.civilianPost!,m=post.stock.find(p=>p.item==='medicine')!,money=post.stock.find(p=>p.item==='silver')!;
  for(const lines of [[{pileId:m.id,quantity:-1}],[{pileId:m.id,quantity:1},{pileId:m.id,quantity:1}],[{pileId:money.id,quantity:1}],[{pileId:m.id,quantity:1}],[]])refuse(w,lines,'none');
  const heavy=atPost(2500),trip=heavy.commercialTrip!;if(trip.phase!=='at-post')throw new Error('Wrong phase');
  trip.items=trip.items.filter(i=>i.owner.type==='inventory');
  for(const item of ['flak-vest','recon-helmet','cloth-shirt','cloth-pants','cloth-duster'] as ApparelItem[])
    trip.items.push({id:heavy.nextId++,kind:'apparel',item,quantity:1,owner:{type:'apparel',pawnId:trip.pawn.id},apparel:newApparelState(item)});
  trip.items.push({id:heavy.nextId++,kind:'weapon',item:'bolt-action-rifle',quantity:1,owner:{type:'equipment',pawnId:trip.pawn.id},weapon:newWeaponState('bolt-action-rifle')});
  const medicine=heavy.civilianPost!.stock.find(p=>p.item==='medicine')!;
  expect(q(heavy,[]).mass.grams).toBe(32200);
  expect(quoteCommercial(heavy,[{pileId:medicine.id,quantity:medicine.quantity}])).toMatchObject({ok:false,reason:'Le panier dépasse la charge du voyageur.'});
});

test('post shape rejects future/unowned fields, duplicate IDs and receipt totals; global registration is separate',()=>{
  const w=atPost(),post=w.civilianPost!;
  expect(validateCivilianPost(w,179)).not.toEqual([]);
  expect(validateCivilianPost(w,180,new Set([post.stock[0]!.id]))).not.toEqual([]);
  for(const change of [
    (p:Record<string,unknown>)=>{p.owner={type:'inventory',pawnId:1};},
    (p:Record<string,unknown>)=>{p.stockedAt=w.tick+1;},
    (p:Record<string,unknown>)=>{p.transactions=1;},
    (p:Record<string,unknown>)=>{const stock=p.stock as Record<string,unknown>[];stock[1]!.id=stock[0]!.id;},
  ]){const bad=structuredClone(post) as unknown as Record<string,unknown>;change(bad);expect(validCivilianPostShape(bad,w.tick,w.nextId)).toBe(false);}
});
