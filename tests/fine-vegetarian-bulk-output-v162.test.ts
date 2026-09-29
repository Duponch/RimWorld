import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {countedProducts} from '../src/sim/cooking-bills.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import type {World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';

const RECIPE='cook-vegetarian-fine-meal-bulk' as const;
const count=(world:World,item:string)=>world.piles.reduce((total,pile)=>total+(pile.item===item?pile.quantity:0),0);
function until(world:World,condition:()=>boolean,max=3000):void {
  for(let i=0;i<max&&!condition();i++)stepWorld(world);
  expect(condition(),`Expected vegetarian fine bulk transition by tick ${world.tick}`).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}
function prepared():{world:World;stove:World['structures'][number];pawn:World['pawns'][number]} {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',30,{x:6,z:6},'milk');
  addGroundMaterial(world,'food',30,{x:7,z:6},'rice');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  return {world,stove,pawn};
}

test('one vegetarian fine bulk operation collects 30 milk and 30 vegetables, then creates four vegetarian fine meals',()=>{
  const {world,stove,pawn}=prepared(),bill=stove.bills![0]!;bill.destination='drop';
  until(world,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  expect(count(world,'milk')).toBe(30);
  expect(count(world,'rice')).toBe(30);
  expect(pawn.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(60);
  until(world,()=>count(world,'vegetarian-fine-meal')===4&&pawn.cooking===null);
  expect(count(world,'milk')+count(world,'rice')).toBe(0);
  expect(bill.target).toBe(0); // "X times" counts one operation.
  expect(world.piles.filter(p=>p.item==='vegetarian-fine-meal').every(p=>p.quantity<=10)).toBe(true);
});

test('vegetarian fine bulk output reserves one free stock slot, then delivers the three remaining meals after reload',()=>{
  const {world,stove,pawn}=prepared();
  const first={id:world.nextId++,x:14,z:10,filters:{wood:false,food:true},items:{'vegetarian-fine-meal':true},priority:2,capacity:10};
  const second={id:world.nextId++,x:16,z:10,filters:{wood:false,food:true},items:{'vegetarian-fine-meal':true},priority:1,capacity:10};
  world.stockpiles.push(first,second);
  addGroundMaterial(world,'food',9,{x:first.x,z:first.z},'vegetarian-fine-meal');refreshStock(world);
  until(world,()=>pawn.cooking?.phase==='output'&&pawn.cooking.storageId===first.id);
  expect(pawn.cooking!.storageQuantity).toBe(1);
  expect(world.piles.find(p=>p.id===pawn.cooking!.productId)?.quantity).toBe(4);
  const noQuantity=structuredClone(world);delete noQuantity.pawns[0]!.cooking!.storageQuantity;
  expect(validateWorld(noQuantity)).toContain('Invalid cooking output reservation.');
  const tooMany=structuredClone(world);tooMany.pawns[0]!.cooking!.storageQuantity=5;
  expect(validateWorld(tooMany)).toContain('Invalid production output quantity.');
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,5);stepWorld(resumed,5);expect(resumed).toEqual(world);
  until(world,()=>world.piles.some(p=>p.item==='vegetarian-fine-meal'&&p.owner.type==='ground'&&p.owner.x===first.x&&p.owner.z===first.z&&p.quantity===10));
  expect(world.piles.find(p=>p.id===pawn.cooking?.productId)?.quantity).toBe(3);
  until(world,()=>pawn.cooking===null);
  expect(world.piles.find(p=>p.item==='vegetarian-fine-meal'&&p.owner.type==='ground'&&p.owner.x===second.x&&p.owner.z===second.z)?.quantity).toBe(3);
  expect(count(world,'vegetarian-fine-meal')).toBe(13);
  expect(count(world,'milk')+count(world,'rice')).toBe(0);
  expect(countedProducts(world,stove.bills![0])).toBe(13);
});
