import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {APPAREL,armorPiece,newApparelState} from '../src/sim/apparel-rules.ts';
import {apparelCompatible} from '../src/sim/armor.ts';
import {cancelFlakWork} from '../src/sim/flak-work.ts';
import {addGroundMaterial,addMaterial} from '../src/sim/materials.ts';
import {productionResearchUnlocked,productionWorkerQualified,validFlakIngredients} from '../src/sim/machining.ts';
import {productionWorkTotal,RECON_ARMOR_REQUIREMENTS} from '../src/sim/production-recipes.ts';
import {CLOTHING_RESEARCH_COST,researchCost} from '../src/sim/research.ts';
import {validReconCatalogueTransport} from '../src/sim/recon-catalogue-save.ts';
import {ORE_DEFINITIONS,validOre} from '../src/sim/ore.ts';
import {generateExoticStock} from '../src/sim/trade-stock.ts';
import {tradeRefusal} from '../src/sim/trade-prices.ts';
import {quoteTrade} from '../src/sim/trade-goods.ts';
import {tradingAtContact} from '../src/sim/trade-contact.ts';
import {adoptExoticMerchantSchedule} from '../src/sim/visitors.ts';
import {validEquipmentShape} from '../src/sim/equipment-save.ts';
import {apparelAppearance} from '../src/render/character-apparel.ts';
import {pawnGeometry,RECON_ARMOR_DYE} from '../src/render/pawn-geometry.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {prepareAdvancedIndustryDemo} from '../scripts/generate-advanced-industry-demo-v139.ts';
import {miningCamp} from './scenarios/mining.ts';
import {visitorTradeFixture} from './scenarios/visitors.ts';
import type {World} from '../src/sim/types.ts';

const amount=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
function prepared():World {
  const w=prepareAdvancedIndustryDemo(),bench=w.structures.find(s=>s.kind==='fabrication-bench')!;
  bench.bills=[];w.research!.points=CLOTHING_RESEARCH_COST;w.research!.completedAt=1000;
  w.research!.reconArmor={points:researchCost('recon-armor'),completedAt:w.tick};
  for(const pawn of w.pawns){pawn.schedule.fill('work');pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;}
  addGroundMaterial(w,'plasteel',80,{x:10,z:11},'plasteel');
  addGroundMaterial(w,'advanced-component',3,{x:9,z:11},'advanced-component');
  addGroundMaterial(w,'uranium',10,{x:9,z:12},'uranium');
  return w;
}
function advance(w:World,done:()=>boolean,limit=12000):void {
  for(let i=0;i<limit&&!done();i++){
    for(const pawn of w.pawns){pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;}
    stepWorld(w);
  }
  expect(done(),`tick ${w.tick}; ${JSON.stringify(w.pawns.map(p=>({state:p.state,cooking:p.cooking})))}`).toBe(true);
}

