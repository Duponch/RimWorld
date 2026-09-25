import { SCHEMA_VERSION } from '../src/sim/types';
import { withoutPawnSkills, withMigratedSkills } from './scenarios/legacy-skills';
import { expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, createWorld, deserializeWorld, refreshStock, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { FOOD_ITEMS, MAX_FOOD_POLICIES } from '../src/sim/food-policy';
import { queryPawnStatus } from '../src/sim/diagnostics';
import { CAMPFIRE_CAPACITY } from '../src/sim/fuel';
import { processNeeds, type NeedContext } from '../src/sim/needs';
import { processCooking } from '../src/sim/cooking';
import { withoutFoodPolicies } from './scenarios/legacy-save';
import type { Command, World } from '../src/sim/types';

function camp():World {
  const w=createWorld(42,16,16);w.pawns=[w.pawns[0]!];w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];w.stockpiles=[];
  Object.assign(w.pawns[0]!,{x:2,z:2,hunger:20,rest:100,priorities: {clean:0,firefight:0,warden:0,basic:3,hunt:0,research:0, patient:0,bedrest:0,doctor:0,art:0,craft:2,mine:2,gather:0,build:0,haul:0,grow:0,cook:0}});refreshStock(w);return w;
}
function command(w:World,c:Command){expect(applyCommand(w,c),JSON.stringify(c)).toEqual({ok:true});}
function checked(w:World,ticks=1){for(let i=0;i<ticks;i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}}
function until(w:World,f:()=>boolean,limit=1200){for(let i=0;i<limit&&!f();i++)checked(w);expect(f(),JSON.stringify(w.pawns)).toBe(true);}
function selection(w:World){const task=w.pawns[0]!.need;return task?.kind==='eat'?w.piles.find(p=>p.id===(task.carryPileId??task.sourcePileId))?.item:null;}

