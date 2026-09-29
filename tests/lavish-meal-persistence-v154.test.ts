import { expect, test } from 'vitest';
import { billWanted, countedProducts, newCookingBill } from '../src/sim/cooking-bills.ts';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { ensureFireState } from '../src/sim/fire-rules.ts';
import { validateFires } from '../src/sim/fire-save.ts';
import { exposeFoodPoisoning } from '../src/sim/food-poisoning.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial, refreshStock } from '../src/sim/materials.ts';
import { validCookingOrder } from '../src/sim/player-cooking-save.ts';
import { planCookingOrder } from '../src/sim/player-cooking.ts';
import { isCookingOrder } from '../src/sim/order-types.ts';
import { validLavishMealIngredients } from '../src/sim/production-recipes.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { validateTrade } from '../src/sim/trade-save.ts';
import { SCHEMA_VERSION, type World } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';
import { foodWorkstationCamp, fixtureFoodStation } from './scenarios/food-workstations.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';

function declared152(count=1): World {
  const world=medicalCamp(count);
  for(const policy of world.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!=='lavish-meal'&&item!=='vegetarian-fine-meal'&&item!=='carnivore-fine-meal'&&item!=='vegetarian-lavish-meal');
  (world as {schemaVersion:number}).schemaVersion=152;
  return world;
}
function rejectedV152(change:(world:World)=>void):void {
  const world=declared152();change(world);
  expect(()=>deserializeWorld(JSON.stringify(world))).toThrow(/Invalid version 152 save/);
}

