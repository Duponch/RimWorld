import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {ActorAnimationCache,sampleActorRoot} from '../src/render/ActorAnimationCache';
import {sampleAnimalRig,samplePawnRig} from '../src/render/actor-animation-sampling';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {DEFAULT_ANIMATION_SETTINGS} from '../src/render/animation-settings';
import {PawnLayer} from '../src/render/PawnLayer';
import {WildlifeLayer} from '../src/render/WildlifeLayer';
import {MechanoidLayer} from '../src/render/MechanoidLayer';
import {MotionTimeline} from '../src/render/MotionTimeline';
import {WORK_POSE} from '../src/render/work-presentation';
import {TICKS_PER_SECOND} from '../src/sim/types';
import {animalCombatCamp} from './scenarios/animal-combat';

const stream=(values:number[])=>new THREE.Float32BufferAttribute(values,4);
function camera(pixels:number){const c=new THREE.OrthographicCamera(-360/pixels,360/pixels,360/pixels,-360/pixels,.1,1000);c.position.set(0,20,20);c.lookAt(0,0,0);c.updateProjectionMatrix();return c;}
function capture(cache:ActorAnimationCache,detail:AnimationDetail,x:number){return cache.sample(0,0,0,0,1,()=>cache.setRoot(0,{x,y:0,z:0,yaw:.4},detail.frameTick/TICKS_PER_SECOND,detail.frameTick/TICKS_PER_SECOND,detail.frameTick/TICKS_PER_SECOND,1));}

test('root sampler preserves partial-edge height and the independent fast turn',()=>{
  const from=stream([2,0,3,0]),to=stream([4,1,5,Math.PI]),travel=stream([10,12,0,1]);
  const root=sampleActorRoot(from,to,travel,0,10.1,1);
  expect(root.x).toBeCloseTo(2.1,10);expect(root.z).toBeCloseTo(3.1,10);expect(root.y).toBeCloseTo(.15,10);
  expect(root.yaw).toBeCloseTo(to.getW(0)*(.1/.24),6);
  from.setY(0,1);to.setY(0,0);expect(sampleActorRoot(from,to,travel,0,11.8,1).y).toBeCloseTo(.3,10);
});

test('stationary approach and facing keep independent origins, with reusable result storage',()=>{
  const from=stream([0,2,0,0]),to=stream([2,2,0,1]),travel=stream([10,12,10.5,2]),out={x:9,y:9,z:9,yaw:9};
  expect(sampleActorRoot(from,to,travel,0,10.5,1,out)).toBe(out);expect(out).toEqual({x:.5,y:2,z:0,yaw:0});
  expect(sampleActorRoot(from,to,travel,0,10.74,1,out).yaw).toBeCloseTo(1,6);
});

test.each([1,6])('middle uses actual 12Hz deadlines at simulation speed %s',speed=>{
  const detail=new AnimationDetail(),cache=new ActorAnimationCache(detail),c=camera(16);cache.reconcile(0,1,'alive');
  detail.beginFrame(0,c,720,100);expect(capture(cache,detail,1)).toBe(true);
  detail.beginFrame(50,c,720,100+speed*TICKS_PER_SECOND*.05);expect(capture(cache,detail,2)).toBe(false);expect(cache.cpuPose(0)!.x).toBe(1);
  detail.beginFrame(84,c,720,100+speed*TICKS_PER_SECOND*.084);expect(capture(cache,detail,3)).toBe(true);expect(cache.cpuPose(0)!.x).toBe(3);
  expect(cache.cpuClock(0,'time')).toBeCloseTo(detail.frameTick/TICKS_PER_SECOND,5);cache.dispose();
});

test('far freezes a resident pose while current physical time advances, then resumes current state once',()=>{
  const detail=new AnimationDetail(),cache=new ActorAnimationCache(detail);cache.reconcile(0,1,'alive');
  detail.beginFrame(0,camera(4),720,100);capture(cache,detail,1);
  detail.beginFrame(5000,camera(4),720,500);expect(capture(cache,detail,30)).toBe(false);expect(cache.cpuPose(0)!.x).toBe(1);
  detail.beginFrame(5001,camera(16),720,501);expect(capture(cache,detail,31)).toBe(true);expect(cache.cpuPose(0)!.x).toBe(31);
  detail.beginFrame(5002,camera(30),720,502);expect(capture(cache,detail,32)).toBe(false);expect(cache.cpuPose(0)).toBeUndefined();cache.dispose();
});

