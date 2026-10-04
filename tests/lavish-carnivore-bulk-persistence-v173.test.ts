import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {validateCooking} from '../src/sim/cooking-save.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {isCookingOrder} from '../src/sim/order-types.ts';
import {validCookingOrder} from '../src/sim/player-cooking-save.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';
import {withoutPlantsSkill} from './scenarios/legacy-skills.ts';
import {withoutPredatorFoodPolicies,withoutPredatorApparelPolicies} from './scenarios/legacy-save.ts';

const RECIPE='cook-carnivore-lavish-meal-bulk' as const;
function prepared():World {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=12000;
  addGroundMaterial(world,'food',50,{x:6,z:6},'hare-meat');
  addGroundMaterial(world,'food',50,{x:7,z:6},'deer-meat');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  return world;
}
function declared165(world:World):World {
  const old=withoutPredatorApparelPolicies(withoutPredatorFoodPolicies(withoutPlantsSkill(structuredClone(world))));
  (old as {schemaVersion:number}).schemaVersion=165;
  return old;
}
function legacyScene():World {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',12,{x:6,z:6},'hare-meat');
  addGroundMaterial(world,'food',13,{x:7,z:6},'deer-meat');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:'cook-carnivore-lavish-meal'}).ok).toBe(true);
  // Construct the pre-178 ingredient filter before the legacy job starts.
  delete stove.bills![0]!.filters['red-fox-meat'];
  return world;
}

test('V165 migrates neutrally, but rejects the future carnivore lavish bulk bill on active and packed stoves',()=>{
  const base=foodWorkstationCamp();
  addGroundMaterial(base,'food',2,{x:5,z:5},'carnivore-lavish-meal');
  const old=declared165(base),before=structuredClone(old);
  const loaded=deserializeWorld(JSON.stringify(old));
  expect(loaded).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  expect(old).toEqual(before);
  expect(loaded.rng).toBe(before.rng);
  const control={...structuredClone(before),schemaVersion:SCHEMA_VERSION} as World;
  stepWorld(loaded,20);stepWorld(control,20);expect(loaded).toEqual(control);

  const active=declared165(prepared());
  expect(validateCooking(active,165,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(active))).toThrow(/Invalid version 165 save/);
  const packed=declared165(prepared()),station=packed.structures[0]!;
  packed.structures=[];packed.packed.push({building:station,owner:{type:'ground',x:station.x,z:station.z}});
  expect(validateCooking(packed,165,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(packed))).toThrow(/Invalid version 165 save/);
});

test('two raw piles require ten physical trips and one queued order; V165 refuses the order',()=>{
  const world=prepared(),pawn=world.pawns[0]!,stove=world.structures[0]!;
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected carnivore lavish bulk cooking order');
  const entries=proposal.order.cooking.ingredients;
  expect(entries).toHaveLength(10);
  expect(new Set(entries.map(i=>i.pileId)).size).toBe(2);
  expect(entries.map(i=>i.quantity)).toEqual([10,10,10,10,10,10,10,10,10,10]);
  expect(validCookingOrder(proposal.order,world)).toBe(true);
  const short=structuredClone(proposal.order);
  if(!isCookingOrder(short))throw new Error('Expected cooking order copy');
  short.cooking.ingredients[0]!.quantity=9;
  expect(validCookingOrder(short,world)).toBe(false);
  const meat=structuredClone(proposal.order);
  if(!isCookingOrder(meat))throw new Error('Expected cooking order copy');
  meat.cooking.ingredients[0]!.item='rice';
  expect(validCookingOrder(meat,world)).toBe(false);
  pawn.orders.queue.push(proposal.order);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const old=declared165(world);
  expect(validCookingOrder(old.pawns[0]!.orders.queue[0],old)).toBe(false);
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 165 save/);
});

test('the active single 100 unit quota resumes exactly and cannot appear in a V165 task',()=>{
  const world=prepared(),pawn=world.pawns[0]!;
  for(let i=0;i<2500&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  expect(pawn.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(100);
  expect(validateWorld(world)).toEqual([]);
  const short=structuredClone(world);
  short.pawns[0]!.cooking!.ingredients[0]!.quantity=9;
  expect(validateCooking(short,SCHEMA_VERSION,new Set())).toContain('Invalid recipe quantity or phase.');
  const old=declared165(world);
  expect(validateCooking(old,165,new Set())).toContain('Invalid or future production recipe.');
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 165 save/);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(resumed,30);expect(resumed).toEqual(world);
});

test('V165 rejects a future recipe hidden in an existing bill filter or property',()=>{
  const base=legacyScene();
  const hiddenFilter=declared165(base);
  (hiddenFilter.structures[0]!.bills![0]!.filters as Record<string,boolean>)[RECIPE]=true;
  expect(validateCooking(hiddenFilter,165,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(hiddenFilter))).toThrow(/Invalid version 165 save/);
  const hiddenProperty=declared165(base);
  (hiddenProperty.structures[0]!.bills![0]! as unknown as Record<string,unknown>).nextRecipe=RECIPE;
  expect(validateCooking(hiddenProperty,165,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(hiddenProperty))).toThrow(/Invalid version 165 save/);
});

test('V165 rejects a future recipe hidden in an existing active task, ingredient or cell',()=>{
  const world=legacyScene(),pawn=world.pawns[0]!;
  for(let i=0;i<1500&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  const old=declared165(world);
  expect(validateCooking(old,165,new Set())).toEqual([]);
  for(const key of ['task','ingredient','spot','actionCell','ingredientCell'] as const){
    const hidden=structuredClone(old),task=hidden.pawns[0]!.cooking!;
    const target=key==='task'?task:key==='ingredient'?task.ingredients[0]!:key==='ingredientCell'?task.ingredients[0]!.cell:task[key];
    (target as unknown as Record<string,unknown>).nextRecipe=RECIPE;
    expect(validateCooking(hidden,165,new Set()),key).not.toEqual([]);
    expect(()=>deserializeWorld(JSON.stringify(hidden)),key).toThrow(/Invalid version 165 save/);
  }
});

test('V165 rejects future fields in all three cells of a valid queued legacy order',()=>{
  const world=legacyScene(),pawn=world.pawns[0]!,stove=world.structures[0]!;
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected carnivore lavish order');
  pawn.orders.queue.push(proposal.order);
  const old=declared165(world);
  expect(validCookingOrder(old.pawns[0]!.orders.queue[0],old)).toBe(true);
  for(const key of ['spot','actionCell','ingredient'] as const){
    const hidden=structuredClone(old),order=hidden.pawns[0]!.orders.queue[0];
    if(!isCookingOrder(order))throw new Error('Expected copied cooking order');
    const cell=key==='ingredient'?order.cooking.ingredients[0]!.cell:order.cooking[key];
    (cell as unknown as Record<string,unknown>).nextRecipe=RECIPE;
    expect(validCookingOrder(order,hidden),key).toBe(false);
    expect(()=>deserializeWorld(JSON.stringify(hidden)),key).toThrow(/Invalid version 165 save/);
  }
  for(const key of ['task','ingredient'] as const){
    const hidden=structuredClone(old),order=hidden.pawns[0]!.orders.queue[0];
    if(!isCookingOrder(order))throw new Error('Expected copied cooking order');
    const target=key==='task'?order.cooking:order.cooking.ingredients[0]!;
    (target as unknown as Record<string,unknown>).nextRecipe=RECIPE;
    expect(validCookingOrder(order,hidden),key).toBe(false);
    expect(()=>deserializeWorld(JSON.stringify(hidden)),key).toThrow(/Invalid version 165 save/);
  }
});