test('V152 to V154 changes only schema version and preserves deterministic continuation',()=>{
  const old=declared152(),before=structuredClone(old);
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

test('declared V152 rejects lavish meals in piles, storage, policies and spoilage',()=>{
  rejectedV152(w=>{addGroundMaterial(w,'food',1,{x:3,z:3},'lavish-meal');});
  rejectedV152(w=>{w.foodPolicies[0]!.allowed.push('lavish-meal');});
  rejectedV152(w=>{w.spoiled['lavish-meal']=1;});
  rejectedV152(w=>{
    expect(applyCommand(w,{type:'stockpile',enabled:true,x:3,z:3,capacity:10,filters:{wood:false,food:true}}).ok).toBe(true);
    w.stockpiles[0]!.items={'lavish-meal':true};
  });
  rejectedV152(w=>{
    addGroundMaterial(w,'food',1,{x:3,z:3},'lavish-meal');
    w.piles.find(p=>p.item==='lavish-meal')!.foodPoison={fraction:.25,cause:'filthy-kitchen'};
  });
});

test('declared V152 rejects future memory, illness, bill and product filter on built or packed stoves',()=>{
  rejectedV152(w=>{w.pawns[0]!.memories.push({kind:'ate-lavish-meal',expiresAt:w.tick+100});});
  rejectedV152(w=>{
    const pawn=w.pawns[0]!;pawn.health=createMedicalRecord(w.tick);
    pawn.health.foodPoisoning=exposeFoodPoisoning(undefined,'filthy-kitchen','lavish-meal',w.tick);
  });
  rejectedV152(w=>{
    const stove=fixtureFoodStation(w,'fueled-stove');
    stove.bills!.push(newCookingBill(w.nextId++,'lavish-meal'));
  });
  rejectedV152(w=>{
    const stove=fixtureFoodStation(w,'fueled-stove');
    const bill=newCookingBill(w.nextId++,'simple-meal');
    (bill.filters as Record<string,boolean>)['lavish-meal']=true;
    stove.bills!.push(bill);
  });
  rejectedV152(w=>{
    const stove=fixtureFoodStation(w,'fueled-stove');
    w.structures=w.structures.filter(s=>s!==stove);
    w.packed.push({building:stove,owner:{type:'ground',x:stove.x,z:stove.z}});
    stove.bills!.push(newCookingBill(w.nextId++,'lavish-meal'));
  });
});

test('V154 meal pile, age and contamination round-trip without retroactive spoilage',()=>{
  const world=medicalCamp();
  world.foodPolicies[0]!.allowed=['lavish-meal'];
  addGroundMaterial(world,'food',2,{x:3,z:3},'lavish-meal');
  const meal=world.piles.find(p=>p.item==='lavish-meal')!;
  meal.foodPoison={fraction:.5,cause:'filthy-kitchen'};
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  meal.rot={progress:4*6000-1,atTick:world.tick};
  world.pawns=[];
  stepWorld(world);
  expect(world.piles.some(p=>p.item==='lavish-meal')).toBe(false);
  expect(world.spoiled['lavish-meal']).toBe(2);
  expect(validateWorld(world)).toEqual([]);
});

test('until-X counts fine and lavish meals only while their stockpile admits them',()=>{
  for(const recipe of ['fine-meal','lavish-meal'] as const){
    const world=medicalCamp();
    expect(applyCommand(world,{type:'stockpile',enabled:true,x:3,z:3,capacity:10,filters:{wood:false,food:true},items:{[recipe]:true}}).ok).toBe(true);
    addGroundMaterial(world,'food',1,{x:3,z:3},recipe);
    const bill={...newCookingBill(world.nextId++,recipe),mode:'until' as const,target:1};
    expect(countedProducts(world,bill)).toBe(1);
    expect(billWanted(world,bill)).toBe(false);
    expect(applyCommand(world,{type:'stockpile',enabled:true,x:3,z:3,items:{[recipe]:false}}).ok).toBe(true);
    expect(countedProducts(world,bill)).toBe(0);
    expect(billWanted(world,bill)).toBe(true);
    expect(applyCommand(world,{type:'stockpile',enabled:true,x:3,z:3,items:{[recipe]:true},filters:{wood:false,food:false}}).ok).toBe(true);
    expect(countedProducts(world,bill)).toBe(0);
    expect(applyCommand(world,{type:'stockpile',enabled:true,x:3,z:3,filters:{wood:false,food:true}}).ok).toBe(true);
    expect(countedProducts(world,bill)).toBe(1);
    expect(billWanted(world,bill)).toBe(false);
  }
});

test('queued lavish reservations require exactly ten protein and ten vegetables',()=>{
  const world=medicalCamp();
  const base={cooking:{recipe:'lavish-meal',stationId:1,billId:2,spot:{x:10,z:10},actionCell:{x:10,z:11},phase:'gather',progress:0,productId:null,storageId:null,
    ingredients:[{pileId:3,item:'milk',quantity:6,stage:'source',cell:{x:9,z:10}},{pileId:4,item:'hare-meat',quantity:4,stage:'source',cell:{x:9,z:11}},{pileId:5,item:'rice',quantity:10,stage:'source',cell:{x:10,z:10}}]}};
  expect(validLavishMealIngredients([{item:'milk',quantity:6},{item:'hare-meat',quantity:4},{item:'rice',quantity:10}])).toBe(true);
  expect(validCookingOrder(base,world)).toBe(true);
  const allVegetable=structuredClone(base);allVegetable.cooking.ingredients[0]!.item='rice';allVegetable.cooking.ingredients[1]!.item='rice';
  expect(validCookingOrder(allVegetable,world)).toBe(false);
  expect(validCookingOrder(base,declared152())).toBe(false);
});

test('V154 rejects simultaneous fine and lavish memories and a meal product as bill input',()=>{
  const world=medicalCamp(),pawn=world.pawns[0]!;
  pawn.memories.push({kind:'ate-fine-meal',expiresAt:world.tick+100},{kind:'ate-lavish-meal',expiresAt:world.tick+100});
  expect(validateWorld(world)).toContain('Conflicting meal memories.');
  pawn.memories.pop();
  const stove=fixtureFoodStation(world,'fueled-stove'),bill=newCookingBill(world.nextId++,'lavish-meal');
  (bill.filters as Record<string,boolean>)['lavish-meal']=true;stove.bills!.push(bill);
  expect(validateWorld(world)).toContain('Invalid cooking bill.');
});

test('fire and trade ledgers reject future meal identities before their schema',()=>{
  const world=medicalCamp(2),fire=ensureFireState(world);
  fire.ledger.items['lavish-meal']=1;
  expect(validateFires(world,154)).toEqual([]);
  expect(validateFires(world,152)).toContain('Invalid fire loss ledger.');
  delete fire.ledger.items['lavish-meal'];fire.ledger.items['fine-meal']=1;
  expect(validateFires(world,152)).toEqual([]);
  expect(validateFires(world,150)).toContain('Invalid fire loss ledger.');

  const [negotiator,trader]=world.pawns;
  world.trade={count:1,silverPaid:0,silverReceived:10,forgone:0,bought:{},sold:{'lavish-meal':1},recent:[{tick:world.tick,negotiatorId:negotiator!.id,traderId:trader!.id,silver:-10,forgone:0,lines:[{item:'lavish-meal',quantity:-1,unitPrice:10}]}]};
  expect(validateTrade(world,154)).toEqual([]);
  expect(validateTrade(world,152)).toContain('Invalid trade item totals.');
  expect(validateTrade(world,152)).toContain('Invalid traded line.');
  world.trade.sold={'fine-meal':1};world.trade.recent[0]!.lines=[{item:'fine-meal',quantity:-1,unitPrice:10}];
  expect(validateTrade(world,152)).toEqual([]);
  expect(validateTrade(world,150)).toContain('Invalid trade item totals.');
  expect(validateTrade(world,150)).toContain('Invalid traded line.');
  rejectedV152(w=>{ensureFireState(w).ledger.items['lavish-meal']=1;});
  const old=declared152(2);
  old.trade=structuredClone(world.trade);
  old.trade.sold={'lavish-meal':1};old.trade.recent[0]!.lines=[{item:'lavish-meal',quantity:-1,unitPrice:10}];
  expect(validateTrade(old,154)).toEqual([]);
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 152 save/);
});

test('a queued physical lavish order survives save and V152 rejects its future recipe',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',10,{x:6,z:6},'milk');
  addGroundMaterial(world,'food',10,{x:7,z:6},'rice');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:'lavish-meal'}).ok).toBe(true);
  const proposal=planCookingOrder(world,pawn,stove.id);
  expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected a queued cooking proposal.');
  pawn.orders.queue.push(proposal.order);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const old=structuredClone(world);for(const policy of old.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!=='lavish-meal'&&item!=='vegetarian-fine-meal'&&item!=='carnivore-fine-meal'&&item!=='vegetarian-lavish-meal');
  (old as {schemaVersion:number}).schemaVersion=152;
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 152 save/);
});

