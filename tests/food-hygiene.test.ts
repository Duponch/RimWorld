import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { expect,test } from 'vitest';
import { addGroundMaterial,applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { newCookingBill } from '../src/sim/cooking-bills';
import { roomCleanliness } from '../src/sim/filth';
import { assessMedical,createMedicalRecord,medicalPain } from '../src/sim/injury-state';
import { foodPoisoningStage,FOOD_POISON_UNIT,roomFoodPoisonChance } from '../src/sim/food-poisoning';
import { TRAVEL_TICKS } from '../src/sim/movement';
import { humanCorpseAge } from '../src/sim/human-corpses';
import { SCHEMA_VERSION,TICKS_PER_DAY,type Command,type World } from '../src/sim/types';
import { medicalCamp } from './scenarios/health';
import { medicalWorkRefusal } from '../src/sim/health-rules';

function command(w:World,c:Command):void {
  expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});
  expect(validateWorld(w)).toEqual([]);
}
function until(w:World,predicate:()=>boolean,max=400):void {
  for(let i=0;i<max&&!predicate();i++)stepWorld(w);
  expect(predicate(),JSON.stringify({tick:w.tick,pawns:w.pawns.map(p=>({state:p.state,need:p.need,cooking:p.cooking,haul:p.haul,health:p.health}))})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function replay(w:World,ticks=25):void {
  const restored=deserializeWorld(serializeWorld(w));
  for(let i=0;i<ticks;i++){stepWorld(w);stepWorld(restored);}
  expect(serializeWorld(restored)).toBe(serializeWorld(w));
}

test('physical cooking produces a risky meal once; mixing, split hauling and reload preserve its contaminated fraction',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;p.priorities.cook=1;
  const bill=newCookingBill(w.nextId++);bill.destination='drop';
  const station={id:w.nextId++,kind:'campfire' as const,x:16,z:13,orientation:0 as const,footprint:'standard' as const,bills:[bill],fuel:{ticks:6000,burned:0,autoRefuel:false}};
  w.structures.push(station);
  // Physical stock preparation, not an already completed cooking task.
  addGroundMaterial(w,'food',6,{x:11,z:15},'rice');
  addGroundMaterial(w,'food',4,{x:12,z:14},'potato');
  command(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false});
  until(w,()=>p.cooking?.phase==='work');
  expect(roomCleanliness(w,p)).toBeNull();expect(roomFoodPoisonChance(null)).toBe(.02);
  expect(w.piles.reduce((n,pile)=>n+pile.quantity,0)).toBe(10);

  // Locate the true last work checkpoint without changing recipe duration,
  // ingredients or progress. The branch below prepares the rare outdoor 2%
  // draw (xorshift seed 1), rather than claiming it happens in every colony.
  const probe=deserializeWorld(serializeWorld(w));
  until(probe,()=>probe.piles.some(pile=>pile.item==='simple-meal'));
  until(w,()=>w.tick===probe.tick-1);
  expect(p.cooking?.phase).toBe('work');w.rng=1;
  const finishing=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(finishing);
  expect(serializeWorld(finishing)).toBe(serializeWorld(w));
  const meal=w.piles.find(pile=>pile.item==='simple-meal')!;
  expect(meal).toMatchObject({quantity:1,owner:{type:'pawn',pawnId:p.id},foodPoison:{fraction:1,cause:'filthy-kitchen'}});
  expect(w.piles.some(pile=>pile.item==='rice'||pile.item==='potato')).toBe(false);
  until(w,()=>!p.cooking&&meal.owner.type==='ground');
  expect(bill.target).toBe(0);expect(w.events.filter(e=>e.message.includes('a cuisiné'))).toHaveLength(1);
  if(meal.owner.type!=='ground')throw new Error('Meal was not physically deposited');
  const sourceId=meal.id;
  addGroundMaterial(w,'food',9,meal.owner,'simple-meal');
  expect(meal.quantity).toBe(10);expect(meal.foodPoison).toEqual({fraction:.1,cause:'filthy-kitchen'});
  command(w,{type:'stockpile',enabled:true,x:21,z:16,capacity:5,priority:3,filters:{wood:false,food:true}});
  command(w,{type:'priority',pawnId:p.id,work:'haul',value:1});
  command(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:sourceId},queue:false});
  until(w,()=>p.haul?.phase==='deliver');
  const carried=w.piles.find(pile=>pile.owner.type==='pawn'&&pile.owner.pawnId===p.id)!;
  expect(carried.id).not.toBe(sourceId);expect(carried.quantity).toBe(5);expect(meal.quantity).toBe(5);
  expect(carried.foodPoison).toEqual(meal.foodPoison);expect(carried.foodPoison).not.toBe(meal.foodPoison);
  replay(w);until(w,()=>!p.haul);
  expect(w.piles.find(pile=>pile.id===carried.id)?.owner).toEqual({type:'ground',x:21,z:16});
  expect(w.piles.reduce((n,pile)=>n+pile.quantity,0)).toBe(10);
  expect(w.piles.reduce((n,pile)=>n+pile.quantity*(pile.foodPoison?.fraction??0),0)).toBeCloseTo(1,12);
});

