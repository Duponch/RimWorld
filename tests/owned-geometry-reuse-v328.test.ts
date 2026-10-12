import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotAdoption,type SnapshotMessage,type SnapshotValidationContext} from '../src/bridge/snapshots.ts';
import {createOwnedValidationGeometryOwner,type OwnedGeometryReuseWitness,type OwnedValidationGeometryReader} from '../src/sim/owned-validation-geometry.ts';
import type {OwnedResourceReuseWitness} from '../src/sim/owned-validation-resources.ts';
import {PowerParentValidationCache} from '../src/sim/power-parent-validation.ts';
import {groundOccupancyAllows,storageOccupancyAllows} from '../src/sim/occupancy.ts';
import {newShelfStorage,shelfAt,storageAt} from '../src/sim/shelf-storage.ts';
import {createStagingValidation} from '../src/sim/staging-validation.ts';
import {ingredientPlaceFree} from '../src/sim/cooking-bills.ts';
import type {Cell,Structure,World} from '../src/sim/types.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';

// Private stable ordinary fixtures only. Witness completeness belongs to the
// closed Decoder producer; exporting this helper grants no public authority.
const clone=<T>(value:T):T=>structuredClone(value);
const outcome=(read:()=>unknown):unknown=>{try{return read();}catch(error){return `${(error as Error).name}: ${(error as Error).message}`;}};
function camp():World {const w=deconstructionCamp(0,16);w.stockpiles=[];w.packed=[];return w;}
function shelf(w:World,x=8,z=8):Structure {
  return {id:w.nextId++,kind:'shelf',x,z,orientation:1,footprint:'standard',material:'wood',
    shelf:newShelfStorage([w.nextId++,w.nextId++])};
}
const witness=(previous:World,updatedOrdinals:readonly number[]):OwnedGeometryReuseWitness=>({kind:'sparse',previous,updatedOrdinals});
const points:Cell[]=[{x:8,z:8},{x:9,z:8},{x:7,z:8},{x:8,z:9},{x:4,z:4},{x:0,z:0}];
function equalQueries(w:World,reader:OwnedValidationGeometryReader,cells:readonly Cell[]=points):void {
  for(const cell of cells){
    expect(outcome(()=>reader.groundAllows(cell))).toEqual(outcome(()=>groundOccupancyAllows(w,cell)));
    expect(outcome(()=>reader.storageAllows!(cell))).toEqual(outcome(()=>storageOccupancyAllows(w,cell)));
    expect(outcome(()=>reader.shelfAt!(cell))).toBe(outcome(()=>shelfAt(w,cell)));
    expect(outcome(()=>reader.storageAt!(cell))).toEqual(outcome(()=>storageAt(w,cell)));
  }
}

test('same-array sparse continuation keeps fresh live inputs and retained old readers',()=>{
  const w=camp(),building=shelf(w);w.structures=[building];
  const owner=createOwnedValidationGeometryOwner(),old=owner.prepare(w);equalQueries(w,old);owner.commit(w);
  const before=clone(w),next={...w,tick:w.tick+1,tiles:clone(w.tiles),jobs:[]};
  expect(next.structures).toBe(w.structures);
  next.tiles[8*next.width+8]!.terrain='water';
  const fresh=owner.prepare(next,witness(w,[]));equalQueries(next,fresh);owner.commit(next);
  expect(fresh.groundAllows({x:8,z:8})).toBe(false);expect(old.groundAllows({x:8,z:8})).toBe(true);
  expect(old.shelfAt!({x:8,z:8})).toBe(building);expect(w).toEqual(before);
});

