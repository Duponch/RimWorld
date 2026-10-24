import {expect,test} from 'vitest';
import {SceneLightTopology} from '../src/render/SceneLightTopology.ts';
import {RoomTopologyCache,type RoomTopology} from '../src/sim/room-topology.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {readSnapshotStructureChanges} from '../src/bridge/snapshot-changes.ts';
import type {Structure,World} from '../src/sim/types.ts';
import {fixture,harness} from './resident-presentation-fixtures-v427.ts';

/** Prepared transport/physics fixtures, not paid construction or engine play.
 * Uses the actual fixed-Worker candidate mode (minimumStructures0) so the
 * changed barrier is observed through a sparse journal at stable membership. */
function camp(kind:Structure['kind']){
 const w=fixture();w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.jobs=[];
 const s:Structure={id:w.nextId++,kind,x:7,z:7,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
 w.structures=[s];return {...harness(w),s};
}
const facts=(topology:RoomTopology)=>Array.from({length:topology.width*topology.height},(_,i)=>topology.at(i%topology.width,Math.floor(i/topology.width)));
function compare(reader:SceneLightTopology,w:World){
 const got=reader.read(w),oracle=new RoomTopologyCache().read(w);expect(facts(got)).toEqual(facts(oracle));return got;
}

for(const kind of ['ship-reactor','ship-beam','ship-engine','geothermal-generator','electric-crematorium'] as const){
 test(`${kind}: stable-count sparse move, all four footprints and removal agree with the exhaustive topology`,()=>{
  const h=camp(kind),reader=new SceneLightTopology(),a=h.send(),original=compare(reader,a),held=facts(original);
  const assertSolid=(v:World,t:RoomTopology)=>{for(const c of footprintCells(v.structures[0]!))expect(t.at(c.x,c.z)?.kind,`${kind} occupied ${c.x},${c.z}`).toBe('solid');};
  assertSolid(a,original);let previous=a,last=original;
  for(const orientation of [1,2,3,0] as const){
   h.s.orientation=orientation;const next=h.send();expect(readSnapshotStructureChanges(previous,next)).toEqual({structureIndices:[0],tileIndices:[]});
   last=compare(reader,next);assertSolid(next,last);expect(facts(original)).toEqual(held);previous=next;
  }
  h.s.x+=2;const moved=h.send();expect(moved.structures).toHaveLength(a.structures.length);expect(readSnapshotStructureChanges(previous,moved)).toEqual({structureIndices:[0],tileIndices:[]});
  const movedTopology=compare(reader,moved);assertSolid(moved,movedTopology);expect(movedTopology).not.toBe(last);expect(facts(original)).toEqual(held);
  // Same identity/count, new non-barrier kind: catches the omitted classifier
  // as well as the old footprint cells, without relying on a membership reset.
  h.world.structures[0]={id:h.s.id,kind:'dining-chair',x:h.s.x,z:h.s.z,orientation:0,footprint:'standard',material:'wood'};
  const removed=h.send();expect(readSnapshotStructureChanges(moved,removed)).toEqual({structureIndices:[0],tileIndices:[]});
  const clear=compare(reader,removed);for(const c of footprintCells(moved.structures[0]!))expect(clear.at(c.x,c.z)?.kind).toBe('space');
  expect(facts(original)).toEqual(held);
 });
}

test('stable-ID conversion into a hull barrier invalidates the previously empty sparse topology',()=>{
 const h=camp('dining-chair'),reader=new SceneLightTopology(),a=h.send(),before=compare(reader,a),held=facts(before);
 h.world.structures[0]={...h.s,kind:'ship-beam'};const b=h.send();expect(readSnapshotStructureChanges(a,b)).toEqual({structureIndices:[0],tileIndices:[]});
 const after=compare(reader,b);expect(after).not.toBe(before);for(const c of footprintCells(b.structures[0]!))expect(after.at(c.x,c.z)?.kind).toBe('solid');
 expect(facts(before)).toEqual(held);
});

test('door opening preserves a doorway, while barrier kind changes and overlap order remain exact',()=>{
 const h=camp('door');delete h.s.power;h.s.material='wood';h.s.door=newDoorState(h.world.tick);
 const wall:Structure={id:h.world.nextId++,kind:'wall',x:h.s.x,z:h.s.z,orientation:0,footprint:'standard',material:'wood'};
 h.world.structures.unshift(wall);const reader=new SceneLightTopology(),a=h.send(),door=compare(reader,a);expect(door.at(h.s.x,h.s.z)?.kind).toBe('doorway');
 h.s.door.open=true;const b=h.send();expect(compare(reader,b)).toBe(door);
 h.world.structures.reverse();const c=h.send(),solid=compare(reader,c);expect(solid.at(h.s.x,h.s.z)?.kind).toBe('solid');expect(door.at(h.s.x,h.s.z)?.kind).toBe('doorway');
 h.world.structures[0]={id:h.s.id,kind:'vent',x:h.s.x+1,z:h.s.z,orientation:0,footprint:'standard',material:'steel'};
 const d=h.send(),vent=compare(reader,d);expect(vent.at(h.s.x+1,h.s.z)?.kind).toBe('solid');
});

test('a geothermal orientation-only edit retains the same full-volume topology',()=>{
 const h=camp('geothermal-generator'),reader=new SceneLightTopology(),a=h.send(),before=compare(reader,a);
 h.s.orientation=1;const b=h.send();expect(readSnapshotStructureChanges(a,b)).toEqual({structureIndices:[0],tileIndices:[]});expect(compare(reader,b)).toBe(before);
});
