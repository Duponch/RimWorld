import { withoutHunting } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { animalCombatCamp } from './scenarios/animal-combat';
import { huntingCamp } from './scenarios/hunting';
import { advanceCorpses,pickUpRetainedCorpse,corpseFresh,corpseStage,corpseYield,CORPSE_ROT_TICKS,CORPSE_DESSICATION_TICKS } from '../src/sim/corpses';
import { validateCorpses,validCorpseShape } from '../src/sim/corpse-save';
import { createMedicalRecord } from '../src/sim/injury-state';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health';
import { moveAnimal,animalNavigation } from '../src/sim/wildlife-navigation';
import { addMaterial,refreshStock,transferPile } from '../src/sim/materials';
import { rotAge } from '../src/sim/food-preservation';
import { expireFood } from '../src/sim/food-expiration';
import { updateFoodTemperatures } from '../src/sim/thermal-food';
import { foodScore } from '../src/sim/food-selection';
import { animalFoods,animalMealTarget } from '../src/sim/wildlife-food';
import { validateFoodPolicies } from '../src/sim/food-policy-save';
import type { World } from '../src/sim/types';

function field(){const w=animalCombatCamp();w.piles=[];w.pawns=w.pawns.slice(0,1);w.stockpiles=[];w.resources=[];const p=w.pawns[0]!;
  delete p.draft;delete p.shooting;Object.assign(p,{x:9,z:10,hunger:100,rest:100});for(const key of Object.keys(p.priorities))p.priorities[key as keyof typeof p.priorities]=0;
  p.schedule.fill('anything');refreshStock(w);return w;}
function kill(w:World){const a=w.wildlife!.animals[0]!;a.health={...createMedicalRecord(w.tick),body:'hare',bloodLoss:BLOOD_UNIT,death:{tick:w.tick,cause:'blood-loss'}};reconcileAnimalHealth(w,a);return a;}
function corpse(w:World){kill(w);advanceCorpses(w);return w.piles.find(p=>p.corpse)!;}

test('corpse replacement waits for the physical fall and occupied floor, retaining identity, medical history and age',()=>{
  const w=field(),start=w.tick,a=w.wildlife!.animals[0]!;a.path=[{x:11,z:11}];moveAnimal(w,a,animalNavigation(w).step);const edge=structuredClone(a.motion!);kill(w);
  advanceCorpses(w);expect(w.piles).toEqual([]);expect(a.motion).toEqual(edge);expect(a.corpseRot).toEqual({progress:0,atTick:start});
  addMaterial(w,'wood',1,{type:'ground',x:a.x,z:a.z});const blocker=w.piles[0]!;
  w.tick=Math.ceil(edge.end)+1;advanceCorpses(w);expect(w.wildlife!.animals).toContain(a);expect(w.piles).toEqual([blocker]);
  const state=serializeWorld(w);expect(serializeWorld(deserializeWorld(state))).toBe(state);
  expect(transferPile(w,blocker,{type:'ground',x:12,z:11})).toBe(true);const next=w.nextId;advanceCorpses(w);
  const p=w.piles.find(p=>p.corpse)!;expect(p).toMatchObject({id:a.id,kind:'corpse',item:'hare-corpse',quantity:1,owner:{type:'ground',x:11,z:11},corpse:{animalId:a.id,health:a.health}});
  expect(w.wildlife!.animals).toEqual([]);expect(w.nextId).toBe(next);expect(rotAge(p,w.tick)).toBe(w.tick-start);expect(validateWorld(w)).toEqual([]);
  advanceCorpses(w);expect(w.piles.filter(p=>p.corpse)).toHaveLength(1);expect(()=>addMaterial(w,'corpse',1,{type:'ground',x:14,z:14},'hare-corpse')).toThrow();
});

