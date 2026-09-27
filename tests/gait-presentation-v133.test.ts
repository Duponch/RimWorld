import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { GaitPhaseTracker,HUMAN_GAIT_RADIANS_PER_UNIT,animalGaitRadiansPerUnit,gaitDistance } from '../src/render/gait-presentation';
import { PawnLayer } from '../src/render/PawnLayer';
import { WildlifeLayer } from '../src/render/WildlifeLayer';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { WORK_POSE,pawnWorkPose } from '../src/render/work-presentation';
import { animalCombatCamp } from './scenarios/animal-combat';

const congruent=(a:number,b:number):boolean=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<1e-5;

test('gait advances by shown distance, not elapsed time, across slowdowns, stopped pieces and pauses',()=>{
  const tracker=new GaitPhaseTracker(),rate=HUMAN_GAIT_RADIANS_PER_UNIT;
  const normal={start:10,end:12,fromX:0,fromZ:0,toX:1,toZ:0};
  const first=tracker.begin(7,normal,10,rate);
  expect(gaitDistance(normal,10.5)).toBeCloseTo(.25);
  expect(gaitDistance(normal,11)).toBeCloseTo(.5);
  expect(tracker.begin(7,normal,11,rate)).toBe(first);
  const slow={...normal,end:14};
  const slowed=tracker.begin(7,slow,11,rate);
  expect(congruent(first+.5*rate,slowed+.25*rate)).toBe(true);
  expect(gaitDistance(slow,11.5)).toBeCloseTo(.375);
  const stopped={start:11.5,end:12.5,fromX:.375,fromZ:0,toX:.375,toZ:0};
  const still=tracker.begin(7,stopped,11.5,rate);
  expect(congruent(still,slowed+.375*rate)).toBe(true);
  expect(gaitDistance(stopped,12.2)).toBe(0);
  tracker.halt(7,12.5,rate);
  const resumed={start:12.5,end:16,fromX:.375,fromZ:0,toX:1,toZ:0};
  const after=tracker.begin(7,resumed,12.5,rate);
  expect(congruent(after,still)).toBe(true);
  expect(gaitDistance(resumed,12.5)).toBe(0); // RAF pause does not cycle a planted foot
  expect(gaitDistance(resumed,14.25)).toBeCloseTo(.3125);
  expect(animalGaitRadiansPerUnit('hare')).toBeGreaterThan(animalGaitRadiansPerUnit('deer'));
});

test('humans and animals share the confirmed edge phase while speed changes, without a frame upload',()=>{
  const world=animalCombatCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.tick=101;
  const edge={from:{x:10,z:10},to:{x:11,z:10},start:100,end:104};
  Object.assign(pawn,{x:11,z:10,state:'moving',motion:edge,path:[]});
  Object.assign(animal,{x:11,z:10,state:'moving',motion:edge});
  const timeline=new MotionTimeline();timeline.tracks.set(pawn.id,[edge]);timeline.tracks.set(animal.id,[edge]);timeline.tick=101;
  const people=new PawnLayer(),wildlife=new WildlifeLayer();people.update(world,1,true);
  people.updateTravel(world,timeline);wildlife.update(world,timeline,true);
  const person=people.feedbackSource!,humanMotion=person.getAttribute('aMotion') as THREE.InstancedBufferAttribute;
  const animalGeometry=(wildlife.mesh.children.find(c=>c.name.includes(animal.species)) as THREE.Mesh).geometry;
  const animalState=animalGeometry.getAttribute('aAnimal') as THREE.InstancedBufferAttribute;
  expect(humanMotion.getX(0)).toBe(1);expect(animalState.getX(0)).toBe(1);
  const humanRate=HUMAN_GAIT_RADIANS_PER_UNIT,animalRate=animalGaitRadiansPerUnit(animal.species);
  const humanAt=(tick:number,end:number)=>humanMotion.getW(0)+Math.max(0,Math.min(1,(tick-100)/(end-100)))*humanRate;
  const animalAt=(tick:number,end:number)=>animalState.getW(0)+Math.max(0,Math.min(1,(tick-100)/(end-100)))*animalRate;
  expect(humanMotion.getY(0)).toBe(0);expect(animalState.getY(0)).toBe(0);
  const beforeHuman=humanAt(101,104),beforeAnimal=animalAt(101,104);
  const version=humanMotion.version,animalVersion=animalState.version;
  timeline.tick=101.5;people.updateTravel(world,timeline);wildlife.update(world,timeline);
  expect(humanMotion.version).toBe(version);expect(animalState.version).toBe(animalVersion);
  expect(humanAt(101.5,104)-beforeHuman).toBeCloseTo(.125*humanRate);
  expect(animalAt(101.5,104)-beforeAnimal).toBeCloseTo(.125*animalRate);
  const slow={...edge,end:108};timeline.tracks.set(pawn.id,[slow]);timeline.tracks.set(animal.id,[slow]);
  people.updateTravel(world,timeline);wildlife.update(world,timeline);
  expect(congruent(humanAt(101.5,108),beforeHuman+.125*humanRate)).toBe(true);
  expect(congruent(animalAt(101.5,108),beforeAnimal+.125*animalRate)).toBe(true);
  timeline.tick=102;people.updateTravel(world,timeline);wildlife.update(world,timeline);
  expect(humanAt(102,108)-humanAt(101.5,108)).toBeCloseTo(.0625*humanRate);
  expect(animalAt(102,108)-animalAt(101.5,108)).toBeCloseTo(.0625*animalRate);
  people.dispose();wildlife.dispose();
});

test('floor tailoring and butchering crouch and keep the animated ground-work pose; real benches stay upright',()=>{
  const world=animalCombatCamp(),pawn=world.pawns[0]!;
  pawn.x=10;pawn.z=10;pawn.state='working';delete pawn.motion;
  const spot={id:900,kind:'crafting-spot' as const,x:10,z:11,orientation:0 as const,footprint:'standard' as const};
  world.structures.push(spot);
  pawn.cooking={stationId:spot.id,phase:'work',actionCell:{x:10,z:11},progress:1} as typeof pawn.cooking;
  expect(pawnWorkPose(pawn,undefined,spot.kind)).toBe(WORK_POSE.ground);
  const layer=new PawnLayer();layer.update(world,1,true);
  const motion=layer.feedbackSource!.getAttribute('aMotion') as THREE.InstancedBufferAttribute;
  expect(motion.getZ(0)).toBe(WORK_POSE.ground);
  expect(motion.getY(0)).toBe(2); // cooking/production gesture continues while crouched
  expect(pawnWorkPose(pawn,undefined,'butcher-spot')).toBe(WORK_POSE.ground);
  expect(pawnWorkPose(pawn,undefined,'tailor-bench')).toBe(WORK_POSE.craft);
  expect(pawnWorkPose(pawn,undefined,'butcher-table')).toBe(WORK_POSE.craft);
  layer.dispose();
});
