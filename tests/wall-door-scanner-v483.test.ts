import {expect,test} from 'vitest';
import {validWallDoorHistoricalTransport296,validWallDoorJob296,validWallDoorResidentNamespace296} from '../src/sim/wall-door-save-296';
import type {Job,World} from '../src/sim/types';

const historical=(value:unknown)=>validWallDoorHistoricalTransport296(value,296);
const resident=(value:unknown)=>validWallDoorResidentNamespace296(value as World);
const nullRecord=(data:Record<string,unknown>={})=>Object.assign(Object.create(null) as Record<string,unknown>,data);

/** Declared small scanner input, not a played or fully valid campaign save.
 * Only the reserved successor and the inexpensive owner lanes are at issue. */
function namespaceFixture(){
  const job:Job={id:1,kind:'deconstruct',x:0,z:0,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,
    deconstruction:{structureId:2,kind:'wall',material:'wood'},escrow:{wood:0,food:0},
    wallDoor296:{manual:false,plan:{revision:1,id:11,kind:'door',material:'steel'}}};
  const world={schemaVersion:296,nextId:12,jobs:[job],pawns:[],structures:[{id:2,kind:'wall'}],piles:[],resources:[{id:3,kind:'tree'}]};
  return {world,job,planId:11};
}

test('recognized non-enumerable owner lanes are refused instead of disappearing from the scan',()=>{
  const {world}=namespaceFixture();Object.defineProperty(world.resources[0]!,'items',{value:[],enumerable:false});
  expect(historical(world)).toBe(false);expect(resident(world)).toBe(false);
});

test('a recognized lane getter is refused without evaluating the accessor',()=>{
  const {world}=namespaceFixture();let reads=0;
  Object.defineProperty(world.resources[0]!,'items',{enumerable:true,get(){reads++;throw Error('recognized getter');}});
  expect(historical(world)).toBe(false);expect(resident(world)).toBe(false);expect(reads).toBe(0);
});

test('inherited recognized pollution is refreshed per call, while own shadows and null-prototype records remain literal',()=>{
  const previous=Object.getOwnPropertyDescriptor(Object.prototype,'groups'),before=historical({}),observed:boolean[]=[];let reads=0;
  try{
    Object.defineProperty(Object.prototype,'groups',{configurable:true,enumerable:false,get(){reads++;throw Error('inherited recognized getter');}});
    // Keep assertions outside the pollution window: framework formatting must
    // not become a reader of the deliberately poisoned prototype.
    observed.push(historical({}));
    observed.push(historical({groups:null,resources:[nullRecord()]}));
    observed.push(historical(nullRecord({resources:[nullRecord()]})));
    const job=nullRecord({id:1,wallDoor296:nullRecord({plan:nullRecord({id:11})})});
    observed.push(resident({jobs:[job]}));
    observed.push(resident({groups:null,jobs:[job]}));
    observed.push(resident(nullRecord({jobs:[job]})));
  }finally{
    if(previous)Object.defineProperty(Object.prototype,'groups',previous);else Reflect.deleteProperty(Object.prototype,'groups');
  }
  expect(before).toBe(true);expect(observed).toEqual([false,true,true,false,true,true]);expect(reads).toBe(0);
  expect(historical({})).toBe(true);expect(resident(namespaceFixture().world)).toBe(true);
});

test('dense arrays in recognized historical lanes remain accepted',()=>{
  expect(historical({resources:[null,nullRecord(),{items:[null]}]})).toBe(true);
});

test('a historical array hole cannot hide a missing owner record',()=>{
  const resources:unknown[]=[null,null];delete resources[0];
  expect(historical({resources})).toBe(false);
});

test('a historical array index accessor is rejected without calling it',()=>{
  let reads=0;const resources:unknown[]=[null];
  Object.defineProperty(resources,'0',{enumerable:true,get(){reads++;throw Error('array index getter');}});
  expect(historical({resources})).toBe(false);expect(reads).toBe(0);
});