test('near and disabled modes bypass CPU rig evaluation',()=>{
  const detail=new AnimationDetail(),cache=new ActorAnimationCache(detail);cache.reconcile(0,1,'alive');let writes=0;
  detail.beginFrame(0,camera(30),720,100);cache.sample(0,0,0,0,1,()=>writes++);
  detail.setSettings({...DEFAULT_ANIMATION_SETTINGS,enabled:false});detail.beginFrame(1,camera(1),720,200);cache.sample(0,0,0,0,1,()=>writes++);
  expect(writes).toBe(0);expect(cache.cpuPose(0)).toBeUndefined();cache.dispose();
});

test('whole-batch near bypass revokes old displayed roots once and respects the smallest member',()=>{
  const detail=new AnimationDetail(),cache=new ActorAnimationCache(detail);cache.reconcile(0,1,'alive');
  detail.beginFrame(0,camera(4),720,100);capture(cache,detail,1);const publication=cache.cpuPublication(0);
  detail.beginFrame(1,camera(30),720,101);expect(cache.prepareOriginalOnly()).toBe(true);expect(cache.cpuPose(0)).toBeUndefined();
  expect(cache.prepareOriginalOnly()).toBe(true);expect(cache.cpuPublication(0)).toBe(publication);
  cache.reconcile(0,2,'replacement');const child=new ActorAnimationCache(detail);child.reconcile(0,3,'held:2');
  expect(child.shouldCaptureLinked(0,cache,0)).toBe(false);expect(child.cpuPose(0)).toBeUndefined();child.dispose();
  cache.setMinimumScale(.5);expect(cache.prepareOriginalOnly()).toBe(false);expect(cache.sample(0,0,0,0,.5,()=>cache.setRoot(0,{x:7,y:0,z:0,yaw:0},1,1,1,1))).toBe(true);
  expect(cache.cpuPose(0)!.x).toBe(7);cache.dispose();
});

test('membership, owner/anatomy signatures and controller reset revoke frozen samples immediately',()=>{
  const detail=new AnimationDetail(),cache=new ActorAnimationCache(detail),c=camera(4);cache.reconcile(0,1,'alive');detail.beginFrame(0,c,720,100);capture(cache,detail,1);
  cache.reconcile(0,1,'alive');detail.beginFrame(1,c,720,101);expect(capture(cache,detail,2)).toBe(false);
  cache.reconcile(0,1,'carried:limb-missing');expect(cache.cpuPose(0)).toBeUndefined();expect(capture(cache,detail,3)).toBe(true);
  cache.reconcile(0,2,'alive');expect(capture(cache,detail,4)).toBe(true);expect(cache.cpuPose(0)!.x).toBe(4);
  detail.reset();detail.beginFrame(2,c,720,102);expect(capture(cache,detail,5)).toBe(true);cache.dispose();
});

test('held children share parent publications, including same-tick structural changes and near return',()=>{
  const detail=new AnimationDetail(),parent=new ActorAnimationCache(detail),child=new ActorAnimationCache(detail),c=camera(4);
  parent.reconcile(0,1,'alive');child.reconcile(0,2,'held:1');detail.beginFrame(0,c,720,100);capture(parent,detail,1);
  let writes=0;const write=()=>{writes++;child.setRoot(0,parent.cpuPose(0)!,1,1,1,1);};
  expect(child.sampleLinked(0,parent,0,write)).toBe(true);expect(child.sampleLinked(0,parent,0,write)).toBe(false);
  parent.reconcile(0,1,'missing-limb');capture(parent,detail,2);expect(child.sampleLinked(0,parent,0,write)).toBe(true);expect(child.cpuPose(0)).toEqual(parent.cpuPose(0));
  detail.beginFrame(1,camera(30),720,101);capture(parent,detail,3);child.sampleLinked(0,parent,0,write);expect(child.cpuPose(0)).toBeUndefined();expect(writes).toBe(2);parent.dispose();child.dispose();
});

test('clock origin changes preserve frozen coefficients and use each live clock domain',()=>{
  const detail=new AnimationDetail(),cache=new ActorAnimationCache(detail);cache.reconcile(0,1,'alive');
  cache.setOrigins(0,1024);detail.beginFrame(0,camera(4),720,1023.25);
  cache.sample(0,0,0,0,1,()=>{cache.setRoot(0,{x:2,y:3,z:4,yaw:.5},.7,1023.25/TICKS_PER_SECOND,.25/TICKS_PER_SECOND,1);cache.set(0,8,.6,.8);});
  const pose=cache.cpuPose(0),publication=cache.cpuPublication(0);cache.setOrigins(1024,2048);
  // The resident palette stores Float32 clocks; rebasing must preserve that
  // encoded value, rather than restore precision absent from the texture.
  expect(cache.cpuClock(0,'travelTime')!+1024/TICKS_PER_SECOND).toBe(Math.fround(1023.25/TICKS_PER_SECOND));
  expect(cache.cpuClock(0,'cargoTime')!+2048/TICKS_PER_SECOND).toBeCloseTo(Math.fround(.25/TICKS_PER_SECOND)+1024/TICKS_PER_SECOND,10);
  expect(cache.cpuClock(0,'time')).toBe(Math.fround(.7));expect(cache.cpuPose(0)).toEqual(pose);
  expect(cache.cpuPublication(0)).toBe(publication);expect(cache.get(0,8,0)).toBe(Math.fround(.6));cache.dispose();
});

