import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {billWanted,countedProducts,newCookingBill} from '../src/sim/cooking-bills.ts';
import {beginFlakWork,validFlakWorkShape} from '../src/sim/flak-work.ts';
import {productionResearchUnlocked,productionWorkerQualified,validFlakIngredients} from '../src/sim/machining.ts';
import {FLAK_HELMET_REQUIREMENTS,productionWorkTotal,recipeProduct} from '../src/sim/production-recipes.ts';
import {CLOTHING_RESEARCH_COST,FLAK_ARMOR_RESEARCH_COST,MACHINING_RESEARCH_COST,PLATE_ARMOR_RESEARCH_COST,SMITHING_RESEARCH_COST} from '../src/sim/research.ts';
import {validateResearch} from '../src/sim/research-save.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {createMachiningFixture} from './scenarios/machining-v101.ts';
import type {CookingIngredient} from '../src/sim/cooking-types.ts';
import type {MaterialPile,Structure,World} from '../src/sim/types.ts';

const quantity=(world:World,item:string)=>world.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
function prepared(){
  const {world,pawn}=createMachiningFixture();
  pawn.schedule.fill('work');pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;
  world.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:1000,
    smithing:{points:SMITHING_RESEARCH_COST,completedAt:1001},machining:{points:MACHINING_RESEARCH_COST,completedAt:1002},
    plateArmor:{points:PLATE_ARMOR_RESEARCH_COST,completedAt:1003},flakArmor:{points:FLAK_ARMOR_RESEARCH_COST,completedAt:1004}};
  const station:Structure={id:world.nextId++,kind:'machining-table',x:15,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('machining-table'),bills:[]};
  world.structures.push(station);addGroundMaterial(world,'plasteel',10,{x:9,z:13},'plasteel');refreshStock(world);
  return {world,pawn,station};
}
function advance(world:World,done:()=>boolean,limit:number){
  for(let n=0;n<limit&&!done();n++){
    for(const p of world.pawns){p.hunger=100;p.rest=100;p.recreation.level=100;}
    stepWorld(world);
  }
  expect(done(),`tick ${world.tick}; ${JSON.stringify(world.pawns.map(p=>({state:p.state,cooking:p.cooking})))}`).toBe(true);
}

test('Core helmet recipe gates machining on flak research, Crafting 5 and exact physical materials',()=>{
  const {world,pawn}=prepared();
  expect(FLAK_HELMET_REQUIREMENTS).toEqual({steel:40,component:2,plasteel:10,skill:5});
  expect(productionWorkTotal('make-flak-helmet')).toBe(8_000_000);
  expect(recipeProduct('make-flak-helmet',[])).toBe('flak-helmet');
  expect(productionResearchUnlocked(world,'make-flak-helmet')).toBe(true);
  expect(productionWorkerQualified(pawn,'make-flak-helmet')).toBe(true);
  pawn.skills.crafting!.level=4;expect(productionWorkerQualified(pawn,'make-flak-helmet')).toBe(false);
  delete world.research!.flakArmor;expect(productionResearchUnlocked(world,'make-flak-helmet')).toBe(false);
  expect(validFlakIngredients('make-flak-helmet',[{item:'steel',quantity:40},{item:'component',quantity:2},{item:'plasteel',quantity:10}])).toBe(true);
  expect(validFlakIngredients('make-flak-helmet',[{item:'steel',quantity:40},{item:'component',quantity:1},{item:'plasteel',quantity:11}])).toBe(false);
  expect(validFlakIngredients('make-flak-helmet',[{item:'steel',quantity:40},{item:'component',quantity:2},{item:'cloth',quantity:10}])).toBe(false);
});

