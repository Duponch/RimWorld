import { expect,test } from 'vitest';
import { animalFeedingCamp } from './helpers/animal-feeding-v279.ts';
import { ANIMAL_FEED_HUNGER,ANIMAL_FEED_TICKS,animalFeedQuantity,animalFeedingPatientReady,animalFeedingReason } from '../src/sim/animal-feeding-rules.ts';
import { animalFeedingInProgress,animalFeedingProposal,animalFeedingWanted,processAnimalFeeding,reconcileAnimalFeeding,startAnimalFeeding } from '../src/sim/animal-feeding.ts';
import { animalNutritionMax } from '../src/sim/animal-life.ts';
import { animalPileFood } from '../src/sim/wildlife-food.ts';
import { groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement.ts';
import { ITEM_DEFINITIONS } from '../src/sim/items.ts';
import { addMaterial,refreshStock,reservedSource,reservedSourcesByPile } from '../src/sim/materials.ts';
import { blockedCells,reachableCells,routeToCell } from '../src/sim/pathfinding.ts';
import { serviceCell } from '../src/sim/service-reservations.ts';
import { startingPawn } from '../src/sim/starting-pawns.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { advanceWildlife } from '../src/sim/wildlife.ts';
import type { AnimalSpeciesId } from '../src/sim/animal-species.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function camp(species:AnimalSpeciesId='muffalo'){
  const f=animalFeedingCamp(species),w=f.world,d=w.pawns.find(p=>p.id===f.doctorId)!,a=w.wildlife!.animals.find(a=>a.id===f.animalId)!;
  return {...f,w,d,a};
}
const reach=(w:World,d:Pawn)=>reachableCells(w,d,blockedCells(w),new Set());
function context(w:World,d:Pawn):NeedContext {
  return {search:()=>reach(w,d),move:target=>{d.path=routeToCell(w,target,reach(w,d))??[];},
    release:()=>releaseWork(w,d),event:message=>w.events.push({tick:w.tick,type:'need',message})};
}
function begin(w:World,d:Pawn){const p=animalFeedingProposal(w,d,reach(w,d));expect(p).toBeDefined();if(!p)throw Error('Missing animal feeding proposal');startAnimalFeeding(d,p);return p;}
function pickup(w:World,d:Pawn){
  const source=w.piles.find(p=>p.id===d.animalFeed!.sourcePileId)!;if(source.owner.type!=='ground')throw Error('Expected a physical ground ration');
  d.x=source.owner.x;d.z=source.owner.z;d.path=[];d.motion=null;d.moveCooldown=0;
  processAnimalFeeding(w,d,context(w,d));expect(d.animalFeed?.phase).toBe('deliver');
}
function atPatient(w:World,d:Pawn){const spot=d.animalFeed!.spot;d.x=spot.x;d.z=spot.z;d.path=[];d.motion=null;d.moveCooldown=0;}
function finish(w:World,d:Pawn){atPatient(w,d);for(let i=0;i<ANIMAL_FEED_TICKS&&d.animalFeed;i++){w.tick++;processAnimalFeeding(w,d,context(w,d));}expect(d.animalFeed).toBeUndefined();}
const foodUnits=(w:World)=>w.piles.reduce((n,p)=>n+(p.kind==='food'?p.quantity:0),0);

test('the five owned veterinary species eat a physical ration, preserving anatomy and giving no Medicine XP',()=>{
  for(const species of ['hare','deer','gazelle','muffalo','dromedary'] as const){
    const {w,d,a,sourceId}=camp(species),health=a.health,medicine=structuredClone(d.skills.medicine);
    expect(validateWorld(w)).toEqual([]);expect(a.state).toBe('downed');
    const before=a.food,proposal=begin(w,d),quantity=proposal.task.quantity;
    expect(reservedSource(w,sourceId)).toBe(quantity);expect(reservedSourcesByPile(w).get(sourceId)).toBe(quantity);
    expect(serviceCell(d)).toEqual(proposal.task.spot);expect(foodUnits(w)).toBe(75);
    pickup(w,d);expect(foodUnits(w)).toBe(75);finish(w,d);
    expect(a.health).toBe(health);expect(a.health!.body).toBe(species);expect(a.food).toBeCloseTo(Math.min(animalNutritionMax(a),before+quantity*.05),12);
    expect(foodUnits(w)).toBe(75-quantity);expect(w.wildlife!.eatenItems).toBe(quantity);expect(w.wildlife!.eatenNutrition).toBeCloseTo(quantity*.05,12);
    expect(d.skills.medicine).toEqual(medicine);expect(w.piles.some(p=>p.kind==='medicine')).toBe(false);
    refreshStock(w); // The ordinary engine refreshes derived stock at the tick boundary.
    expect(validateWorld(w)).toEqual([]);
  }
});

