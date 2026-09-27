import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {beginComponentWork,validComponentWorkShape} from '../src/sim/component-work.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {productionStationUsable,productionWorkTotal,PRODUCTION_RECIPES,stationRecipes} from '../src/sim/production-recipes.ts';
import {FABRICATION_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST,MULTI_ANALYZER_RESEARCH_COST,MACHINING_RESEARCH_COST,SMITHING_RESEARCH_COST} from '../src/sim/research.ts';
import {createMachiningFixture} from './scenarios/machining-v101.ts';
import type {CookingIngredient} from '../src/sim/cooking-types.ts';
import type {Command,Structure,World} from '../src/sim/types.ts';

function prepared():{world:World;station:Structure} {
  const {world,pawn}=createMachiningFixture();
  pawn.schedule.fill('work');pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;
  world.research={project:null,points:0,
    smithing:{points:SMITHING_RESEARCH_COST,completedAt:1000},machining:{points:MACHINING_RESEARCH_COST,completedAt:1100},
    microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:1200},multiAnalyzer:{points:MULTI_ANALYZER_RESEARCH_COST,completedAt:1300},
    fabrication:{points:FABRICATION_RESEARCH_COST,completedAt:1400}};
  const station:Structure={id:world.nextId++,kind:'fabrication-bench',x:16,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('fabrication-bench'),bills:[]};
  world.structures.push(station);
  addGroundMaterial(world,'steel',24,{x:9,z:9},'steel');
  return {world,station};
}
const command=(w:World,c:Command)=>expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});
function advance(w:World,done:()=>boolean,limit:number):void {
  for(let i=0;i<limit&&!done();i++){
    for(const p of w.pawns){p.hunger=100;p.rest=100;p.recreation.level=100;}
    stepWorld(w);
    if(i%100===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
  }
  expect(done(),`tick ${w.tick}; ${JSON.stringify(w.pawns.map(p=>({state:p.state,cooking:p.cooking})))}`).toBe(true);
}

test('Core component bill needs 12 steel, Crafting 8, Fabrication research and a powered bench',()=>{
  const {world,station}=prepared(),pawn=world.pawns[0]!;
  expect(PRODUCTION_RECIPES['make-component']).toMatchObject({station:'fabrication-bench',units:12,workTicks:500,outputUnits:1});
  expect(stationRecipes(station)).toEqual(['make-component']);
  station.power!.on=false;
  expect(productionStationUsable(station)).toBe(false);
  station.power!.on=true;
  command(world,{type:'bill-add',structureId:station.id,recipe:'make-component'});
  expect(station.bills![0]?.filters).toEqual({steel:true});
  pawn.skills.crafting!.level=7;
  for(let i=0;i<100;i++)stepWorld(world);
  expect(world.piles.some(p=>p.componentWork)).toBe(false);
  pawn.skills.crafting!.level=8;
  advance(world,()=>!!world.piles.find(p=>p.componentWork?.progress),1200);
  const piece=world.piles.find(p=>p.componentWork)!;
  expect(piece.componentWork).toMatchObject({recipe:'make-component',authorId:pawn.id,billId:station.bills![0]!.id});
  expect(piece.componentWork!.parts.reduce((a,b)=>a+b,0)).toBe(12);
  expect(validComponentWorkShape(piece as unknown as Record<string,unknown>,123)).toBe(true);
  expect(validComponentWorkShape(piece as unknown as Record<string,unknown>,122)).toBe(false);
  piece.componentWork!.parts[0]!++;
  expect(validateWorld(world)).not.toEqual([]);
  piece.componentWork!.parts[0]!--;
  expect(validateWorld(world)).toEqual([]);
});

test('component workpiece resumes after release and save, then produces one physical component',()=>{
  const {world:w,station}=prepared(),pawn=w.pawns[0]!;
  command(w,{type:'bill-add',structureId:station.id,recipe:'make-component'});
  advance(w,()=>!!w.piles.find(p=>p.componentWork?.progress),1200);
  const piece=w.piles.find(p=>p.componentWork)!,id=piece.id,progress=piece.componentWork!.progress;
  command(w,{type:'priority',pawnId:pawn.id,work:'craft',value:0});
  advance(w,()=>pawn.cooking===null,50);
  const resumed=deserializeWorld(serializeWorld(w));
  expect(resumed.piles.find(p=>p.id===id)?.componentWork?.progress).toBe(progress);
  for(let i=0;i<20;i++){stepWorld(w);stepWorld(resumed);}
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  command(w,{type:'priority',pawnId:pawn.id,work:'craft',value:1});
  advance(w,()=>pawn.cooking?.phase==='work',400);
  piece.componentWork!.progress=productionWorkTotal('make-component')-10000;
  pawn.cooking!.progress=piece.componentWork!.progress;
  const before=w.piles.filter(p=>p.item==='component').reduce((sum,p)=>sum+p.quantity,0);
  advance(w,()=>w.piles.filter(p=>p.item==='component').reduce((sum,p)=>sum+p.quantity,0)>before,400);
  expect(w.piles.some(p=>p.id===id)).toBe(false);
  expect(w.piles.filter(p=>p.item==='component').reduce((sum,p)=>sum+p.quantity,0)).toBe(before+1);
  expect(validateWorld(w)).toEqual([]);
});

test('cancellation prevalidates all steel deposits and leaves work and RNG intact on refusal',()=>{
  const {world:w,station}=prepared(),pawn=w.pawns[0]!;
  station.bills=[newCookingBill(w.nextId++,'make-component')];
  pawn.x=16;pawn.z=7;pawn.path=[];pawn.state='working';
  w.piles=w.piles.filter(p=>p.item!=='steel');
  const ingredients:CookingIngredient[]=[];
  for(const [quantity,x,z] of [[7,16,8],[5,17,7]]){
    const id=w.nextId++;w.piles.push({id,item:'steel',kind:'steel',quantity,owner:{type:'ground',x,z}});
    ingredients.push({pileId:id,item:'steel',quantity,stage:'placed',cell:{x,z}});
  }
  pawn.cooking={recipe:'make-component',stationId:station.id,billId:station.bills[0]!.id,spot:{x:16,z:7},actionCell:{x:16,z:8},phase:'work',ingredients,progress:0,productId:null,storageId:null};
  const piece=beginComponentWork(w,pawn)!;
  expect(piece.componentWork?.parts).toEqual([7,5]);
  const tiles=w.tiles;w.tiles=tiles.map(()=>({terrain:'rock'}));
  const before=JSON.stringify(w),rng=w.rng;
  expect(applyCommand(w,{type:'cancel-unfinished',itemId:piece.id}).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);
  w.tiles=tiles;
  expect(applyCommand(w,{type:'cancel-unfinished',itemId:piece.id}).ok).toBe(true);
  expect(w.piles.some(p=>p.id===piece.id)).toBe(false);
  const steel=w.piles.filter(p=>p.item==='steel').reduce((sum,p)=>sum+p.quantity,0);
  expect(steel).toBeGreaterThanOrEqual(8);expect(steel).toBeLessThanOrEqual(10);
});

test('component work progress travels as a pile delta without a checkpoint',()=>{
  const {world}=prepared(),pawn=world.pawns[0]!;
  const piece={id:world.nextId++,item:'unfinished-component' as const,kind:'unfinished' as const,quantity:1,
    owner:{type:'ground' as const,x:13,z:13},componentWork:{recipe:'make-component' as const,authorId:pawn.id,progress:0,parts:[12]}};
  world.piles.push(piece);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(world,0,1))).status).toBe('applied');
  piece.componentWork.progress=30000;
  const message=structuredClone(encoder.encode(world,0,1));
  expect(message.kind).toBe('delta');
  const result=decoder.adopt(message);
  expect(result.status).toBe('applied');
  if(result.status==='applied')expect(result.world.piles.find(p=>p.id===piece.id)?.componentWork?.progress).toBe(30000);
});
