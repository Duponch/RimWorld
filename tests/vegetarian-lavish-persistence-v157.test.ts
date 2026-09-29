import {expect,test} from 'vitest';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {ensureFireState} from '../src/sim/fire-rules.ts';
import {validateFires} from '../src/sim/fire-save.ts';
import {exposeFoodPoisoning} from '../src/sim/food-poisoning.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {validCookingOrder} from '../src/sim/player-cooking-save.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import {isCookingOrder} from '../src/sim/order-types.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validateTrade} from '../src/sim/trade-save.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {medicalCamp} from './scenarios/health.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';
import {visitorTradeFixture} from './scenarios/visitors.ts';

const ITEM='vegetarian-lavish-meal' as const;
function declared156():World {
  const world=medicalCamp();
  for(const policy of world.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM);
  (world as {schemaVersion:number}).schemaVersion=156;
  return world;
}
function rejected156(change:(world:World)=>void):void {
  const world=declared156();change(world);
  expect(()=>deserializeWorld(JSON.stringify(world))).toThrow(/Invalid version 156 save/);
}

test('V156 to V157 validates first and changes only the version',()=>{
  const old=declared156(),before=structuredClone(old);
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

test('declared V156 rejects future food in piles, policy, stockpile, spoilage, illness and fire ledger',()=>{
  rejected156(w=>{addGroundMaterial(w,'food',1,{x:3,z:3},ITEM);});
  rejected156(w=>{addGroundMaterial(w,'food',1,{x:3,z:3},ITEM);w.piles.find(p=>p.item===ITEM)!.owner={type:'pawn',pawnId:w.pawns[0]!.id};});
  rejected156(w=>{w.foodPolicies[0]!.allowed.push(ITEM);});
  rejected156(w=>{w.spoiled[ITEM]=1;});
  rejected156(w=>{expect(applyCommand(w,{type:'stockpile',enabled:true,x:3,z:3,capacity:10,filters:{wood:false,food:true}}).ok).toBe(true);w.stockpiles[0]!.items={[ITEM]:true};});
  rejected156(w=>{const pawn=w.pawns[0]!;pawn.health=createMedicalRecord(w.tick);pawn.health.foodPoisoning=exposeFoodPoisoning(undefined,'filthy-kitchen',ITEM,w.tick);});
  rejected156(w=>{ensureFireState(w).ledger.items[ITEM]=1;});
});

test('declared V156 rejects future bills and output filters on active or packed stoves',()=>{
  rejected156(w=>{fixtureFoodStation(w,'fueled-stove').bills!.push(newCookingBill(w.nextId++,ITEM));});
  rejected156(w=>{const stove=fixtureFoodStation(w,'fueled-stove'),bill=newCookingBill(w.nextId++,'simple-meal');(bill.filters as Record<string,boolean>)[ITEM]=true;stove.bills!.push(bill);});
  rejected156(w=>{const stove=fixtureFoodStation(w,'fueled-stove');w.structures=w.structures.filter(s=>s!==stove);w.packed.push({building:stove,owner:{type:'ground',x:stove.x,z:stove.z}});stove.bills!.push(newCookingBill(w.nextId++,ITEM));});
});

test('V156 trade receipts and frozen visitor cargo reject the new meal',()=>{
  const world=medicalCamp(2),[negotiator,trader]=world.pawns;
  world.trade={count:1,silverPaid:0,silverReceived:10,forgone:0,bought:{},sold:{[ITEM]:1},recent:[{tick:world.tick,negotiatorId:negotiator!.id,traderId:trader!.id,silver:-10,forgone:0,lines:[{item:ITEM,quantity:-1,unitPrice:10}]}]};
  expect(validateTrade(world,157)).toEqual([]);
  expect(validateTrade(world,156)).toContain('Invalid trade item totals.');
  expect(validateTrade(world,156)).toContain('Invalid traded line.');
  const fire=ensureFireState(world);fire.ledger.items[ITEM]=1;
  expect(validateFires(world,157)).toEqual([]);
  expect(validateFires(world,156)).toContain('Invalid fire loss ledger.');
  const {world:visitorWorld,traderId}=visitorTradeFixture();
  for(let i=0;i<3500&&!visitorWorld.visitors?.departed.some(d=>d.pawn.id===traderId);i++)stepWorld(visitorWorld);
  const departure=visitorWorld.visitors!.departed.find(d=>d.pawn.id===traderId)!;
  expect(departure).toBeDefined();
  const old=structuredClone(visitorWorld);
  for(const policy of old.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM);
  (old as {schemaVersion:number}).schemaVersion=156;
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  const withFood=structuredClone(old),food=withFood.visitors!.departed[0]!.items.find(item=>item.kind==='food')!;
  expect(food).toBeDefined();food.item=ITEM;food.quantity=1;food.rot={progress:0,atTick:departure.tick};
  expect(()=>deserializeWorld(JSON.stringify(withFood))).toThrow(/Invalid version 156 save/);
});

test('V157 queued and active tasks preserve physical reservations and reject V156 declaration',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',12,{x:6,z:6},'rice');
  addGroundMaterial(world,'food',13,{x:7,z:6},'milk');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:ITEM}).ok).toBe(true);
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected queued cooking proposal');
  expect(validCookingOrder(proposal.order,world),JSON.stringify(proposal.order)).toBe(true);
  pawn.orders.queue.push(proposal.order);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const oldQueue=structuredClone(world);for(const policy of oldQueue.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM);
  (oldQueue as {schemaVersion:number}).schemaVersion=156;
  expect(()=>deserializeWorld(JSON.stringify(oldQueue))).toThrow(/Invalid version 156 save/);
  pawn.orders.queue=[];stove.bills![0]!.destination='drop';
  for(let i=0;i<800&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  expect(validateWorld(world)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(resumed,30);expect(resumed).toEqual(world);
  const oldActive=structuredClone(world);for(const policy of oldActive.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM);
  (oldActive as {schemaVersion:number}).schemaVersion=156;
  expect(()=>deserializeWorld(JSON.stringify(oldActive))).toThrow(/Invalid version 156 save/);
});