test('régimes partagés : commandes atomiques, copie indépendante, limites et migration V12 sans réécrire les états',()=>{
  const w=camp(),p=w.pawns[0]!,id=w.nextFoodPolicyId,entityId=w.nextId;
  command(w,{type:'food-policy-create',name:'  Camping  ',copyFromId:3});expect(w.nextId).toBe(entityId);expect(w.foodPolicies.at(-1)!.name).toBe('Camping');
  const allowed=['berries'] as const;command(w,{type:'food-policy-update',policyId:id,name:'Baies',allowed:[...allowed]});
  expect(w.foodPolicies.find(p=>p.id===3)!.allowed).toContain('rice');
  command(w,{type:'food-policy-assign',pawnId:p.id,policyId:id});
  const copy=structuredClone(p);copy.id=w.nextId++;copy.x=4;w.pawns.push(copy);
  const input=[...FOOD_ITEMS];command(w,{type:'food-policy-update',policyId:id,name:'Partagé',allowed:input});input.length=0;
  expect(w.foodPolicies.at(-1)!.allowed).toEqual(FOOD_ITEMS);expect(w.pawns.every(p=>p.foodPolicyId===id)).toBe(true);
  const before=serializeWorld(w);
  for(const c of [
    {type:'food-policy-create',name:' '},{type:'food-policy-create',name:'x'.repeat(61)},
    {type:'food-policy-create',name:'X',copyFromId:999}, {type:'food-policy-assign',pawnId:-1,policyId:id},
    {type:'food-policy-assign',pawnId:p.id,policyId:999},{type:'food-policy-delete',policyId:id},
    {type:'food-policy-update',policyId:id,name:'X',allowed:['wood']},
    {type:'food-policy-update',policyId:id,name:'X',allowed:['rice','rice']},
    {type:'food-policy-update',policyId:id,name:'X',allowed:Array(2)},
  ]) {expect(applyCommand(w,c as Command).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
  for(const q of w.pawns)command(w,{type:'food-policy-assign',pawnId:q.id,policyId:1});command(w,{type:'food-policy-delete',policyId:id});
  while(w.foodPolicies.length<MAX_FOOD_POLICIES)command(w,{type:'food-policy-create',name:'Réserve'});
  const full=serializeWorld(w);expect(applyCommand(w,{type:'food-policy-create',name:'Excès'}).ok).toBe(false);expect(serializeWorld(w)).toBe(full);
  for(const mutate of [(v:any)=>v.pawns[0].foodPolicyId=999,(v:any)=>v.foodPolicies[1].id=v.foodPolicies[0].id,(v:any)=>v.foodPolicies[0].allowed=['wood'],(v:any)=>v.nextFoodPolicyId=1,(v:any)=>v.foodPolicies=[],(v:any)=>v.foodPolicies[0].name='<script>'+ 'x'.repeat(60)]) {
    const bad=JSON.parse(full);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const old=withoutFoodPolicies(JSON.parse(full));(old.schemaVersion=12,withoutPawnSkills(old));for(const a of old.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete old.deconstructed;delete old.packed;
  const restored=deserializeWorld(JSON.stringify(old));expect(restored.schemaVersion).toBe(SCHEMA_VERSION);expect(restored.pawns.every(p=>p.foodPolicyId===1)).toBe(true);
  const stripped=withoutFoodPolicies(JSON.parse(serializeWorld(restored)));(stripped.schemaVersion=12,withoutPawnSkills(stripped));for(const a of stripped.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete stripped.deconstructed;delete stripped.packed;expect(stripped).toEqual(old);
  const control=withMigratedSkills(deserializeWorld(full));checked(restored,100);checked(control,100);
  expect(withoutFoodPolicies(JSON.parse(serializeWorld(restored)))).toEqual(withoutFoodPolicies(JSON.parse(serializeWorld(control))));
});

test('choix physique : exclure avant préférence et pourriture, accès de repli et faim sans exception silencieuse',()=>{
  const w=camp(),p=w.pawns[0]!;
  addGroundMaterial(w,'food',1,{x:3,z:2},'simple-meal');addGroundMaterial(w,'food',30,{x:12,z:2},'berries');addGroundMaterial(w,'food',30,{x:6,z:2},'rice');
  w.piles[0]!.rot={progress:4*6000-100,atTick:0};
  command(w,{type:'food-policy-update',policyId:1,name:'Matières crues',allowed:['berries','rice']});
  for(let z=0;z<16;z++)w.tiles[z*16+8]={terrain:'water'};
  checked(w);expect(selection(w)).toBe('rice');expect(p.hunger).toBeLessThan(20);
  until(w,()=>p.hunger>90);expect(w.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(14);
  const blocked=camp(),q=blocked.pawns[0]!;q.hunger=0;addGroundMaterial(blocked,'food',3,{x:3,z:2},'survival-meal');
  command(blocked,{type:'food-policy-assign',pawnId:q.id,policyId:4});checked(blocked,100);
  expect(q.need).toBeNull();expect(q.hunger).toBe(0);expect(blocked.stock.food).toBe(3);expect(queryPawnStatus(blocked,q).code).toBe('food-policy-blocked');
  command(blocked,{type:'food-policy-assign',pawnId:q.id,policyId:1});until(blocked,()=>blocked.stock.food===2);expect(q.hunger).toBeCloseTo(90,6); // One 0.9-nutrition ration from zero; no artificial full bar.
});

test('repas engagé : changement pendant prélèvement, transport ou ingestion, réservations et reprise exacte',()=>{
  const original=camp();addGroundMaterial(original,'food',4,{x:12,z:12},'survival-meal');
  original.structures=[{id:original.nextId++,kind:'table',x:6,z:6,orientation:0,footprint:'standard',quality:'normal'},{id:original.nextId++,kind:'stool',x:7,z:6,orientation:0,footprint:'standard',quality:'normal'}];
  const states=new Map<string,string>();
  for(let i=0;i<500&&original.pawns[0]!.hunger<90;i++){
    checked(original);const task=original.pawns[0]!.need;
    if(task?.kind==='eat'&&!states.has(task.phase))states.set(task.phase,serializeWorld(original));
  }
  expect([...states.keys()]).toEqual(expect.arrayContaining(['pickup','travel','ingest']));
  for(const phase of ['pickup','travel','ingest']) {
    const w=deserializeWorld(states.get(phase)!),p=w.pawns[0]!;
    command(w,{type:'food-policy-assign',pawnId:p.id,policyId:4});const restored=deserializeWorld(serializeWorld(w));
    until(w,()=>p.hunger>90);checked(restored,w.tick-restored.tick);expect(serializeWorld(restored)).toBe(serializeWorld(w));expect(w.stock.food).toBe(3);
    p.hunger=20;p.needCooldown=0;checked(w,100);expect(p.need).toBeNull();expect(w.stock.food).toBe(3);
  }
});

test('régime personnel indépendant du transport et des ingrédients ; une cargaison interdite reste de la matière',()=>{
  const w=camp(),p=w.pawns[0]!;p.hunger=100;p.priorities.haul=1;
  command(w,{type:'food-policy-assign',pawnId:p.id,policyId:4});addGroundMaterial(w,'food',10,{x:3,z:2},'rice');
  command(w,{type:'stockpile',enabled:true,x:12,z:12,filters:{wood:false,food:true}});checked(w);expect(p.haul?.phase).toBe('deliver');
  p.hunger=20;p.needCooldown=0;checked(w);expect(p.need).toBeNull();expect(w.stock.food).toBe(10);expect(w.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(10);
  p.hunger=100;until(w,()=>w.piles.some(p=>p.item==='rice'&&p.owner.type==='ground'&&p.owner.x===12&&p.owner.z===12));
  p.priorities.haul=0;p.priorities.cook=1;
  const fire={id:w.nextId++,kind:'campfire' as const,x:10,z:10,orientation:0 as const,footprint:'standard' as const,fuel:{ticks:CAMPFIRE_CAPACITY,burned:0,autoRefuel:true},bills:[]};w.structures.push(fire);
  command(w,{type:'bill-add',structureId:fire.id});until(w,()=>w.events.some(e=>e.message.includes('a cuisiné 1 repas simple')));
  expect(w.piles.filter(p=>p.item==='rice')).toHaveLength(0);expect(w.piles.filter(p=>p.item==='simple-meal').reduce((n,p)=>n+p.quantity,0)).toBe(1);
  expect(p.foodPolicyId).toBe(4);expect(p.hunger).toBeLessThan(100);
  // The 100-pawn audit exposed a hungry cook waiting with a completed product
  // while the tick's path-search budget was exhausted. The task must stay valid.
  p.hunger=19;p.needCooldown=0;p.planCooldown=0;
  const budgetExhausted:NeedContext={search:()=>null,move:()=>{throw new Error('No route was granted');},release:()=>{throw new Error('Cooking should continue');},event:()=>{throw new Error('No new work finished');}};
  expect(processNeeds(w,p,budgetExhausted)).toBe(false);processCooking(w,p,{...budgetExhausted,workRate:()=>{throw new Error('Output must not do recipe work');}});
  expect(p.cooking?.phase).toBe('output');expect(p.state).toBe('working');expect(validateWorld(w)).toEqual([]);
  const replay=deserializeWorld(serializeWorld(w));until(w,()=>p.cooking===null);checked(replay,w.tick-replay.tick);expect(serializeWorld(replay)).toBe(serializeWorld(w));expect(w.stock.food).toBe(1);
});
