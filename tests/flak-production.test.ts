import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {newCookingBill,billWanted,countedProducts} from '../src/sim/cooking-bills.ts';
import {beginFlakWork,validFlakWorkShape} from '../src/sim/flak-work.ts';
import {validFlakIngredients} from '../src/sim/machining.ts';
import {FLAK_REQUIREMENTS,productionWorkTotal} from '../src/sim/production-recipes.ts';
import {CLOTHING_RESEARCH_COST,FLAK_ARMOR_RESEARCH_COST,MACHINING_RESEARCH_COST,PLATE_ARMOR_RESEARCH_COST,SMITHING_RESEARCH_COST,selectResearch} from '../src/sim/research.ts';
import {validateResearch} from '../src/sim/research-save.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {createMachiningFixture} from './scenarios/machining-v101.ts';
import type {CookingIngredient} from '../src/sim/cooking-types.ts';
import type {Command,MaterialPile,Structure,World} from '../src/sim/types.ts';

const amount=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
const command=(w:World,c:Command)=>{const result=applyCommand(w,c);expect(result,JSON.stringify(c)).toMatchObject({ok:true});};
function prepared():{world:World;station:Structure} {
  const {world,pawn}=createMachiningFixture();
  world.schemaVersion=109;
  pawn.schedule.fill('work');pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;
  world.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:1000,
    smithing:{points:SMITHING_RESEARCH_COST,completedAt:1001},machining:{points:MACHINING_RESEARCH_COST,completedAt:1002},
    plateArmor:{points:PLATE_ARMOR_RESEARCH_COST,completedAt:1003},flakArmor:{points:FLAK_ARMOR_RESEARCH_COST,completedAt:1004}};
  const station:Structure={id:world.nextId++,kind:'machining-table',x:15,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('machining-table'),bills:[]};
  world.structures.push(station);
  addGroundMaterial(world,'textile',30,{x:8,z:13},'cloth');refreshStock(world);
  return {world,station};
}
function advance(world:World,done:()=>boolean,limit:number):void {
  for(let n=0;n<limit&&!done();n++){
    for(const p of world.pawns){p.hunger=100;p.rest=100;p.recreation.level=100;}
    stepWorld(world);
    if(n%100===0)expect(validateWorld(world),`tick ${world.tick}`).toEqual([]);
  }
  expect(done(),`tick ${world.tick}; ${JSON.stringify(world.pawns.map(p=>({state:p.state,cooking:p.cooking,need:p.need})))}`).toBe(true);
}

test('Plate Armor and Flak Armor have their real ordered research prerequisites and strict V109 fields',()=>{
  const {world}=prepared();
  expect(validateResearch(world,109)).toEqual([]);
  expect(validateResearch(world,106)).toContain('Invalid research project.');
  const locked=structuredClone(world);delete locked.research!.smithing;delete locked.research!.plateArmor;delete locked.research!.flakArmor;
  expect(selectResearch(locked,'plate-armor')).toMatchObject({ok:false});
  locked.research!.smithing={points:SMITHING_RESEARCH_COST,completedAt:1001};
  delete locked.research!.completedAt;locked.research!.points=0;
  expect(selectResearch(locked,'plate-armor')).toMatchObject({ok:false});
  locked.research!.completedAt=1000;locked.research!.points=CLOTHING_RESEARCH_COST;
  expect(selectResearch(locked,'plate-armor')).toMatchObject({ok:true});
  expect(selectResearch(locked,'flak-armor')).toMatchObject({ok:false});
  locked.research!.plateArmor={points:PLATE_ARMOR_RESEARCH_COST,completedAt:1003};
  expect(selectResearch(locked,'flak-armor')).toMatchObject({ok:true});
  expect(validFlakIngredients('make-flak-vest',[{item:'cloth',quantity:30},{item:'steel',quantity:60},{item:'component',quantity:1}])).toBe(true);
  expect(validFlakIngredients('make-flak-vest',[{item:'cloth',quantity:31},{item:'steel',quantity:60}])).toBe(false);
});

