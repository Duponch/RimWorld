import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { createWorld } from '../src/sim/index.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { plantWorkRate } from '../src/sim/plant-skills.ts';
import { withoutMiningSkill } from './scenarios/legacy-skills.ts';
import { SCHEMA_VERSION } from '../src/sim/types.ts';
import { withoutPredatorFoodPolicies, withoutPredatorApparelPolicies } from './scenarios/legacy-save.ts';

test('V167 validates strictly before neutral V168 migration with no past Plants practice or RNG draw', () => {
  const current=createWorld(42),legacy=withoutPredatorApparelPolicies(withoutPredatorFoodPolicies(JSON.parse(serializeWorld(current))));
  withoutMiningSkill(legacy);
  for(const pawn of legacy.pawns)delete pawn.skills.plants;
  legacy.schemaVersion=167;
  const before=JSON.stringify(legacy),migrated=deserializeWorld(before);
  expect(migrated).toEqual({...legacy,schemaVersion:SCHEMA_VERSION});
  expect(JSON.stringify(legacy)).toBe(before);
  expect(migrated.pawns.every(pawn=>pawn.skills.plants===undefined)).toBe(true);
  expect(migrated.rng).toBe(legacy.rng);
  expect(validateWorld(migrated)).toEqual([]);
  const future=structuredClone(legacy);future.pawns[0].skills.plants={level:8,xp:0,dailyXp:0,passion:0};
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/Invalid version 167 save.*skills/);
  const invalid=structuredClone(legacy);invalid.rng=0;
  expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/Invalid version 167 save/);
});

test('V168 rejects corrupt Plants records and resumes the first learning tick exactly through save and bridge', () => {
  const world=createWorld(42),pawn=world.pawns[0]!;
  delete pawn.skills.plants;
  plantWorkRate(pawn);
  const resumed=deserializeWorld(serializeWorld(world));
  expect(resumed).toEqual(world);
  for(const change of [
    (profile:Record<string,unknown>)=>{profile.level=21;},
    (profile:Record<string,unknown>)=>{profile.xp=-1000000;},
    (profile:Record<string,unknown>)=>{profile.dailyXp=999999999;},
    (profile:Record<string,unknown>)=>{profile.future=true;},
  ]){
    const corrupt=JSON.parse(serializeWorld(world));change(corrupt.pawns[0].skills.plants);
    expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/skills/);
  }
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=structuredClone(encoder.encode(world,0,1));
  expect(decoder.adopt(checkpoint).status).toBe('applied');
  plantWorkRate(pawn);
  const delta=structuredClone(encoder.encode(world,0,1));
  expect(delta.kind).toBe('delta');
  const adoption=decoder.adopt(delta);
  expect(adoption.status).toBe('applied');
  if(adoption.status==='applied')expect(adoption.world.pawns[0]!.skills.plants).toEqual(pawn.skills.plants);
  expect(deserializeWorld(serializeWorld(world)).pawns[0]!.skills.plants).toEqual(pawn.skills.plants);
});

test('bridge refuses a future Plants profile in V167 and can accept a corrected packet at the same revision', () => {
  const world=createWorld(42),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  withoutMiningSkill(world);
  for(const pawn of world.pawns)delete pawn.skills.plants;
  const oldWorld={...world,schemaVersion:167} as unknown as typeof world;
  expect(decoder.adopt(structuredClone(encoder.encode(oldWorld,0,1))).status).toBe('applied');
  oldWorld.pawns[0]!.skills.plants={level:8,xp:0,dailyXp:0,passion:0};
  const future=structuredClone(encoder.encode(oldWorld,0,1));
  expect(future.kind).toBe('delta');
  expect(decoder.adopt(future).status).toBe('resync');
  const corrected=structuredClone(future);
  delete corrected.world.pawns[0]!.skills.plants;
  const adoption=decoder.adopt(corrected);
  expect(adoption.status).toBe('applied');
  if(adoption.status==='applied')expect(adoption.world.pawns[0]!.skills.plants).toBeUndefined();
});

test('bridge rejects corrupt current Plants XP without replacing its accepted pawn snapshot', () => {
  const world=createWorld(42),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=structuredClone(encoder.encode(world,0,1));
  expect(decoder.adopt(first).status).toBe('applied');
  const accepted=structuredClone(world.pawns[0]!.skills.plants);
  world.pawns[0]!.skills.plants!.xp=-1000000;
  const corrupt=structuredClone(encoder.encode(world,0,1));
  expect(corrupt.kind).toBe('delta');
  expect(decoder.adopt(corrupt).status).toBe('resync');
  const corrected=structuredClone(corrupt);
  corrected.world.pawns[0]!.skills.plants=accepted;
  const adoption=decoder.adopt(corrected);
  expect(adoption.status).toBe('applied');
  if(adoption.status==='applied')expect(adoption.world.pawns[0]!.skills.plants).toEqual(accepted);
});
