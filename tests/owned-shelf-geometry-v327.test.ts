import {expect,test} from 'vitest';
import {createOwnedValidationGeometry} from '../src/sim/owned-validation-geometry.ts';
import {createStagingValidation} from '../src/sim/staging-validation.ts';
import {shelfAt,storageAt,newShelfStorage,shelfStorageCells} from '../src/sim/shelf-storage.ts';
import {createGroundCapacityReader,groundCapacity} from '../src/sim/ground-placement.ts';
import {ingredientPlaceFree,componentWorkpiecePlaceFree,cookingSpot,newCookingBill} from '../src/sim/cooking-bills.ts';
import {validateCooking,validBiofuelProductionTransport} from '../src/sim/cooking-save.ts';
import {applyCommand} from '../src/sim/index.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import type {CookingOrder} from '../src/sim/order-types.ts';
import type {Cell,MaterialPile,Structure,World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {biofuelCamp} from './helpers/biofuel-v283.ts';

// Stable ordinary structure geometry is owned during one adoption. These
// tests do not grant the optimized queries to mutable RAW callers.
function camp(count=0):World {
  const w=deconstructionCamp(count,16);
  w.resources=[];w.structures=[];w.jobs=[];w.piles=[];w.packed=[];w.stockpiles=[];
  for(const p of w.pawns){p.haul=null;p.cooking=null;p.orders={active:null,queue:[]};}
  return w;
}
function shelf(w:World,kind:'shelf'|'small-shelf'='shelf',orientation:0|1|2|3=0,cell:Cell={x:8,z:8}):Structure {
  return {id:w.nextId++,kind,...cell,orientation,footprint:'standard',material:'wood',
    shelf:newShelfStorage(Array.from({length:kind==='shelf'?2:1},()=>w.nextId++))};
}
const outcome=(read:()=>unknown):unknown=>{
  try{return read();}catch(error){return `${(error as Error).name}: ${(error as Error).message}`;}
};
function equalQueries(w:World,cells:readonly Cell[]):void {
  const reader=createOwnedValidationGeometry(w);
  for(const cell of cells){
    expect(outcome(()=>reader.shelfAt!(cell))).toBe(outcome(()=>shelfAt(w,cell)));
    expect(outcome(()=>reader.storageAt!(cell))).toEqual(outcome(()=>storageAt(w,cell)));
  }
}

test('both shelf footprints and four rotations keep literal point borders and durable cell order',()=>{
  const w=camp(),cells:Cell[]=[];
  for(let z=4;z<=12;z++)for(let x=4;x<=12;x++)cells.push({x,z});
  for(const kind of ['shelf','small-shelf'] as const)for(const orientation of [0,1,2,3] as const){
    for(const footprint of ['standard','legacy-single'] as const){
      const building=shelf(w,kind,orientation);building.footprint=footprint;w.structures=[building];
      const reader=createOwnedValidationGeometry(w),literal=shelfStorageCells(building);
      for(const cell of cells){
        expect(reader.shelfAt!(cell)).toBe(shelfAt(w,cell));
        expect(reader.storageAt!(cell)).toEqual(storageAt(w,cell));
      }
      for(const [i,cell] of literal.entries()){
        expect(reader.shelfAt!(cell)).toBe(building);
        expect(reader.storageAt!(cell)?.id).toBe(building.shelf!.cells[i]);
      }
    }
  }
});

test('ordered overlapping occurrences choose the first shelf before the first stockpile',()=>{
  const w=camp(),cell={x:8,z:8},first=shelf(w,'shelf',1),second=shelf(w,'shelf',1);
  const bare:Structure={id:w.nextId++,kind:'small-shelf',...cell,orientation:0,footprint:'standard'};
  const unrelated:Structure={id:w.nextId++,kind:'wall',...cell,orientation:0,footprint:'standard'};
  // Duplicate IDs and occurrences must not turn first-match into Map last-wins.
  second.id=first.id;first.shelf!.settings.priority=2;second.shelf!.settings.priority=5;
  w.structures=[unrelated,bare,second,first,second];
  w.stockpiles=[{id:w.nextId++,...cell,priority:1,capacity:75,filters:{wood:true,food:true}},
    {id:w.nextId++,...cell,priority:4,capacity:75,filters:{wood:true,food:true}}];
  const reader=createOwnedValidationGeometry(w);
  for(const c of shelfStorageCells(second)){
    expect(reader.shelfAt!(c)).toBe(second);
    expect(reader.storageAt!(c)).toEqual(storageAt(w,c));
    expect(reader.storageAt!(c)?.priority).toBe(5);
  }
  const next={...w,structures:[unrelated,bare,first,second,first]};
  expect(createOwnedValidationGeometry(next).shelfAt!(cell)).toBe(first);
  const absent={...w,structures:[unrelated,bare]};
  const absentReader=createOwnedValidationGeometry(absent);
  expect(absentReader.shelfAt!(cell)).toBeUndefined();
  expect(absentReader.storageAt!(cell)).toBe(w.stockpiles[0]);
});

test('shelf state, cell IDs and storage policies remain live after the geometry capture',()=>{
  const w=camp(),building=shelf(w,'shelf',3);w.structures=[building];
  const cell=shelfStorageCells(building)[1]!,reader=createOwnedValidationGeometry(w);
  expect(reader.storageAt!(cell)).toEqual(storageAt(w,cell));
  const oldId=building.shelf!.cells[1];building.shelf!.cells[1]=w.nextId++;
  building.shelf!.settings={...building.shelf!.settings,priority:1,capacity:25,filters:{wood:false,food:true}};
  const fresh=reader.storageAt!(cell);
  expect(fresh).toEqual(storageAt(w,cell));expect(fresh?.id).not.toBe(oldId);
  expect(fresh).toMatchObject({priority:1,capacity:25,filters:{wood:false,food:true}});
  // Kind membership alone is captured; an absent shelf state is not a durable
  // negative certificate. Geometry has not moved in this policy/state case.
  delete building.shelf;
  w.stockpiles=[{id:w.nextId++,x:cell.x,z:cell.z,priority:3,capacity:30,filters:{wood:true,food:true}}];
  expect(reader.shelfAt!(cell)).toBeUndefined();expect(reader.storageAt!(cell)).toBe(w.stockpiles[0]);
  w.stockpiles[0]!.priority=5;expect(reader.storageAt!(cell)?.priority).toBe(5);
  building.shelf=newShelfStorage([w.nextId++,w.nextId++]);
  expect(reader.shelfAt!(cell)).toBe(building);expect(reader.storageAt!(cell)).toEqual(storageAt(w,cell));
});

test('standalone staging keeps absent optional methods and the literal mutable shelf query',()=>{
  const w=camp(),cell={x:8,z:8},spot={x:8,z:9},building=shelf(w,'small-shelf');
  const rawReader=createStagingValidation(w);
  expect(rawReader.shelfAt).toBeUndefined();expect(rawReader.storageAt).toBeUndefined();
  w.structures=[building];
  expect(ingredientPlaceFree(w,cell,spot,'make-component',undefined,rawReader)).toBe(false);
  expect(ingredientPlaceFree(w,cell,spot,'make-component')).toBe(false);
  expect(groundCapacity(w,cell,'wood',undefined,rawReader)).toBe(groundCapacity(w,cell,'wood'));
  // RAW shelf query remains fresh even when the generic staging reader was
  // created earlier. Occupancy itself still has its existing scoped contract.
  w.structures=[];
  expect(ingredientPlaceFree(w,cell,spot,'make-component',undefined,rawReader)).toBe(true);
  expect(ingredientPlaceFree(w,cell,spot,'make-component')).toBe(true);
  const rawCapacity=createStagingValidation(w);
  expect(groundCapacity(w,cell,'wood',undefined,rawCapacity)).toBe(groundCapacity(w,cell,'wood'));
  // An explicit capacity reader retains precedence over the optional query.
  const facts=createGroundCapacityReader(w),geometry=createOwnedValidationGeometry(w);
  geometry.storageAt=()=>{throw Error('capacity-reader precedence lost');};
  expect(groundCapacity(w,cell,'wood',undefined,geometry,facts)).toBe(groundCapacity(w,cell,'wood',undefined,undefined,facts));
});

test('unsupported captures and unusual cells retain literal success, misses and exceptions',()=>{
  const w=camp(),building=shelf(w,'shelf',1),cells:Cell[]=[
    {x:8,z:8},{x:9,z:8},{x:8.5,z:8},{x:NaN,z:8},{x:Infinity,z:8},
    {x:0,z:16},{x:16,z:0},{x:-0,z:0},{x:Number.MAX_SAFE_INTEGER,z:8},
  ];
  const unknown={...building,kind:'unknown'} as unknown as Structure;
  const scenes:Structure[][]=[
    [building,null as unknown as Structure],
    [unknown,building],
    [{...building,orientation:9} as unknown as Structure],
    [{...building,x:8.5}],
    [{...building,x:Number.MAX_SAFE_INTEGER}],
    [{...building,footprint:'unsupported'} as unknown as Structure],
    [{...building,furniture:{kind:'table'}} as unknown as Structure],
    [{...building,deconstruction:{kind:'table'}} as unknown as Structure],
  ];
  const hole:Structure[]=[];hole.length=1;hole.push(building);scenes.push(hole);
  for(const structures of scenes){w.structures=structures;equalQueries(w,cells);}
  w.structures=[building,null as unknown as Structure];
  expect(createOwnedValidationGeometry(w).shelfAt!({x:8,z:8})).toBe(building);
  // A safe out-of-map integer is a supported point query, not a new bounds
  // refusal: literal shelf geometry may extend beyond the map's edge.
  const edge=shelf(w,'shelf',0,{x:15,z:0});w.structures=[edge];
  expect(createOwnedValidationGeometry(w).shelfAt!({x:16,z:0})).toBe(shelfAt(w,{x:16,z:0}));
  expect(shelfAt(w,{x:16,z:0})).toBe(edge);
});

test('malformed shelf storage misses preserve groundCapacity default stockpile reservations',()=>{
  const w=camp(1),cell={x:8,z:8},building=shelf(w,'small-shelf');w.structures=[building];
  Object.assign(building.shelf!.settings,{x:99,z:99});
  const zone={id:w.nextId++,...cell,priority:3,capacity:50,filters:{wood:true,food:true}};
  w.stockpiles=[zone];
  const source:MaterialPile={id:w.nextId++,kind:'wood',item:'wood',quantity:20,owner:{type:'ground',x:1,z:1}};
  w.piles=[source];w.pawns[0]!.haul={sourcePileId:source.id,quantity:20,phase:'pickup',carryPileId:null,
    destination:{type:'stockpile',stockpileId:zone.id}};
  const reader=createOwnedValidationGeometry(w);
  expect(reader.shelfAt!(cell)).toBe(building);
  expect(reader.storageAt!(cell)).toBeUndefined();expect(storageAt(w,cell)).toBeUndefined();
  // Passing null to cellCapacity would lose this reservation and return75.
  expect(groundCapacity(w,cell,'wood')).toBe(55);
  expect(groundCapacity(w,cell,'wood',undefined,reader)).toBe(55);
  building.shelf!.settings=null as unknown as NonNullable<Structure['shelf']>['settings'];
  expect(outcome(()=>reader.storageAt!(cell))).toEqual(outcome(()=>storageAt(w,cell)));
  building.shelf={settings:newShelfStorage([]).settings} as unknown as NonNullable<Structure['shelf']>;
  expect(outcome(()=>reader.storageAt!(cell))).toEqual(outcome(()=>storageAt(w,cell)));
});

test('fresh adoptions see moved, removed and packed shelves while old reader keeps its World',()=>{
  const w=camp(),building=shelf(w,'shelf',1);w.structures=[building];
  const cells=shelfStorageCells(building),oldReader=createOwnedValidationGeometry(w),before=structuredClone(w);
  expect(oldReader.storageAt!(cells[1]!)?.id).toBe(building.shelf!.cells[1]);
  const moved=structuredClone(w);moved.structures[0]!.x=3;moved.structures[0]!.z=4;
  equalQueries(moved,[...cells,...shelfStorageCells(moved.structures[0]!)]);
  const removed={...moved,structures:[]};equalQueries(removed,cells);
  const packed=structuredClone(moved);packed.packed.push({building:packed.structures[0]!,owner:{type:'ground',x:2,z:2}});packed.structures=[];
  equalQueries(packed,[...cells,{x:2,z:2},{x:3,z:4}]);
  expect(oldReader.shelfAt!(cells[1]!)).toBe(building);
  expect(oldReader.storageAt!(cells[1]!)).toEqual(storageAt(w,cells[1]!));expect(w).toEqual(before);
});

// Reuse the same real bill/proposal fixture as staging-validation-v287. Only
// the local task assignment is prepared; fixture APIs and validations stay real.
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
function equalValidation(w:World):string[]{
  const before=structuredClone(w),raw=validateCooking(w,w.schemaVersion,new Set());
  expect(validateCooking(w,w.schemaVersion,new Set(),true,true,createOwnedValidationGeometry(w))).toEqual(raw);
  expect(validBiofuelProductionTransport(w,w.schemaVersion,true,true,createOwnedValidationGeometry(w)))
    .toBe(validBiofuelProductionTransport(w,w.schemaVersion));
  expect(w).toEqual(before);return raw;
}

test('recipe errors, repeated staging portions, shelf output and live capacities equal RAW',()=>{
  const {w,p,c,station}=preparedTask(),cell=c.ingredients[0]!.cell;
  expect(equalValidation(w)).toEqual([]);
  c.ingredients[1]!.cell={...cell};c.ingredients[4]!.cell={...cell};
  expect(equalValidation(w)).toEqual([]);
  const stagingShelf=shelf(w,'small-shelf',0,cell);w.structures.push(stagingShelf);
  expect(equalValidation(w).filter(e=>e==='Ingredient staging beyond work reach.').length).toBeGreaterThan(0);
  w.structures.pop();expect(equalValidation(w)).toEqual([]);
  const source=w.piles.find(q=>q.id===c.ingredients[0]!.pileId)!;
  if(source.owner.type!=='ground')throw Error('ordinary source fixture');
  const sourceCell={x:source.owner.x,z:source.owner.z},reader=createOwnedValidationGeometry(w);
  const initial=groundCapacity(w,sourceCell,'wood',p.id,reader);
  source.quantity--;
  expect(groundCapacity(w,sourceCell,'wood',p.id,reader)).toBe(initial+1);
  expect(groundCapacity(w,sourceCell,'wood',p.id,reader)).toBe(groundCapacity(w,sourceCell,'wood',p.id));
  expect(equalValidation(w).filter(e=>e==='Invalid ground ingredient reservation.').length).toBeGreaterThan(0);
  source.quantity++;
  const other=w.pawns[1]!;other.haul={sourcePileId:source.id,quantity:2,phase:'pickup',carryPileId:null,
    destination:{type:'aside',...sourceCell}};
  expect(groundCapacity(w,sourceCell,'wood',p.id,reader)).toBe(initial-2);
  expect(groundCapacity(w,sourceCell,'wood',p.id,reader)).toBe(groundCapacity(w,sourceCell,'wood',p.id));
  other.haul=null;
  const outputShelf=shelf(w,'small-shelf',0,{x:22,z:22});w.structures.push(outputShelf);
  const product:MaterialPile={id:w.nextId++,kind:'chemfuel',item:'chemfuel',quantity:35,owner:{type:'pawn',pawnId:p.id}};
  w.piles=[product];Object.assign(c,{phase:'output',ingredients:[],progress:0,productId:product.id,
    storageId:outputShelf.shelf!.cells[0],storageQuantity:35});
  expect(equalValidation(w)).toEqual([]);
  product.quantity=1;c.storageQuantity=35;
  expect(equalValidation(w)).toContain('Invalid cooking output reservation.');
  // The existing advanced-component interruption fixture exercises the
  // componentWorkpiecePlaceFree fallback and its distinct distance-two reach.
  const interrupted=preparedTask(),bench:Structure={id:interrupted.w.nextId++,kind:'fabrication-bench',x:16,z:8,
    orientation:0,footprint:'standard',material:'steel',bills:[]};
  const bill=newCookingBill(interrupted.w.nextId++,'make-advanced-component');bench.bills!.push(bill);interrupted.w.structures.push(bench);
  const spot=cookingSpot(bench),workCell={x:bench.x+1,z:bench.z};
  const piece:MaterialPile={id:interrupted.w.nextId++,item:'unfinished-component',kind:'unfinished',quantity:1,
    owner:{type:'pawn',pawnId:interrupted.p.id},componentWork:{recipe:'make-advanced-component',authorId:interrupted.p.id,
      billId:bill.id,progress:0,parts:[{item:'component',quantity:1},{item:'steel',quantity:20},{item:'plasteel',quantity:10},{item:'gold',quantity:3}]}};
  interrupted.w.piles=[piece];interrupted.p.cooking={recipe:'make-advanced-component',stationId:bench.id,billId:bill.id,
    spot,actionCell:workCell,phase:'interrupted',ingredients:[{pileId:piece.id,item:'unfinished-component',quantity:1,stage:'held',cell:workCell}],
    progress:0,productId:null,storageId:null};
  expect(componentWorkpiecePlaceFree(interrupted.w,workCell,spot,'make-advanced-component',bench,createOwnedValidationGeometry(interrupted.w)))
    .toBe(componentWorkpiecePlaceFree(interrupted.w,workCell,spot,'make-advanced-component',bench));
  expect(equalValidation(interrupted.w)).toEqual([]);
  // Confirm the real station fixture was not detached or silently synthesized.
  expect(station.id).toBe(c.stationId);
});
