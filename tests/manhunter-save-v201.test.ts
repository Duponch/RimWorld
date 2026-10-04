import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes.ts';
import { startAnimalManhunter } from '../src/sim/animal-manhunter.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { validWildlifeManhunterState } from '../src/sim/animal-manhunter-save.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { damageBarrier } from '../src/sim/barriers.ts';
import { advanceAnimalMelee } from '../src/sim/wildlife-melee.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { disturbanceEvents } from '../src/sim/disturbance.ts';
import { finishDeconstruction } from '../src/sim/deconstruction.ts';
import { designateDeconstruction } from '../src/sim/deconstruction-rules.ts';
import { predationCamp,animal } from './helpers/predation-v190-fixture.ts';

const legacy=()=>JSON.parse(readFileSync('public/test-saves/v195/champ-medicinal.json','utf8')) as World;
test('182 is strictly validated before a neutral183 migration, without rage, calendar or draws',()=>{
  const old=legacy(),before=structuredClone(old);
  expect(old.schemaVersion).toBe(182);
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  expect(old).toEqual(before);
  const bad=legacy();bad.smallIncidents={} as NonNullable<World['smallIncidents']>;
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/182/);
  const future=predationCamp().w;future.schemaVersion=182 as World['schemaVersion'];const a=future.wildlife!.animals[0]!;
  a.manhunter={startedAtCore:future.tick*10,rng:1,zeroRestTicks:0};
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/182/);
});

test('same-tick hostility and target changes publish immutably; corrupt checkpoint and delta are refused atomically',()=>{
  const {w,foxId}=predationCamp(),a=animal(w,foxId),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),phases=new PresentationChanges();
  phases.capture(w);
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6,true)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('checkpoint');
  const prior=first.world,before=structuredClone(prior);
  expect(startAnimalManhunter(w,a)).toBe(true);expect(validateWorld(w)).toEqual([]);
  expect(phases.capture(w)).toBe(true);expect(phases.capture(w)).toBe(false);
  const delta=structuredClone(encoder.encode(w,0,6)),accepted=decoder.adopt(delta);
  expect(accepted.status).toBe('applied');if(accepted.status!=='applied')throw Error('rage delta');
  expect(accepted.world).toEqual(w);expect(prior).toEqual(before);
  const bad=structuredClone(encoder.encode(w,0,6,true));
  bad.world.wildlife!.animals[0]!.manhunter!.rng=0;
  expect(decoder.adopt(bad).status).toBe('resync');expect(accepted.world).toEqual(w);
  const resumed=deserializeWorld(serializeWorld(w));
  for(let n=0;n<70;n++){stepWorld(w);stepWorld(resumed);expect(validateWorld(w),String(w.tick)).toEqual([]);}
  expect(resumed).toEqual(w);
});

test('rage has a closed shape and real references, preserving every rejected input',()=>{
  const {w,foxId}=predationCamp(),a=animal(w,foxId);startAnimalManhunter(w,a);
  for(const patch of [{rng:0},{startedAtCore:w.tick*10+1},{zeroRestTicks:1},{targetId:w.nextId+10},{other:true},
    {door:{targetId:w.nextId+10,remaining:2,untilCore:w.tick*10+2000}}]){
    const bad=structuredClone(w);Object.assign(animal(bad,foxId).manhunter!,patch);
    const raw=JSON.stringify(bad);expect(()=>deserializeWorld(raw)).toThrow();expect(JSON.stringify(bad)).toBe(raw);
  }
});

test('a committed door strike survives external destruction, remains owned after recovery, and is forbidden in182 snapshots',()=>{
  const {w,foxId}=predationCamp(),a=animal(w,foxId);
  const door={id:w.nextId++,kind:'door' as const,material:'wood' as const,x:a.x+1,z:a.z,orientation:0 as const,footprint:'standard' as const,door:newDoorState(w.tick)};
  w.structures.push(door);startAnimalManhunter(w,a);
  a.manhunter!.targetId=w.pawns[0]!.id;a.manhunter!.door={targetId:door.id,remaining:3,untilCore:w.tick*10+2000};
  expect(advanceAnimalMelee(w,a,w.tick*10,()=>blockedCells(w,true),()=>captureWorldShotGrid(w),disturbanceEvents(w))).toBe(true);
  expect(a.strike?.structure).toEqual({x:door.x,z:door.z});
  expect(validWildlifeManhunterState(w,183)).toBe(true);
  expect(damageBarrier(w,door,9999)).toBe(true);expect(a.manhunter!.door).toBeUndefined();
  delete a.manhunter;
  expect(validWildlifeManhunterState(w,183)).toBe(true);expect(validWildlifeManhunterState(w,182)).toBe(false);
  const before=structuredClone(a.strike);
  const bad=structuredClone(w);bad.wildlife!.animals[0]!.strike!.targetId=w.pawns[0]!.id;
  expect(validWildlifeManhunterState(bad,183)).toBe(false);expect(a.strike).toEqual(before);
  const corrupt=structuredClone(w);corrupt.wildlife!.animals[0]!.species='invalid' as typeof a.species;
  expect(validWildlifeManhunterState(corrupt,183)).toBe(false);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('deconstruction removes only the active door intention, preserving a committed strike',()=>{
  const {w,foxId}=predationCamp(),a=animal(w,foxId);
  const door={id:w.nextId++,kind:'door' as const,material:'wood' as const,x:a.x+1,z:a.z,orientation:0 as const,footprint:'standard' as const,door:newDoorState(w.tick)};
  w.structures.push(door);startAnimalManhunter(w,a);
  a.manhunter!.targetId=w.pawns[0]!.id;a.manhunter!.door={targetId:door.id,remaining:3,untilCore:w.tick*10+2000};
  expect(advanceAnimalMelee(w,a,w.tick*10,()=>blockedCells(w,true),()=>captureWorldShotGrid(w),disturbanceEvents(w))).toBe(true);
  const strike=structuredClone(a.strike);
  designateDeconstruction(w,door);
  expect(finishDeconstruction(w,w.pawns[0]!,w.jobs.at(-1)!)).toBe(true);
  expect(w.structures).not.toContain(door);expect(a.manhunter!.door).toBeUndefined();
  expect(a.strike).toEqual(strike);expect(validWildlifeManhunterState(w,183)).toBe(true);
});
