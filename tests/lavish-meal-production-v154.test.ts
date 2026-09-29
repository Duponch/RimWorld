import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {stationAccepts,validLavishMealIngredients} from '../src/sim/production-recipes.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';
import type {World} from '../src/sim/types.ts';

const quantity=(w:World,item:string)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
function lavishCamp() {
  const w=foodWorkstationCamp(),pawn=w.pawns[0]!,stove=fixtureFoodStation(w,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(w,'food',10,{x:6,z:6},'milk');
  addGroundMaterial(w,'food',10,{x:7,z:6},'rice');refreshStock(w);
  expect(applyCommand(w,{type:'bill-add',structureId:stove.id,recipe:'lavish-meal'}).ok).toBe(true);
  stove.bills![0]!.destination='drop';
  return {w,pawn,stove};
}
function until(w:World,done:()=>boolean,max=1800) {
  for(let i=0;i<max&&!done();i++)stepWorld(w);
  expect(done(),`No lavish meal after ${max} ticks`).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}

test('lavish meal enforces ten protein plus ten vegetables, Cooking 8, stove and physical production',()=>{
  expect(validLavishMealIngredients([{item:'milk',quantity:6},{item:'hare-meat',quantity:4},{item:'rice',quantity:10}])).toBe(true);
  expect(validLavishMealIngredients([{item:'rice',quantity:20}])).toBe(false);
  const {w,pawn,stove}=lavishCamp();
  expect(stationAccepts(stove,'lavish-meal')).toBe(true);
  expect(stationAccepts({kind:'electric-stove'},'lavish-meal')).toBe(true);
  expect(stationAccepts({kind:'campfire'},'lavish-meal')).toBe(false);
  pawn.skills.cooking!.level=7;expect(productionWorkerQualified(pawn,'lavish-meal')).toBe(false);
  stepWorld(w,100);expect(quantity(w,'lavish-meal')).toBe(0);
  pawn.skills.cooking!.level=8;expect(productionWorkerQualified(pawn,'lavish-meal')).toBe(true);
  until(w,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(validLavishMealIngredients(pawn.cooking!.ingredients)).toBe(true);
  const resumed=deserializeWorld(serializeWorld(w));
  stepWorld(w,30);stepWorld(resumed,30);expect(resumed).toEqual(w);
  until(w,()=>quantity(w,'lavish-meal')===1&&!pawn.cooking);
  expect(quantity(w,'milk')).toBe(0);expect(quantity(w,'rice')).toBe(0);
  expect(stove.bills![0]!.target).toBe(0);
});

test('lavish meal accepts milk and meat across piles, but twenty vegetables cannot substitute',()=>{
  const mixed=lavishCamp();
  mixed.w.piles.find(p=>p.item==='milk')!.quantity=6;
  addGroundMaterial(mixed.w,'food',4,{x:8,z:6},'hare-meat');refreshStock(mixed.w);
  until(mixed.w,()=>quantity(mixed.w,'lavish-meal')===1);
  expect(quantity(mixed.w,'milk')).toBe(0);expect(quantity(mixed.w,'hare-meat')).toBe(0);
  const veg=foodWorkstationCamp(),pawn=veg.pawns[0]!,stove=fixtureFoodStation(veg,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(veg,'food',20,{x:6,z:6},'rice');refreshStock(veg);
  stove.bills!.push(newCookingBill(veg.nextId++,'lavish-meal'));
  stepWorld(veg,250);
  expect(quantity(veg,'lavish-meal')).toBe(0);
  expect(quantity(veg,'rice')).toBe(20);
  expect(validateWorld(veg)).toEqual([]);
});
