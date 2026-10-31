import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {makeFalloutColony481} from './scenarios/toxic-fallout-v481.ts';
import {resolveSelectedToxicFallout294} from '../src/sim/toxic-fallout-incident-294.ts';
import {animalFalloutNextStepBlocked294} from '../src/sim/animal-fallout-shelter-294.ts';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {animalNavigation,moveAnimal} from '../src/sim/wildlife-navigation.ts';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {animalNutritionMax,adultAgeTicks} from '../src/sim/animal-life.ts';
import {effectiveCore297,effectiveLocal297} from '../src/sim/core-phase-297.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {recordShipCasketFilthMovement277} from '../src/sim/filth.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {reconcileAnimalHealth,delayAnimalImpact} from '../src/sim/wildlife-health.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {setAnimalTrainingWanted282} from '../src/sim/animal-training-282.ts';
import {animalHaulAvailable282} from '../src/sim/animal-hauling-282.ts';
import type {World} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

/** Original declared gazelle with native7 growth provenance. Its purposeful
 * cardinal edge costs12Core on soil and reaches Core12 before macro2.
 * The real producer captures that edge before the first played Core. */
function camp(){
 const world=deconstructionCamp(1,32);enableWildlife(world,0);
 for(const p of world.pawns){p.schedule.fill('anything');p.recreation.level=100;for(const key of Object.keys(p.priorities)as(keyof typeof p.priorities)[])p.priorities[key]=0;}
 const animal:WildAnimal={id:world.nextId++,species:'gazelle',sex:'female',ageTicks:adultAgeTicks('gazelle'),
  x:4,z:5,food:.1,rest:1,state:'moving',path:[{x:5,z:5},{x:6,z:5},{x:7,z:5}],nextDecision:0,flee:{danger:{x:2,z:5},until:600}};
 attachGeneratedAnimalGrowth256(animal,0,298);animal.food=animalNutritionMax(animal)*.8;
 world.wildlife!.animals.push(animal);
 const nav=animalNavigation(world);expect(moveAnimal(world,animal,nav.step)).toBe(true);
 expect(Math.ceil(animal.motion!.end*10)).toBe(12);expect(validateWorld(world)).toEqual([]);
 return {world,animal};
}
function core(world:World){const before=effectiveCore297(world),result=advanceWorldCore297(world);expect(result.core).toBe(before+1);return result;}
function until(world:World,target:number){while(effectiveCore297(world)<target)core(world);expect(effectiveCore297(world)).toBe(target);}
const physiology=(w:World,a:WildAnimal)=>({tick:w.tick,food:a.food,rest:a.rest,age:a.ageTicks,growth:structuredClone(a.growthTracker),rng:w.rng,animalRng:w.wildlife!.rng,nextId:w.nextId,pathBudget:structuredClone(w.corePathBudget297)});

test('a real pre-decided animal route extends at Core12 before macro2, without another decision physiology or search budget',()=>{
 const {world,animal}=camp(),first=animal.motion!;until(world,11);const before=physiology(world,animal);
 expect(animal.motion).toBe(first);const result=core(world);
 expect([world.tick,world.phaseCore297]).toEqual([1,2]);expect(animal.motion).not.toBe(first);
 expect(animal.motion?.from).toEqual(first.to);expect(animal.motion?.start).toBe(first.end);
 expect(animal.path).toEqual([{x:7,z:5}]);expect(physiology(world,animal)).toEqual(before);
 expect(result.maps.some(m=>m.actorsChanged.includes(animal.id))).toBe(true);expect(validateWorld(world)).toEqual([]);
});

test('macro2 cannot shift or reprice the animal edge already engaged at Core12',()=>{
 const {world,animal}=camp();until(world,12);
 const edge=structuredClone(animal.motion),path=structuredClone(animal.path);until(world,20);
 expect([world.tick,world.phaseCore297]).toEqual([2,0]);expect(animal.motion).toEqual(edge);expect(animal.path).toEqual(path);
 expect(validateWorld(world)).toEqual([]);
});

test('real phase7 whole reload derives the same continuation and same World through Core13 without replaying a past arrival',()=>{
 const {world,animal}=camp();until(world,7);const raw=serializeWorld(world),loaded=deserializeWorld(raw);
 expect(serializeWorld(loaded)).toBe(raw);
 for(let i=0;i<6;i++){core(world);core(loaded);expect(serializeWorld(loaded)).toBe(serializeWorld(world));}
 expect(loaded.wildlife!.animals.find(a=>a.id===animal.id)!.motion).toEqual(animal.motion);
});

