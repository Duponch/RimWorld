import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { crashlandedProfile } from '../src/sim/game-profile';
import { advancePower,reconcilePower } from '../src/sim/power';
import { isElectrical,isFlickable,newPowerState,powerDemand,powerWatts } from '../src/sim/power-rules';
import { sunLampActive,sunLampScheduled } from '../src/sim/sun-lamp';
import { reconcileTemperature } from '../src/sim/temperature';
import { applyThermalSources } from '../src/sim/thermal-sources';
import type { Structure,World } from '../src/sim/types';

function fixture():{w:World;lamp:Structure} {
  const w=createWorld(189,32,32);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.packed=[];
  w.climate=undefined;w.gameProfile=undefined;w.tick=1600;
  for(const x of [2,4,6])w.structures.push({id:w.nextId++,kind:'wood-generator',x,z:2,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null},fuel:{ticks:100,burned:0,autoRefuel:true}});
  const lamp:Structure={id:w.nextId++,kind:'sun-lamp',x:9,z:3,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:w.structures[2]!.id}};
  w.structures.push(lamp);return {w,lamp};
}

test('civil schedule is strict and an allowed hour never supplies power by itself',()=>{
  const {w,lamp}=fixture();
  for(const [tick,allowed] of [[1500,false],[1501,true],[4799,true],[4800,false],[7500,false],[7501,true]] as const){w.tick=tick;expect(sunLampScheduled(w)).toBe(allowed);}
  w.tick=1600;lamp.power!.on=false;
  expect(sunLampScheduled(w)).toBe(true);expect(sunLampActive(w,lamp)).toBe(false);
  expect(isElectrical(lamp.kind)).toBe(true);expect(isFlickable(lamp.kind)).toBe(true);
  expect(newPowerState(lamp.kind).on).toBe(false);expect(powerDemand(lamp)).toBe(2900);expect(powerWatts(lamp,w)).toBe(0);
});

test('night stops a balanced network before its fast path without changing switch, parent or RNG',()=>{
  const {w,lamp}=fixture(),parent=lamp.power!.parentId,rng=w.rng;
  expect(powerWatts(lamp,w)).toBe(-2900);
  w.tick=4800;advancePower(w);
  expect(lamp.power).toEqual({on:false,parentId:parent});expect(w.rng).toBe(rng);
  w.tick=7501;advancePower(w);
  expect(lamp.power!.on).toBe(false);expect(w.rng).toBe(rng);
  w.tick=7520;advancePower(w);
  expect(lamp.power!.on).toBe(true);expect(w.rng).not.toBe(rng);expect(lamp.power!.parentId).toBe(parent);
});

test('a civil origin change is honored before another power tick and cannot override manual extinction',()=>{
  const {w,lamp}=fixture();
  // A forced-landing profile shifts the historical civil clock by six hours.
  w.tick=3300;w.gameProfile=crashlandedProfile();
  expect(sunLampScheduled(w)).toBe(false);expect(sunLampActive(w,lamp)).toBe(false);expect(powerWatts(lamp,w)).toBe(0);
  reconcilePower(w);expect(lamp.power!.on).toBe(false);
  w.gameProfile=undefined;w.tick=1600;lamp.power!.switchOn=false;
  advancePower(w);expect(lamp.power!.on).toBe(false);expect(lamp.power!.switchOn).toBe(false);
});

test('the powered lamp heats its actual covered air and stops heating at the schedule boundary',()=>{
  const {w,lamp}=fixture(),cell=lamp.z*w.width+lamp.x;
  for(let z=lamp.z-1;z<=lamp.z+1;z++)for(let x=lamp.x-1;x<=lamp.x+1;x++)if(x!==lamp.x||z!==lamp.z)
    w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard',material:'wood'});
  w.roofing={constructed:[cell],build:[],remove:[],cursor:0};
  const layout=reconcileTemperature(w),region=layout.indices[cell]!;
  expect(region).toBeGreaterThanOrEqual(0);
  const room=w.thermal!.regions[region]!,before=room.temperature;
  applyThermalSources(w,layout);
  expect(room.temperature-before).toBeCloseTo(.5/room.cells.length,12);
  const heated=room.temperature;
  w.tick=4800;applyThermalSources(w,layout);expect(room.temperature).toBe(heated);
  w.tick=1600;lamp.power!.on=false;applyThermalSources(w,layout);expect(room.temperature).toBe(heated);
});
