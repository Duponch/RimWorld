import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { controlledInjury,medicalCamp } from './scenarios/health.ts';
import { addSocialMemory,socialSeed } from '../src/sim/social-state.ts';
import { moodThoughts } from '../src/sim/mood.ts';

test('V181 same-tick death memories reach the HUD without changing an earlier owned snapshot',()=>{
  const world=medicalCamp(2),[survivor,victim]=world.pawns;
  survivor!.social={rng:socialSeed(world.seed,survivor!.id),memories:[]};
  for(let n=0;n<3;n++)addSocialMemory(survivor!.social,victim!.id,'deep-talk',world.tick,1);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const send=()=>structuredClone(encoder.encode(world,0,1));
  const before=decoder.adopt(send());if(before.status!=='applied')throw Error(before.status);
  const previous=JSON.stringify(before.world);
  controlledInjury(world,victim!,'heart',20000,'cut');
  expect(victim!.state).toBe('dead');
  const packet=send();expect(packet.kind).toBe('delta');
  const after=decoder.adopt(packet);if(after.status!=='applied')throw Error(after.status);
  expect(after.world.tick).toBe(before.world.tick);
  expect(after.world.pawns[0]!.bereavement).toHaveLength(1);
  expect(moodThoughts(after.world,after.world.pawns[0]!).find(t=>t.id.startsWith('friend-died-'))?.offset).toBeLessThan(0);
  expect(JSON.stringify(before.world)).toBe(previous);
});

test('V181 malformed death metadata cannot partially replace a checkpoint or advance the decoder revision',()=>{
  const world=medicalCamp(2),[survivor,victim]=world.pawns;
  controlledInjury(world,victim!,'heart',20000,'cut');
  survivor!.bereavement=[{otherId:victim!.id,kind:'friend-died',at:world.tick,opinion:20}];
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=structuredClone(encoder.encode(world,0,1));
  expect(decoder.adopt(checkpoint).status).toBe('applied');
  const good=structuredClone(encoder.encode(world,0,1));
  for(const patch of [
    {otherId:survivor!.id},{otherId:999999},{at:world.tick+1},{opinion:19},
    {kind:'unknown'},{opinion:Infinity},{extra:true},
  ]){
    const invalid=structuredClone(good);
    Object.assign(invalid.world.pawns[0]!.bereavement![0]!,patch);
    expect(decoder.adopt(invalid as SnapshotMessage).status).toBe('resync');
  }
  const old=structuredClone(good);
  Object.assign(old.world,{schemaVersion:169});
  expect(decoder.adopt(old).status).toBe('resync');
  expect(decoder.adopt(good).status).toBe('applied');
  const badCheckpoint=structuredClone(checkpoint);badCheckpoint.epoch++;
  badCheckpoint.world.pawns[0]!.bereavement![0]!.at++;
  expect(decoder.adopt(badCheckpoint).status).toBe('resync');
});
