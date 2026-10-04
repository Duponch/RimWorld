import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {validateCooking} from '../src/sim/cooking-save.ts';
import {validBillSettings} from '../src/sim/cooking-bills.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {isCookingOrder} from '../src/sim/order-types.ts';
import {validCookingOrder} from '../src/sim/player-cooking-save.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';
import { withoutPlantsSkill, withoutTelevisionRecreation, withMigratedTelevisionRecreation } from './scenarios/legacy-skills.ts';
import {withoutPredatorFoodPolicies,withoutPredatorApparelPolicies} from './scenarios/legacy-save.ts';

const RECIPE='cook-carnivore-fine-meal-bulk' as const;
function prepared():World {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',30,{x:6,z:6},'hare-meat');
  addGroundMaterial(world,'food',30,{x:7,z:6},'deer-meat');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  return world;
}
function declared162(world:World):World {
  const old=withoutPredatorApparelPolicies(withoutPredatorFoodPolicies(withoutPlantsSkill(structuredClone(world))));
  (old as {schemaVersion:number}).schemaVersion=(withoutTelevisionRecreation(old),162);
  return old;
}

test('V162 migrates neutrally and rejects a future bulk bill on active or packed stoves',()=>{
  const base=foodWorkstationCamp();
  addGroundMaterial(base,'food',2,{x:5,z:5},'carnivore-fine-meal');
  const old=declared162(base),before=structuredClone(old);
  const loaded=deserializeWorld(JSON.stringify(old));
  expect(loaded).toEqual(withMigratedTelevisionRecreation({...before,schemaVersion:SCHEMA_VERSION}));
  expect(old).toEqual(before);
  expect(loaded.rng).toBe(before.rng);
  const control=withMigratedTelevisionRecreation({...structuredClone(before),schemaVersion:SCHEMA_VERSION}) as World;
  stepWorld(loaded,20);stepWorld(control,20);expect(loaded).toEqual(control);

  const active=declared162(prepared());
  expect(validateCooking(active,162,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(active))).toThrow(/Invalid version 162 save/);
  const packed=declared162(prepared()),station=packed.structures[0]!;
  packed.structures=[];packed.packed.push({building:station,owner:{type:'ground',x:station.x,z:station.z}});
  expect(validateCooking(packed,162,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(packed))).toThrow(/Invalid version 162 save/);
});

test('V162 rejects a future bulk key hidden in an existing bill filter',()=>{
  const current=prepared(),bill=current.structures[0]!.bills![0]!;
  bill.recipe='carnivore-fine-meal';
  Object.assign(bill.filters,{[RECIPE]:true});
  expect(validBillSettings(bill,bill.recipe,163)).toBe(false);
  expect(validateCooking(current,163,new Set())).toContain('Invalid cooking bill.');
  const old=declared162(current);
  expect(validateCooking(old,162,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 162 save/);
});

test('V162 rejects a future recipe hidden in an extra bill property',()=>{
  const current=prepared(),bill=current.structures[0]!.bills![0]!;
  bill.recipe='carnivore-fine-meal';
  Object.assign(bill,{nextRecipe:RECIPE});
  expect(validBillSettings(bill,bill.recipe,163)).toBe(false);
  expect(validateCooking(current,163,new Set())).toContain('Invalid cooking bill.');
  const old=declared162(current);
  expect(validateCooking(old,162,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 162 save/);
});

test('six physical trips can reserve two meat piles; a V162 queued order is rejected',()=>{
  const world=prepared(),pawn=world.pawns[0]!,stove=world.structures[0]!;
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected carnivore fine bulk cooking order');
  const entries=proposal.order.cooking.ingredients;
  expect(entries).toHaveLength(6);
  expect(new Set(entries.map(i=>i.pileId)).size).toBe(2);
  expect(entries.map(i=>i.quantity)).toEqual([10,10,10,10,10,10]);
  expect(validCookingOrder(proposal.order,world)).toBe(true);
  const short=structuredClone(proposal.order);
  if(!isCookingOrder(short))throw new Error('Expected cooking order copy');
  short.cooking.ingredients[0]!.quantity=9;
  expect(validCookingOrder(short,world)).toBe(false);
  const milk=structuredClone(proposal.order);
  if(!isCookingOrder(milk))throw new Error('Expected cooking order copy');
  milk.cooking.ingredients[0]!.item='milk';
  expect(validCookingOrder(milk,world)).toBe(false);
  pawn.orders.queue.push(proposal.order);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const old=declared162(world);
  expect(validCookingOrder(old.pawns[0]!.orders.queue[0],old)).toBe(false);
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 162 save/);
});

test('an active 60-meat task resumes exactly and cannot appear in a V162 save',()=>{
  const world=prepared(),pawn=world.pawns[0]!;
  for(let i=0;i<1200&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  expect(pawn.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(60);
  expect(validateWorld(world)).toEqual([]);
  const short=structuredClone(world);
  short.pawns[0]!.cooking!.ingredients[0]!.quantity=9;
  expect(validateCooking(short,SCHEMA_VERSION,new Set())).toContain('Invalid recipe quantity or phase.');
  const old=declared162(world);
  expect(validateCooking(old,162,new Set())).toContain('Invalid or future production recipe.');
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 162 save/);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(resumed,30);expect(resumed).toEqual(world);
});
