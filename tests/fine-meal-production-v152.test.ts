import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { newCookingBill,validBillSettings } from '../src/sim/cooking-bills.ts';
import { fineMealIngredientGroup,stationAccepts,validFineMealIngredients } from '../src/sim/production-recipes.ts';
import { productionWorkerQualified } from '../src/sim/machining.ts';
import { foodWorkstationCamp,fixtureFoodStation } from './scenarios/food-workstations.ts';
import type { World } from '../src/sim/types.ts';

const quantity=(w:World,item:string)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
function fineCamp(protein:'hare-meat'|'milk'='hare-meat',vegetables=5) {
  const w=foodWorkstationCamp(),pawn=w.pawns[0]!,stove=fixtureFoodStation(w,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(w,'food',5,{x:6,z:6},protein);
  addGroundMaterial(w,'food',vegetables,{x:7,z:6},'rice');refreshStock(w);
  expect(applyCommand(w,{type:'bill-add',structureId:stove.id,recipe:'fine-meal'})).toMatchObject({ok:true});
  stove.bills![0]!.destination='drop';
  return {w,pawn,stove};
}
function until(w:World,done:()=>boolean,max=800) {
  for(let i=0;i<max&&!done();i++)stepWorld(w);
  expect(done(),`No fine meal after ${max} ticks`).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}

test('fine meal enforces five protein and five vegetable units and Cooking 6 at stoves',()=>{
  expect(fineMealIngredientGroup('milk')).toBe('protein');
  expect(fineMealIngredientGroup('hare-meat')).toBe('protein');
  expect(fineMealIngredientGroup('rice')).toBe('vegetable');
  expect(validFineMealIngredients([{item:'milk',quantity:3},{item:'hare-meat',quantity:2},{item:'rice',quantity:5}])).toBe(true);
  expect(validFineMealIngredients([{item:'rice',quantity:10}])).toBe(false);
  const {w,pawn,stove}=fineCamp();
  expect(stationAccepts(stove,'fine-meal')).toBe(true);
  expect(stationAccepts({kind:'campfire'},'fine-meal')).toBe(false);
  expect(validBillSettings({...stove.bills![0],filters:{...stove.bills![0]!.filters,'fine-meal':true}},'fine-meal',152)).toBe(false);
  pawn.skills.cooking!.level=5;expect(productionWorkerQualified(pawn,'fine-meal')).toBe(false);
  stepWorld(w,100);expect(quantity(w,'fine-meal')).toBe(0);
  pawn.skills.cooking!.level=6;expect(productionWorkerQualified(pawn,'fine-meal')).toBe(true);
  until(w,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(validFineMealIngredients(pawn.cooking!.ingredients)).toBe(true);
  const resumed=deserializeWorld(serializeWorld(w));
  stepWorld(w,30);stepWorld(resumed,30);expect(resumed).toEqual(w);
  until(w,()=>quantity(w,'fine-meal')===1&&!pawn.cooking);
  expect(quantity(w,'rice')).toBe(0);expect(quantity(w,'hare-meat')).toBe(0);
  expect(stove.bills![0]!.target).toBe(0);
});

test('fine meal can use actual milk, but cannot substitute ten vegetables for protein',()=>{
  const milk=fineCamp('milk');
  milk.w.piles.find(p=>p.item==='milk')!.quantity=3;
  addGroundMaterial(milk.w,'food',2,{x:8,z:6},'hare-meat');refreshStock(milk.w);
  until(milk.w,()=>quantity(milk.w,'fine-meal')===1);
  expect(quantity(milk.w,'milk')).toBe(0);
  expect(quantity(milk.w,'hare-meat')).toBe(0);
  const veg=foodWorkstationCamp(),pawn=veg.pawns[0]!,stove=fixtureFoodStation(veg,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(veg,'food',10,{x:6,z:6},'rice');refreshStock(veg);
  const bill=newCookingBill(veg.nextId++,'fine-meal');stove.bills!.push(bill);
  stepWorld(veg,200);
  expect(quantity(veg,'fine-meal')).toBe(0);
  expect(quantity(veg,'rice')).toBe(10);
  expect(validateWorld(veg)).toEqual([]);
});
