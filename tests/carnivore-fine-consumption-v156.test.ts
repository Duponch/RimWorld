import {expect,test} from 'vitest';
import {addGroundMaterial,applyCommand,createWorld,deserializeWorld,refreshStock,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {foodAllowed,initialFoodPolicies} from '../src/sim/food-policy.ts';
import {foodScore} from '../src/sim/food-selection.ts';
import {foodCanCarryPoison} from '../src/sim/food-poisoning.ts';
import {ROT_DAYS} from '../src/sim/food-preservation.ts';
import {ITEM_DEFINITIONS} from '../src/sim/items.ts';
import {moodThoughts} from '../src/sim/mood.ts';
import {tradeCatalogueEntry} from '../src/sim/trade-catalogue.ts';
import {feedingCamp} from './scenarios/feeding.ts';
import type {ItemId} from '../src/sim/items.ts';
import type {World} from '../src/sim/types.ts';

const item:ItemId='carnivore-fine-meal';
function hungryColony():World {
  const w=createWorld(156,16,16);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.stockpiles=[];w.pawns=w.pawns.slice(0,1);
  const pawn=w.pawns[0]!;Object.assign(pawn,{x:2,z:2,hunger:20,rest:100});
  for(const work of Object.keys(pawn.priorities))pawn.priorities[work as keyof typeof pawn.priorities]=0;
  refreshStock(w);return w;
}
function until(w:World,done:()=>boolean,max=500):void {
  for(let i=0;i<max&&!done();i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),`condition at tick ${w.tick}`).toBe(true);
}
function offer(w:World,meal:ItemId):void {
  const pawn=w.pawns[0]!;pawn.hunger=20;pawn.needCooldown=0;
  addGroundMaterial(w,'food',1,{x:3,z:2},meal);refreshStock(w);
}

test('carnivore fine product has its own identity and fine-meal food properties',()=>{
  expect(ITEM_DEFINITIONS[item]).toMatchObject({label:'Plat carnivore raffiné',kind:'food',stackLimit:10,nutrition:90,maxIngest:1});
  expect(ROT_DAYS[item]).toBe(4);
  expect(tradeCatalogueEntry(item)).toEqual(tradeCatalogueEntry('fine-meal'));
  expect(foodCanCarryPoison(item)).toBe(true);
  expect(foodScore(item,2)).toBe(foodScore('fine-meal',2));
  expect(initialFoodPolicies()[1]!.allowed).toContain(item);
});

test('only completed ingestion grants shared +5 memory and replaces lavish memory',()=>{
  const w=hungryColony(),pawn=w.pawns[0]!;
  pawn.memories.push({kind:'ate-lavish-meal',expiresAt:w.tick+1000});
  offer(w,item);
  until(w,()=>pawn.need?.kind==='eat'&&pawn.need.phase==='ingest');
  expect(pawn.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(true);
  const resumed=deserializeWorld(serializeWorld(w));
  until(w,()=>pawn.memories.some(m=>m.kind==='ate-fine-meal'));
  stepWorld(resumed,w.tick-resumed.tick);expect(resumed).toEqual(w);
  expect(pawn.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(false);
  expect(moodThoughts(w,pawn)).toEqual(expect.arrayContaining([expect.objectContaining({id:'ate-fine-meal',offset:5})]));
  offer(w,'lavish-meal');until(w,()=>pawn.memories.some(m=>m.kind==='ate-lavish-meal'));
  expect(pawn.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
});

test('an inherited restrictive policy needs permission, and assisted feeding grants patient memory',()=>{
  const w=hungryColony(),pawn=w.pawns[0]!;
  w.foodPolicies[1]!.allowed=w.foodPolicies[1]!.allowed.filter(id=>id!==item);pawn.foodPolicyId=2;
  expect(foodAllowed(w,pawn,item)).toBe(false);
  expect(applyCommand(w,{type:'food-policy-update',policyId:2,name:'Repas uniquement',allowed:[...w.foodPolicies[1]!.allowed,item]}).ok).toBe(true);
  expect(foodAllowed(w,pawn,item)).toBe(true);
  const care=feedingCamp(),doctor=care.pawns[0]!,patient=care.pawns[1]!;
  care.piles[0]!.item=item;refreshStock(care);
  until(care,()=>doctor.feed?.phase==='feed');
  expect(patient.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
  const before=care.piles.reduce((sum,p)=>sum+(p.item===item?p.quantity:0),0);
  until(care,()=>patient.memories.some(m=>m.kind==='ate-fine-meal'));
  expect(care.piles.reduce((sum,p)=>sum+(p.item===item?p.quantity:0),0)).toBe(before-1);
  expect(doctor.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
});
