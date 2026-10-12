import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { AnimationDetail } from '../src/render/AnimationDetail';
import { ANIMATION_SETTING_LIMITS,DEFAULT_ANIMATION_SETTINGS,parseAnimationSettings } from '../src/render/animation-settings';
import { PawnLayer } from '../src/render/PawnLayer';
import { WildlifeLayer } from '../src/render/WildlifeLayer';
import { MechanoidLayer } from '../src/render/MechanoidLayer';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { animalCombatCamp } from './scenarios/animal-combat';

test('balanced defaults are independent presentation preferences',()=>{
  expect(DEFAULT_ANIMATION_SETTINGS).toEqual({enabled:true,nearPixels:24,farPixels:8,middleHz:12});
  expect(Object.isFrozen(DEFAULT_ANIMATION_SETTINGS)).toBe(true);
  const parsed=parseAnimationSettings(undefined);parsed.nearPixels=50;
  expect(DEFAULT_ANIMATION_SETTINGS.nearPixels).toBe(24);
});

test.each([undefined,null,[],false,42,'not json','null','[]'])('invalid preference %j restores balanced values',(value)=>{
  expect(parseAnimationSettings(value)).toEqual(DEFAULT_ANIMATION_SETTINGS);
});

test('JSON reload retains disabled mode, integer settings and zero rest threshold',()=>{
  const settings={enabled:false,nearPixels:36,farPixels:0,middleHz:20};
  expect(parseAnimationSettings(JSON.stringify(settings))).toEqual(settings);
});

test('each numeric preference rejects nonfinite and string inputs independently',()=>{
  expect(parseAnimationSettings({enabled:'false',nearPixels:NaN,farPixels:Infinity,middleHz:'24'})).toEqual(DEFAULT_ANIMATION_SETTINGS);
  expect(parseAnimationSettings({enabled:false,nearPixels:35.6,farPixels:10.2,middleHz:17.7})).toEqual({enabled:false,nearPixels:36,farPixels:10,middleHz:18});
});

test('UI bounds retain a strictly ordered transition and allow no distant rest',()=>{
  expect(ANIMATION_SETTING_LIMITS.nearPixels).toEqual({min:4,max:96,step:1});
  expect(parseAnimationSettings({nearPixels:1,farPixels:48,middleHz:0})).toEqual({enabled:true,nearPixels:4,farPixels:3,middleHz:1});
  expect(parseAnimationSettings({nearPixels:1000,farPixels:1000,middleHz:1000})).toEqual({enabled:true,nearPixels:96,farPixels:48,middleHz:60});
  expect(parseAnimationSettings({nearPixels:4,farPixels:0})).toEqual({enabled:true,nearPixels:4,farPixels:0,middleHz:12});
});

function pixelsFromUniforms(detail:AnimationDetail,anchor:THREE.Vector3):number {
  const depth=detail.viewDepth.value.dot(new THREE.Vector4(anchor.x,anchor.y,anchor.z,1));
  return detail.projectionScale.value/(detail.perspective.value?Math.max(.0001,depth):1);
}
/** Independent geometric oracle: project two points one cell apart along
 * the camera's up axis, retaining the anchor's view depth. */
function projectedCellPixels(camera:THREE.Camera,anchor:THREE.Vector3,height:number):number {
  const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  const a=anchor.clone().project(camera),b=anchor.clone().add(up).project(camera);
  return Math.abs(b.y-a.y)*height/2;
}

test('orthographic apparent size follows zoom and viewport, independently of actor depth',()=>{
  const camera=new THREE.OrthographicCamera(-20,20,10,-10,.1,1000),detail=new AnimationDetail();
  camera.position.set(15,25,30);camera.lookAt(0,0,0);camera.zoom=2;camera.updateProjectionMatrix();
  detail.updateCamera(camera,1440);
  expect(detail.perspective.value).toBe(0);
  for(const point of [new THREE.Vector3(0,0,0),new THREE.Vector3(5,1,6)]){
    expect(pixelsFromUniforms(detail,point)).toBeCloseTo(projectedCellPixels(camera,point,1440),9);
  }
  const original=detail.projectionScale.value;
  camera.zoom=1;camera.updateProjectionMatrix();detail.updateCamera(camera,720);
  expect(detail.projectionScale.value).toBeCloseTo(original/4);
});