test('a helmet bill consumes real materials, resumes exact work and finishes a countable helmet',()=>{
  const {world,station}=prepared();
  expect(applyCommand(world,{type:'bill-add',structureId:station.id,recipe:'make-flak-helmet'})).toMatchObject({ok:true});
  const bill=station.bills![0]!;
  expect(applyCommand(world,{type:'bill-update',structureId:station.id,billId:bill.id,settings:{...bill,mode:'until',target:1,destination:'drop'}})).toMatchObject({ok:true});
  advance(world,()=>!!world.piles.find(p=>p.flakWork?.progress),1500);
  const piece=world.piles.find(p=>p.item==='unfinished-flak-helmet')!;
  expect(piece.flakWork).toMatchObject({recipe:'make-flak-helmet',billId:bill.id});
  for(const item of ['steel','component','plasteel'] as const)
    expect(piece.flakWork!.parts.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0)).toBe(FLAK_HELMET_REQUIREMENTS[item]);
  expect(quantity(world,'steel')).toBe(200);expect(quantity(world,'component')).toBe(8);expect(quantity(world,'plasteel')).toBe(0);
  const restored=deserializeWorld(serializeWorld(world));
  expect(serializeWorld(restored)).toBe(serializeWorld(world));
  for(let i=0;i<25;i++){stepWorld(world);stepWorld(restored);}
  expect(serializeWorld(restored)).toBe(serializeWorld(world));
  advance(world,()=>world.piles.some(p=>p.item==='flak-helmet'&&p.owner.type==='ground'),1800);
  expect(world.piles.some(p=>p.id===piece.id)).toBe(false);
  const helmet=world.piles.find(p=>p.item==='flak-helmet')!;
  expect(helmet.apparel?.quality).toBeDefined();
  expect(countedProducts(world,bill)).toBe(0);
  const owner=world.pawns[0]!;
  expect(applyCommand(world,{type:'order-equipment',pawnId:owner.id,itemId:helmet.id,action:'wear',queue:false})).toMatchObject({ok:true});
  advance(world,()=>helmet.owner.type==='apparel',240);
  expect(countedProducts(world,bill)).toBe(1);expect(billWanted(world,bill)).toBe(false);
  expect(validateWorld(world)).toEqual([]);
});

test('cancelled helmet work returns each material and a failed refund is atomic',()=>{
  const {world,pawn,station}=prepared();station.bills=[newCookingBill(world.nextId++,'make-flak-helmet')];
  pawn.x=15;pawn.z=7;pawn.state='working';pawn.path=[];
  const placements:[CookingIngredient['item'],number,number,number][]=[['steel',40,15,8],['component',2,14,7],['plasteel',10,16,7]];
  const ingredients:CookingIngredient[]=[];
  world.piles=world.piles.filter(p=>!['steel','component','plasteel'].includes(p.item));
  for(const [item,amount,x,z] of placements){const id=world.nextId++;world.piles.push({id,item,kind:item as 'steel'|'component'|'plasteel',quantity:amount,owner:{type:'ground',x,z}});ingredients.push({pileId:id,item,quantity:amount,stage:'placed',cell:{x,z}});}
  pawn.cooking={recipe:'make-flak-helmet',stationId:station.id,billId:station.bills[0]!.id,spot:{x:15,z:7},actionCell:{x:15,z:8},phase:'work',ingredients,progress:0,productId:null,storageId:null};
  const piece=beginFlakWork(world,pawn)!;expect(piece.flakWork!.parts).toHaveLength(3);
  expect(validFlakWorkShape(piece as unknown as Record<string,unknown>,141)).toBe(true);
  expect(validFlakWorkShape(piece as unknown as Record<string,unknown>,139)).toBe(false);
  const previous=world.tiles;world.tiles=previous.map(()=>({terrain:'rock'}));
  const before=JSON.stringify(world),rng=world.rng;
  expect(applyCommand(world,{type:'cancel-unfinished',itemId:piece.id})).toMatchObject({ok:false});
  expect(JSON.stringify(world)).toBe(before);expect(world.rng).toBe(rng);
  world.tiles=previous;
  expect(applyCommand(world,{type:'cancel-unfinished',itemId:piece.id})).toMatchObject({ok:true});
  expect(world.piles.some(p=>p.id===piece.id)).toBe(false);
  expect(quantity(world,'steel')).toBe(30);expect(quantity(world,'plasteel')).toBeGreaterThanOrEqual(7);
  expect(quantity(world,'plasteel')).toBeLessThanOrEqual(8);expect(quantity(world,'component')).toBeGreaterThanOrEqual(1);
});

test('older schemas reject helmet bills even in packed tables and reject future unfinished work',()=>{
  const {world,station}=prepared();station.bills=[newCookingBill(world.nextId++,'make-flak-helmet')];
  expect(validateResearch(world,139)).toContain('Future flak helmet production.');
  world.structures=world.structures.filter(s=>s!==station);
  world.packed.push({building:station,owner:{type:'ground',x:15,z:8}});
  expect(validateResearch(world,139)).toContain('Future flak helmet production.');
  station.bills=[];
  const workpiece:MaterialPile={id:world.nextId++,item:'unfinished-flak-helmet',kind:'unfinished',quantity:1,owner:{type:'ground',x:14,z:7},flakWork:{recipe:'make-flak-helmet',authorId:world.pawns[0]!.id,progress:0,parts:[{item:'steel',quantity:40},{item:'component',quantity:2},{item:'plasteel',quantity:10}]}};
  world.piles.push(workpiece);
  expect(validateResearch(world,139)).toContain('Future flak helmet production.');
});
