import { expect,test } from 'vitest';
import { withoutMiningSkill,withoutTelevisionRecreation } from './scenarios/legacy-skills.ts';
import { createWorld,stepWorld } from '../src/sim/engine.ts';
import { adoptWeather,newWeatherState } from '../src/sim/weather.ts';
import { adoptRainElectrical } from '../src/sim/rain-electric.ts';
import { validRainElectrical,validateRainElectrical } from '../src/sim/rain-electric-save.ts';
import { deserializeWorld,serializeWorld } from '../src/sim/serialization.ts';
import { requestPowerFlick } from '../src/sim/power-flick.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { CLOTHING_RESEARCH_COST } from '../src/sim/research.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixturePower } from './scenarios/power.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

function historicalContacts():World {
  const world=createWorld(194,32,32);world.tick=20;
  world.weather=newWeatherState(world.seed);world.weather.lastCoreTick=200;
  world.rainElectrical={revision:1,adoptedAt:0,lastCoreTick:200,rng:19,discharges:2,
    lastDischarge:{coreTick:194,structureId:1,kind:'battery',x:10,z:10}};
  return world;
}

test('bounded strict guard accepts historical destruction, rejecting future, impossible or extended history',()=>{
  const world=historicalContacts(),good=structuredClone(world.rainElectrical!);
  expect(validRainElectrical(good,181,world)).toBe(true);expect(validRainElectrical(good,180,world)).toBe(false);
  expect(validRainElectrical(undefined,180,world)).toBe(true);
  const last=good.lastDischarge!;
  const invalid:unknown[]=[null,[],{}, {...good,revision:2},{...good,extra:true},{...good,rng:0},{...good,rng:0x100000000},
    {...good,adoptedAt:-1},{...good,adoptedAt:world.tick+1},{...good,lastCoreTick:199},{...good,discharges:3},
    {...good,discharges:1.5},{...good,discharges:0},{...good,lastDischarge:undefined},
    {...good,lastDischarge:{...last,extra:1}}, {...good,lastDischarge:{...last,coreTick:193}},
    {...good,lastDischarge:{...last,coreTick:291}},{...good,lastDischarge:{...last,coreTick:97}},
    {...good,lastDischarge:{...last,structureId:0}},{...good,lastDischarge:{...last,structureId:world.nextId}},
    {...good,lastDischarge:{...last,kind:'power-conduit'}},{...good,lastDischarge:{...last,x:world.width}},
    {...good,lastDischarge:{...last,z:-1}},{...good,lastDischarge:{...last,x:10.1}},
  ];
  for(const value of invalid)expect(validRainElectrical(value,181,world),JSON.stringify(value)).toBe(false);
  const zero={revision:1,adoptedAt:20,lastCoreTick:200,rng:1,discharges:0};
  expect(validRainElectrical(zero,181,world)).toBe(true);
  expect(validRainElectrical({...zero,lastDischarge:undefined},181,world)).toBe(false);
});

test('rain state depends on real contemporaneous weather basics and safe Core clocks',()=>{
  const world=historicalContacts(),good=world.rainElectrical!;
  for(const weather of [undefined,{}, {...world.weather!,revision:2},{...world.weather!,lastCoreTick:199},
    {...world.weather!,rng:0},{...world.weather!,originTick:1},{...world.weather!,originTick:21}]){
    const broken={...world,weather} as unknown as World;
    expect(validRainElectrical(good,181,broken)).toBe(false);
  }
  expect(validRainElectrical(good,181,{...world,tick:Number.MAX_SAFE_INTEGER})).toBe(false);
  expect(validRainElectrical(good,181,{...world,width:0})).toBe(false);
  expect(validateRainElectrical(world)).toEqual([]);
});

test('strict 180 migration stays neutral until actual resume, and forbids future rain state',()=>{
  const world=createWorld(194,32,32);adoptWeather(world);
  const legacy=withoutTelevisionRecreation(withoutMiningSkill(JSON.parse(serializeWorld(world)))) as Record<string,unknown>;legacy.schemaVersion=180;
  const migrated=deserializeWorld(JSON.stringify(legacy));
  expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);expect(migrated.rainElectrical).toBeUndefined();
  const expected=structuredClone(legacy) as unknown as World;
  for(const pawn of expected.pawns){pawn.recreation.tolerance.television=0;pawn.recreation.bored.television=false;}
  expect({...JSON.parse(serializeWorld(migrated)),schemaVersion:180}).toEqual(expected);
  const paused=serializeWorld(migrated);stepWorld(migrated,0);expect(serializeWorld(migrated)).toBe(paused);
  stepWorld(migrated,1);expect(migrated.rainElectrical!.adoptedAt).toBe(0);expect(migrated.rainElectrical!.lastCoreTick).toBe(10);
  legacy.rainElectrical=migrated.rainElectrical;expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow();
});