test('perspective uses each anchor view depth, not equal radial camera distances',()=>{
  const camera=new THREE.PerspectiveCamera(60,16/9,.1,1000),detail=new AnimationDetail();
  camera.position.set(0,0,0);camera.lookAt(0,0,-1);camera.updateProjectionMatrix();
  const near=new THREE.Vector3(6,0,-8),far=new THREE.Vector3(0,0,-10);
  expect(near.distanceTo(camera.position)).toBe(far.distanceTo(camera.position));
  detail.updateCamera(camera,1080);
  expect(detail.perspective.value).toBe(1);
  expect(pixelsFromUniforms(detail,near)).toBeCloseTo(projectedCellPixels(camera,near,1080),9);
  expect(pixelsFromUniforms(detail,far)).toBeCloseTo(projectedCellPixels(camera,far,1080),9);
  expect(pixelsFromUniforms(detail,near)).toBeGreaterThan(pixelsFromUniforms(detail,far));
});

test('perspective camera turns and zoom publish the exact new projection without replacing uniforms',()=>{
  const camera=new THREE.PerspectiveCamera(55,16/9,.1,1000),detail=new AnimationDetail();
  const depth=detail.viewDepth,projection=detail.projectionScale;
  camera.position.set(25,20,25);camera.lookAt(4,0,7);camera.zoom=1.6;camera.updateProjectionMatrix();
  detail.updateCamera(camera,1440);
  const anchor=new THREE.Vector3(7,1,9);
  expect(pixelsFromUniforms(detail,anchor)).toBeCloseTo(projectedCellPixels(camera,anchor,1440),9);
  detail.setSettings({enabled:false,nearPixels:40,farPixels:12,middleHz:30});
  expect(detail.viewDepth).toBe(depth);expect(detail.projectionScale).toBe(projection);
  expect(detail.enabled.value).toBe(0);expect(detail.middleHz.value).toBe(30);
});

function motionStreams(...groups:THREE.Object3D[]) {
  const streams:Record<string,number[]>[]=[];
  for(const group of groups)group.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const attributes:Record<string,number[]>={};
    for(const [name,attribute] of Object.entries((object.geometry as THREE.BufferGeometry).attributes)){
      if(/^a(?:From|To|Travel|Motion|Animal|Rig|Gait|Carrier|Corpse|Cargo)/.test(name))attributes[name]=Array.from(attribute.array as ArrayLike<number>);
    }
    if(Object.keys(attributes).length)streams.push(attributes);
  });
  return streams;
}

test('all three rigs retain exact CPU edges, phases and actor ownership through detail switches and stopped clocks',()=>{
  const world=animalCombatCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.tick=101;
  const edge={from:{x:10,z:10},to:{x:11,z:10},start:100,end:104};
  Object.assign(pawn,{x:11,z:10,state:'moving',motion:edge,path:[]});
  Object.assign(animal,{x:11,z:10,state:'moving',motion:edge});
  const mechanical={id:world.nextId++,mechKind:'scyther' as const,state:'moving' as const,x:11,z:10,path:[],motion:edge,heading:0,moveCooldown:0,planCooldown:0};
  world.mechanoids=[mechanical];
  const before=JSON.stringify(world),timeline=new MotionTimeline();
  for(const id of [pawn.id,animal.id,mechanical.id])timeline.tracks.set(id,[edge]);
  const complete=new AnimationDetail(),adjusted=new AnimationDetail();complete.setSettings({...DEFAULT_ANIMATION_SETTINGS,enabled:false});
  const rigs=(detail:AnimationDetail)=>({people:new PawnLayer(undefined,detail),animals:new WildlifeLayer(undefined,undefined,detail),machines:new MechanoidLayer(undefined,detail)});
  const a=rigs(complete),b=rigs(adjusted);
  for(const rig of [a,b])rig.people.update(world,1,true);
  const camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,1000);camera.position.set(10,20,30);camera.lookAt(10,0,10);
  for(const [index,tick] of [101,101.5,101.5,102,103.5,104,104.5].entries()){
    timeline.tick=tick;
    adjusted.setSettings({enabled:true,nearPixels:24,farPixels:index%2 ? 0 : 8,middleHz:index%2 ? 1 : 60});
    camera.zoom=index%2 ? .05 : 20;camera.updateProjectionMatrix();adjusted.updateCamera(camera,720);
    for(const rig of [a,b]){
      rig.people.updateTravel(world,timeline);rig.people.presentCargo(tick,world);
      rig.animals.update(world,timeline,index===0,rig.people);rig.machines.update(world,timeline,index===0,rig.people);
    }
    expect(motionStreams(b.people.group,b.animals.mesh,b.machines.group)).toEqual(motionStreams(a.people.group,a.animals.mesh,a.machines.group));
    expect(b.people.travelTime.value).toBe(a.people.travelTime.value);
    expect(b.animals.travelTime.value).toBe(a.animals.travelTime.value);
    expect(JSON.stringify(world)).toBe(before);
  }
  for(const rig of [a,b]){rig.people.dispose();rig.animals.dispose();rig.machines.dispose();}
});
