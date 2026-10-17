import {preparedSchema256} from './helpers/legacy-fixture-guards.ts';
import {describe,it,expect} from 'vitest';
import {huntingCamp} from './scenarios/hunting.ts';
import {ANIMAL_SPECIES_IDS,LEGACY_ANIMAL_SPECIES_IDS,animalSpecies,type AnimalSpeciesId} from '../src/sim/animal-species.ts';
import {actualAnimalProfile256,actualAnimalMeleeProfile256} from '../src/sim/actual-animal-profile-256.ts';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {animalBodyModel} from '../src/sim/body-model.ts';
import {animalNutritionMax,animalFoodPerDay} from '../src/sim/animal-life.ts';
import {validCaravanAnimalRecord256} from '../src/sim/group-animal-record-save-256.ts';
import {animalFoods,animalMealTarget} from '../src/sim/wildlife-food.ts';
import {validFodderTransport} from '../src/sim/fodder-save.ts';
import {addMaterial} from '../src/sim/materials.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {World} from '../src/sim/types.ts';

/** Prepared existing huntingCamp, no step/generator/travel demonstration.
 * Its real World/IDs are retained; only the animal and food preconditions below
 * are prepared. Producers and RAW guards then operate on these same originals. */
function prepared(species:AnimalSpeciesId){
 const w=huntingCamp();preparedSchema256(w);w.resources=[];w.piles=[];
 const a:WildAnimal={id:w.wildlife!.animals[0]!.id,species,sex:'female',ageTicks:2000000,x:10,z:10,food:0,rest:1,state:'idle',path:[],nextDecision:w.tick+1};
 attachGeneratedAnimalGrowth256(a,w.tick*10,256);a.health=createAnimalMedicalRecord256(w,a);w.wildlife!.animals=[a];
 return {w,a};
}
const groups={
 hare:['Teeth','HeadAttackTool'],
 'snow-hare':['Teeth','HeadAttackTool'],
 deer:['FrontLeftLeg','FrontLeftLeg','FrontRightLeg','FrontRightLeg','Teeth','HeadAttackTool'],
 muffalo:['HeadAttackTool','FrontLeftLeg','FrontLeftLeg','FrontRightLeg','FrontRightLeg','Teeth'],
 gazelle:['FrontLeftLeg','FrontLeftLeg','FrontRightLeg','FrontRightLeg','Teeth','HeadAttackTool'],
 dromedary:['FrontLeftLeg','FrontLeftLeg','FrontRightLeg','FrontRightLeg','Teeth','HeadAttackTool'],
 'red-fox':['FrontLeftPaw','FrontRightPaw','Teeth','HeadAttackTool'],
} as const;

