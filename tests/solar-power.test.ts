import { expect, test } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/sim/serialization';
import { solarPowerOutput, solarUnroofedCells } from '../src/sim/solar-rules';
import { powerWatts, newPowerState } from '../src/sim/power-rules';
import { crashlandedProfile } from '../src/sim/game-profile';
import { electricalParts } from '../src/render/electrical-parts';
import { powerExpansionFixture } from './scenarios/power-expansion';
import type { Structure } from '../src/sim/types';

test('solar output follows civil sunlight, all sixteen roof cells, and ignores lamp light and map shadows',()=>{
  const world=powerExpansionFixture(); world.pawns=[]; world.tick=3000;
  const solar:Structure={id:world.nextId++,kind:'solar-generator',material:'steel',x:7,z:10,orientation:0,footprint:'standard',power:newPowerState('solar-generator')};
  world.structures.push(solar);
  expect(solarPowerOutput(world,solar)).toBe(1700); expect(solarUnroofedCells(world,solar)).toBe(16);
  const cells=Array.from({length:16},(_,i)=>(10+Math.floor(i/4))*world.width+7+i%4);
  world.roofing={constructed:cells.slice(0,1),build:[],remove:[],cursor:0};expect(solarPowerOutput(world,solar)).toBe(1593.75);
  world.roofing.constructed=cells.slice(0,8);expect(solarPowerOutput(world,solar)).toBe(850);
  world.roofing.constructed=cells;expect(solarPowerOutput(world,solar)).toBe(0);
  world.roofing.constructed=[];world.tick=0;
  world.structures.push({id:world.nextId++,kind:'standing-lamp',material:'steel',x:8,z:9,orientation:0,footprint:'standard',power:{on:true,parentId:solar.id}});
  expect(solarPowerOutput(world,solar)).toBe(0);
  world.gameProfile=crashlandedProfile();
  const dawn=solarPowerOutput(world,solar);expect(dawn).toBeGreaterThan(0);expect(dawn).toBeLessThan(1700);
  world.tick=1500;expect(solarPowerOutput(world,solar)).toBe(1700);
  solar.power!.on=false;expect(powerWatts(solar,world)).toBe(0);expect(solarPowerOutput(world,solar)).toBe(1700);
});

test('a partial-roof solar checkpoint keeps continuation and static panel geometry through day and night',()=>{
  const world=powerExpansionFixture();world.tick=3000;
  world.research!.solarPower={points:600_000_000,completedAt:world.tick};
  const solar:Structure={id:world.nextId++,kind:'solar-generator',material:'steel',x:7,z:10,orientation:0,footprint:'standard',power:newPowerState('solar-generator')};
  world.structures.push(solar);world.roofing={constructed:[10*world.width+7],build:[],remove:[],cursor:0};
  const parts=electricalParts(world),saved=serializeWorld(world),restored=deserializeWorld(saved);
  expect(serializeWorld(restored)).toBe(saved);
  for(const tick of [3100,4500,5800,6000,7500,9000]) {
    world.tick=tick;restored.tick=tick;
    expect(solarPowerOutput(restored,restored.structures.find(s=>s.id===solar.id)!)).toBe(solarPowerOutput(world,solar));
    expect(electricalParts(world)).toEqual(parts);
  }
  // A panel fits the authoritative four-cell square; no hidden fifth column.
  expect(parts.every(p=>p.x-(p.sx??1)/2>=6.5&&p.x+(p.sx??1)/2<=10.5&&p.z-(p.sz??1)/2>=9.5&&p.z+(p.sz??1)/2<=13.5)).toBe(true);
});
