import { expect,test } from 'vitest';
import { prepareFlashstormDemo } from '../scripts/generate-flashstorm-demo-v184.ts';
import { advanceWeather,weatherRainRate,weatherWeights } from '../src/sim/weather.ts';
import { WEATHER } from '../src/sim/weather-definitions.ts';
import { advanceFlashstorm,preventsRain } from '../src/sim/flashstorm.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';

test('a real Misc onset selects dry future weather without erasing outgoing rain, then saves exactly',()=>{
  const world=prepareFlashstormDemo(),weather=world.weather!;
  // Prepared weather only; the condition itself still requires the real tick.
  weather.current=weather.previous='rain';weather.ageCore=4000;weather.durationCore=20000;
  expect(validateWorld(world)).toEqual([]);
  const before=serializeWorld(world),privateRng=world.miscIncidents!.rng;
  stepWorld(world,0);expect(serializeWorld(world)).toBe(before);
  stepWorld(world);
  expect(world.flashstorm?.active?.start).toBe(26400);
  expect(world.miscIncidents!.rng).not.toBe(privateRng);
  expect(weather.previous).toBe('rain');expect(WEATHER[weather.current].rain).toBe(0);
  expect(weatherRainRate(world)).toBeGreaterThan(.99);
  expect(weatherWeights(world,20,900).filter(v=>WEATHER[v.kind].rain>.1).every(v=>v.weight===0)).toBe(true);
  const peer=deserializeWorld(serializeWorld(world));
  stepWorld(world,12);stepWorld(peer,12);
  expect(serializeWorld(peer)).toBe(serializeWorld(world));expect(validateWorld(world)).toEqual([]);
  expect(weatherRainRate(world)).toBeGreaterThan(.9);
});

test('ordinary storm strikes coexist, and the post-condition filter ends without a forced weather reset',()=>{
  const world=prepareFlashstormDemo();stepWorld(world);
  const state=world.flashstorm!,active=state.active!,weather=world.weather!;
  // Isolated component oracle: prepared ordinary storm, callbacks record
  // events; physical effects are exercised separately by the demo tests.
  weather.current='dry-thunderstorm';weather.previous='clear';weather.ageCore=4000;weather.durationCore=20000;weather.rng=1;
  world.tick++;
  let ordinary=0,localized=0;
  advanceWeather(world,{outsideTemperature:20,rainfall:900,fireDanger:()=>0,lightning:()=>ordinary++});
  advanceFlashstorm(world,()=>localized++);
  expect(ordinary).toBeGreaterThan(0);expect(localized).toBe(1);
  expect(weather.current).toBe('dry-thunderstorm');
  const current=weather.current,previous=weather.previous,rng=weather.rng;
  world.tick=active.end;advanceFlashstorm(world,()=>{});
  expect(state.active).toBeUndefined();expect(preventsRain(world)).toBe(true);
  world.tick=state.lastEnd+2999;
  expect(weatherWeights(world,20,900).filter(v=>WEATHER[v.kind].rain>.1).every(v=>v.weight===0)).toBe(true);
  world.tick++;
  expect(preventsRain(world)).toBe(false);
  expect(weatherWeights(world,20,900).some(v=>WEATHER[v.kind].rain>.1&&v.weight>0)).toBe(true);
  expect([weather.current,weather.previous,weather.rng]).toEqual([current,previous,rng]);
});

test('persisted localized strikes cannot invent weather history or enter a same-tick snapshot',()=>{
  const world=prepareFlashstormDemo();stepWorld(world,5);
  expect(world.flashstorm!.totalStrikes).toBe(1);
  expect(world.weather!.lightningCount).toBe(1);
  const ceiling=(world.weather!.lastCoreTick-world.weather!.originTick*10)*2;
  const overflow=structuredClone(world);
  overflow.weather!.lightningCount=ceiling+world.flashstorm!.totalStrikes+1;
  expect(validateWorld(overflow)).toContain('Invalid surface weather state.');
  expect(()=>serializeWorld(overflow)).toThrow('Cannot save invalid world');
  expect(()=>deserializeWorld(JSON.stringify(overflow))).toThrow();
  const absent=structuredClone(world);delete absent.flashstorm;
  absent.weather!.lightningCount=ceiling+1;
  expect(validateWorld(absent)).toContain('Invalid surface weather state.');
  const legacy=JSON.parse(JSON.stringify(absent)) as Record<string,unknown>;
  legacy.schemaVersion=172;
  expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow('Invalid version 172 save');

  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(world,0,0)));
  expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('Valid strike checkpoint rejected');
  const witness=serializeWorld(first.world);
  // Keep the encoder's world identity so this exercises a delta, not a reset.
  const forged=world;forged.flashstorm!.totalStrikes=2;
  expect(validateWorld(forged)).toContain('Invalid or future Flashstorm incident for schema.');
  const delta=structuredClone(encoder.encode(forged,0,0));
  expect(delta.kind).toBe('delta');expect(decoder.adopt(delta).status).toBe('resync');
  expect(serializeWorld(first.world)).toBe(witness);
  world.flashstorm!.totalStrikes=1;
  const restored=decoder.adopt(structuredClone(encoder.encode(world,0,0,true)));
  expect(restored.status).toBe('applied');
  if(restored.status==='applied')expect(serializeWorld(restored.world)).toBe(serializeWorld(world));
});