test('ordinary transport carries the whole corpse, reserves storage, retains identity and replays an interrupted pickup exactly',()=>{
  for(const rotting of [false,true]){
  const w=field(),body=corpse(w),p=w.pawns[0]!,id=body.id;const snapshot=structuredClone(body.corpse);
  if(rotting){w.tick+=CORPSE_ROT_TICKS;body.rot={progress:CORPSE_ROT_TICKS,atTick:w.tick};}
  expect(applyCommand(w,{type:'stockpile',x:15,z:15,enabled:true,filters:{food:false,wood:false,corpse:true}}).ok).toBe(true);
  p.priorities.haul=1;stepWorld(w);expect(p.haul?.phase).toBe('deliver');expect(body.owner).toEqual({type:'pawn',pawnId:p.id});expect(body.id).toBe(id);expect(p.haul?.carryPileId).toBe(id);
  expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));
  stepWorld(w,100);stepWorld(copy,100);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
  expect(w.piles.find(q=>q.id===id)).toMatchObject({owner:{type:'ground',x:15,z:15},quantity:1,corpse:snapshot});
  expect(w.wildlife!.animals).toEqual([]);expect(w.piles.filter(q=>q.corpse)).toHaveLength(1);
  expect(corpseFresh(w.piles.find(q=>q.id===id)!,w.tick)).toBe(!rotting);
  }
});

test('cold preserves anchored corpse age through ownership changes; rotting and desiccation never erase its body',()=>{
  const w=field(),start=w.tick,p=corpse(w),carrier=w.pawns[0]!;
  w.thermal={regions:[{cells:[10*w.width+10],temperature:-5},{cells:[carrier.z*w.width+carrier.x],temperature:5}]};
  updateFoodTemperatures(w);expect(p.rot?.rate).toBe(0);w.tick=start+6000;updateFoodTemperatures(w);expect(rotAge(p,w.tick)).toBe(0);
  p.owner={type:'pawn',pawnId:carrier.id};updateFoodTemperatures(w);expect(p.rot).toEqual({progress:0,atTick:start+6000,rate:.5});
  w.tick=start+12000;expect(rotAge(p,w.tick)).toBe(3000);p.owner={type:'ground',x:12,z:12};updateFoodTemperatures(w);expect(p.rot).toEqual({progress:3000,atTick:start+12000});
  w.tick=start+12000+CORPSE_ROT_TICKS-3001;expect(corpseFresh(p,w.tick)).toBe(true);w.tick++;expect(corpseStage(p,w.tick)).toBe('rotting');expireFood(w);expect(w.piles).toContain(p);
  w.tick+=CORPSE_DESSICATION_TICKS-CORPSE_ROT_TICKS;expect(corpseStage(p,w.tick)).toBe('desiccated');expireFood(w);expect(w.piles).toContain(p);expect(validateCorpses(w,79)).toEqual([]);
  const held=field(),heldStart=held.tick,a=kill(held);addMaterial(held,'wood',1,{type:'ground',x:a.x,z:a.z});advanceCorpses(held);
  held.thermal={regions:[{cells:[a.z*held.width+a.x],temperature:-10}]};updateFoodTemperatures(held);expect(a.corpseRot?.rate).toBe(0);
  held.tick+=500;advanceCorpses(held);expect(a.corpseRot).toEqual({progress:0,atTick:heldStart,rate:0});expect(held.wildlife!.animals).toContain(a);
});

test('butchery yield uses exact natural coverage and one nonpermanent-injury penalty before efficiency or rounding',()=>{
  const w=field(),p=corpse(w),h=p.corpse!.health;
  expect(corpseYield(p).meat).toBeCloseTo(31.0857142857,9);expect(corpseYield(p).leather).toBeCloseTo(16.2285714286,9);
  h.injuries.push({id:1,part:'torso',kind:'gunshot',severity:1000,bornAt:0});h.nextInjuryId=2;
  expect(corpseYield(p).meat).toBeCloseTo(24.0137142857,9);expect(corpseYield(p).leather).toBeCloseTo(14.208,9);
  h.injuries[0]!.scar={threshold:1000};expect(corpseYield(p).meat).toBeCloseTo(31.0857142857,9);
  h.injuries=[];h.missing=[{part:'left-front-leg',bornAt:0}];const lost=corpseYield(p);expect(lost.meat).toBeCloseTo(14+(140*.2*.93-5)*26/35,9);
  expect(lost.leather).toBeCloseTo(14+(40*.2*.93-5)*26/35,9);expect(validateCorpses(w,79)).toEqual([]);
});

