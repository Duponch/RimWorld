import {expect,test} from 'vitest';
import {captureFoodReadability} from '../src/sim/food-readability';
import {FOOD_ITEMS} from '../src/sim/food-policy';
import {availableNutrition} from '../src/sim/items';
import {addMaterial} from '../src/sim/materials';
import {animalDietFlags256,animalItemDiet256} from '../src/sim/animal-diet-v256';
import {ANIMAL_SPECIES_IDS_256} from '../src/sim/animal-core-v256';
import {animalPileFood} from '../src/sim/wildlife-food';
import {caravanAnimalFood256,caravanAnimalFoodEver256} from '../src/sim/group-animal-food-256';
import {deconstructionCamp} from './scenarios/deconstruction';
import {adultAgeTicks} from '../src/sim/animal-life';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256';
import type {WildAnimal} from '../src/sim/wildlife-state';

test('human food reading never counts brewing ingredients or beer as available meals',()=>{
 const w=deconstructionCamp(1),pawn=w.pawns[0]!;
 addMaterial(w,'food',25,{type:'ground',x:10,z:10},'hops');addMaterial(w,'beer',5,{type:'ground',x:11,z:10},'beer');
 const before=JSON.stringify(w),food=captureFoodReadability(w);
 expect(food.freshNutrition).toBe(0);expect(food.freshPileCount).toBe(0);expect(food.byPawn.get(pawn.id)?.status).toBe('empty');expect(availableNutrition(w)).toBe(0);
 expect(FOOD_ITEMS).not.toContain('hops');expect(FOOD_ITEMS).not.toContain('beer');expect(JSON.stringify(w)).toBe(before);
 addMaterial(w,'food',2,{type:'ground',x:12,z:10},'simple-meal');
 expect(captureFoodReadability(w).freshNutrition).toBe(1.8);expect(captureFoodReadability(w).byPawn.get(pawn.id)?.status).toBe('matched');
});

test('hops uses exact Plant diets and legacy rough-herbivore fallback only from265, beer is no animal ration',()=>{
 const w=deconstructionCamp(1),base:WildAnimal={id:w.nextId++,species:'donkey',sex:'female',ageTicks:adultAgeTicks('donkey'),x:15,z:15,food:1,rest:1,state:'idle',path:[],nextDecision:w.tick};
 base.health=createAnimalMedicalRecord256(w,base);
 w.wildlife={profile:'temperate-hares-v1',rng:1,animals:[base],eatenPlants:0,eatenNutrition:0,eatenItems:0};
 w.piles=[];addMaterial(w,'food',10,{type:'ground',x:10,z:10},'hops');addMaterial(w,'beer',2,{type:'ground',x:11,z:10},'beer');
 const hops=w.piles.find(p=>p.item==='hops')!,beer=w.piles.find(p=>p.item==='beer')!,before=JSON.stringify(w),version=w.schemaVersion;
 for(const species of ANIMAL_SPECIES_IDS_256){
  const animal={...base,species},plant=(animalDietFlags256(species)!&0x40)!==0;
  expect(animalItemDiet256(animal,'hops',false,265),species).toBe(plant);expect(animalPileFood(w,animal,hops),species).toBe(plant);
  expect(caravanAnimalFood256(animal,hops,w.tick,265),species).toBe(plant);expect(caravanAnimalFoodEver256(animal,'hops',264),species).toBe(false);
  expect(animalPileFood(w,animal,beer),species).toBe(false);expect(caravanAnimalFood256(animal,beer,w.tick,265),species).toBe(false);
 }
 for(const [species,expected] of [['hare',true],['red-fox',false]] as const){const animal={...base,species};expect(animalPileFood(w,animal,hops)).toBe(expected);expect(caravanAnimalFoodEver256(animal,'hops',265)).toBe(expected);}
 Object.assign(w,{schemaVersion:264});expect(animalPileFood(w,{...base,species:'hare'},hops)).toBe(false);w.schemaVersion=version;
 expect(JSON.stringify(w)).toBe(before);
});
