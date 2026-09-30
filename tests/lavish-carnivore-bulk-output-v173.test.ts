import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {countedProducts} from '../src/sim/cooking-bills.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import type {World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';

const RECIPE='cook-carnivore-lavish-meal-bulk' as const;
const count=(world:World,item:string)=>world.piles.reduce((total,pile)=>total+(pile.item===item?pile.quantity:0),0);
function until(world:World,condition:()=>boolean,max=5000):void {
  for(let i=0;i<max&&!condition();i++)stepWorld(world);
  expect(condition(),`Expected carnivore lavish bulk transition by tick ${world.tick}`).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}
function prepared():{world:World;stove:World['structures'][number];pawn:World['pawns'][number]} {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=12000;
  addGroundMaterial(world,'food',50,{x:6,z:6},'hare-meat');
  addGroundMaterial(world,'food',50,{x:7,z:6},'deer-meat');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  return {world,stove,pawn};
}

test('one carnivore lavish bulk operation collects 50 hare-meat and 50 deer-meat, then creates four carnivore lavish meals',()=>{
  const {world,stove,pawn}=prepared(),bill=stove.bills![0]!;bill.destination='drop';
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(count(world,'hare-meat')).toBe(50);
  expect(count(world,'deer-meat')).toBe(50);
  expect(pawn.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(100);
  until(world,()=>count(world,'carnivore-lavish-meal')===4&&pawn.cooking===null);
  expect(count(world,'hare-meat')+count(world,'deer-meat')).toBe(0);
  expect(bill.target).toBe(0); // "X times" counts one operation.
  expect(world.piles.filter(p=>p.item==='carnivore-lavish-meal').every(p=>p.quantity<=10)).toBe(true);
});

test('carnivore lavish bulk output reserves one free stock slot, then delivers the three remaining meals after reload',()=>{
  const {world,stove,pawn}=prepared();
  const first={id:world.nextId++,x:14,z:10,filters:{wood:false,food:true},items:{'carnivore-lavish-meal':true},priority:2,capacity:10};
  const second={id:world.nextId++,x:16,z:10,filters:{wood:false,food:true},items:{'carnivore-lavish-meal':true},priority:1,capacity:10};
  world.stockpiles.push(first,second);
  addGroundMaterial(world,'food',9,{x:first.x,z:first.z},'carnivore-lavish-meal');refreshStock(world);
  until(world,()=>pawn.cooking?.phase==='output'&&pawn.cooking.storageId===first.id);
  expect(pawn.cooking!.storageQuantity).toBe(1);
  expect(world.piles.find(p=>p.id===pawn.cooking!.productId)?.quantity).toBe(4);
  const noQuantity=structuredClone(world);delete noQuantity.pawns[0]!.cooking!.storageQuantity;
  expect(validateWorld(noQuantity)).toContain('Invalid cooking output reservation.');
  const tooMany=structuredClone(world);tooMany.pawns[0]!.cooking!.storageQuantity=5;
  expect(validateWorld(tooMany)).toContain('Invalid production output quantity.');
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,5);stepWorld(resumed,5);expect(resumed).toEqual(world);
  until(world,()=>world.piles.some(p=>p.item==='carnivore-lavish-meal'&&p.owner.type==='ground'&&p.owner.x===first.x&&p.owner.z===first.z&&p.quantity===10));
  expect(world.piles.find(p=>p.id===pawn.cooking?.productId)?.quantity).toBe(3);
  until(world,()=>pawn.cooking===null);
  expect(world.piles.find(p=>p.item==='carnivore-lavish-meal'&&p.owner.type==='ground'&&p.owner.x===second.x&&p.owner.z===second.z)?.quantity).toBe(3);
  expect(count(world,'carnivore-lavish-meal')).toBe(13);
  expect(count(world,'hare-meat')+count(world,'deer-meat')).toBe(0);
  expect(countedProducts(world,stove.bills![0])).toBe(13);
});
