import {expect,test} from 'vitest';
import {animalThermalProfile466} from '../src/sim/animal-thermal-v466.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

/** Independent freshly resolved Core XML oracle, installation1.6.4871rev590.
 * DLL SHA256 5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a.
 * Resolution/provenance: docs/research/animal-thermal-v466-reference.md.
 * This table is NOT built from production profile helpers or JS catalogs.
 * cold=false denotes the native HypothermicSlowdown race, deliberately
 * outside this lot's Hypothermia exposure; it does not mean cold immunity.
 * Inputs below are declared profile-only preparations, not played animals.
 */
const PRIMARY_SPECIES_466=[
  {"species":"alpaca","min":-20.0,"max":45.0,"cold":true},
  {"species":"grizzly-bear","min":-40.0,"max":40.0,"cold":true},
  {"species":"polar-bear","min":-55.0,"max":40.0,"cold":true},
  {"species":"bison","min":-55.0,"max":45.0,"cold":true},
  {"species":"boomalope","min":-15.0,"max":40.0,"cold":true},
  {"species":"boomrat","min":-15.0,"max":40.0,"cold":true},
  {"species":"capybara","min":-10.0,"max":50.0,"cold":true},
  {"species":"caribou","min":-50.0,"max":40.0,"cold":true},
  {"species":"cassowary","min":-8.0,"max":50.0,"cold":true},
  {"species":"cat","min":-25.0,"max":40.0,"cold":true},
  {"species":"chinchilla","min":-15.0,"max":55.0,"cold":true},
  {"species":"cobra","min":0.0,"max":60.0,"cold":true},
  {"species":"cougar","min":-25.0,"max":40.0,"cold":true},
  {"species":"deer","min":-30.0,"max":40.0,"cold":true},
  {"species":"donkey","min":-25.0,"max":45.0,"cold":true},
  {"species":"dromedary","min":-22.0,"max":60.0,"cold":true},
  {"species":"duck","min":-10.0,"max":40.0,"cold":true},
  {"species":"elephant","min":-12.0,"max":50.0,"cold":true},
  {"species":"elk","min":-50.0,"max":40.0,"cold":true},
  {"species":"emu","min":-8.0,"max":50.0,"cold":true},
  {"species":"arctic-fox","min":-50.0,"max":40.0,"cold":true},
  {"species":"fennec-fox","min":-30.0,"max":40.0,"cold":true},
  {"species":"red-fox","min":-35.0,"max":40.0,"cold":true},
  {"species":"gazelle","min":-10.0,"max":40.0,"cold":true},
  {"species":"guinea-pig","min":-15.0,"max":55.0,"cold":true},
  {"species":"hare","min":-30.0,"max":40.0,"cold":true},
  {"species":"horse","min":-35.0,"max":45.0,"cold":true},
  {"species":"husky","min":-50.0,"max":40.0,"cold":true},
  {"species":"ibex","min":-30.0,"max":40.0,"cold":true},
  {"species":"iguana","min":0.0,"max":60.0,"cold":true},
  {"species":"labrador-retriever","min":-30.0,"max":40.0,"cold":true},
  {"species":"lynx","min":-50.0,"max":40.0,"cold":true},
  {"species":"megascarab","min":0.0,"max":60.0,"cold":false},
  {"species":"megasloth","min":-55.0,"max":40.0,"cold":true},
  {"species":"megaspider","min":-40.0,"max":60.0,"cold":false},
  {"species":"monkey","min":-5.0,"max":50.0,"cold":true},
  {"species":"muffalo","min":-55.0,"max":45.0,"cold":true},
  {"species":"ostrich","min":-8.0,"max":50.0,"cold":true},
  {"species":"panther","min":-8.0,"max":50.0,"cold":true},
  {"species":"raccoon","min":-30.0,"max":40.0,"cold":true},
  {"species":"rat","min":-30.0,"max":40.0,"cold":true},
  {"species":"rhinoceros","min":-8.0,"max":40.0,"cold":true},
  {"species":"snow-hare","min":-55.0,"max":40.0,"cold":true},
  {"species":"spelopede","min":-25.0,"max":60.0,"cold":false},
  {"species":"squirrel","min":-35.0,"max":40.0,"cold":true},
  {"species":"tortoise","min":0.0,"max":50.0,"cold":true},
  {"species":"turkey","min":-8.0,"max":40.0,"cold":true},
  {"species":"warg","min":-40.0,"max":40.0,"cold":true},
  {"species":"wild-boar","min":-23.0,"max":40.0,"cold":true},
  {"species":"arctic-wolf","min":-55.0,"max":40.0,"cold":true},
  {"species":"timber-wolf","min":-40.0,"max":40.0,"cold":true},
  {"species":"yak","min":-45.0,"max":40.0,"cold":true},
  {"species":"yorkshire-terrier","min":-15.0,"max":40.0,"cold":true},
] as const satisfies readonly {species:WildAnimal['species'];min:number;max:number;cold:boolean}[];

test.each(PRIMARY_SPECIES_466)('fresh Core thermal bounds and giver classification for $species',expected=>{
  const animal:Pick<WildAnimal,'species'|'growthTracker'>={species:expected.species,growthTracker:{revision:1,value:1,nextCheckCore:null}};
  const before=JSON.stringify(animal);
  expect(animalThermalProfile466(animal)).toEqual({min:expected.min,max:expected.max,cold:expected.cold});
  expect(JSON.stringify(animal)).toBe(before);
});

test.each(['hare','snow-hare','deer','muffalo','gazelle','dromedary','red-fox'] as const)('the unmarked historical %s receives no native thermal profile by species alone',species=>{
  const animal:Pick<WildAnimal,'species'|'growthTracker'>={species};
  expect(animalThermalProfile466(animal)).toBeUndefined();
  expect(Object.hasOwn(animal,'growthTracker')).toBe(false);
});

test('the independent source census contains exactly53 species,50ordinary cold givers and3slowdown races',()=>{
  expect(PRIMARY_SPECIES_466).toHaveLength(53);
  expect(new Set(PRIMARY_SPECIES_466.map(row=>row.species)).size).toBe(53);
  expect(PRIMARY_SPECIES_466.filter(row=>row.cold)).toHaveLength(50);
  expect(PRIMARY_SPECIES_466.filter(row=>!row.cold).map(row=>row.species).sort()).toEqual(['megascarab','megaspider','spelopede']);
});
