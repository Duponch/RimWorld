import { expect, test } from 'vitest';
import { createWorld } from '../src/sim/index';
import { newCookingBill } from '../src/sim/cooking-bills';
import { cancelGunWork, beginGunWork, detachMissingGunBills, validGunWorkShape, validateGunWorks } from '../src/sim/gun-work';
import { healthRandom } from '../src/sim/health';
import { productionWorkTotal, type GunRecipe } from '../src/sim/production-recipes';
import type { CookingIngredient } from '../src/sim/cooking-types';
import type { MaterialPile, Pawn, World } from '../src/sim/types';

function staged(recipe:GunRecipe='make-revolver'):{world:World;pawn:Pawn;billId:number;parts:CookingIngredient[]} {
  const world=createWorld(42,32,32);
  world.tick=2000;world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.jobs=[];world.structures=[];world.piles=[];world.stockpiles=[];
  world.pawns=world.pawns.slice(0,1);
  const pawn=world.pawns[0]!,billId=world.nextId++;
  const bill=newCookingBill(billId,recipe);
  world.structures.push({id:world.nextId++,kind:'machining-table',x:14,z:11,orientation:0,footprint:'standard',bills:[bill]});
  const steel=recipe==='make-revolver'?[20,10]:[40,20],component=recipe==='make-revolver'?2:3;
  const inputs:[number,'steel'|'component',number,number,number][]=[
    [world.nextId++,'steel',steel[0]!,14,13],
    [world.nextId++,'steel',steel[1]!,15,12],
    [world.nextId++,'component',component,13,12],
  ];
  const parts=inputs.map(([id,item,quantity,x,z]):CookingIngredient=>({pileId:id,item,quantity,stage:'placed',cell:{x,z}}));
  world.piles=inputs.map(([id,item,quantity,x,z]):MaterialPile=>({id,item,kind:item,quantity,owner:{type:'ground',x,z}}));
  pawn.cooking={recipe,stationId:world.structures[0]!.id,billId,spot:{x:14,z:12},actionCell:{x:14,z:12},phase:'work',ingredients:parts,progress:0,productId:null,storageId:null};
  return {world,pawn,billId,parts};
}

test.each(['make-revolver','make-bolt-action-rifle'] as const)('%s consumes both staged types once and resumes the same authored workpiece',recipe=>{
  const {world,pawn,billId}=staged(recipe),beforeId=world.nextId;
  const work=beginGunWork(world,pawn)!;
  expect(work).toMatchObject({id:beforeId,item:'unfinished-gun',quantity:1,gunWork:{recipe,authorId:pawn.id,progress:0,billId,parts:[{item:'steel'},{item:'steel'},{item:'component'}]}});
  expect(world.piles).toEqual([work]);
  expect(pawn.cooking!.ingredients).toEqual([{pileId:work.id,item:'unfinished-gun',quantity:1,stage:'placed',cell:{x:14,z:13}}]);
  expect(validGunWorkShape(work as unknown as Record<string,unknown>,101)).toBe(true);
  expect(validateGunWorks(world,101)).toEqual([]);
  work.gunWork!.progress=productionWorkTotal(recipe)/2;
  pawn.cooking!.progress=work.gunWork!.progress;
  const resumed=beginGunWork(world,pawn);
  expect(resumed).toBe(work);
  expect(world.nextId).toBe(beforeId+1);
  expect(work.gunWork!.progress).toBe(productionWorkTotal(recipe)/2);
  const copy=structuredClone(world);
  expect(copy.piles[0]!.gunWork).toEqual(work.gunWork);
  expect(validateGunWorks(copy,101)).toEqual([]);
});