describe('prospective native-seven profiles and real food conservation boundaries',()=>{
 it('preserves every unmarked literal species/profile reference, including the existing39',()=>{
  for(const species of ANIMAL_SPECIES_IDS){
   expect(actualAnimalProfile256({species})).toBe(animalSpecies(species));
   expect(actualAnimalMeleeProfile256({species})).toBe(animalSpecies(species).melee);
  }
 });
 it.each(LEGACY_ANIMAL_SPECIES_IDS)('%s marked attacks bind to the actual native parts and attack groups',species=>{
  const {a}=prepared(species),profile=actualAnimalProfile256(a),tools=actualAnimalMeleeProfile256(a),model=animalBodyModel(a.species,a.ageTicks,a.growthTracker!.value);
  expect(profile).not.toBe(animalSpecies(species));expect(tools).toHaveLength(groups[species].length);
  expect(new Set(tools.map(t=>t.id)).size).toBe(tools.length);
  tools.forEach((tool,index)=>{
   expect(tool.id).toMatch(/^animal256-tool-\d+-\d+$/);expect(tool.sourceParts).toBeDefined();
   expect(tool.sourceParts).toContain(tool.sourcePart);
   for(const source of tool.sourceParts!){const part=model.byId[source];expect(part).toBeDefined();expect(part.nativeDefId).toBeDefined();expect(part.groups).toContain(groups[species][index]);}
  });
  if(['deer','muffalo','gazelle','dromedary'].includes(species))expect(tools.filter(t=>t.kind==='poke')).toHaveLength(2);
  // Looking up a marked actor never replaces the historical species profile.
  expect(actualAnimalProfile256({species})).toBe(animalSpecies(species));
 });
 it('keeps inherited meat ownership and exact source hunger on marked originals only',()=>{
  const snow=prepared('snow-hare').a,fox=prepared('red-fox').a,muffalo=prepared('muffalo').a;
  expect(actualAnimalProfile256(snow).meatItem).toBe('hare-meat');expect(actualAnimalProfile256(fox).meatItem).toBe('fennec-fox-meat');
  expect(animalSpecies('snow-hare').meatItem).toBe('snow-hare-meat');expect(animalSpecies('red-fox').meatItem).toBe('red-fox-meat');
  expect(animalFoodPerDay(snow)).toBeCloseTo(.184,14);expect(animalFoodPerDay(muffalo)).toBeCloseTo(.856,14);
 });
 it('admits a real marked adult f32 maximum through caravan RAW and rejects excess without repair',()=>{
  const {w,a}=prepared('muffalo'),context={context:{width:w.width,height:w.height},tick:w.tick,nextId:w.nextId,version:256};
  a.food=animalNutritionMax(a);expect(a.food).toBe(2.4000000953674316);expect(a.food).toBeGreaterThan(animalSpecies('muffalo').nutrition);
  const raw:WildAnimal=JSON.parse(JSON.stringify(a));expect(validCaravanAnimalRecord256(raw,context)).toBe(true);
  const admitted=JSON.stringify(raw);raw.food+=.001;const excess=JSON.stringify(raw);
  expect(validCaravanAnimalRecord256(raw,context)).toBe(false);expect(JSON.stringify(raw)).toBe(excess);
  raw.food=a.food;expect(JSON.stringify(raw)).toBe(admitted);
  const historical=structuredClone(a);delete historical.growthTracker;delete historical.ageCoreRemainder;delete historical.health;
  historical.food=animalSpecies('muffalo').nutrition;expect(validCaravanAnimalRecord256(historical,context)).toBe(true);
  historical.food=a.food;expect(validCaravanAnimalRecord256(historical,context)).toBe(false);
 });
 it('retains the real producer kibble49 reservation and physical target through RAW transport',()=>{
  const {w,a}=prepared('muffalo');addMaterial(w,'food',75,{type:'ground',x:a.x,z:a.z},'kibble');
  const stock=w.piles.find(p=>p.item==='kibble')!,offer=animalFoods(w,a).find(p=>p.kind==='pile'&&p.id===stock.id);
  expect(offer).toBeDefined();expect(offer!.quantity).toBe(49);expect(a.food).toBe(0);expect(stock.quantity).toBe(75);
  a.meal={kind:offer!.kind,id:offer!.id,quantity:offer!.quantity,progress:0};a.state='eating';
  expect(animalMealTarget(w,a)).toBe(stock.owner);
  const raw:World=JSON.parse(JSON.stringify(w)),before=JSON.stringify(raw);
  expect(validFodderTransport(raw,256)).toBe(true);expect(JSON.stringify(raw)).toBe(before);
  const resumed=raw.wildlife!.animals[0]!;expect(animalMealTarget(raw,resumed)).toEqual({type:'ground',x:a.x,z:a.z});
  resumed.meal!.quantity=50;expect(validFodderTransport(raw,256)).toBe(false);
  resumed.meal!.quantity=49;resumed.growthTracker!.value=.1;expect(validFodderTransport(raw,256)).toBe(false);
  const malformed:World=JSON.parse(JSON.stringify(w));let reads=0;
  Object.defineProperty(malformed.wildlife!.animals[0]!,'growthTracker',{enumerable:true,get(){reads++;throw Error('RAW growth getter must not execute');}});
  expect(validFodderTransport(malformed,256)).toBe(false);expect(reads).toBe(0);
  // No ingestion/step was simulated: the original pile and biological need are conserved.
  expect(stock.quantity).toBe(75);expect(a.food).toBe(0);expect(a.meal.quantity).toBe(49);
 });
});