test('nongeometric sparse updates dereference current shelf, cells and policy rather than old records',()=>{
  const w=camp(),first=shelf(w),second=shelf(w);w.structures=[first,second,first];
  second.id=first.id;second.shelf!.settings.priority=5;
  const owner=createOwnedValidationGeometryOwner(),old=owner.prepare(w);equalQueries(w,old);owner.commit(w);
  const before=clone(w),next=clone(w),replacement=next.structures[0]!;
  replacement.shelf!.cells=[next.nextId++,next.nextId++];replacement.shelf!.settings={...replacement.shelf!.settings,priority:1,capacity:25,filters:{wood:false,food:true}};
  const fresh=owner.prepare(next,witness(w,[0,1,2]));equalQueries(next,fresh);
  expect(fresh.shelfAt!({x:8,z:8})).toBe(replacement);
  expect(fresh.storageAt!({x:8,z:8})).toMatchObject({priority:1,capacity:25,filters:{wood:false,food:true}});
  expect(fresh.storageAt!({x:8,z:8})?.id).not.toBe(old.storageAt!({x:8,z:8})?.id);
  // Removing optional state changes first eligible occurrence, not geometry.
  delete replacement.shelf;
  expect(fresh.shelfAt!({x:8,z:8})).toBe(next.structures[1]);
  expect(fresh.storageAt!({x:8,z:8})?.priority).toBe(5);
  expect(old.shelfAt!({x:8,z:8})).toBe(first);expect(w).toEqual(before);
});

test('geometry or footprint override changes decline stale projection and match literal queries',()=>{
  const changes:Array<(s:Structure)=>void>=[
    s=>{s.x=4;},s=>{s.z=4;},s=>{s.kind='wall';delete s.shelf;},s=>{s.orientation=0;},
    s=>{s.footprint='legacy-single';},s=>{s.id++;},
    s=>{Object.assign(s,{furniture:{kind:'solar-generator'}});},
    s=>{Object.assign(s,{deconstruction:{kind:'solar-generator'}});},
    s=>{Object.assign(s,{flick:{kind:'solar-generator'}});},
    s=>{Object.assign(s,{fixBreakdown:{kind:'solar-generator'}});},
  ];
  for(const change of changes){
    const w=camp();w.structures=[shelf(w)];const owner=createOwnedValidationGeometryOwner(),old=owner.prepare(w);
    equalQueries(w,old);owner.commit(w);const before=clone(w),next=clone(w);change(next.structures[0]!);
    const fresh=owner.prepare(next,witness(w,[0]));equalQueries(next,fresh,[...points,{x:10,z:10},{x:4,z:8},{x:8,z:4}]);
    equalQueries(w,old);expect(w).toEqual(before);
  }
});

test('membership, order, full replacement and wrong parent use the target collection',()=>{
  for(const mode of ['add','remove','order','full','parent','dimensions'] as const){
    const w=camp(),first=shelf(w),second=shelf(w);w.structures=[first,second];
    const owner=createOwnedValidationGeometryOwner(),old=owner.prepare(w);equalQueries(w,old);owner.commit(w);
    const before=clone(w),next=clone(w);let reuse:OwnedGeometryReuseWitness|undefined=witness(w,[0,1]);
    if(mode==='add'){next.structures.unshift({id:next.nextId++,kind:'wall',x:8,z:8,orientation:0,footprint:'standard'});reuse=undefined;}
    if(mode==='remove'){next.structures.shift();reuse=undefined;}
    if(mode==='order'){next.structures.reverse();reuse=undefined;}
    if(mode==='full'){next.structures[0]!.x=4;reuse=undefined;}
    if(mode==='parent'){next.structures[0]!.x=4;reuse=witness(clone(w),[0]);}
    if(mode==='dimensions')next.width++;
    const fresh=owner.prepare(next,reuse);equalQueries(next,fresh);owner.commit(next);
    expect(fresh.shelfAt!({x:8,z:8})).toBe(shelfAt(next,{x:8,z:8}));equalQueries(w,old);expect(w).toEqual(before);
  }
});

