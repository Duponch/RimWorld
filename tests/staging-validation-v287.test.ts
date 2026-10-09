import {expect,test} from 'vitest';
import {applyCommand} from '../src/sim/index.ts';
import {componentWorkpiecePlaceFree,cookingSpot,ingredientPlaceFree,newCookingBill} from '../src/sim/cooking-bills.ts';
import {validateCooking,validBiofuelProductionTransport} from '../src/sim/cooking-save.ts';
import {groundOccupancyAllows} from '../src/sim/occupancy.ts';
import {createStagingValidation} from '../src/sim/staging-validation.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import type {CookingOrder} from '../src/sim/order-types.ts';
import type {Cell,MaterialPile,Resource,Structure,World} from '../src/sim/types.ts';
import {biofuelCamp} from './helpers/biofuel-v283.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';

function preparedTask(){
  const {world:w,refineryId}=biofuelCamp(),p=w.pawns[0]!;
  for(const pawn of w.pawns)pawn.priorities.haul=0;
  p.priorities.craft=1;addGroundMaterial(w,'wood',70,{x:8,z:11},'wood');
  expect(applyCommand(w,{type:'bill-add',structureId:refineryId,recipe:'chemfuel-from-wood'}).ok).toBe(true);
  const station=w.structures.find(s=>s.id===refineryId)!;station.bills![0]!.destination='drop';
  const proposal=planCookingOrder(w,p,refineryId),order=proposal.order as CookingOrder;
  expect(order?.cooking.ingredients).toHaveLength(7);
  p.cooking=structuredClone(order.cooking);p.orders.active='cook';
  return {w,p,c:p.cooking,station};
}
function equalValidation(w:World){
  const before=JSON.stringify(w),historical=validateCooking(w,218,new Set());
  expect(validateCooking(w,218,new Set(),true)).toEqual(historical);
  expect(validateCooking(w,218,new Set(),true,true)).toEqual(historical);
  expect(validBiofuelProductionTransport(w,218,true,true)).toBe(validBiofuelProductionTransport(w,218));
  expect(JSON.stringify(w)).toBe(before);return historical;
}
function outcome(read:()=>boolean):boolean|string{
  try{return read();}catch(error){return `${(error as Error).name}: ${(error as Error).message}`;}
}

test('resource coordinates keep strict equality, holes, duplicates and out-of-map separation',()=>{
  const w=deconstructionCamp(0,16),resource=(x:number,z:number):Resource=>({id:w.nextId++,kind:'tree',amount:25,x,z});
  w.resources=[resource(16,0),resource(-1,2),resource(3.5,4.5),resource(-0,7),resource(5,5),resource(5,5),resource(NaN,6),resource(2,NaN)];
  w.resources.length+=2;w.resources[w.resources.length-1]=resource(Infinity,8);
  const reader=createStagingValidation(w);
  const cells=[{x:0,z:1},{x:15,z:1},{x:16,z:0},{x:-1,z:2},{x:3.5,z:4.5},{x:0,z:7},{x:5,z:5},{x:NaN,z:6},{x:2,z:NaN},{x:Infinity,z:8}];
  for(const cell of cells)expect(reader.hasResource(cell)).toBe(w.resources.some(r=>r.x===cell.x&&r.z===cell.z));
});

test('reader creation and rejected reach do not read resources or occupation early',()=>{
  const w=deconstructionCamp(0,16),cell={x:1,z:1},spot={x:10,z:10};
  Object.defineProperty(w,'resources',{get(){throw new Error('resources were read');}});
  const reader=createStagingValidation(w);
  expect(ingredientPlaceFree(w,cell,spot,'make-component')).toBe(false);
  expect(ingredientPlaceFree(w,cell,spot,'make-component',undefined,reader)).toBe(false);
  expect(()=>reader.hasResource(cell)).toThrow('resources were read');
});

test('occupation uses original point queries for rotations, fractions, malformed anchors and legacy jobs',()=>{
  const w=deconstructionCamp(0,16);
  const scenes:Structure[][]=[
    [{id:1,kind:'table-long',x:4,z:4,orientation:2,footprint:'standard'},{id:2,kind:'solar-generator',x:15,z:0,orientation:0,footprint:'standard'}],
    [{id:3,kind:'wood-generator',x:4.5,z:4.5,orientation:0,footprint:'standard'}],
    [{id:4,kind:'table',x:4,z:4,orientation:9,footprint:'standard'} as unknown as Structure],
    [{id:5,kind:'unknown',x:4,z:4,orientation:0,footprint:'standard'} as unknown as Structure],
  ];
  const cells:Cell[]=[{x:4,z:4},{x:5,z:5},{x:3,z:4},{x:0,z:1},{x:15,z:1},{x:1.5,z:2}];
  for(const structures of scenes){
    w.structures=structures;const reader=createStagingValidation(w);
    for(const cell of cells)expect(outcome(()=>reader.groundAllows(cell))).toBe(outcome(()=>groundOccupancyAllows(w,cell)));
  }
  w.structures=[];w.schemaVersion=15 as World['schemaVersion'];
  w.jobs=[{id:6,kind:'wall',x:4,z:4,orientation:0,footprint:'standard'} as World['jobs'][number]];
  const legacy=createStagingValidation(w);
  expect(legacy.groundAllows({x:4,z:4})).toBe(groundOccupancyAllows(w,{x:4,z:4}));
  expect(legacy.groundAllows({x:5,z:4})).toBe(true);
});

