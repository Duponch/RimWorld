import { expect, test } from 'vitest';
import { createWorld } from '../src/sim/index';
import { newCookingBill } from '../src/sim/cooking-bills';
import { validateCooking } from '../src/sim/cooking-save';
import { validCookingOrder } from '../src/sim/player-cooking-save';
import { validateFurniture } from '../src/sim/furniture-transfer-save';
import { beginGunWork } from '../src/sim/gun-work';
import type { CookingIngredient } from '../src/sim/cooking-types';
import type { MaterialPile, Structure, World } from '../src/sim/types';

function gunTask():{world:World;parts:CookingIngredient[]} {
  const world=createWorld(42,32,32),pawn=world.pawns[0]!;
  world.tick=1000;world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.jobs=[];world.structures=[];world.piles=[];world.stockpiles=[];world.packed=[];world.pawns=[pawn];
  Object.assign(world,{schemaVersion:101});
  pawn.x=10;pawn.z=9;pawn.state='working';pawn.path=[];pawn.jobId=null;pawn.haul=null;pawn.need=null;pawn.priorities.craft=1;
  const station:Structure={id:world.nextId++,kind:'machining-table',x:10,z:10,orientation:0,footprint:'standard',material:'steel',bills:[newCookingBill(world.nextId++,'make-revolver')]};
  world.structures=[station];
  const parts:CookingIngredient[]=[
    {pileId:world.nextId++,item:'steel',quantity:30,stage:'placed',cell:{x:10,z:10}},
    {pileId:world.nextId++,item:'component',quantity:2,stage:'placed',cell:{x:9,z:9}},
  ];
  world.piles=parts.map((i:CookingIngredient):MaterialPile=>({id:i.pileId,item:i.item,kind:i.item as 'steel'|'component',quantity:i.quantity,owner:{type:'ground',...i.cell}}));
  pawn.cooking={recipe:'make-revolver',stationId:station.id,billId:station.bills![0]!.id,spot:{x:10,z:9},actionCell:{x:10,z:10},phase:'work',ingredients:parts,progress:0,productId:null,storageId:null};
  return {world,parts};
}

test('gun task requires exact steel and component totals in active and queued saves',()=>{
  const {world,parts}=gunTask(),pawn=world.pawns[0]!;
  expect(validateCooking(world,101,new Set())).toEqual([]);
  const order={cooking:{...pawn.cooking!,phase:'gather' as const}};
  expect(validCookingOrder(order,world)).toBe(true);
  const steel=parts[0]!;
  const splitOrder={cooking:{...order.cooking,ingredients:[{...steel,quantity:10},{...steel,quantity:10},{...steel,quantity:10},parts[1]!]}};
  expect(validCookingOrder(splitOrder,world)).toBe(true);
  parts[0]!.quantity=31;parts[1]!.quantity=1;
  expect(validateCooking(world,101,new Set())).toContain('Invalid recipe quantity or phase.');
  expect(validCookingOrder(order,world)).toBe(false);
  parts[0]!.quantity=30;parts[1]!.quantity=2;
  expect(validateCooking(world,100,new Set())).not.toEqual([]);
  Object.assign(world,{schemaVersion:100});
  expect(validCookingOrder(order,world)).toBe(false);
});

test('authored gun workpiece preserves progress and rejects a forged resume',()=>{
  const {world}=gunTask(),pawn=world.pawns[0]!;
  const work=beginGunWork(world,pawn)!;
  expect(work.item).toBe('unfinished-gun');
  work.gunWork!.progress=10000;pawn.cooking!.progress=10000;
  expect(validateCooking(world,101,new Set())).toEqual([]);
  const order={cooking:{...pawn.cooking!,phase:'gather' as const,progress:0,ingredients:[{...pawn.cooking!.ingredients[0]!,stage:'placed' as const}]}};
  expect(validCookingOrder(order,world)).toBe(true);
  work.gunWork!.authorId++;
  expect(validateCooking(world,101,new Set())).toContain('Invalid unfinished gun ownership or progress.');
});

test('interrupted gun cargo may contain one partial ingredient without inventing the rest',()=>{
  const {world,parts}=gunTask(),pawn=world.pawns[0]!,steel=parts[0]!;
  steel.quantity=10;steel.stage='held';
  pawn.cooking!.phase='interrupted';pawn.cooking!.ingredients=[steel];
  world.piles=[{...world.piles[0]!,quantity:10,owner:{type:'pawn',pawnId:pawn.id}}];
  expect(validateCooking(world,101,new Set())).toEqual([]);
});

test('packed production benches retain bill-bearing kinds only from their introduced schema',()=>{
  const {world}=gunTask(),station=world.structures[0]!;
  world.structures=[];world.pawns=[];world.piles=[];
  world.packed=[{building:station,owner:{type:'ground',x:15,z:15}}];
  expect(validateFurniture(world,101,new Set(),true)).toEqual([]);
  expect(validateFurniture(world,100,new Set(),true)).toContain('Invalid packed building.');
  station.kind='electric-tailor-bench';station.material='wood';station.bills=[newCookingBill(world.nextId++,'pants')];
  expect(validateFurniture(world,90,new Set(),true)).toEqual([]);
  expect(validateFurniture(world,89,new Set(),true)).toContain('Invalid packed building.');
});

test.each(['pants','duster','parka'] as const)('%s remains valid in V90 queued recipe shape',recipe=>{
  const {world}=gunTask();
  const task={recipe,stationId:1,billId:2,spot:{x:10,z:11},actionCell:{x:10,z:10},phase:'gather',ingredients:[{pileId:3,item:'cloth',quantity:recipe==='pants'?40:80,stage:'source',cell:{x:10,z:10}}],progress:0,productId:null,storageId:null};
  Object.assign(world,{schemaVersion:90});
  expect(validCookingOrder({cooking:task},world)).toBe(true);
  Object.assign(world,{schemaVersion:89});
  expect(validCookingOrder({cooking:task},world)).toBe(false);
});
