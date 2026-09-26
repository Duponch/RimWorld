import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { addMaterial } from '../src/sim/materials';
import { furnitureDropCell } from '../src/sim/furniture-transfer';
import { groundCapacity,nearbyGround } from '../src/sim/ground-placement';
import { destroyHumanCorpse } from '../src/sim/human-corpses';
import { quoteTrade,tradeGoods } from '../src/sim/trade-goods';
import { sculptureTradeUnitPrice } from '../src/sim/trade-prices';
import { structureRoomMarketValue } from '../src/sim/room-market-value';
import { tradingAtContact } from '../src/sim/trade-contact';
import type { PackedFurniture } from '../src/sim/furniture-rules';
import type { Command,World } from '../src/sim/types';
import { visitorTradeFixture } from './scenarios/visitors';

function contact() {
  const f=visitorTradeFixture(),w=f.world,p=w.pawns.find(p=>p.id===f.pawnId)!,t=w.pawns.find(p=>p.id===f.traderId)!;
  expect(applyCommand(w,{type:'area',action:'home',from:{x:0,z:0},to:{x:w.width-1,z:w.height-1}}).ok).toBe(true);
  addMaterial(w,'silver',500,{type:'ground',x:2,z:3},'silver');
  expect(applyCommand(w,{type:'order-trade',pawnId:p.id,traderId:t.id}).ok).toBe(true);
  for(let i=0;i<1200&&!tradingAtContact(w,p,t);i++)stepWorld(w);
  expect(tradingAtContact(w,p,t)).toBe(true);
  return {w,p,t};
}
function sculpture(w:World,authorId:number,kind:'small-sculpture'|'large-sculpture'='small-sculpture') {
  const cell=furnitureDropCell(w,{x:4,z:4});expect(cell).toBeDefined();
  const pack:PackedFurniture={building:{id:w.nextId++,kind,x:cell!.x,z:cell!.z,orientation:0 as const,footprint:'standard' as const,
    material:'marble-blocks' as const,quality:'good' as const,art:{authorId,createdAt:w.tick}},owner:{type:'ground' as const,...cell!}};
  w.packed.push(pack);return pack;
}
function execute(w:World,pawnId:number,traderId:number,lines:{packedId:number;quantity:number}[],acceptShortfall=false) {
  const q=quoteTrade(w,pawnId,traderId,lines);expect(q.ok).toBe(true);if(!q.ok)throw new Error(q.reason);
  const c:Command={type:'trade-execute',pawnId,traderId,lines,quote:q.signature,acceptShortfall};
  return {q,c};
}

test('petit visiteur achète une sculpture entière puis permet son rachat avec identité et registre conservés',()=>{
  const {w,p,t}=contact();expect(tradeGoods(w,p,t).artGoods).toEqual([]);
  const pack=sculpture(w,p.id),id=pack.building.id,original=structuredClone(pack.building);
  expect(validateWorld(w)).toEqual([]);
  const goods=tradeGoods(w,p,t);
  expect(goods.artGoods).toHaveLength(1);
  expect(goods.artGoods[0]).toMatchObject({side:'sell',available:1,packed:{building:{id}}});
  const value=structureRoomMarketValue(original);
  expect(goods.artGoods[0]!.unitPrice).toBe(sculptureTradeUnitPrice(value,'sell',0));
  const sale=execute(w,p.id,t.id,[{packedId:id,quantity:-1}],true);
  expect(applyCommand(w,sale.c).ok).toBe(true);
  expect(w.packed.find(x=>x.building.id===id)).toEqual({building:original,owner:{type:'inventory',pawnId:t.id}});
  expect(w.trade).toMatchObject({artSold:{'small-sculpture':1},recent:[{lines:[{packedId:id,quantity:-1,art:original.art}]}]});
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));expect(resumed).toEqual(w);

  expect(applyCommand(w,{type:'order-trade',pawnId:p.id,traderId:t.id}).ok).toBe(true);
  for(let i=0;i<1200&&!tradingAtContact(w,p,t);i++)stepWorld(w);
  expect(tradingAtContact(w,p,t)).toBe(true);
  expect(tradeGoods(w,p,t).artGoods.find(g=>g.packed.building.id===id)).toMatchObject({side:'buy',available:1});
  const buy=execute(w,p.id,t.id,[{packedId:id,quantity:1}]);
  expect(applyCommand(w,buy.c).ok).toBe(true);
  expect(w.packed.find(x=>x.building.id===id)).toMatchObject({building:original,owner:{type:'ground'}});
  expect(w.trade).toMatchObject({count:2,artSold:{'small-sculpture':1},artBought:{'small-sculpture':1}});
  expect(validateWorld(w)).toEqual([]);
  const again=deserializeWorld(serializeWorld(w));stepWorld(w,20);stepWorld(again,20);expect(again).toEqual(w);
  const corrupt=structuredClone(w);corrupt.trade!.artSold!['small-sculpture']=2;
  expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/trade/i);
});