test('a prepared physical production preserves three inputs, interrupted work and deterministic continuation, then replaces middle/shell clothing',()=>{
  const w=prepared(),bench=w.structures.find(s=>s.kind==='fabrication-bench')!,pawn=w.pawns[0]!;
  expect(validateWorld(w)).toEqual([]);
  expect(RECON_ARMOR_REQUIREMENTS).toEqual({plasteel:80,'advanced-component':3,uranium:10,skill:6});
  expect(productionWorkTotal('make-recon-armor')).toBe(45_000_000);
  expect(productionResearchUnlocked(w,'make-recon-armor')).toBe(true);
  const skill=pawn.skills.crafting!.level;pawn.skills.crafting!.level=5;
  expect(productionWorkerQualified(pawn,'make-recon-armor')).toBe(false);pawn.skills.crafting!.level=skill;
  expect(validFlakIngredients('make-recon-armor',[{item:'plasteel',quantity:80},{item:'advanced-component',quantity:3},{item:'uranium',quantity:10}])).toBe(true);
  expect(validFlakIngredients('make-recon-armor',[{item:'plasteel',quantity:80},{item:'advanced-component',quantity:13}])).toBe(false);
  const before=[amount(w,'plasteel'),amount(w,'advanced-component'),amount(w,'uranium')];
  expect(applyCommand(w,{type:'bill-add',structureId:bench.id,recipe:'make-recon-armor'}).ok).toBe(true);
  advance(w,()=>w.piles.some(p=>p.item==='unfinished-recon-armor'&&!!p.flakWork?.progress),4000);
  const work=w.piles.find(p=>p.item==='unfinished-recon-armor')!;
  for(const [item,quantity] of [['plasteel',80],['advanced-component',3],['uranium',10]] as const)
    expect(work.flakWork!.parts.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)).toBe(quantity);
  expect([amount(w,'plasteel'),amount(w,'advanced-component'),amount(w,'uranium')]).toEqual([before[0]!-80,before[1]!-3,before[2]!-10]);
  const resumed=deserializeWorld(serializeWorld(w));
  for(let i=0;i<25;i++){stepWorld(w);stepWorld(resumed);}
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  const cancelled=deserializeWorld(serializeWorld(w)),tiles=cancelled.tiles;
  cancelled.tiles=tiles.map(()=>({terrain:'rock'}));const atomic=JSON.stringify(cancelled);
  expect(cancelFlakWork(cancelled,work.id).ok).toBe(false);expect(JSON.stringify(cancelled)).toBe(atomic);
  cancelled.tiles=tiles;const priorUranium=amount(cancelled,'uranium');
  expect(cancelFlakWork(cancelled,work.id).ok).toBe(true);
  expect(amount(cancelled,'uranium')-priorUranium).toBeGreaterThanOrEqual(7);
  expect(amount(cancelled,'uranium')-priorUranium).toBeLessThanOrEqual(8);
  expect(validateWorld(cancelled)).toEqual([]);
  advance(w,()=>w.piles.some(p=>p.item==='recon-armor'&&p.owner.type==='ground'));
  const suit=w.piles.find(p=>p.item==='recon-armor')!;
  for(const item of ['flak-vest','cloth-parka'] as const){
    addGroundMaterial(w,'apparel',1,{x:pawn.x,z:pawn.z},item);const old=w.piles.at(-1)!;
    expect(applyCommand(w,{type:'order-equipment',pawnId:pawn.id,itemId:old.id,action:'wear',queue:false}).ok).toBe(true);
    advance(w,()=>old.owner.type==='apparel',400);
  }
  expect(applyCommand(w,{type:'order-equipment',pawnId:pawn.id,itemId:suit.id,action:'wear',queue:false}).ok).toBe(true);
  expect(pawn.equipmentTask!.duration).toBe(114); // 66 suit + 30 vest + 18 parka.
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('applied');
  advance(w,()=>suit.owner.type==='apparel',700);
  expect(w.piles.filter(p=>p.owner.type==='apparel'&&p.owner.pawnId===pawn.id).some(p=>p.item==='flak-vest'||p.item==='cloth-parka')).toBe(false);
  expect(apparelAppearance([suit]).silhouette).toBe(5);
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  expect(applyCommand(w,{type:'order-equipment',pawnId:pawn.id,itemId:suit.id,action:'remove',queue:false}).ok).toBe(true);
  expect(pawn.equipmentTask!.duration).toBe(66);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('applied');
  advance(w,()=>suit.owner.type==='ground',200);
  expect(validateWorld(w)).toEqual([]);
});

test('uranium extraction keeps real mining, hauling, save and delta transitions; exotic stock is prospective and split into finite stacks',()=>{
  const w=miningCamp(),cell=11*32+11;w.tiles[cell]={terrain:'rock',stone:'granite',ore:'uranium'};
  expect(ORE_DEFINITIONS.uranium).toMatchObject({hp:4000,yield:40,item:'uranium'});
  expect(validOre(w.tiles[cell]!,240)).toBe(false);expect(validOre(w.tiles[cell]!,241)).toBe(true);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('applied');
  expect(applyCommand(w,{type:'designate',kind:'mine',x:11,z:11}).ok).toBe(true);
  advance(w,()=>!!w.tiles[cell]!.miningDamage,1000);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  advance(w,()=>w.tiles[cell]!.terrain==='rough-stone',10000);
  const total=amount(w,'uranium');expect(total).toBeGreaterThan(0);
  expect(applyCommand(w,{type:'stockpile',x:19,z:15,enabled:true,filters:{wood:false,food:false,uranium:true}}).ok).toBe(true);
  advance(w,()=>w.piles.filter(p=>p.item==='uranium').every(p=>p.owner.type==='ground'&&p.owner.x===19&&p.owner.z===15),1800);
  expect(amount(w,'uranium')).toBe(total);
  const adopted=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw new Error('Expected uranium delta');expect(adopted.world.piles.filter(p=>p.item==='uranium')).toEqual(w.piles.filter(p=>p.item==='uranium'));
  expect(validateWorld(w)).toEqual([]);
  const old=generateExoticStock(42,5,10,2000,240),next=generateExoticStock(42,5,10,2000,241),uranium=next.piles.filter(p=>p.item==='uranium');
  expect(next.piles.slice(0,old.piles.length)).toEqual(old.piles);
  expect(uranium.reduce((n,p)=>n+p.quantity,0)).toBeGreaterThanOrEqual(40);
  expect(uranium.reduce((n,p)=>n+p.quantity,0)).toBeLessThanOrEqual(200);
  expect(uranium.every(p=>p.quantity<=75&&p.owner.type==='inventory')).toBe(true);
  expect(tradeRefusal(uranium[0]!,'buy',2000,'exotic')).toBeUndefined();
  expect(tradeRefusal(uranium[0]!,'buy',2000)).toBeDefined();
});