test('extra string and symbol array properties are refused even when the indexed elements are dense',()=>{
  const named:unknown[]=[null],symbolic:unknown[]=[null];let reads=0;
  Object.defineProperty(named,'opaqueExtension',{value:1,enumerable:true});
  Object.defineProperty(symbolic,Symbol('opaque extension'),{enumerable:true,get(){reads++;throw Error('array symbol getter');}});
  expect(historical({resources:named})).toBe(false);expect(historical({resources:symbolic})).toBe(false);expect(reads).toBe(0);
});

test('recognized owner cycles are rejected by both historical and resident admission',()=>{
  const {world}=namespaceFixture();const resource=world.resources[0]! as Record<string,unknown>;
  resource.items=world.resources;
  expect(historical(world)).toBe(false);expect(resident(world)).toBe(false);
});

test('a shared acyclic owner record may be visited through distinct recognized branches',()=>{
  const {world}=namespaceFixture(),shared=nullRecord({id:3});
  Object.assign(world,{resources:[shared,shared],worldPawns:{owners:[{actor:shared}]}});
  expect(historical(world)).toBe(true);expect(resident(world)).toBe(true);
});

test('unknown fields stay opaque, including an unknown getter that would otherwise expose illegal future state',()=>{
  const {world}=namespaceFixture();let reads=0;
  Object.defineProperty(world.resources[0]!,'opaqueExtension',{enumerable:true,get(){reads++;return {wallDoor296:{manual:false}};}});
  expect(historical(world)).toBe(true);expect(resident(world)).toBe(true);expect(reads).toBe(0);
});

test('symbol extensions on a non-Job owner remain opaque without evaluating their values',()=>{
  const {world}=namespaceFixture();let reads=0;
  Object.defineProperty(world.resources[0]!,Symbol('future owner'),{enumerable:true,get(){reads++;throw Error('symbol owner getter');}});
  expect(historical(world)).toBe(true);expect(resident(world)).toBe(true);expect(reads).toBe(0);
});

test('the same symbol extension on a prospective Job remains forbidden by its strict record shape',()=>{
  const {world,job}=namespaceFixture();Object.defineProperty(job,Symbol('Job extension'),{value:1,enumerable:true});
  expect(validWallDoorJob296(job,296)).toBe(false);expect(historical(world)).toBe(false);
});

test('an illegal future field nested under a resource is found through its actual recognized owner lane',()=>{
  const {world}=namespaceFixture();Object.assign(world.resources[0]!,{items:[{wallDoor296:{manual:true}}]});
  expect(historical(world)).toBe(false);
});

test('a resource identity cannot reuse a reserved future plan identity',()=>{
  const {world,planId}=namespaceFixture();world.resources[0]!.id=planId;
  expect(resident(world)).toBe(false);
});

test('the original actor inside a WorldPawn owner participates in the reserved successor namespace',()=>{
  const {world,planId}=namespaceFixture();Object.assign(world,{worldPawns:{owners:[{actor:{id:planId}}]}});
  expect(resident(world)).toBe(false);
});

test('a WorldPawn owner-lane accessor cannot run while resolving the successor namespace',()=>{
  const {world}=namespaceFixture();let reads=0;const owners={};
  Object.defineProperty(owners,'owners',{enumerable:true,get(){reads++;throw Error('WorldPawn owners getter');}});
  Object.assign(world,{worldPawns:owners});
  expect(historical(world)).toBe(false);expect(resident(world)).toBe(false);expect(reads).toBe(0);
});

test('the historical visit budget still counts repeated acyclic branches instead of memoizing their first acceptance',()=>{
  const lanes=['world','summary','dynamic','campaign','worldMaps','worldGroups','worldPawns','worldFactions','campaignMap','secondarySite','map','maps','sites','entries','groups','group','state','groupLosses','pending261','battlefield261'];
  const leaf=nullRecord();
  const repeated=(size:number)=>{const rows=Array.from({length:size},()=>leaf);return Object.fromEntries(lanes.map(lane=>[lane,rows]));};
  // One root plus twenty arrays and their repeated leaves: the two inputs
  // straddle the existing two-million-visit ceiling without a huge object tree.
  expect(historical(repeated(99_998))).toBe(true);
  expect(historical(repeated(100_000))).toBe(false);
},15_000);
