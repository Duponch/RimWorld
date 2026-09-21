import { expect,test } from 'vitest';
import type * as THREE from 'three/webgpu';
import { FixedClock } from '../src/bridge/fixed-clock';
import { CORE_TICKS_PER_SECOND,localTimeSeconds,coreTimeSeconds } from '../src/bridge/clock-rate';
import { TICKS_PER_DAY,TICKS_PER_SECOND } from '../src/sim/types';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { PawnLayer } from '../src/render/PawnLayer';
import { WildlifeLayer } from '../src/render/WildlifeLayer';
import { clearGroup } from '../src/render/primitives';
import { animalCombatCamp } from './scenarios/animal-combat';

test('one Core day takes 1000 real seconds at normal speed without accumulating tick-rounding drift',()=>{
  expect(TICKS_PER_SECOND).toBe(6);expect(CORE_TICKS_PER_SECOND).toBe(60);
  for(const speed of [1,3,6]) {
    const clock=new FixedClock();clock.reset(0);let ticks=0;
    // Whole 20 ms worker wakeups: 6000 local ticks in 1000 seconds at 1x.
    for(let now=20;now<=1000000;now+=20)ticks+=clock.advance(now,speed);
    expect(ticks).toBe(6000*speed);expect(ticks/speed).toBe(TICKS_PER_DAY);
    expect(clock.advance(1000000,speed)).toBe(0);
  }
  expect(localTimeSeconds(6000)).toBe(1000);expect(coreTimeSeconds(60000)).toBe(1000);
  // The origin is removed before scaling, even late in a saved colony.
  const origin=1024*1000000;
  expect(coreTimeSeconds(origin*10+3,origin)).toBe(.05);
  expect(localTimeSeconds(origin+.75,origin)).toBe(.125);
});

test('human, cargo, selection and animal poses retain their edge through the shared clock rebase',()=>{
  const world=animalCombatCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.tick=1025;
  const edge={from:{x:10,z:10},to:{x:11,z:10},start:1020,end:1026};
  Object.assign(pawn,{x:11,z:10,state:'moving',motion:structuredClone(edge),path:[]});
  Object.assign(animal,{x:11,z:10,state:'moving',motion:structuredClone(edge),path:[]});
  delete animal.meal;
  const timeline=new MotionTimeline();timeline.adopt(1025,0,[{id:pawn.id,segments:[edge]},{id:animal.id,segments:[edge]}],0,true);
  const people=new PawnLayer(),wildlife=new WildlifeLayer();people.update(world,1,true);
  const meshes=people.group.children as THREE.Mesh[];
  const position=(geometry:THREE.BufferGeometry,clock:number):number=>{
    const from=geometry.getAttribute('aFrom'),to=geometry.getAttribute('aTo'),times=geometry.getAttribute('aTravel');
    const alpha=(clock-times.getX(0))/(times.getY(0)-times.getX(0));
    return from.getX(0)+(to.getX(0)-from.getX(0))*alpha;
  };
  for(const tick of [1023.5,1023.75,1024,1024.25,1024.5]) {
    timeline.tick=tick;people.updateTravel(world,timeline);wildlife.update(world,timeline);
    expect(people.travelTime.value).toBe(wildlife.travelTime.value);
    for(const mesh of meshes) {
      expect(mesh.geometry.getAttribute('aTravel')).toBe(meshes[0]!.geometry.getAttribute('aTravel'));
      expect(position(mesh.geometry,people.travelTime.value)).toBeCloseTo(10+(tick-1020)/6,5);
    }
    expect(position((wildlife.mesh.children[0] as THREE.Mesh).geometry,wildlife.travelTime.value)).toBeCloseTo(10+(tick-1020)/6,5);
  }
  // Same Core instant on both rigs, on either side of a 1024-local-tick rebase.
  const strike={targetId:world.pawns[1]!.id,atCore:10239,untilCore:10359,tool:'head' as const,outcome:'miss' as const};
  delete pawn.motion;delete animal.motion;pawn.state=animal.state='idle';pawn.melee={order:null,strike};animal.strike={...strike};
  timeline.tracks.clear();people.update(world,1,false);
  for(const tick of [1023.9,1024,1024.25]) {
    timeline.tick=tick;people.updateTravel(world,timeline);wildlife.update(world,timeline);
    const humanAt=meshes[0]!.geometry.getAttribute('aMotion').getW(0),animalAt=(wildlife.mesh.children[0] as THREE.Mesh).geometry.getAttribute('aAnimal').getW(0);
    // Both uniforms/attributes reach the GPU as float32. Within the 1024-tick
    // window (~171 s), one ULP is at most 2^-16 seconds, not an arbitrary 5 µs.
    const age=(tick*10-10239)/60;
    expect(humanAt).toBe(animalAt);
    expect(Math.abs(Math.fround(people.travelTime.value)-humanAt-age)).toBeLessThanOrEqual(2**-16);
    expect(Math.abs(Math.fround(wildlife.travelTime.value)-animalAt-age)).toBeLessThanOrEqual(2**-16);
  }
  clearGroup(people.group);wildlife.dispose();
});
