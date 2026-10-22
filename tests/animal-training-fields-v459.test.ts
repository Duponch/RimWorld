/** Minimal detached field fixtures, not a played campaign.
 * Minimal values exercise FIELD guards, not a fabricated valid World or an
 * acquired caisson/group transition. Existing service tests own that proof. */
import {describe,it,expect} from 'vitest';
import {validAnimalTrainingField282,validAnimalHaulField282} from '../src/sim/animal-training-save-282.ts';

const fieldAnimal=()=>({id:100,species:'labrador-retriever',training:{revision:1,sinceCore:1000,lastLocalCore:2000,nextDecayCore:720000,tamenessWanted:true,
 obedience:{steps:3,learned:true,wanted:true},haul:{steps:0,learned:false,wanted:false},lastAttemptCore:500,masterId:20}});

describe('V459 detached and suspended field boundaries',()=>{
 it('keeps absent historical fields neutral, without granting a tracker',()=>{
  const animal={id:100,species:'labrador-retriever'};
  for(const version of [281,282,283]){
   expect(validAnimalTrainingField282(animal,version,200,1000)).toBe(true);
   expect(validAnimalHaulField282(animal,version,200,1000,32,32,false)).toBe(true);
  }
  expect(Object.keys(animal)).toEqual(['id','species']);
 });
 it('admits the new own-data shape only in282 and rejects an unevaluated accessor',()=>{
  const animal=fieldAnimal();
  expect(validAnimalTrainingField282(animal,282,200,1000)).toBe(true);
  for(const version of [281,283])expect(validAnimalTrainingField282(animal,version,200,1000)).toBe(false);
  expect(validAnimalTrainingField282({...animal,training:undefined},282,200,1000)).toBe(false);
  let reads=0;
  const accessor={id:100,species:'labrador-retriever'};
  Object.defineProperty(accessor,'training',{enumerable:true,get(){reads++;return animal.training;}});
  expect(validAnimalTrainingField282(accessor,282,200,1000)).toBe(false);
  expect(reads).toBe(0);
 });
 it('uses the actual held frontier, while retaining a factual pre-adoption attempt',()=>{
  const animal=fieldAnimal();
  expect(validAnimalTrainingField282(animal,282,1000,1000,{heldAt:200})).toBe(true);
  expect(animal.training.lastAttemptCore).toBeLessThan(animal.training.sinceCore);
  expect(validAnimalTrainingField282({...animal,training:{...animal.training,lastLocalCore:2010}},282,1000,1000,{heldAt:200})).toBe(false);
  expect(validAnimalTrainingField282({...animal,training:{...animal.training,lastAttemptCore:2010}},282,1000,1000,{heldAt:200})).toBe(false);
 });
 it('allows detached training but no map-local carry, including unresolved holding',()=>{
  const animal=fieldAnimal();
  expect(validAnimalTrainingField282(animal,282,200,1000)).toBe(true);
  expect(validAnimalHaulField282(animal,282,200,1000,32,32,false)).toBe(true);
  const holding={...animal,training:{...animal.training,lastHaulCheckCore:1500},haul:{phase:'holding',carryPileId:50,sinceCore:1800}};
  // Local shape only: the separate captured-owner guard must resolve pile50.
  expect(validAnimalHaulField282(holding,282,200,1000,32,32)).toBe(true);
  expect(validAnimalHaulField282(holding,282,200,1000,32,32,false)).toBe(false);
  for(const version of [281,283])expect(validAnimalHaulField282(holding,version,200,1000,32,32)).toBe(false);
 });
});