test('a clinically contaminated meal is ingested, slows real movement, causes physical vomit and recovers after about one day with exact continuation',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;p.hunger=25;p.schedule.fill('anything');
  expect(w.gameProfile).toBeUndefined(); // Historical factor 1, not Adventure's .75.
  addGroundMaterial(w,'food',1,{x:p.x+2,z:p.z},'simple-meal');
  const food=w.piles.find(pile=>pile.item==='simple-meal')!;
  food.foodPoison={fraction:1,cause:'filthy-kitchen'}; // Announced clinical exposure only.
  addGroundMaterial(w,'medicine',5,{x:p.x-2,z:p.z},'herbal-medicine');
  until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest');
  expect(p.health?.foodPoisoning).toBeUndefined();expect(food.owner).toEqual({type:'pawn',pawnId:p.id});
  until(w,()=>!!p.health?.foodPoisoning);
  const bornAt=p.health!.foodPoisoning!.bornAt;
  expect(w.piles.some(pile=>pile.id===food.id)).toBe(false);
  expect(p.hunger).toBeGreaterThan(90);expect(p.health!.foodPoisoning).toMatchObject({severity:FOOD_POISON_UNIT,cause:'filthy-kitchen',item:'simple-meal'});
  expect(medicalPain(p.health!)).toBe(.2);expect(assessMedical(p.health!).capacities.moving).toBe(.46);
  addGroundMaterial(w,'food',10,{x:p.x-1,z:p.z+1},'survival-meal');
  const target={x:p.x+2,z:p.z};
  command(w,{type:'draft',pawnIds:[p.id],enabled:true});
  command(w,{type:'draft-move',pawnIds:[p.id],target,queue:false});
  until(w,()=>!!p.motion&&p.moveCooldown>0);
  expect(p.motion!.speedFactor).toBeLessThanOrEqual(.46);
  expect(p.motion!.end-p.motion!.start).toBeGreaterThan(TRAVEL_TICKS*2);
  until(w,()=>p.moveCooldown===0&&p.x===target.x&&p.z===target.z);
  command(w,{type:'draft',pawnIds:[p.id],enabled:false});

  const stages=new Set([foodPoisoningStage(p.health!.foodPoisoning)]);let checkedVomit=false;
  while(w.tick<bornAt+TICKS_PER_DAY+120&&p.health?.foodPoisoning){
    stepWorld(w);stages.add(foodPoisoningStage(p.health?.foodPoisoning));
    if(p.health?.foodPoisoning?.vomit&&!checkedVomit){
      const hunger=p.hunger,filth=w.filth?.items.filter(f=>f.kind==='vomit').reduce((n,f)=>n+f.thickness,0)??0;
      replay(w,15);checkedVomit=true;
      expect(p.hunger).toBeLessThanOrEqual(hunger-4);
      expect(w.filth?.items.filter(f=>f.kind==='vomit').reduce((n,f)=>n+f.thickness,0)).toBeGreaterThan(filth);
    }
    if(w.tick%100===0)expect(validateWorld(w),`clinical tick ${w.tick}`).toEqual([]);
  }
  expect(checkedVomit).toBe(true);expect(stages).toEqual(new Set(['initial','major','recovering','none']));
  expect(w.tick-bornAt).toBeGreaterThanOrEqual(TICKS_PER_DAY-20);expect(w.tick-bornAt).toBeLessThanOrEqual(TICKS_PER_DAY+120);
  expect(p.health?.foodPoisoning).toBeUndefined();expect(p.state).not.toBe('dead');
  expect(p.health!.infections).toBeUndefined();expect(assessMedical(p.health!).capacities.moving).toBe(1);
  expect(w.piles.filter(pile=>pile.kind==='medicine').reduce((n,pile)=>n+pile.quantity,0)).toBe(5);
  expect(w.piles.filter(pile=>pile.item==='survival-meal').reduce((n,pile)=>n+pile.quantity,0)).toBeLessThan(10);
  expect(w.filth?.items.some(f=>f.kind==='vomit')).toBe(true);replay(w);
},20000);

