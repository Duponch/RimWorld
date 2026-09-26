import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import type { Job } from '../src/sim/types';
import { PawnLayer } from '../src/render/PawnLayer';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { WildlifeLayer } from '../src/render/WildlifeLayer';
import { headingAt,turnToward,TURN_TICKS } from '../src/render/turn-presentation';
import { pawnWorkPose,workApproach,WORK_POSE } from '../src/render/work-presentation';
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
  expect(pawnWorkPose(pawn,{...job,kind:'sow'})).toBe(WORK_POSE.ground);
  expect(pawnWorkPose(pawn,{...job,kind:'harvest'})).toBe(WORK_POSE.ground);
  pawn.cooking=null;pawn.research={stationId:1,spot:{x:8,z:8},worked:0};
  expect(pawnWorkPose(pawn,undefined)).toBe(WORK_POSE.craft);
  pawn.state='moving';expect(pawnWorkPose(pawn,job)).toBe(0);
});

test('work reach stays inside the neighbouring target clearance and rejects distant or absent targets',()=>{
  const actor={x:10,z:10};
  expect(workApproach(actor,{x:10,z:11})).toEqual({x:0,z:.42});
  expect(workApproach(actor,{x:10,z:11},.72).z).toBeCloseTo(.28);
  expect(workApproach(actor,{x:10,z:10})).toEqual({x:0,z:0});
  expect(workApproach(actor,{x:10,z:12})).toEqual({x:0,z:0});
  expect(workApproach(actor,undefined)).toEqual({x:0,z:0});
});

test('confirmed tree work approaches and releases smoothly without moving the logical cell or accumulating offset',()=>{
  const world=createWorld(),pawn=world.pawns[0]!;
  pawn.x=10;pawn.z=10;pawn.state='idle';delete pawn.motion;world.tick=50;
  const layer=new PawnLayer(),timeline=new MotionTimeline();
  layer.update(world,1,true);timeline.tick=50;layer.updateTravel(world,timeline);
  const geometry=layer.feedbackSource!,from=geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
  const to=geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute;
  expect(to.getZ(0)).toBe(10);
  const job:Job={id:900,kind:'chop',x:10,z:11,orientation:0,footprint:'standard',status:'active',reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0}};
  world.jobs.push(job);pawn.jobId=job.id;pawn.state='working';world.tick=51;
  layer.update(world,1,false);timeline.tick=51;layer.updateTravel(world,timeline);
  expect(pawn.z).toBe(10);
  expect(from.getZ(0)).toBeCloseTo(10);
  expect(to.getZ(0)).toBeCloseTo(10.42);
  expect((geometry.getAttribute('aMotion') as THREE.InstancedBufferAttribute).getZ(0)).toBe(WORK_POSE.chop);
  const version=from.version;timeline.tick=51.5;layer.updateTravel(world,timeline);
  expect(from.version).toBe(version);
  // Switching to low work at the same target stops the approach while the
  // earlier heading may still be rotating: the two clocks must not reset.
  job.kind='sow';world.tick=52;
  layer.update(world,1,false);timeline.tick=52;layer.updateTravel(world,timeline);
  expect(from.getZ(0)).toBeGreaterThan(10);
  expect(from.getZ(0)).toBeLessThan(10.42);
  expect(to.getZ(0)).toBeCloseTo(10);
  const travel=geometry.getAttribute('aTravel') as THREE.InstancedBufferAttribute;
  expect(travel.getW(0)).toBe(2);
  expect(travel.getX(0)).toBeCloseTo(52/6);
  expect(travel.getZ(0)).toBeCloseTo(51/6);
  pawn.state='idle';pawn.jobId=null;world.jobs=[];world.tick=53;
  layer.update(world,1,false);timeline.tick=53;layer.updateTravel(world,timeline);
  expect(to.getZ(0)).toBeCloseTo(10);
  expect(pawn.z).toBe(10);
  clearGroup(layer.group);
});

test('hare melee uses the low strike while human melee retains the original gesture',()=>{
  const world=animalCombatCamp(),pawn=world.pawns[0]!,hare=world.wildlife!.animals[0]!;
  pawn.melee={order:null,strike:{targetId:hare.id,atCore:0,untilCore:60,tool:'head',outcome:'miss'}};
  const layer=new PawnLayer();layer.update(world,1,true);
  const motion=layer.feedbackSource!.getAttribute('aMotion') as THREE.InstancedBufferAttribute;
  expect(motion.getZ(0)).toBe(WORK_POSE.groundMelee);
  pawn.melee.strike!.targetId=world.pawns[1]!.id;layer.update(world,1,false);
  expect(motion.getZ(0)).toBe(8);
  clearGroup(layer.group);
});

