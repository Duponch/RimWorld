import {afterEach,expect,test,vi} from 'vitest';
import {SnapshotEncoder} from '../src/bridge/snapshots';
import {PresentationSnapshotDecoder} from '../src/bridge/presentation-decoder';
import {createWorld} from '../src/sim/engine';
import type {World} from '../src/sim/types';
import {createClosedMainMapIntentReader} from '../src/render/closed-main-map-intents';

afterEach(()=>vi.restoreAllMocks());

function transport(){
  const source=createWorld(426,16,16),encoder=new SnapshotEncoder(),decoder=new PresentationSnapshotDecoder();
  const packet=()=>structuredClone(encoder.encode(source,0,1));
  const send=()=>{const result=decoder.adopt(packet());expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Real presentation admission failed');return result.world;};
  return {source,decoder,packet,send};
}

test('the real admitted World is captured once, and an old queue lookup cannot replace the latest fields',()=>{
  const t=transport(),reader=createClosedMainMapIntentReader(),first=t.send();
  const initial=reader.admit!(first),signature=reader.read(first);
  t.source.home=[18];const next=t.send(),latest=reader.admit!(next);
  expect(next.tick).toBe(first.tick);expect(latest).not.toBe(initial);expect(latest.home).toEqual([18]);
  // Install a value-preserving read tripwire only after genuine admission.
  // It measures cache lookup, not admission of a getter-bearing public World.
  const descriptor=Object.getOwnPropertyDescriptor(first,'jobs')!,jobs=first.jobs,reads=vi.fn(()=>jobs);
  Object.defineProperty(first,'jobs',{configurable:true,enumerable:true,get:reads});
  try{
    const stringify=vi.spyOn(JSON,'stringify');
    expect(reader.read(first)).toBe(signature);expect(reader.admit!(next)).toBe(latest);
    expect(reader.read(first)).toBe(signature);expect(reader.admit!(next).home).toEqual([18]);
    expect(reads).not.toHaveBeenCalled();expect(stringify).not.toHaveBeenCalled();
  }finally{Object.defineProperty(first,'jobs',descriptor);}
});

test('same-tick snow, allowed-area removal, growing permissions and confirmed routes each update their own fields',()=>{
  // These are prepared data-only renderer fixtures, not complete save fixtures.
  const world=createWorld(426,16,16),reader=createClosedMainMapIntentReader();
  world.growingZones=[{id:world.nextId++,cells:[18,19],plant:'rice',allowSow:true,allowCut:true}];
  world.allowedAreas=[{id:world.nextId++,label:'A',color:0x123456,cells:[20]}];
  let current=world,fields=reader.admit!(current);
  const changes:Array<(next:World)=>void>=[
    next=>{next.snowClearArea=[21];},
    next=>{delete next.allowedAreas;},
    next=>{next.growingZones[0]!.allowSow=false;},
    next=>{next.growingZones[0]!.allowCut=false;},
    next=>{const pawn=next.pawns[0]!;pawn.state='moving';pawn.motion=null;pawn.path=[{x:pawn.x+1,z:pawn.z}];},
  ];
  for(const [index,change] of changes.entries()){
    const next=structuredClone(current);change(next);const before=structuredClone(next),previous=fields;
    fields=reader.admit!(next);expect(next.tick).toBe(world.tick);expect(fields).not.toBe(previous);
    if(index===0){expect(fields.snowClearArea).toEqual([21]);expect(fields.jobs).toBe(previous.jobs);}
    if(index===1)expect(fields.allowedAreas).toBeUndefined();
    if(index===2)expect(fields.growingZones[0]!.allowSow).toBe(false);
    if(index===3)expect(fields.growingZones[0]!.allowCut).toBe(false);
    if(index===4)expect(fields.routes).toMatchObject([{pawnId:next.pawns[0]!.id,cells:next.pawns[0]!.path}]);
    expect(next).toEqual(before);current=next;
  }
});

test('a rejected real packet cannot publish intentions; a strict retry and reset can',()=>{
  const t=transport(),reader=createClosedMainMapIntentReader(),first=t.send(),initial=reader.admit!(first);
  t.source.home=[18,19];const packet=t.packet();
  const refused=t.decoder.adopt(packet,()=>false);expect(refused.status).toBe('resync');
  // The closed caller invokes admit only in the applied branch.
  if(refused.status==='applied')reader.admit!(refused.world);
  expect(reader.admit!(first)).toBe(initial);
  const retry=t.decoder.adopt(packet);expect(retry.status).toBe('applied');if(retry.status!=='applied')throw Error('Exact retry refused');
  const latest=reader.admit!(retry.world);expect(latest.home).toEqual([18,19]);
  reader.clear();const replacement=reader.admit!(retry.world);
  expect(replacement).not.toBe(latest);expect(replacement.home).toEqual([18,19]);
});

test('reading a mutable public World does not implicitly admit it into the identity cache',()=>{
  const world=createWorld(426,16,16),reader=createClosedMainMapIntentReader(),first=reader.read(world),home=world.home;
  world.home=[...(home??[]),world.width*world.height-1];expect(reader.read(world)).not.toBe(first);
  world.home=home;expect(reader.read(world)).toBe(first);
});