test('admission uses the animal hunger threshold, medical lying posture and ownership, independent of medicine policy',()=>{
  const {w,d,a}=camp();a.domestic!.care='none';a.food=animalNutritionMax(a)*ANIMAL_FEED_HUNGER;
  expect(animalFeedingReason(w,d,a)).toBeUndefined();a.food+=.0001;expect(animalFeedingWanted(w,d)).toBe(false);
  a.food=animalNutritionMax(a)*.3;a.state='idle';expect(animalFeedingWanted(w,d)).toBe(false);
  a.state='sleeping';expect(animalFeedingWanted(w,d)).toBe(true); // healing tended wounds
  const domestic=a.domestic;delete a.domestic;expect(animalFeedingWanted(w,d)).toBe(false);a.domestic=domestic;
  w.schemaVersion=213 as World['schemaVersion'];expect(animalFeedingWanted(w,d)).toBe(false);
});

test('diet and stack sizing use animal capacity, food ingest caps and nearest-even without selecting medicines or meat',()=>{
  const {w,d,a}=camp('hare'),raw=w.piles[0]!;
  a.food=animalNutritionMax(a)-.125;expect(animalFeedQuantity(a,raw,75)).toBe(2);
  a.food=animalNutritionMax(a)-.15;expect(animalFeedQuantity(a,raw,75)).toBe(3);
  expect(animalFeedQuantity(a,raw,1)).toBe(1);expect(animalFeedQuantity(a,{item:'simple-meal'},75)).toBe(1);
  w.piles=[];addMaterial(w,'food',20,{type:'ground',x:3,z:8},'hare-meat');addMaterial(w,'medicine',3,{type:'ground',x:4,z:8},'medicine');
  expect(w.piles.every(p=>!animalPileFood(w,a,p))).toBe(true);expect(animalFeedingProposal(w,d,reach(w,d))).toBeUndefined();
});

test('patient, ropes, veterinary treatment and quantitative food reservations are exclusive',()=>{
  const {w,d,a,sourceId}=camp(),other=startingPawn(w.nextId++,'Autre soigneur',8,8,0,100,w.seed,w.tick);w.pawns.push(other);
  other.animalHandling={animalId:a.id,kind:'lead',markerId:1,sourcePileId:0,carryPileId:null,quantity:0,step:0,progress:0,phase:'lead',ropees:[a.id]};
  expect(animalFeedingWanted(w,d)).toBe(false);delete other.animalHandling;
  other.animalCare={animalId:a.id,spot:{x:a.x-1,z:a.z},phase:'approach',progress:0};expect(animalFeedingWanted(w,d)).toBe(false);delete other.animalCare;
  begin(w,d);expect(animalFeedingProposal(w,other,reach(w,other))).toBeUndefined();releaseWork(w,d);
  const source=w.piles.find(p=>p.id===sourceId)!;
  other.need={kind:'eat',phase:'pickup',sourcePileId:sourceId,carryPileId:null,quantity:source.quantity,dining:null,progress:0};
  expect(reservedSource(w,sourceId)).toBe(source.quantity);expect(animalFeedingProposal(w,d,reach(w,d))).toBeUndefined();
});

test('a distant proposal does not hold an animal, while only real contact and 75 ticks finish ingestion',()=>{
  const {w,d,a}=camp(),before=a.food;begin(w,d);expect(animalFeedingInProgress(w,a)).toBe(false);pickup(w,d);
  expect(animalFeedingInProgress(w,a)).toBe(false);atPatient(w,d);
  processAnimalFeeding(w,d,context(w,d));expect(animalFeedingInProgress(w,a)).toBe(true);
  for(let i=1;i<ANIMAL_FEED_TICKS-1;i++)processAnimalFeeding(w,d,context(w,d));
  expect(a.food).toBe(before);expect(d.animalFeed!.progress).toBe(ANIMAL_FEED_TICKS-1);
  processAnimalFeeding(w,d,context(w,d));expect(a.food).toBeGreaterThan(before);expect(d.animalFeed).toBeUndefined();
});

