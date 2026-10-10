import {expect,test} from 'vitest';
import {createOwnedValidationResourceOwner,type OwnedResourceReuseWitness} from '../src/sim/owned-validation-resources.ts';
import type {Resource,World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

// Private, stable ordinary data fixtures. The exported query helper does not
// establish native ownership or validate the Decoder's sequence certificate.
const resource=(id:number,fields:Partial<Resource>={}):Resource=>({id,kind:'rock',x:2,z:2,amount:1,...fields});
function fixture():World {const w=deconstructionCamp(0,16);w.resources=[resource(w.nextId++),resource(w.nextId++,{kind:'rice',growth:.5,growthTick:0,growthLight:'dark'})];return w;}
const witness=(previous:World,next:World):OwnedResourceReuseWitness=>({previous,kind:'sparse',updated:next.resources.map((r,afterOrdinal)=>({id:r.id,afterOrdinal}))});

test('same tuples share facts while plant callbacks read the new leaves and retained readers stay bound',()=>{
  const w=fixture(),owner=createOwnedValidationResourceOwner(),old=owner.prepare(w),ids=old.ids(w),namespace=old.namespace(w);
  expect(old.records(w)).toBe(true);owner.commit(w);const oldCopy=structuredClone(w);
  const next=structuredClone(w);next.tick=1;next.resources[1]!.growth=.6;next.resources[1]!.growthTick=1;
  const fresh=owner.prepare(next,witness(w,next));
  expect(fresh.ids(next)).toBe(ids);expect(fresh.namespace(next)).toBe(namespace);
  const seen:Resource[]=[];expect(fresh.hasInvalid(next,new Set(),r=>{seen.push(r);return r.growthTick!>next.tick;})).toBe(false);
  expect(seen).toEqual([next.resources[1]]);expect(seen[0]).not.toBe(w.resources[1]);
  expect(fresh.records(w)).toBeUndefined();expect(old.ids(next)).toBeUndefined();owner.commit(next);
  expect(old.hasResource({x:2,z:2})).toBe(true);expect(old.namespace(w)).toBe(namespace);expect(w).toEqual(oldCopy);
});

test('shared spatial facts retain duplicate occurrences and historical hydro linear aliases',()=>{
  const w=fixture();w.resources=[resource(w.nextId++,{x:0,z:1}),resource(w.nextId++,{x:0,z:1}),resource(w.nextId++,{x:16,z:0}),resource(w.nextId++,{kind:'rice',x:0,z:1})];
  const owner=createOwnedValidationResourceOwner(),old=owner.prepare(w),ids=old.ids(w);owner.commit(w);
  const next=structuredClone(w),fresh=owner.prepare(next,witness(w,next)),linked=new Map([[16,true]]);
  expect(fresh.ids(next)).toBe(ids);expect(fresh.hydroOverlapCount(linked)).toBe(3);
  expect(fresh.hasResource({x:0,z:1})).toBe(true);expect(fresh.hasResource({x:16,z:0})).toBe(true);
  expect(fresh.hasResource({x:0,z:0})).toBe(false);expect(old.hydroOverlapCount(linked)).toBe(3);
});

test('real tuple or candidate changes create new facts, including own undefined blight and signed zero',()=>{
  const mutations:Array<(r:Resource)=>void>=[r=>{r.x=3;},r=>{r.z=3;},r=>{r.kind='tree';},r=>{r.id++;},
    r=>{r.growthLight='dark';},r=>{r.blight=undefined;},r=>{r.x=-0;}];
  for(const mutate of mutations){
    const w=fixture();w.resources[0]!.x=0;const owner=createOwnedValidationResourceOwner(),old=owner.prepare(w),ids=old.ids(w);owner.commit(w);
    const next=structuredClone(w);mutate(next.resources[0]!);const fresh=owner.prepare(next,witness(w,next));
    expect(fresh.ids(next)).not.toBe(ids);expect(old.ids(w)).toBe(ids);
    if(Object.hasOwn(next.resources[0]!,'blight')){const seen:number[]=[];fresh.hasInvalid(next,new Set(),r=>{seen.push(r.id);return false;});expect(seen[0]).toBe(next.resources[0]!.id);}
  }
});

test('full, wrong parent, dimensions, membership and atypical slots never borrow the confirmed index',()=>{
  for(const mode of ['full','parent','dimensions','membership','hole','string'] as const){
    const w=fixture(),owner=createOwnedValidationResourceOwner(),old=owner.prepare(w),ids=old.ids(w);owner.commit(w);
    const next=structuredClone(w);let reuse:OwnedResourceReuseWitness|undefined=witness(w,next);
    if(mode==='full')reuse=undefined;
    if(mode==='parent')reuse={...reuse!,previous:structuredClone(w)};
    if(mode==='dimensions')next.width++;
    if(mode==='membership')next.resources.push(resource(next.nextId++));
    if(mode==='hole')delete next.resources[0];
    if(mode==='string')next.resources[0]!.x='0' as unknown as number;
    const fresh=owner.prepare(next,reuse);expect(fresh.ids(next)).not.toBe(ids);
    if(mode==='hole'||mode==='string')expect(fresh.records(next)).toBeUndefined();
    expect(old.ids(w)).toBe(ids);
  }
});

test('collision order, callback throws and discard preserve the last confirmed projection',()=>{
  const w=fixture(),owner=createOwnedValidationResourceOwner(),old=owner.prepare(w),ids=old.ids(w);owner.commit(w);
  const next=structuredClone(w),fresh=owner.prepare(next,witness(w,next)),foreign=new Set([next.resources[1]!.id]),seen:number[]=[];
  expect(()=>fresh.hasInvalid(next,foreign,r=>{seen.push(r.id);throw Error('first plant predicate');})).toThrow('first plant predicate');
  expect(seen).toEqual([next.resources[0]!.id]);owner.discard();
  const recovery=structuredClone(w),recovered=owner.prepare(recovery,witness(w,recovery));expect(recovered.ids(recovery)).toBe(ids);
  expect(recovered.hasInvalid(recovery,new Set([recovery.resources[0]!.id]),()=>{throw Error('must short circuit');})).toBe(true);
  owner.commit(recovery);expect(old.ids(w)).toBe(ids);
});

test('prepare and unobserved commit stay lazy, and a mismatched commit cannot confirm pending facts',()=>{
  // Observation of cold construction only: this getter fixture never supplies
  // a sparse witness and is not admitted to the native stable-World domain.
  const w=fixture(),source=w.resources,owner=createOwnedValidationResourceOwner();let reads=0;
  Object.defineProperty(w,'resources',{get(){reads++;return source;}});
  owner.prepare(w);owner.commit(w);expect(reads).toBe(0);
  const next=fixture(),pending=owner.prepare(next),ids=pending.ids(next);owner.commit(fixture());
  const after=structuredClone(next),fresh=owner.prepare(after,witness(next,after));
  expect(fresh.ids(after)).not.toBe(ids);expect(reads).toBe(0);
});