test.each([4,16])('live pickup ownership survives clock origin 1024 at %s pixels without waking retained poses',pixels=>{
  const previous=animalCombatCamp(),pawn=previous.pawns[0]!;previous.tick=1023;
  Object.assign(pawn,{x:10,z:10,state:'idle',motion:undefined,path:[]});
  previous.piles=[{id:previous.nextId++,kind:'wood',item:'wood',quantity:5,owner:{type:'ground',x:10,z:10}}];
  const current=structuredClone(previous),id=pawn.id;current.piles[0]!.owner={type:'pawn',pawnId:id};
  const previousExact=JSON.stringify(previous),currentExact=JSON.stringify(current),detail=new AnimationDetail(),people=new PawnLayer(undefined,detail),timeline=new MotionTimeline();
  people.update(previous,1,true);people.adoptCargo(previous,current,1023,true);people.update(current,1,false);
  const step=(ms:number,tick:number)=>{timeline.tick=tick;people.time.value=tick/TICKS_PER_SECOND;
    people.updateTravel(current,timeline);people.presentCargo(tick,current);detail.beginFrame(ms,camera(pixels),720,tick);people.presentAnimations();};
  const cargo=people.feedbackSource!.getAttribute('aCargo');
  step(0,1023.25);const pose=people.presentedPose(id),publication=people.animationCache.cpuPublication(0);
  const progress=()=> (people.animationCache.cpuClock(0,'cargoTime')!-cargo.getZ(0))/(Math.abs(cargo.getW(0))-cargo.getZ(0));
  const before=progress();expect(before).toBeCloseTo(1/6,4);expect(cargo.getZ(0)).toBeGreaterThan(0);
  step(1,1024.25);expect(cargo.getZ(0)).toBeLessThan(0);expect(progress()).toBeCloseTo(before,4);
  expect(people.presentedPose(id)).toEqual(pose);expect(people.animationCache.cpuPublication(0)).toBe(publication);
  expect(current.piles[0]!.owner).toEqual({type:'pawn',pawnId:id});
  people.presentCargo(1024.6,current);expect(cargo.getW(0)).toBe(0);
  expect(JSON.stringify(previous)).toBe(previousExact);expect(JSON.stringify(current)).toBe(currentExact);people.dispose();
});

test('palette grows only its resident capacity and preserves existing Float32 rows',()=>{
  const detail=new AnimationDetail(),cache=new ActorAnimationCache(detail);cache.reconcile(0,10,'a');cache.set(0,8,.123456789,.987654321);
  cache.reconcile(7,17,'b');cache.ensureCapacity(3);expect(cache.get(0,8,0)).toBe(Math.fround(.123456789));expect(cache.get(0,8,1)).toBe(Math.fround(.987654321));
  expect(cache.cpuPose(99)).toBeUndefined();cache.dispose();
});

test('work gestures and weighted animal neck coefficients are evaluated at the captured clock',()=>{
  const detail=new AnimationDetail(),cache=new ActorAnimationCache(detail),g=new THREE.BufferGeometry();
  for(const [name,data] of Object.entries({aMotion:[0,1,WORK_POSE.mine,0],aFrom:[0,0,0,0],aCargo:[0,0,0,0],aShape:[0,0,0,0],aHairBlood:[0,0,0,0]}))g.setAttribute(name,stream(data));
  const root={x:0,y:0,z:0,yaw:0};cache.ensureCapacity(1);samplePawnRig(cache,0,g,root,.7,.7);
  expect(cache.get(0,11,0)).toBeCloseTo(Math.cos(Math.sin(.7*11)*.78-1.44),6);
  g.setAttribute('aAnimal',stream([0,1,0,0]));g.setAttribute('aCarrier',stream([0,0,0,0]));sampleAnimalRig(cache,0,g,root,.7,.7,1,[0,1,2,3,4.35]);
  expect(cache.get(0,12,0)).toBeCloseTo(Math.cos((Math.sin(.7*5)*.12+.48)*.35),6);g.dispose();cache.dispose();
});

