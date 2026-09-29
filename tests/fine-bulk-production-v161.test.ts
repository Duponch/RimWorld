import {expect,test} from 'vitest';
import {applyCommand,stepWorld,validateWorld} from '../src/sim/index.ts';
import {billWanted,countedProducts} from '../src/sim/cooking-bills.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {PRODUCTION_RECIPES,stationAccepts,validFineMealBulkIngredients} from '../src/sim/production-recipes.ts';
import type {World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';

const RECIPE='cook-fine-meal-bulk' as const;
const count=(world:World,item:string)=>world.piles.reduce((n,pile)=>n+(pile.item===item?pile.quantity:0),0);
function until(world:World,done:()=>boolean,max=3000):void {
  for(let i=0;i<max&&!done();i++)stepWorld(world);
  expect(done(),`Expected fine bulk transition by tick ${world.tick}`).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}
function scene():ReturnType<typeof foodWorkstationCamp> {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=12000;
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  stove.bills![0]!.destination='drop';
  return world;
}

test('fine x4 enforces separate 20+20 quotas and Cuisine 6, then one of four meals is actually eaten',()=>{
  expect(PRODUCTION_RECIPES[RECIPE]).toMatchObject({units:40,workTicks:180,outputUnits:4});
  for(const kind of ['fueled-stove','electric-stove'] as const)expect(stationAccepts({kind},RECIPE)).toBe(true);
  expect(stationAccepts({kind:'campfire'},RECIPE)).toBe(false);
  expect(validFineMealBulkIngredients([{item:'milk',quantity:10},{item:'hare-meat',quantity:10},{item:'rice',quantity:20}])).toBe(true);
  expect(validFineMealBulkIngredients([{item:'milk',quantity:19},{item:'rice',quantity:21}])).toBe(false);
  const world=scene(),pawn=world.pawns[0]!,bill=world.structures[0]!.bills![0]!;
  addGroundMaterial(world,'food',19,{x:6,z:6},'milk');
  addGroundMaterial(world,'food',21,{x:7,z:6},'rice');refreshStock(world);
  pawn.skills.cooking!.level=5;
  expect(productionWorkerQualified(pawn,RECIPE)).toBe(false);
  stepWorld(world,90);expect(pawn.cooking).toBeNull();expect(count(world,'fine-meal')).toBe(0);
  pawn.skills.cooking!.level=6;
  expect(productionWorkerQualified(pawn,RECIPE)).toBe(true);
  stepWorld(world,90);expect(pawn.cooking).toBeNull();
  addGroundMaterial(world,'food',1,{x:8,z:6},'hare-meat');refreshStock(world);
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(validFineMealBulkIngredients(pawn.cooking!.ingredients)).toBe(true);
  until(world,()=>count(world,'fine-meal')===4&&pawn.cooking===null);
  expect(count(world,'milk')+count(world,'hare-meat')).toBe(0);
  expect(count(world,'rice')).toBe(1);
  expect(bill.target).toBe(0);
  pawn.hunger=20;pawn.needCooldown=0;pawn.priorities.cook=0;
  until(world,()=>count(world,'fine-meal')===3&&pawn.memories.some(memory=>memory.kind==='ate-fine-meal'));
  expect(pawn.hunger).toBeGreaterThan(80);
});

test('until-X counts fine portions from both recipes and stops after a full four-portion batch',()=>{
  const world=scene(),pawn=world.pawns[0]!,bill=world.structures[0]!.bills![0]!;
  const zone={id:world.nextId++,x:14,z:10,filters:{wood:false,food:true},items:{'fine-meal':true},priority:2,capacity:10};
  world.stockpiles.push(zone);
  addGroundMaterial(world,'food',1,{x:zone.x,z:zone.z},'fine-meal');
  addGroundMaterial(world,'food',20,{x:6,z:6},'milk');
  addGroundMaterial(world,'food',20,{x:7,z:6},'rice');refreshStock(world);
  bill.mode='until';bill.target=3;bill.destination='stockpile';
  expect(countedProducts(world,bill)).toBe(1);
  until(world,()=>pawn.cooking===null&&count(world,'fine-meal')===5);
  expect(countedProducts(world,bill)).toBe(5);
  expect(billWanted(world,bill)).toBe(false);
  stepWorld(world,60);expect(count(world,'fine-meal')).toBe(5);
});
