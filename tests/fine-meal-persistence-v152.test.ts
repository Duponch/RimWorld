import { expect, test } from 'vitest';
import { newCookingBill } from '../src/sim/cooking-bills.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { validCookingOrder } from '../src/sim/player-cooking-save.ts';
import { exposeFoodPoisoning } from '../src/sim/food-poisoning.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { SCHEMA_VERSION, type World } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureFoodStation } from './scenarios/food-workstations.ts';

function declared150():World {
  const world=medicalCamp();
  for(const policy of world.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!=='fine-meal'&&item!=='lavish-meal'&&item!=='vegetarian-fine-meal'&&item!=='carnivore-fine-meal'&&item!=='vegetarian-lavish-meal');
  (world as {schemaVersion:number}).schemaVersion=150;
  return world;
}
function rejected(change:(world:World)=>void):void {
  const world=declared150();change(world);
  expect(()=>deserializeWorld(JSON.stringify(world))).toThrow(/Invalid version 150 save/);
}

test('V150 to V152 is neutral for policies, spoilage, memories, tasks and PRNG',()=>{
  const old=declared150(),before=structuredClone(old);
  const loaded=deserializeWorld(JSON.stringify(old));
  expect(loaded).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  expect(old).toEqual(before);
  expect(loaded.foodPolicies).toEqual(before.foodPolicies);
  expect(loaded.spoiled).toEqual(before.spoiled);
  expect(loaded.rng).toBe(before.rng);
  expect(validateWorld(loaded)).toEqual([]);
  (before as {schemaVersion:number}).schemaVersion=SCHEMA_VERSION;
  stepWorld(loaded,60);stepWorld(before,60);
  expect(loaded).toEqual(before);
});

test('declared V150 rejects a future meal in piles, stockpile filters, policies and spoilage',()=>{
  rejected(w=>{addGroundMaterial(w,'food',1,{x:3,z:3},'fine-meal');});
  rejected(w=>{w.foodPolicies[0]!.allowed.push('fine-meal');});
  rejected(w=>{w.spoiled['fine-meal']=1;});
  rejected(w=>{
    expect(applyCommand(w,{type:'stockpile',enabled:true,x:3,z:3,capacity:10,filters:{wood:false,food:true}}).ok).toBe(true);
    w.stockpiles[0]!.items={'fine-meal':true};
  });
});

test('declared V150 rejects future memories, illness, active bills and packed bills',()=>{
  rejected(w=>{w.pawns[0]!.memories.push({kind:'ate-fine-meal',expiresAt:w.tick+100});});
  rejected(w=>{
    const pawn=w.pawns[0]!;pawn.health=createMedicalRecord(w.tick);
    pawn.health.foodPoisoning=exposeFoodPoisoning(undefined,'filthy-kitchen','fine-meal',w.tick);
  });
  rejected(w=>{
    const stove=fixtureFoodStation(w,'fueled-stove');
    stove.bills!.push(newCookingBill(w.nextId++,'fine-meal'));
  });
  rejected(w=>{
    const stove=fixtureFoodStation(w,'fueled-stove');
    const bill=newCookingBill(w.nextId++,'simple-meal');
    (bill.filters as Record<string,boolean>)['fine-meal']=true;
    stove.bills!.push(bill);
  });
  rejected(w=>{
    const stove=fixtureFoodStation(w,'fueled-stove');
    w.structures=w.structures.filter(s=>s!==stove);
    w.packed.push({building:stove,owner:{type:'ground',x:stove.x,z:stove.z}});
    stove.bills!.push(newCookingBill(w.nextId++,'fine-meal'));
  });
});

test('V152 food policy, fresh pile, four-day rot and contamination round-trip',()=>{
  const world=medicalCamp();
  world.foodPolicies[0]!.allowed=['fine-meal'];
  addGroundMaterial(world,'food',2,{x:3,z:3},'fine-meal');
  const meal=world.piles.find(p=>p.item==='fine-meal')!;
  meal.foodPoison={fraction:.5,cause:'filthy-kitchen'};
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  meal.rot={progress:4*6000-1,atTick:world.tick};
  world.pawns=[];
  stepWorld(world);
  expect(world.piles.some(p=>p.item==='fine-meal')).toBe(false);
  expect(world.spoiled['fine-meal']).toBe(2);
  expect(validateWorld(world)).toEqual([]);
});

test('queued fine meal reservations require five protein and five vegetables',()=>{
  const world=medicalCamp();
  const base={cooking:{recipe:'fine-meal',stationId:1,billId:2,spot:{x:10,z:10},actionCell:{x:10,z:11},phase:'gather',progress:0,productId:null,storageId:null,
    ingredients:[{pileId:3,item:'milk',quantity:5,stage:'source',cell:{x:9,z:10}},{pileId:4,item:'rice',quantity:5,stage:'source',cell:{x:9,z:11}}]}};
  expect(validCookingOrder(base,world)).toBe(true);
  const allVegetable=structuredClone(base);allVegetable.cooking.ingredients[0]!.item='rice';
  expect(validCookingOrder(allVegetable,world)).toBe(false);
  const old=declared150();
  expect(validCookingOrder(base,old)).toBe(false);
});

test('a meal product cannot become an ingredient filter even in V152',()=>{
  const world=medicalCamp(),stove=fixtureFoodStation(world,'fueled-stove');
  const bill=newCookingBill(world.nextId++,'simple-meal');
  (bill.filters as Record<string,boolean>)['fine-meal']=true;
  stove.bills!.push(bill);
  expect(validateWorld(world)).toContain('Invalid cooking bill.');
});