test('legacy GPU actor streams retain rig captures while presented XYZ follows the live roots',()=>{
  const world=animalCombatCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  // Historical renderer-only adapter for the synthetic100..104 edge below.
  // This does not declare a valid296 Engine World, Raw save or Native receipt.
  (world as {schemaVersion:number}).schemaVersion=296;
  const edge={from:{x:10,z:10},to:{x:11,z:10},start:100,end:104};world.tick=101;
  Object.assign(pawn,{x:11,z:10,state:'moving',motion:edge,path:[]});Object.assign(animal,{x:11,z:10,state:'moving',motion:edge});
  const mech={id:world.nextId++,mechKind:'scyther' as const,state:'moving' as const,x:11,z:10,path:[],motion:edge,heading:0,moveCooldown:0,planCooldown:0};world.mechanoids=[mech];
  const before=JSON.stringify(world),detail=new AnimationDetail(),people=new PawnLayer(undefined,detail),animals=new WildlifeLayer(undefined,undefined,detail),machines=new MechanoidLayer(undefined,detail),timeline=new MotionTimeline();
  for(const id of [pawn.id,animal.id,mech.id])timeline.tracks.set(id,[edge]);people.update(world,1,true);
  const step=(ms:number,tick:number,pixels:number)=>{timeline.tick=tick;people.time.value=tick/TICKS_PER_SECOND;
    people.updateTravel(world,timeline);people.presentCargo(tick,world);animals.update(world,timeline,false,people);machines.update(world,timeline,false,people);
    detail.beginFrame(ms,camera(pixels),720,tick);people.presentAnimations();animals.presentAnimations(people);machines.presentAnimations(people);};
  step(0,101,4);const first=people.presentedPose(pawn.id)!;expect(first).toBeDefined();const firstX=first.x;
  const animalBody=animals.mesh.children.find(child=>child.name.startsWith(`Wild ${animal.species} `)) as THREE.Mesh|undefined;
  const machineBody=machines.group.children.find(child=>child.name.startsWith(`${mech.mechKind} bodies `)) as THREE.Mesh|undefined;
  if(!animalBody||!machineBody)throw Error('Declared actor rig geometry missing');
  const geometries=[people.feedbackSource!,animalBody.geometry,machineBody.geometry];
  const captured=(geometry:THREE.BufferGeometry)=>{
    const cache=geometry.userData.animationCache as ActorAnimationCache,rig:number[]=[];
    for(let cell=3;cell<63;cell++)for(let component=0;component<4;component++)rig.push(cache.get(0,cell,component));
    return {pose:cache.cpuPose(0),publication:cache.cpuPublication(0),rig,clocks:[cache.cpuClock(0,'time'),cache.cpuClock(0,'travelTime'),cache.cpuClock(0,'cargoTime'),cache.cpuClock(0,'blend')]};
  };
  const captures=geometries.map(captured);expect(captures.every(capture=>capture.pose!==undefined)).toBe(true);
  step(400,103,4);expect(geometries.map(captured)).toEqual(captures);expect(people.travelTime.value).toBe(103/TICKS_PER_SECOND);
  const live=(geometry:THREE.BufferGeometry)=>sampleActorRoot(geometry.getAttribute('aFrom'),geometry.getAttribute('aTo'),geometry.getAttribute('aTravel'),0,people.travelTime.value,people.blend.value);
  const humanLive=live(geometries[0]!),animalLive=live(geometries[1]!),machineLive=live(geometries[2]!);
  const human=people.presentedPose(pawn.id)!;expect(human.x).toBeCloseTo(humanLive.x,5);expect(human.y).toBeCloseTo(humanLive.y,5);expect(human.z).toBeCloseTo(humanLive.z,5);expect(human.x).toBeGreaterThan(firstX);
  const wildlife=animals.presentedPose(animal.id)!;expect(wildlife.x).toBeCloseTo(animalLive.x,5);expect(wildlife.y).toBeCloseTo(animalLive.y,5);expect(wildlife.z).toBeCloseTo(animalLive.z,5);
  let machineX=0,machineY=0,machineZ=0;machines.forEachPose((id,x,y,z)=>{if(id===mech.id){machineX=x;machineY=y;machineZ=z;}});expect(machineX).toBeCloseTo(machineLive.x,5);expect(machineY).toBeCloseTo(machineLive.y,5);expect(machineZ).toBeCloseTo(machineLive.z,5);
  step(401,103.5,30);expect(people.presentedPose(pawn.id)).toBeUndefined();expect(animals.presentedPose(animal.id)).toEqual(live(geometries[1]!));expect(JSON.stringify(world)).toBe(before);
  people.dispose();animals.dispose();machines.dispose();
});
