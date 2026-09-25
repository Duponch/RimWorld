import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { lightSources } from '../src/sim/light-sources';
import { LocalLightCache } from '../src/sim/local-light';
import { RoomTopologyCache } from '../src/sim/room-topology';
import type { Structure,World } from '../src/sim/types';

const fixture=():World=>{
  const world=createWorld(101,32,32);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.structures=[];world.roofing=undefined;
  return world;
};
const structure=(world:World,kind:Structure['kind'],x:number,z:number):Structure=>{
  const s:Structure={id:world.nextId++,kind,x,z,orientation:0,footprint:'standard'};
  world.structures.push(s);return s;
};
test('machining glower follows actual power while older warm glowers keep their Core channels',()=>{
  const world=fixture();
  const fire=structure(world,'campfire',3,10);fire.fuel={ticks:100,burned:0,autoRefuel:true};
  const generator=structure(world,'wood-generator',5,10);generator.power={on:true,parentId:null};generator.fuel={ticks:100,burned:0,autoRefuel:true};
  const lamp=structure(world,'standing-lamp',7,10);lamp.power={on:true,parentId:null};
  const machining=structure(world,'machining-table',16,10);machining.power={on:false,parentId:null};
  expect(lightSources(world)).toEqual([
    {cell:10*32+3,radius:10,red:252,green:187,blue:113},
    {cell:10*32+5,radius:6,red:217,green:112,blue:33},
    {cell:10*32+7,radius:12,red:214,green:148,blue:94},
  ]);
  machining.power.on=true;
  expect(lightSources(world).at(-1)).toEqual({cell:10*32+16,radius:5,red:73,green:123,blue:138});
  machining.power.switchOn=false;
  expect(lightSources(world)).toHaveLength(3);
  machining.power.switchOn=true;machining.power.on=false;
  expect(lightSources(world)).toHaveLength(3);
});

test('mixed warm and blue contributions take max after channel-wise quantized sums',()=>{
  const world=fixture(),fire=structure(world,'campfire',3,10);
  fire.fuel={ticks:100,burned:0,autoRefuel:true};
  const machining=structure(world,'machining-table',14,10);
  machining.power={on:true,parentId:null};
  const cache=new LocalLightCache(),rooms=new RoomTopologyCache(),sample=11+10*world.width;
  const first=cache.read(world,rooms.read(world)),worldBefore=structuredClone(world);
  // Core distance starts at 1 on the source: 8 and 3 steps become 9 and 4.
  // Quantized contributions are fire (16,12,7), table (10,17,20).
  // The winner is green 29; adding red maxima (26) or individual maxima (36)
  // would both be wrong.
  expect(first[sample]).toBeCloseTo(29/255*3.6,6);
  expect(world).toEqual(worldBefore);
  const rebuilds=cache.rebuilds;
  expect(cache.read(world,rooms.read(world))).toBe(first);
  expect(cache.rebuilds).toBe(rebuilds);
  machining.power.on=false;
  const off=cache.read(world,rooms.read(world));
  expect(off).not.toBe(first);
  expect(off[sample]).toBeCloseTo(16/255*3.6,6);
  expect(first[sample]).toBeCloseTo(29/255*3.6,6);
  machining.power.on=true;
  expect(cache.read(world,rooms.read(world))[sample]).toBeCloseTo(first[sample]!,6);
});

test('warm-only multi-source diffusion still matches the original red sum and retains its field',()=>{
  const world=fixture(),fire=structure(world,'campfire',3,10);
  fire.fuel={ticks:100,burned:0,autoRefuel:true};
  const lamp=structure(world,'standing-lamp',21,10);lamp.power={on:true,parentId:null};
  const cache=new LocalLightCache(),rooms=new RoomTopologyCache(),light=cache.read(world,rooms.read(world));
  const attenuation=(distance:number,radius:number)=>.6*(1-distance/radius)+.4/distance**2;
  const sample=12+10*world.width;
  const red=Math.floor(252*attenuation(10,10))+Math.floor(214*attenuation(10,12));
  expect(light[sample]).toBeCloseTo(Math.min(.5,red/255*3.6),6);
  world.tick++;
  expect(cache.read(world,rooms.read(world))).toBe(light);
  expect(cache.rebuilds).toBe(1);
});
