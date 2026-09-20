import { expect,test } from 'vitest';
import { createWorld,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { createScenarioWorld } from '../src/sim/new-game';
import { SCHEMA_VERSION } from '../src/sim/types';
import { withoutFoodCrops,withMigratedBasic } from './scenarios/legacy-skills';

test('V79 is validated before a neutral migration; unknown origins are never inferred',()=>{
  const old:any=withoutFoodCrops(createWorld(42,32,32));old.schemaVersion=79;
  const restored=deserializeWorld(JSON.stringify(old));
  expect(restored).toEqual(withMigratedBasic({...old,schemaVersion:SCHEMA_VERSION}));expect(restored.scenario).toBeUndefined();
  for(const mutate of [(w:any)=>w.scenario={id:'survivors',revision:1,landing:{x:16,z:16}},(w:any)=>w.pawns[0].priorities.hunt=-1,(w:any)=>w.piles[0].quantity=0]){
    const broken=structuredClone(old);mutate(broken);expect(()=>deserializeWorld(JSON.stringify(broken))).toThrow(/version 79/);
  }
});

test('scenario provenance survives continuation; loading does not grant possessions or reset knowledge',()=>{
  const world=createScenarioWorld(93,64,'survivors');stepWorld(world,250);
  const snapshot=serializeWorld(world),restored=deserializeWorld(snapshot);
  expect(serializeWorld(restored)).toBe(snapshot);expect(validateWorld(restored)).toEqual([]);
  stepWorld(world,200);stepWorld(restored,200);expect(serializeWorld(restored)).toBe(serializeWorld(world));
  for(const stamp of [null,{id:'unknown',revision:1,landing:{x:16,z:16}},{id:'survivors',revision:2,landing:{x:16,z:16}},
    {id:'survivors',revision:1,landing:{x:64,z:16}},{id:'survivors',revision:1,landing:{x:16.5,z:16}},
    {id:'survivors',revision:1,landing:{x:16,z:16},giveMore:true}]){
    const corrupt=JSON.parse(snapshot);corrupt.scenario=stamp;expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow();
  }
});
