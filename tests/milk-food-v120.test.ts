import { expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, createWorld, refreshStock, serializeWorld, deserializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { ITEM_DEFINITIONS, mealQuantity, rawFoodThought } from '../src/sim/items';
import { foodScore } from '../src/sim/food-selection';
import { ROT_DAYS } from '../src/sim/food-preservation';
import { rawFoodPoisonChance, ingestionFoodPoison } from '../src/sim/food-poisoning';
import { newCookingBill, validBillSettings } from '../src/sim/cooking-bills';
import { PRODUCTION_RECIPES } from '../src/sim/production-recipes';
import { TICKS_PER_DAY } from '../src/sim/types';

test('milk is an edible raw ingredient without a raw-meat thought', () => {
  expect(ITEM_DEFINITIONS.milk).toMatchObject({kind:'food',nutrition:5,maxIngest:75});
  expect(ROT_DAYS.milk).toBe(14);
  expect(foodScore('milk',0)).toBe(0);
  expect(rawFoodThought('milk')).toBe(false);
  expect(rawFoodPoisonChance('milk')).toBe(.02);
  expect(ingestionFoodPoison({item:'milk'},true,1,()=>.019)).toBe('dangerous-food');
  expect(ingestionFoodPoison({item:'milk'},false,1,()=>{throw new Error('Animal must not draw raw milk risk');})).toBeUndefined();
  expect(PRODUCTION_RECIPES['simple-meal'].inputs).toContain('milk');
  const bill=newCookingBill(1);
  expect(bill.filters.milk).toBe(true);
  expect(validBillSettings(bill)).toBe(true);
  delete bill.filters.milk;
  expect(validBillSettings(bill,'simple-meal',119)).toBe(true);
  expect(validBillSettings(bill,'simple-meal',120)).toBe(false);
});

test('raw milk is physically ingested and its remainder survives save/load', () => {
  const w=createWorld(42,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.stockpiles=[];w.pawns=w.pawns.slice(0,1);
  const p=w.pawns[0]!;p.x=2;p.z=2;p.hunger=20;p.rest=100;p.priorities={handle:0,clean:0,firefight:0,warden:0,basic:3,hunt:0,research:0,patient:0,bedrest:0,doctor:0,art:0,craft:0,mine:0,gather:0,build:0,haul:0,grow:0,cook:0};
  refreshStock(w);addGroundMaterial(w,'food',20,{x:3,z:2},'milk');
  expect(mealQuantity(p,w.piles[0]!,20)).toBe(16);
  for(let i=0;i<120&&w.stock.food===20;i++)stepWorld(w);
  expect(w.stock.food).toBe(4);
  expect(p.hunger).toBeGreaterThan(90);
  expect(p.memories.some(memory=>memory.kind==='ate-raw-food')).toBe(false);
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('a cook turns physical milk into one simple meal', () => {
  const w=createWorld(44,32,32);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.jobs=[];w.piles=[];w.stockpiles=[];w.structures=[];w.pawns=w.pawns.slice(0,1);
  const p=w.pawns[0]!;p.x=8;p.z=8;p.hunger=100;p.rest=100;p.priorities={handle:0,clean:0,firefight:0,warden:0,basic:3,hunt:0,research:0,patient:0,bedrest:0,doctor:0,art:0,craft:0,mine:0,gather:0,build:0,haul:0,grow:0,cook:1};
  const bill=newCookingBill(w.nextId++);bill.destination='drop';
  w.structures.push({id:w.nextId++,kind:'campfire',x:15,z:8,orientation:0,footprint:'standard',bills:[bill],fuel:{ticks:6000,burned:0,autoRefuel:false}});
  refreshStock(w);addGroundMaterial(w,'food',10,{x:9,z:8},'milk');
  expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:w.structures[0]!.id,queue:false}).ok).toBe(true);
  for(let i=0;i<400&&!w.piles.some(pile=>pile.item==='simple-meal');i++)stepWorld(w);
  expect(w.piles.some(pile=>pile.item==='milk')).toBe(false);
  expect(w.piles.filter(pile=>pile.item==='simple-meal').reduce((sum,pile)=>sum+pile.quantity,0)).toBe(1);
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('milk expires after fourteen warm days and is accounted as spoiled', () => {
  const w=createWorld(43,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.pawns=[];w.stockpiles=[];
  refreshStock(w);addGroundMaterial(w,'food',7,{x:2,z:2},'milk');
  const pile=w.piles[0]!;pile.rot={progress:14*TICKS_PER_DAY-1,atTick:w.tick};
  expect(validateWorld(w)).toEqual([]);
  stepWorld(w);
  expect(w.piles).toEqual([]);
  expect(w.spoiled.milk).toBe(7);
  expect(w.events.some(event=>event.message.includes('Lait'))).toBe(true);
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