test('real full save continuation preserves every stream and journal',()=>{
  const world=createWorld(194,32,32);adoptWeather(world);adoptRainElectrical(world);
  stepWorld(world,15);const peer=deserializeWorld(serializeWorld(world));
  stepWorld(world,25);stepWorld(peer,25);expect(serializeWorld(peer)).toBe(serializeWorld(world));
});

function historicalElectricBench():{world:World;benchId:number;generatorId:number} {
  const world=medicalCamp(1),generator=fixturePower(world,'wood-generator',5,5);
  world.research??={project:null,points:0};
  world.research.points=CLOTHING_RESEARCH_COST;world.research.completedAt=world.tick;
  const bench={id:world.nextId++,kind:'electric-tailor-bench' as const,x:8,z:8,orientation:0 as const,
    footprint:'standard' as const,material:'steel' as const,bills:[],power:newPowerState('electric-tailor-bench')};
  world.structures.push(bench);return {world,benchId:bench.id,generatorId:generator.id};
}

test('schema 180 refuses a future tailoring switch or flick job independently of rain state',()=>{
  const {world,benchId}=historicalElectricBench();withoutMiningSkill(world);
  const source=withoutTelevisionRecreation(withoutMiningSkill(JSON.parse(serializeWorld(world)))) as World;
  (source as unknown as {schemaVersion:number}).schemaVersion=180;
  expect(Object.hasOwn(source,'rainElectrical')).toBe(false);
  // Prove that the same historical object is otherwise valid before adding
  // each future capability, so another invalid fixture cannot mask this guard.
  expect(deserializeWorld(JSON.stringify(source)).structures.find(s=>s.id===benchId)!.power).toEqual({on:false,parentId:null});
  for(const on of [false,true]){
    const switched=structuredClone(source);switched.structures.find(s=>s.id===benchId)!.power!.switchOn=on;
    expect(()=>deserializeWorld(JSON.stringify(switched))).toThrow(/Invalid electrical state/);
  }
  expect(requestPowerFlick(world,benchId,false).ok).toBe(true);
  const futureJob=withoutTelevisionRecreation(JSON.parse(serializeWorld(world))) as World;
  (futureJob as unknown as {schemaVersion:number}).schemaVersion=180;
  expect(Object.hasOwn(futureJob,'rainElectrical')).toBe(false);
  expect(futureJob.jobs.some(j=>j.flick?.structureId===benchId)).toBe(true);
  expect(()=>deserializeWorld(JSON.stringify(futureJob))).toThrow(/Switch job does not match its device/);
});

test('an old disconnected tailoring bench migrates neutrally and starts only after a real resumed tick',()=>{
  const {world,benchId,generatorId}=historicalElectricBench();
  const source=withoutTelevisionRecreation(withoutMiningSkill(JSON.parse(serializeWorld(world)))) as Record<string,unknown>;source.schemaVersion=180;
  const migrated=deserializeWorld(JSON.stringify(source)),bench=migrated.structures.find(s=>s.id===benchId)!;
  const expected=structuredClone(source) as unknown as World;
  for(const pawn of expected.pawns){pawn.recreation.tolerance.television=0;pawn.recreation.bored.television=false;}
  expect({...JSON.parse(serializeWorld(migrated)),schemaVersion:180}).toEqual(expected);
  expect(bench.power).toEqual({on:false,parentId:null});expect(migrated.rainElectrical).toBeUndefined();
  const before=serializeWorld(migrated);stepWorld(migrated,0);expect(serializeWorld(migrated)).toBe(before);
  stepWorld(migrated,20);
  expect(bench.power!.parentId).toBe(generatorId);expect(bench.power!.on).toBe(true);
  expect(bench.power!.switchOn).toBeUndefined();expect(migrated.rainElectrical).toBeUndefined();
  expect(()=>serializeWorld(migrated)).not.toThrow();
});

