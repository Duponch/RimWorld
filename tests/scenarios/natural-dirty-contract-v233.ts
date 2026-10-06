import {expect} from 'vitest';
import {readSnapshotResourceStructure} from '../../src/bridge/snapshot-changes';
import type {NaturalPresentationChange} from '../../src/render/NaturalResourcePresentation';
import {floraSize,isResidentCrop} from '../../src/render/flora-presentation';
import {harvestable} from '../../src/sim/plants';
import {plantLeafless} from '../../src/sim/plant-life';
import type {Resource,World} from '../../src/sim/types';

// Future destination: tests/scenarios/natural-dirty-contract-v233.ts.
// This test oracle owns prior numerical shapes, never candidate internals or
// prior Resource values. Ordinal shifts alone do not change a resource shape.
type Shape=Pick<Resource,'id'|'kind'|'x'|'z'|'stone'|'species'>&{
  size:number;ripe:boolean;leafless:boolean;
};
const capture=(world:World,r:Resource):Shape=>({id:r.id,kind:r.kind,x:r.x,z:r.z,
  stone:r.stone,species:r.species,size:floraSize(world,r),
  ripe:r.kind==='berries'&&harvestable(world,r),leafless:plantLeafless(world,r)});
// These are the original shape-change comparisons. Numerical change detection
// uses === (including its historical -0 behavior); issued values are exact.
const equal=(a:Shape,b:Shape):boolean=>a.id===b.id&&a.kind===b.kind&&a.x===b.x&&a.z===b.z
  &&a.stone===b.stone&&a.species===b.species&&a.size===b.size&&a.ripe===b.ripe&&a.leafless===b.leafless;

export class NaturalDirtyContractOracle {
  private previousWorld:World|undefined;
  private previousImmutable=false;
  private shapes=new Map<number,Shape>();

  assert(world:World,reset:boolean,immutable:boolean,
    actual:ReadonlyMap<number,NaturalPresentationChange>,historical:ReadonlyMap<number,NaturalPresentationChange>):void {
    const resources=new Map<number,Resource>(),next=new Map<number,Shape>();
    for(const resource of world.resources){
      if(isResidentCrop(resource))continue;
      expect(resources.has(resource.id),`duplicate natural ID ${resource.id} in query fixture`).toBe(false);
      resources.set(resource.id,resource);next.set(resource.id,capture(world,resource));
    }
    // This is a test-input provenance gate, never a production ownership claim.
    // An unknown, reversed, checkpointed, expired or foreign edge keeps the full
    // historical oracle. Mutable and same-object queries do so unconditionally.
    const structural=!reset&&immutable&&this.previousImmutable&&this.previousWorld!==undefined
      &&this.previousWorld!==world&&readSnapshotResourceStructure(this.previousWorld,world)!==undefined;
    if(!structural)expect([...actual]).toStrictEqual([...historical]);

    // Every issued entry must retain its exact historical value, Resource
    // reference and insertion order. A smaller count alone cannot satisfy this.
    const entries=[...historical];let cursor=0;
    for(const [id,change]of actual){
      while(cursor<entries.length&&entries[cursor]![0]!==id)cursor++;
      expect(cursor,`issued ID ${id} is absent or out of historical order`).toBeLessThan(entries.length);
      const reference=entries[cursor++]![1];
      expect(change).toStrictEqual(reference);
      expect(change.resource,`issued ID ${id} borrows a historical Resource`).toBe(reference.resource);
      const current=resources.get(id);
      expect(change.resource,`issued ID ${id} must point at the current natural Resource`).toBe(current);
      expect(Object.is(change.size,current?next.get(id)!.size:0),`issued size for ID ${id} differs from original query`).toBe(true);
    }

    // Independently require all real births, numerical/identity changes and
    // removals (including natural -> resident crop). These owned captures do
    // not use the reference Map's possibly redundant ordinal dirtiness.
    for(const [id,shape]of next){
      const before=this.shapes.get(id);
      if(reset||!before||!equal(before,shape)){
        expect(actual.has(id),`missing necessary current natural change ${id}`).toBe(true);
        const change=actual.get(id)!;
        expect(change.resource).toBe(resources.get(id));
        expect(Object.is(change.size,shape.size)).toBe(true);
      }
    }
    // Reset rebuilds the consumers from scratch; old IDs need no removal upload.
    if(!reset)for(const id of this.shapes.keys())if(!next.has(id)){
      expect(actual.has(id),`missing necessary natural removal/classification ${id}`).toBe(true);
      expect(actual.get(id)).toStrictEqual({resource:undefined,size:0});
    }
    this.shapes=next;this.previousWorld=world;this.previousImmutable=immutable;
  }
}
