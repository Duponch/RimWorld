import {expect,test} from 'vitest';
import {addGroundMaterial,applyCommand,createWorld,deserializeWorld,refreshStock,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {FOOD_ITEMS,foodAllowed,initialFoodPolicies} from '../src/sim/food-policy.ts';
import {foodScore} from '../src/sim/food-selection.ts';
import {expireFood} from '../src/sim/food-expiration.ts';
import {ROT_DAYS} from '../src/sim/food-preservation.ts';
import {ITEM_DEFINITIONS} from '../src/sim/items.ts';
import {moodThoughts} from '../src/sim/mood.ts';
import {pileMaxHp} from '../src/sim/thing-damage-rules.ts';
import {tradeCatalogueEntry} from '../src/sim/trade-catalogue.ts';
import {TICKS_PER_DAY,type World} from '../src/sim/types.ts';
import {feedingCamp} from './scenarios/feeding.ts';

const PRODUCT='vegetarian-lavish-meal' as const;
function hungryColony():World {
  const w=createWorld(157,16,16);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.stockpiles=[];w.pawns=w.pawns.slice(0,1);
  const pawn=w.pawns[0]!;Object.assign(pawn,{x:2,z:2,hunger:20,rest:100});
  for(const work of Object.keys(pawn.priorities))pawn.priorities[work as keyof typeof pawn.priorities]=0;
  refreshStock(w);return w;
}
function until(w:World,done:()=>boolean,max=500):void {
  for(let i=0;i<max&&!done();i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),`condition at tick ${w.tick}`).toBe(true);
}
function offer(w:World,item:typeof PRODUCT|'fine-meal'|'lavish-meal'):void {
  const pawn=w.pawns[0]!;pawn.hunger=20;pawn.needCooldown=0;
  addGroundMaterial(w,'food',1,{x:3,z:2},item);refreshStock(w);
}

test('the vegetarian lavish product has its own food, preservation and local trade identity',()=>{
  expect(ITEM_DEFINITIONS[PRODUCT]).toMatchObject({label:'Plat végétarien gastronomique',kind:'food',nutrition:100,maxIngest:1,stackLimit:10});
  expect(FOOD_ITEMS).toContain(PRODUCT);
  expect(ROT_DAYS[PRODUCT]).toBe(4);
  expect(foodScore(PRODUCT,2)).toBe(foodScore('lavish-meal',2));
  expect(pileMaxHp({kind:'food',item:PRODUCT})).toBe(50);
  expect(tradeCatalogueEntry(PRODUCT)).toMatchObject({baseMarketValue:40,visitorHandles:false,playerCanSell:false});
  for(const index of [0,1,2])expect(initialFoodPolicies()[index]!.allowed).toContain(PRODUCT);
  expect(initialFoodPolicies()[3]!.allowed).not.toContain(PRODUCT);

  const w=hungryColony();addGroundMaterial(w,'food',2,{x:3,z:2},PRODUCT);
  w.tick=4*TICKS_PER_DAY;expireFood(w);
  expect(w.piles.some(p=>p.item===PRODUCT)).toBe(false);
  expect(w.spoiled[PRODUCT]).toBe(2);
});

test('policy filters a fresh choice; completed ingestion replaces and renews the shared lavish memory through save continuation',()=>{
  const w=hungryColony(),pawn=w.pawns[0]!;
  w.foodPolicies[1]!.allowed=['fine-meal','lavish-meal'];pawn.foodPolicyId=2;
  offer(w,PRODUCT);
  stepWorld(w,20);
  expect(pawn.need?.kind).not.toBe('eat');
  expect(foodAllowed(w,pawn,PRODUCT)).toBe(false);
  w.piles=w.piles.filter(p=>p.item!==PRODUCT);refreshStock(w);
  offer(w,'fine-meal');
  until(w,()=>pawn.memories.some(m=>m.kind==='ate-fine-meal'));
  expect(applyCommand(w,{type:'food-policy-update',policyId:2,name:'Repas uniquement',allowed:['fine-meal','lavish-meal',PRODUCT]}).ok).toBe(true);
  expect(foodAllowed(w,pawn,PRODUCT)).toBe(true);
  offer(w,PRODUCT);
  until(w,()=>pawn.need?.kind==='eat'&&pawn.need.phase==='ingest');
  const held=w.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id&&p.item===PRODUCT);
  expect(held?.quantity).toBe(1);
  expect(pawn.memories.some(m=>m.kind==='ate-fine-meal')).toBe(true);
  expect(pawn.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(false);
  const resumed=deserializeWorld(serializeWorld(w));
  until(w,()=>pawn.memories.some(m=>m.kind==='ate-lavish-meal'));
  stepWorld(resumed,w.tick-resumed.tick);expect(resumed).toEqual(w);
  expect(w.piles.some(p=>p.id===held!.id)).toBe(false);
  expect(pawn.memories.some(m=>m.kind==='ate-fine-meal')).toBe(false);
  const first=pawn.memories.find(m=>m.kind==='ate-lavish-meal')!;
  expect(first.expiresAt).toBe(w.tick+TICKS_PER_DAY);
  expect(moodThoughts(w,pawn)).toEqual(expect.arrayContaining([expect.objectContaining({id:'ate-lavish-meal',offset:12})]));

  offer(w,'lavish-meal');
  until(w,()=>pawn.memories.some(m=>m.kind==='ate-lavish-meal'&&m.expiresAt>first.expiresAt));
  expect(pawn.memories.filter(m=>m.kind==='ate-lavish-meal')).toHaveLength(1);
  offer(w,'fine-meal');
  until(w,()=>pawn.memories.some(m=>m.kind==='ate-fine-meal'));
  expect(pawn.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(false);
});

test('assisted feeding consumes one vegetarian lavish meal before giving the patient memory and contamination',()=>{
  const w=feedingCamp(),doctor=w.pawns[0]!,patient=w.pawns[1]!;
  const source=w.piles[0]!;source.item=PRODUCT;source.foodPoison={fraction:1,cause:'filthy-kitchen'};refreshStock(w);
  until(w,()=>doctor.feed?.phase==='feed');
  expect(patient.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(false);
  expect(patient.health?.foodPoisoning).toBeUndefined();
  const before=w.piles.reduce((sum,p)=>sum+(p.item===PRODUCT?p.quantity:0),0);
  until(w,()=>patient.memories.some(m=>m.kind==='ate-lavish-meal'));
  expect(w.piles.reduce((sum,p)=>sum+(p.item===PRODUCT?p.quantity:0),0)).toBe(before-1);
  expect(patient.health?.foodPoisoning).toMatchObject({cause:'filthy-kitchen',item:PRODUCT});
  expect(doctor.memories.some(m=>m.kind==='ate-lavish-meal')).toBe(false);
});