test('terrain, schema, stockpiles and job permissions remain live after reused geometry',()=>{
  const w=camp();w.structures=[shelf(w)];const owner=createOwnedValidationGeometryOwner(),old=owner.prepare(w);
  equalQueries(w,old);owner.commit(w);const next:World={...w,tiles:clone(w.tiles),jobs:[]},fresh=owner.prepare(next,witness(w,[]));
  const cell={x:4,z:4};expect(fresh.groundAllows(cell)).toBe(true);
  next.jobs=[{id:next.nextId++,kind:'wall',...cell,orientation:0,footprint:'standard'} as World['jobs'][number]];
  next.schemaVersion=15 as World['schemaVersion'];expect(fresh.groundAllows(cell)).toBe(false);
  next.schemaVersion=21 as World['schemaVersion'];expect(fresh.groundAllows(cell)).toBe(true);
  expect(fresh.storageAllows!(cell)).toBe(false);
  next.jobs=[];expect(fresh.storageAllows!(cell)).toBe(true);
  next.tiles[cell.z*next.width+cell.x]!.terrain='rock';expect(fresh.groundAllows(cell)).toBe(false);
  next.tiles[cell.z*next.width+cell.x]!.terrain='grass';expect(fresh.groundAllows(cell)).toBe(true);
  next.stockpiles=[{id:next.nextId++,...cell,priority:3,capacity:25,filters:{wood:true,food:true}}];
  expect(fresh.storageAt!(cell)).toBe(next.stockpiles[0]);next.stockpiles[0]!.priority=1;
  expect(fresh.storageAt!(cell)?.priority).toBe(1);equalQueries(next,fresh);
});

test('malformed and unusual sparse replacements keep literal first hits, errors and coordinates',()=>{
  const mutations:Array<(w:World)=>void>=[
    w=>{w.structures.push(null as unknown as Structure);},w=>{delete w.structures[1];},
    w=>{w.structures[1]!.x=8.5;},w=>{w.structures[1]!.x=Number.MAX_SAFE_INTEGER;},
    w=>{w.structures[1]!.orientation=9 as Structure['orientation'];},
    w=>{w.structures[1]!.kind='unknown' as Structure['kind'];},
    w=>{w.structures[1]!.footprint='unknown' as Structure['footprint'];},
  ];
  for(const mutate of mutations){
    const w=camp();w.structures=[shelf(w),shelf(w)];const owner=createOwnedValidationGeometryOwner(),old=owner.prepare(w);
    equalQueries(w,old);owner.commit(w);const next=clone(w);mutate(next);
    const fresh=owner.prepare(next,witness(w,[1]));
    equalQueries(next,fresh,[...points,{x:8.5,z:8},{x:NaN,z:8},{x:Infinity,z:8},{x:16,z:0}]);equalQueries(w,old);
  }
});

test('discard, unobserved and mismatched commits do not publish pending geometry',()=>{
  const w=camp();w.structures=[shelf(w)];const owner=createOwnedValidationGeometryOwner(),old=owner.prepare(w);
  equalQueries(w,old);owner.commit(w);const before=clone(w),rejected=clone(w);rejected.structures[0]!.x=4;
  equalQueries(rejected,owner.prepare(rejected,witness(w,[0])));owner.discard();
  const recovery=clone(w);equalQueries(recovery,owner.prepare(recovery,witness(w,[0])));owner.commit(recovery);
  const unobserved=clone(recovery);owner.prepare(unobserved,witness(recovery,[0]));owner.commit(unobserved);
  const after=clone(unobserved);after.structures[0]!.z=4;equalQueries(after,owner.prepare(after,witness(unobserved,[0])));
  owner.commit(clone(after));const final=clone(after);final.structures[0]!.x=2;
  equalQueries(final,owner.prepare(final,witness(after,[0])));equalQueries(w,old);expect(w).toEqual(before);
});

