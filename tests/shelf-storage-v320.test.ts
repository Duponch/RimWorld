import { expect,test } from 'vitest';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';
import { adultAgeTicks,juvenileAgeTicks } from '../src/sim/animal-life.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { newWeaponState } from '../src/sim/equipment-rules.ts';
import { ITEM_DEFINITIONS,type ItemId } from '../src/sim/items.ts';
import { newShelfStorage,shelfFixedAccepts,shelfStorageCells,storageAt,storageCells,storageCellById,storageCellAccepts,groundMaxStacks } from '../src/sim/shelf-storage.ts';
import { createGroundCapacityReader,groundCapacity,groundPilesAt,storageCapacity } from '../src/sim/ground-placement.ts';
import { addMaterial,addGroundMaterial,depositMaterialPart,materialIdentityCount,reservedSource,transferPile } from '../src/sim/materials.ts';
import { destinationCell,destinationCapacity } from '../src/sim/work-planner.ts';
import { planHaulOrder,queuedHaulReason } from '../src/sim/player-hauling.ts';
import { queryOrderOptions } from '../src/sim/player-orders.ts';
import { mayImproveStorage } from '../src/sim/idle-logistics.ts';
import { countedProducts,ingredientPlaceFree,newCookingBill } from '../src/sim/cooking-bills.ts';
import { processCooking } from '../src/sim/cooking.ts';
import { constructionSiteFree } from '../src/sim/construction-rules.ts';
import { groundOccupancyAllows } from '../src/sim/occupancy.ts';
import { createStagingValidation } from '../src/sim/staging-validation.ts';
import { worldBeautyInput } from '../src/sim/beauty-need.ts';
import { groundObjectBeauty } from '../src/sim/room-beauty.ts';
import { processProductionOutput } from '../src/sim/production-output.ts';
import type { ProductionContext } from '../src/sim/production-output.ts';
import type { Cell,HaulTask,Job,MaterialPile,Structure,World } from '../src/sim/types.ts';

function camp(count=4):World {
  const w=deconstructionCamp(count);w.stockpiles=[];w.packed=[];w.growingZones=[];
  if(w.wildlife)w.wildlife.animals=[];
  for(const p of w.pawns){p.priorities.haul=1;p.orders={active:null,queue:[]};p.haul=null;p.cooking=null;}
  return w;
}
function shelf(w:World,kind:'shelf'|'small-shelf'='small-shelf',orientation:0|1|2|3=0):Structure {
  const s:Structure={id:w.nextId++,kind,x:18,z:10,orientation,footprint:'standard',material:'wood',shelf:newShelfStorage(Array.from({length:kind==='shelf'?2:1},()=>w.nextId++))};
  w.structures.push(s);return s;
}
function pile(w:World,item:ItemId,quantity:number,cell:Cell={x:8,z:8}):MaterialPile {
  const p:MaterialPile={id:w.nextId++,item,kind:ITEM_DEFINITIONS[item].kind,quantity,owner:{type:'ground',...cell},...(item==='revolver'?{weapon:newWeaponState('revolver')}:{})};
  w.piles.push(p);return p;
}
function body(w:World,ageTicks:number,cell:Cell={x:8,z:8}):MaterialPile {
  const p=pile(w,'deer-corpse',1,cell);p.rot={progress:0,atTick:w.tick};
  p.corpse={animalId:p.id,species:'deer',sex:'female',ageTicks,health:{...createMedicalRecord(w.tick),body:'deer',death:{tick:w.tick,cause:'blood-loss'}}};
  return p;
}
function reservation(w:World,s:Structure,source:MaterialPile,quantity:number,actor=0,queue=false):HaulTask {
  const task:HaulTask={sourcePileId:source.id,quantity,phase:'pickup',carryPileId:null,destination:{type:'stockpile',stockpileId:s.shelf!.cells[0]!}};
  if(queue)w.pawns[actor]!.orders.queue.push(task);else w.pawns[actor]!.haul=task;
  return task;
}

test.each([0,1,2,3] as const)('two-cell shelf rotation %s keeps cell IDs tied to physical footprint order',orientation=>{
  const w=camp(),s=shelf(w,'shelf',orientation),cells=shelfStorageCells(s),ids=[...s.shelf!.cells];
  expect(cells).toHaveLength(2);expect(cells.map(c=>c.id)).toEqual(ids);
  expect(new Set(cells.map(c=>`${c.x}:${c.z}`)).size).toBe(2);
  for(const c of cells){expect(storageAt(w,c)?.id).toBe(c.id);expect(storageCellById(w,c.id)).toEqual(c);expect(groundMaxStacks(w,c)).toBe(3);}
  expect(storageCells(w).map(c=>c.id)).toEqual(ids);expect(w.stockpiles).toEqual([]);
  s.x=22;s.z=20;expect(shelfStorageCells(s).map(c=>c.id)).toEqual(ids);
});

