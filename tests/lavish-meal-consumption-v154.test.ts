import {expect,test} from 'vitest';
import {createWorld,addGroundMaterial,refreshStock,stepWorld,validateWorld,serializeWorld,deserializeWorld,applyCommand} from '../src/sim/index.ts';
import {initialFoodPolicies,foodAllowed} from '../src/sim/food-policy.ts';
import {foodScore} from '../src/sim/food-selection.ts';
import {moodThoughts,expireMealMemories} from '../src/sim/mood.ts';
import {feedingCamp} from './scenarios/feeding.ts';
import type {ItemId} from '../src/sim/items.ts';
import type {World} from '../src/sim/types.ts';

function hungryColony():World {
  const w=createWorld(154,16,16);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.stockpiles=[];w.pawns=w.pawns.slice(0,1);
  const pawn=w.pawns[0]!;Object.assign(pawn,{x:2,z:2,hunger:20,rest:100});
  for(const work of Object.keys(pawn.priorities))pawn.priorities[work as keyof typeof pawn.priorities]=0;
  refreshStock(w);return w;
}
function until(w:World,done:()=>boolean,max=500):void {
  for(let i=0;i<max&&!done();i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),`condition at tick ${w.tick}`).toBe(true);
}
function offer(w:World,item:ItemId):void {
  const pawn=w.pawns[0]!;pawn.hunger=20;pawn.needCooldown=0;
  addGroundMaterial(w,'food',1,{x:3,z:2},item);refreshStock(w);
}

test('lavish meal is selected, then its +12 memory replaces fine +5 only after real ingestion',()=>{
  const w=hungryColony(),pawn=w.pawns[0]!;
  expect(initialFoodPolicies()[1]!.allowed).toContain('lavish-meal');
  expect(foodScore('lavish-meal',2)).toBeGreaterThan(foodScore('fine-meal',2));
  offer(w,'fine-meal');
  until(w,()=>pawn.memories.some(m=>m.kind==='ate-fine-meal'));
  expect(pawn.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(false);
  offer(w,'lavish-meal');
  until(w,()=>pawn.need?.kind==='eat'&&pawn.need.phase==='ingest');
  expect(pawn.memories.some(m=>m.kind==='ate-fine-meal')).toBe(true);
  expect(pawn.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(false);
  const resumed=deserializeWorld(serializeWorld(w));
  until(w,()=>pawn.memories.some(m=>m.kind==='ate-lavish-meal'));
  stepWorld(resumed,w.tick-resumed.tick);expect(resumed).toEqual(w);
  expect(pawn.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
  const memory=pawn.memories.find(m=>m.kind==='ate-lavish-meal')!;
  expect(moodThoughts(w,pawn)).toEqual(expect.arrayContaining([expect.objectContaining({id:'ate-lavish-meal',label:'A mangé un repas gastronomique',offset:12,expiresAt:memory.expiresAt})]));
  offer(w,'fine-meal');
  until(w,()=>pawn.memories.some(m=>m.kind==='ate-fine-meal'));
  expect(pawn.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(false);
  w.tick=pawn.memories.find(m=>m.kind==='ate-fine-meal')!.expiresAt;expireMealMemories(w,pawn);
  expect(pawn.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
});

test('old meals-only policies stay unchanged until edited, and assisted feeding grants patient memory',()=>{
  const w=hungryColony(),pawn=w.pawns[0]!;
  w.foodPolicies[1]!.allowed=['simple-meal','fine-meal','survival-meal','legacy-portion'];pawn.foodPolicyId=2;
  expect(foodAllowed(w,pawn,'lavish-meal')).toBe(false);
  expect(applyCommand(w,{type:'food-policy-update',policyId:2,name:'Repas uniquement',allowed:['simple-meal','fine-meal','lavish-meal','survival-meal','legacy-portion']}).ok).toBe(true);
  expect(foodAllowed(w,pawn,'lavish-meal')).toBe(true);
  const care=feedingCamp(),doctor=care.pawns[0]!,patient=care.pawns[1]!;
  care.piles[0]!.item='lavish-meal';refreshStock(care);
  until(care,()=>doctor.feed?.phase==='feed');
  expect(patient.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(false);
  const before=care.piles.reduce((sum,p)=>sum+(p.item==='lavish-meal'?p.quantity:0),0);
  until(care,()=>patient.memories.some(m=>m.kind==='ate-lavish-meal'));
  expect(care.piles.reduce((sum,p)=>sum+(p.item==='lavish-meal'?p.quantity:0),0)).toBe(before-1);
  expect(doctor.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(false);
});
