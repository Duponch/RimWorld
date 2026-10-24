import {expect,test} from 'vitest';
import {TerrainJournalSnapshotEncoder} from '../src/bridge/terrain-journal-encoder.ts';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {readSnapshotStructureChanges} from '../src/bridge/snapshot-changes.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';

type Packet=SnapshotMessage<true>;
function harness(empty=false){
 const world=deconstructionCamp();
 if(!empty){fixtureBuilding(world,'wall',4,4);fixtureBuilding(world,'wall',5,4);fixtureBuilding(world,'dining-chair',7,4);}
 const encoder=new TerrainJournalSnapshotEncoder(),resident=new ResidentPresentationAssembler(),strict=new SnapshotDecoder();
 const packet=(checkpoint=false)=>structuredClone(encoder.encode(world,0,0,checkpoint));
 const accept=(p:Packet)=>{
  const expected=strict.adopt(structuredClone(p)),actual=resident.adopt(structuredClone(p));
  expect(expected.status,JSON.stringify(expected)).toBe('applied');
  expect(actual.status,JSON.stringify(actual)).toBe('applied');
  if(expected.status!=='applied'||actual.status!=='applied')throw Error('Actual admission failed');
  expect(actual.world).toStrictEqual(expected.world);
  return actual.world;
 };
 const send=(checkpoint=false)=>accept(packet(checkpoint));
 return {world,encoder,resident,strict,packet,accept,send};
}
function sparse(p:Packet){
 expect(p.kind).toBe('delta');
 expect(Object.hasOwn(p.world,'structures')).toBe(false);
 if(p.kind!=='delta'||!p.structures)throw Error('Expected actual Worker sparse structures');
 return p.structures;
}

test('actual Worker uses sparse deltas below1000 and retains complete checkpoints',()=>{
 const h=harness(),first=h.packet();
 expect(first.kind).toBe('checkpoint');expect(first.world.structures).toHaveLength(3);h.accept(first);
 const next=h.packet();expect(sparse(next)).toEqual({removed:[],upserted:[]});h.accept(next);
 const checkpoint=h.packet(true);expect(checkpoint.kind).toBe('checkpoint');
 expect(checkpoint.world.structures).toHaveLength(3);expect(Object.hasOwn(checkpoint,'structures')).toBe(false);h.accept(checkpoint);
});

test('unchanged Worker structures retain identities and provide an exact empty journal',()=>{
 const h=harness(),before=h.send(),saved=structuredClone(before),next=h.send();
 expect(next.structures).toBe(before.structures);
 expect(readSnapshotStructureChanges(before,next)).toEqual({structureIndices:[],tileIndices:[]});
 expect(before).toStrictEqual(saved);
});

test('same-tick field changes, insertion, removal and reorder preserve values and journal fallbacks',()=>{
 const h=harness(),first=h.send(),saved=structuredClone(first);
 h.world.structures[0]!.damage=1;const mutation=h.packet();
 expect(sparse(mutation).upserted.map(row=>row.id)).toEqual([h.world.structures[0]!.id]);
 const second=h.accept(mutation);expect(readSnapshotStructureChanges(first,second)).toEqual({structureIndices:[0],tileIndices:[]});
 expect(second.structures[1]).toBe(first.structures[1]);
 const added=fixtureBuilding(h.world,'wall',8,4),addition=h.packet();
 expect(sparse(addition).upserted.map(row=>row.id)).toEqual([added.id]);const third=h.accept(addition);
 const removed=h.world.structures.splice(1,1)[0]!,removal=h.packet();
 expect(sparse(removal).removed).toEqual([removed.id]);const fourth=h.accept(removal);
 h.world.structures.reverse();const reorder=h.packet();expect(sparse(reorder).order).toEqual(h.world.structures.map(row=>row.id));
 const fifth=h.accept(reorder);expect(readSnapshotStructureChanges(fourth,fifth)).toBeUndefined();
 expect(third.structures).toHaveLength(4);expect(first).toStrictEqual(saved);
});

test('late refusal leaves retained state and journal intact, then exact packet retry succeeds',()=>{
 const h=harness(),before=h.send(),saved=structuredClone(before);
 h.world.structures[0]!.damage=1;const good=h.packet();
 expect(h.resident.adopt(structuredClone(good),()=>false).status).toBe('resync');
 expect(before).toStrictEqual(saved);
 expect(readSnapshotStructureChanges(before,before)).toEqual({structureIndices:[],tileIndices:[]});
 const after=h.accept(good);expect(readSnapshotStructureChanges(before,after)).toEqual({structureIndices:[0],tileIndices:[]});
 const checkpoint=h.send(true);expect(readSnapshotStructureChanges(after,checkpoint)).toBeUndefined();
});

test('zero structures still use a legal sparse delta; public default encoder retains literal form',()=>{
 const h=harness(true);h.send();const delta=h.packet();
 expect(sparse(delta)).toEqual({removed:[],upserted:[]});expect(h.accept(delta).structures).toEqual([]);
 const publicEncoder=new SnapshotEncoder();publicEncoder.encode(h.world,0,0);
 const literal=publicEncoder.encode(h.world,0,0);
 expect(literal.kind).toBe('delta');expect(Object.hasOwn(literal.world,'structures')).toBe(true);
 expect(Object.hasOwn(literal,'structures')).toBe(false);
});
