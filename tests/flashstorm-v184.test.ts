import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { adoptMiscIncidents,MISC_INTRO_TICK } from '../src/sim/cassandra-misc.ts';
import { adoptWeather } from '../src/sim/weather.ts';
import { advanceFlashstorm,eligibleFlashstorm,FLASHSTORM_COOLDOWN,FLASHSTORM_RAIN_DELAY,preventsRain,resolveSelectedFlashstorm } from '../src/sim/flashstorm.ts';
import type { Cell,World } from '../src/sim/types.ts';

function prepared(size=64):World {
  const world=createWorld(184,size,size);
  world.pawns=[];world.resources=[];world.structures=[];world.jobs=[];world.piles=[];
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.gameProfile=crashlandedProfile();
  adoptMiscIncidents(world);
  world.tick=MISC_INTRO_TICK;
  world.miscIncidents!.introDone=true;
  world.miscIncidents!.opportunities=1;
  adoptWeather(world);
  return world;
}

test('the selected incident uses a private seed, bounded zone and strict first Core attempt',()=>{
  const world=prepared(128),peer=structuredClone(world);
  const worldRng=world.rng,weatherRng=world.weather!.rng,miscRng=world.miscIncidents!.rng;
  expect(eligibleFlashstorm(world)).toBe(true);
  expect(resolveSelectedFlashstorm(world,0xabc123)).toBe(true);
  expect(resolveSelectedFlashstorm(peer,0xabc123)).toBe(true);
  expect(world.flashstorm).toEqual(peer.flashstorm);
  expect(world.rng).toBe(worldRng);expect(world.weather!.rng).toBe(weatherRng);expect(world.miscIncidents!.rng).toBe(miscRng);
  const active=world.flashstorm!.active!;
  expect(active.radius).toBeGreaterThanOrEqual(45);expect(active.radius).toBeLessThanOrEqual(60);
  expect(active.center.x).toBeGreaterThanOrEqual(8);expect(active.center.x).toBeLessThan(world.width-8);
  expect(active.endCore-active.start*10).toBeGreaterThanOrEqual(4500);
  expect(active.endCore-active.start*10).toBeLessThanOrEqual(6000);
  expect(active.end).toBe(Math.floor(active.endCore/10)+1);
  // This prepared central site keeps every radius candidate on passable map.
  active.center={x:64,z:64};
  const impacts:Array<{cell:Cell;core:number}>=[];
  advanceFlashstorm(world,(cell,core)=>impacts.push({cell,core}));
  expect(impacts).toHaveLength(0);
  world.tick++;advanceFlashstorm(world,(cell,core)=>impacts.push({cell,core}));
  expect(impacts).toHaveLength(1);
  expect(impacts[0]!.core).toBe(active.start*10+1);
  expect(active.nextStrikeCore-impacts[0]!.core).toBeGreaterThanOrEqual(320);
  expect(active.nextStrikeCore-impacts[0]!.core).toBeLessThanOrEqual(800);
  expect(eligibleFlashstorm(world)).toBe(false);
});

test('closed or blocked cells retry each Core; the end keeps rain filtered without creating a terminal strike',()=>{
  const world=prepared(32);
  world.roofing={constructed:Array.from({length:world.width*world.height},(_,i)=>i),build:[],remove:[],cursor:0};
  expect(resolveSelectedFlashstorm(world,0x557799)).toBe(true);
  const active=world.flashstorm!.active!,firstDeadline=active.nextStrikeCore;
  const impacts:Array<{cell:Cell;core:number}>=[];
  world.tick++;advanceFlashstorm(world,(cell,core)=>impacts.push({cell,core}));
  expect(impacts).toHaveLength(0);expect(active.nextStrikeCore).toBe(firstDeadline);
  expect(active.lastCoreTick).toBe(world.tick*10);
  world.roofing.constructed=[];
  for(let i=0;i<100&&!impacts.length;i++){
    world.tick++;advanceFlashstorm(world,(cell,core)=>impacts.push({cell,core}));
  }
  expect(impacts.length).toBeGreaterThan(0);
  expect(impacts[0]!.core).toBeGreaterThan(firstDeadline+10);
  expect(world.flashstorm!.totalStrikes).toBe(active.strikes);
  world.roofing.constructed=Array.from({length:world.width*world.height},(_,i)=>i);
  world.tick=active.end;advanceFlashstorm(world,(cell,core)=>impacts.push({cell,core}));
  expect(world.flashstorm!.active).toBeUndefined();
  expect(world.flashstorm!.lastEnd).toBe(active.end);
  expect(preventsRain(world)).toBe(true);
  world.tick=active.end+FLASHSTORM_RAIN_DELAY-1;expect(preventsRain(world)).toBe(true);
  world.tick++;expect(preventsRain(world)).toBe(false);
  world.tick=active.start+FLASHSTORM_COOLDOWN-1;expect(eligibleFlashstorm(world)).toBe(false);
  world.tick++;expect(eligibleFlashstorm(world)).toBe(true);
});

test('historic camps, absent weather and undersized maps do not consume a selected seed',()=>{
  const historical=createWorld(184,32,32);
  expect(eligibleFlashstorm(historical)).toBe(false);
  expect(resolveSelectedFlashstorm(historical,19)).toBe(false);
  expect(historical.flashstorm).toBeUndefined();
  const world=prepared();delete world.weather;
  expect(resolveSelectedFlashstorm(world,19)).toBe(false);
  expect(world.flashstorm).toBeUndefined();
  const tiny=prepared(16);expect(resolveSelectedFlashstorm(tiny,19)).toBe(false);
  expect(tiny.flashstorm).toBeUndefined();
});
