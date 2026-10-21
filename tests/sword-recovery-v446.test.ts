import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {fixturePower} from './scenarios/power.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {newWeaponState} from '../src/sim/equipment-rules.ts';
import {SMELTING_WEAPONS,smeltingIngredientAllowed,smeltingYield,smeltingProduct,validSmeltingIngredients,validSmeltingProduct} from '../src/sim/smelting-rules.ts';
import {commercialItemMassGrams,commercialPawnMass} from '../src/sim/commercial-mass.ts';
import {tradeCatalogueEntry} from '../src/sim/trade-catalogue.ts';
import {pileMarketValue,tradeUnitPrice} from '../src/sim/trade-prices.ts';
import {pileFlammability} from '../src/sim/thing-damage-rules.ts';
import {isRecipeProduct} from '../src/sim/production-recipes.ts';
import {LONGSWORD_ITEMS_270,type LongswordItem270} from '../src/sim/longsword-content-270.ts';
import type {MaterialPile,Structure,World,WorkType} from '../src/sim/types.ts';

function exact(w:World):World{const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;}
function until(w:World,done:()=>boolean,limit=1400){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,task:w.pawns[0]!.cooking})).toBe(true);expect(validateWorld(w)).toEqual([]);}
/** Explicitly prepared finite weapon and installed powered smelter. Only the
 * pickup, transport, work, yield, storage and recovery transitions are played. */
function camp(item:LongswordItem270='silver-longsword'){
 const w=deconstructionCamp(),p=w.pawns[0]!;w.stockpiles=[];w.packed=[];w.events=[];
 for(const work of Object.keys(p.priorities) as WorkType[])p.priorities[work]=0;
 p.priorities.craft=1;p.priorities.haul=1;p.apparelAutomation=false;p.recreation.level=100;delete p.background;delete p.traits;p.x=5;p.z=10;
 const generator=fixturePower(w,'wood-generator',11,11),bill=newCookingBill(w.nextId++,'smelt-weapon');bill.filters[item]=true;bill.destination='drop';
 const station:Structure={id:w.nextId++,kind:'electric-smelter',x:14,z:13,orientation:0,footprint:'standard',material:'steel',bills:[bill],power:newPowerState('electric-smelter')};
 station.power!.parentId=generator.id;station.power!.on=true;w.structures.push(station);
 addMaterial(w,'weapon',1,{type:'ground',x:8,z:11},item);const weapon=w.piles.at(-1)!;weapon.weapon!.quality='legendary';weapon.weapon!.hitPoints=1;refreshStock(w);
 expect(validateWorld(w)).toEqual([]);return {w,p,bill,station,weapon};
}

test('all six real items keep their material HP, nominal price, condition, freight mass and fire behaviour without inventing merchant stock',()=>{
 const rows=[['wood-longsword',65,165.36,1],['steel-longsword',100,254.8,.4],['plasteel-longsword',280,1042.56,0],['uranium-longsword',250,723.12,0],['silver-longsword',70,1064.8,.4],['gold-longsword',60,10058.32,.4]] as const;
 expect(LONGSWORD_ITEMS_270).toHaveLength(rows.length);
 for(const [item,hp,base,fire]of rows){
  const w=deconstructionCamp(),p=w.pawns[0]!,pile:MaterialPile={id:w.nextId++,item,kind:'weapon',quantity:1,owner:{type:'equipment',pawnId:p.id},weapon:newWeaponState(item)};
  expect(pile.weapon!.hitPoints).toBe(hp);expect(tradeCatalogueEntry(item)).toMatchObject({baseMarketValue:expect.closeTo(base,7),maxHitPoints:hp,hasQuality:true,sellPriceFactor:.2,visitorHandles:false});
  expect(pileMarketValue(pile)).toBeCloseTo(item==='steel-longsword'?255:item==='plasteel-longsword'?1045:item==='uranium-longsword'?725:item==='silver-longsword'?1065:item==='gold-longsword'?10060:base);
  expect(tradeUnitPrice(pile,'sell',0)).toBeGreaterThan(0);expect(commercialItemMassGrams(item,270)).toBe(2000);expect(commercialItemMassGrams(item,269)).toBeUndefined();
  expect(commercialPawnMass(p,[pile],270)?.grams).toBe(2000);expect(commercialPawnMass(p,[pile],269)).toBeNull();expect(pileFlammability(pile)).toBe(fire);
  pile.weapon!.hitPoints=1;expect(pileMarketValue(pile)).toBeLessThan(base);
 }
});