test('cancellation rounds each source part separately and refunds steel and components without changing textile state',()=>{
  const {world,pawn}=staged(),work=beginGunWork(world,pawn)!;
  const random={rng:world.rng},refund={steel:0,component:0};
  for(const part of work.gunWork!.parts){const raw=part.quantity*.75,whole=Math.floor(raw);refund[part.item]+=whole+(raw>whole&&healthRandom(random)<raw-whole?1:0);}
  expect(cancelGunWork(world,work.id)).toEqual({ok:true});
  expect(world.piles.filter(p=>p.item==='unfinished-gun')).toEqual([]);
  for(const item of ['steel','component'] as const)expect(world.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)).toBe(refund[item]);
  expect(world.rng).toBe(random.rng);
  expect(pawn.cooking).toBeNull();
  expect(world.tailoring).toBeUndefined();
  expect(validateGunWorks(world,101)).toEqual([]);
});

test('transport fragments from one source pile become one incorporated part for refund rounding',()=>{
  const {world,pawn}=staged(),first=pawn.cooking!.ingredients[0]!;
  pawn.cooking!.ingredients.splice(0,1,{...first,quantity:10},{...first,quantity:10});
  const work=beginGunWork(world,pawn)!;
  expect(work.gunWork!.parts).toEqual([{item:'steel',quantity:20},{item:'steel',quantity:10},{item:'component',quantity:2}]);
  const random={rng:world.rng},expected={steel:0,component:0};
  for(const part of work.gunWork!.parts){const raw=part.quantity*.75,whole=Math.floor(raw);expected[part.item]+=whole+(raw>whole&&healthRandom(random)<raw-whole?1:0);}
  expect(cancelGunWork(world,work.id)).toEqual({ok:true});
  expect(world.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(expected.steel);
  expect(world.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(expected.component);
  expect(world.rng).toBe(random.rng);
});

test('no room for the workpiece leaves every staged source, task and next ID untouched',()=>{
  const {world,pawn}=staged();
  for(const pile of world.piles)pile.quantity++;
  world.piles.push({id:world.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',x:14,z:11}});
  const before=structuredClone(world);
  expect(beginGunWork(world,pawn)).toBeNull();
  expect(world).toEqual(before);
});

test('second refund type cannot fit: cancellation refuses atomically, including PRNG and reservations',()=>{
  const {world,pawn}=staged(),work=beginGunWork(world,pawn)!;
  const origin=work.owner;if(origin.type!=='ground')throw new Error('Expected ground workpiece');
  world.tiles=world.tiles.map(()=>({terrain:'rock'}));
  world.tiles[origin.z*world.width+origin.x]={terrain:'grass'};
  const before=structuredClone(world);
  expect(cancelGunWork(world,work.id)).toMatchObject({ok:false,code:'occupied'});
  expect(world).toEqual(before);
  expect(pawn.cooking!.ingredients[0]!.pileId).toBe(work.id);
});

test('shape and bound bill validation reject future, forged, duplicate and orphan works',()=>{
  const {world,pawn}=staged(),work=beginGunWork(world,pawn)!;
  const raw=work as unknown as Record<string,unknown>;
  expect(validGunWorkShape(raw,100)).toBe(false);
  for(const corrupt of [
    {...work.gunWork,parts:[{item:'steel',quantity:30},{item:'component',quantity:1}]},
    {...work.gunWork,progress:productionWorkTotal('make-revolver')+1},
    {...work.gunWork,parts:[{item:'steel',quantity:30},{item:'wood',quantity:2}]},
  ])expect(validGunWorkShape({...raw,gunWork:corrupt},101)).toBe(false);
  const duplicate=structuredClone(work);duplicate.id=world.nextId++;
  world.piles.push(duplicate);
  expect(validateGunWorks(world,101)).toContain('Invalid unfinished gun bound bill.');
  world.piles.pop();world.pawns=[];
  expect(validateGunWorks(world,101)).toContain('Missing unfinished gun author.');
  world.pawns=[pawn];world.structures=[];
  detachMissingGunBills(world);
  expect(work.gunWork!.billId).toBeUndefined();
  expect(validateGunWorks(world,101)).toEqual([]);
});