test('packed shelves expose no storage, while their durable state can return at a new location',()=>{
  const w=camp(),s=shelf(w,'shelf'),ids=[...s.shelf!.cells];w.structures=[];
  w.packed.push({building:s,owner:{type:'ground',x:4,z:4}});
  expect(storageCells(w)).toEqual([]);for(const id of ids)expect(storageCellById(w,id)).toBeUndefined();
  s.x=24;s.z=20;w.packed=[];w.structures.push(s);
  expect(storageCells(w).map(c=>c.id)).toEqual(ids);
});

test('225 wood units become three distinct normal stacks, with ordinary ground still limited to one',()=>{
  const w=camp(),s=shelf(w),start=w.nextId;
  addMaterial(w,'wood',225,{type:'ground',x:s.x,z:s.z},'wood');
  expect(groundPilesAt(w,s).map(p=>[p.id,p.quantity])).toEqual([[start,75],[start+1,75],[start+2,75]]);
  expect(groundCapacity(w,s,'wood')).toBe(0);expect(groundCapacity(w,s,'steel')).toBe(0);
  expect(()=>addMaterial(w,'wood',1,{type:'ground',x:s.x,z:s.z},'wood')).toThrow();
  expect(groundCapacity(w,{x:4,z:4},'wood')).toBe(75);expect(groundMaxStacks(w,{x:4,z:4})).toBe(1);
});

test('three different items share a cell and the fourth is physically rejected',()=>{
  const w=camp(),s=shelf(w);pile(w,'wood',10,s);pile(w,'steel',10,s);pile(w,'rice',10,s);
  expect(groundCapacity(w,s,'wood')).toBe(65);expect(groundCapacity(w,s,'silver')).toBe(0);
  expect(groundPilesAt(w,s)).toHaveLength(3);
});

test('stackLimit one reserves three separate weapon objects instead of multiplying one stack',()=>{
  const w=camp(),s=shelf(w);addMaterial(w,'weapon',3,{type:'ground',x:s.x,z:s.z},'revolver');
  expect(groundPilesAt(w,s).map(p=>p.quantity)).toEqual([1,1,1]);expect(groundCapacity(w,s,'revolver')).toBe(0);
});

test('incoming same-item promises share residual space but consume every required new slot',()=>{
  const w=camp(),s=shelf(w),a=pile(w,'wood',75),b=pile(w,'wood',75,{x:9,z:8}),c=pile(w,'wood',75,{x:10,z:8});
  reservation(w,s,a,50,0);reservation(w,s,b,50,1);reservation(w,s,c,50,2);
  const facts=createGroundCapacityReader(w);
  expect(storageCapacity(w,storageAt(w,s)!,'wood',undefined,undefined,facts)).toBe(75);
  expect(storageCapacity(w,storageAt(w,s)!,'steel',undefined,undefined,facts)).toBe(75);
  reservation(w,s,a,75,3);
  expect(storageCapacity(w,storageAt(w,s)!,'wood')).toBe(0);expect(storageCapacity(w,storageAt(w,s)!,'steel')).toBe(0);
});

test('queued promises of different items reserve all three slots before any pile arrives',()=>{
  const w=camp(),s=shelf(w);for(const [i,item] of (['wood','steel','rice'] as const).entries())reservation(w,s,pile(w,item,10,{x:7+i,z:8}),10,i,true);
  expect(storageCapacity(w,storageAt(w,s)!,'silver')).toBe(0);
  expect(storageCapacity(w,storageAt(w,s)!,'wood')).toBe(65);
});

test('exceptPawn excludes current work once but retains that actor’s waiting orders',()=>{
  const w=camp(),s=shelf(w),wood=pile(w,'wood',75);reservation(w,s,wood,50);reservation(w,s,wood,25,0,true);
  expect(storageCapacity(w,storageAt(w,s)!,'wood',w.pawns[0]!.id)).toBe(200);
  expect(storageCapacity(w,storageAt(w,s)!,'wood')).toBe(150);
  expect(reservedSource(w,wood.id,w.pawns[0]!.id)).toBe(25);
});

