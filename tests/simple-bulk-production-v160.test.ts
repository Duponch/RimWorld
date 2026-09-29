import {expect,test} from 'vitest';
import {applyCommand,stepWorld,validateWorld} from '../src/sim/index.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {billWanted,countedProducts} from '../src/sim/cooking-bills.ts';
import {queryCookingBillStatus} from '../src/sim/cooking-diagnostics.ts';
import {PRODUCTION_RECIPES,stationAccepts} from '../src/sim/production-recipes.ts';
import type {ItemId} from '../src/sim/items.ts';
import type {Structure,World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';

const RECIPE='cook-simple-meal-bulk' as const;
const count=(world:World,item:ItemId)=>world.piles.reduce((n,pile)=>n+(pile.item===item?pile.quantity:0),0);
function until(world:World,done:()=>boolean,max=2600):void {
  for(let i=0;i<max&&!done();i++)stepWorld(world);
  expect(done(),`Expected bulk transition by tick ${world.tick}`).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}
function scene(kind:'campfire'|'fueled-stove'='fueled-stove') {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!;
  pawn.priorities.cook=1;
  const station:Structure=kind==='campfire'
    ?{id:world.nextId++,kind:'campfire',x:10,z:10,orientation:0,footprint:'standard',fuel:{ticks:12000,burned:0,autoRefuel:false},bills:[]}
    :fixtureFoodStation(world,'fueled-stove');
  if(kind==='campfire')world.structures.push(station);
  else station.fuel!.ticks=12000;
  expect(applyCommand(world,{type:'bill-add',structureId:station.id,recipe:RECIPE}).ok).toBe(true);
  station.bills![0]!.destination='drop';
  return {world,pawn,station,bill:station.bills![0]!};
}

test('Core simple x4 is a separate bill at fire and stoves, and 39 raw units cannot make four meals',()=>{
  expect(PRODUCTION_RECIPES[RECIPE]).toMatchObject({units:40,workTicks:120,outputUnits:4});
  for(const kind of ['campfire','fueled-stove','electric-stove'] as const)expect(stationAccepts({kind},RECIPE)).toBe(true);
  expect(stationAccepts({kind:'butcher-table'},RECIPE)).toBe(false);
  const {world,pawn,station,bill}=scene('campfire');
  addGroundMaterial(world,'food',39,{x:6,z:6},'rice');refreshStock(world);
  expect(queryCookingBillStatus(world,station,bill).code).toBe('missing-ingredients');
  stepWorld(world,120);
  expect(pawn.cooking).toBeNull();expect(count(world,'simple-meal')).toBe(0);
  addGroundMaterial(world,'food',1,{x:7,z:6},'milk');refreshStock(world);
  until(world,()=>count(world,'simple-meal')===4&&pawn.cooking===null);
  expect(count(world,'rice')+count(world,'milk')).toBe(0);
  expect(bill.target).toBe(0);
  pawn.hunger=20;pawn.needCooldown=0;pawn.priorities.cook=0;
  until(world,()=>count(world,'simple-meal')===3&&pawn.hunger>20);
  expect(pawn.hunger).toBeGreaterThan(80);
});

test('two cooks cannot reserve the same 40 units, and changing the ingredient filter returns every unit',()=>{
  const {world,pawn,bill}=scene();
  addGroundMaterial(world,'food',40,{x:12,z:6},'rice');refreshStock(world);
  const second=structuredClone(pawn);
  second.id=world.nextId++;second.name='Deuxième cuisinier';second.x=18;second.z=4;
  world.pawns.push(second);
  const other=fixtureFoodStation(world,'fueled-stove',17,10);other.fuel!.ticks=12000;
  expect(applyCommand(world,{type:'bill-add',structureId:other.id,recipe:RECIPE}).ok).toBe(true);
  other.bills![0]!.destination='drop';
  until(world,()=>world.pawns.some(p=>p.cooking?.phase==='work'&&p.cooking.progress>0));
  expect(world.pawns.filter(p=>p.cooking?.recipe===RECIPE)).toHaveLength(1);
  bill.filters.rice=false;
  stepWorld(world);
  expect(pawn.cooking).toBeNull();
  expect(count(world,'rice')).toBe(40);
  expect(count(world,'simple-meal')).toBe(0);
  expect(validateWorld(world)).toEqual([]);
});

test('until-X counts portions from both simple recipes, including a target crossed by four',()=>{
  const {world,pawn,station,bill}=scene();
  const zone={id:world.nextId++,x:14,z:10,filters:{wood:false,food:true},items:{'simple-meal':true},priority:2,capacity:10};
  world.stockpiles.push(zone);
  addGroundMaterial(world,'food',2,{x:zone.x,z:zone.z},'simple-meal');
  addGroundMaterial(world,'food',40,{x:6,z:6},'rice');refreshStock(world);
  bill.mode='until';bill.target=3;bill.destination='stockpile';
  expect(countedProducts(world,bill)).toBe(2);
  expect(billWanted(world,bill)).toBe(true);
  until(world,()=>pawn.cooking===null&&count(world,'simple-meal')===6);
  expect(countedProducts(world,bill)).toBe(6);
  expect(billWanted(world,bill)).toBe(false);
  expect(station.bills![0]!.target).toBe(3);
  stepWorld(world,60);expect(count(world,'simple-meal')).toBe(6);
});