test('contamination survives a physical split and only the completed animal meal exposes food poisoning',()=>{
  const {w,d,a}=camp();w.piles=[];addMaterial(w,'food',2,{type:'ground',x:3,z:8},'simple-meal');
  const source=w.piles[0]!;source.foodPoison={fraction:1,cause:'filthy-kitchen'};
  begin(w,d);pickup(w,d);const held=w.piles.find(p=>p.id===d.animalFeed!.carryPileId)!;
  expect(held.foodPoison).toEqual(source.foodPoison);expect(a.health!.foodPoisoning).toBeUndefined();
  atPatient(w,d);
  for(let i=0;i<ANIMAL_FEED_TICKS-1;i++){w.tick++;processAnimalFeeding(w,d,context(w,d));}
  w.rng=1;processAnimalFeeding(w,d,context(w,d));
  expect(a.health!.foodPoisoning).toMatchObject({cause:'filthy-kitchen',item:'simple-meal'});
  expect(source.quantity).toBe(1);expect(w.wildlife!.eatenNutrition).toBe(ITEM_DEFINITIONS['simple-meal'].nutrition/100);
});

test('waking, danger and death cancel delivery without granting nutrition or destroying the held ration',()=>{
  for(const cause of ['wake','danger','death'] as const){
    const {w,d,a}=camp();begin(w,d);pickup(w,d);const before=a.food,carryId=d.animalFeed!.carryPileId;
    if(cause==='wake')a.state='idle';if(cause==='danger')a.flee={danger:{x:0,z:0},until:w.tick+30};
    if(cause==='death'){a.state='dead';a.health!.death={tick:w.tick,cause:'blood-loss'};}
    reconcileAnimalFeeding(w);expect(d.animalFeed).toBeUndefined();expect(a.food).toBe(before);
    expect(w.piles.find(p=>p.id===carryId)!.owner.type).toBe('ground');expect(w.wildlife!.eatenItems).toBe(0);
  }
});

test('disabling Doctor with a saturated floor refuses atomically; danger conserves undroppable food as interrupted cargo',()=>{
  const {w,d,a}=camp();begin(w,d);pickup(w,d);const carryId=d.animalFeed!.carryPileId,before=a.food;
  for(const c of nearbyGround(w,d))if(!groundPile(w,c)&&groundCapacity(w,c,'rice',d.id)>0)
    w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',...c}});
  const snapshot=structuredClone(w);
  expect(applyCommand(w,{type:'priority',pawnId:d.id,work:'doctor',value:0}).ok).toBe(false);expect(w).toEqual(snapshot);
  a.flee={danger:{x:0,z:0},until:w.tick+30};reconcileAnimalFeeding(w);
  expect(d.animalFeed).toBeUndefined();expect(d.interruptedCargo).toBe(true);expect(a.food).toBe(before);
  expect(w.piles.find(p=>p.id===carryId)!.owner).toEqual({type:'pawn',pawnId:d.id});
});

test('the real planner supplies a downed animal, reloads during feeding and consumes exactly one ration',()=>{
  const {w,d,a,sourceId}=camp();
  for(let i=0;i<600&&d.animalFeed?.phase!=='feed';i++)stepWorld(w);
  expect(d.animalFeed?.phase).toBe('feed');expect(animalFeedingInProgress(w,a)).toBe(true);expect(validateWorld(w)).toEqual([]);
  const quantity=d.animalFeed!.quantity,restored=deserializeWorld(serializeWorld(w));
  stepWorld(w,10);stepWorld(restored,10);expect(serializeWorld(restored)).toBe(serializeWorld(w));
  for(let i=0;i<100&&d.animalFeed;i++)stepWorld(w);
  expect(d.animalFeed).toBeUndefined();expect(a.food).toBeGreaterThan(animalNutritionMax(a)*.9);
  expect(w.wildlife!.eatenItems).toBe(quantity);expect(w.piles.find(p=>p.id===sourceId)!.quantity).toBe(75-quantity);
  expect(w.events.filter(e=>e.message.includes('a nourri'))).toHaveLength(1);expect(validateWorld(w)).toEqual([]);
});

test('a hungry mobile patient may wake during approach and is never frozen by its reservation',()=>{
  const {w,d,a}=camp();a.health!.bloodLoss=0;a.state='sleeping';begin(w,d);
  expect(animalFeedingPatientReady(w,a,d)).toBe(true);expect(animalFeedingInProgress(w,a)).toBe(false);
  advanceWildlife(w);reconcileAnimalFeeding(w);
  expect(a.state).not.toBe('sleeping');expect(d.animalFeed).toBeUndefined();expect(w.wildlife!.eatenItems).toBe(0);
});
