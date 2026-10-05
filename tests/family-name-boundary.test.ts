// Private draft with FINAL tests/ imports. Not imported/executed during campaigns.
import { expect,test } from 'vitest';
import { medicalCamp } from './scenarios/health.ts';
import { captureRelationshipPeople } from '../src/sim/relationship-namespace.ts';
import { relationshipOfferCandidates } from '../src/sim/relationship-generation.ts';
import { legacyHumanAge } from '../src/sim/human-age.ts';
import { tryAddRelationship } from '../src/sim/relationship-runtime.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';

test.each(['A'.repeat(49),'B'.repeat(80),' '])('existing valid human label survives family context without normalization: %j',name=>{
  const world=medicalCamp(2),pawn=world.pawns[0]!;
  pawn.name=name;
  expect(validateWorld(world)).toEqual([]);
  const before=JSON.stringify(world);
  expect(captureRelationshipPeople(world).get(pawn.id)?.name).toBe(name);
  expect(Array.isArray(relationshipOfferCandidates(world,legacyHumanAge()))).toBe(true);
  expect(JSON.stringify(world)).toBe(before);
  const second=world.pawns[1]!;
  expect(tryAddRelationship(world,{kind:'sibling',aId:Math.min(pawn.id,second.id),bId:Math.max(pawn.id,second.id),recordedAt:world.tick})).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder();
  const adopted=decoder.adopt(structuredClone(encoder.encode(world,0,0)));
  expect(adopted.status).toBe('applied');
  if(adopted.status!=='applied')throw Error(JSON.stringify(adopted));
  expect(adopted.world.pawns[0]!.name).toBe(name);
});

test.each(['','C'.repeat(81)])('family context retains the ordinary invalid human label bound: %j',name=>{
  const world=medicalCamp(2);world.pawns[0]!.name=name;
  expect(validateWorld(world)).not.toEqual([]);
  expect(()=>captureRelationshipPeople(world)).toThrow();
});
