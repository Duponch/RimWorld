import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {billWanted,countedProducts,validBillSettings} from '../src/sim/cooking-bills.ts';
import {queryCookingBillStatus} from '../src/sim/cooking-diagnostics.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {stationAccepts,validCarnivoreFineMealIngredients} from '../src/sim/production-recipes.ts';
import {ROT_DAYS} from '../src/sim/food-preservation.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';
import type {ItemId} from '../src/sim/items.ts';
import {TICKS_PER_DAY,type World} from '../src/sim/types.ts';

const ITEM='carnivore-fine-meal' as const;
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
  expect(condition(),`Carnivore fine meal transition absent after ${max} ticks`).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}

test('carnivore fine meal requires exactly fifteen raw meat units and a stove',()=>{
  expect(validCarnivoreFineMealIngredients([{item:'hare-meat',quantity:15}])).toBe(true);
  expect(validCarnivoreFineMealIngredients([{item:'hare-meat',quantity:7},{item:'deer-meat',quantity:8}])).toBe(true);
  for(const ingredients of [[{item:'hare-meat',quantity:14}],[{item:'milk',quantity:15}],[{item:'rice',quantity:15}],[{item:'hare-meat',quantity:14},{item:'milk',quantity:1}]])
    expect(validCarnivoreFineMealIngredients(ingredients as never)).toBe(false);
  expect(stationAccepts({kind:'fueled-stove'},ITEM)).toBe(true);
  expect(stationAccepts({kind:'electric-stove'},ITEM)).toBe(true);
  expect(stationAccepts({kind:'campfire'},ITEM)).toBe(false);
  const {world,pawn,stove,bill}=camp([['hare-meat',15,6]]);
  expect(validBillSettings({...bill,filters:{...bill.filters,[ITEM]:true}},ITEM,156)).toBe(false);
  pawn.skills.cooking!.level=5;
  expect(productionWorkerQualified(pawn,ITEM)).toBe(false);
  expect(queryCookingBillStatus(world,stove,bill).code).toBe('skill-required');
  stepWorld(world,80);expect(count(world,ITEM)).toBe(0);
  pawn.skills.cooking!.level=6;
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(count(world,'hare-meat')).toBe(15);
  expect(validCarnivoreFineMealIngredients(pawn.cooking!.ingredients)).toBe(true);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(resumed,30);expect(resumed).toEqual(world);
  until(world,()=>count(world,ITEM)===1&&!pawn.cooking);
  expect(count(world,'hare-meat')).toBe(0);
  expect(bill.target).toBe(0);
});

test('multiple meat species complete one quota; milk, plants, and fourteen meats do not',()=>{
  const mixed=camp([['hare-meat',7,6],['deer-meat',8,7]]);
  until(mixed.world,()=>count(mixed.world,ITEM)===1&&!mixed.pawn.cooking);
  expect(count(mixed.world,'hare-meat')+count(mixed.world,'deer-meat')).toBe(0);
  for(const foods of [[['hare-meat',14,6],['milk',1,7]],[['milk',15,6]],[['rice',15,6]]] as const){
    const blocked=camp(foods);
    expect(queryCookingBillStatus(blocked.world,blocked.stove,blocked.bill).code).toBe('missing-ingredients');
    stepWorld(blocked.world,100);
    expect(count(blocked.world,ITEM)).toBe(0);
    expect(validateWorld(blocked.world)).toEqual([]);
  }
});

test('excluded meat cancels work without loss, and until-X counts only the carnivore product',()=>{
  const {world,pawn,bill}=camp([['hare-meat',15,6]]);
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  bill.filters['hare-meat']=false;stepWorld(world);
  expect(pawn.cooking).toBeNull();
  expect(count(world,'hare-meat')).toBe(15);
  expect(count(world,ITEM)).toBe(0);
  expect(validateWorld(world)).toEqual([]);
  bill.mode='until';bill.target=1;
  const zone={id:world.nextId++,x:22,z:20,filters:{wood:false,food:true},items:{[ITEM]:true},priority:2,capacity:75};
  world.stockpiles.push(zone);
  addGroundMaterial(world,'food',1,{x:21,z:20},'fine-meal');
  expect(countedProducts(world,bill)).toBe(0);
  expect(billWanted(world,bill)).toBe(true);
  addGroundMaterial(world,'food',1,{x:22,z:20},ITEM);
  expect(countedProducts(world,bill)).toBe(1);
  expect(billWanted(world,bill)).toBe(false);
  zone.items[ITEM]=false;
  expect(countedProducts(world,bill)).toBe(0);
});

test('two cooks cannot reserve the same fifteen meat units at separate stoves',()=>{
  const {world,pawn}=camp([['hare-meat',15,12]]);
  const second=structuredClone(pawn);
  second.id=world.nextId++;second.name='Deuxième cuisinier';second.x=18;second.z=4;
  world.pawns.push(second);
  const otherStove=fixtureFoodStation(world,'fueled-stove',17,10);
  otherStove.fuel!.ticks=6000;
  expect(applyCommand(world,{type:'bill-add',structureId:otherStove.id,recipe:ITEM}).ok).toBe(true);
  otherStove.bills![0]!.destination='drop';
  expect(validateWorld(world)).toEqual([]);
  for(let tick=0;tick<1200&&count(world,ITEM)===0;tick++){
    stepWorld(world);
    expect(world.pawns.filter(p=>p.cooking?.recipe===ITEM).length).toBeLessThanOrEqual(1);
  }
  expect(count(world,ITEM)).toBe(1);
  expect(count(world,'hare-meat')).toBe(0);
  expect(validateWorld(world)).toEqual([]);
});

test('meat expiring during work cancels the recipe without a product or double loss',()=>{
  const {world,pawn}=camp([['hare-meat',15,6]]);
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  for(const pile of world.piles.filter(p=>p.item==='hare-meat'))pile.rot={progress:ROT_DAYS['hare-meat']*TICKS_PER_DAY-1,atTick:world.tick};
  const spoiledBefore=world.spoiled['hare-meat']??0;
  for(let tick=0;tick<10&&count(world,'hare-meat')>0;tick++)stepWorld(world);
  expect(count(world,'hare-meat')).toBe(0);
  expect(world.spoiled['hare-meat']).toBe(spoiledBefore+15);
  expect(count(world,ITEM)).toBe(0);
  expect(pawn.cooking).toBeNull();
  expect(validateWorld(world)).toEqual([]);
});

test.each(['gather','held','work','output'] as const)('save and cancel during %s conserves all meat or one finished meal',phase=>{
  const {world,pawn,stove,bill}=camp([['hare-meat',15,6]]);
  until(world,()=>phase==='gather'?pawn.cooking?.phase==='gather'&&pawn.cooking.ingredients.every(i=>i.stage==='source')
    :phase==='held'?pawn.cooking?.ingredients.some(i=>i.stage==='held')===true
    :phase==='work'?pawn.cooking?.phase==='work'&&pawn.cooking.progress>0
    :pawn.cooking?.phase==='output');
  const resumed=deserializeWorld(serializeWorld(world));
  expect(resumed).toEqual(world);
  expect(applyCommand(resumed,{type:'bill-remove',structureId:stove.id,billId:bill.id}).ok).toBe(true);
  expect(resumed.pawns[0]!.cooking).toBeNull();
  expect(count(resumed,'hare-meat')+15*count(resumed,ITEM)).toBe(15);
  expect(count(resumed,ITEM)).toBe(phase==='output'?1:0);
  expect(validateWorld(resumed)).toEqual([]);
});