test('a finished approach remains at its contact pose across worker snapshots',()=>{
  const world=createWorld(),pawn=world.pawns[0]!;
  pawn.x=10;pawn.z=10;pawn.state='working';pawn.jobId=903;delete pawn.motion;world.tick=30;
  world.jobs=[{id:903,kind:'chop',x:10,z:11,orientation:0,footprint:'standard',status:'active',reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0}}];
  const layer=new PawnLayer(),timeline=new MotionTimeline();
  layer.update(world,1,true);timeline.tick=30;layer.updateTravel(world,timeline);
  world.tick=33;layer.update(world,0,false);timeline.tick=33;layer.updateTravel(world,timeline);
  const g=layer.feedbackSource!,from=g.getAttribute('aFrom') as THREE.InstancedBufferAttribute,to=g.getAttribute('aTo') as THREE.InstancedBufferAttribute;
  expect(from.getZ(0)).toBeCloseTo(10.42);
  expect(to.getZ(0)).toBeCloseTo(10.42);
  expect((g.getAttribute('aTravel') as THREE.InstancedBufferAttribute).getY(0)).toBe(0);
  clearGroup(layer.group);
});

test('bench contact stays outside its surface; ground work and travel stay on their cell path',()=>{
  const world=createWorld(),pawn=world.pawns[0]!;
  pawn.x=10;pawn.z=10;pawn.state='working';delete pawn.motion;world.tick=20;
  world.structures.push({id:900,kind:'research-bench',x:10,z:11,orientation:0,footprint:'standard'});
  pawn.research={stationId:900,spot:{x:10,z:10},worked:0};
  const layer=new PawnLayer(),timeline=new MotionTimeline();
  layer.update(world,1,true);timeline.tick=20;layer.updateTravel(world,timeline);
  const geometry=layer.feedbackSource!,to=geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute;
  expect(to.getZ(0)).toBeCloseTo(10.28);
  expect(geometry.getAttribute('aFrom')).toBe((layer.group.children[1] as THREE.Mesh).geometry.getAttribute('aFrom'));
  expect(geometry.getAttribute('aFrom')).toBe((layer.group.children[3] as THREE.Mesh).geometry.getAttribute('aFrom'));
  pawn.research=undefined;
  const job:Job={id:901,kind:'sow',x:10,z:11,orientation:0,footprint:'standard',status:'active',reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0}};
  world.jobs.push(job);pawn.jobId=job.id;world.tick=21;
  layer.update(world,1,false);timeline.tick=21;layer.updateTravel(world,timeline);
  expect(to.getZ(0)).toBe(10);
  expect((geometry.getAttribute('aMotion') as THREE.InstancedBufferAttribute).getZ(0)).toBe(WORK_POSE.ground);
  pawn.state='moving';pawn.jobId=null;world.tick=22;
  layer.update(world,1,false);timeline.tick=22;layer.updateTravel(world,timeline);
  expect(to.getZ(0)).toBe(10);
  clearGroup(layer.group);
});

test('departure from a reached work pose joins the confirmed edge and converges on its real endpoint',()=>{
  const world=createWorld(),pawn=world.pawns[0]!;
  pawn.x=10;pawn.z=10;pawn.state='working';delete pawn.motion;world.tick=30;
  const job:Job={id:902,kind:'chop',x:10,z:11,orientation:0,footprint:'standard',status:'active',reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0}};
  world.jobs.push(job);pawn.jobId=job.id;
  const layer=new PawnLayer(),timeline=new MotionTimeline();
  layer.update(world,1,true);timeline.tick=30;layer.updateTravel(world,timeline);
  const geometry=layer.feedbackSource!,from=geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
  const to=geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute;
  expect(to.getZ(0)).toBeCloseTo(10.42);
  pawn.state='moving';pawn.jobId=null;world.tick=31;
  const edge={from:{x:10,z:10},to:{x:10,z:9},start:31,end:34};
  timeline.tracks.set(pawn.id,[edge]);layer.update(world,1,false);timeline.tick=31;layer.updateTravel(world,timeline);
  expect(from.getZ(0)).toBeCloseTo(10.42);
  expect(to.getZ(0)).toBeCloseTo(9);
  const first={...edge,edgeStart:31,fromFraction:0,toFraction:.5,end:32.5};
  const second={...edge,edgeStart:31,fromFraction:.5,toFraction:1,start:32.5};
  timeline.tracks.set(pawn.id,[first,second]);timeline.tick=32.5;layer.updateTravel(world,timeline);
  expect(from.getZ(0)).toBeCloseTo(9.5+.42*.5);
  expect(to.getZ(0)).toBeCloseTo(9);
  clearGroup(layer.group);
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