test('œuvre posée, portée, réservée, panier périmé et marchand parti ne livrent aucune transaction partielle',()=>{
  const {w,p,t}=contact(),pack=sculpture(w,p.id,'large-sculpture'),id=pack.building.id;
  const proposal=execute(w,p.id,t.id,[{packedId:id,quantity:-1}],true);
  w.packed.pop();w.structures.push(pack.building);
  expect(quoteTrade(w,p.id,t.id,[{packedId:id,quantity:-1}]).ok).toBe(false);
  w.structures.pop();w.packed.push(pack);
  pack.building.quality='excellent';const before=JSON.stringify(w);
  expect(applyCommand(w,proposal.c).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
  pack.building.quality='good';
  pack.owner={type:'pawn',pawnId:p.id};expect(quoteTrade(w,p.id,t.id,[{packedId:id,quantity:-1}]).ok).toBe(false);
  pack.owner={type:'ground',x:pack.building.x,z:pack.building.z};
  w.jobs.push({id:w.nextId++,kind:'install',x:5,z:5,orientation:0,footprint:'standard',construction:'blueprint',furniture:{structureId:id,kind:'large-sculpture'},reservedBy:null,progress:0,escrow:{wood:0,food:0}} as World['jobs'][number]);
  expect(quoteTrade(w,p.id,t.id,[{packedId:id,quantity:-1}]).ok).toBe(false);
  w.jobs.pop();
  const sale=execute(w,p.id,t.id,[{packedId:id,quantity:-1}],true);expect(applyCommand(w,sale.c).ok).toBe(true);
  expect(validateWorld(w)).toEqual([]);
  // Depart with the sold object as a real inventory entry. The departure
  // snapshot retains its building rather than converting it into a pile.
  const group=w.visitors!.groups.find(g=>g.id===t.visitor!.group)!;
  group.phase='leaving';group.reason='timeout';t.visitor!.phase='leaving';t.visitor!.goal=null;
  for(let i=0;i<1200&&w.pawns.includes(t);i++)stepWorld(w);
  expect(w.pawns.includes(t)).toBe(false);
  expect(w.packed.some(x=>x.building.id===id)).toBe(false);
  expect(w.visitors!.departed.at(-1)?.packed?.find(x=>x.building.id===id)).toMatchObject({building:{id,art:pack.building.art},owner:{type:'inventory',pawnId:t.id}});
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const historical=structuredClone(w),archived=historical.visitors!.departed.at(-1)!.pawn;
  Reflect.deleteProperty(archived.skills,'artistic');Reflect.deleteProperty(archived.priorities,'art');
  expect(validateWorld(historical)).toEqual([]);
  expect(deserializeWorld(serializeWorld(historical))).toEqual(historical);
});

test('panier mêlant sculpture et piles refuse atomiquement quand le dernier achat manque de sol',()=>{
  const {w,p,t}=contact(),pack=sculpture(w,p.id),id=pack.building.id;
  const stock=tradeGoods(w,p,t),medicine=stock.goods.find(g=>g.side==='buy'&&g.pile.item==='medicine')!,meal=stock.goods.find(g=>g.side==='buy'&&g.pile.item==='survival-meal')!;
  expect(medicine).toBeDefined();expect(meal).toBeDefined();
  for(const cell of nearbyGround(w,p)){
    if(pack.owner.type==='ground'&&cell.x===pack.owner.x&&cell.z===pack.owner.z)continue;
    const n=groundCapacity(w,cell,'wood');if(n>0)addMaterial(w,'wood',n,{type:'ground',...cell},'wood');
  }
  const basket=[{packedId:id,quantity:-1},{pileId:medicine.pile.id,quantity:1},{pileId:meal.pile.id,quantity:1}];
  const q=quoteTrade(w,p.id,t.id,basket);expect(q.ok).toBe(true);if(!q.ok)throw new Error(q.reason);
  const before=JSON.stringify(w);
  expect(applyCommand(w,{type:'trade-execute',pawnId:p.id,traderId:t.id,lines:basket,quote:q.signature,acceptShortfall:true}).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(before);
  expect(validateWorld(w)).toEqual([]);
});

test('la destruction du corps marchand retire aussi la sculpture vendue de son inventaire',()=>{
  const {w,p,t}=contact(),pack=sculpture(w,p.id),id=pack.building.id;
  const sale=execute(w,p.id,t.id,[{packedId:id,quantity:-1}],true);
  expect(applyCommand(w,sale.c).ok).toBe(true);
  expect(w.packed.find(x=>x.building.id===id)?.owner).toEqual({type:'inventory',pawnId:t.id});
  // Isolate the destruction boundary: the corpse's creation and the death
  // itself are covered by the body lifecycle tests.
  const body={id:w.nextId++,kind:'corpse' as const,item:'human-corpse' as const,quantity:1,
    owner:{type:'ground' as const,x:t.x,z:t.z},humanCorpse:{pawnId:t.id},
    rot:{progress:0,atTick:w.tick}};
  w.piles.push(body);t.body={observedAt:w.tick,pileId:body.id};t.state='dead';
  expect(destroyHumanCorpse(w,body)).toBe(true);
  expect(w.packed.some(x=>x.building.id===id)).toBe(false);
  expect(w.piles.some(x=>x.id===body.id)).toBe(false);
  expect(t.body.lostAt).toBe(w.tick);
  expect(w.destroyed?.count).toBeGreaterThanOrEqual(1);
  expect(w.fires?.ledger.structures).toBeGreaterThanOrEqual(1);
});
