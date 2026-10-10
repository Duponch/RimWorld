import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,readSnapshotChanges,type SnapshotMessage,type SnapshotValidationContext} from '../src/bridge/snapshots.ts';
import {createOwnedValidationGeometry} from '../src/sim/owned-validation-geometry.ts';
import {PowerParentValidationCache} from '../src/sim/power-parent-validation.ts';
import type {Resource,World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {mechanoidCombatCamp} from './scenarios/mechanoid-combat-v213.ts';

// Compare the public RAW path with the same one-adoption query context used
// by MAIN. This fixture itself grants no native authority to public Worlds.
class QueryDecoder extends SnapshotDecoder {
  protected override createValidationContext(next:World):SnapshotValidationContext {
    const geometry=createOwnedValidationGeometry(next);
    return {powerParents:new PowerParentValidationCache(),geometry,resourceFacts:geometry.resourceFacts};
  }
}
const relational='Identité dupliquée ou invalide dans le registre relationnel.';
const resource=(id:number):Resource=>({id,kind:'rock',x:2,z:2,amount:1});
function fixture(strict=true):World {
  const w=deconstructionCamp(1,16);w.stockpiles=[];w.growingZones=[];
  w.resources=[resource(w.nextId++)];w.mechanoids=[];
  if(strict)w.relationships={links:[]};else delete w.relationships;
  return w;
}
type Checkpoint=Extract<SnapshotMessage,{kind:'checkpoint'}>;
function checkpoint(w:World):Checkpoint {
  const packet=structuredClone(new SnapshotEncoder().encode(w,0,6));
  if(packet.kind!=='checkpoint')throw Error('checkpoint fixture');return packet;
}
const raw=(value:object):Record<string,unknown>=>value as unknown as Record<string,unknown>;
const outcome=(read:()=>unknown):unknown=>{try{return read();}catch(e){return `${(e as Error).name}: ${(e as Error).message}`;}};
function zone(packet:Checkpoint,id:unknown):void {
  packet.world.growingZones.push({id:1,plant:'rice',cells:[0],allowSow:true,allowCut:true});
  raw(packet.world.growingZones.at(-1)!).id=id;
}

test('strict Resource frontier and suffix preserve first motif, rejected revision and retained views',()=>{
  const mutations:Array<(p:Checkpoint)=>void>=[
    p=>{p.world.resources[0]!.id=p.world.pawns[0]!.id;},
    p=>{p.world.resources.push(structuredClone(p.world.resources[0]!));},
    p=>{p.world.nextId=p.world.resources[0]!.id;},
    p=>{zone(p,p.world.resources[0]!.id);},
    p=>{p.world.resources.push(structuredClone(p.world.resources[0]!));raw(p.world.relationships!).unexpected=true;},
  ];
  for(const mutate of mutations){
    const initial=checkpoint(fixture()),before=structuredClone(initial),a=new SnapshotDecoder(),b=new QueryDecoder();
    const heldA=a.adopt(structuredClone(initial)),heldB=b.adopt(structuredClone(initial));
    expect(heldA.status).toBe('applied');expect(heldB).toEqual(heldA);const heldCopy=structuredClone(heldB);
    const bad=structuredClone(initial);bad.revision++;mutate(bad);const badCopy=structuredClone(bad);
    const refusal=b.adopt(bad);expect(refusal).toEqual(a.adopt(structuredClone(bad)));
    expect(refusal).toEqual({status:'resync',reason:relational});
    expect(bad).toEqual(badCopy);expect(heldB).toEqual(heldCopy);
    const recovery={...structuredClone(initial),revision:bad.revision};
    const recovered=b.adopt(structuredClone(recovery));expect(recovered).toEqual(a.adopt(structuredClone(recovery)));expect(recovered.status).toBe('applied');
    const stale=structuredClone(bad);stale.world.schemaVersion=.5 as World['schemaVersion'];
    expect(b.adopt(stale)).toEqual({status:'stale'});expect(a.adopt(structuredClone(stale))).toEqual({status:'stale'});
    expect(heldB).toEqual(heldCopy);expect(initial).toEqual(before);
    if(heldB.status==='applied'&&heldA.status==='applied')
      expect(readSnapshotChanges(heldB.world,heldB.world)).toEqual(readSnapshotChanges(heldA.world,heldA.world));
  }
});

test('RAW and non-strict query keep historical permissive owner IDs until strict context is enabled',()=>{
  // Parser compatibility only, matching the old non-strict growing-zone IDs.
  // These deliberately hostile records are not asserted to be valid saves.
  for(const id of ['3',undefined,{legacyOwner:true},NaN,-0]){
    const clean=checkpoint(fixture(false)),packet=structuredClone(clean);zone(packet,id);zone(packet,id);
    const a=new SnapshotDecoder(),b=new QueryDecoder(),packetCopy=structuredClone(packet);
    const heldA=a.adopt(structuredClone(packet)),heldB=b.adopt(structuredClone(packet));
    expect(heldA.status).toBe('applied');expect(heldB).toEqual(heldA);const heldCopy=structuredClone(heldB);
    const strict=structuredClone(packet);strict.revision++;strict.world.relationships={links:[]};
    const refusal=b.adopt(structuredClone(strict));expect(refusal).toEqual(a.adopt(structuredClone(strict)));
    expect(refusal).toEqual({status:'resync',reason:relational});
    const recovery={...structuredClone(clean),revision:strict.revision};
    expect(b.adopt(structuredClone(recovery))).toEqual(a.adopt(structuredClone(recovery)));
    expect(heldB).toEqual(heldCopy);expect(packet).toEqual(packetCopy);
  }
});

test('resource replacement and refused next epoch never reuse a preceding identity witness',()=>{
  const w=fixture(),encoder=new SnapshotEncoder(),a=new SnapshotDecoder(),b=new QueryDecoder();
  const initial=structuredClone(encoder.encode(w,0,6)),held=b.adopt(structuredClone(initial));
  expect(held).toEqual(a.adopt(structuredClone(initial)));expect(held.status).toBe('applied');const heldCopy=structuredClone(held);
  w.resources.push(resource(w.nextId++));
  const changed=structuredClone(encoder.encode(w,0,6)),accepted=b.adopt(structuredClone(changed));
  expect(accepted).toEqual(a.adopt(structuredClone(changed)));expect(accepted.status).toBe('applied');
  const replacement=checkpoint(structuredClone(w));replacement.epoch=changed.epoch+1;
  const rejected=structuredClone(replacement);zone(rejected,w.resources.at(-1)!.id);
  const refusal=b.adopt(structuredClone(rejected));expect(refusal).toEqual(a.adopt(structuredClone(rejected)));
  expect(refusal).toEqual({status:'resync',reason:relational});
  const recovered=b.adopt(structuredClone(replacement));expect(recovered).toEqual(a.adopt(structuredClone(replacement)));expect(recovered.status).toBe('applied');
  expect(held).toEqual(heldCopy);
});

test('atypical Resource records keep RAW/query errors or throws identical',()=>{
  const good=checkpoint(fixture()),hole=[resource(good.world.resources[0]!.id)];hole.length=2;
  for(const resources of [hole,[null],[{...good.world.resources[0]!,id:'3'}],[{...good.world.resources[0]!,x:'2'}]]){
    const packet=structuredClone(good);packet.world.resources=resources as unknown as Resource[];
    expect(outcome(()=>new QueryDecoder().adopt(structuredClone(packet))))
      .toEqual(outcome(()=>new SnapshotDecoder().adopt(structuredClone(packet))));
  }
});

test('QueryDecoder active mechanical group consumes the real union iterator',()=>{
  // Existing one-actor prepared staging camp, with its real first engine tick.
  // No raid evolution or combat is claimed by this parser test.
  const {w}=mechanoidCombatCamp();w.relationships={links:[]};
  expect(w.raids?.mechActive?.phase).toBe('staging');
  const encoder=new SnapshotEncoder(),a=new SnapshotDecoder(),b=new QueryDecoder();
  const initial=structuredClone(encoder.encode(w,0,6)),held=b.adopt(structuredClone(initial));
  expect(held).toEqual(a.adopt(structuredClone(initial)));expect(held.status).toBe('applied');
  const before=structuredClone(held),next=structuredClone(encoder.encode(w,0,6));
  const second=b.adopt(structuredClone(next));expect(second).toEqual(a.adopt(structuredClone(next)));
  expect(second.status).toBe('applied');expect(held).toEqual(before);
});