test('an active vomiting episode rejects work and group combat commands atomically, survives reload, then permits ordinary work again',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!,other=w.pawns[1]!;
  p.priorities.gather=1;
  const tree={id:w.nextId++,kind:'tree' as const,x:p.x+2,z:p.z,amount:10};w.resources.push(tree);
  command(w,{type:'designate',kind:'chop',x:tree.x,z:tree.z});
  const job=w.jobs.find(j=>j.kind==='chop')!;
  // Clinical checkpoint: the episode has already begun, with no job retained.
  // Its duration/physiology are unchanged; this tests player commands in pause.
  p.health=createMedicalRecord(w.tick);
  p.health.foodPoisoning={severity:FOOD_POISON_UNIT,bornAt:w.tick,cause:'filthy-kitchen',item:'simple-meal',vomit:{remainingCore:500,cell:{x:p.x,z:p.z+1}}};
  expect(validateWorld(w)).toEqual([]);
  expect(medicalWorkRefusal(p)).toContain('vomit');
  const blocked:Command[]=[
    {type:'order-job',pawnId:p.id,jobId:job.id,queue:false},
    {type:'order-job',pawnId:p.id,jobId:job.id,queue:true},
    {type:'clear-orders',pawnId:p.id},
    {type:'draft',pawnIds:[other.id,p.id],enabled:true},
    {type:'draft-move',pawnIds:[other.id,p.id],target:{x:p.x+3,z:p.z},queue:false},
    {type:'draft-stop',pawnIds:[other.id,p.id]},
    {type:'fire-at-will',pawnIds:[other.id,p.id],enabled:false},
    // These handlers normally run before the central civilian/combat guards.
    {type:'clean-room',pawnId:p.id,x:p.x,z:p.z},
    {type:'order-bury',pawnId:p.id,bodyPawnId:other.id},
    {type:'order-trade',pawnId:p.id,traderId:other.id},
  ];
  for(const c of blocked){
    const before=serializeWorld(w);
    expect(applyCommand(w,c)).toMatchObject({ok:false,reason:expect.stringContaining('vomit')});
    expect(serializeWorld(w)).toBe(before);
    expect(validateWorld(w)).toEqual([]);
  }
  expect(other.draft).toBeUndefined();expect(job.reservedBy).toBeNull();
  replay(w,10);expect(p.health.foodPoisoning?.vomit).toBeDefined();
  until(w,()=>!p.health?.foodPoisoning?.vomit);
  expect(medicalWorkRefusal(p)).toBeUndefined();expect(p.health.foodPoisoning).toBeDefined();
  command(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false});
  expect(p.jobId).toBe(job.id);replay(w,15);
});

test('the actual V88 colony rejects future hygiene fields before neutral migration and observes retained corpses only on its first simulated tick',()=>{
  // Project-owned final V88 colony, never a personal RimWorld save.
  const bytes=gunzipSync(readFileSync(new URL('./fixtures/colony-v88.json.gz',import.meta.url)));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('7b5e5911bf86cccdbc7ba4b32ed067ebc1a165ff9ee319521814b9b0f6d57da2');
  const source=JSON.parse(bytes.toString()) as World;
  expect(source.schemaVersion).toBe(88);
  const sourceDeaths=source.pawns.filter(p=>p.health?.death).map(p=>({id:p.id,death:p.health!.death}));
  expect(sourceDeaths).toHaveLength(36);
  const futureMutations:((w:World)=>void)[]=[
    w=>{w.scenario!.revision=4;},
    w=>{w.research!.stonecutting={points:300_000_000,completedAt:0};},
    w=>{w.piles.find(pile=>pile.item==='survival-meal'||pile.item==='simple-meal')!.foodPoison={fraction:1,cause:'filthy-kitchen'};},
    w=>{const p=w.pawns.find(p=>p.state!=='dead')!;p.health??=createMedicalRecord(w.tick);p.health.foodPoisoning={severity:FOOD_POISON_UNIT,bornAt:w.tick,cause:'filthy-kitchen',item:'simple-meal'};},
    w=>{w.pawns.find(p=>p.health?.death)!.body={observedAt:w.tick,rot:{progress:0,atTick:w.tick}};},
    w=>{w.filth={rng:1,items:[],cleaned:0};},
  ];
  for(const mutate of futureMutations){const invalid=structuredClone(source);mutate(invalid);expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();}
  const migrated=deserializeWorld(bytes.toString());
  expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);expect(migrated.tick).toBe(source.tick);
  expect(migrated.scenario).toEqual(source.scenario);expect(migrated.research).toEqual(source.research);
  expect(migrated.filth).toBeUndefined();expect(migrated.piles.every(pile=>pile.foodPoison===undefined)).toBe(true);
  expect(migrated.pawns.every(p=>p.body===undefined&&p.health?.foodPoisoning===undefined)).toBe(true);
  expect(migrated.pawns.filter(p=>p.health?.death).map(p=>({id:p.id,death:p.health!.death}))).toEqual(sourceDeaths);
  expect(deserializeWorld(serializeWorld(migrated))).toEqual(migrated);
  stepWorld(migrated);expect(validateWorld(migrated)).toEqual([]);
  for(const death of sourceDeaths){const p=migrated.pawns.find(p=>p.id===death.id)!;expect(p.health!.death).toEqual(death.death);expect(p.body!.observedAt).toBe(migrated.tick);expect(humanCorpseAge(migrated,p)).toBe(0);}
});