test('a physical vest is authored, saved mid-work, resumed, made with quality, worn and counted by Until X',()=>{
  const {world,station}=prepared();
  command(world,{type:'bill-add',structureId:station.id,recipe:'make-flak-vest'});
  const bill=station.bills![0]!;
  command(world,{type:'bill-update',structureId:station.id,billId:bill.id,settings:{...bill,mode:'until',target:1,destination:'drop'}});
  advance(world,()=>!!world.piles.find(p=>p.flakWork?.progress),1300);
  const piece=world.piles.find(p=>p.flakWork)!,author=world.pawns[0]!;
  expect(piece.flakWork).toMatchObject({recipe:'make-flak-vest',authorId:author.id,billId:bill.id});
  expect(piece.flakWork!.parts.reduce((sum,p)=>sum+p.quantity,0)).toBe(91);
  for(const item of ['cloth','steel','component'] as const)expect(piece.flakWork!.parts.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0)).toBe(FLAK_REQUIREMENTS[item]);
  expect(amount(world,'cloth')).toBe(0);expect(amount(world,'steel')).toBe(180);expect(amount(world,'component')).toBe(9);
  const id=piece.id,progress=piece.flakWork!.progress;
  command(world,{type:'priority',pawnId:author.id,work:'craft',value:0});
  advance(world,()=>author.cooking===null,50);
  const restored=deserializeWorld(serializeWorld(world));
  expect(restored.piles.find(p=>p.id===id)?.flakWork?.progress).toBe(progress);
  for(let n=0;n<20;n++){stepWorld(world);stepWorld(restored);}
  expect(serializeWorld(restored)).toBe(serializeWorld(world));
  command(world,{type:'priority',pawnId:author.id,work:'craft',value:1});
  advance(world,()=>world.pawns[0]!.cooking?.phase==='work',400);
  piece.flakWork!.progress=productionWorkTotal('make-flak-vest')-10000;
  author.cooking!.progress=piece.flakWork!.progress;
  advance(world,()=>world.piles.some(p=>p.item==='flak-vest'&&p.owner.type==='ground'),400);
  const vest=world.piles.find(p=>p.item==='flak-vest')!;
  expect(world.piles.some(p=>p.id===id)).toBe(false);
  expect(vest.apparel).toMatchObject({hitPoints:200});expect(vest.apparel?.quality).toBeDefined();expect(vest.apparel?.material).toBeUndefined();
  expect(countedProducts(world,bill)).toBe(0);
  command(world,{type:'order-equipment',pawnId:author.id,itemId:vest.id,action:'wear',queue:false});
  advance(world,()=>vest.owner.type==='apparel',200);
  expect(countedProducts(world,bill)).toBe(1);expect(billWanted(world,bill)).toBe(false);
  expect(validateWorld(world)).toEqual([]);
});

test('cancelling split cloth, steel and component refunds all types atomically, including RNG',()=>{
  const {world,station}=prepared(),pawn=world.pawns[0]!;
  station.bills=[newCookingBill(world.nextId++,'make-flak-vest')];
  pawn.x=15;pawn.z=7;pawn.state='working';pawn.path=[];
  const placements:[string,number,number,number][]=[['cloth',30,15,8],['steel',60,14,7],['component',1,16,7]];
  const ingredients:CookingIngredient[]=[];
  world.piles=world.piles.filter(p=>!['cloth','steel','component'].includes(p.item));
  for(const [item,quantity,x,z] of placements){const id=world.nextId++;world.piles.push({id,item:item as 'cloth'|'steel'|'component',kind:item==='cloth'?'textile':item as 'steel'|'component',quantity,owner:{type:'ground',x,z}});ingredients.push({pileId:id,item:item as CookingIngredient['item'],quantity,stage:'placed',cell:{x,z}});}
  pawn.cooking={recipe:'make-flak-vest',stationId:station.id,billId:station.bills[0]!.id,spot:{x:15,z:7},actionCell:{x:15,z:8},phase:'work',ingredients,progress:0,productId:null,storageId:null};
  const piece=beginFlakWork(world,pawn)!;expect(piece?.flakWork?.parts).toHaveLength(3);
  expect(validFlakWorkShape(piece as unknown as Record<string,unknown>,109)).toBe(true);
  expect(validFlakWorkShape(piece as unknown as Record<string,unknown>,106)).toBe(false);
  const cell=piece.owner;if(cell.type!=='ground')throw new Error('Missing physical workpiece');
  const tiles=world.tiles;world.tiles=tiles.map(()=>({terrain:'rock'}));world.tiles[cell.z*world.width+cell.x]={terrain:'grass'};
  const before=JSON.stringify(world),random=world.rng;
  expect(applyCommand(world,{type:'cancel-unfinished',itemId:piece.id})).toMatchObject({ok:false});
  expect(JSON.stringify(world)).toBe(before);expect(world.rng).toBe(random);
  world.tiles=tiles;
  command(world,{type:'cancel-unfinished',itemId:piece.id});
  expect(world.piles.some(p=>p.id===piece.id)).toBe(false);
  expect(amount(world,'cloth')).toBeGreaterThanOrEqual(22);expect(amount(world,'cloth')).toBeLessThanOrEqual(23);
  expect(amount(world,'steel')).toBe(45);expect(amount(world,'component')).toBeLessThanOrEqual(1);
  expect(amount(world,'cloth')+amount(world,'steel')+amount(world,'component')).toBeGreaterThanOrEqual(67);
});

test('the prepared V109 discovery save really makes its pending vest without changing the historical V101 scene',()=>{
  const world=deserializeWorld(readFileSync('public/test-saves/v109/visages-armurerie.json','utf8'));
  expect(world.pawns.map(p=>p.name)).toEqual(['Ada','Noé','Mina','Ilyas','Lou']);
  expect(world.pawns.map(p=>p.appearance?.bodyType)).toEqual(['Female','Male','Thin','Hulk','Fat']);
  expect(world.piles.some(p=>p.item==='flak-vest'||p.item==='unfinished-flak-vest')).toBe(false);
  const bill=world.structures.find(s=>s.kind==='machining-table')!.bills![0]!;
  expect(bill.recipe).toBe('make-flak-vest');
  advance(world,()=>world.piles.some(p=>p.item==='flak-vest'&&p.owner.type==='ground'),3500);
  expect(bill.target).toBe(0);
  expect(amount(world,'cloth')).toBe(0);expect(amount(world,'steel')).toBe(30);expect(amount(world,'component')).toBe(4);
  expect(world.pawns.find(p=>p.name==='Ada')!.skills.crafting!.xp).toBeGreaterThan(-6200);
  expect(validateWorld(world)).toEqual([]);
});