test('cold prepare/commit do not discover structures before a historical query',()=>{
  const w=camp(),owner=createOwnedValidationGeometryOwner();let reads=0;
  // This accessor observes cold laziness only; it is never a reuse witness.
  Object.defineProperty(w,'structures',{get(){reads++;throw Error('cold structures');}});
  const reader=owner.prepare(w);owner.commit(w);expect(reads).toBe(0);
  expect(reader.groundAllows({x:-1,z:0})).toBe(false);expect(reads).toBe(0);
  expect(()=>reader.shelfAt!({x:8,z:8})).toThrow('cold structures');
});

test('generic mutable RAW preserves fresh shelf reads and accessor observations',()=>{
  const w=camp(),building=shelf(w),cell={x:8,z:8},spot={x:8,z:9},raw=createStagingValidation(w);
  expect(raw.shelfAt).toBeUndefined();expect(raw.storageAt).toBeUndefined();w.structures=[building];
  expect(ingredientPlaceFree(w,cell,spot,'make-component',undefined,raw)).toBe(false);
  w.structures=[];expect(ingredientPlaceFree(w,cell,spot,'make-component',undefined,raw)).toBe(true);
  let reads=0;Object.defineProperty(w,'structures',{get(){reads++;return reads%2?[building]:[];}});
  expect(shelfAt(w,cell)).toBe(building);expect(shelfAt(w,cell)).toBeUndefined();expect(reads).toBe(2);
  const mutable=camp(),structures=[building],generic=createStagingValidation(mutable);let calls=0;
  Object.defineProperty(structures,'find',{value(predicate:(s:Structure)=>unknown){
    calls++;const result=Array.prototype.find.call(structures,predicate);structures.length=0;return result;
  }});
  mutable.structures=structures;
  expect(ingredientPlaceFree(mutable,cell,spot,'make-component',undefined,generic)).toBe(false);
  expect(ingredientPlaceFree(mutable,cell,spot,'make-component',undefined,generic)).toBe(true);
  expect(calls).toBe(2);
});

// Differential lifecycle fixture, not a proof that arbitrary subclasses are
// native owners. ROOT additionally inspects/tests the real literal MAIN path.
class QueryDecoder extends SnapshotDecoder {
  readonly owner=createOwnedValidationGeometryOwner();
  readonly contexts:Array<{world:World;reader:OwnedValidationGeometryReader;reuse?:OwnedGeometryReuseWitness}>=[];
  throwAfterPrepare=false;
  override adopt(packet:SnapshotMessage<true>):SnapshotAdoption {
    this.owner.discard();try{const result=super.adopt(packet);if(result.status==='applied')this.owner.commit(result.world);else this.owner.discard();return result;}
    catch(error){this.owner.discard();throw error;}
  }
  protected override createValidationContext(next:World,_resources?:OwnedResourceReuseWitness,reuse?:OwnedGeometryReuseWitness):SnapshotValidationContext {
    const reader=this.owner.prepare(next,reuse);reader.groundAllows({x:4,z:4});
    this.contexts.push({world:next,reader,reuse});if(this.throwAfterPrepare)throw Error('after geometry prepare');
    return {powerParents:new PowerParentValidationCache(),geometry:reader,resourceFacts:reader.resourceFacts};
  }
}
function decoderPair(){
  const raw=new SnapshotDecoder(),query=new QueryDecoder();
  return {raw,query,read(packet:SnapshotMessage<true>){const actual=query.adopt(clone(packet));expect(actual).toEqual(raw.adopt(clone(packet)));return actual;}};
}
const latest=(query:QueryDecoder)=>query.contexts.at(-1)!;

