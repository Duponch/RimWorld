import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {beginComponentWork,cancelComponentWork,validComponentWorkShape} from '../src/sim/component-work.ts';
import {colonyWealth} from '../src/sim/colony-wealth.ts';
import {planComponentWork} from '../src/sim/component-work-plan.ts';
import {cookingSpot} from '../src/sim/cooking-bills.ts';
import {blockedCells,reachableCells,routeToJob} from '../src/sim/pathfinding.ts';
import {validCookingOrder} from '../src/sim/player-cooking-save.ts';
import {queuedCookingReason} from '../src/sim/player-cooking.ts';
import {ADVANCED_COMPONENT_REQUIREMENTS,PRODUCTION_RECIPES,productionWorkTotal,stationRecipes} from '../src/sim/production-recipes.ts';
import {ADVANCED_FABRICATION_RESEARCH_COST,researchStationUsable,selectResearch} from '../src/sim/research.ts';
import {constructionRecipe} from '../src/sim/construction-materials.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {validateCooking} from '../src/sim/cooking-save.ts';
import {prepareAdvancedIndustryDemo} from '../scripts/generate-advanced-industry-demo-v139.ts';
import type {World} from '../src/sim/types.ts';

const amount=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
function advance(w:World,done:()=>boolean,limit:number):void {
  for(let i=0;i<limit&&!done();i++){
    for(const pawn of w.pawns){pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;}
    stepWorld(w);
    if(i%200===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
  }
  expect(done(),`tick ${w.tick}; ${JSON.stringify(w.pawns.map(p=>({state:p.state,cooking:p.cooking})))}`).toBe(true);
}

test('Core chain needs Fabrication, a powered high-tech desk and a powered analyzer',()=>{
  const w=prepareAdvancedIndustryDemo();
  expect(ADVANCED_FABRICATION_RESEARCH_COST).toBe(4_000_000_000);
  expect(PRODUCTION_RECIPES['make-advanced-component']).toMatchObject({station:'fabrication-bench',units:34,workTicks:1000,outputUnits:1});
  expect(ADVANCED_COMPONENT_REQUIREMENTS).toEqual({component:1,steel:20,plasteel:10,gold:3,skill:8});
  expect(stationRecipes(w.structures.find(s=>s.kind==='fabrication-bench')!)).toEqual(['make-component','make-advanced-component']);
  delete w.research!.advancedFabrication;
  expect(selectResearch(w,'advanced-fabrication')).toMatchObject({ok:true});
  delete w.research!.fabrication;
  expect(selectResearch(w,'advanced-fabrication')).toMatchObject({ok:false});
  const desk={id:w.nextId++,kind:'hi-tech-research-bench' as const,x:20,z:8,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,power:{on:true,parentId:null}};
  const analyzer={id:w.nextId++,kind:'multi-analyzer' as const,x:22,z:10,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,power:{on:true,parentId:null}};
  w.structures.push(desk,analyzer);
  expect(researchStationUsable(w,desk,'advanced-fabrication',analyzer.id)).toBe(true);
  analyzer.power.on=false;expect(researchStationUsable(w,desk,'advanced-fabrication',analyzer.id)).toBe(false);
  analyzer.power.on=true;desk.power.on=false;expect(researchStationUsable(w,desk,'advanced-fabrication',analyzer.id)).toBe(false);
});

test('prepared V139 save has four physical inputs and makes its first advanced component through authored work',()=>{
  const raw=readFileSync('public/test-saves/v139/industrie-avancee.json','utf8');
  const manifest=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')) as {saves:{id:string;sha256:string}[]};
  expect(manifest.saves.find(s=>s.id==='industrie-avancee-v139')?.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  expect(raw).toBe(serializeWorld(prepareAdvancedIndustryDemo()));
  const w=deserializeWorld(raw),bench=w.structures.find(s=>s.kind==='fabrication-bench')!,pawn=w.pawns[0]!;
  expect(w.schemaVersion).toBe(139);
  expect(bench.bills?.map(b=>b.recipe)).toEqual(['make-advanced-component']);
  expect(amount(w,'component')).toBe(1);
  expect(amount(w,'steel')).toBeGreaterThanOrEqual(20);
  expect(amount(w,'plasteel')).toBe(10);
  expect(amount(w,'gold')).toBe(3);
  expect(amount(w,'advanced-component')).toBe(0);
  const before=['component','steel','plasteel','gold'].map(item=>amount(w,item));
  advance(w,()=>w.piles.some(p=>p.componentWork?.recipe==='make-advanced-component'&&p.componentWork.progress>0),2500);
  const piece=w.piles.find(p=>p.componentWork?.recipe==='make-advanced-component')!;
  const work=piece.componentWork!;
  expect(work).toMatchObject({authorId:pawn.id,billId:bench.bills![0]!.id});
  expect(validComponentWorkShape(piece as unknown as Record<string,unknown>,139)).toBe(true);
  expect(validComponentWorkShape(piece as unknown as Record<string,unknown>,138)).toBe(false);
  if(work.recipe!=='make-advanced-component')throw new Error('Wrong workpiece recipe');
  for(const item of ['component','steel','plasteel','gold'] as const)expect(work.parts.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)).toBe(ADVANCED_COMPONENT_REQUIREMENTS[item]);
  expect(['component','steel','plasteel','gold'].map(item=>amount(w,item))).toEqual([before[0]!-1,before[1]!-20,before[2]!-10,before[3]!-3]);
  expect(Number.isFinite(colonyWealth(w).items)).toBe(true);
  expect(colonyWealth(w).items-colonyWealth({...w,piles:w.piles.filter(p=>p!==piece)}).items).toBeCloseTo(190);
  const restored=deserializeWorld(serializeWorld(w));
  expect(restored.piles.find(p=>p.id===piece.id)?.componentWork).toEqual(work);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('applied');
  work.progress+=10_000;pawn.cooking!.progress=work.progress;
  const delta=structuredClone(encoder.encode(w,0,2));
  expect(delta.kind).toBe('delta');
  expect(decoder.adopt(delta).status).toBe('applied');
  // Restore the exact synchronized state before comparing continued simulation.
  const resumed=deserializeWorld(serializeWorld(w));
  for(let i=0;i<4000&&amount(w,'advanced-component')===0;i++){
    for(const world of [w,resumed])for(const colonist of world.pawns){colonist.hunger=100;colonist.rest=100;colonist.recreation.level=100;}
    stepWorld(w);stepWorld(resumed);
  }
  expect(amount(w,'advanced-component')).toBe(1);
  expect(w.piles.some(p=>p.id===piece.id)).toBe(false);
  expect(bench.bills![0]!.target).toBe(0);
  expect(validateWorld(w)).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(constructionRecipe({kind:'fabrication-bench',material:'steel'}).ingredients).toEqual([{item:'steel',quantity:200},{item:'component',quantity:12},{item:'advanced-component',quantity:2}]);
});

test('two produced advanced components enter the physical cost of a second fabrication bench',()=>{
  const w=prepareAdvancedIndustryDemo(),bench=w.structures.find(s=>s.kind==='fabrication-bench')!;
  bench.bills![0]!.target=2;
  addGroundMaterial(w,'component',1,{x:11,z:9},'component');
  addGroundMaterial(w,'plasteel',10,{x:11,z:10},'plasteel');
  addGroundMaterial(w,'gold',3,{x:11,z:11},'gold');
  advance(w,()=>amount(w,'advanced-component')===2,8000);
  expect(amount(w,'advanced-component')).toBe(2);
  addGroundMaterial(w,'component',12,{x:10,z:12},'component');
  addGroundMaterial(w,'steel',200,{x:11,z:12},'steel');
  const pawn=w.pawns[0]!;pawn.priorities.build=1;pawn.priorities.haul=1;
  const designated=applyCommand(w,{type:'designate',kind:'fabrication-bench',x:22,z:8,material:'steel'});
  expect(designated,designated.reason).toMatchObject({ok:true});
  advance(w,()=>w.structures.filter(s=>s.kind==='fabrication-bench').length===2,8000);
  expect(amount(w,'advanced-component')).toBe(0);
  const second=w.structures.find(s=>s.kind==='fabrication-bench'&&s.id!==bench.id)!;
  expect(second.bills).toEqual([]);
  expect(applyCommand(w,{type:'bill-add',structureId:second.id,recipe:'make-advanced-component'})).toMatchObject({ok:true});
  expect(validateWorld(w)).toEqual([]);
});

test('advanced cancellation prevalidates all four deposits and leaves RNG and work untouched on refusal',()=>{
  const w=prepareAdvancedIndustryDemo();
  advance(w,()=>w.piles.some(p=>p.componentWork?.recipe==='make-advanced-component'&&p.componentWork.progress>0),2500);
  const piece=w.piles.find(p=>p.componentWork?.recipe==='make-advanced-component')!;
  const originalTiles=w.tiles;w.tiles=w.tiles.map(()=>({terrain:'rock'}));
  const before=JSON.stringify(w),rng=w.rng,nextId=w.nextId;
  expect(cancelComponentWork(w,piece.id).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
  w.tiles=originalTiles;
  expect(cancelComponentWork(w,piece.id).ok).toBe(true);
  expect(w.piles.some(p=>p.id===piece.id)).toBe(false);
  expect(amount(w,'component')).toBeGreaterThanOrEqual(0);
  for(const item of ['steel','plasteel','gold'])expect(amount(w,item)).toBeGreaterThan(0);
  expect(validateWorld(w)).toEqual([]);
});

test('four partial input stacks leave no adjacent cell; the new workpiece rests on the bench surface and saves',()=>{
  const w=prepareAdvancedIndustryDemo(),bench=w.structures.find(s=>s.kind==='fabrication-bench')!,pawn=w.pawns[0]!,spot=cookingSpot(bench);
  w.piles=w.piles.filter(p=>!['component','steel','plasteel','gold'].includes(p.item));
  const inputs=[
    {item:'component' as const,quantity:1,stack:2,cell:{x:spot.x,z:spot.z+1}},
    {item:'steel' as const,quantity:20,stack:21,cell:{x:spot.x+1,z:spot.z}},
    {item:'plasteel' as const,quantity:10,stack:11,cell:{x:spot.x-1,z:spot.z}},
    {item:'gold' as const,quantity:3,stack:4,cell:{x:spot.x,z:spot.z-1}},
  ];
  const ingredients=inputs.map(({item,quantity,stack,cell})=>{
    const id=w.nextId++;w.piles.push({id,item,kind:item,quantity:stack,owner:{type:'ground',...cell}});
    return {pileId:id,item,quantity,stage:'placed' as const,cell};
  });
  pawn.x=spot.x;pawn.z=spot.z;pawn.path=[];pawn.state='working';
  pawn.cooking={recipe:'make-advanced-component',stationId:bench.id,billId:bench.bills![0]!.id,spot,actionCell:{x:bench.x,z:bench.z},phase:'work',ingredients,progress:0,productId:null,storageId:null};
  expect(validateWorld(w)).toEqual([]);
  const piece=beginComponentWork(w,pawn);
  expect(piece?.componentWork?.recipe).toBe('make-advanced-component');
  expect(piece?.owner.type).toBe('ground');
  if(piece?.owner.type!=='ground')throw new Error('Workpiece missing from the surface');
  expect(Math.abs(piece.owner.x-spot.x)+Math.abs(piece.owner.z-spot.z)).toBe(2);
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  pawn.cooking=null;pawn.state='idle';
  const reach=reachableCells(w,pawn,blockedCells(w),new Set());
  const resumed=planComponentWork(w,pawn,bench,bench.bills![0]!,reach,{pairs:100});
  expect(resumed.plan?.task?.ingredients).toMatchObject([{pileId:piece.id,stage:'placed'}]);
  expect(resumed.plan?.target).toEqual(spot);
  // An interior bench cell has no direct path from behind, yet cancellation
  // must refund onto cells reachable from the normal work side.
  piece.owner={type:'ground',x:bench.x,z:bench.z+1};
  w.tiles[(bench.z+2)*w.width+bench.x]={terrain:'rock'};
  const quantities=new Map(w.piles.map(p=>[p.id,p.quantity]));
  expect(validateWorld(w)).toEqual([]);
  expect(cancelComponentWork(w,piece.id).ok).toBe(true);
  const reachable=reachableCells(w,spot,blockedCells(w),new Set());
  const refunds=w.piles.filter(p=>['component','steel','plasteel','gold'].includes(p.item)&&p.quantity>(quantities.get(p.id)??0));
  expect(refunds.length).toBeGreaterThan(0);
  for(const refund of refunds){
    expect(refund.owner.type).toBe('ground');
    if(refund.owner.type==='ground')expect(routeToJob(w,refund.owner,reachable,true)).not.toBeNull();
  }
});

test('V138 migration is neutral and rejects V139 research, bill, task and typed work before upgrading',()=>{
  const old=deserializeWorld(readFileSync('public/test-saves/v123/industrie.json','utf8'));
  (old as {schemaVersion:number}).schemaVersion=138;
  const before=structuredClone(old),migrated=deserializeWorld(JSON.stringify(old));
  expect(migrated).toEqual({...before,schemaVersion:139});
  const futureResearch=structuredClone(old);futureResearch.research!.advancedFabrication={points:ADVANCED_FABRICATION_RESEARCH_COST,completedAt:futureResearch.tick};
  expect(()=>deserializeWorld(JSON.stringify(futureResearch))).toThrow('Invalid version 138 save');
  const futureBill=structuredClone(old);futureBill.structures.find(s=>s.kind==='fabrication-bench')!.bills!.push({...futureBill.structures.find(s=>s.kind==='fabrication-bench')!.bills![0]!,id:futureBill.nextId++,recipe:'make-advanced-component',filters:{component:true,steel:true,plasteel:true,gold:true}});
  expect(()=>deserializeWorld(JSON.stringify(futureBill))).toThrow('Invalid version 138 save');
  const futureTask=structuredClone(old);futureTask.pawns[0]!.cooking={recipe:'make-advanced-component'} as never;
  expect(()=>deserializeWorld(JSON.stringify(futureTask))).toThrow('Invalid version 138 save');
  const futureWork=structuredClone(old);futureWork.piles.push({id:futureWork.nextId++,item:'unfinished-component',kind:'unfinished',quantity:1,owner:{type:'ground',x:13,z:13},componentWork:{recipe:'make-advanced-component',authorId:futureWork.pawns[0]!.id,progress:0,parts:[{item:'component',quantity:1},{item:'steel',quantity:20},{item:'plasteel',quantity:10},{item:'gold',quantity:3}]}});
  expect(()=>deserializeWorld(JSON.stringify(futureWork))).toThrow('Invalid version 138 save');
});

test('active and queued advanced reservations require the four exact material totals and V139',()=>{
  const w=prepareAdvancedIndustryDemo(),bench=w.structures.find(s=>s.kind==='fabrication-bench')!,spot=cookingSpot(bench);
  const sources=['component','steel','plasteel','gold'] as const;
  const cell={x:spot.x,z:spot.z+1};
  const ingredients=sources.map(item=>({pileId:w.piles.find(p=>p.item===item)!.id,item,quantity:ADVANCED_COMPONENT_REQUIREMENTS[item],stage:'source' as const,cell}));
  const order={cooking:{recipe:'make-advanced-component' as const,stationId:bench.id,billId:bench.bills![0]!.id,spot,actionCell:cell,phase:'gather' as const,ingredients,progress:0,productId:null,storageId:null}};
  expect(validCookingOrder(order,w)).toBe(true);
  const short:unknown=structuredClone(order);
  (short as {cooking:{ingredients:{item:string;quantity:number}[]}}).cooking.ingredients.find(i=>i.item==='gold')!.quantity=2;
  expect(validCookingOrder(short,w)).toBe(false);
  (w as {schemaVersion:number}).schemaVersion=138;
  expect(validCookingOrder(order,w)).toBe(false);
  expect(validateCooking(w,138,new Set())).toContain('Invalid cooking bill.');
  (w as {schemaVersion:number}).schemaVersion=139;
  const pawn=w.pawns[0]!;pawn.x=spot.x;pawn.z=spot.z;pawn.state='working';pawn.cooking={...order.cooking,phase:'work',ingredients:ingredients.map(i=>({...i,stage:'placed'}))};
  // Reservation shape and total checks precede ownership/cell checks.
  expect(validateCooking(w,139,new Set()).some(e=>e==='Invalid recipe quantity or phase.')).toBe(false);
  pawn.cooking.ingredients.find(i=>i.item==='gold')!.quantity=2;
  expect(validateCooking(w,139,new Set())).toContain('Invalid recipe quantity or phase.');
  (w as {schemaVersion:number}).schemaVersion=138;
  expect(validateCooking(w,138,new Set())).toContain('Invalid or future production recipe.');
});

test('queued advanced order rejects an ordinary orphan workpiece even when its steel filter is enabled',()=>{
  const w=prepareAdvancedIndustryDemo(),bench=w.structures.find(s=>s.kind==='fabrication-bench')!,pawn=w.pawns[0]!,spot=cookingSpot(bench);
  const piece={id:w.nextId++,item:'unfinished-component' as const,kind:'unfinished' as const,quantity:1,owner:{type:'ground' as const,x:spot.x,z:spot.z+1},componentWork:{recipe:'make-component' as const,authorId:pawn.id,progress:0,parts:[12]}};
  w.piles.push(piece);
  const order={cooking:{recipe:'make-advanced-component' as const,stationId:bench.id,billId:bench.bills![0]!.id,spot,actionCell:{x:piece.owner.x,z:piece.owner.z},phase:'gather' as const,ingredients:[{pileId:piece.id,item:'unfinished-component' as const,quantity:1,stage:'placed' as const,cell:{x:piece.owner.x,z:piece.owner.z}}],progress:0,productId:null,storageId:null}};
  pawn.orders.queue.push(order);
  expect(validCookingOrder(order,w)).toBe(true);
  expect(queuedCookingReason(w,order)).toContain('autre recette');
});
