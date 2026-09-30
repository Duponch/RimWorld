import {expect,test} from 'vitest';
import {applyCommand,stepWorld,validateWorld} from '../src/sim/index.ts';
import {billWanted,countedProducts} from '../src/sim/cooking-bills.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {PRODUCTION_RECIPES,stationAccepts,validLavishMealBulkIngredients} from '../src/sim/production-recipes.ts';
import type {World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';

const RECIPE='cook-lavish-meal-bulk' as const;
const count=(world:World,item:string)=>world.piles.reduce((n,pile)=>n+(pile.item===item?pile.quantity:0),0);
function until(world:World,done:()=>boolean,max=3000):void {
  for(let i=0;i<max&&!done();i++)stepWorld(world);
  expect(done(),`Expected lavish bulk transition by tick ${world.tick}`).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}
function scene():ReturnType<typeof foodWorkstationCamp> {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=12000;
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  stove.bills![0]!.destination='drop';
  return world;
}

test('lavish x4 enforces separate 40+40 quotas and Cuisine 8, then one of four meals is actually eaten',()=>{
  expect(PRODUCTION_RECIPES[RECIPE]).toMatchObject({units:80,workTicks:320,outputUnits:4});
  for(const kind of ['fueled-stove','electric-stove'] as const)expect(stationAccepts({kind},RECIPE)).toBe(true);
  expect(stationAccepts({kind:'campfire'},RECIPE)).toBe(false);
  expect(validLavishMealBulkIngredients([{item:'milk',quantity:20},{item:'hare-meat',quantity:20},{item:'rice',quantity:40}])).toBe(true);
  expect(validLavishMealBulkIngredients([{item:'milk',quantity:39},{item:'rice',quantity:41}])).toBe(false);
  const world=scene(),pawn=world.pawns[0]!,bill=world.structures[0]!.bills![0]!;
  addGroundMaterial(world,'food',39,{x:6,z:6},'milk');
  addGroundMaterial(world,'food',41,{x:7,z:6},'rice');refreshStock(world);
  pawn.skills.cooking!.level=7;
  expect(productionWorkerQualified(pawn,RECIPE)).toBe(false);
  stepWorld(world,90);expect(pawn.cooking).toBeNull();expect(count(world,'lavish-meal')).toBe(0);
  pawn.skills.cooking!.level=8;
  expect(productionWorkerQualified(pawn,RECIPE)).toBe(true);
  stepWorld(world,90);expect(pawn.cooking).toBeNull();
  addGroundMaterial(world,'food',1,{x:8,z:6},'hare-meat');refreshStock(world);
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(validLavishMealBulkIngredients(pawn.cooking!.ingredients)).toBe(true);
  until(world,()=>count(world,'lavish-meal')===4&&pawn.cooking===null);
  expect(count(world,'milk')+count(world,'hare-meat')).toBe(0);
  expect(count(world,'rice')).toBe(1);
  expect(bill.target).toBe(0);
  pawn.hunger=20;pawn.needCooldown=0;pawn.priorities.cook=0;
  until(world,()=>count(world,'lavish-meal')===3&&pawn.memories.some(memory=>memory.kind==='ate-lavish-meal'));
  expect(pawn.hunger).toBeGreaterThan(80);
});

test('until-X counts lavish portions from both recipes and stops after a full four-portion batch',()=>{
  const world=scene(),pawn=world.pawns[0]!,bill=world.structures[0]!.bills![0]!;
  const zone={id:world.nextId++,x:14,z:10,filters:{wood:false,food:true},items:{'lavish-meal':true},priority:2,capacity:10};
  world.stockpiles.push(zone);
  addGroundMaterial(world,'food',1,{x:zone.x,z:zone.z},'lavish-meal');
  addGroundMaterial(world,'food',40,{x:6,z:6},'milk');
  addGroundMaterial(world,'food',40,{x:7,z:6},'rice');refreshStock(world);
  bill.mode='until';bill.target=3;bill.destination='stockpile';
  expect(countedProducts(world,bill)).toBe(1);
  until(world,()=>pawn.cooking===null&&count(world,'lavish-meal')===5);
  expect(countedProducts(world,bill)).toBe(5);
  expect(billWanted(world,bill)).toBe(false);
  stepWorld(world,60);expect(count(world,'lavish-meal')).toBe(5);
});

test('removing the bill after partial collection returns the entire 40+40 raw batch',()=>{
  const world=scene(),pawn=world.pawns[0]!,station=world.structures[0]!,bill=station.bills![0]!;
  addGroundMaterial(world,'food',40,{x:6,z:6},'hare-meat');
  addGroundMaterial(world,'food',40,{x:7,z:6},'rice');refreshStock(world);
  until(world,()=>!!pawn.cooking?.ingredients.some(i=>i.stage==='held'||i.stage==='placed'));
  expect(count(world,'hare-meat')+count(world,'rice')).toBe(80);
  expect(applyCommand(world,{type:'bill-remove',structureId:station.id,billId:bill.id}).ok).toBe(true);
  expect(pawn.cooking).toBeNull();
  expect(count(world,'hare-meat')+count(world,'rice')).toBe(80);
  expect(count(world,'lavish-meal')).toBe(0);
  expect(validateWorld(world)).toEqual([]);
});

test('two chefs cannot reserve the same 40+40 batch twice',()=>{
  const world=scene(),first=world.pawns[0]!,second=structuredClone(first);
  second.id=world.nextId++;second.name='Second';second.x=5;second.z=4;second.cooking=null;
  world.pawns.push(second);
  const stove=fixtureFoodStation(world,'fueled-stove',16,10);stove.fuel!.ticks=12000;
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  addGroundMaterial(world,'food',40,{x:7,z:6},'hare-meat');
  addGroundMaterial(world,'food',40,{x:8,z:6},'rice');refreshStock(world);
  until(world,()=>world.pawns.some(p=>p.cooking?.recipe===RECIPE));
  expect(world.pawns.filter(p=>p.cooking?.recipe===RECIPE)).toHaveLength(1);
  for(let i=0;i<40;i++)stepWorld(world);
  expect(world.pawns.filter(p=>p.cooking?.recipe===RECIPE)).toHaveLength(1);
  expect(count(world,'hare-meat')+count(world,'rice')).toBe(80);
  expect(count(world,'lavish-meal')).toBe(0);
  expect(validateWorld(world)).toEqual([]);
});
