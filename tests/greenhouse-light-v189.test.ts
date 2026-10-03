import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { lightSources } from '../src/sim/light-sources';
import { LocalLightCache } from '../src/sim/local-light';
import { RoomTopologyCache } from '../src/sim/room-topology';
import type { Structure,World } from '../src/sim/types';

function fixture():World {
  const w=createWorld(189,40,40);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];
  w.climate=undefined;w.gameProfile=undefined;w.roofing=undefined;w.tick=1600;
  return w;
}
function lamp(w:World,x=16,z=16):Structure {
  const s:Structure={id:w.nextId++,kind:'sun-lamp',x,z,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  w.structures.push(s);return s;
}
function wall(w:World,x:number,z:number):void {
  w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard',material:'wood'});
}

test('horticultural flood starts at distance one and separates full growth from ordinary light',()=>{
  const w=fixture();lamp(w);
  const cache=new LocalLightCache(),rooms=new RoomTopologyCache(),field=cache.read(w,rooms.read(w));
  const at=(x:number,z:number)=>field[z*w.width+x]!;
  expect(lightSources(w)).toEqual([{cell:16*w.width+16,radius:14,red:370,green:370,blue:370,overlightRadius:7}]);
  expect(at(16,16)).toBe(1);expect(at(21,16)).toBe(1);expect(at(20,20)).toBe(1);
  expect(at(22,16)).toBe(.5);expect(at(28,16)).toBeGreaterThan(0);
  // At the outer radius, the attenuated 370 channel truncates below one.
  expect(at(29,16)).toBe(0);expect(at(30,16)).toBe(0);
  expect(at(25,25)).toBeLessThanOrEqual(.5);
});

test('two opaque sides close a diagonal while one side permits it, and a complete wall blocks coverage',()=>{
  const w=fixture();lamp(w);wall(w,17,16);
  // The distant diagonal is just inside the full-light frontier. Closing both
  // sides forces a genuine detour beyond it; nearby cells can still be reached.
  const cache=new LocalLightCache(),rooms=new RoomTopologyCache(),target=20*w.width+20;
  expect(cache.read(w,rooms.read(w))[target]).toBe(1);
  wall(w,16,17);
  expect(cache.read(w,rooms.read(w))[target]).toBeLessThanOrEqual(.5);
  for(let z=0;z<w.height;z++)wall(w,18,z);
  expect(cache.read(w,rooms.read(w))[16*w.width+19]).toBe(0);
});

test('overlapping lamps retain full coverage and replace immutable fields on schedule, switch or supply changes',()=>{
  const w=fixture(),firstLamp=lamp(w),secondLamp=lamp(w,18,16);
  const cache=new LocalLightCache(),rooms=new RoomTopologyCache(),sample=16*w.width+16;
  const first=cache.read(w,rooms.read(w)),rebuilds=cache.rebuilds;
  w.tick++;
  expect(cache.read(w,rooms.read(w))).toBe(first);expect(cache.rebuilds).toBe(rebuilds);
  firstLamp.power!.on=false;
  const second=cache.read(w,rooms.read(w));expect(second[sample]).toBe(1);expect(first[sample]).toBe(1);
  secondLamp.power!.switchOn=false;
  const off=cache.read(w,rooms.read(w));expect(off[sample]).toBe(0);expect(second[sample]).toBe(1);
  secondLamp.power!.switchOn=true;w.tick=4800;
  expect(cache.read(w,rooms.read(w))[sample]).toBe(0);
  w.tick=1600;secondLamp.breakdown={brokenAt:w.tick};
  expect(lightSources(w)).toHaveLength(0);
});

test('ordinary sources keep their quantized capped field with no horticultural emitter',()=>{
  const w=fixture();
  w.structures.push({id:w.nextId++,kind:'standing-lamp',x:16,z:16,orientation:0,footprint:'standard',power:{on:true,parentId:null}});
  const cache=new LocalLightCache(),rooms=new RoomTopologyCache(),field=cache.read(w,rooms.read(w));
  const red=Math.floor(214*(.6*(1-10/12)+.4/100));
  expect(field[16*w.width+25]).toBeCloseTo(Math.min(.5,red/255*3.6),6);
  expect(Math.max(...field)).toBe(.5);
  w.tick=4800;
  expect(cache.read(w,rooms.read(w))).toBe(field);
});

test('planned coverage uses the same flood without changing the world or its actual night light',()=>{
  const w=fixture();w.tick=4800;
  const before=structuredClone(w),cache=new LocalLightCache(),rooms=new RoomTopologyCache(),topology=rooms.read(w);
  expect(cache.read(w,topology)[16*w.width+21]).toBe(0);
  const preview=cache.read(w,topology,[{cell:16*w.width+16,radius:14,red:370,green:370,blue:370,overlightRadius:7}]);
  expect(preview[16*w.width+21]).toBe(1);expect(preview[16*w.width+22]).toBe(.5);
  expect(cache.read(w,topology)[16*w.width+21]).toBe(0);
  expect(preview[16*w.width+21]).toBe(1);expect(w).toEqual(before);
});