test('Decoder certificates bind sparse slots, while reorder/membership/checkpoints stay full',()=>{
  const w=camp();fixtureBuilding(w,'wall',4,4);const chair:Structure=fixtureBuilding(w,'dining-chair',7,4);
  const encoder=new SnapshotEncoder({structureDelta:true}),p=decoderPair();
  const initial=p.read(encoder.encode(w,0,0));expect(initial.status).toBe('applied');
  const old=latest(p.query),before=clone(old.world);expect(old.reuse).toBeUndefined();
  expect(p.read(encoder.encode(w,0,0)).status).toBe('applied');expect(latest(p.query).reuse?.updatedOrdinals).toEqual([]);
  expect(latest(p.query).world.structures).toBe(old.world.structures);
  chair.gatherSpot=true;expect(p.read(encoder.encode(w,0,0)).status).toBe('applied');expect(latest(p.query).reuse?.updatedOrdinals).toEqual([1]);
  expect(latest(p.query).world.structures[1]).not.toBe(old.world.structures[1]);
  w.structures.reverse();expect(p.read(encoder.encode(w,0,0)).status).toBe('applied');expect(latest(p.query).reuse).toBeUndefined();
  fixtureBuilding(w,'wall',10,10);expect(p.read(encoder.encode(w,0,0)).status).toBe('applied');expect(latest(p.query).reuse).toBeUndefined();
  w.structures.pop();expect(p.read(encoder.encode(w,0,0)).status).toBe('applied');expect(latest(p.query).reuse).toBeUndefined();
  expect(p.read(encoder.encode(w,0,0,true)).status).toBe('applied');expect(latest(p.query).reuse).toBeUndefined();
  equalQueries(old.world,old.reader,[{x:4,z:4},{x:7,z:4}]);expect(old.world).toEqual(before);
});

test('Decoder stale, early/late resync and prepared throw recover from the last confirmed World',()=>{
  const w=camp();fixtureBuilding(w,'wall',4,4);const chair:Structure=fixtureBuilding(w,'dining-chair',7,4);
  const encoder=new SnapshotEncoder({structureDelta:true}),p=decoderPair();expect(p.read(encoder.encode(w,0,0)).status).toBe('applied');
  const old=latest(p.query),before=clone(old.world);chair.gatherSpot=true;const good=clone(encoder.encode(w,0,0));
  if(good.kind!=='delta')throw Error('sparse delta required');
  const early=clone(good);early.baseRevision++;const count=p.query.contexts.length;
  expect(p.read(early).status).toBe('resync');expect(p.query.contexts).toHaveLength(count);
  const late=clone(good);late.world.growingZones=[{id:w.structures[0]!.id,plant:'rice',cells:[0],allowSow:true,allowCut:true}];
  // The strict cross-owner namespace is prospective: an ordinary growing-zone
  // collision alone does not activate it. An empty real relationship registry
  // activates the late identity guard without adding an invalid early shape.
  late.world.relationships={links:[]};
  expect(p.read(late)).toEqual({status:'resync',reason:'Identité dupliquée ou invalide dans le registre relationnel.'});
  expect(p.query.contexts.length).toBeGreaterThan(count);
  p.query.throwAfterPrepare=true;expect(()=>p.query.adopt(clone(good))).toThrow('after geometry prepare');p.query.throwAfterPrepare=false;
  expect(p.read(good).status).toBe('applied');expect(latest(p.query).reuse?.previous).toBe(old.world);
  const after=p.query.contexts.length;expect(p.read(good).status).toBe('stale');expect(p.query.contexts).toHaveLength(after);
  equalQueries(old.world,old.reader,[{x:4,z:4},{x:7,z:4}]);expect(old.world).toEqual(before);
});

test('Decoder mutable public callbacks retain their historical reconstruction without a geometry owner',()=>{
  const w=camp();fixtureBuilding(w,'wall',4,4);const encoder=new SnapshotEncoder({structureDelta:true}),raw=new SnapshotDecoder();
  const first=raw.adopt(clone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('checkpoint');
  first.world.structures[0]!.x=2;expect(groundOccupancyAllows(first.world,{x:4,z:4})).toBe(true);
  const second=raw.adopt(clone(encoder.encode(w,0,0)));expect(second.status).toBe('applied');if(second.status!=='applied')throw Error('delta');
  expect(second.world.structures[0]!.x).toBe(2);expect(groundOccupancyAllows(second.world,{x:2,z:4})).toBe(false);
});