test('source reservations distinguish two same-item stacks occupying one cell',()=>{
  const w=camp(),s=shelf(w),a=pile(w,'wood',30,s),b=pile(w,'wood',30,s),target=s.shelf!.cells[0]!;
  const task=(id:number):HaulTask=>({sourcePileId:id,quantity:10,phase:'pickup',carryPileId:null,destination:{type:'aside',x:4,z:4}});
  w.pawns[0]!.haul=task(a.id);w.pawns[1]!.orders.queue.push(task(b.id));
  expect(reservedSource(w,a.id)).toBe(10);expect(reservedSource(w,b.id)).toBe(10);
  expect(destinationCell(w,{type:'stockpile',stockpileId:target})).toMatchObject({id:target,x:s.x,z:s.z});
});

test('whole cargo reservations never masquerade as compatible stack space',()=>{
  const w=camp(),s=shelf(w),wood=pile(w,'wood',10),task=reservation(w,s,wood,1);task.whole=true;
  expect(storageCapacity(w,storageAt(w,s)!,'wood')).toBe(0);
});

test('transfer fills multiple compatible stacks and retains the remaining source identity',()=>{
  const w=camp(),s=shelf(w),a=pile(w,'wood',60,s),b=pile(w,'wood',60,s),source=pile(w,'wood',75),id=source.id;
  source.owner={type:'pawn',pawnId:w.pawns[0]!.id};const next=w.nextId;
  expect(transferPile(w,source,{type:'ground',x:s.x,z:s.z})).toBe(true);
  expect([a.quantity,b.quantity,source.quantity]).toEqual([75,75,45]);expect(source.id).toBe(id);expect(w.nextId).toBe(next);
  expect(groundPilesAt(w,s)).toHaveLength(3);expect(w.stock.wood).toBe(195);
});

test('fully absorbed delivery preserves the IDs of both existing targets',()=>{
  const w=camp(),s=shelf(w),a=pile(w,'wood',60,s),b=pile(w,'wood',60,s),source=pile(w,'wood',30);
  source.owner={type:'pawn',pawnId:w.pawns[0]!.id};expect(transferPile(w,source,{type:'ground',x:s.x,z:s.z})).toBe(true);
  expect(w.piles.map(p=>p.id)).toEqual([a.id,b.id]);expect([a.quantity,b.quantity]).toEqual([75,75]);
});

test('three partial stacks contribute all residual capacity before and after exact promises',()=>{
  const w=camp(),s=shelf(w);pile(w,'wood',50,s);pile(w,'wood',50,s);pile(w,'wood',50,s);
  const source=pile(w,'wood',60);reservation(w,s,source,40);
  expect(storageCapacity(w,storageAt(w,s)!,'wood')).toBe(35);expect(storageCapacity(w,storageAt(w,s)!,'steel')).toBe(0);
  expect(storageCapacity(w,storageAt(w,s)!,'wood',w.pawns[0]!.id)).toBe(75);
  w.pawns[0]!.haul=null;source.owner={type:'pawn',pawnId:w.pawns[0]!.id};
  expect(transferPile(w,source,{type:'ground',x:s.x,z:s.z})).toBe(true);
  expect(groundPilesAt(w,s).map(p=>p.quantity)).toEqual([75,75,60]);expect(w.piles.includes(source)).toBe(false);
});

test('right-click offers transport and equipment for each real pile on a shared cell',()=>{
  const w=camp(),s=shelf(w),a=pile(w,'wood',10,s),b=pile(w,'rice',10,s),weapon=pile(w,'revolver',1,s);
  w.stockpiles.push({id:w.nextId++,x:24,z:10,filters:{wood:true,food:true,weapon:true},priority:4,capacity:75});
  const before=JSON.stringify(w),options=queryOrderOptions(w,w.pawns[0]!.id,s);
  expect(options.flatMap(o=>o.haulTarget?.type==='pile'?[o.haulTarget.pileId]:[])).toEqual([a.id,b.id,weapon.id]);
  expect(options.some(o=>o.equipmentItemId===weapon.id&&o.equipmentAction==='equip')).toBe(true);expect(JSON.stringify(w)).toBe(before);
});

