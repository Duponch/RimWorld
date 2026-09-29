import {expect,test} from 'vitest';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {ensureFireState} from '../src/sim/fire-rules.ts';
import {exposeFoodPoisoning} from '../src/sim/food-poisoning.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {validCookingOrder} from '../src/sim/player-cooking-save.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import {isCookingOrder} from '../src/sim/order-types.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {medicalCamp} from './scenarios/health.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';

const ITEM='carnivore-fine-meal' as const;
function declared155():World {
  const world=medicalCamp();
  for(const policy of world.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM&&item!=='vegetarian-lavish-meal'&&item!=='carnivore-lavish-meal');
  (world as {schemaVersion:number}).schemaVersion=155;
  return world;
}
function rejected155(change:(world:World)=>void):void {
  const world=declared155();change(world);
  expect(()=>deserializeWorld(JSON.stringify(world))).toThrow(/Invalid version 155 save/);
}

test('V155 to V156 validates first and changes only the version',()=>{
  const old=declared155(),before=structuredClone(old);
  const loaded=deserializeWorld(JSON.stringify(old));
  expect(loaded).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  expect(old).toEqual(before);
  expect(loaded.foodPolicies).toEqual(before.foodPolicies);
  expect(loaded.rng).toBe(before.rng);
  expect(validateWorld(loaded)).toEqual([]);
  (before as {schemaVersion:number}).schemaVersion=SCHEMA_VERSION;
  stepWorld(loaded,30);stepWorld(before,30);
  expect(loaded).toEqual(before);
});

test('declared V155 rejects future food in piles, policy, stockpile, spoilage and illness',()=>{
  rejected155(w=>{addGroundMaterial(w,'food',1,{x:3,z:3},ITEM);});
  rejected155(w=>{addGroundMaterial(w,'food',1,{x:3,z:3},ITEM);w.piles.find(p=>p.item===ITEM)!.owner={type:'pawn',pawnId:w.pawns[0]!.id};});
  rejected155(w=>{w.foodPolicies[0]!.allowed.push(ITEM);});
  rejected155(w=>{w.spoiled[ITEM]=1;});
  rejected155(w=>{expect(applyCommand(w,{type:'stockpile',enabled:true,x:3,z:3,capacity:10,filters:{wood:false,food:true}}).ok).toBe(true);w.stockpiles[0]!.items={[ITEM]:true};});
  rejected155(w=>{const pawn=w.pawns[0]!;pawn.health=createMedicalRecord(w.tick);pawn.health.foodPoisoning=exposeFoodPoisoning(undefined,'filthy-kitchen',ITEM,w.tick);});
  rejected155(w=>{ensureFireState(w).ledger.items[ITEM]=1;});
});

test('declared V155 rejects carnivore bills and future ingredient filters on active or packed stoves',()=>{
  rejected155(w=>{fixtureFoodStation(w,'fueled-stove').bills!.push(newCookingBill(w.nextId++,ITEM));});
  rejected155(w=>{const stove=fixtureFoodStation(w,'fueled-stove'),bill=newCookingBill(w.nextId++,'simple-meal');(bill.filters as Record<string,boolean>)[ITEM]=true;stove.bills!.push(bill);});
  rejected155(w=>{const stove=fixtureFoodStation(w,'fueled-stove');w.structures=w.structures.filter(s=>s!==stove);w.packed.push({building:stove,owner:{type:'ground',x:stove.x,z:stove.z}});stove.bills!.push(newCookingBill(w.nextId++,ITEM));});
});

test('V156 queued and active meat tasks preserve physical reservations across save and reject V155 declaration',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',7,{x:6,z:6},'hare-meat');
  addGroundMaterial(world,'food',8,{x:7,z:6},'deer-meat');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:ITEM}).ok).toBe(true);
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected queued cooking proposal');
  expect(validCookingOrder(proposal.order,world)).toBe(true);
  pawn.orders.queue.push(proposal.order);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const oldQueue=structuredClone(world);for(const policy of oldQueue.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM&&item!=='vegetarian-lavish-meal'&&item!=='carnivore-lavish-meal');
  (oldQueue as {schemaVersion:number}).schemaVersion=155;
  expect(()=>deserializeWorld(JSON.stringify(oldQueue))).toThrow(/Invalid version 155 save/);
  pawn.orders.queue=[];stove.bills![0]!.destination='drop';
  for(let i=0;i<800&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  expect(validateWorld(world)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(resumed,30);expect(resumed).toEqual(world);
  const oldActive=structuredClone(world);for(const policy of oldActive.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM&&item!=='vegetarian-lavish-meal'&&item!=='carnivore-lavish-meal');
  (oldActive as {schemaVersion:number}).schemaVersion=155;
  expect(()=>deserializeWorld(JSON.stringify(oldActive))).toThrow(/Invalid version 155 save/);
});