test('task validation keeps per-portion errors and sees later worlds through fresh readers',()=>{
  const {w,c,station}=preparedTask(),first=c.ingredients[0]!.cell;
  expect(equalValidation(w)).toEqual([]);
  const second=[{x:c.spot.x-1,z:c.spot.z},{x:c.spot.x+1,z:c.spot.z},{x:c.spot.x,z:c.spot.z-1},{x:c.spot.x,z:c.spot.z+1}]
    .find(cell=>(cell.x!==first.x||cell.z!==first.z)&&ingredientPlaceFree(w,cell,c.spot,'chemfuel-from-wood',station));
  expect(second).toBeDefined();c.ingredients[1]!.cell={...second!};c.ingredients[4]!.cell={...second!};
  w.resources.push({id:w.nextId++,kind:'tree',amount:25,...second!});
  expect(equalValidation(w).filter(e=>e==='Ingredient staging beyond work reach.')).toHaveLength(2);
  w.resources=[];fixtureBuilding(w,'wall',first.x,first.z);
  expect(equalValidation(w).filter(e=>e==='Ingredient staging beyond work reach.')).toHaveLength(5);
  w.structures.pop();expect(equalValidation(structuredClone(w))).toEqual([]);
  w.piles.find(p=>p.id===c.ingredients[0]!.pileId)!.quantity=69;
  expect(equalValidation(w).filter(e=>e==='Invalid ground ingredient reservation.')).toHaveLength(7);
});

test('advanced workpiece geometry remains valid at distance two, including carried interruption',()=>{
  const {w,p}=preparedTask(),station:Structure={id:w.nextId++,kind:'fabrication-bench',x:16,z:8,orientation:0,footprint:'standard',material:'steel',bills:[]};
  const bill=newCookingBill(w.nextId++,'make-advanced-component');station.bills!.push(bill);w.structures.push(station);
  const spot=cookingSpot(station),cell={x:station.x+1,z:station.z};
  const piece:MaterialPile={id:w.nextId++,item:'unfinished-component',kind:'unfinished',quantity:1,owner:{type:'ground',...cell},
    componentWork:{recipe:'make-advanced-component',authorId:p.id,billId:bill.id,progress:0,
      parts:[{item:'component',quantity:1},{item:'steel',quantity:20},{item:'plasteel',quantity:10},{item:'gold',quantity:3}]}};
  w.piles=[piece];p.x=spot.x;p.z=spot.z;p.path=[];p.state='working';
  p.cooking={recipe:'make-advanced-component',stationId:station.id,billId:bill.id,spot,actionCell:cell,phase:'work',
    ingredients:[{pileId:piece.id,item:'unfinished-component',quantity:1,stage:'placed',cell}],progress:0,productId:null,storageId:null};
  expect(componentWorkpiecePlaceFree(w,cell,spot,'make-advanced-component',station,createStagingValidation(w))).toBe(true);
  expect(equalValidation(w)).toEqual([]);
  p.cooking.phase='interrupted';p.cooking.ingredients[0]!.stage='held';piece.owner={type:'pawn',pawnId:p.id};
  expect(equalValidation(w)).toEqual([]);
  w.resources.push({id:w.nextId++,kind:'tree',amount:25,...cell});
  expect(equalValidation(w).filter(e=>e==='Ingredient staging beyond work reach.')).toHaveLength(1);
});

test('standalone geometry retains getter observations and original resource throws',()=>{
  const w=deconstructionCamp(0,16),cell={x:5,z:5},spot={x:5,z:4};let reads=0;
  const resource={id:1,kind:'tree',amount:25,get x(){reads++;return reads===1?0:5;},z:5} as Resource;
  w.resources=[resource];
  expect(ingredientPlaceFree(w,cell,spot,'make-component')).toBe(true);
  expect(ingredientPlaceFree(w,cell,spot,'make-component')).toBe(false);expect(reads).toBe(2);
  w.resources=[null as unknown as Resource];
  expect(outcome(()=>ingredientPlaceFree(w,cell,spot,'make-component'))).toMatch(/^TypeError:/);
  expect(outcome(()=>ingredientPlaceFree(w,cell,spot,'make-component',undefined,createStagingValidation(w))))
    .toBe(outcome(()=>ingredientPlaceFree(w,cell,spot,'make-component')));
});