test('partial output retains held ID, rot age, contamination and damage without virtual cargo',()=>{
  const w=camp(),s=shelf(w),target=pile(w,'rice',70,s),source=pile(w,'rice',20),id=source.id;
  target.rot={progress:10,atTick:w.tick};source.rot={progress:100,atTick:w.tick};source.damage=10;source.foodPoison={fraction:.5,cause:'unknown'};
  source.owner={type:'pawn',pawnId:w.pawns[0]!.id};
  expect(depositMaterialPart(w,source,s,10,w.pawns[0]!.id)).toBe(true);
  const deposited=groundPilesAt(w,s).find(p=>p!==target)!;
  expect(source).toMatchObject({id,quantity:10,owner:{type:'pawn'},damage:10,rot:{progress:100},foodPoison:{fraction:.5}});
  expect(target.quantity).toBe(75);expect(target.rot!.progress).toBe(16);
  expect(deposited).toMatchObject({quantity:5,owner:{type:'ground'},damage:10,rot:{progress:100},foodPoison:{fraction:.5}});
  expect(deposited.id).not.toBe(id);expect(w.stock.food).toBe(90);
});

test('failed deposit keeps quantities, states, identity allocation and ownership exact',()=>{
  const w=camp(),s=shelf(w);pile(w,'steel',75,s);pile(w,'rice',75,s);pile(w,'silver',500,s);
  const source=pile(w,'wood',10);source.owner={type:'pawn',pawnId:w.pawns[0]!.id};const before=JSON.stringify(w);
  expect(depositMaterialPart(w,source,s,5,w.pawns[0]!.id)).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('physical exclusions use the real body age, including young large-species animals',()=>{
  const w=camp(),s=shelf(w);s.shelf!.settings.filters.corpse=true;const young=body(w,juvenileAgeTicks('deer')),adult=body(w,adultAgeTicks('deer'),{x:9,z:8});
  expect(shelfFixedAccepts('deer-corpse')).toBe(false);expect(shelfFixedAccepts(young)).toBe(true);expect(shelfFixedAccepts(adult)).toBe(false);
  expect(storageCapacity(w,storageAt(w,s)!,young)).toBe(3);expect(storageCapacity(w,storageAt(w,s)!,adult)).toBe(0);
  young.owner={type:'pawn',pawnId:w.pawns[0]!.id};adult.owner={type:'pawn',pawnId:w.pawns[1]!.id};
  expect(transferPile(w,young,{type:'ground',x:s.x,z:s.z})).toBe(true);
  expect(transferPile(w,adult,{type:'ground',x:s.x,z:s.z})).toBe(false);expect(adult.owner.type).toBe('pawn');
  expect(shelfFixedAccepts('human-corpse')).toBe(false);expect(shelfFixedAccepts('granite-chunk')).toBe(false);expect(shelfFixedAccepts('scyther-corpse')).toBe(false);
});

test('policy refusal redirects hauling while an existing physical stack remains intact',()=>{
  const w=camp(),s=shelf(w),source=pile(w,'wood',20,s);s.shelf!.settings.filters.wood=false;
  const before=JSON.stringify(source);expect(storageCellAccepts(w,storageAt(w,s)!,source)).toBe(false);expect(storageCapacity(w,storageAt(w,s)!,source)).toBe(0);
  expect(groundCapacity(w,s,source)).toBe(205);expect(JSON.stringify(source)).toBe(before);
  w.stockpiles.push({id:w.nextId++,x:24,z:10,filters:{wood:true,food:false},priority:1,capacity:75});
  const proposal=planHaulOrder(w,w.pawns[0]!,{type:'pile',pileId:source.id});expect(proposal.task?.sourcePileId).toBe(source.id);expect(proposal.task?.destination).toMatchObject({stockpileId:w.stockpiles[0]!.id});
});

test('same-cell gate sees every source pile, including a refused second stack',()=>{
  const w=camp(),s=shelf(w);pile(w,'wood',75,s);pile(w,'rice',10,s);s.shelf!.settings.filters.food=false;
  w.stockpiles.push({id:w.nextId++,x:24,z:10,filters:{wood:false,food:true},priority:2,capacity:75});
  expect(mayImproveStorage(w)).toBe(true);
  w.stockpiles=[];expect(mayImproveStorage(w)).toBe(false);
});

test('condition gate does not reuse an adult corpse rejection for a young body of the same item',()=>{
  const w=camp(),s=shelf(w);s.shelf!.settings.filters.corpse=true;s.shelf!.settings.allowRotten=false;
  body(w,adultAgeTicks('deer'));body(w,0,{x:9,z:8});expect(mayImproveStorage(w)).toBe(true);
});

test('fixed chunk exclusion survives an explicitly enabled chunk policy',()=>{
  const w=camp(),s=shelf(w),chunk=pile(w,'granite-chunk',1);s.shelf!.settings.filters.chunk=true;chunk.haulRequested=true;
  expect(storageCellAccepts(w,storageAt(w,s)!,chunk)).toBe(false);expect(destinationCapacity(w,{type:'stockpile',stockpileId:s.shelf!.cells[0]!},'chunk',undefined,chunk)).toBe(0);
  expect(planHaulOrder(w,w.pawns[0]!,{type:'pile',pileId:chunk.id}).task).toBeUndefined();
});

test('waiting shelf haul validates the durable destination cell rather than a pseudo stockpile',()=>{
  const w=camp(),s=shelf(w),source=pile(w,'wood',10),task=reservation(w,s,source,10,0,true);
  expect(queuedHaulReason(w,task,w.pawns[0]!)).toBeUndefined();s.x=20;
  expect(destinationCell(w,task.destination)).toMatchObject({x:20,z:10});expect(queuedHaulReason(w,task,w.pawns[0]!)).toBeUndefined();
  w.structures=[];expect(queuedHaulReason(w,task,w.pawns[0]!)).toBeDefined();
});

test('cooking staging rejects a pass-through shelf while physical ground admission remains true',()=>{
  const w=camp(),s=shelf(w),spot={x:s.x-1,z:s.z},geometry=createStagingValidation(w);
  expect(groundOccupancyAllows(w,s)).toBe(true);expect(geometry.groundAllows(s)).toBe(true);
  expect(ingredientPlaceFree(w,s,spot,'stone-blocks',undefined,geometry)).toBe(false);
  expect(ingredientPlaceFree(w,{x:spot.x,z:spot.z-1},spot,'stone-blocks',undefined,geometry)).toBe(true);
});

test('a shelf appearing beneath held cooking staging releases without losing its physical ingredient binding',()=>{
  const w=camp(),s=shelf(w),p=w.pawns[0]!,station:Structure=fixtureBuilding(w,'campfire',16,10),bill=newCookingBill(w.nextId++),source=pile(w,'rice',10);
  station.bills=[bill];p.x=17;p.z=10;p.priorities.cook=1;p.orders.active='cook';source.owner={type:'pawn',pawnId:p.id};
  p.cooking={stationId:station.id,billId:bill.id,spot:{x:p.x,z:p.z},actionCell:{x:s.x,z:s.z},phase:'gather',ingredients:[{pileId:source.id,item:'rice',quantity:10,stage:'held',cell:{x:s.x,z:s.z}}],progress:0,productId:null,storageId:null};
  let released=0;const before=JSON.stringify(w.piles),context:ProductionContext={release:()=>{released++;return false;},move:()=>{throw Error('unexpected move');},search:()=>null,event:()=>{},workRate:()=>1};
  processCooking(w,p,context);expect(released).toBe(1);expect(JSON.stringify(w.piles)).toBe(before);expect(p.cooking.ingredients[0]).toMatchObject({pileId:source.id,stage:'held'});
  w.structures=w.structures.filter(b=>b!==s);released=0;processCooking(w,p,context);
  expect(released).toBe(0);expect(p.cooking.ingredients[0]).toMatchObject({pileId:source.id,stage:'placed'});expect(source.owner).toEqual({type:'ground',x:s.x,z:s.z});
});

test.each(['source','held','placed'] as const)('shelf completion waits for an engaged %s cooking cell even when its owner is far away',stage=>{
  const w=camp(),p=w.pawns[0]!,station:Structure=fixtureBuilding(w,'campfire',19,8,2),bill=newCookingBill(w.nextId++),cell={x:19,z:10};station.bills=[bill];
  const source=pile(w,'rice',10,stage==='placed'?cell:{x:6,z:6});if(stage==='held')source.owner={type:'pawn',pawnId:p.id};p.x=6;p.z=6;p.orders.active='cook';p.priorities.cook=1;
  // The omitted recipe is the historical simple-meal envelope. Its durable
  // ingredient edge, rather than the cook's current location, excludes storage.
  p.cooking={stationId:station.id,billId:bill.id,spot:{x:19,z:9},actionCell:{...cell},phase:'gather',ingredients:[{pileId:source.id,item:'rice',quantity:10,stage,cell}],progress:0,productId:null,storageId:null};
  const job:Job={id:w.nextId++,kind:'shelf',x:18,z:10,orientation:0,footprint:'standard',material:'wood',construction:'frame',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};w.jobs.push(job);
  const before=JSON.stringify(w);expect(constructionSiteFree(w,job,w.pawns[1]!.id)).toBe(false);expect(JSON.stringify(w)).toBe(before);
  p.cooking=null;expect(constructionSiteFree(w,job,w.pawns[1]!.id)).toBe(true);
});

test('until bills count actual shelf products across every physical stack',()=>{
  const w=camp(),s=shelf(w);pile(w,'simple-meal',5,s);pile(w,'simple-meal',5,s);pile(w,'simple-meal',5,{x:6,z:6});
  expect(countedProducts(w)).toBe(10);w.structures=[];expect(countedProducts(w)).toBe(0);
});

test('shelf protection removes only item beauty, leaving objects physically queryable',()=>{
  const w=camp(),s=shelf(w),stored=pile(w,'wood',10,s),loose=pile(w,'wood',10,{x:6,z:6});
  const input=worldBeautyInput(w),a=input.objects!.find(p=>p.id===stored.id)!,b=input.objects!.find(p=>p.id===loose.id)!;
  expect(groundObjectBeauty(a)).toBe(0);expect(groundObjectBeauty(b)).toBe(-4);expect(groundPilesAt(w,s).map(p=>p.id)).toEqual([stored.id]);
  s.shelf!.settings.filters.wood=false;expect(groundObjectBeauty(worldBeautyInput(w).objects!.find(p=>p.id===stored.id)!)).toBe(0);
});

test('identity preflight counts all new shelf stacks and permits a merge without an allocation',()=>{
  const w=camp(),s=shelf(w),owner={type:'ground' as const,x:s.x,z:s.z};expect(materialIdentityCount(w,225,owner,'wood')).toBe(3);
  pile(w,'wood',70,s);expect(materialIdentityCount(w,5,owner,'wood')).toBe(0);expect(materialIdentityCount(w,80,owner,'wood')).toBe(1);
  w.nextId=Number.MAX_SAFE_INTEGER-1;const before=JSON.stringify(w);
  expect(()=>addGroundMaterial(w,'wood',225,s,'wood')).toThrow();expect(JSON.stringify(w)).toBe(before);
});

test('production output deposits physically into a reserved shelf cell and clears completed cargo',()=>{
  const w=camp(),s=shelf(w),p=w.pawns[0]!,product=pile(w,'simple-meal',1),station:Structure=fixtureBuilding(w,'campfire',16,10),bill=newCookingBill(w.nextId++);station.bills=[bill];
  product.owner={type:'pawn',pawnId:p.id};p.x=s.x-1;p.z=s.z;p.priorities.cook=1;p.orders.active='cook';
  p.cooking={stationId:station.id,billId:bill.id,spot:{x:p.x,z:p.z},actionCell:{x:s.x,z:s.z},phase:'output',ingredients:[],progress:0,productId:product.id,storageId:s.shelf!.cells[0]!};
  const context:ProductionContext={release:()=>{throw Error('unexpected release');},move:()=>{throw Error('unexpected move');},search:()=>null,event:()=>{},workRate:()=>1};
  processProductionOutput(w,p,context,'stockpile');expect(p.cooking).toBeNull();expect(product.owner).toEqual({type:'ground',x:s.x,z:s.z});expect(w.stock.food).toBe(1);
});

test('cooking output reservations share the same exact physical slots with ordinary hauling',()=>{
  const w=camp(),s=shelf(w),p=w.pawns[0]!,product=pile(w,'simple-meal',4),station:Structure=fixtureBuilding(w,'campfire',16,10),bill=newCookingBill(w.nextId++,'cook-simple-meal-bulk');station.bills=[bill];product.owner={type:'pawn',pawnId:p.id};p.priorities.cook=1;p.orders.active='cook';
  p.cooking={recipe:'cook-simple-meal-bulk',stationId:station.id,billId:bill.id,spot:{x:17,z:10},actionCell:{x:s.x,z:s.z},phase:'output',ingredients:[],progress:0,productId:product.id,storageId:s.shelf!.cells[0]!,storageQuantity:4};
  expect(storageCapacity(w,storageAt(w,s)!,'simple-meal')).toBe(3*ITEM_DEFINITIONS['simple-meal'].stackLimit-4);
  expect(storageCapacity(w,storageAt(w,s)!,'wood')).toBe(150);
  expect(storageCapacity(w,storageAt(w,s)!,'wood',p.id)).toBe(225);
});
