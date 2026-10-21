import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {fixturePower} from './scenarios/power.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {newWeaponState} from '../src/sim/equipment-rules.ts';
import {SMELTING_WEAPONS,smeltingIngredientAllowed,smeltingYield,smeltingProduct,validSmeltingIngredients} from '../src/sim/smelting-rules.ts';
import {commercialItemMassGrams,commercialPawnMass} from '../src/sim/commercial-mass.ts';
import {tradeCatalogueEntry} from '../src/sim/trade-catalogue.ts';
import {pileMarketValue} from '../src/sim/trade-prices.ts';
import {pileFlammability} from '../src/sim/thing-damage-rules.ts';
import {SPEAR_ITEMS_272,type SpearItem272} from '../src/sim/spear-content-272.ts';
import type {MaterialPile,Structure,World,WorkType} from '../src/sim/types.ts';

const exact=(w:World)=>{const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;};
function until(w:World,done:()=>boolean,limit=1400){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,task:w.pawns[0]!.cooking})).toBe(true);expect(validateWorld(w)).toEqual([]);}
/** Finite worn weapon and powered smelter are prepared explicitly. Real
 * travel/contact, smelting, stochastic yield and partial storage are played. */
function camp(item:SpearItem272){
 const w=deconstructionCamp(),p=w.pawns[0]!;w.stockpiles=[];w.packed=[];w.events=[];
 for(const work of Object.keys(p.priorities) as WorkType[])p.priorities[work]=0;p.priorities.craft=1;p.priorities.haul=1;p.apparelAutomation=false;delete p.background;delete p.traits;p.x=5;p.z=10;
 const generator=fixturePower(w,'wood-generator',11,11),bill=newCookingBill(w.nextId++,'smelt-weapon');bill.filters[item]=true;bill.destination='drop';
 const station:Structure={id:w.nextId++,kind:'electric-smelter',x:14,z:13,orientation:0,footprint:'standard',material:'steel',bills:[bill],power:newPowerState('electric-smelter')};station.power!.parentId=generator.id;station.power!.on=true;w.structures.push(station);
 addMaterial(w,'weapon',1,{type:'ground',x:8,z:11},item);const weapon=w.piles.at(-1)!;weapon.weapon!.quality='legendary';weapon.weapon!.hitPoints=1;refreshStock(w);expect(validateWorld(w)).toEqual([]);return {w,p,bill,station,weapon};
}

test('all six spears preserve their material HP, unrounded price basis, market finalization, mass and flammability',()=>{
 const rows=[['wood-spear',65,120.24,120.24,1],['steel-spear',100,185.7,185.7,.4],['plasteel-spear',280,770.04,770,0],['uranium-spear',250,532.08,530,0],['silver-spear',70,793.2,795,.4],['gold-spear',60,7538.88,7540,.4]] as const;
 expect(SPEAR_ITEMS_272).toHaveLength(6);for(const [item,hp,base,market,fire]of rows){
  const w=deconstructionCamp(),p=w.pawns[0]!,pile:MaterialPile={id:w.nextId++,kind:'weapon',item,quantity:1,owner:{type:'equipment',pawnId:p.id},weapon:newWeaponState(item)};
  expect(pile.weapon?.hitPoints).toBe(hp);expect(tradeCatalogueEntry(item)).toMatchObject({baseMarketValue:expect.closeTo(base,8),maxHitPoints:hp,hasQuality:true,sellPriceFactor:.2,visitorHandles:false});expect(pileMarketValue(pile)).toBeCloseTo(market,7);
  expect(commercialItemMassGrams(item,272)).toBe(2000);expect(commercialItemMassGrams(item,271)).toBeUndefined();expect(commercialPawnMass(p,[pile],272)?.grams).toBe(2000);expect(commercialPawnMass(p,[pile],271)).toBeNull();expect(pileFlammability(pile)).toBe(fire);
  pile.weapon!.hitPoints=1;expect(pileMarketValue(pile)).toBeLessThan(base);
 }
});

test('only the five metal spears enter recovery and every fractional yield uses one real draw',()=>{
 for(const item of SPEAR_ITEMS_272){
  const wood=item==='wood-spear',precious=item==='silver-spear'||item==='gold-spear',bill=newCookingBill(2,'smelt-weapon'),pile:MaterialPile={id:1,kind:'weapon',item,quantity:1,owner:{type:'ground',x:2,z:2},weapon:newWeaponState(item)};
  expect(SMELTING_WEAPONS.includes(item)).toBe(!wood);expect(bill.filters[item]).toBe(wood?undefined:false);bill.filters[item]=true;expect(smeltingIngredientAllowed(bill,pile)).toBe(!wood);expect(validSmeltingIngredients([{item,quantity:1}])).toBe(!wood);
  if(wood){expect(()=>smeltingProduct(item)).toThrow();expect(()=>smeltingYield(item,()=>0)).toThrow();continue;}
  expect(smeltingProduct(item)).toBe(item.slice(0,-6));let calls=0;expect(smeltingYield(item,()=>{calls++;return 0;})).toBe(precious?188:19);expect(calls).toBe(1);expect(smeltingYield(item,()=>.999999)).toBe(precious?187:18);
  pile.weapon!.quality='legendary';pile.weapon!.hitPoints=1;expect(smeltingIngredientAllowed(bill,pile)).toBe(true);pile.weapon!.forbidden=true;expect(smeltingIngredientAllowed(bill,pile)).toBe(false);
 }
});

test.each(['steel','silver'] as const)('real %s spear smelting preserves pickup, exact recovery and partial output through reload',metal=>{
 const {w,p,bill,station,weapon}=camp(`${metal}-spear`),id=weapon.id;expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);
 until(w,()=>p.cooking?.ingredients[0]?.stage==='held'&&(p.motion?.end??0)>w.tick);expect(weapon.owner).toEqual({type:'pawn',pawnId:p.id});const pickup=exact(w);
 until(w,()=>p.cooking?.phase==='output');stepWorld(pickup,w.tick-pickup.tick);expect(serializeWorld(pickup)).toBe(serializeWorld(w));
 const product=w.piles.find(q=>q.id===p.cooking!.productId)!,quantity=product.quantity;expect([metal==='silver'?187:18,metal==='silver'?188:19]).toContain(quantity);expect(product).toMatchObject({item:metal,owner:{type:'pawn',pawnId:p.id}});expect(w.piles.some(q=>q.id===id)).toBe(false);expect(bill.target).toBe(0);expect(product.weapon).toBeUndefined();
 const a={x:17,z:14},b={x:19,z:14},initialA=metal==='silver'?475:70,initialB=metal==='silver'?275:20,cut=metal==='silver'?25:5;
 for(const cell of [a,b])expect(applyCommand(w,{type:'stockpile',enabled:true,...cell,filters:{wood:false,food:false,[metal]:true}}).ok).toBe(true);
 addMaterial(w,metal,initialA,{type:'ground',...a});addMaterial(w,metal,initialB,{type:'ground',...b});refreshStock(w);bill.destination='stockpile';
 until(w,()=>product.quantity===quantity-cut);expect(product.owner.type).toBe('pawn');const partial=exact(w),tick=w.tick;
 until(w,()=>p.cooking===null);stepWorld(partial,w.tick-tick);expect(serializeWorld(partial)).toBe(serializeWorld(w));expect(w.piles.filter(q=>q.item===metal).reduce((n,q)=>n+q.quantity,0)).toBe(initialA+initialB+quantity);expect(w.piles.some(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id)).toBe(false);exact(w);
});
