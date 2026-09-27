import { expect, test } from 'vitest';
import { adultAgeTicks, advanceAnimalLife, animalBodySize, animalFoodPerDay, animalLifeStage, animalNutritionMax, gestationTicks, juvenileAgeTicks } from '../src/sim/animal-life.ts';
import { animalSpecies } from '../src/sim/animal-species.ts';
import { productKind } from '../src/sim/animal-products.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { refreshStock } from '../src/sim/materials.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';
import { huntingCamp } from './scenarios/hunting.ts';

function pair(species:'hare'|'muffalo'='hare') {
  const world=huntingCamp(),mother=world.wildlife!.animals[0]!,handler=world.pawns[0]!;
  world.pawns=[];world.piles=[];world.resources=[];world.structures=[];world.jobs=[];
  delete world.wildlife!.population;
  mother.species=species;mother.sex='female';mother.ageTicks=adultAgeTicks(species);mother.x=10;mother.z=10;
  mother.food=animalSpecies(species).nutrition;mother.rest=1;mother.state='idle';mother.path=[];mother.motion=undefined;
  mother.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000};
  const father:WildAnimal={...mother,id:world.nextId++,sex:'male',x:11,z:10,
    domestic:{...mother.domestic},path:[],nextDecision:world.tick+100};
  world.wildlife!.animals.push(father);
  refreshStock(world);
  return {world,mother,father,handler};
}

test('Core age thresholds and stage factors use local 6,000-tick days',()=>{
  const {mother}=pair('muffalo');
  expect(juvenileAgeTicks('muffalo')).toBe(15*6000);
  expect(adultAgeTicks('muffalo')).toBe(Math.round(.3333*60*6000));
  expect(gestationTicks('muffalo')).toBe(39_960);
  mother.ageTicks=0;
  expect(animalLifeStage(mother)).toBe('baby');
  expect(animalBodySize(mother)).toBeCloseTo(2.4*.2);
  expect(animalNutritionMax(mother)).toBeCloseTo(2.4*.6);
  expect(animalFoodPerDay(mother)).toBeCloseTo(.86*.4);
  expect(productKind(mother)).toBeUndefined();
  mother.ageTicks=juvenileAgeTicks('muffalo');
  expect(animalLifeStage(mother)).toBe('juvenile');
  expect(animalBodySize(mother)).toBeCloseTo(2.4*.5);
  expect(animalNutritionMax(mother)).toBeCloseTo(2.4*.75);
});

test('maturation opens the adult product gauge without retroactive wool',()=>{
  const {world,mother}=pair('muffalo');
  mother.ageTicks=adultAgeTicks('muffalo')-1;delete mother.domestic!.productFullness;
  world.tick++;advanceAnimalLife(world);
  expect(animalLifeStage(mother)).toBe('adult');
  expect(productKind(mother)).toBe('shear');
  expect(mother.domestic!.productFullness).toBe(0);
});

test('a physical 50-tick mating attempt conceives with the persisted father',()=>{
  const {world,mother,father}=pair();
  father.mating={femaleId:mother.id,progress:49};world.wildlife!.rng=1;
  world.tick++;advanceAnimalLife(world);
  expect(father.mating).toBeUndefined();
  expect(mother.pregnancy).toEqual({fatherId:father.id,progress:0});
  expect(validateWorld(world)).toEqual([]);
});

test('a distant mate must approach before the interaction timer advances',()=>{
  const {world,mother,father}=pair();
  father.x=14;father.mating={femaleId:mother.id,progress:0};
  world.tick++;advanceAnimalLife(world);
  expect(father.path.length).toBeGreaterThan(0);
  expect(father.mating?.progress).toBe(0);
  expect(mother.pregnancy).toBeUndefined();
  expect(validateWorld(world)).toEqual([]);
});

test('animal handling interrupts mating and retains the female route',()=>{
  const {world,mother,father,handler}=pair();
  world.pawns.push(handler);
  handler.animalHandling={animalId:mother.id,kind:'lead',sourcePileId:0,carryPileId:null,quantity:0,phase:'lead',step:0,progress:0};
  mother.path=[{x:10,z:11}];father.mating={femaleId:mother.id,progress:49};
  world.tick++;advanceAnimalLife(world);
  expect(father.mating).toBeUndefined();
  expect(mother.path).toEqual([{x:10,z:11}]);
  expect(mother.pregnancy).toBeUndefined();
});

test('gestation pauses in starvation and birth creates physical, related young',()=>{
  const {world,mother,father}=pair();
  mother.pregnancy={fatherId:father.id,progress:gestationTicks('hare')-1};mother.food=0;
  world.tick++;advanceAnimalLife(world);
  expect(mother.pregnancy.progress).toBe(gestationTicks('hare')-1);
  mother.food=animalNutritionMax(mother);
  world.tick++;advanceAnimalLife(world);
  expect(mother.pregnancy).toBeUndefined();
  const children=world.wildlife!.animals.filter(a=>a.parents?.motherId===mother.id);
  expect(children.length).toBeGreaterThanOrEqual(1);
  expect(children.length).toBeLessThanOrEqual(2);
  expect(children.every(a=>a.ageTicks===0&&a.parents?.fatherId===father.id&&!!a.domestic&&animalLifeStage(a)==='baby')).toBe(true);
  expect(new Set(children.map(a=>`${a.x},${a.z}`)).size).toBe(children.length);
  expect(validateWorld(world)).toEqual([]);
});

test('a full pregnancy waits for an available nearby birth cell',()=>{
  const {world,mother,father}=pair();
  mother.pregnancy={fatherId:father.id,progress:gestationTicks('hare')};
  for(let z=9;z<=11;z++)for(let x=9;x<=11;x++)if((x!==10||z!==10)&&(x!==11||z!==10))
    world.tiles[z*world.width+x]={terrain:'rock'};
  world.tick++;advanceAnimalLife(world);
  expect(mother.pregnancy?.progress).toBe(gestationTicks('hare'));
  expect(world.wildlife!.animals).toHaveLength(2);
  world.tiles[10*world.width+9]={terrain:'grass'};
  world.tick++;advanceAnimalLife(world);
  expect(mother.pregnancy).toBeUndefined();
  expect(world.wildlife!.animals).toHaveLength(3);
  expect(validateWorld(world)).toEqual([]);
});

test('successive hare litters consume the saved wildlife random stream',()=>{
  const {world,mother,father}=pair();
  world.wildlife!.rng=4;
  mother.pregnancy={fatherId:father.id,progress:gestationTicks('hare')};
  world.tick++;advanceAnimalLife(world);
  expect(world.wildlife!.animals.filter(a=>a.parents?.motherId===mother.id)).toHaveLength(2);
  world.wildlife!.animals=world.wildlife!.animals.filter(a=>!a.parents);
  mother.pregnancy={fatherId:father.id,progress:gestationTicks('hare')};
  world.tick++;advanceAnimalLife(world);
  expect(world.wildlife!.animals.filter(a=>a.parents?.motherId===mother.id)).toHaveLength(1);
});