test('schema240 migration is neutral and rejects every new durable identifier before migration',()=>{
  const w=prepared();w.piles=w.piles.filter(p=>p.item!=='uranium');
  // A schema240 fixture cannot inherit the future default clothing permission.
  w.apparelPolicies=w.apparelPolicies!.map(policy=>({...policy,allowedItems:policy.allowedItems.filter(item=>item!=='recon-armor')}));
  (w as {schemaVersion:number}).schemaVersion=240;
  const old=JSON.parse(JSON.stringify(w)),restored=deserializeWorld(JSON.stringify(old));
  expect(restored).toEqual({...old,schemaVersion:241});
  for(const future of [
    {piles:[{item:'uranium'}]},{tiles:[{ore:'uranium'}]},
    {piles:[{item:'recon-armor'}]},{piles:[{item:'unfinished-recon-armor'}]},
    {packed:[{building:{bills:[{recipe:'make-recon-armor'}]}}]},
    {stockpiles:[{filters:{uranium:false}}]},
    {apparelPolicies:[{allowedItems:['recon-armor']}]},
    {group:{items:[{item:'uranium'}]}},{trade:{bought:{uranium:1}}},
  ]){
    expect(validReconCatalogueTransport(future,240)).toBe(false);
    expect(()=>deserializeWorld(JSON.stringify({...old,...future}))).toThrow(/Future recon catalogue/);
  }
});

test('a prepared real exotic exchange preserves uranium and suit custody through save, while colonial suit inventory stays invalid',()=>{
  const {world:w,pawnId,traderId}=visitorTradeFixture();adoptExoticMerchantSchedule(w);
  const trader=w.pawns.find(p=>p.id===traderId)!,negotiator=w.pawns.find(p=>p.id===pawnId)!;
  trader.visitor!.merchantKind='exotic';
  const stock=generateExoticStock(123,traderId,w.nextId,w.tick);w.nextId=stock.nextId;w.piles.push(...stock.piles);
  expect(applyCommand(w,{type:'area',action:'home',from:{x:0,z:0},to:{x:w.width-1,z:w.height-1}}).ok).toBe(true);
  addGroundMaterial(w,'apparel',1,{x:2,z:3},'recon-armor');
  const suit=w.piles.find(p=>p.item==='recon-armor')!,state={...suit.apparel!},uranium=w.piles.find(p=>p.item==='uranium')!;
  const beforeUranium=amount(w,'uranium');
  expect(applyCommand(w,{type:'order-trade',pawnId,traderId}).ok).toBe(true);
  advance(w,()=>tradingAtContact(w,negotiator,trader),1200);
  const lines=[{pileId:uranium.id,quantity:1},{pileId:suit.id,quantity:-1}],quote=quoteTrade(w,pawnId,traderId,lines);
  expect(quote.ok).toBe(true);if(!quote.ok)throw new Error(quote.reason);
  expect(applyCommand(w,{type:'trade-execute',pawnId,traderId,lines,quote:quote.signature,acceptShortfall:true}).ok).toBe(true);
  expect(w.piles.find(p=>p.id===suit.id)).toMatchObject({item:'recon-armor',quantity:1,owner:{type:'inventory',pawnId:traderId},apparel:state});
  expect(amount(w,'uranium')).toBe(beforeUranium);
  expect(w.piles.some(p=>p.item==='uranium'&&p.owner.type==='ground'&&p.quantity===1)).toBe(true);
  expect(w.trade!.sold['recon-armor']).toBe(1);expect(w.trade!.bought.uranium).toBe(1);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const wrongCustody=structuredClone(w),sold=wrongCustody.piles.find(p=>p.id===suit.id)!;
  sold.owner={type:'inventory',pawnId};
  expect(validateWorld(wrongCustody)).toContain('Invalid inventory ownership.');
});

test('the extended captured dressing duration is prospective and remains bounded',()=>{
  const task={equipmentTask:{itemId:1,action:'wear',progress:0,duration:132}};
  expect(validEquipmentShape(task,240)).toBe(false);expect(validEquipmentShape(task,241)).toBe(true);
  expect(validEquipmentShape({equipmentTask:{...task.equipmentTask,duration:133}},241)).toBe(false);
});

test('suit coverage, head compatibility and resident original geometry agree with its normal profile',()=>{
  const d=APPAREL['recon-armor'];expect(d).toMatchObject({hitPoints:280,equipTicks:66,moveOffset:0,coldInsulation:64,heatInsulation:9,ratings:{sharp:.92,blunt:.4,heat:.46}});
  expect(apparelCompatible(d.coverage,APPAREL['flak-vest'].coverage)).toBe(false);
  expect(apparelCompatible(d.coverage,APPAREL['cloth-parka'].coverage)).toBe(false);
  expect(apparelCompatible(d.coverage,APPAREL['cloth-shirt'].coverage)).toBe(true);
  expect(apparelCompatible(d.coverage,APPAREL['recon-helmet'].coverage)).toBe(true);
  const suit={id:1,item:'recon-armor' as const,kind:'apparel' as const,quantity:1,owner:{type:'ground' as const,x:0,z:0},apparel:newApparelState('recon-armor')};
  expect(armorPiece(suit).coverage.parts).toContain('left-leg');
  const geometry=pawnGeometry(),dyes=geometry.getAttribute('dye');
  expect(Array.from({length:dyes.count},(_,i)=>dyes.getX(i)).some(dye=>dye===RECON_ARMOR_DYE)).toBe(true);geometry.dispose();
});
