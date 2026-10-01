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

const RECIPE='cook-simple-meal-bulk' as const;
function prepared():World {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',40,{x:6,z:6},'rice');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  return world;
}
function declared159(world:World):World {
  const old=withoutPlantsSkill(structuredClone(world));
  (old as {schemaVersion:number}).schemaVersion=159;
  return old;
}

test('V159 migrates neutrally, while a future bulk bill on active or packed station is rejected',()=>{
  const old=declared159(foodWorkstationCamp()),before=structuredClone(old);
  const loaded=deserializeWorld(JSON.stringify(old));
  expect(loaded).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  expect(old).toEqual(before);
  expect(loaded.rng).toBe(before.rng);
  const control={...structuredClone(before),schemaVersion:SCHEMA_VERSION} as World;
  stepWorld(loaded,20);stepWorld(control,20);expect(loaded).toEqual(control);

  const active=declared159(prepared());
  expect(validateCooking(active,159,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(active))).toThrow(/Invalid version 159 save/);
  const packed=declared159(prepared()),station=packed.structures[0]!;
  packed.structures=[];packed.packed.push({building:station,owner:{type:'ground',x:station.x,z:station.z}});
  expect(validateCooking(packed,159,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(packed))).toThrow(/Invalid version 159 save/);
});

test('four trips from one raw pile are one valid queued reservation, rejected by V159',()=>{
  const world=prepared(),pawn=world.pawns[0]!,stove=world.structures[0]!;
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected cooking order');
  const entries=proposal.order.cooking.ingredients;
  expect(entries).toHaveLength(4);
  expect(new Set(entries.map(i=>i.pileId)).size).toBe(1);
  expect(entries.map(i=>i.quantity)).toEqual([10,10,10,10]);
  expect(validCookingOrder(proposal.order,world)).toBe(true);
  pawn.orders.queue.push(proposal.order);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const old=declared159(world);
  expect(validCookingOrder(old.pawns[0]!.orders.queue[0],old)).toBe(false);
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 159 save/);
});

test('an active bulk task resumes exactly and cannot be smuggled into a V159 save',()=>{
  const world=prepared(),pawn=world.pawns[0]!;
  for(let i=0;i<1200&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  expect(pawn.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(40);
  expect(validateWorld(world)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(resumed,30);expect(resumed).toEqual(world);
  const old=declared159(world);
  expect(validateCooking(old,159,new Set())).toContain('Invalid or future production recipe.');
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 159 save/);
});
