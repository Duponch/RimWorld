import {expect,test} from 'vitest';
import {applyCommand,stepWorld,validateWorld} from '../src/sim/index.ts';
import {billWanted,countedProducts} from '../src/sim/cooking-bills.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {PRODUCTION_RECIPES,stationAccepts,validCarnivoreFineMealBulkIngredients} from '../src/sim/production-recipes.ts';
import type {World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';

const RECIPE='cook-carnivore-fine-meal-bulk' as const;
const count=(world:World,item:string)=>world.piles.reduce((n,pile)=>n+(pile.item===item?pile.quantity:0),0);
function until(world:World,done:()=>boolean,max=5000):void {
  for(let i=0;i<max&&!done();i++)stepWorld(world);
  expect(done(),`Expected carnivore fine bulk transition by tick ${world.tick}`).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}
function scene():World {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=12000;
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  stove.bills![0]!.destination='drop';
  return world;
}

test('carnivore fine x4 requires 60 fresh meats and Cuisine 6, then one of four physical meals is eaten',()=>{
  expect(PRODUCTION_RECIPES[RECIPE]).toMatchObject({units:60,workTicks:180,outputUnits:4});
  for(const kind of ['fueled-stove','electric-stove'] as const)expect(stationAccepts({kind},RECIPE)).toBe(true);
  expect(stationAccepts({kind:'campfire'},RECIPE)).toBe(false);
  expect(validCarnivoreFineMealBulkIngredients([{item:'hare-meat',quantity:20},{item:'deer-meat',quantity:40}])).toBe(true);
  expect(validCarnivoreFineMealBulkIngredients([{item:'hare-meat',quantity:59}])).toBe(false);
  expect(validCarnivoreFineMealBulkIngredients([{item:'hare-meat',quantity:59},{item:'milk',quantity:1}])).toBe(false);
  expect(validCarnivoreFineMealBulkIngredients([{item:'rice',quantity:60}])).toBe(false);
  const world=scene(),pawn=world.pawns[0]!,bill=world.structures[0]!.bills![0]!;
  addGroundMaterial(world,'food',20,{x:6,z:6},'hare-meat');
  addGroundMaterial(world,'food',39,{x:7,z:6},'deer-meat');refreshStock(world);
  pawn.skills.cooking!.level=5;
  expect(productionWorkerQualified(pawn,RECIPE)).toBe(false);
  stepWorld(world,90);expect(pawn.cooking).toBeNull();expect(count(world,'carnivore-fine-meal')).toBe(0);
  pawn.skills.cooking!.level=6;
  stepWorld(world,90);expect(pawn.cooking).toBeNull();
  addGroundMaterial(world,'food',1,{x:8,z:6},'gazelle-meat');refreshStock(world);
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(pawn.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(60);
  expect(pawn.cooking!.ingredients.length).toBeGreaterThanOrEqual(6); // Physical carry capacity is ten.
  expect(validCarnivoreFineMealBulkIngredients(pawn.cooking!.ingredients)).toBe(true);
  until(world,()=>count(world,'carnivore-fine-meal')===4&&pawn.cooking===null);
  expect(count(world,'hare-meat')+count(world,'deer-meat')+count(world,'gazelle-meat')).toBe(0);
  expect(bill.target).toBe(0); // One operation makes four portions.
  pawn.hunger=20;pawn.needCooldown=0;pawn.priorities.cook=0;
  until(world,()=>count(world,'carnivore-fine-meal')===3&&pawn.memories.some(memory=>memory.kind==='ate-fine-meal'));
  expect(pawn.hunger).toBeGreaterThan(80);
});

test('until-X counts existing carnivore fine portions and stops after a complete batch',()=>{
  const world=scene(),pawn=world.pawns[0]!,bill=world.structures[0]!.bills![0]!;
  const zone={id:world.nextId++,x:14,z:10,filters:{wood:false,food:true},items:{'carnivore-fine-meal':true},priority:2,capacity:10};
  world.stockpiles.push(zone);
  addGroundMaterial(world,'food',1,{x:zone.x,z:zone.z},'carnivore-fine-meal');
  addGroundMaterial(world,'food',60,{x:6,z:6},'hare-meat');refreshStock(world);
  bill.mode='until';bill.target=3;bill.destination='stockpile';
  expect(countedProducts(world,bill)).toBe(1);
  until(world,()=>pawn.cooking===null&&count(world,'carnivore-fine-meal')===5);
  expect(countedProducts(world,bill)).toBe(5);
  expect(billWanted(world,bill)).toBe(false);
  stepWorld(world,60);expect(count(world,'carnivore-fine-meal')).toBe(5);
});

test('removing the bill after a partial pickup returns all 60 reserved meats without a meal',()=>{
  const world=scene(),pawn=world.pawns[0]!,station=world.structures[0]!,bill=station.bills![0]!;
  addGroundMaterial(world,'food',60,{x:6,z:6},'hare-meat');refreshStock(world);
  until(world,()=>!!pawn.cooking?.ingredients.some(i=>i.stage==='held'||i.stage==='placed'));
  expect(count(world,'hare-meat')).toBe(60); // Pickup and staging are not consumption.
  expect(count(world,'carnivore-fine-meal')).toBe(0);
  expect(applyCommand(world,{type:'bill-remove',structureId:station.id,billId:bill.id}).ok).toBe(true);
  expect(pawn.cooking).toBeNull();
  expect(count(world,'hare-meat')).toBe(60);
  expect(count(world,'carnivore-fine-meal')).toBe(0);
  expect(validateWorld(world)).toEqual([]);
});

test('two chefs and two stoves cannot reserve the same 60-meat batch twice',()=>{
  const world=scene(),first=world.pawns[0]!,second=structuredClone(first);
  second.id=world.nextId++;second.name='Second';second.x=5;second.z=4;second.cooking=null;
  world.pawns.push(second);
  const stove=fixtureFoodStation(world,'fueled-stove',16,10);stove.fuel!.ticks=12000;
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  addGroundMaterial(world,'food',60,{x:7,z:6},'hare-meat');refreshStock(world);
  until(world,()=>world.pawns.some(p=>p.cooking?.recipe===RECIPE));
  expect(world.pawns.filter(p=>p.cooking?.recipe===RECIPE)).toHaveLength(1);
  for(let i=0;i<40;i++)stepWorld(world);
  expect(world.pawns.filter(p=>p.cooking?.recipe===RECIPE)).toHaveLength(1);
  expect(count(world,'hare-meat')).toBe(60);
  expect(count(world,'carnivore-fine-meal')).toBe(0);
  expect(validateWorld(world)).toEqual([]);
});