test('declared V152 rejects a lavish memory and possession in a frozen visitor archive',()=>{
  const {world,traderId}=visitorTradeFixture();
  for(let i=0;i<3500&&!world.visitors?.departed.some(d=>d.pawn.id===traderId);i++)stepWorld(world);
  const departure=world.visitors!.departed.find(d=>d.pawn.id===traderId)!;
  expect(departure).toBeDefined();
  const old=structuredClone(world);for(const policy of old.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!=='lavish-meal'&&item!=='vegetarian-fine-meal'&&item!=='carnivore-fine-meal'&&item!=='vegetarian-lavish-meal');
  (old as {schemaVersion:number}).schemaVersion=152;
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  const withMemory=structuredClone(old);
  withMemory.visitors!.departed[0]!.pawn.memories.push({kind:'ate-lavish-meal',expiresAt:departure.tick+100});
  expect(validateWorld({...withMemory,schemaVersion:SCHEMA_VERSION})).toEqual([]);
  expect(()=>deserializeWorld(JSON.stringify(withMemory))).toThrow(/Invalid version 152 save/);
  const withFood=structuredClone(old),food=withFood.visitors!.departed[0]!.items.find(item=>item.kind==='food')!;
  expect(food).toBeDefined();food.item='lavish-meal';food.quantity=1;food.rot={progress:0,atTick:departure.tick};
  expect(validateWorld({...withFood,schemaVersion:SCHEMA_VERSION})).toEqual([]);
  expect(()=>deserializeWorld(JSON.stringify(withFood))).toThrow(/Invalid version 152 save/);
});

test('a physically reserved lavish task is continuable and forbidden in a declared V152 save',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,stove=fixtureFoodStation(world,'fueled-stove');
  pawn.priorities.cook=1;stove.fuel!.ticks=6000;
  addGroundMaterial(world,'food',10,{x:6,z:6},'milk');
  addGroundMaterial(world,'food',10,{x:7,z:6},'rice');refreshStock(world);
  expect(applyCommand(world,{type:'bill-add',structureId:stove.id,recipe:'lavish-meal'}).ok).toBe(true);
  stove.bills![0]!.destination='drop';
  for(let i=0;i<800&&!(pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('work');
  expect(validLavishMealIngredients(pawn.cooking!.ingredients)).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  const continued=deserializeWorld(serializeWorld(world));
  stepWorld(world,30);stepWorld(continued,30);expect(continued).toEqual(world);
  const old=structuredClone(world);for(const policy of old.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!=='lavish-meal'&&item!=='vegetarian-fine-meal'&&item!=='carnivore-fine-meal'&&item!=='vegetarian-lavish-meal');
  (old as {schemaVersion:number}).schemaVersion=152;
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 152 save/);
  for(let i=0;i<800&&pawn.cooking?.phase!=='output';i++)stepWorld(world);
  expect(pawn.cooking?.phase).toBe('output');
  expect(validateWorld(world)).toEqual([]);
  const wrongProduct=structuredClone(world),carried=wrongProduct.piles.find(p=>p.id===pawn.cooking!.productId)!;
  carried.item='fine-meal';
  expect(validateWorld(wrongProduct)).toContain('Invalid cooked product ownership.');
});
