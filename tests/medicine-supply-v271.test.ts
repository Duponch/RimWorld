import {expect,test} from 'vitest';
import {applyCommand,stepWorld,validateWorld} from '../src/sim/index.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {commercialItemMassGrams} from '../src/sim/commercial-mass.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import {isMedicine} from '../src/sim/medicine-rules.ts';
import {deserializeWorld,serializeWorld} from '../src/sim/serialization.ts';
import {storageAccepts} from '../src/sim/storage-filters.ts';
import {pileFlammability,pileMaxHp} from '../src/sim/thing-damage-rules.ts';
import {tradeCatalogueEntry} from '../src/sim/trade-catalogue.ts';
import {tradingAtContact} from '../src/sim/trade-contact.ts';
import {quoteTrade,tradeGoods} from '../src/sim/trade-goods.ts';
import {tradeRefusal} from '../src/sim/trade-prices.ts';
import {generateExoticStock} from '../src/sim/trade-stock.ts';
import {advanceVisitors,enableVisitors} from '../src/sim/visitors.ts';
import type {MaterialPile} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {visitorTradeFixture} from './scenarios/visitors.ts';

const count=(piles:readonly MaterialPile[],item:ItemId)=>piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);

test('neutroamine is non-ingestible manufactured input with its primary physical and trade stats',()=>{
  const item=ITEM_DEFINITIONS.neutroamine,pile={kind:'neutroamine',item:'neutroamine'} as const;
  expect(item).toMatchObject({kind:'neutroamine',stackLimit:150,nutrition:0,maxIngest:0});expect(isMedicine('neutroamine')).toBe(false);
  expect(pileMaxHp(pile)).toBe(50);expect(pileFlammability(pile)).toBe(.7);expect(commercialItemMassGrams('neutroamine')).toBe(20);
  expect(tradeCatalogueEntry('neutroamine')).toMatchObject({baseMarketValue:6,healthAffectsPrice:false,visitorHandles:false});
  expect(storageAccepts({filters:{wood:false,food:false,medicine:true}},'neutroamine')).toBe(false);
  expect(storageAccepts({filters:{wood:false,food:false,neutroamine:true}},'neutroamine')).toBe(true);
});

test('exotic stock appends100..500 in physical stacks and preserves every historical draw and ID',()=>{
  for(const seed of [1,42,123,8192,0xffffffff]){
    const old=generateExoticStock(seed,100,101,0,205),fresh=generateExoticStock(seed,100,101,0,206);
    expect(old.piles.some(p=>p.item==='neutroamine')).toBe(false);
    expect(fresh.piles.slice(0,old.piles.length)).toEqual(old.piles);
    const added=fresh.piles.filter(p=>p.item==='neutroamine'),quantity=count(added,'neutroamine');
    expect(quantity).toBeGreaterThanOrEqual(100);expect(quantity).toBeLessThanOrEqual(500);
    expect(added[0]!.id).toBe(old.nextId);expect(fresh.nextId).toBe(old.nextId+added.length);
    for(const pile of added){expect(pile.quantity).toBeLessThanOrEqual(150);expect(pile.owner).toEqual({type:'inventory',pawnId:100});expect(pile.rot).toBeUndefined();
      expect(tradeRefusal(pile,'buy',0)).toBeTruthy();expect(tradeRefusal(pile,'buy',0,'exotic')).toBeUndefined();}
    expect(fresh).toEqual(generateExoticStock(seed,100,101,0,206));
  }
});

test('a natural local exotic arrival supplies the finite new stock and roundtrips its possessions',()=>{
  const w=deconstructionCamp(1,32);enableVisitors(w);w.tick=w.visitors!.exotic!.pending[0]!;advanceVisitors(w);
  const merchant=w.pawns.find(p=>p.visitor?.merchantKind==='exotic')!;
  expect(merchant.visitor!.role).toBe('trader');
  expect(count(w.piles.filter(p=>p.owner.type==='inventory'&&p.owner.pawnId===merchant.id),'neutroamine')).toBeGreaterThanOrEqual(100);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('ordinary hauling moves a full chemical stack into its distinct storage category',()=>{
  const w=deconstructionCamp(1,32),p=w.pawns[0]!;
  for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;
  p.priorities.haul=1;p.planCooldown=0;
  addMaterial(w,'neutroamine',150,{type:'ground',x:5,z:5},'neutroamine');
  const zone={id:w.nextId++,x:12,z:12,filters:{wood:false,food:false,neutroamine:true},priority:3,capacity:150};w.stockpiles=[zone];
  const stored=()=>w.piles.some(p=>p.item==='neutroamine'&&p.owner.type==='ground'&&p.owner.x===zone.x&&p.owner.z===zone.z&&p.quantity===150);
  for(let i=0;i<1200&&!stored();i++)stepWorld(w);
  expect(stored()).toBe(true);expect(count(w.piles,'neutroamine')).toBe(150);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('physical contact buys neutroamine once and a stale quote changes neither currency nor stock',()=>{
  const {world:w,pawnId,traderId}=visitorTradeFixture(),merchant=w.pawns.find(p=>p.id===traderId)!,pawn=w.pawns.find(p=>p.id===pawnId)!;
  merchant.visitor!.merchantKind='exotic';const generated=generateExoticStock(123,traderId,w.nextId,w.tick,206);
  w.nextId=generated.nextId;w.piles.push(...generated.piles);
  applyCommand(w,{type:'area',action:'home',from:{x:0,z:0},to:{x:31,z:31}});
  addMaterial(w,'silver',500,{type:'ground',x:2,z:3},'silver');
  expect(applyCommand(w,{type:'order-trade',pawnId,traderId}).ok).toBe(true);
  for(let i=0;i<1200&&!tradingAtContact(w,pawn,merchant);i++)stepWorld(w);
  expect(tradingAtContact(w,pawn,merchant)).toBe(true);
  const good=tradeGoods(w,pawn,merchant).goods.find(g=>g.side==='buy'&&g.pile.item==='neutroamine')!;
  const lines=[{pileId:good.pile.id,quantity:5}],first=quoteTrade(w,pawnId,traderId,lines);if(!first.ok)throw Error(first.reason);
  good.pile.quantity--;const before=JSON.stringify(w);
  expect(applyCommand(w,{type:'trade-execute',pawnId,traderId,lines,quote:first.signature,acceptShortfall:false}).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
  good.pile.quantity++;const quote=quoteTrade(w,pawnId,traderId,lines);if(!quote.ok)throw Error(quote.reason);
  const total=count(w.piles,'neutroamine'),quantity=good.pile.quantity;
  expect(applyCommand(w,{type:'trade-execute',pawnId,traderId,lines,quote:quote.signature,acceptShortfall:false}).ok).toBe(true);
  expect(w.piles.find(p=>p.id===good.pile.id)!.quantity).toBe(quantity-5);expect(count(w.piles,'neutroamine')).toBe(total);
  expect(w.piles.some(p=>p.item==='neutroamine'&&p.owner.type==='ground'&&p.quantity===5)).toBe(true);
  expect(w.trade!.bought.neutroamine).toBe(5);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