test('corpse persistence refuses forged identities, live anatomy, duplicate representation, impossible age and pre-V79 fields',()=>{
  const w=field(),p=corpse(w);expect(validateWorld(w)).toEqual([]);expect(validCorpseShape(p as any,78)).toBe(false);
  const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
  for(const change of [(q:any)=>q.piles[0].corpse.animalId++, (q:any)=>delete q.piles[0].corpse.health.death,
    (q:any)=>q.piles[0].rot.progress=1,(q:any)=>q.piles[0].quantity=2,(q:any)=>q.piles[0].corpse.health.body=undefined,
    (q:any)=>q.schemaVersion=78,(q:any)=>q.piles[0].owner={type:'equipment',pawnId:w.pawns[0]!.id},(q:any)=>{q.wildlife={profile:'temperate-hares-v1'};q.hunting={targets:[p.id],completed:0};}]){
    const broken=JSON.parse(saved);change(broken);expect(validateWorld(broken).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(broken))).toThrow();
  }
  const meat=field();addMaterial(meat,'food',3,{type:'ground',x:14,z:14},'hare-meat');meat.tick+=12000;expireFood(meat);expect(meat.spoiled['hare-meat']).toBe(3);expect(meat.piles).toEqual([]);
  const prior=field();kill(prior);const old=JSON.parse(JSON.stringify(prior));old.schemaVersion=78;withoutHunting(old);
  const resumed=deserializeWorld(JSON.stringify(old));expect(resumed.piles).toEqual([]);expect(resumed.wildlife!.animals[0]!.corpseRot).toBeUndefined();
  stepWorld(resumed);expect(resumed.wildlife!.animals).toEqual([]);expect(resumed.piles[0]).toMatchObject({kind:'corpse',rot:{progress:0,atTick:prior.tick+1}});
  old.wildlife.animals[0].corpseRot={progress:0,atTick:0};expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
  delete old.wildlife.animals[0].corpseRot;old.stockpiles.push({id:old.nextId++,x:5,z:5,capacity:75,priority:2,filters:{food:false,wood:false,corpse:true}});
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 78/);
});

