import {describe,expect,it} from 'vitest';
import {advanceTrackedAnimalAge256,attachActualAnimalGrowth256,attachNewbornAnimalGrowth256,attachGeneratedAnimalGrowth256,validAnimalGrowthTracker256,validAnimalGrowthClinicalOwner256,validAnimalGrowthMedicalHeader256} from '../src/sim/animal-growth-runtime-256.ts';
import {animalBodySize,animalNutritionMax,animalLifeStage,animalGrowthFactor} from '../src/sim/animal-life.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {animalBodyModel,medicalModel} from '../src/sim/body-model.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

/** Prepared pure biological originals and explicit clocks, not a generated
 * World or a played animal-health scenario. ROOT alone executes these cases. */
const born=(atCore=1000):WildAnimal=>{const a:WildAnimal={id:17,species:'hare',sex:'female',x:1,z:1,ageTicks:0,food:0,rest:1,state:'idle',path:[],nextDecision:101};attachNewbornAnimalGrowth256(a,atCore,256);a.food=animalNutritionMax(a);return a;};
// This is a separately prepared original, not a newborn whose constructed mind is reset.
const nearJuvenile=():WildAnimal=>{const a:WildAnimal={id:17,species:'hare',sex:'female',x:1,z:1,ageTicks:35999,food:0,rest:1,state:'idle',path:[],nextDecision:101};attachGeneratedAnimalGrowth256(a,1000,256);a.food=animalNutritionMax(a);return a;};
const age=(a:WildAnimal,atCore:number,deltaCore:number,suspended=false)=>advanceTrackedAnimalAge256(a,{atCore,deltaCore,hungerMultiplier:animalGrowthFactor(a),suspended});
describe('actual prospective animal growth240 owner',()=>{
 it('keeps the real biological boundary distinct from growth and uses food at the due call',()=>{
  const fed=nearJuvenile(),starving=structuredClone(fed),initial=fed.growthTracker!.value;starving.food=0;
  age(fed,1010,10);age(starving,1010,10);expect(fed.ageTicks).toBe(36000);expect(animalLifeStage(fed)).toBe('baby');expect(fed.growthTracker!.value).toBe(initial);
  age(fed,1240,230);age(starving,1240,230);expect(animalLifeStage(fed)).toBe('juvenile');expect(animalLifeStage(starving)).toBe('baby');expect(starving.ageTicks).toBe(fed.ageTicks);
  expect(animalBodySize(fed)).toBeGreaterThan(animalBodySize(starving));expect(animalNutritionMax(fed)).toBeGreaterThan(animalNutritionMax(starving));expect(fed.growthTracker!.nextCheckCore).toBe(1480);
 });
 it('uses the actual hungry multiplier rather than a stateless growth-to-age ratio',()=>{
  const full=born(),hungry=born();hungry.food=animalNutritionMax(hungry)*.1;
  expect(animalGrowthFactor(hungry)).toBe(.25);age(full,1240,240);age(hungry,1240,240);
  expect(hungry.growthTracker!.value).toBe(Math.fround(full.growthTracker!.value/4));expect(hungry.ageTicks).toBe(full.ageTicks);
 });
 it('preserves the first finite deadline of a real initial adult then uses the sentinel',()=>{
  const a=born();delete a.growthTracker;delete a.ageCoreRemainder;a.ageTicks=90000;attachActualAnimalGrowth256(a,{value:1,nextCheckCore:1240},256);
  expect(a.growthTracker!.nextCheckCore).toBe(1240);age(a,1230,230);expect(a.growthTracker!.nextCheckCore).toBe(1240);age(a,1240,10);expect(a.growthTracker!.nextCheckCore).toBeNull();
 });
 it('does not age a suspended owner, catch up on release, or tick a dead original',()=>{
  const a=born(),before=structuredClone(a);age(a,2000,1000,true);expect(a).toEqual(before);
  age(a,2010,10);const once=a.growthTracker!.value;expect(a.ageTicks).toBe(1);expect(a.growthTracker!.nextCheckCore).toBe(2250);
  const ordinary=born();age(ordinary,1240,240);expect(once).toBe(ordinary.growthTracker!.value);
  a.state='dead';const terminal=JSON.stringify(a);age(a,2500,490);expect(JSON.stringify(a)).toBe(terminal);
 });
 it('keeps growth and clinical witness through exact JSON continuation and changes the same clinical stage',()=>{
  const a=nearJuvenile();a.health=createAnimalMedicalRecord256({tick:100,schemaVersion:256},a);const small=medicalModel(a.health);
  const resumed:WildAnimal=JSON.parse(JSON.stringify(a));expect(validAnimalGrowthTracker256(resumed,256,100)).toBe(true);expect(validAnimalGrowthClinicalOwner256(resumed,256)).toBe(true);
  age(a,1240,240);age(resumed,1240,240);expect(resumed).toEqual(a);expect(a.health!.animalGrowth).toBe(a.growthTracker!.value);
  expect(medicalModel(a.health!)).toBe(animalBodyModel(a.species,a.ageTicks,a.growthTracker!.value));expect(medicalModel(a.health!).healthScale).toBeGreaterThan(small.healthScale);
  resumed.health!.animalGrowth=0;expect(validAnimalGrowthClinicalOwner256(resumed,256)).toBe(false);
 });
 it('refuses future/undefined/accessor/non-f32/header forgeries while absent actors remain literal',()=>{
  const a=born();expect(validAnimalGrowthTracker256(a,255,100)).toBe(false);expect(validAnimalGrowthTracker256({...a,growthTracker:undefined},256,100)).toBe(false);
  const bad=structuredClone(a);bad.growthTracker!.value=.1;expect(validAnimalGrowthTracker256(bad,256,100)).toBe(false);
  let reads=0;const getter=structuredClone(a);Object.defineProperty(getter,'growthTracker',{enumerable:true,get(){reads++;return a.growthTracker;}});expect(validAnimalGrowthTracker256(getter,256,100)).toBe(false);expect(reads).toBe(0);
  expect(validAnimalGrowthMedicalHeader256({animalGrowth:1},255,true)).toBe(false);expect(validAnimalGrowthMedicalHeader256({animalGrowth:1},256,false)).toBe(false);
  const old=born();delete old.growthTracker;delete old.ageCoreRemainder;const literal=JSON.stringify(old);expect(age(old,1240,240)).toBe(false);expect(JSON.stringify(old)).toBe(literal);expect(validAnimalGrowthTracker256(old,255,100)).toBe(true);
 });
});