test('one Core12 fine arrival spends carried filth exactly once, and its own phase2 reload does not spend it again through macro2',()=>{
 const {world,animal}=camp();
 // Declared carried trace and isolated filth RNG before its first arrival.
 world.filth={rng:1,items:[],cleaned:0};animal.filthFeet={carried:[{kind:'slime',thickness:2}]};
 until(world,11);
 const reference=structuredClone(world),ref=reference.wildlife!.animals.find(a=>a.id===animal.id)!;
 recordShipCasketFilthMovement277(reference,ref);
 core(world);
 expect(world.phaseCore297).toBe(2);expect(world.filth!.rng).toBe(reference.filth!.rng);expect(animal.filthFeet).toEqual(ref.filthFeet);
 expect(world.filth!.items.map(f=>[f.kind,f.x,f.z,f.thickness])).toEqual(reference.filth!.items.map(f=>[f.kind,f.x,f.z,f.thickness]));
 expect(world.filth!.items.every(f=>f.grownCore===12)).toBe(true);
 const raw=serializeWorld(world),loaded=deserializeWorld(raw),rng=world.filth!.rng;
 while(effectiveCore297(world)<20){core(world);core(loaded);expect(world.filth!.rng).toBe(rng);expect(serializeWorld(loaded)).toBe(serializeWorld(world));}
});

test('a real downing cancels the future route and the fine owner never appends a step to the retained falling edge',()=>{
 const {world,animal}=camp();until(world,7);const captured=structuredClone(animal.motion);
 animal.health=createAnimalMedicalRecord256(world,animal);animal.health.bloodLoss=Math.round(BLOOD_UNIT*.7);reconcileAnimalHealth(world,animal);
 expect(animal.state).toBe('downed');expect(animal.path).toEqual([]);
 until(world,13);expect(animal.motion).toEqual(captured);expect(animal.state).toBe('downed');expect(validateWorld(world)).toEqual([]);
});

test('the exact current stun and stagger keep an already paid animal edge and delay the next edge without another early route shift',()=>{
 const {world,animal}=camp();until(world,7);
 const first=animal.motion!,path=structuredClone(animal.path);delayAnimalImpact(animal,effectiveCore297(world),true);
 expect(animal.motion?.end).toBeGreaterThan(first.end);expect(animal.stun?.untilCore).toBe(52);
 const impacted=structuredClone(animal.motion);until(world,13);
 expect(effectiveLocal297(world)).toBe(1.3);expect(animal.motion).toEqual(impacted);expect(animal.path).toEqual(path);
 expect(validateWorld(world)).toEqual([]);const raw=serializeWorld(world);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});

test('a real Core45 stun deadline is cleared before presence-based business guards and the first post-recovery animal step',()=>{
 const {world,animal,handler}=animalHaulingCamp459();
 // Initial QA declaration of already-learned abilities, not a claimed played
 // lesson. No clock is assigned and the original animal/property are retained.
 expect(setAnimalTrainingWanted282(world,animal.id,'haul',true).ok).toBe(true);
 animal.training!.obedience={steps:3,learned:true,wanted:true};animal.training!.haul={steps:7,learned:true,wanted:true};
 for(const key of Object.keys(handler.priorities)as(keyof typeof handler.priorities)[])handler.priorities[key]=0;
 animal.food=animalNutritionMax(animal)*.8;animal.rest=1;
 animal.state='moving';animal.path=[{x:13,z:12},{x:14,z:12}];animal.nextDecision=100;
 expect(animalHaulAvailable282(world,animal)).toBe(true);
 delayAnimalImpact(animal,effectiveCore297(world),true);
 expect(validateWorld(world)).toEqual([]);until(world,44);
 expect(animal.stun?.untilCore).toBe(45);expect(animal.motion).toBeUndefined();
 expect(animalHaulAvailable282(world,animal)).toBe(false);const result=core(world);
 expect(effectiveCore297(world)).toBe(45);expect(animal.stun).toBeUndefined();expect(animal.stagger?.untilCore).toBe(95);
 expect(animalHaulAvailable282(world,animal)).toBe(true);expect(animal.motion?.start).toBe(4.5);
 expect(animal.motion?.from).toEqual({x:12,z:12});expect(animal.motion?.to).toEqual({x:13,z:12});
 expect(result.maps.some(m=>m.actorsChanged.includes(animal.id))).toBe(true);expect(validateWorld(world)).toEqual([]);
});

