import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand,createWorld } from '../src/sim/index.ts';
import type { Structure,World } from '../src/sim/types.ts';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';
import { campTurret,miniTurretCamp } from './scenarios/mini-turret-v212.ts';

type SparsePacket=SnapshotMessage<true>;
function applied(decoder:SnapshotDecoder,packet:SparsePacket):World {
  const result=decoder.adopt(packet);
  expect(result.status).toBe('applied');
  if(result.status!=='applied')throw Error(JSON.stringify(result));
  return result.world;
}
function sparse(packet:SparsePacket) {
  if(packet.kind!=='delta'||!packet.structures)throw Error('Explicit structure delta expected');
  return packet;
}

test('optional structure transport matches complete packets at the same tick without changing older frames',()=>{
  const world=deconstructionCamp(),fire:Structure=fixtureBuilding(world,'campfire',4,4);
  const chair:Structure=fixtureBuilding(world,'dining-chair',7,4);
  expect(applyCommand(world,{type:'bill-add',structureId:fire.id,recipe:'simple-meal'}).ok).toBe(true);
  const fullEncoder=new SnapshotEncoder(),sparseEncoder=new SnapshotEncoder({structureDelta:true});
  const fullDecoder=new SnapshotDecoder(),sparseDecoder=new SnapshotDecoder();
  const frames:Array<{world:World;value:World}>=[];
  let last:World|undefined;
  const send=(checkpoint=false)=>{
    const full=structuredClone(fullEncoder.encode(world,0,0,checkpoint));
    const packet=structuredClone(sparseEncoder.encode(world,0,0,checkpoint));
    const decoded=applied(sparseDecoder,packet);
    expect(decoded).toStrictEqual(applied(fullDecoder,full));expect(decoded).toStrictEqual(world);
    expect(JSON.stringify(decoded)).toBe(JSON.stringify(world));
    for(const old of frames)expect(old.world).toStrictEqual(old.value);
    frames.push({world:decoded,value:structuredClone(decoded)});last=decoded;
    return packet;
  };
  send();
  const unchanged=send();expect(sparse(unchanged).structures).toEqual({removed:[],upserted:[]});
  expect(frames[0]!.world.structures).toBe(last!.structures);
  fire.fuel!.ticks-=1;fire.fuel!.burned+=1;
  fire.bills![0]!.radius=18;fire.bills![0]!.filters.rice=false;chair.orientation=2;
  const changed=sparse(send());expect(changed.structures!.upserted.map(s=>s.id)).toEqual([fire.id,chair.id]);
  delete fire.bills![0]!.filters.rice;delete chair.quality;send();
  world.structures.reverse();expect(sparse(send()).structures!.order).toEqual(world.structures.map(s=>s.id));
  world.structures.splice(world.structures.findIndex(s=>s.id===chair.id),1);
  const wall=fixtureBuilding(world,'wall',12,4);const membership=sparse(send());
  expect(membership.structures!.removed).toEqual([chair.id]);expect(membership.structures!.upserted.map(s=>s.id)).toEqual([wall.id]);
  send(true);expect(sparse(send()).structures).toEqual({removed:[],upserted:[]});
  expect(world.tick).toBe(0);
});

test('complete and sparse packets can alternate; mutable source and returned packets never witness the encoder cache',()=>{
  const world=deconstructionCamp(),chair:Structure=fixtureBuilding(world,'dining-chair',4,4);
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const before=applied(decoder,structuredClone(encoder.encode(world,0,0))),saved=structuredClone(before);
  chair.gatherSpot=true;
  const raw=sparse(encoder.encode(world,0,0)),good=structuredClone(raw);
  raw.structures!.upserted[0]!.orientation=3;chair.gatherSpot=false;
  expect(good.structures!.upserted[0]!.gatherSpot).toBe(true);
  applied(decoder,good);
  const edited=sparse(structuredClone(encoder.encode(world,0,0)));
  expect(edited.structures!.upserted[0]!.gatherSpot).toBe(false);
  // The historical full delta form remains valid on this exact revision.
  const {structures:_patch,...header}=edited;
  const complete:SparsePacket={...header,world:{...edited.world,structures:structuredClone(world.structures)}};
  expect(applied(decoder,complete)).toStrictEqual(world);
  delete chair.gatherSpot;
  const removed=sparse(structuredClone(encoder.encode(world,0,0)));
  expect(Object.hasOwn(removed.structures!.upserted[0]!,'gatherSpot')).toBe(false);
  applied(decoder,removed);
  Object.assign(chair,{gatherSpot:undefined});
  const ownUndefined=sparse(structuredClone(encoder.encode(world,0,0)));
  expect(Object.hasOwn(ownUndefined.structures!.upserted[0]!,'gatherSpot')).toBe(true);
  expect(ownUndefined.structures!.upserted[0]!.gatherSpot).toBeUndefined();
  // Own undefined is an encoding oracle, not permission to save that state.
  expect(before).toStrictEqual(saved);
});

