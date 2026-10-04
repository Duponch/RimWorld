import {expect,test} from 'vitest';
import {stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {startSadWander} from '../src/sim/mental-break.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {medicalCamp} from './scenarios/health.ts';
import { withoutPlantsSkill, withoutTelevisionRecreation, withMigratedTelevisionRecreation } from './scenarios/legacy-skills.ts';
import {withoutPredatorFoodPolicies,withoutPredatorApparelPolicies} from './scenarios/legacy-save.ts';

function declared148(withWander=false):World {
  const world=medicalCamp();
  if(withWander)expect(startSadWander(world,world.pawns[0]!)).toBe(true);
  for(const policy of world.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!=='fine-meal'&&item!=='lavish-meal'&&item!=='vegetarian-fine-meal'&&item!=='carnivore-fine-meal'&&item!=='vegetarian-lavish-meal'&&item!=='carnivore-lavish-meal');
  withoutPlantsSkill(world);
  withoutPredatorFoodPolicies(world);withoutPredatorApparelPolicies(world);
  (world as {schemaVersion:number}).schemaVersion=(withoutTelevisionRecreation(world),148);
  return world;
}

test('V148 migration is neutral for an ordinary pawn and an existing sad wander',()=>{
  for(const old of [declared148(),declared148(true)]) {
    const original=structuredClone(old);
    const resumed=deserializeWorld(JSON.stringify(old));
    expect(resumed).toEqual(withMigratedTelevisionRecreation({...original,schemaVersion:SCHEMA_VERSION}));
    expect(resumed.rng).toBe(original.rng);
    expect(resumed.pawns[0]!.mental).toEqual(original.pawns[0]!.mental);
    expect(old).toEqual(original);
    expect(validateWorld(resumed)).toEqual([]);
    Object.assign(original,withMigratedTelevisionRecreation({...original,schemaVersion:SCHEMA_VERSION}));
    stepWorld(resumed,60);
    stepWorld(original,60);
    expect(resumed).toEqual(original);
  }
});

test('a declared V148 save rejects a food binge and future mental fields before migration',()=>{
  const futureCrisis=declared148(true);
  futureCrisis.pawns[0]!.mental!.crisis!.kind='food-binge';
  expect(()=>deserializeWorld(JSON.stringify(futureCrisis))).toThrow(/Invalid version 148 save/);

  const futureField=declared148(true);
  Object.assign(futureField.pawns[0]!.mental!.crisis!,{foodPileId:42});
  expect(()=>deserializeWorld(JSON.stringify(futureField))).toThrow(/Invalid version 148 save/);

  const futureRoot=declared148();
  futureRoot.pawns[0]!.mental={below:[0,0,0],cooldown:0,catharsis:[]};
  Object.assign(futureRoot.pawns[0]!.mental!,{foodBinge:{foodPileId:42}});
  expect(()=>deserializeWorld(JSON.stringify(futureRoot))).toThrow(/Invalid version 148 save/);
});

test('V150 validates the complete persisted food-binge crisis and rejects corrupt state',()=>{
  const world=declared148(true);
  Object.assign(world,withMigratedTelevisionRecreation({...world,schemaVersion:SCHEMA_VERSION}));
  world.pawns[0]!.mental!.crisis!.kind='food-binge';
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);

  for(const change of [
    (w:World)=>{w.pawns[0]!.mental!.crisis!.age=45000;},
    (w:World)=>{w.pawns[0]!.mental!.crisis!.target={x:-1,z:0};},
    (w:World)=>{w.pawns[0]!.mental!.crisis!.waitUntil=w.tick+21;},
    (w:World)=>{Object.assign(w.pawns[0]!.mental!.crisis!,{foodPileId:42});},
  ]) {
    const corrupt=structuredClone(world);change(corrupt);
    expect(validateWorld(corrupt).length).toBeGreaterThan(0);
    expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow();
  }
});
