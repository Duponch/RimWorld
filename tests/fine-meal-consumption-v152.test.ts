import { expect, test } from 'vitest';
import { createWorld, addGroundMaterial, refreshStock, stepWorld, validateWorld, serializeWorld, deserializeWorld, applyCommand } from '../src/sim/index.ts';
import { initialFoodPolicies, foodAllowed } from '../src/sim/food-policy.ts';
import { foodScore } from '../src/sim/food-selection.ts';
import { moodThoughts, expireMealMemories } from '../src/sim/mood.ts';
import { feedingCamp } from './scenarios/feeding.ts';
import type { World } from '../src/sim/types.ts';

function hungryColony(): World {
  const world=createWorld(152,16,16);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.piles=[];world.stockpiles=[];
  world.pawns=world.pawns.slice(0,1);
  const pawn=world.pawns[0]!;Object.assign(pawn,{x:2,z:2,hunger:20,rest:100});
  for(const work of Object.keys(pawn.priorities))pawn.priorities[work as keyof typeof pawn.priorities]=0;
  refreshStock(world);return world;
}
function until(world:World,done:()=>boolean,max=300):void {
  for(let i=0;i<max&&!done();i++){stepWorld(world);expect(validateWorld(world),`tick ${world.tick}`).toEqual([]);}
  expect(done(),`condition at tick ${world.tick}`).toBe(true);
}

test('fine meal is a distinct allowed product, preferred at equal distance, and its +5 memory follows completed physical ingestion',()=>{
  const world=hungryColony(),pawn=world.pawns[0]!;
  expect(initialFoodPolicies()[1]!.allowed).toContain('fine-meal');
  expect(foodScore('fine-meal',2)).toBeGreaterThan(foodScore('simple-meal',2));
  addGroundMaterial(world,'food',1,{x:3,z:2},'simple-meal');
  addGroundMaterial(world,'food',1,{x:2,z:3},'fine-meal');
  refreshStock(world);
  stepWorld(world);expect(pawn.need?.kind).toBe('eat');
  const chosen=pawn.need?.kind==='eat'?pawn.need.sourcePileId:0;
  expect(world.piles.find(p=>p.id===chosen)?.item).toBe('fine-meal');
  until(world,()=>pawn.need?.kind==='eat'&&pawn.need.phase==='ingest');
  expect(pawn.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
  const held=world.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)!;
  expect(held.item).toBe('fine-meal');
  const resumed=deserializeWorld(serializeWorld(world));
  until(world,()=>pawn.memories.some(m=>m.kind==='ate-fine-meal'));
  stepWorld(resumed,world.tick-resumed.tick);expect(resumed).toEqual(world);
  expect(world.piles.some(p=>p.id===held.id)).toBe(false);
  const memory=pawn.memories.find(m=>m.kind==='ate-fine-meal')!;
  expect(moodThoughts(world,pawn)).toEqual(expect.arrayContaining([expect.objectContaining({id:'ate-fine-meal',label:'A mangé un bon repas',offset:5,expiresAt:memory.expiresAt})]));
  world.tick=memory.expiresAt;expireMealMemories(world,pawn);
  expect(pawn.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
});

test('an old meals-only policy stays unchanged until the player edits it',()=>{
  const world=hungryColony(),pawn=world.pawns[0]!;
  world.foodPolicies[1]!.allowed=['simple-meal','survival-meal','legacy-portion'];
  pawn.foodPolicyId=2;
  expect(foodAllowed(world,pawn,'fine-meal')).toBe(false);
  expect(applyCommand(world,{type:'food-policy-update',policyId:2,name:'Repas uniquement',allowed:['simple-meal','fine-meal','survival-meal','legacy-portion']}).ok).toBe(true);
  expect(foodAllowed(world,pawn,'fine-meal')).toBe(true);
});

test('bedside feeding grants the fine-meal memory to the patient only after the actual portion is eaten',()=>{
  const world=feedingCamp(),doctor=world.pawns[0]!,patient=world.pawns[1]!;
  world.piles[0]!.item='fine-meal';refreshStock(world);
  until(world,()=>doctor.feed?.phase==='feed');
  expect(patient.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
  const before=world.piles.reduce((sum,p)=>sum+(p.item==='fine-meal'?p.quantity:0),0);
  until(world,()=>patient.memories.some(m=>m.kind==='ate-fine-meal'));
  expect(world.piles.reduce((sum,p)=>sum+(p.item==='fine-meal'?p.quantity:0),0)).toBe(before-1);
  expect(doctor.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
  expect(moodThoughts(world,patient).some(t=>t.id==='ate-fine-meal'&&t.offset===5)).toBe(true);
});
