import { expect, test } from 'vitest';
import { newCookingBill } from '../src/sim/cooking-bills.ts';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { ensureFireState } from '../src/sim/fire-rules.ts';
import { validateFires } from '../src/sim/fire-save.ts';
import { exposeFoodPoisoning } from '../src/sim/food-poisoning.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial, refreshStock } from '../src/sim/materials.ts';
import { validCookingOrder } from '../src/sim/player-cooking-save.ts';
import { planCookingOrder } from '../src/sim/player-cooking.ts';
import { isCookingOrder } from '../src/sim/order-types.ts';
import { validVegetarianFineMealIngredients } from '../src/sim/production-recipes.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { validateTrade } from '../src/sim/trade-save.ts';
import { SCHEMA_VERSION, type World } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';
import { foodWorkstationCamp, fixtureFoodStation } from './scenarios/food-workstations.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';
import { withoutPlantsSkill } from './scenarios/legacy-skills.ts';

const ITEM = 'vegetarian-fine-meal' as const;

function declared154(count=1): World {
  const world=medicalCamp(count);
  for(const policy of world.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM&&item!=='carnivore-fine-meal'&&item!=='vegetarian-lavish-meal'&&item!=='carnivore-lavish-meal');
  withoutPlantsSkill(world);
  (world as {schemaVersion:number}).schemaVersion=154;
  return world;
}
function rejected154(change:(world:World)=>void):void {
  const world=declared154();change(world);
  expect(()=>deserializeWorld(JSON.stringify(world))).toThrow(/Invalid version 154 save/);
}

