import { expect,test } from 'vitest';
import { SnapshotEncoder,SnapshotDecoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import type { Structure,World } from '../src/sim/types.ts';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';

function camp(count:number):World {
  const world=deconstructionCamp();
  for(let index=0;index<count;index++)fixtureBuilding(world,'wall',3+index,3);
  return world;
}
function isSparse(packet:SnapshotMessage<true>):boolean {
  expect(packet.kind).toBe('delta');
  return Object.hasOwn(packet,'structures');
}
function receiver(decoder:SnapshotDecoder,world:World) {
  const frames:Array<{actual:World;expected:World}>=[];
  return (packet:SnapshotMessage<true>):World=>{
    const result=decoder.adopt(structuredClone(packet));
    expect(result.status).toBe('applied');if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(world);expect(JSON.stringify(result.world)).toBe(JSON.stringify(world));
    for(const old of frames)expect(old.actual).toStrictEqual(old.expected);
    frames.push({actual:result.world,expected:structuredClone(result.world)});
    return result.world;
  };
}

test('membership crossing a structure threshold never switches the selected form until a full checkpoint',()=>{
  const world=camp(2),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:3});
  const send=receiver(new SnapshotDecoder(),world);
  const publish=(checkpoint=false)=>{const packet=encoder.encode(world,0,0,checkpoint);send(packet);return packet;};
  expect(publish().kind).toBe('checkpoint');expect(isSparse(publish())).toBe(false);
  const added:Structure=fixtureBuilding(world,'wall',5,5);
  const stillFull=publish();expect(isSparse(stillFull)).toBe(false);
  expect(Object.hasOwn(stillFull.world,'structures')).toBe(true);
  expect(publish(true).kind).toBe('checkpoint');
  const selectedSparse=publish();expect(isSparse(selectedSparse)).toBe(true);
  expect(Object.hasOwn(selectedSparse.world,'structures')).toBe(false);
  world.structures.splice(world.structures.findIndex(s=>s.id===added.id),1);
  const stillSparse=publish();expect(isSparse(stillSparse)).toBe(true);
  if(stillSparse.kind==='delta')expect(stillSparse.structures?.removed).toEqual([added.id]);
  expect(publish(true).kind).toBe('checkpoint');expect(isSparse(publish())).toBe(false);
  expect(world.tick).toBe(0);
});

test('map replacements reselect the threshold at the new epoch and same-tick edits keep the selected source',()=>{
  const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:3}),decoder=new SnapshotDecoder();
  let epoch=0;
  for(const count of [3,2,4,1]){
    const world=camp(count),send=receiver(decoder,world);
    const checkpoint=encoder.encode(world,0,0);expect(checkpoint.kind).toBe('checkpoint');
    expect(checkpoint.epoch).toBe(++epoch);send(checkpoint);
    const first=encoder.encode(world,0,0);expect(isSparse(first)).toBe(count>=3);send(first);
    // An in-place value edit at identical tick needs a full or sparse value
    // update according to the selected source; the threshold does not re-run.
    world.structures[0]!.damage=1;
    const edited=encoder.encode(world,0,0);expect(isSparse(edited)).toBe(count>=3);send(edited);
    if(edited.kind==='delta'&&edited.structures)expect(edited.structures.upserted).toHaveLength(1);
    expect(world.tick).toBe(0);
  }
});

test('opt-in without a threshold remains zero, DEFAULT stays complete, and construction options are captured by value',()=>{
  const empty=camp(0),defaultEncoder=new SnapshotEncoder(),enabled=new SnapshotEncoder({structureDelta:true});
  const explicitZero=new SnapshotEncoder({structureDelta:true,minimumStructures:0});
  for(let index=0;index<2;index++){
    const full=defaultEncoder.encode(empty,0,0),implicit=enabled.encode(empty,0,0),explicit=explicitZero.encode(empty,0,0);
    expect(implicit).toStrictEqual(explicit);
    if(index===1){expect(isSparse(full)).toBe(false);expect(isSparse(implicit)).toBe(true);}
  }
  const options={structureDelta:true,minimumStructures:3},captured=new SnapshotEncoder(options);
  options.minimumStructures=0;options.structureDelta=false;
  const world=camp(2);captured.encode(world,0,0);
  expect(isSparse(captured.encode(world,0,0))).toBe(false);
  fixtureBuilding(world,'wall',5,5);captured.encode(world,0,0,true);
  expect(isSparse(captured.encode(world,0,0))).toBe(true);
  for(const minimumStructures of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])
    expect(()=>new SnapshotEncoder({structureDelta:true,minimumStructures})).toThrow(RangeError);
});
