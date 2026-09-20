import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { addMaterial,reservedSource } from '../src/sim/materials';
import { groundPile,nearbyGround } from '../src/sim/ground-placement';
import { quoteTrade,tradeGoods } from '../src/sim/trade-goods';
import { tradingAtContact } from '../src/sim/trade-contact';
import type { Command,World } from '../src/sim/types';
import type { TradeLine } from '../src/sim/trade-state';
import type { ItemId } from '../src/sim/items';
import { visitorTradeFixture } from './scenarios/visitors';

function command(w:World,c:Command) {expect(applyCommand(w,c)).toMatchObject({ok:true});}
function unchangedRefusal(w:World,c:Command) {
  const before=JSON.stringify(w);expect(applyCommand(w,c).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
}
function contact(count=1) {
  const f=visitorTradeFixture(count),{world:w,pawnId,traderId}=f,p=w.pawns.find(p=>p.id===pawnId)!,t=w.pawns.find(p=>p.id===traderId)!;
  expect(validateWorld(w)).toEqual([]);
  expect(quoteTrade(w,pawnId,traderId,[]).ok).toBe(false);
  command(w,{type:'area',action:'home',from:{x:0,z:0},to:{x:w.width-1,z:w.height-1}});
  // Controlled financial inputs, after the real visitor producer. Neither the
  // visitor's inventory, condition, price profile nor motion is manufactured.
  addMaterial(w,'silver',500,{type:'ground',x:2,z:3},'silver');
  command(w,{type:'order-trade',pawnId,traderId});
  for(let i=0;i<1200&&!tradingAtContact(w,p,t);i++)stepWorld(w);
  expect(tradingAtContact(w,p,t),JSON.stringify({tick:w.tick,p,t})).toBe(true);
  expect(validateWorld(w)).toEqual([]);return {...f,p,t};
}
function quote(w:World,pawnId:number,traderId:number,lines:TradeLine[]) {
  const q=quoteTrade(w,pawnId,traderId,lines);expect(q.ok).toBe(true);if(!q.ok)throw new Error(q.reason);return q;
}
function purchaseCommand(w:World,pawnId:number,traderId:number,lines:TradeLine[],acceptShortfall=false):Command {
  return {type:'trade-execute',pawnId,traderId,lines,quote:quote(w,pawnId,traderId,lines).signature,acceptShortfall};
}
const total=(w:World,item:ItemId)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);

test('real contact buys finite goods, preserves whole-stack identity and money, then replays exactly',()=>{
  const {world:w,pawnId,traderId,p,t}=contact(),stock=tradeGoods(w,p,t);
  const medicine=stock.goods.find(g=>g.side==='buy'&&g.pile.item==='medicine')!;expect(medicine).toBeDefined();
  const personal=[...t.visitor!.personalFoodIds];expect(stock.goods.every(g=>!personal.includes(g.pile.id))).toBe(true);
  const old=structuredClone(medicine.pile),money=total(w,'silver'),units=total(w,'medicine'),heldMoney=stock.merchantSilver.reduce((n,s)=>n+s.quantity,0);
  const lines=[{pileId:old.id,quantity:old.quantity}],q=quote(w,pawnId,traderId,lines);
  // Independent normal-quality, social-zero medicine price: 18 × 1.4.
  expect(p.skills.social?.level??0).toBe(0);expect(medicine.unitPrice).toBeCloseTo(25.2,12);
  expect(q.net).toBe(Math.round(25.2*old.quantity));
  command(w,{type:'trade-execute',pawnId,traderId,lines,quote:q.signature,acceptShortfall:false});
  const delivered=w.piles.find(s=>s.id===old.id)!;expect(delivered).toMatchObject({id:old.id,item:'medicine',quantity:old.quantity,owner:{type:'ground'}});
  expect(delivered.damage).toBe(old.damage);expect(delivered.rot).toEqual(old.rot);
  expect(total(w,'silver')).toBe(money);expect(total(w,'medicine')).toBe(units);
  expect(w.piles.filter(s=>s.item==='silver'&&s.owner.type==='inventory'&&s.owner.pawnId===traderId).reduce((n,s)=>n+s.quantity,0)).toBe(heldMoney+q.net);
  expect(w.trade).toMatchObject({count:1,silverPaid:q.net,silverReceived:0,forgone:0,bought:{medicine:old.quantity}});expect(p.trade).toBeUndefined();
  expect(personal.every(id=>w.piles.some(s=>s.id===id))).toBe(true);expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,120);stepWorld(resumed,120);expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
  for(const mutate of [(v:World)=>v.trade!.recent=[],(v:World)=>v.trade!.recent[0]!.silver++,
    (v:World)=>v.trade!.recent[0]!.lines[0]!.unitPrice=Number.MAX_VALUE,(v:World)=>v.trade!.bought.medicine!++]) {
    const invalid=structuredClone(w);mutate(invalid);expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/trade/i);
  }
});

