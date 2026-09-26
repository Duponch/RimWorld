import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import type { Job } from '../src/sim/types';
import { PawnLayer } from '../src/render/PawnLayer';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { WildlifeLayer } from '../src/render/WildlifeLayer';
import { headingAt,turnToward,TURN_TICKS } from '../src/render/turn-presentation';
import { pawnWorkPose,WORK_POSE } from '../src/render/work-presentation';
import { clearGroup } from '../src/render/primitives';
import { animalCombatCamp } from './scenarios/animal-combat';

test('turns take the short arc, remain continuous when interrupted, and finish quickly',()=>{
  const start={from:0,to:0,startTick:10};
  const east=turnToward(start,Math.PI/2,10);
  expect(headingAt(east,10)).toBeCloseTo(0);
  expect(headingAt(east,10+TURN_TICKS/2)).toBeCloseTo(Math.PI/4);
  expect(headingAt(east,10+TURN_TICKS)).toBeCloseTo(Math.PI/2);
  const reverse=turnToward(east,-Math.PI/2,10+TURN_TICKS/2);
  expect(reverse.from).toBeCloseTo(Math.PI/4);
  expect(Math.abs(reverse.to-reverse.from)).toBeCloseTo(3*Math.PI/4);
  expect(headingAt(reverse,10+TURN_TICKS*1.5)).toBeCloseTo(-Math.PI/2);
  expect(turnToward(reverse,3*Math.PI/2,13)).toBe(reverse);
});

test('real tasks select separate mine, chop, build and fabrication gestures',()=>{
  const world=createWorld(),pawn=world.pawns[0]!;pawn.state='working';
  const job:Job={id:900,kind:'mine',x:8,z:8,orientation:0,footprint:'standard',status:'active',reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0}};
  expect(pawnWorkPose(pawn,job)).toBe(WORK_POSE.mine);
  expect(pawnWorkPose(pawn,{...job,kind:'chop'})).toBe(WORK_POSE.chop);
  expect(pawnWorkPose(pawn,{...job,kind:'wall'})).toBe(WORK_POSE.build);
  pawn.cooking={stationId:1,billId:1,phase:'work',progress:0} as typeof pawn.cooking;
  expect(pawnWorkPose(pawn,undefined)).toBe(WORK_POSE.craft);
  pawn.state='moving';expect(pawnWorkPose(pawn,job)).toBe(0);
});

test('human and animal headings turn in their resident shared pose streams without a per-frame buffer update',()=>{
  const world=animalCombatCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.tick=50;pawn.x=10;pawn.z=10;animal.x=10;animal.z=10;delete pawn.motion;delete animal.motion;
  const people=new PawnLayer(),wildlife=new WildlifeLayer(),timeline=new MotionTimeline();
  people.update(world,1,true);timeline.tick=50;people.updateTravel(world,timeline);wildlife.update(world,timeline,true);
  const human=people.feedbackSource!,beast=(wildlife.mesh.children[0] as THREE.Mesh).geometry;
  const humanFrom=human.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
  const humanTo=human.getAttribute('aTo') as THREE.InstancedBufferAttribute;
  const beastFrom=beast.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
  const beastTo=beast.getAttribute('aTo') as THREE.InstancedBufferAttribute;
  const edge={from:{x:10,z:10},to:{x:11,z:10},start:51,end:54};
  pawn.state='moving';animal.state='moving';pawn.motion=edge;animal.motion=edge;
  timeline.tracks.set(pawn.id,[edge]);timeline.tracks.set(animal.id,[edge]);timeline.tick=51;
  people.updateTravel(world,timeline);wildlife.update(world,timeline);
  expect(humanFrom.getW(0)).not.toBeCloseTo(humanTo.getW(0));
  expect(beastFrom.getW(0)).not.toBeCloseTo(beastTo.getW(0));
  const humanVersion=humanFrom.version,beastVersion=beastFrom.version;
  timeline.tick=51.5;people.updateTravel(world,timeline);wildlife.update(world,timeline);
  expect(humanFrom.version).toBe(humanVersion);expect(beastFrom.version).toBe(beastVersion);
  expect(human.getAttribute('aFrom')).toBe((people.group.children[1] as THREE.Mesh).geometry.getAttribute('aFrom'));
  clearGroup(people.group);wildlife.dispose();
});
