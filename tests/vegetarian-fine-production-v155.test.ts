import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {billWanted,countedProducts,newCookingBill,validBillSettings} from '../src/sim/cooking-bills.ts';
import {queryCookingBillStatus} from '../src/sim/cooking-diagnostics.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {stationAccepts,validFineMealIngredients,validLavishMealIngredients,validVegetarianFineMealIngredients} from '../src/sim/production-recipes.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';
import type {World} from '../src/sim/types.ts';

const count=(world:World,item:string)=>world.piles.reduce((sum,pile)=>sum+(pile.item===item?pile.quantity:0),0);
function camp(foods:readonly [item:'rice'|'berries'|'milk'|'potato'|'corn'|'agave-fruit'|'hare-meat',quantity:number,x:number][]) {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  for(const [item,quantity,x] of foods)addGroundMaterial(world,'food',quantity,{x,z:6},item);
  refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:'vegetarian-fine-meal'}).ok).toBe(true);
  stove.bills![0]!.destination='drop';
  return {world,pawn,stove,bill:stove.bills![0]!};
}
function until(world:World,condition:()=>boolean,max=1600) {
  for(let tick=0;tick<max&&!condition();tick++)stepWorld(world);
  expect(condition(),`Vegetarian fine meal transition absent after ${max} ticks`).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}

test('vegetarian fine recipe has one plant-or-milk quota and a distinct stove product',()=>{
  expect(validVegetarianFineMealIngredients([{item:'rice',quantity:15}])).toBe(true);
  expect(validVegetarianFineMealIngredients([{item:'milk',quantity:15}])).toBe(true);
  expect(validVegetarianFineMealIngredients([{item:'rice',quantity:4},{item:'berries',quantity:3},{item:'milk',quantity:8}])).toBe(true);
  expect(validVegetarianFineMealIngredients([{item:'rice',quantity:14}])).toBe(false);
  expect(validVegetarianFineMealIngredients([{item:'hare-meat',quantity:15}])).toBe(false);
  expect(validVegetarianFineMealIngredients([{item:'rice',quantity:14},{item:'hare-meat',quantity:1}])).toBe(false);
  expect(validFineMealIngredients([{item:'rice',quantity:15}])).toBe(false);
  expect(validLavishMealIngredients([{item:'rice',quantity:15}])).toBe(false);
  expect(stationAccepts({kind:'fueled-stove'},'vegetarian-fine-meal')).toBe(true);
  expect(stationAccepts({kind:'electric-stove'},'vegetarian-fine-meal')).toBe(true);
  expect(stationAccepts({kind:'campfire'},'vegetarian-fine-meal')).toBe(false);
  const {world,pawn,bill}=camp([['rice',15,6]]);
  expect(validBillSettings({...bill,filters:{...bill.filters,'vegetarian-fine-meal':true}},bill.recipe,155)).toBe(false);
  pawn.skills.cooking!.level=5;
  expect(productionWorkerQualified(pawn,bill.recipe)).toBe(false);
  expect(queryCookingBillStatus(world,world.structures[0]!,bill).code).toBe('skill-required');
  stepWorld(world,100);expect(count(world,'vegetarian-fine-meal')).toBe(0);
  pawn.skills.cooking!.level=6;
  expect(productionWorkerQualified(pawn,bill.recipe)).toBe(true);
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(validVegetarianFineMealIngredients(pawn.cooking!.ingredients)).toBe(true);
  expect(count(world,'rice')).toBe(15); // Physical ingredients remain until work completes.
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(resumed,30);expect(resumed).toEqual(world);
  until(world,()=>count(world,'vegetarian-fine-meal')===1&&!pawn.cooking);
  expect(count(world,'rice')).toBe(0);
  expect(bill.target).toBe(0);
});

test('multiple plant and milk piles contribute to one quota; meat cannot substitute',()=>{
  const mixed=camp([['milk',5,6],['rice',4,7],['potato',6,8]]);
  until(mixed.world,()=>count(mixed.world,'vegetarian-fine-meal')===1&&!mixed.pawn.cooking);
  for(const item of ['milk','rice','potato'])expect(count(mixed.world,item)).toBe(0);
  const milk=camp([['milk',15,6]]);
  until(milk.world,()=>count(milk.world,'vegetarian-fine-meal')===1&&!milk.pawn.cooking);
  expect(count(milk.world,'milk')).toBe(0);
  const short=camp([['rice',14,6],['hare-meat',1,7]]);
  expect(queryCookingBillStatus(short.world,short.stove,short.bill)).toMatchObject({code:'missing-ingredients'});
  stepWorld(short.world,180);
  expect(count(short.world,'vegetarian-fine-meal')).toBe(0);
  expect(count(short.world,'rice')).toBe(14);
  expect(count(short.world,'hare-meat')).toBe(1);
  expect(validateWorld(short.world)).toEqual([]);
});

test('excluding an ingredient during work cancels without consuming or duplicating it',()=>{
  const {world,pawn,bill}=camp([['rice',15,6]]);
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  const ids=world.piles.filter(p=>p.item==='rice').map(p=>p.id).sort((a,b)=>a-b);
  bill.filters.rice=false;
  stepWorld(world);
  expect(pawn.cooking).toBeNull();
  expect(count(world,'rice')).toBe(15);
  expect(world.piles.filter(p=>p.item==='rice').map(p=>p.id).sort((a,b)=>a-b)).toEqual(ids);
  expect(count(world,'vegetarian-fine-meal')).toBe(0);
  expect(validateWorld(world)).toEqual([]);
});

test('filters, radius and until-X count only admitted vegetarian product',()=>{
  const {world,stove,bill}=camp([['rice',14,6],['milk',1,7]]);
  bill.filters.milk=false;
  expect(queryCookingBillStatus(world,stove,bill)).toMatchObject({code:'missing-ingredients'});
  stepWorld(world,80);expect(count(world,'vegetarian-fine-meal')).toBe(0);
  bill.filters.milk=true;bill.radius=3;
  expect(queryCookingBillStatus(world,stove,bill)).toMatchObject({code:'missing-ingredients'});
  bill.radius=999;
  bill.mode='until';bill.target=1;
  addGroundMaterial(world,'food',1,{x:20,z:20},'fine-meal');
  addGroundMaterial(world,'food',1,{x:21,z:20},'lavish-meal');
  expect(countedProducts(world,bill)).toBe(0);
  expect(billWanted(world,bill)).toBe(true);
  until(world,()=>count(world,'vegetarian-fine-meal')===1&&!world.pawns[0]!.cooking);
  expect(countedProducts(world,bill)).toBe(0); // Drop destination is outside a stockpile.
  const zone={id:world.nextId++,x:22,z:20,filters:{wood:false,food:true},items:{'vegetarian-fine-meal':true},priority:2,capacity:75};
  world.stockpiles.push(zone);
  addGroundMaterial(world,'food',1,{x:22,z:20},'vegetarian-fine-meal');
  expect(countedProducts(world,bill)).toBe(1);
  expect(billWanted(world,bill)).toBe(false);
  zone.items['vegetarian-fine-meal']=false;
  expect(countedProducts(world,bill)).toBe(0);
  expect(billWanted(world,bill)).toBe(true);
});
