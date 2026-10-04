import { expect,test } from 'vitest';
import { withoutMiningSkill } from './scenarios/legacy-skills.ts';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { ensureFireState } from '../src/sim/fire-rules.ts';
import { applyPlantFrost } from '../src/sim/plant-life.ts';
import { damageResource } from '../src/sim/thing-damage.ts';
import type { Resource,World } from '../src/sim/types.ts';
import { climaticHealrootCamp,cultivatedHealroot,healrootCamp } from './helpers/healroot-domestic-v195.ts';

const packet=(encoder:SnapshotEncoder,w:World):SnapshotMessage=>structuredClone(encoder.encode(w,0,1));
function patchPlant(message:SnapshotMessage,source:Resource,mutate:(p:Resource)=>void):void {
  if(message.kind==='checkpoint')mutate(message.world.resources.find(p=>p.id===source.id)!);
  else {const resource=structuredClone(source);mutate(resource);message.resources={removed:[],upserted:[resource]};}
}

test('181 rejects future resource, growing policy and zero-count loss on checkpoints and same-tick deltas without adopting a revision',()=>{
  const w=withoutMiningSkill(healrootCamp());ensureFireState(w);(w as {schemaVersion:number}).schemaVersion=181;
  const rice:Resource={id:w.nextId++,kind:'rice',amount:6,x:5,z:4,growth:.3,growthTick:w.tick};w.resources=[rice];
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=packet(encoder,w),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw Error('Historical neutral checkpoint');
  const retained=structuredClone(first.world),delta=packet(encoder,w);
  const changes:Array<(m:SnapshotMessage)=>void>=[
    m=>patchPlant(m,rice,p=>{p.kind='healroot';p.amount=1;}),
    m=>patchPlant(m,rice,p=>{p.kind='healroot';p.amount=1;delete p.growth;delete p.growthTick;}),
    m=>{m.world.growingZones=[{id:m.world.nextId++,plant:'healroot',allowSow:true,allowCut:true,cells:[4*w.width+5]}];},
    m=>{m.world.fires!.ledger.resources.healroot=1;},
    m=>{m.world.fires!.ledger.resources.healroot=0;},
  ];
  for(const change of changes)for(const original of [checkpoint,delta]){
    const bad=structuredClone(original);bad.revision=delta.revision;change(bad);
    expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(retained);
    if(bad.kind==='checkpoint')expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  }
  const next=decoder.adopt(delta);expect(next.status).toBe('applied');
  if(next.status==='applied')expect(next.world).toEqual(w);
});

test('current transport rejects impossible cultivated amounts, HP and vital intervals before checkpoint or delta commit',()=>{
  const w=climaticHealrootCamp(),plant=cultivatedHealroot(w,.3),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=packet(encoder,w),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw Error('Current cultivated checkpoint');
  const retained=structuredClone(first.world),delta=packet(encoder,w);
  const changes:Array<(p:Resource)=>void>=[
    p=>{p.amount=0;},p=>{p.amount=2;},p=>{p.damage=0;},p=>{p.damage=60;},p=>{p.damage=59.5;},
    p=>{p.growth=NaN;},p=>{p.growthTick=w.tick+1;},p=>{delete p.growthTick;},
    p=>{delete p.plantLife;},p=>{p.plantLife!.bornAt=w.tick+1;},
    p=>{p.plantLife!.nextCheck++;},p=>{p.plantLife!.leaflessAt=w.tick+1;},
    p=>{p.species='healroot-wild';},
  ];
  for(const change of changes)for(const original of [checkpoint,delta]){
    const bad=structuredClone(original);bad.revision=delta.revision;patchPlant(bad,plant,change);
    expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(retained);
    if(bad.kind==='checkpoint')expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  }
  expect(decoder.adopt(delta).status).toBe('applied');expect(first.world).toEqual(retained);
});

test('same-tick cold leaf loss and physical HP edits are encoded from copied witnesses and keep previous frames immutable',()=>{
  const w=climaticHealrootCamp(),plant=cultivatedHealroot(w,.3);
  for(const p of w.pawns){p.priorities.grow=0;p.priorities.gather=0;}
  stepWorld(w,plant.plantLife!.nextCheck-w.tick);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=packet(encoder,w),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw Error('Vital checkpoint');const retained=structuredClone(first.world);
  applyPlantFrost(w,plant,true,-30);damageResource(w,plant,59,'darkness');
  const delta=packet(encoder,w),expected=structuredClone(w);
  expect(delta.kind).toBe('delta');if(delta.kind!=='delta')throw Error('Expected same-tick delta');
  expect(delta.resources!.upserted).toHaveLength(1);
  expect(delta.resources!.upserted[0]!.plantLife!.leaflessAt).toBe(w.tick);
  const adopted=decoder.adopt(delta);expect(adopted.status).toBe('applied');
  if(adopted.status!=='applied')throw Error('Leafless delta refused');expect(adopted.world).toEqual(expected);
  expect(first.world).toEqual(retained);expect(checkpoint.world).toEqual(retained);
  // The life object itself is reused in the source; cache witnesses must be copies.
  delete plant.plantLife!.leaflessAt;delete plant.damage;
  const cleared=packet(encoder,w),removed=decoder.adopt(cleared);expect(removed.status).toBe('applied');
  if(removed.status==='applied')expect(removed.world).toEqual(w);
  expect(adopted.world).toEqual(expected);expect(delta.resources!.upserted[0]!.damage).toBe(59);
});

test('physical destruction transports a historical cultivated loss without a surviving plant or mutable old frame',()=>{
  const w=healrootCamp(),plant=cultivatedHealroot(w),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  ensureFireState(w);const first=decoder.adopt(packet(encoder,w));if(first.status!=='applied')throw Error('Pre-fire checkpoint');
  const retained=structuredClone(first.world);expect(damageResource(w,plant,60)).toBe(true);
  const delta=packet(encoder,w),expected=structuredClone(w),bad=structuredClone(delta);
  bad.world.fires!.ledger.resources.healroot=0;
  expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(retained);
  const adopted=decoder.adopt(delta);expect(adopted.status).toBe('applied');
  if(adopted.status==='applied')expect(adopted.world).toEqual(expected);
  expect(first.world.resources).toHaveLength(1);expect(first.world).toEqual(retained);
  const checkpoint=structuredClone(encoder.encode(w,0,1,true));
  const loaded=new SnapshotDecoder().adopt(checkpoint);expect(loaded.status).toBe('applied');
  if(loaded.status==='applied')expect(loaded.world).toEqual(expected);
});
