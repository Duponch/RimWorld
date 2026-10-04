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
import { withoutPlantsSkill, withoutTelevisionRecreation, withMigratedTelevisionRecreation } from './scenarios/legacy-skills.ts';
import {withoutPredatorFoodPolicies,withoutPredatorApparelPolicies} from './scenarios/legacy-save.ts';

const ITEM='carnivore-lavish-meal' as const;
const RECIPE='cook-carnivore-lavish-meal' as const;
function declared157():World {
  const world=medicalCamp();
  for(const policy of world.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM);
  withoutPlantsSkill(world);
  withoutPredatorFoodPolicies(world);withoutPredatorApparelPolicies(world);
  (world as {schemaVersion:number}).schemaVersion=(withoutTelevisionRecreation(world),157);
  return world;
}
function rejected157(change:(world:World)=>void):void {
  const world=declared157();change(world);
  expect(()=>deserializeWorld(JSON.stringify(world))).toThrow(/Invalid version 157 save/);
}

test('V157 to V159 validates first and changes only the version',()=>{
  const old=declared157(),before=structuredClone(old);
  const loaded=deserializeWorld(JSON.stringify(old));
  expect(loaded).toEqual(withMigratedTelevisionRecreation({...before,schemaVersion:SCHEMA_VERSION}));
  expect(old).toEqual(before);
  expect(loaded.foodPolicies).toEqual(before.foodPolicies);
  expect(loaded.rng).toBe(before.rng);
  expect(validateWorld(loaded)).toEqual([]);
  Object.assign(before,withMigratedTelevisionRecreation({...before,schemaVersion:SCHEMA_VERSION}));
  stepWorld(loaded,30);stepWorld(before,30);
  expect(loaded).toEqual(before);
});

test('declared V157 rejects future food in piles, policy, stockpile, spoilage, illness and fire ledger',()=>{
  rejected157(w=>{addGroundMaterial(w,'food',1,{x:3,z:3},ITEM);});
  rejected157(w=>{addGroundMaterial(w,'food',1,{x:3,z:3},ITEM);w.piles.find(p=>p.item===ITEM)!.owner={type:'pawn',pawnId:w.pawns[0]!.id};});
  rejected157(w=>{w.foodPolicies[0]!.allowed.push(ITEM);});
  rejected157(w=>{w.spoiled[ITEM]=1;});
  rejected157(w=>{expect(applyCommand(w,{type:'stockpile',enabled:true,x:3,z:3,capacity:10,filters:{wood:false,food:true}}).ok).toBe(true);w.stockpiles[0]!.items={[ITEM]:true};});
  rejected157(w=>{const pawn=w.pawns[0]!;pawn.health=createMedicalRecord(w.tick);pawn.health.foodPoisoning=exposeFoodPoisoning(undefined,'filthy-kitchen',ITEM,w.tick);});
  rejected157(w=>{ensureFireState(w).ledger.items[ITEM]=1;});
});

test('declared V157 rejects future bills and output filters on active or packed stoves',()=>{
  rejected157(w=>{fixtureFoodStation(w,'fueled-stove').bills!.push(newCookingBill(w.nextId++,RECIPE));});
  rejected157(w=>{const stove=fixtureFoodStation(w,'fueled-stove'),bill=newCookingBill(w.nextId++,'simple-meal');(bill.filters as Record<string,boolean>)[ITEM]=true;stove.bills!.push(bill);});
  rejected157(w=>{const stove=fixtureFoodStation(w,'fueled-stove');w.structures=w.structures.filter(s=>s!==stove);w.packed.push({building:stove,owner:{type:'ground',x:stove.x,z:stove.z}});stove.bills!.push(newCookingBill(w.nextId++,RECIPE));});
});

test('V157 trade receipts and frozen visitor cargo reject the new meal',()=>{
  const world=medicalCamp(2),[negotiator,trader]=world.pawns;
  world.trade={count:1,silverPaid:0,silverReceived:10,forgone:0,bought:{},sold:{[ITEM]:1},recent:[{tick:world.tick,negotiatorId:negotiator!.id,traderId:trader!.id,silver:-10,forgone:0,lines:[{item:ITEM,quantity:-1,unitPrice:10}]}]};
  expect(validateTrade(world,159)).toEqual([]);
  expect(validateTrade(world,157)).toContain('Invalid trade item totals.');
  expect(validateTrade(world,157)).toContain('Invalid traded line.');
  const fire=ensureFireState(world);fire.ledger.items[ITEM]=1;
  expect(validateFires(world,159)).toEqual([]);
  expect(validateFires(world,157)).toContain('Invalid fire loss ledger.');
  const {world:visitorWorld,traderId}=visitorTradeFixture();
  for(let i=0;i<3500&&!visitorWorld.visitors?.departed.some(d=>d.pawn.id===traderId);i++)stepWorld(visitorWorld);
  const departure=visitorWorld.visitors!.departed.find(d=>d.pawn.id===traderId)!;
  expect(departure).toBeDefined();
  const old=withoutPredatorApparelPolicies(withoutPredatorFoodPolicies(withoutPlantsSkill(structuredClone(visitorWorld))));
  for(const archive of old.visitors!.departed)delete archive.pawn.background;
  for(const policy of old.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM);
  (old as {schemaVersion:number}).schemaVersion=(withoutTelevisionRecreation(old),157);
  expect(deserializeWorld(JSON.stringify(old))).toEqual(withMigratedTelevisionRecreation({...old,schemaVersion:SCHEMA_VERSION}));
  const withFood=structuredClone(old),food=withFood.visitors!.departed[0]!.items.find(item=>item.kind==='food')!;
  expect(food).toBeDefined();food.item=ITEM;food.quantity=1;food.rot={progress:0,atTick:departure.tick};
  expect(()=>deserializeWorld(JSON.stringify(withFood))).toThrow(/Invalid version 157 save/);
});

test('V159 queued and active tasks preserve physical reservations and reject V157 declaration',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',25,{x:6,z:6},'snow-hare-meat');
  refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:RECIPE}).ok).toBe(true);
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected queued cooking proposal');
  expect(validCookingOrder(proposal.order,world),JSON.stringify(proposal.order)).toBe(true);
  pawn.orders.queue.push(proposal.order);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const oldQueue=withoutPredatorApparelPolicies(withoutPredatorFoodPolicies(withoutPlantsSkill(structuredClone(world))));for(const policy of oldQueue.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM);
  (oldQueue as {schemaVersion:number}).schemaVersion=(withoutTelevisionRecreation(oldQueue),157);
  expect(()=>deserializeWorld(JSON.stringify(oldQueue))).toThrow(/Invalid version 157 save/);
  pawn.orders.queue=[];stove.bills![0]!.destination='drop';
  for(let i=0;i<800&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  expect(validateWorld(world)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(resumed,30);expect(resumed).toEqual(world);
  const oldActive=withoutPredatorApparelPolicies(withoutPredatorFoodPolicies(withoutPlantsSkill(structuredClone(world))));for(const policy of oldActive.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM);
  (oldActive as {schemaVersion:number}).schemaVersion=(withoutTelevisionRecreation(oldActive),157);
  expect(()=>deserializeWorld(JSON.stringify(oldActive))).toThrow(/Invalid version 157 save/);
});