test('only the five metals can enter smelting; each real material draws once and keeps old output frontiers strict',()=>{
 for(const item of LONGSWORD_ITEMS_270){
  const wood=item==='wood-longsword',bill=newCookingBill(2,'smelt-weapon'),pile:MaterialPile={id:1,item,kind:'weapon',quantity:1,owner:{type:'ground',x:2,z:2},weapon:newWeaponState(item)};
  expect(SMELTING_WEAPONS.includes(item)).toBe(!wood);expect(bill.filters[item]).toBe(wood?undefined:false);
  bill.filters[item]=true;expect(smeltingIngredientAllowed(bill,pile)).toBe(!wood);expect(validSmeltingIngredients([{item,quantity:1}])).toBe(!wood);
  if(wood){expect(()=>smeltingProduct(item)).toThrow();expect(()=>smeltingYield(item,()=>0)).toThrow();continue;}
  const metal=item.slice(0,-10),precious=metal==='silver'||metal==='gold';let calls=0;
  expect(smeltingProduct(item)).toBe(metal);expect(smeltingYield(item,()=>{calls++;return 0;})).toBe(precious?250:25);expect(calls).toBe(1);
  expect(smeltingYield(item,()=>.999999)).toBe(precious?250:25);expect(isRecipeProduct('smelt-weapon',metal as 'steel')).toBe(true);
  pile.weapon!.quality='legendary';pile.weapon!.hitPoints=1;expect(smeltingIngredientAllowed(bill,pile)).toBe(true);
  pile.weapon!.forbidden=true;expect(smeltingIngredientAllowed(bill,pile)).toBe(false);
 }
 for(const metal of ['steel','plasteel','uranium']){
  expect(validSmeltingProduct(metal,25,'smelt-weapon',270)).toBe(true);expect(validSmeltingProduct(metal,26,'smelt-weapon',270)).toBe(false);
  expect(validSmeltingProduct(metal,25,'smelt-weapon',269)).toBe(false);
 }
 for(const metal of ['silver','gold']){
  expect(validSmeltingProduct(metal,250,'smelt-weapon',270)).toBe(true);expect(validSmeltingProduct(metal,251,'smelt-weapon',270)).toBe(false);
  expect(validSmeltingProduct(metal,126,'smelt-weapon',269)).toBe(false);expect(validSmeltingProduct(metal,125,'smelt-weapon',269)).toBe(true);
 }
 expect(validSmeltingProduct('wood',1,'smelt-weapon',270)).toBe(false);
});

test.each(['silver','gold'] as const)('a worn %s sword yields250 once then survives partial storage and exact continuation',metal=>{
 const {w,p,station,bill,weapon}=camp(`${metal}-longsword`),id=weapon.id;
 expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);
 until(w,()=>p.cooking?.ingredients[0]?.stage==='held'&&(p.motion?.end??0)>w.tick);
 expect(weapon.owner).toEqual({type:'pawn',pawnId:p.id});const pickup=exact(w);
 until(w,()=>p.cooking?.phase==='output');stepWorld(pickup,w.tick-pickup.tick);expect(serializeWorld(pickup)).toBe(serializeWorld(w));
 const product=w.piles.find(q=>q.id===p.cooking!.productId)!;expect(product).toMatchObject({item:metal,kind:metal,quantity:250,owner:{type:'pawn',pawnId:p.id}});
 expect(w.piles.some(q=>q.id===id)).toBe(false);expect(bill.target).toBe(0);expect(product.weapon).toBeUndefined();expect(product.apparel).toBeUndefined();
 // Two finite target stacks force a real25/225 split, not a remote deposit.
 const a={x:17,z:14},b={x:19,z:14};
 for(const cell of [a,b])expect(applyCommand(w,{type:'stockpile',enabled:true,...cell,filters:{wood:false,food:false,[metal]:true}}).ok).toBe(true);
 addMaterial(w,metal,475,{type:'ground',...a});addMaterial(w,metal,275,{type:'ground',...b});refreshStock(w);bill.destination='stockpile';
 until(w,()=>product.quantity===225);
 expect(product.owner.type).toBe('pawn');expect(w.piles.find(q=>q.item===metal&&q.owner.type==='ground'&&q.owner.x===a.x&&q.owner.z===a.z)?.quantity).toBe(500);
 const partial=exact(w),tick=w.tick;
 until(w,()=>p.cooking===null);stepWorld(partial,w.tick-tick);expect(serializeWorld(partial)).toBe(serializeWorld(w));
 expect(w.piles.filter(q=>q.item===metal).reduce((n,q)=>n+q.quantity,0)).toBe(1000);expect(w.piles.some(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id)).toBe(false);
 exact(w);
});