test('malformed patches, wrong baselines and mixed forms reject atomically, while stale retains precedence',()=>{
  const world=deconstructionCamp(),a:Structure=fixtureBuilding(world,'wall',4,4),b=fixtureBuilding(world,'wall',5,4);
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const before=applied(decoder,structuredClone(encoder.encode(world,0,0))),saved=structuredClone(before);
  a.damage=1;
  const good=sparse(structuredClone(encoder.encode(world,0,0)));
  const corruptions:Array<(packet:ReturnType<typeof sparse>)=>void>=[
    p=>{p.baseRevision++;},p=>{p.epoch++;},p=>{p.world.width++;},
    p=>{Object.assign(p.world,{structures:structuredClone(world.structures)});},
    p=>{delete (p as {structures?:unknown}).structures;},
    p=>{Object.assign(p,{structures:undefined});},
    p=>{p.structures!.upserted.push(structuredClone(p.structures!.upserted[0]!));},
    p=>{p.structures!.removed.push(a.id);},
    p=>{p.structures!.removed.push(b.id,b.id);},
    p=>{p.structures!.removed.push(world.nextId);},
    p=>{p.structures!.order=[a.id,a.id];},
    p=>{p.structures!.order=[a.id];},
    p=>{p.structures!.order=[a.id,world.nextId];},
    p=>{Object.assign(p.structures!,{order:undefined});},
    p=>{Object.assign(p.structures!,{growth:[]});},
    p=>{p.structures!.upserted[0]!.id=0;},
    p=>{p.structures!.upserted[0]!.orientation=9 as never;},
    p=>{p.structures!.upserted[0]!.kind='future-building' as never;},
    p=>{p.structures!.upserted.length=2;},
  ];
  for(const corrupt of corruptions){const bad=structuredClone(good);corrupt(bad);expect(decoder.adopt(bad).status).toBe('resync');expect(before).toStrictEqual(saved);}
  expect(applied(decoder,good)).toStrictEqual(world);
  const stale=structuredClone(good);(stale.world as {schemaVersion:number}).schemaVersion=999;
  stale.structures!.removed=[-1];expect(decoder.adopt(stale)).toEqual({status:'stale'});
  const replacement=createWorld(42,16,16),newEpoch=structuredClone(encoder.encode(replacement,0,0));
  expect(newEpoch.kind).toBe('checkpoint');expect(applied(decoder,newEpoch)).toStrictEqual(replacement);
});

test('reconstructed structures retain turret/business and complete shared-namespace guards before final commit',()=>{
  const world=miniTurretCamp(),turret=campTurret(world);
  expect(applyCommand(world,{type:'planet-adopt'}).ok).toBe(true);
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const before=applied(decoder,structuredClone(encoder.encode(world,0,0))),saved=structuredClone(before);
  expect(applyCommand(world,{type:'turret-hold-fire',structureId:turret.id,enabled:true}).ok).toBe(true);
  const good=sparse(structuredClone(encoder.encode(world,0,0)));
  const badAmmo=structuredClone(good);badAmmo.structures!.upserted.find(s=>s.id===turret.id)!.turret!.ammoQ=241;
  expect(decoder.adopt(badAmmo).status).toBe('resync');
  const badNamespace=structuredClone(good);
  const collision:Structure={id:world.pawns[0]!.id,kind:'wall',x:2,z:2,orientation:0,footprint:'standard'};
  badNamespace.structures!.upserted.push(collision);
  expect(decoder.adopt(badNamespace).status).toBe('resync');
  const latePlanet=structuredClone(good);latePlanet.world.planet!.tiles[0]!.rainfall+=1;
  expect(decoder.adopt(latePlanet).status).toBe('resync');
  expect(before).toStrictEqual(saved);
  expect(applied(decoder,good)).toStrictEqual(world);
  const after=sparse(structuredClone(encoder.encode(world,0,0)));
  expect(after.structures).toEqual({removed:[],upserted:[]});
  const wrongUnchangedTurret=structuredClone(after);wrongUnchangedTurret.world.nextId=turret.id;
  expect(decoder.adopt(wrongUnchangedTurret).status).toBe('resync');
  expect(applied(decoder,after)).toStrictEqual(world);
});
