import { expect, test } from 'vitest';
import { ambientCameraGain, FoliageAmbience } from '../src/audio/ambience';
import { createWorld, serializeWorld } from '../src/sim/index';

test('rustle follows local living canopy, not total forest population or cactus trunks', () => {
  const world=createWorld(42,64,64);world.resources=[];
  const census=new FoliageAmbience();census.adopt(world);
  expect(census.gain(16,16)).toBe(0);
  world.resources=[{id:world.nextId++,kind:'tree',species:'oak',x:16,z:16,amount:46,growth:1}];
  census.adopt(world);const one=census.gain(16,16);
  expect(one).toBeGreaterThan(0);expect(one).toBeLessThan(.05);
  expect(census.gain(60,60)).toBe(0);
  world.resources=Array.from({length:100},(_,i)=>({id:world.nextId++,kind:'tree' as const,species:'oak' as const,x:12+i%10,z:12+Math.floor(i/10),amount:46,growth:1}));
  census.adopt(world);expect(census.gain(16,16)).toBeGreaterThan(.9);expect(census.gain(16,16)).toBeLessThan(1);
  world.resources=world.resources.map(p=>({...p,species:'saguaro'}));
  census.adopt(world);expect(census.gain(16,16)).toBe(0);
  world.resources=world.resources.map(p=>({...p,species:'oak',plantLife:{since:0,age:0,darkTicks:0,leaflessAt:world.tick,nextCheck:world.tick+200}}));
  census.adopt(world);expect(census.gain(16,16)).toBe(0);
});

test('census is immutable, reacts to same-tick replacement and stays continuous across listening cells', () => {
  const world=createWorld(42,64,64);world.resources=[{id:world.nextId++,kind:'tree',x:16,z:16,amount:46}];
  const before=serializeWorld(world),census=new FoliageAmbience();census.adopt(world);
  expect(serializeWorld(world)).toBe(before);
  expect(Math.abs(census.gain(24-.001,16)-census.gain(24+.001,16))).toBeLessThan(.0001);
  const adopted=census.gain(16,16);
  world.resources=[];
  // Camera queries read the census; only explicit snapshot adoption changes it.
  expect(census.gain(16,16)).toBe(adopted);
  census.adopt(world);expect(census.gain(16,16)).toBe(0);
  const small=createWorld(12,16,16);small.resources=[];census.adopt(small);
  expect(census.gain(16,16)).toBe(0);expect(census.gain(NaN,0)).toBe(0);
});

test('global weather softens as either camera rises without vanishing', () => {
  const perspectiveNear = ambientCameraGain({ x: 0, y: 2, z: 0, mode: 'perspective' });
  const perspectiveFar = ambientCameraGain({ x: 0, y: 52, z: 0, mode: 'perspective' });
  const isoNear = ambientCameraGain({ x: 0, y: 40, z: 40, targetX: 0, targetZ: 0,
    span: 16, mode: 'orthographic' });
  const isoFar = ambientCameraGain({ x: 0, y: 40, z: 40, targetX: 0, targetZ: 0,
    span: 120, mode: 'orthographic' });
  expect(perspectiveNear).toBe(1);
  expect(perspectiveFar).toBeLessThan(perspectiveNear);
  expect(isoFar).toBeLessThan(isoNear);
  expect(isoFar).toBeGreaterThanOrEqual(0.15);
});
