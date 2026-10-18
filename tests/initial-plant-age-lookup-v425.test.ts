import {afterEach,expect,test,vi} from 'vitest';
import {initialPlantLifespanCore256,validInitialPlantAge256} from '../src/sim/initial-plant-age-256.ts';
import {WILD_PLANT_GENERATION_FACTS_256 as FACTS} from '../src/sim/wild-plant-generation-data-256.ts';
import type {Resource} from '../src/sim/types.ts';

afterEach(()=>{
 vi.doUnmock('../src/sim/wild-plant-generation-data-256.ts');
 vi.resetModules();
});

test('every current species retains the exact original Core lifespan and age boundary',()=>{
 for(const species of new Set(Object.values(FACTS).map(def=>def.species))){
  // Literal historical oracle, independent of the private lookup.
  const definition=Object.values(FACTS).find(def=>def.species===species)!;
  const expected=Math.trunc(Math.fround(Math.fround(definition.growDays*definition.lifespanDaysPerGrowDays)*60000));
  expect(initialPlantLifespanCore256(species),species).toBe(expected);
  const limit=Math.max(1,expected-50);
  const plant=(initialAgeCore:number):Partial<Resource>=>({kind:'tree',species,
   plantLife:{since:0,age:0,darkTicks:0,nextCheck:1,initialAgeCore}});
  expect(validInitialPlantAge256(plant(limit-1),256),species).toBe(true);
  expect(validInitialPlantAge256(plant(limit),256),species).toBe(false);
  expect(validInitialPlantAge256(plant(limit-1),255),species).toBe(false);
 }
});

test('unknown identities remain absent without coercion or inherited-name matches',()=>{
 let coercions=0;
 const object={toString(){coercions++;return 'maple';}};
 for(const species of [undefined,null,NaN,0,-0,false,'','unknown-species','toString','constructor','__proto__',Symbol('maple'),object,new String('maple')]){
  expect(initialPlantLifespanCore256(species)).toBeUndefined();
 }
 expect(coercions).toBe(0);
});

test('duplicate definitions keep the first lifespan and preserve fractional Core rounding',async()=>{
 // Declared definition fixture: a future duplicate must retain find-first.
 vi.resetModules();
 vi.doMock('../src/sim/wild-plant-generation-data-256.ts',()=>({
  WILD_PLANT_GENERATION_FACTS_256:{
   First:{species:'duplicate',growDays:.123456789,lifespanDaysPerGrowDays:7.123456789},
   Second:{species:'duplicate',growDays:100,lifespanDaysPerGrowDays:8},
   Fractional:{species:'fractional',growDays:.99999999,lifespanDaysPerGrowDays:1},
  },
 }));
 const isolated=await import('../src/sim/initial-plant-age-256.ts');
 expect(isolated.initialPlantLifespanCore256('duplicate')).toBe(52766);
 // Core's intermediate float32 rounds this product to 1 before scaling.
 expect(isolated.initialPlantLifespanCore256('fractional')).toBe(60000);
 expect(isolated.initialPlantLifespanCore256('missing')).toBeUndefined();
});
