import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {billWanted,countedProducts} from '../src/sim/cooking-bills.ts';
import {queryCookingBillStatus} from '../src/sim/cooking-diagnostics.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {stationAccepts,validVegetarianLavishMealIngredients} from '../src/sim/production-recipes.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';
import type {ItemId} from '../src/sim/items.ts';
import type {World} from '../src/sim/types.ts';

const ITEM='vegetarian-lavish-meal' as const;
const count=(world:World,item:ItemId)=>world.piles.reduce((sum,pile)=>sum+(pile.item===item?pile.quantity:0),0);
function camp(foods:readonly (readonly [item:ItemId,quantity:number,x:number])[]) {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  for(const [item,quantity,x] of foods)addGroundMaterial(world,'food',quantity,{x,z:6},item);
  refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:ITEM}).ok).toBe(true);
  stove.bills![0]!.destination='drop';
  return {world,pawn,stove,bill:stove.bills![0]!};
}
function until(world:World,condition:()=>boolean,max=1600) {
  for(let tick=0;tick<max&&!condition();tick++)stepWorld(world);
  expect(condition(),`Vegetarian lavish meal transition absent after ${max} ticks`).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}

test('one 25-unit vegetarian quota, two stoves and Cooking 8 are required',()=>{
  expect(validVegetarianLavishMealIngredients([{item:'rice',quantity:25}])).toBe(true);
  expect(validVegetarianLavishMealIngredients([{item:'milk',quantity:25}])).toBe(true);
  expect(validVegetarianLavishMealIngredients([{item:'rice',quantity:12},{item:'milk',quantity:13}])).toBe(true);
  for(const ingredients of [[{item:'rice',quantity:24}],[{item:'hare-meat',quantity:25}],[{item:'rice',quantity:24},{item:'hare-meat',quantity:1}]])
    expect(validVegetarianLavishMealIngredients(ingredients as never)).toBe(false);
  expect(stationAccepts({kind:'fueled-stove'},ITEM)).toBe(true);
  expect(stationAccepts({kind:'electric-stove'},ITEM)).toBe(true);
  expect(stationAccepts({kind:'campfire'},ITEM)).toBe(false);
  const {world,pawn,stove,bill}=camp([['rice',25,6]]);
  pawn.skills.cooking!.level=7;
  expect(productionWorkerQualified(pawn,ITEM)).toBe(false);
  expect(queryCookingBillStatus(world,stove,bill).code).toBe('skill-required');
  stepWorld(world,80);expect(count(world,ITEM)).toBe(0);
  pawn.skills.cooking!.level=8;
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(count(world,'rice')).toBe(25);
  expect(validVegetarianLavishMealIngredients(pawn.cooking!.ingredients)).toBe(true);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(resumed,30);expect(resumed).toEqual(world);
  until(world,()=>count(world,ITEM)===1&&!pawn.cooking);
  expect(count(world,'rice')).toBe(0);
  expect(bill.target).toBe(0);
});

test('plants and milk from separate piles make one meal; meat cannot complete a short quota',()=>{
  const mixed=camp([['rice',12,6],['milk',13,7]]);
  until(mixed.world,()=>count(mixed.world,ITEM)===1&&!mixed.pawn.cooking);
  expect(count(mixed.world,'rice')+count(mixed.world,'milk')).toBe(0);
  for(const foods of [[['rice',24,6],['hare-meat',1,7]],[['hare-meat',25,6]],[['milk',24,6]]] as const){
    const blocked=camp(foods);
    expect(queryCookingBillStatus(blocked.world,blocked.stove,blocked.bill).code).toBe('missing-ingredients');
    stepWorld(blocked.world,100);
    expect(count(blocked.world,ITEM)).toBe(0);
    expect(validateWorld(blocked.world)).toEqual([]);
  }
});

test('filter cancellation preserves 25 ingredients, and until-X counts this product alone',()=>{
  const {world,pawn,bill}=camp([['milk',25,6]]);
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  bill.filters.milk=false;stepWorld(world);
  expect(pawn.cooking).toBeNull();
  expect(count(world,'milk')).toBe(25);
  expect(count(world,ITEM)).toBe(0);
  expect(validateWorld(world)).toEqual([]);
  bill.mode='until';bill.target=1;
  const zone={id:world.nextId++,x:22,z:20,filters:{wood:false,food:true},items:{[ITEM]:true},priority:2,capacity:75};
  world.stockpiles.push(zone);
  addGroundMaterial(world,'food',1,{x:21,z:20},'lavish-meal');
  expect(countedProducts(world,bill)).toBe(0);
  expect(billWanted(world,bill)).toBe(true);
  addGroundMaterial(world,'food',1,{x:22,z:20},ITEM);
  expect(countedProducts(world,bill)).toBe(1);
  zone.items[ITEM]=false;
  expect(countedProducts(world,bill)).toBe(0);
});

test('two cooks cannot reserve the same 25 raw units at separate stoves',()=>{
  const {world,pawn}=camp([['rice',25,12]]);
  const second=structuredClone(pawn);
  second.id=world.nextId++;second.name='Deuxième cuisinier';second.x=18;second.z=4;
  world.pawns.push(second);
  const otherStove=fixtureFoodStation(world,'fueled-stove',17,10);
  otherStove.fuel!.ticks=6000;
  expect(applyCommand(world,{type:'bill-add',structureId:otherStove.id,recipe:ITEM}).ok).toBe(true);
  otherStove.bills![0]!.destination='drop';
  expect(validateWorld(world)).toEqual([]);
  for(let tick=0;tick<1400&&count(world,ITEM)===0;tick++){
    stepWorld(world);
    expect(world.pawns.filter(p=>p.cooking?.recipe===ITEM).length).toBeLessThanOrEqual(1);
  }
  expect(count(world,ITEM)).toBe(1);
  expect(count(world,'rice')).toBe(0);
  expect(validateWorld(world)).toEqual([]);
});

test.each(['gather','held','work','output'] as const)('save and cancel during %s conserves ingredients or one finished meal',phase=>{
  const {world,pawn,stove,bill}=camp([['rice',25,6]]);
  until(world,()=>phase==='gather'?pawn.cooking?.phase==='gather'&&pawn.cooking.ingredients.every(i=>i.stage==='source')
    :phase==='held'?pawn.cooking?.ingredients.some(i=>i.stage==='held')===true
    :phase==='work'?pawn.cooking?.phase==='work'&&pawn.cooking.progress>0
    :pawn.cooking?.phase==='output');
  const resumed=deserializeWorld(serializeWorld(world));
  expect(resumed).toEqual(world);
  expect(applyCommand(resumed,{type:'bill-remove',structureId:stove.id,billId:bill.id}).ok).toBe(true);
  expect(resumed.pawns[0]!.cooking).toBeNull();
  expect(count(resumed,'rice')+25*count(resumed,ITEM)).toBe(25);
  expect(count(resumed,ITEM)).toBe(phase==='output'?1:0);
  expect(validateWorld(resumed)).toEqual([]);
});
