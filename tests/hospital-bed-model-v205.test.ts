import { expect,test } from 'vitest';
import { hospitalBedParts } from '../src/render/hospital-bed-parts';
import { footprintCells } from '../src/sim/definitions';
import { createWorld } from '../src/sim';
import { WORLD_SCALE } from '../src/world/scale';
import type { Structure } from '../src/sim/types';

test('hospital bed box model stays inside its real footprint and keeps the physical resting surface in every orientation',()=>{
  const world=createWorld(42,20,20);
  for(const orientation of [0,1,2,3] as const){
    const bed:Structure={id:101,kind:'hospital-bed',x:8,z:8,orientation,footprint:'standard',material:'steel',medical:true};
    world.structures=[bed];
    const before=JSON.stringify(world),parts=hospitalBedParts(world);
    expect(JSON.stringify(world)).toBe(before);
    expect(parts.length).toBeGreaterThan(4);
    const cells=footprintCells(bed),xs=cells.map(c=>c.x),zs=cells.map(c=>c.z);
    for(const part of parts){
      expect(part.key).toBe(bed.id);
      expect(part.ry).toBe(orientation*Math.PI/2);
      expect(part.sx).toBeGreaterThan(0);expect(part.sy).toBeGreaterThan(0);expect(part.sz).toBeGreaterThan(0);
      const hx=(Math.abs(Math.cos(part.ry!))*part.sx!+Math.abs(Math.sin(part.ry!))*part.sz!)/2;
      const hz=(Math.abs(Math.sin(part.ry!))*part.sx!+Math.abs(Math.cos(part.ry!))*part.sz!)/2;
      expect(part.x-hx).toBeGreaterThanOrEqual(Math.min(...xs)-.5);
      expect(part.x+hx).toBeLessThanOrEqual(Math.max(...xs)+.5);
      expect(part.z-hz).toBeGreaterThanOrEqual(Math.min(...zs)-.5);
      expect(part.z+hz).toBeLessThanOrEqual(Math.max(...zs)+.5);
      expect(part.y-part.sy!/2).toBeGreaterThanOrEqual(0);
    }
    const mattress=parts.find(part=>part.color===0xe5dec8)!;
    expect(mattress).toBeDefined();
    expect(mattress.y+mattress.sy!/2).toBeCloseTo(WORLD_SCALE.bedSurfaceHeight,12);
    expect(mattress.x).toBe((Math.min(...xs)+Math.max(...xs))/2);
    expect(mattress.z).toBe((Math.min(...zs)+Math.max(...zs))/2);
  }
});

test('specialist frame remains distinct from an ordinary medical bed and is independent of its current role',()=>{
  const world=createWorld(42,20,20);
  const bed:Structure={id:101,kind:'hospital-bed',x:8,z:8,orientation:0,footprint:'standard',material:'steel',medical:true};
  world.structures=[bed,{...bed,id:102,kind:'bed',x:12}];
  const parts=hospitalBedParts(world);
  expect(parts.every(part=>part.key===101)).toBe(true);
  expect(parts.some(part=>part.color===0x89999e)).toBe(true);
  expect(parts.some(part=>part.color===0x6d9f99)).toBe(true);
  delete bed.medical;
  expect(hospitalBedParts(world)).toEqual(parts);
  world.structures=[world.structures[1]!];
  expect(hospitalBedParts(world)).toEqual([]);
});
