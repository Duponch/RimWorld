import {expect,test} from 'vitest';
import {shipReactorWorkshop275} from './scenarios/ship-reactor-v451.ts';
import {shipReactorCells275,shipReactorRect275} from '../src/sim/ship-reactor-content-275.ts';
import {blockedCells} from '../src/sim/pathfinding.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {WindObstructionView} from '../src/sim/wind-rules.ts';
import {penRegion} from '../src/sim/animal-pens.ts';
import {structureBeauty} from '../src/sim/room-beauty.ts';
import {applyEmpEffect} from '../src/sim/emp-effects.ts';
import {powerWatts} from '../src/sim/power-rules.ts';
import type {ShipReactor275} from '../src/sim/ship-reactor-state-275.ts';

/** Explicit flat geometry fixture; no construction or whole defence claimed. */
test('all42 occupied cells block travel, room air, pen flood and wind in every orientation; fixed beauty and EMP eligibility survive removal',()=>{
 for(const orientation of [0,1,2,3] as const){
  const {w}=shipReactorWorkshop275();w.structures=[];w.resources=[];w.jobs=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.roofing={constructed:[],build:[],remove:[],cursor:0};
  const s:ShipReactor275={id:w.nextId++,kind:'ship-reactor',x:16,z:16,orientation,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  const marker={id:w.nextId++,kind:'pen-marker' as const,x:2,z:2,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,pen:{accepted:['muffalo' as const]}};
  w.structures.push(s,marker);
  const cells=shipReactorCells275(s,orientation),rect=shipReactorRect275(s,orientation),travel=blockedCells(w),cache=new RoomTopologyCache(),room=cache.read(w),wind=new WindObstructionView(w),pen=penRegion(w,marker.id);
  expect(cells).toHaveLength(42);expect(pen).toBeDefined();
  for(const c of cells){const i=c.z*w.width+c.x;expect(travel[i]).toBe(1);expect(room.at(c.x,c.z)?.kind).toBe('solid');expect(wind.blocked(c)).toBe(true);expect(pen!.cells.has(i)).toBe(false);}
  const outside={x:rect.x-1,z:rect.z-1};expect(travel[outside.z*w.width+outside.x]).toBe(0);expect(room.at(outside.x,outside.z)?.kind).toBe('space');expect(wind.blocked(outside)).toBe(false);
  // XML has default Beauty0, no Stuff and no CompStunnable. Exercise the
  // real EMP contact producer, not just a repeated list of supported kinds.
  expect(structureBeauty(s)).toBe(0);const before=structuredClone(s),rng=w.rng;
  expect(applyEmpEffect(w,s,50,w.tick*10)).toBe(false);expect(s).toEqual(before);expect(w.rng).toBe(rng);expect(powerWatts(s,w)).toBe(1000);
  w.structures=w.structures.filter(b=>b!==s);const clear=blockedCells(w),newRoom=cache.read(w),newWind=new WindObstructionView(w),newPen=penRegion(w,marker.id);
  for(const c of cells){const i=c.z*w.width+c.x;expect(clear[i]).toBe(0);expect(newRoom.at(c.x,c.z)?.kind).toBe('space');expect(newWind.blocked(c)).toBe(false);expect(newPen!.cells.has(i)).toBe(true);expect(room.at(c.x,c.z)?.kind).toBe('solid');}
 }
});
