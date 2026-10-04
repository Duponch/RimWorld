import { expect,test } from 'vitest';
import { withoutMiningSkill, withoutPredatorDefaults, withoutTelevisionRecreation } from './scenarios/legacy-skills.ts';
import { createWorld } from '../src/sim/engine.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { adoptMiscIncidents,MISC_INTRO_TICK } from '../src/sim/cassandra-misc.ts';
import { adoptWeather } from '../src/sim/weather.ts';
import { advanceFlashstorm,resolveSelectedFlashstorm } from '../src/sim/flashstorm.ts';
import { validFlashstorm } from '../src/sim/flashstorm-save.ts';
import { deserializeWorld,serializeWorld } from '../src/sim/serialization.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { enableBiomeWildlife } from '../src/sim/wildlife.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import type { World } from '../src/sim/types.ts';

function selected():World {
  const world=createWorld(184,32,32);
  world.pawns=[];world.resources=[];world.structures=[];world.jobs=[];world.piles=[];
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.gameProfile=crashlandedProfile();
  adoptMiscIncidents(world);
  world.tick=MISC_INTRO_TICK;world.miscIncidents!.introDone=true;world.miscIncidents!.opportunities=1;
  adoptWeather(world);
  if(!resolveSelectedFlashstorm(world,0x184184))throw Error('Prepared selection failed');
  return world;
}

test('strict state accepts the active clock, exact continuation and completed dry interval',()=>{
  const world=selected();
  expect(validFlashstorm(world.flashstorm,173,world)).toBe(true);
  const peer=structuredClone(world),cellsA:string[]=[],cellsB:string[]=[];
  for(let i=0;i<70;i++){
    world.tick++;peer.tick++;
    advanceFlashstorm(world,(cell,core)=>{
      cellsA.push(`${core}:${cell.x}:${cell.z}`);
      world.weather!.lightningCount++;world.weather!.lastLightning={...cell,coreTick:core};
    });
    advanceFlashstorm(peer,(cell,core)=>{
      cellsB.push(`${core}:${cell.x}:${cell.z}`);
      peer.weather!.lightningCount++;peer.weather!.lastLightning={...cell,coreTick:core};
    });
  }
  expect(cellsA).toEqual(cellsB);expect(peer.flashstorm).toEqual(world.flashstorm);
  expect(validFlashstorm(world.flashstorm,173,world)).toBe(true);
  const end=world.flashstorm!.lastEnd;
  world.roofing={constructed:Array.from({length:world.width*world.height},(_,i)=>i),build:[],remove:[],cursor:0};
  world.tick=end;advanceFlashstorm(world,()=>{});
  expect(world.flashstorm!.active).toBeUndefined();
  expect(validFlashstorm(world.flashstorm,173,world)).toBe(true);
});

test('schema 172 and corrupted shapes cannot acquire an incident or future history',()=>{
  const world=selected(),good=structuredClone(world.flashstorm!);
  expect(validFlashstorm(good,172,world)).toBe(false);
  const cases:unknown[]=[
    {...good,unexpected:true},
    {...good,rng:0},
    {...good,storms:'1'},
    {...good,totalStrikes:21},
    {...good,lastStart:world.tick+1},
    {...good,lastEnd:good.lastEnd+1},
    {...good,active:{...good.active!,center:{...good.active!.center,extra:0}}},
    {...good,active:{...good.active!,center:{x:0,z:0}}},
    {...good,active:{...good.active!,radius:44}},
    {...good,active:{...good.active!,lastCoreTick:good.active!.lastCoreTick-1}},
    {...good,active:{...good.active!,endCore:good.active!.endCore+10}},
    {...good,active:{...good.active!,nextStrikeCore:good.active!.nextStrikeCore-1}},
    {...good,active:{...good.active!,strikes:21}},
  ];
  for(const value of cases)expect(validFlashstorm(value,173,world)).toBe(false);
  const noOpportunity=structuredClone(world);noOpportunity.miscIncidents!.opportunities=0;
  expect(validFlashstorm(good,173,noOpportunity)).toBe(false);
  const brokenParent=structuredClone(world) as unknown as World;
  (brokenParent.miscIncidents as unknown as Record<string,unknown>).opportunities='1';
  expect(validFlashstorm(good,173,brokenParent)).toBe(false);
  const badWeather=structuredClone(world) as unknown as World;
  (badWeather.weather as unknown as Record<string,unknown>).lightningCount='0';
  expect(validFlashstorm(good,173,badWeather)).toBe(false);
  const missingWeatherStrike=structuredClone(world);
  missingWeatherStrike.tick++;missingWeatherStrike.flashstorm!.active!.lastCoreTick=missingWeatherStrike.tick*10;
  missingWeatherStrike.flashstorm!.active!.strikes=1;missingWeatherStrike.flashstorm!.totalStrikes=1;
  missingWeatherStrike.flashstorm!.active!.nextStrikeCore=missingWeatherStrike.flashstorm!.active!.start*10+321;
  missingWeatherStrike.weather!.lightningCount=1;
  expect(validFlashstorm(missingWeatherStrike.flashstorm,173,missingWeatherStrike)).toBe(true);
  missingWeatherStrike.weather!.lightningCount=0;
  expect(validFlashstorm(missingWeatherStrike.flashstorm,173,missingWeatherStrike)).toBe(false);
  const inventedHistory=structuredClone(world);
  inventedHistory.weather!.lightningCount=1;inventedHistory.flashstorm!.totalStrikes=1;
  expect(validFlashstorm(inventedHistory.flashstorm,173,inventedHistory)).toBe(false);
  const impossible=structuredClone(good);
  impossible.active!.strikes=3;impossible.totalStrikes=3;
  const elapsedParent=structuredClone(world);elapsedParent.weather!.lightningCount=3;
  expect(validFlashstorm(impossible,173,elapsedParent)).toBe(false);
  const old=createWorld(184,32,32);
  const source=JSON.parse(serializeWorld(old)) as Record<string,unknown>;
  source.schemaVersion=(withoutTelevisionRecreation(source),172);source.flashstorm=good;
  expect(()=>deserializeWorld(JSON.stringify(source))).toThrow();
});

test('a valid version 172 save migrates neutrally and a forged same-tick bridge delta is rejected atomically',()=>{
  const old=createScenarioWorld(184,32,'crashlanded');
  const legacy=withoutPredatorDefaults(withoutTelevisionRecreation(withoutMiningSkill(JSON.parse(serializeWorld(old))))) as Record<string,unknown>;
  legacy.schemaVersion=(withoutTelevisionRecreation(legacy),172);
  // Build the ecological profile under its own historical schema. A current
  // v2 population must not masquerade as the old herbivore-only population.
  const historical=legacy as unknown as World;
  delete historical.wildlife;enableBiomeWildlife(historical,historical.site!.biome);
  const migrated=deserializeWorld(JSON.stringify(legacy));
  expect(migrated.flashstorm).toBeUndefined();
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=structuredClone(encoder.encode(migrated,0,0));
  expect(decoder.adopt(checkpoint).status).toBe('applied');
  migrated.flashstorm={...structuredClone(selected().flashstorm!),rng:0};
  const forged=structuredClone(encoder.encode(migrated,0,0));
  expect(forged.kind).toBe('delta');
  expect(decoder.adopt(forged).status).toBe('resync');
  delete migrated.flashstorm;
  const repaired=decoder.adopt(structuredClone(encoder.encode(migrated,0,0,true)));
  expect(repaired.status).toBe('applied');
  if(repaired.status==='applied')expect(repaired.world.flashstorm).toBeUndefined();
});