test('V154 to V155 changes only schema version and preserves deterministic continuation',()=>{
  const old=declared154(),before=structuredClone(old);
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

test('declared V154 rejects future piles, carried food, storage, policy, spoilage and illness',()=>{
  rejected154(w=>{addGroundMaterial(w,'food',1,{x:3,z:3},ITEM);});
  rejected154(w=>{
    addGroundMaterial(w,'food',1,{x:3,z:3},ITEM);
    w.piles.find(p=>p.item===ITEM)!.owner={type:'pawn',pawnId:w.pawns[0]!.id};
  });
  rejected154(w=>{w.foodPolicies[0]!.allowed.push(ITEM);});
  rejected154(w=>{w.spoiled[ITEM]=1;});
  rejected154(w=>{
    expect(applyCommand(w,{type:'stockpile',enabled:true,x:3,z:3,capacity:10,filters:{wood:false,food:true}}).ok).toBe(true);
    w.stockpiles[0]!.items={[ITEM]:true};
  });
  rejected154(w=>{
    const pawn=w.pawns[0]!;pawn.health=createMedicalRecord(w.tick);
    pawn.health.foodPoisoning=exposeFoodPoisoning(undefined,'filthy-kitchen',ITEM,w.tick);
  });
  rejected154(w=>{
    addGroundMaterial(w,'food',1,{x:3,z:3},ITEM);
    w.piles.find(p=>p.item===ITEM)!.foodPoison={fraction:.25,cause:'filthy-kitchen'};
  });
});

test('declared V154 rejects future bills and filters on active and packed stoves',()=>{
  rejected154(w=>{fixtureFoodStation(w,'fueled-stove').bills!.push(newCookingBill(w.nextId++,ITEM));});
  rejected154(w=>{
    const stove=fixtureFoodStation(w,'fueled-stove'),bill=newCookingBill(w.nextId++,'simple-meal');
    (bill.filters as Record<string,boolean>)[ITEM]=true;stove.bills!.push(bill);
  });
  rejected154(w=>{
    const stove=fixtureFoodStation(w,'fueled-stove');
    w.structures=w.structures.filter(s=>s!==stove);
    w.packed.push({building:stove,owner:{type:'ground',x:stove.x,z:stove.z}});
    stove.bills!.push(newCookingBill(w.nextId++,ITEM));
  });
});

test('V155 permits distinct meal age and contamination and rejects impossible pile state',()=>{
  const world=medicalCamp();world.foodPolicies[0]!.allowed=[ITEM];
  addGroundMaterial(world,'food',2,{x:3,z:3},ITEM);
  const meal=world.piles.find(p=>p.item===ITEM)!;
  meal.foodPoison={fraction:.5,cause:'filthy-kitchen'};
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const tooMany=structuredClone(world);tooMany.piles.find(p=>p.id===meal.id)!.quantity=11;
  expect(validateWorld(tooMany)).not.toEqual([]);
  meal.rot={progress:4*6000-1,atTick:world.tick};world.pawns=[];
  stepWorld(world);
  expect(world.piles.some(p=>p.item===ITEM)).toBe(false);
  expect(world.spoiled[ITEM]).toBe(2);
  expect(validateWorld(world)).toEqual([]);
});

test('queued vegetarian fine meal accepts only fifteen eligible units and is future in V154',()=>{
  const world=medicalCamp();
  const base={cooking:{recipe:ITEM,stationId:1,billId:2,spot:{x:10,z:10},actionCell:{x:10,z:11},phase:'gather',progress:0,productId:null,storageId:null,
    ingredients:[{pileId:3,item:'milk',quantity:6,stage:'source',cell:{x:9,z:10}},{pileId:4,item:'rice',quantity:9,stage:'source',cell:{x:9,z:11}}]}};
  expect(validVegetarianFineMealIngredients(base.cooking.ingredients as never)).toBe(true);
  expect(validCookingOrder(base,world)).toBe(true);
  const short=structuredClone(base);short.cooking.ingredients[1]!.quantity=8;
  expect(validCookingOrder(short,world)).toBe(false);
  const meat=structuredClone(base);meat.cooking.ingredients[1]!.item='hare-meat';
  expect(validCookingOrder(meat,world)).toBe(false);
  expect(validCookingOrder(base,declared154())).toBe(false);
});

test('fire and trade records reject future meal identities before V155',()=>{
  const world=medicalCamp(2),fire=ensureFireState(world);
  fire.ledger.items[ITEM]=1;
  expect(validateFires(world,155)).toEqual([]);
  expect(validateFires(world,154)).toContain('Invalid fire loss ledger.');
  delete fire.ledger.items[ITEM];
  const [negotiator,trader]=world.pawns;
  world.trade={count:1,silverPaid:0,silverReceived:10,forgone:0,bought:{},sold:{[ITEM]:1},recent:[{tick:world.tick,negotiatorId:negotiator!.id,traderId:trader!.id,silver:-10,forgone:0,lines:[{item:ITEM,quantity:-1,unitPrice:10}]}]};
  expect(validateTrade(world,155)).toEqual([]);
  expect(validateTrade(world,154)).toContain('Invalid trade item totals.');
  expect(validateTrade(world,154)).toContain('Invalid traded line.');
  rejected154(w=>{ensureFireState(w).ledger.items[ITEM]=1;});
});

test('queued and active physical vegetarian tasks survive V155 and cannot appear in V154',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',6,{x:6,z:6},'milk');
  addGroundMaterial(world,'food',9,{x:7,z:6},'rice');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:ITEM}).ok).toBe(true);
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected a queued cooking proposal.');
  pawn.orders.queue.push(proposal.order);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const oldQueue=withoutPlantsSkill(structuredClone(world));
  for(const policy of oldQueue.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM&&item!=='carnivore-fine-meal'&&item!=='vegetarian-lavish-meal'&&item!=='carnivore-lavish-meal');
  (oldQueue as {schemaVersion:number}).schemaVersion=154;
  expect(()=>deserializeWorld(JSON.stringify(oldQueue))).toThrow(/Invalid version 154 save/);
  pawn.orders.queue=[];
  stove.bills![0]!.destination='drop';
  for(let i=0;i<800&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  expect(validVegetarianFineMealIngredients(pawn.cooking!.ingredients)).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  const continued=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(continued,30);expect(continued).toEqual(world);
  const oldActive=withoutPlantsSkill(structuredClone(world));
  for(const policy of oldActive.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM&&item!=='carnivore-fine-meal'&&item!=='vegetarian-lavish-meal'&&item!=='carnivore-lavish-meal');
  (oldActive as {schemaVersion:number}).schemaVersion=154;
  expect(()=>deserializeWorld(JSON.stringify(oldActive))).toThrow(/Invalid version 154 save/);
});

test('declared V154 rejects a new meal in a frozen visitor possession',()=>{
  const {world,traderId}=visitorTradeFixture();
  for(let i=0;i<3500&&!world.visitors?.departed.some(d=>d.pawn.id===traderId);i++)stepWorld(world);
  const departure=world.visitors!.departed.find(d=>d.pawn.id===traderId)!;
  expect(departure).toBeDefined();
  const old=withoutPlantsSkill(structuredClone(world));
  for(const policy of old.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!==ITEM&&item!=='carnivore-fine-meal'&&item!=='vegetarian-lavish-meal'&&item!=='carnivore-lavish-meal');
  (old as {schemaVersion:number}).schemaVersion=154;
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  const withFood=structuredClone(old),food=withFood.visitors!.departed[0]!.items.find(item=>item.kind==='food')!;
  expect(food).toBeDefined();food.item=ITEM;food.quantity=1;food.rot={progress:0,atTick:departure.tick};
  expect(()=>deserializeWorld(JSON.stringify(withFood))).toThrow(/Invalid version 154 save/);
});
