import { withoutHunting } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { createWorld,applyCommand,serializeWorld,deserializeWorld,validateWorld,stepWorld } from '../src/sim/index';
import { enableWildlife,advanceWildlife,reconcileWildlife } from '../src/sim/wildlife';
import { HARE } from '../src/sim/wildlife-state';
import { plantGrowth } from '../src/sim/plants';
import { addGroundMaterial,reservedSource,refreshStock } from '../src/sim/materials';
import { animalNavigation,moveAnimal } from '../src/sim/wildlife-navigation';
import { constructionSiteFree } from '../src/sim/construction-rules';
import { newDoorState } from '../src/sim/door-rules';
import { updateDoors } from '../src/sim/doors';
import { MotionRecorder } from '../src/bridge/motion-tracks';
import { SCHEMA_VERSION } from '../src/sim/types';
import type { World } from '../src/sim/types';

function fixture(){const w=createWorld(42,16,16);w.resources=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.structures=[];w.jobs=[];w.piles=[];refreshStock(w);w.resources.push({id:w.nextId++,kind:'berries',x:3,z:3,amount:10,growth:1,growthTick:0});enableWildlife(w,1);const a=w.wildlife!.animals[0]!;a.x=1;a.z=1;a.food=.02;a.rest=1;return w;}
function advance(w:World,n=1){for(let i=0;i<n;i++){w.tick++;advanceWildlife(w);refreshStock(w);}}
function until(w:World,f:()=>boolean,n=1000){for(let i=0;i<n&&!f();i++){advance(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}expect(f()).toBe(true);}

test('physical grazing, fractional growth, discrete ingestion and exact continuation with motion tracks',()=>{
  const w=fixture(),s=w.wildlife!,a=s.animals[0]!,plant=w.resources[0]!,initialRng=w.rng,recorder=new MotionRecorder();
  const harvestId=w.nextId++;w.jobs.push({id:harvestId,kind:'harvest',x:plant.x,z:plant.z,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
  expect(validateWorld(w)).toEqual([]);
  advance(w);expect(a.meal?.id).toBe(plant.id);expect(s.eatenNutrition).toBe(0);
  until(w,()=>a.state==='eating');recorder.capture(w);expect(recorder.snapshot().find(t=>t.id===a.id)?.segments.length).toBeGreaterThan(0);
  expect(Math.abs(a.x-plant.x)+Math.abs(a.z-plant.z)).toBeLessThanOrEqual(1);expect(a.motion?.end).toBeLessThanOrEqual(w.tick);
  advance(w,HARE.ingestTicks-1);expect(s.eatenNutrition).toBe(0);const copy=deserializeWorld(serializeWorld(w));
  advance(w);advance(copy);expect(copy).toEqual(w);expect(s.eatenNutrition).toBeGreaterThan(.17);expect(a.food).toBe(HARE.nutrition);
  expect(plantGrowth(w,plant)).toBeLessThanOrEqual(.65);expect(w.jobs.some(j=>j.id===harvestId)).toBe(false);
  expect(plantGrowth(w,plant)).toBeCloseTo(1-s.eatenNutrition/.35,8);expect(s.eatenPlants).toBe(0);expect(w.rng).toBe(initialRng);
  for(let i=0;i<700;i++){advance(w);advance(copy);}expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
  // A small edible plant is wholly consumed, without inventing harvested items.
  a.food=0;delete a.meal;a.path=[];delete a.motion;a.state='idle';a.nextDecision=w.tick;
  w.resources=[{id:w.nextId++,kind:'rice',x:a.x,z:a.z,amount:6,growth:.1,growthTick:w.tick}];
  until(w,()=>s.eatenPlants===1);expect(w.resources).toEqual([]);expect(w.piles).toEqual([]);
});

test('closed doors, corner geometry, Euclidean movement, no remote feeding and construction protection',()=>{
  const w=fixture(),a=w.wildlife!.animals[0]!;
  w.resources[0]!.x=8;w.resources[0]!.z=1;
  for(let z=0;z<w.height;z++)w.structures.push({id:w.nextId++,kind:z===1?'door':'wall',material:'wood',x:5,z,orientation:0,footprint:'standard',...(z===1?{door:newDoorState(w.tick)}:{})});
  advance(w,250);expect(w.wildlife!.eatenNutrition).toBe(0);expect(a.x).toBeLessThan(5);
  const door=w.structures.find(s=>s.kind==='door')!;door.door!.open=true;door.door!.changedAt=0;door.door!.from=1;door.door!.holdOpen=true;door.door!.closeAt=null;
  until(w,()=>w.wildlife!.eatenNutrition>0,2000);
  a.path=[];delete a.meal;a.x=6;a.z=6;delete a.motion;a.state='idle';a.path=[{x:7,z:7}];
  expect(moveAnimal(w,a,animalNavigation(w).step)).toBe(true);expect(a.motion!.end-a.motion!.start).toBeCloseTo(5*Math.SQRT2);
  const job={id:w.nextId++,kind:'wall' as const,x:6,z:7,orientation:0 as const,footprint:'standard' as const,progress:0,reservedBy:null,status:'pending' as const,escrow:{wood:0,food:0}};
  expect(constructionSiteFree(w,job,undefined,{})).toBe(false);
  a.x=5;a.z=1;a.motion={from:{x:4,z:1},to:{x:5,z:1},start:w.tick,end:w.tick+1,speedFactor:3,terrainDelay:0};a.path=[];door.door!.closeAt=w.tick;
  updateDoors(w);expect(door.door!.open).toBe(true);
  // Solid orthogonal corner prevents a diagonal even when its endpoint is free.
  w.tiles[6*w.width+7]={terrain:'rock'};expect(animalNavigation(w).step({x:6,z:6},{x:7,z:7})).toBe(false);
});

test('shared food reservations, source removal and sleep have physical, persistent effects',()=>{
  const w=fixture(),a=w.wildlife!.animals[0]!;w.resources=[];addGroundMaterial(w,'food',10,{x:3,z:3},'rice');
  const p=w.piles[0]!;until(w,()=>!!a.meal);expect(reservedSource(w,p.id)).toBe(4);
  until(w,()=>a.state==='eating');
  expect(applyCommand(w,{type:'stockpile',x:10,z:10,enabled:true,filters:{wood:false,food:true}}).ok).toBe(true);
  const carrier=w.pawns[0]!;expect(applyCommand(w,{type:'order-haul',pawnId:carrier.id,target:{type:'pile',pileId:p.id},queue:false}).ok).toBe(true);expect(carrier.haul?.quantity).toBe(6);expect(reservedSource(w,p.id)).toBe(10);
  advance(w,HARE.ingestTicks);expect(p.quantity).toBe(6);expect(w.wildlife!.eatenItems).toBe(4);expect(w.stock.food).toBe(6);
  expect(applyCommand(w,{type:'clear-orders',pawnId:carrier.id}).ok).toBe(true);
  a.food=.01;a.state='idle';a.nextDecision=w.tick;until(w,()=>!!a.meal);w.piles=[];reconcileWildlife(w);refreshStock(w);expect(a.meal).toBeUndefined();expect(reservedSource(w,p.id)).toBe(0);
  delete a.motion;a.path=[];a.state='idle';a.food=.2;a.rest=.5;a.nextDecision=w.tick;w.tick=5500;
  advance(w);expect(a.state).toBe('sleeping');const cell={x:a.x,z:a.z},rest=a.rest;advance(w,100);expect(a.rest).toBeGreaterThan(rest);expect({x:a.x,z:a.z}).toEqual(cell);
  const copy=deserializeWorld(serializeWorld(w));advance(copy,200);advance(w,200);expect(copy).toEqual(w);
  // Adult animal life stages allow sleep while starving; do not import the
  // human wake/refusal rule. Food remains absent, without a fictitious refill.
  a.food=0;advance(w,20);expect(a.state).toBe('sleeping');expect(a.food).toBe(0);
  a.state='idle';a.rest=.1;a.nextDecision=w.tick;advance(w);expect(a.state).toBe('sleeping');
});

test('strict V75 migration, rejected corrupted identities/tasks/edges and ordinary camp activation',()=>{
  const w=createWorld(93,64,64),old=structuredClone(w) as unknown as {schemaVersion:number};old.schemaVersion=75;withoutHunting(old);
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.wildlife).toBeUndefined();expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  expect(applyCommand(migrated,{type:'enable-wildlife'}).ok).toBe(true);const count=migrated.wildlife!.animals.length;expect(count).toBeGreaterThan(0);const before=serializeWorld(migrated);applyCommand(migrated,{type:'enable-wildlife'});expect(serializeWorld(migrated)).toBe(before);
  const legacy=structuredClone(migrated) as unknown as {schemaVersion:number};legacy.schemaVersion=75;expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow('Invalid version 75');
  for(const mutate of [(w:World)=>{w.wildlife!.animals[0]!.id=w.pawns[0]!.id;},(w:World)=>{w.wildlife!.animals[0]!.food=1;},(w:World)=>{w.wildlife!.animals[0]!.meal={id:999999,kind:'plant',quantity:1,progress:5};},(w:World)=>{w.wildlife!.animals[0]!.path=[{x:60,z:60}];}]){const bad=structuredClone(migrated);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  for(let t=0;t<1000;t++){stepWorld(migrated);if(t%50===0)expect(validateWorld(migrated),`tick ${migrated.tick}`).toEqual([]);}expect(migrated.wildlife!.animals).toHaveLength(count);
});
