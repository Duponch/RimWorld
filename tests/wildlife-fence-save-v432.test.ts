import {expect,test} from 'vitest';
import {createWorld,stepWorld} from '../src/sim/engine.ts';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {adultAgeTicks,animalNutritionMax} from '../src/sim/animal-life.ts';
import {animalCore256} from '../src/sim/animal-core-v256.ts';
import {animalNavigation,moveAnimal} from '../src/sim/wildlife-navigation.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {validateWildlife} from '../src/sim/wildlife-save.ts';
import {SCHEMA_VERSION,type Structure} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

const from={x:4,z:4},to={x:5,z:4};
const obstruction='Wildlife edge crosses a solid obstacle.';

/** Small prepared current factory world; only the physical edge and strict
 * save/reprise boundary are qualified here, never natural campaign density. */
function fixture(species:WildAnimal['species']='squirrel',prospective=true){
  const world=createWorld(432,16,16);
  expect(world.schemaVersion).toBe(SCHEMA_VERSION);expect(Number(SCHEMA_VERSION)).toBe(263);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.jobs=[];world.structures=[];world.piles=[];world.stockpiles=[];world.growingZones=[];
  refreshStock(world);
  const animal:WildAnimal={id:world.nextId++,species,sex:'female',...from,
    ageTicks:adultAgeTicks(species)+6000,food:0,rest:1,state:'idle',path:[],nextDecision:world.tick+1};
  if(prospective)attachGeneratedAnimalGrowth256(animal,world.tick*10,world.schemaVersion);
  animal.food=Math.fround(animalNutritionMax(animal)*.8);
  world.wildlife={profile:'temperate-hares-v1',rng:432,animals:[animal],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  expect(validateWorld(world)).toEqual([]);
  const barrier=(kind:'fence'|'wall'|'fence-gate'):Structure=>{
    const structure:Structure={id:world.nextId++,kind,...to,orientation:0,footprint:'standard',material:'wood'};
    if(kind==='fence-gate')structure.door=newDoorState(world.tick);
    world.structures.push(structure);return structure;
  };
  return {world,animal,barrier};
}

test('a real native squirrel edge across a fence saves, resumes and continues exactly without changing its captured motion',()=>{
  const {world,animal,barrier}=fixture();barrier('fence');
  expect(animalCore256('squirrel').race.roamMtbDays).toBeNull();
  expect(animalNavigation(world).step(from,to)).toBe(false);
  const nativeNavigation=animalNavigation(world,false,true);
  expect(nativeNavigation.step(from,to)).toBe(true);
  animal.path=[{...to}];expect(moveAnimal(world,animal,nativeNavigation.step)).toBe(true);
  expect(animal.motion!.end).toBeGreaterThan(world.tick);
  const before=JSON.stringify(world),captured=structuredClone(animal.motion);
  expect(validateWorld(world)).toEqual([]);expect(JSON.stringify(world)).toBe(before);
  const raw=serializeCampaign(world),resumed=deserializeCampaign(raw);
  expect(serializeCampaign(resumed)).toBe(raw);
  expect('wildlife'in resumed&&resumed.wildlife?.animals[0]?.motion).toEqual(captured);
  stepWorld(world);stepWorld(resumed);
  expect(validateWorld(world)).toEqual([]);expect(validateWorld(resumed)).toEqual([]);
  expect(serializeCampaign(resumed)).toBe(serializeCampaign(world));
});

test.each(['wall','fence-gate'] as const)('a non-roaming native animal still refuses a captured edge into a %s',kind=>{
  const {world,animal,barrier}=fixture();
  // The edge is produced on free ground; the explicit obstruction is then
  // introduced to test strict admission, never to claim a legal crossing.
  const navigation=animalNavigation(world,false,true);
  animal.path=[{...to}];expect(moveAnimal(world,animal,navigation.step)).toBe(true);
  const structure=barrier(kind);
  if(kind==='fence-gate')expect(structure.door?.open).toBe(false);
  expect(animalNavigation(world,false,true).step(from,to)).toBe(false);
  const before=JSON.stringify(world);
  expect(validateWorld(world)).toContain(obstruction);
  expect(()=>serializeCampaign(world)).toThrow();
  expect(()=>deserializeCampaign(before)).toThrow();
  expect(JSON.stringify(world)).toBe(before);
});

test('ordinary muffalo fences remain solid even though an unblocked edge has otherwise valid captured timing',()=>{
  const {world,animal,barrier}=fixture('muffalo');
  animal.path=[{...to}];expect(moveAnimal(world,animal,animalNavigation(world).step)).toBe(true);
  barrier('fence');expect(animalNavigation(world).step(from,to)).toBe(false);
  const before=JSON.stringify(world);
  expect(validateWorld(world)).toContain(obstruction);
  expect(()=>deserializeCampaign(before)).toThrow();expect(JSON.stringify(world)).toBe(before);
});

test('historical hare fence admission stays read-only and actual256 squirrel fields remain future at255',()=>{
  // Explicit isolated historical wildlife reader context, not an old full
  // campaign constructed by rewriting a current schema or migrating data.
  const old=fixture('hare',false);old.barrier('fence');
  old.animal.path=[{...to}];expect(moveAnimal(old.world,old.animal,animalNavigation(old.world,false,true).step)).toBe(true);
  const literal=JSON.stringify(old.world);
  expect(validateWildlife(old.world,255,new Set())).toEqual([]);
  expect(JSON.stringify(old.world)).toBe(literal);
  expect(old.animal.growthTracker).toBeUndefined();expect(old.animal.wander).toBeUndefined();
  const actual=fixture();actual.barrier('fence');actual.animal.path=[{...to}];
  expect(moveAnimal(actual.world,actual.animal,animalNavigation(actual.world,false,true).step)).toBe(true);
  const future=JSON.stringify(actual.world);
  expect(validateWildlife(actual.world,255,new Set()).length).toBeGreaterThan(0);
  expect(JSON.stringify(actual.world)).toBe(future);
});