test('active and queued hauling quantities remain attached to their source when only the unreserved surplus is sold',()=>{
  const {world:w,pawnId,traderId,p,t}=contact(2),hauler=w.pawns.find(a=>a.id!==pawnId&&!a.visitor)!;
  unchangedRefusal(w,{type:'order-trade',pawnId:hauler.id,traderId});
  command(w,{type:'priority',pawnId:hauler.id,work:'haul',value:1});
  command(w,{type:'stockpile',x:3,z:2,enabled:true,capacity:15,priority:3,filters:{wood:false,food:false,textile:true}});
  addMaterial(w,'textile',75,{type:'ground',x:2,z:2},'cloth');const source=groundPile(w,{x:2,z:2})!;
  for(const queue of [false,true])command(w,{type:'order-haul',pawnId:hauler.id,target:{type:'pile',pileId:source.id},queue});
  const held=reservedSource(w,source.id);expect(held).toBe(15);
  expect(tradeGoods(w,p,t).goods.find(g=>g.pile.id===source.id)).toMatchObject({side:'sell',available:60});
  const tasks=JSON.stringify({haul:hauler.haul,orders:hauler.orders}),units=total(w,'cloth'),money=total(w,'silver');
  expect(quoteTrade(w,pawnId,traderId,[{pileId:source.id,quantity:-61}]).ok).toBe(false);
  command(w,purchaseCommand(w,pawnId,traderId,[{pileId:source.id,quantity:-60}],true));
  expect(w.piles.find(s=>s.id===source.id)).toMatchObject({quantity:15,owner:{type:'ground',x:2,z:2}});
  expect(reservedSource(w,source.id)).toBe(15);expect(JSON.stringify({haul:hauler.haul,orders:hauler.orders})).toBe(tasks);
  expect(total(w,'cloth')).toBe(units);expect(total(w,'silver')).toBe(money);expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,160);stepWorld(resumed,160);expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
});

test('stale, malformed and reversed baskets refuse without mutation; saturated ground rolls back the entire multi-item barter',()=>{
  const {world:w,pawnId,traderId,p,t}=contact(),goods=tradeGoods(w,p,t).goods;
  const medicine=goods.find(g=>g.side==='buy'&&g.pile.item==='medicine')!,ration=goods.find(g=>g.side==='buy'&&g.pile.item==='survival-meal')!;
  expect(medicine).toBeDefined();expect(ration).toBeDefined();
  const lines=[{pileId:medicine.pile.id,quantity:1}],accepted=purchaseCommand(w,pawnId,traderId,lines);
  addMaterial(w,'silver',1,{type:'ground',x:3,z:3},'silver');unchangedRefusal(w,accepted);
  for(const bad of [[null],lines.concat(lines),[{pileId:medicine.pile.id,quantity:-1}],[{pileId:medicine.pile.id,quantity:0}],[{pileId:medicine.pile.id,quantity:Number.MAX_SAFE_INTEGER}]]) {
    const before=JSON.stringify(w);expect(quoteTrade(w,pawnId,traderId,bad as TradeLine[]).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
  }
  const cells=nearbyGround(w,p),free=cells.find(c=>!groundPile(w,c))!;
  addMaterial(w,'textile',75,{type:'ground',...free},'cloth');const cloth=groundPile(w,free)!;
  for(const c of cells)if(!groundPile(w,c))addMaterial(w,'wood',75,{type:'ground',...c},'wood');
  expect(validateWorld(w)).toEqual([]);
  // Selling the entire cloth stack frees one cell. The first purchase fits;
  // the second incompatible item cannot use that same cell or any neighbour.
  const basket=[{pileId:cloth.id,quantity:-75},{pileId:medicine.pile.id,quantity:1},{pileId:ration.pile.id,quantity:1}];
  const proposal=purchaseCommand(w,pawnId,traderId,basket,true);unchangedRefusal(w,proposal);expect(validateWorld(w)).toEqual([]);
});

test('finite trader silver needs explicit loss acceptance and exhausted identity capacity refuses before any ownership change',()=>{
  const {world:w,pawnId,traderId,p,t}=contact(),merchantMoney=tradeGoods(w,p,t).merchantSilver.reduce((n,s)=>n+s.quantity,0);
  // Real visitor stock is finite; these explicit test inputs sell for more than
  // even the maximum 250 silver carried by this reduced visitor profile.
  const lines:TradeLine[]=[];
  for(let x=4;x<9;x++){addMaterial(w,'textile',75,{type:'ground',x,z:3},'cloth');lines.push({pileId:groundPile(w,{x,z:3})!.id,quantity:-75});}
  const q=quote(w,pawnId,traderId,lines);expect(q.forgone).toBeGreaterThan(0);expect(q.paid).toBe(-merchantMoney);
  const c:Command={type:'trade-execute',pawnId,traderId,lines,quote:q.signature,acceptShortfall:false};unchangedRefusal(w,c);
  const money=total(w,'silver'),cloth=total(w,'cloth');command(w,{...c,acceptShortfall:true});
  expect(total(w,'silver')).toBe(money);expect(total(w,'cloth')).toBe(cloth);expect(w.trade).toMatchObject({silverReceived:merchantMoney,forgone:q.forgone,sold:{cloth:375}});expect(validateWorld(w)).toEqual([]);
  command(w,{type:'order-trade',pawnId,traderId});
  for(let i=0;i<1200&&!tradingAtContact(w,p,t);i++)stepWorld(w);
  expect(tradingAtContact(w,p,t)).toBe(true);
  const sale=w.piles.find(s=>s.item==='cloth'&&s.owner.type==='inventory'&&s.owner.pawnId===traderId)!;
  w.nextId=Number.MAX_SAFE_INTEGER;expect(validateWorld(w)).toEqual([]);
  unchangedRefusal(w,purchaseCommand(w,pawnId,traderId,[{pileId:sale.id,quantity:1}]));
});