test('the real Core50 macro clears an owned idle stun before the actual hauling opportunity query',()=>{
 const {world,animal,handler}=animalHaulingCamp459();
 // Initial learned QA facts as in the preceding contract. No haul task is
 // fabricated and no earlier cancelled task is claimed to have survived.
 expect(setAnimalTrainingWanted282(world,animal.id,'haul',true).ok).toBe(true);
 animal.training!.obedience={steps:3,learned:true,wanted:true};animal.training!.haul={steps:7,learned:true,wanted:true};
 for(const key of Object.keys(handler.priorities)as(keyof typeof handler.priorities)[])handler.priorities[key]=0;
 animal.food=animalNutritionMax(animal)*.8;animal.rest=1;animal.state='idle';animal.path=[];animal.nextDecision=0;
 delayAnimalImpact(animal,effectiveCore297(world),true);expect(animal.stun?.untilCore).toBe(45);
 expect(validateWorld(world)).toEqual([]);until(world,5);delayAnimalImpact(animal,effectiveCore297(world),true);
 expect(animal.stun?.untilCore).toBe(50);expect(animal.stagger?.untilCore).toBe(100);until(world,49);
 expect(animal.training!.lastHaulCheckCore).toBeUndefined();expect(animalHaulAvailable282(world,animal)).toBe(false);
 const result=core(world);expect([world.tick,world.phaseCore297]).toEqual([5,0]);
 expect(animal.stun).toBeUndefined();expect(animal.stagger?.untilCore).toBe(100);
 // The real macro reaches hauling.start and consumes its ordinary opportunity
 // at50 even if the unmodified2/3 draw rejects acquiring a task.
 expect(animal.training!.lastHaulCheckCore).toBe(50);
 expect(result.maps.some(m=>m.actorsChanged.includes(animal.id))).toBe(true);expect(validateWorld(world)).toEqual([]);
});


test('a fine arrival under a real pen roof cannot append an uncovered ordinary wander edge before the macro revokes it',()=>{
 const world=makeFalloutColony481(32);
 // The late-start factory changes its initial macro frontier. Align only its
 // INITIAL budget before playing any Core, then really play the adoption.
 world.corePathBudget297!.tick=world.tick;const preparedCore=effectiveCore297(world);until(world,preparedCore+10);
 expect(world.miscIncidents?.toxicFallout).toBeDefined();world.miscIncidents!.opportunities++;
 expect(resolveSelectedToxicFallout294(world,1)).toBe(true);enableWildlife(world,0);
 // Explicit QA landscape, original and enclosure after played adoption; no
 // campaign, construction, survival or favourable incident draw is claimed.
 world.tiles=world.tiles.map(()=>({terrain:'soil'}));world.resources=[];world.roofing={constructed:[],build:[],remove:[],cursor:0};
 for(let x=8;x<=16;x++){fixtureBuilding(world,'fence',x,8);fixtureBuilding(world,'fence',x,16);}
 for(let z=9;z<16;z++){fixtureBuilding(world,'fence',8,z);fixtureBuilding(world,'fence',16,z);}
 const marker=fixtureBuilding(world,'pen-marker',10,10);
 const animal:WildAnimal={id:world.nextId++,species:'gazelle',sex:'female',ageTicks:adultAgeTicks('gazelle'),
  x:10,z:11,food:.1,rest:1,state:'moving',path:[{x:11,z:12},{x:12,z:12},{x:13,z:12}],nextDecision:world.tick+100};
 attachGeneratedAnimalGrowth256(animal,effectiveCore297(world),298);
 animal.domestic={since:world.tick,care:'none',tameness:5,nextDecay:world.tick+6000,penMarkerId:marker.id};
 animal.food=animalNutritionMax(animal)*.8;world.wildlife!.animals.push(animal);
 world.structures.find(s=>s.id===marker.id)!.pen={accepted:['gazelle']};
 fixtureBuilding(world,'wall',11,13);
 world.roofing!.constructed=[...new Set([...world.roofing!.constructed,12*world.width+11])].sort((a,b)=>a-b);
 world.tiles[12*world.width+11]={terrain:'marsh'};
 // The diagonal native price plus marsh makes Walk≈88.2842Core, so this
 // arrival lies between macros. The support wall blocks neither diagonal side.
 const nav=animalNavigation(world);expect(moveAnimal(world,animal,nav.step)).toBe(true);
 const first=animal.motion!,arrival=Math.ceil(first.end*10);expect(arrival%10).not.toBe(0);
 const retainedPath=structuredClone(animal.path);until(world,arrival-1);
 const facts={rng:world.rng,animalRng:world.wildlife!.rng,nextId:world.nextId,budget:structuredClone(world.corePathBudget297)};
 expect(animalFalloutNextStepBlocked294(world,animal)).toBe(true);
 core(world);expect(animal.motion).toBe(first);expect(animal.path).toEqual(retainedPath);
 expect({rng:world.rng,animalRng:world.wildlife!.rng,nextId:world.nextId,budget:world.corePathBudget297}).toEqual(facts);
 expect([animal.x,animal.z]).toEqual([11,12]);
 const macro=(Math.floor(arrival/10)+1)*10;until(world,macro);
 expect(animal.path).toEqual([]);expect(animal.motion).toBe(first);expect([animal.x,animal.z]).toEqual([11,12]);
});
