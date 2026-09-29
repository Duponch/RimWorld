import {expect,test} from 'vitest';
import {applyCommand,stepWorld,validateWorld} from '../src/sim/index.ts';
import {billWanted,countedProducts} from '../src/sim/cooking-bills.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {PRODUCTION_RECIPES,stationAccepts,validVegetarianFineMealBulkIngredients} from '../src/sim/production-recipes.ts';
import type {World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';

const RECIPE='cook-vegetarian-fine-meal-bulk' as const;
const count=(world:World,item:string)=>world.piles.reduce((n,pile)=>n+(pile.item===item?pile.quantity:0),0);
function until(world:World,done:()=>boolean,max=5000):void {
  for(let i=0;i<max&&!done();i++)stepWorld(world);
  expect(done(),`Expected vegetarian fine bulk transition by tick ${world.tick}`).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}
function scene():World {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=12000;
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  stove.bills![0]!.destination='drop';
  return world;
}

test('vegetarian fine x4 enforces one 60-unit plants-or-milk quota and Cuisine 6, then one portion is eaten',()=>{
  expect(PRODUCTION_RECIPES[RECIPE]).toMatchObject({units:60,workTicks:180,outputUnits:4});
  for(const kind of ['fueled-stove','electric-stove'] as const)expect(stationAccepts({kind},RECIPE)).toBe(true);
  expect(stationAccepts({kind:'campfire'},RECIPE)).toBe(false);
  expect(validVegetarianFineMealBulkIngredients([{item:'milk',quantity:20},{item:'rice',quantity:40}])).toBe(true);
  expect(validVegetarianFineMealBulkIngredients([{item:'milk',quantity:59}])).toBe(false);
  expect(validVegetarianFineMealBulkIngredients([{item:'hare-meat',quantity:60}])).toBe(false);
  const world=scene(),pawn=world.pawns[0]!,bill=world.structures[0]!.bills![0]!;
  addGroundMaterial(world,'food',20,{x:6,z:6},'milk');
  addGroundMaterial(world,'food',39,{x:7,z:6},'rice');refreshStock(world);
  pawn.skills.cooking!.level=5;
  expect(productionWorkerQualified(pawn,RECIPE)).toBe(false);
  stepWorld(world,90);expect(pawn.cooking).toBeNull();expect(count(world,'vegetarian-fine-meal')).toBe(0);
  pawn.skills.cooking!.level=6;
  expect(productionWorkerQualified(pawn,RECIPE)).toBe(true);
  stepWorld(world,90);expect(pawn.cooking).toBeNull();
  addGroundMaterial(world,'food',1,{x:8,z:6},'corn');refreshStock(world);
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(pawn.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(60);
  expect(pawn.cooking!.ingredients.length).toBeGreaterThanOrEqual(6); // The colon carried no more than ten at a time.
  expect(validVegetarianFineMealBulkIngredients(pawn.cooking!.ingredients)).toBe(true);
  until(world,()=>count(world,'vegetarian-fine-meal')===4&&pawn.cooking===null);
  expect(count(world,'milk')+count(world,'rice')+count(world,'corn')).toBe(0);
  expect(bill.target).toBe(0); // One operation, four physical portions.
  pawn.hunger=20;pawn.needCooldown=0;pawn.priorities.cook=0;
  until(world,()=>count(world,'vegetarian-fine-meal')===3&&pawn.memories.some(memory=>memory.kind==='ate-fine-meal'));
  expect(pawn.hunger).toBeGreaterThan(80);
});

test('until-X counts the existing vegetarian fine product and stops after a complete batch',()=>{
  const world=scene(),pawn=world.pawns[0]!,bill=world.structures[0]!.bills![0]!;
  const zone={id:world.nextId++,x:14,z:10,filters:{wood:false,food:true},items:{'vegetarian-fine-meal':true},priority:2,capacity:10};
  world.stockpiles.push(zone);
  addGroundMaterial(world,'food',1,{x:zone.x,z:zone.z},'vegetarian-fine-meal');
  addGroundMaterial(world,'food',60,{x:6,z:6},'rice');refreshStock(world);
  bill.mode='until';bill.target=3;bill.destination='stockpile';
  expect(countedProducts(world,bill)).toBe(1);
  until(world,()=>pawn.cooking===null&&count(world,'vegetarian-fine-meal')===5);
  expect(countedProducts(world,bill)).toBe(5);
  expect(billWanted(world,bill)).toBe(false);
  stepWorld(world,60);expect(count(world,'vegetarian-fine-meal')).toBe(5);
});
