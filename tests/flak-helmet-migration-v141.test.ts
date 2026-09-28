import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {newApparelState} from '../src/sim/apparel-rules.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {CLOTHING_RESEARCH_COST,FLAK_ARMOR_RESEARCH_COST,PLATE_ARMOR_RESEARCH_COST} from '../src/sim/research.ts';
import type {Structure,World} from '../src/sim/types.ts';

const historical=():World=>JSON.parse(readFileSync('public/test-saves/v139/industrie-avancee.json','utf8')) as World;

test('V139 migration keeps its physical state, policies and RNG without granting a helmet',()=>{
  const before=historical(),after=deserializeWorld(JSON.stringify(before));
  expect(after).toEqual({...before,schemaVersion:141});
  expect(validateWorld(after)).toEqual([]);
  expect(after.piles.some(p=>p.item==='flak-helmet'||p.item==='unfinished-flak-helmet')).toBe(false);
  expect(after.apparelPolicies?.some(policy=>policy.allowedItems.includes('flak-helmet'))).toBe(false);
});

test('a file declared V139 cannot pre-own the V141 helmet, recipe, workpiece or clothing permission',()=>{
  const apparel=historical();
  apparel.piles.push({id:apparel.nextId++,kind:'apparel',item:'flak-helmet',quantity:1,owner:{type:'ground',x:12,z:12},apparel:newApparelState('flak-helmet')});
  expect(()=>deserializeWorld(JSON.stringify(apparel))).toThrow(/Future flak helmet in older save/);

  const policy=historical();
  (policy.apparelPolicies![0] as unknown as {allowedItems:string[]}).allowedItems.push('flak-helmet');
  expect(()=>deserializeWorld(JSON.stringify(policy))).toThrow(/Invalid apparel policy/);

  const recipe=historical();
  recipe.research!.points=CLOTHING_RESEARCH_COST;recipe.research!.completedAt=1000;
  recipe.research!.plateArmor={points:PLATE_ARMOR_RESEARCH_COST,completedAt:2000};
  recipe.research!.flakArmor={points:FLAK_ARMOR_RESEARCH_COST,completedAt:2000};
  const bench:Structure={id:recipe.nextId++,kind:'machining-table',x:20,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('machining-table'),bills:[newCookingBill(recipe.nextId++,'make-flak-helmet')]};
  recipe.structures.push(bench);
  (recipe as {schemaVersion:number}).schemaVersion=141;
  expect(validateWorld(recipe)).toEqual([]);
  (recipe as {schemaVersion:number}).schemaVersion=139;
  expect(()=>deserializeWorld(JSON.stringify(recipe))).toThrow(/Invalid cooking bill/);

  const work=historical();
  work.piles.push({id:work.nextId++,kind:'unfinished',item:'unfinished-flak-helmet',quantity:1,owner:{type:'ground',x:12,z:12},flakWork:{recipe:'make-flak-helmet',authorId:work.pawns[0]!.id,progress:0,parts:[{item:'steel',quantity:40},{item:'component',quantity:2},{item:'plasteel',quantity:10}]}});
  expect(()=>deserializeWorld(JSON.stringify(work))).toThrow(/Future flak helmet in older save/);
});
