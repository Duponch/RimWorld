import {expect,test} from 'vitest';
import {applyCommand,stepWorld,validateWorld} from '../src/sim/index.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import {quoteTrade,tradeGoods} from '../src/sim/trade-goods.ts';
import {tradeRefusal} from '../src/sim/trade-prices.ts';
import {generateExoticStock} from '../src/sim/trade-stock.ts';
import {storageAccepts} from '../src/sim/storage-filters.ts';
import {tradingAtContact} from '../src/sim/trade-contact.ts';
import {adoptExoticMerchantSchedule,advanceVisitors,enableVisitors} from '../src/sim/visitors.ts';
import {validateVisitors} from '../src/sim/visitor-save.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {visitorTradeFixture} from './scenarios/visitors.ts';
import type {MaterialPile,World} from '../src/sim/types.ts';

const count=(piles:readonly MaterialPile[],item:ItemId)=>piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);

test('V123 exotic schedule adopts only future opportunities and carries finite physical stock',()=>{
  const old=deconstructionCamp(1,32);old.tick=12000;enableVisitors(old);
  const before={rng:old.rng,nextId:old.nextId,visitor:structuredClone(old.visitors!.visitor),traveler:structuredClone(old.visitors!.traveler)};
  adoptExoticMerchantSchedule(old);
  expect(old.visitors!.exotic!.pending[0]).toBeGreaterThan(old.tick);
  expect({rng:old.rng,nextId:old.nextId,visitor:old.visitors!.visitor,traveler:old.visitors!.traveler}).toEqual(before);
  expect(old.pawns.some(p=>p.visitor)).toBe(false);
  expect(validateVisitors(old,123,new Set())).toEqual([]);
  expect(validateVisitors(old,122,new Set())).toContain('Invalid visitor calendar.');
  const zone={filters:{wood:true,food:true,steel:true,component:true,gold:false,plasteel:true,'advanced-component':false}};
  expect(storageAccepts(zone,'gold')).toBe(false);
  expect(storageAccepts(zone,'plasteel')).toBe(true);
  expect(storageAccepts(zone,'advanced-component')).toBe(false);

  for(let seed=1;seed<=40;seed++){
    const stock=generateExoticStock(seed,100,101,old.tick);
    expect(stock).toEqual(generateExoticStock(seed,100,101,old.tick));
    expect(count(stock.piles,'advanced-component')).toBeGreaterThanOrEqual(1);
    expect(count(stock.piles,'advanced-component')).toBeLessThanOrEqual(4);
    expect(count(stock.piles,'plasteel')).toBeGreaterThanOrEqual(50);
    expect(count(stock.piles,'plasteel')).toBeLessThanOrEqual(150);
    expect(count(stock.piles,'gold')).toBeGreaterThanOrEqual(40);
    expect(count(stock.piles,'gold')).toBeLessThanOrEqual(80);
    expect(new Set(stock.piles.map(p=>p.id)).size).toBe(stock.piles.length);
    for(const pile of stock.piles){expect(pile.quantity).toBeLessThanOrEqual(ITEM_DEFINITIONS[pile.item].stackLimit);expect(pile.owner).toEqual({type:'inventory',pawnId:100});if(pile.item!=='silver')expect(tradeRefusal(pile,'buy',old.tick)).toBeTruthy();expect(tradeRefusal(pile,'buy',old.tick,'exotic')).toBeUndefined();}
  }

  const fresh=deconstructionCamp(1,32);enableVisitors(fresh);
  fresh.tick=fresh.visitors!.exotic!.pending[0]!;
  advanceVisitors(fresh);
  const trader=fresh.pawns.find(p=>p.visitor?.merchantKind==='exotic');
  expect(trader?.visitor?.role).toBe('trader');
  expect(trader?.faction).toBe('outlanders');
  expect(count(fresh.piles.filter(p=>p.owner.type==='inventory'&&p.owner.pawnId===trader!.id),'advanced-component')).toBeGreaterThanOrEqual(1);
  expect(validateWorld(fresh)).toEqual([]);
});

test('V123 exotic basket uses contact, finite stock, physical currency and atomic stale-quote refusal',()=>{
  const {world:w,pawnId,traderId}=visitorTradeFixture();adoptExoticMerchantSchedule(w);
  const trader=w.pawns.find(p=>p.id===traderId)!,negotiator=w.pawns.find(p=>p.id===pawnId)!;
  trader.visitor!.merchantKind='exotic';
  const stock=generateExoticStock(123,traderId,w.nextId,w.tick);w.nextId=stock.nextId;w.piles.push(...stock.piles);
  expect(applyCommand(w,{type:'area',action:'home',from:{x:0,z:0},to:{x:w.width-1,z:w.height-1}}).ok).toBe(true);
  addMaterial(w,'silver',500,{type:'ground',x:2,z:3},'silver');
  expect(applyCommand(w,{type:'order-trade',pawnId,traderId}).ok).toBe(true);
  for(let i=0;i<1200&&!tradingAtContact(w,negotiator,trader);i++)stepWorld(w);
  expect(tradingAtContact(w,negotiator,trader)).toBe(true);
  const gold=tradeGoods(w,negotiator,trader).goods.find(g=>g.side==='buy'&&g.pile.item==='gold')!;
  expect(gold).toBeDefined();
  const lines=[{pileId:gold.pile.id,quantity:3}],quote=quoteTrade(w,pawnId,traderId,lines);
  expect(quote.ok).toBe(true);if(!quote.ok)throw Error(quote.reason);
  const oldQuantity=gold.pile.quantity;
  const stale={type:'trade-execute' as const,pawnId,traderId,lines,quote:quote.signature,acceptShortfall:false};
  gold.pile.quantity--;
  const unchanged=JSON.stringify(w);
  expect(applyCommand(w,stale).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(unchanged);
  gold.pile.quantity++;
  const fresh=quoteTrade(w,pawnId,traderId,lines);expect(fresh.ok).toBe(true);if(!fresh.ok)throw Error(fresh.reason);
  const before=count(w.piles,'gold');
  expect(applyCommand(w,{...stale,quote:fresh.signature}).ok).toBe(true);
  expect(count(w.piles,'gold')).toBe(before);
  expect(w.piles.find(p=>p.id===gold.pile.id)?.quantity).toBe(oldQuantity-3);
  expect(w.piles.some(p=>p.item==='gold'&&p.owner.type==='ground'&&p.quantity>=3)).toBe(true);
  expect(w.trade?.bought.gold).toBe(3);
  expect(validateWorld(w)).toEqual([]);
});
