import {expect,test} from 'vitest';
import {applyCommand} from '../src/sim/index.ts';
import {componentWorkpiecePlaceFree,cookingSpot,ingredientPlaceFree,newCookingBill} from '../src/sim/cooking-bills.ts';
import {validateCooking,validBiofuelProductionTransport} from '../src/sim/cooking-save.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import type {CookingOrder} from '../src/sim/order-types.ts';
import type {MaterialPile,Structure,World} from '../src/sim/types.ts';
import {biofuelCamp} from './helpers/biofuel-v283.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';

function preparedTask(){
  const {world:w,refineryId}=biofuelCamp(),p=w.pawns[0]!;
  for(const pawn of w.pawns)pawn.priorities.haul=0;
  p.priorities.craft=1;
  addGroundMaterial(w,'wood',70,{x:8,z:11},'wood');
  expect(applyCommand(w,{type:'bill-add',structureId:refineryId,recipe:'chemfuel-from-wood'}).ok).toBe(true);
  const station=w.structures.find(s=>s.id===refineryId)!;
  station.bills![0]!.destination='drop';
  const proposal=planCookingOrder(w,p,refineryId),order=proposal.order as CookingOrder;
  expect(order?.cooking.ingredients).toHaveLength(7);
  p.cooking=structuredClone(order.cooking);p.orders.active='cook';
  return {w,p,c:p.cooking,station};
}

function errors(w:World){
  const before=JSON.stringify(w),historical=validateCooking(w,218,new Set()),memoized=validateCooking(w,218,new Set(),true);
  expect(memoized).toEqual(historical);
  expect(JSON.stringify(w)).toBe(before);
  expect(validBiofuelProductionTransport(w,218,true)).toBe(validBiofuelProductionTransport(w,218));
  return memoized;
}

test('equal staging cells retain seven physical source reservations and the original admission',()=>{
  const {w,c}=preparedTask();
  expect(new Set(c.ingredients.map(i=>`${i.cell.x}/${i.cell.z}`)).size).toBe(1);
  expect(c.ingredients.every(i=>i.stage==='source'&&i.quantity===10)).toBe(true);
  expect(errors(w)).toEqual([]);
});

test('distinct staging cells and both resource and structure blockers keep ordered errors',()=>{
  const {w,c,station}=preparedTask(),first=c.ingredients[0]!.cell;
  const second=[{x:c.spot.x-1,z:c.spot.z},{x:c.spot.x+1,z:c.spot.z},{x:c.spot.x,z:c.spot.z-1},{x:c.spot.x,z:c.spot.z+1}]
    .find(cell=>(cell.x!==first.x||cell.z!==first.z)&&ingredientPlaceFree(w,cell,c.spot,'chemfuel-from-wood',station));
  expect(second).toBeDefined();
  c.ingredients[1]!.cell={...second!};c.ingredients[4]!.cell={...second!};
  expect(errors(w)).toEqual([]);
  w.resources.push({id:w.nextId++,kind:'tree',amount:25,...second!});
  expect(errors(w).filter(e=>e==='Ingredient staging beyond work reach.')).toHaveLength(2);
  w.resources=[];
  fixtureBuilding(w,'wall',first.x,first.z);
  expect(errors(w).filter(e=>e==='Ingredient staging beyond work reach.')).toHaveLength(5);
});

test('a new validation sees blocked then cleared terrain rather than a previous task result',()=>{
  const {w,c}=preparedTask(),cell=c.ingredients[0]!.cell;
  expect(errors(w)).toEqual([]);
  const tile=w.tiles[cell.z*w.width+cell.x]!,terrain=tile.terrain;
  tile.terrain='rock';
  expect(errors(w).filter(e=>e==='Ingredient staging beyond work reach.')).toHaveLength(7);
  tile.terrain=terrain;
  expect(errors(structuredClone(w))).toEqual([]);
});

test('source and staging capacities are still checked for every physical portion',()=>{
  const source=preparedTask(),pile=source.w.piles.find(p=>p.id===source.c.ingredients[0]!.pileId)!;
  pile.quantity=69;
  expect(errors(source.w).filter(e=>e==='Invalid ground ingredient reservation.')).toHaveLength(7);
  const staging=preparedTask();
  // Direct fixture placement creates the invalid claim deliberately. The normal
  // ground planner respects these seventy reservations and spills excess nearby.
  staging.w.piles.push({id:staging.w.nextId++,item:'wood',kind:'wood',quantity:10,owner:{type:'ground',...staging.c.ingredients[0]!.cell}});
  expect(errors(staging.w)).toContain('Invalid ingredient staging capacity.');
});

test('other workers retain their exclusive station and source claims across task-local memos',()=>{
  const {w,c}=preparedTask(),other=w.pawns[1]!;
  other.priorities.craft=1;other.orders.active='cook';other.cooking=structuredClone(c);
  const result=errors(w);
  expect(result).toContain('Invalid or duplicate cooking work spot.');
  expect(result).toContain('Invalid ground ingredient reservation.');
});

test('advanced component surface at distance two keeps work and interrupted-cargo geometry',()=>{
  const {w,p}=preparedTask(),station:Structure={id:w.nextId++,kind:'fabrication-bench',x:16,z:8,orientation:0,footprint:'standard',material:'steel',bills:[]};
  const bill=newCookingBill(w.nextId++,'make-advanced-component');station.bills!.push(bill);w.structures.push(station);
  const spot=cookingSpot(station),cell={x:station.x+1,z:station.z};
  const piece:MaterialPile={id:w.nextId++,item:'unfinished-component',kind:'unfinished',quantity:1,owner:{type:'ground',...cell},
    componentWork:{recipe:'make-advanced-component',authorId:p.id,billId:bill.id,progress:0,
      parts:[{item:'component',quantity:1},{item:'steel',quantity:20},{item:'plasteel',quantity:10},{item:'gold',quantity:3}]}};
  w.piles=[piece];p.x=spot.x;p.z=spot.z;p.path=[];p.state='working';
  p.cooking={recipe:'make-advanced-component',stationId:station.id,billId:bill.id,spot,actionCell:cell,phase:'work',
    ingredients:[{pileId:piece.id,item:'unfinished-component',quantity:1,stage:'placed',cell}],progress:0,productId:null,storageId:null};
  expect(Math.abs(cell.x-spot.x)+Math.abs(cell.z-spot.z)).toBe(2);
  expect(ingredientPlaceFree(w,cell,spot,'make-advanced-component',station)).toBe(false);
  expect(componentWorkpiecePlaceFree(w,cell,spot,'make-advanced-component',station)).toBe(true);
  expect(errors(w)).toEqual([]);
  p.cooking.phase='interrupted';p.cooking.ingredients[0]!.stage='held';piece.owner={type:'pawn',pawnId:p.id};
  expect(errors(w)).toEqual([]);
  w.resources.push({id:w.nextId++,kind:'tree',amount:25,...cell});
  expect(errors(w).filter(e=>e==='Ingredient staging beyond work reach.')).toHaveLength(1);
});
