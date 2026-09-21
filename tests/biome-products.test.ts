import { test,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { applyCommand,createWorld,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { addGroundMaterial,refreshStock } from '../src/sim/materials';
import { APPAREL,APPAREL_FAMILIES,APPAREL_MATERIALS,apparelItemFor,newApparelState } from '../src/sim/apparel-rules';
import { validApparelShape } from '../src/sim/apparel-save';
import { foodScore } from '../src/sim/food-selection';
import { rawFoodPoisonChance } from '../src/sim/food-poisoning';
import { ROT_DAYS } from '../src/sim/food-preservation';
import { countedProducts,newCookingBill } from '../src/sim/cooking-bills';
import { queryArea } from '../src/sim/designation';
import type { World,Command } from '../src/sim/types';

const command=(w:World,c:Command)=>expect(applyCommand(w,c)).toMatchObject({ok:true});
test('young biome trees can be cleared by rectangle without becoming a wood harvest',()=>{
  const w=createWorld(911,16,16);w.jobs=[];w.resources=[{id:w.nextId++,kind:'tree',species:'oak',x:2,z:2,amount:35,growth:0,growthTick:w.tick}];
  const rectangle={type:'area' as const,from:{x:2,z:2},to:{x:2,z:2}};
  expect(queryArea(w,{...rectangle,action:'cut'})).toMatchObject({ok:true,cells:[34]});
  expect(queryArea(w,{...rectangle,action:'chop'})).toMatchObject({ok:true,cells:[]});
});
function until(w:World,done:()=>boolean,limit=3000):void {
  for(let i=0;i<limit&&!done();i++){stepWorld(w);if(i%100===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify(w.pawns.map(p=>({state:p.state,task:p.cooking,haul:p.haul})))).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}

test.each(['plainleather','bluefur','camelhide'] as const)('physical %s workshop: one material, saved unfinished work, finished quality and actual wear',material=>{
  const w=createWorld(9101,16,16);w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.stockpiles=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.pawns=w.pawns.slice(0,1);w.tick=2000;
  const pawn=w.pawns[0]!;Object.assign(pawn,{x:4,z:4,hunger:100,rest:100});pawn.schedule.fill('work');
  for(const key of Object.keys(pawn.priorities))pawn.priorities[key as keyof typeof pawn.priorities]=0;
  pawn.priorities.craft=1;pawn.skills.crafting={level:8,xp:0,dailyXp:0,passion:1};
  addGroundMaterial(w,'textile',60,{x:2,z:4},material);refreshStock(w);
  command(w,{type:'designate',kind:'crafting-spot',x:8,z:8});const station=w.structures[0]!;
  command(w,{type:'bill-add',structureId:station.id});station.bills![0]!.destination='drop';
  until(w,()=>!!w.piles.find(p=>(p.unfinished?.progress??0)>0));
  const unfinished=w.piles.find(p=>p.unfinished)!;expect(unfinished.unfinished).toMatchObject({material,authorId:pawn.id});
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,100);stepWorld(resumed,100);expect(resumed).toEqual(w);
  const item=apparelItemFor('tribalwear',material);
  until(w,()=>w.piles.some(p=>p.item===item)&&!pawn.cooking);
  expect(w.piles.filter(p=>p.item===material||p.unfinished)).toEqual([]);
  const garment=w.piles.find(p=>p.item===item)!;expect(garment.apparel).toMatchObject({material,hitPoints:130});
  command(w,{type:'order-equipment',pawnId:pawn.id,itemId:garment.id,action:'wear',queue:false});until(w,()=>garment.owner.type==='apparel');
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('all five families accept the new leathers, with distinct useful insulation and strict schema boundaries',()=>{
  const ids=new Set<string>();for(const material of APPAREL_MATERIALS)for(const family of APPAREL_FAMILIES){
    const item=apparelItemFor(family,material);ids.add(item);
    const pile={kind:'apparel',item,quantity:1,owner:{type:'ground',x:1,z:1},apparel:newApparelState(item)};
    expect(validApparelShape(pile,91)).toBe(true);
    if(!['cloth','light-leather'].includes(material))expect(validApparelShape(pile,90)).toBe(false);
  }
  expect(ids.size).toBe(25);
  expect(APPAREL['bluefur-parka'].coldInsulation).toBe(40);
  expect(APPAREL['plainleather-parka'].coldInsulation).toBe(32);
  expect(APPAREL['camelhide-duster'].heatInsulation).toBeCloseTo(20.4);
  expect(APPAREL['plainleather-duster'].heatInsulation).toBeCloseTo(13.6);
  expect(APPAREL['bluefur-duster'].ratings).toEqual(APPAREL['camelhide-duster'].ratings);
  expect(newCookingBill(1,'simple-meal').filters['agave-fruit']).toBe(true);
  for(const item of ['agave-fruit','deer-meat','muffalo-meat','gazelle-meat','dromedary-meat'] as const){expect(foodScore(item,5)).toBe(-87);expect(rawFoodPoisonChance(item)).toBe(.02);}
  expect(ROT_DAYS['agave-fruit']).toBe(25);
});

test('until-target bills count every new material in storage and task cargo, excluding loose products and butcher leather',()=>{
  const w=createWorld(911,16,16);w.piles=[];w.stockpiles=[{id:w.nextId++,x:1,z:1,capacity:75,priority:2,filters:{wood:true,food:true}}];
  for(const family of APPAREL_FAMILIES){
    w.piles=APPAREL_MATERIALS.flatMap((material,i)=>[
      {id:w.nextId++,kind:'apparel' as const,item:apparelItemFor(family,material),quantity:1,owner:{type:'ground' as const,x:i?2:1,z:1},apparel:newApparelState(apparelItemFor(family,material))},
      {id:w.nextId++,kind:'apparel' as const,item:apparelItemFor(family,material),quantity:1,owner:{type:'pawn' as const,pawnId:w.pawns[0]!.id},apparel:newApparelState(apparelItemFor(family,material))},
    ]);
    expect(countedProducts(w,newCookingBill(1,family))).toBe(6);
  }
  w.piles=[{id:w.nextId++,kind:'food',item:'dromedary-meat',quantity:40,owner:{type:'ground',x:1,z:1}},
    {id:w.nextId++,kind:'textile',item:'camelhide',quantity:30,owner:{type:'ground',x:1,z:1}}];
  expect(countedProducts(w,newCookingBill(1,'butcher-creature'))).toBe(40);
});

test('published V90 colony migrates neutrally and cannot smuggle future ecology, material or filter fields into V90',()=>{
  const raw=gunzipSync(readFileSync(new URL('./fixtures/colony-v90.json.gz',import.meta.url))).toString('utf8'),old=JSON.parse(raw);
  expect(old.schemaVersion).toBe(90);const current=deserializeWorld(raw);
  expect(current).toEqual({...old,schemaVersion:91});expect(current.flora).toBeUndefined();
  for(const mutate of [
    (w:any)=>w.flora={revision:1,biome:'temperate-forest',rng:1,nextCheck:w.tick+60,adoptedAt:w.tick,capacity:1},
    (w:any)=>w.resources[0].species='oak',
    (w:any)=>w.foodPolicies[0].allowed.push('agave-fruit'),
  ]){const bad=structuredClone(old);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  const replay=deserializeWorld(serializeWorld(current));stepWorld(current,10);stepWorld(replay,10);expect(replay).toEqual(current);
});
