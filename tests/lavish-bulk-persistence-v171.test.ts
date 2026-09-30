import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {validateCooking} from '../src/sim/cooking-save.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {isCookingOrder} from '../src/sim/order-types.ts';
import {validCookingOrder} from '../src/sim/player-cooking-save.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';

const RECIPE='cook-lavish-meal-bulk' as const;
function prepared():World {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',40,{x:6,z:6},'hare-meat');
  addGroundMaterial(world,'food',40,{x:7,z:6},'rice');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  return world;
}
function declared163(world:World):World {
  const old=structuredClone(world);
  (old as {schemaVersion:number}).schemaVersion=163;
  return old;
}

test('V163 migrates neutrally, but rejects the future lavish bulk bill on active and packed stoves',()=>{
  const old=declared163(foodWorkstationCamp()),before=structuredClone(old);
  const loaded=deserializeWorld(JSON.stringify(old));
  expect(loaded).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  expect(old).toEqual(before);
  expect(loaded.rng).toBe(before.rng);
  const control={...structuredClone(before),schemaVersion:SCHEMA_VERSION} as World;
  stepWorld(loaded,20);stepWorld(control,20);expect(loaded).toEqual(control);

  const active=declared163(prepared());
  expect(validateCooking(active,163,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(active))).toThrow(/Invalid version 163 save/);
  const packed=declared163(prepared()),station=packed.structures[0]!;
  packed.structures=[];packed.packed.push({building:station,owner:{type:'ground',x:station.x,z:station.z}});
  expect(validateCooking(packed,163,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(packed))).toThrow(/Invalid version 163 save/);
});

test('V163 rejects a future recipe hidden in a legacy bill filter or extra property',()=>{
  const world=foodWorkstationCamp(),stove=fixtureFoodStation(world,'fueled-stove');
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:'lavish-meal'}).ok).toBe(true);
  const hiddenFilter=declared163(world);
  (hiddenFilter.structures[0]!.bills![0]!.filters as Record<string,boolean>)[RECIPE]=true;
  expect(validateCooking(hiddenFilter,163,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(hiddenFilter))).toThrow(/Invalid version 163 save/);
  const hiddenProperty=declared163(world);
  (hiddenProperty.structures[0]!.bills![0]! as unknown as Record<string,unknown>).nextRecipe=RECIPE;
  expect(validateCooking(hiddenProperty,163,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(hiddenProperty))).toThrow(/Invalid version 163 save/);
});

test('V163 rejects future fields hidden in queued cooking cells',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',10,{x:6,z:6},'hare-meat');
  addGroundMaterial(world,'food',10,{x:7,z:6},'rice');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:'lavish-meal'}).ok).toBe(true);
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected queued lavish order');
  pawn.orders.queue.push(proposal.order);
  const old=declared163(world);
  expect(validCookingOrder(old.pawns[0]!.orders.queue[0],old)).toBe(true);
  for(const key of ['spot','actionCell','ingredient'] as const){
    const hidden=structuredClone(old),order=hidden.pawns[0]!.orders.queue[0];
    if(!isCookingOrder(order))throw new Error('Expected copied cooking order');
    const cell=key==='ingredient'?order.cooking.ingredients[0]!.cell:order.cooking[key];
    (cell as unknown as Record<string,unknown>).nextRecipe=RECIPE;
    expect(validCookingOrder(order,hidden),key).toBe(false);
    expect(()=>deserializeWorld(JSON.stringify(hidden)),key).toThrow(/Invalid version 163 save/);
  }
});

test('two raw piles require eight physical trips and one queued order; V163 refuses the order',()=>{
  const world=prepared(),pawn=world.pawns[0]!,stove=world.structures[0]!;
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected lavish bulk cooking order');
  const entries=proposal.order.cooking.ingredients;
  expect(entries).toHaveLength(8);
  expect(new Set(entries.map(i=>i.pileId)).size).toBe(2);
  expect(entries.map(i=>i.quantity)).toEqual([10,10,10,10,10,10,10,10]);
  expect(validCookingOrder(proposal.order,world)).toBe(true);
  const unbalanced=structuredClone(proposal.order);
  if(!isCookingOrder(unbalanced))throw new Error('Expected cooking order copy');
  unbalanced.cooking.ingredients.find(i=>i.item==='hare-meat')!.quantity=15;
  unbalanced.cooking.ingredients.find(i=>i.item==='rice')!.quantity=5;
  expect(validCookingOrder(unbalanced,world)).toBe(false); // 45 protein + 35 vegetables is not 40 + 40.
  pawn.orders.queue.push(proposal.order);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const old=declared163(world);
  expect(validCookingOrder(old.pawns[0]!.orders.queue[0],old)).toBe(false);
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 163 save/);
});

test('the active 40 plus 40 quota resumes exactly and cannot appear in a V163 task',()=>{
  const world=prepared(),pawn=world.pawns[0]!;
  for(let i=0;i<1200&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  expect(pawn.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(80);
  expect(validateWorld(world)).toEqual([]);
  const unbalanced=structuredClone(world);
  unbalanced.pawns[0]!.cooking!.ingredients.find(i=>i.item==='hare-meat')!.quantity=15;
  unbalanced.pawns[0]!.cooking!.ingredients.find(i=>i.item==='rice')!.quantity=5;
  expect(validateCooking(unbalanced,SCHEMA_VERSION,new Set())).toContain('Invalid recipe quantity or phase.');
  const old=declared163(world);
  expect(validateCooking(old,163,new Set())).toContain('Invalid or future production recipe.');
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 163 save/);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(resumed,30);expect(resumed).toEqual(world);
});

test('V163 rejects a future recipe hidden in an otherwise valid active cooking task',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',10,{x:6,z:6},'hare-meat');
  addGroundMaterial(world,'food',10,{x:7,z:6},'rice');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:'lavish-meal'}).ok).toBe(true);
  for(let i=0;i<1200&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  const old=declared163(world);
  expect(validateCooking(old,163,new Set())).toEqual([]);
  (old.pawns[0]!.cooking as unknown as Record<string,unknown>).nextRecipe=RECIPE;
  expect(validateCooking(old,163,new Set())).toContain('Invalid or future production recipe.');
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 163 save/);
  const hiddenIngredient=declared163(world);
  (hiddenIngredient.pawns[0]!.cooking!.ingredients[0]! as unknown as Record<string,unknown>).nextRecipe=RECIPE;
  expect(validateCooking(hiddenIngredient,163,new Set())).toContain('Invalid recipe ingredient reservation.');
  expect(()=>deserializeWorld(JSON.stringify(hiddenIngredient))).toThrow(/Invalid version 163 save/);
});