test('a hunter lifts a retained body at physical contact after its fall, including furniture and occupied floor, with exact continuation',()=>{
  for(const obstacle of ['bed','campfire','pile'] as const){
    const w=huntingCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;w.pawns=[p];w.resources=[];w.piles=w.piles.filter(i=>i.kind==='weapon');
    if(obstacle==='pile')addMaterial(w,'wood',7,{type:'ground',x:11,z:10});
    else w.structures.push({id:w.nextId++,kind:obstacle,x:11,z:10,orientation:0,footprint:'standard',...obstacle==='campfire'?{fuel:{ticks:0,burned:0,autoRefuel:false},bills:[]}:{quality:'normal'}});
    const fixture=structuredClone({structures:w.structures,piles:w.piles});
    a.path=[{x:11,z:10}];expect(moveAnimal(w,a,animalNavigation(w).step)).toBe(true);kill(w);
    p.hunting={animalId:a.id,phase:'collect',progress:0,startedAt:w.tick};w.hunting={targets:[],completed:1};advanceCorpses(w);refreshStock(w);
    const death=w.tick,edge=structuredClone(a.motion!),nextId=w.nextId;
    expect(pickUpRetainedCorpse(w,p,a.id)).toBeNull();expect(w.wildlife!.animals).toContain(a);expect(validateWorld(w)).toEqual([]);
    for(let i=0;i<100&&!(p.hunting&&p.path.length&&w.tick>=edge.end);i++)stepWorld(w);
    expect(p.hunting?.phase).toBe('collect');expect(p.path.length).toBeGreaterThan(0);expect(w.piles.some(i=>i.kind==='corpse')).toBe(false);
    const checkpoint=serializeWorld(w),copy=deserializeWorld(checkpoint);
    for(let i=0;i<150;i++){
      stepWorld(w);stepWorld(copy);const held=w.piles.find(i=>i.id===a.id);
      if(held?.owner.type==='pawn'){
        expect(w.tick).toBeGreaterThanOrEqual(edge.end);expect(p.haul?.pickupCell).toEqual({x:a.x,z:a.z});
        expect(w.wildlife!.animals).toHaveLength(0);expect(p.hunting).toBeUndefined();expect(p.haul?.destination).toMatchObject({forHunting:true});
      }
      expect(validateWorld(w)).toEqual([]);
      if(held?.owner.type==='ground'&&!p.haul)break;
    }
    expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(w.nextId).toBe(nextId);
    const body=w.piles.find(i=>i.id===a.id)!;
    expect(body).toMatchObject({kind:'corpse',quantity:1,owner:{type:'ground',x:8,z:8},corpse:{animalId:a.id,health:a.health,facing:Math.PI/2}});
    expect(rotAge(body,w.tick)).toBe(w.tick-death);expect(w.structures).toEqual(fixture.structures);
    expect(w.piles.filter(i=>i.id!==a.id)).toEqual(fixture.piles);
    // A destination consumed during the saved approach must not teleport the
    // body or leave the hunter trapped in collection without a usable zone.
    const full=deserializeWorld(checkpoint),hunter=full.pawns[0]!;addMaterial(full,'wood',1,{type:'ground',x:8,z:8});
    stepWorld(full,100);expect(hunter.hunting).toBeUndefined();expect(hunter.haul).toBeNull();expect(full.wildlife!.animals.some(i=>i.id===a.id)).toBe(true);
    expect(full.piles.some(i=>i.id===a.id)).toBe(false);expect(validateWorld(full)).toEqual([]);
  }
});

test('raw hare meat has raw-food preference and memory, is consumed physically under policy, and is refused by herbivores',()=>{
  const w=field(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;p.hunger=20;
  addMaterial(w,'food',20,{type:'ground',x:10,z:10},'hare-meat');const food=w.piles[0]!;
  expect(foodScore('hare-meat',3)).toBe(foodScore('rice',3));expect(foodScore('hare-meat',0)).toBeLessThan(foodScore('berries',0));
  expect(animalFoods(w,a)).toEqual([]);a.meal={kind:'pile',id:food.id,quantity:4,progress:0};expect(animalMealTarget(w,a)).toBeUndefined();delete a.meal;
  const policy=w.foodPolicies.find(f=>f.id===p.foodPolicyId)!;policy.allowed=[];stepWorld(w,25);expect(p.need).toBeNull();expect(food.quantity).toBe(20);
  expect(applyCommand(w,{type:'food-policy-update',policyId:policy.id,name:policy.name,allowed:['hare-meat']}).ok).toBe(true);
  let chewing=false;for(let i=0;i<200&&!p.memories.some(m=>m.kind==='ate-raw-food');i++){
    stepWorld(w);if(p.need?.kind==='eat'&&p.need.phase==='ingest'){chewing=true;expect(w.piles.some(f=>f.owner.type==='pawn'&&f.owner.pawnId===p.id&&f.item==='hare-meat')).toBe(true);expect(p.hunger).toBeLessThan(21);}
  }
  expect(chewing).toBe(true);expect(p.memories).toContainEqual({kind:'ate-raw-food',expiresAt:w.tick+6000});expect(p.hunger).toBeGreaterThan(95);expect(w.wildlife!.eatenItems).toBe(0);expect(validateWorld(w)).toEqual([]);
  expect(validateFoodPolicies(w,78)).toContain('Invalid food policy.');
});
