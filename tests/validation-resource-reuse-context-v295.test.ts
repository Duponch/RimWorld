import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotAdoption,type SnapshotMessage,type SnapshotValidationContext} from '../src/bridge/snapshots.ts';
import {createOwnedValidationResourceOwner,type OwnedResourceReuseWitness,type OwnedValidationResourceReader} from '../src/sim/owned-validation-resources.ts';
import {createOwnedValidationGeometry} from '../src/sim/owned-validation-geometry.ts';
import {PowerParentValidationCache} from '../src/sim/power-parent-validation.ts';
import type {World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

// Emulates the closed MAIN lifecycle on private fixture data; this subclass
// and its protected hook grant no authority to arbitrary public callers.
class QueryDecoder extends SnapshotDecoder {
  readonly owner=createOwnedValidationResourceOwner();
  readonly contexts:Array<{world:World;facts:OwnedValidationResourceReader;reuse?:OwnedResourceReuseWitness}>=[];
  override adopt(packet:SnapshotMessage<true>):SnapshotAdoption {
    this.owner.discard();try {const result=super.adopt(packet);if(result.status==='applied')this.owner.commit(result.world);else this.owner.discard();return result;}
    catch(error){this.owner.discard();throw error;}
  }
  protected override createValidationContext(next:World,reuse?:OwnedResourceReuseWitness):SnapshotValidationContext {
    const geometry=createOwnedValidationGeometry(next,this.owner.prepare(next,reuse));
    this.contexts.push({world:next,facts:geometry.resourceFacts,reuse});
    return {powerParents:new PowerParentValidationCache(),geometry,resourceFacts:geometry.resourceFacts};
  }
}
function fixture():World {
  const w=deconstructionCamp(0,16);w.resources=[{id:w.nextId++,kind:'rice',x:2,z:2,amount:6,growth:.5,growthTick:0,growthLight:'dark'}];return w;
}
const clone=<T>(value:T):T=>structuredClone(value);
function pair(){const raw=new SnapshotDecoder(),query=new QueryDecoder();return {raw,query,read(packet:SnapshotMessage<true>){const actual=query.adopt(clone(packet));expect(actual).toEqual(raw.adopt(clone(packet)));return actual;}};}
const current=(query:QueryDecoder)=>query.contexts.at(-1)!;
const facts=(query:QueryDecoder)=>{const context=current(query);return context.facts.ids(context.world);};

test('growth-only and inherited sparse packets reuse facts and retain exact old Worlds',()=>{
  const w=fixture(),encoder=new SnapshotEncoder(),p=pair(),initial=p.read(clone(encoder.encode(w,0,6)));
  expect(initial.status).toBe('applied');const held=clone(initial),old=current(p.query),ids=facts(p.query);
  w.tick=1;w.resources[0]!.growth=.6;w.resources[0]!.growthTick=1;
  const changed=p.read(clone(encoder.encode(w,0,6)));expect(changed.status).toBe('applied');
  expect(current(p.query).reuse?.updated).toEqual([{id:w.resources[0]!.id,afterOrdinal:0}]);expect(facts(p.query)).toBe(ids);
  expect(p.read(clone(encoder.encode(w,0,6))).status).toBe('applied');expect(current(p.query).reuse?.updated).toEqual([]);expect(facts(p.query)).toBe(ids);
  expect(old.facts.ids(old.world)).toBe(ids);expect(initial).toEqual(held);
});

test('fresh clocks and owner identities are revalidated despite projection reuse, then recover atomically',()=>{
  const w=fixture(),encoder=new SnapshotEncoder(),p=pair();expect(p.read(clone(encoder.encode(w,0,6))).status).toBe('applied');
  w.tick=1;w.resources[0]!.growthTick=1;expect(p.read(clone(encoder.encode(w,0,6))).status).toBe('applied');const ids=facts(p.query),held=current(p.query),before=clone(held.world);
  const packet=clone(encoder.encode(w,0,6));if(packet.kind!=='delta')throw Error('inherited delta fixture');
  const bad=clone(packet);bad.world.tick=0;
  expect(p.read(bad)).toEqual({status:'resync',reason:'État végétal ou identité commerciale invalide.'});expect(facts(p.query)).toBe(ids);
  expect(p.read(packet).status).toBe('applied');expect(facts(p.query)).toBe(ids);expect(held.world).toEqual(before);
  const collision=clone(encoder.encode(w,0,6));if(collision.kind!=='delta')throw Error('collision delta fixture');
  collision.world.growingZones=[{id:w.resources[0]!.id,plant:'rice',cells:[0],allowSow:true,allowCut:true}];collision.world.relationships={links:[]};
  expect(p.read(collision)).toEqual({status:'resync',reason:'Identité dupliquée ou invalide dans le registre relationnel.'});
  const clean=clone(collision);clean.world.growingZones=[];delete clean.world.relationships;
  expect(p.read(clean).status).toBe('applied');expect(facts(p.query)).toBe(ids);expect(held.world).toEqual(before);
});

test('real tuple changes, remaps and checkpoints capture fresh indexes; skipped sequence never prepares',()=>{
  const w=fixture(),encoder=new SnapshotEncoder(),p=pair();expect(p.read(clone(encoder.encode(w,0,6))).status).toBe('applied');let ids=facts(p.query);
  w.resources[0]!.x=3;expect(p.read(clone(encoder.encode(w,0,6))).status).toBe('applied');expect(facts(p.query)).not.toBe(ids);ids=facts(p.query);
  w.resources.push({id:w.nextId++,kind:'rock',x:4,z:4,amount:1});expect(p.read(clone(encoder.encode(w,0,6))).status).toBe('applied');expect(current(p.query).reuse).toBeUndefined();expect(facts(p.query)).not.toBe(ids);ids=facts(p.query);
  const next=clone(encoder.encode(w,0,6));if(next.kind!=='delta')throw Error('sequence delta fixture');
  const skipped=clone(next);skipped.baseRevision++;const count=p.query.contexts.length;
  expect(p.read(skipped).status).toBe('resync');expect(p.query.contexts).toHaveLength(count);expect(p.read(next).status).toBe('applied');expect(facts(p.query)).toBe(ids);
  const full=clone(new SnapshotEncoder().encode(w,0,6));full.epoch=next.epoch+1;
  expect(p.read(full).status).toBe('applied');expect(current(p.query).reuse).toBeUndefined();expect(facts(p.query)).not.toBe(ids);
});

test('invalid growth and throw do not publish a pending projection or corrupt subsequent reuse',()=>{
  const w=fixture(),encoder=new SnapshotEncoder(),p=pair();expect(p.read(clone(encoder.encode(w,0,6))).status).toBe('applied');const ids=facts(p.query),old=current(p.query),before=clone(old.world);
  w.tick=1;w.resources[0]!.growth=.6;w.resources[0]!.growthTick=1;const packet=clone(encoder.encode(w,0,6));
  if(packet.kind!=='delta'||!packet.resources?.growth)throw Error('growth fixture');
  const bad=clone(packet);bad.resources!.growth![2]=2;expect(p.read(bad)).toEqual({status:'resync',reason:'Delta de croissance invalide.'});
  const hostile=clone(packet);Object.defineProperty(hostile.world,'schemaVersion',{get(){throw Error('metadata read');}});
  expect(()=>p.query.adopt(hostile)).toThrow('metadata read');expect(()=>p.raw.adopt(hostile)).toThrow('metadata read');
  expect(p.read(packet).status).toBe('applied');expect(facts(p.query)).toBe(ids);expect(old.world).toEqual(before);expect(old.facts.ids(old.world)).toBe(ids);
});
