import {expect,test,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {PawnLayer} from '../src/render/PawnLayer';
import {WildlifeLayer} from '../src/render/WildlifeLayer';
import {MechanoidLayer} from '../src/render/MechanoidLayer';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {ActorAnimationCache} from '../src/render/ActorAnimationCache';
import {MotionTimeline} from '../src/render/MotionTimeline';
import * as rigSampling from '../src/render/actor-animation-sampling';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine';
import {effectiveCore297} from '../src/sim/core-phase-297';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction';
import {animalCombatCamp} from './scenarios/animal-combat';
import {mechanoidCombatCamp} from './scenarios/mechanoid-combat-v213';
import type {World} from '../src/sim/types';

/** Prospective CPU path contracts, NOT run by their author. Genuine fixture
 * Worlds/commands/Engine acquire states; presentation never advances a World.
 * Cache flags select the production original graph and public getter domain.
 * Pixel continuity and GPU cost belong to the separate actual draw contract. */
function camera(pixels:number){const c=new THREE.OrthographicCamera(-360/pixels,360/pixels,360/pixels,-360/pixels,.1,1000);c.position.set(0,20,20);c.lookAt(0,0,0);c.updateProjectionMatrix();return c;}
function whole(w:World){expect(validateWorld(w)).toStrictEqual([]);const raw=serializeWorld(w),loaded=deserializeWorld(raw);expect(validateWorld(loaded)).toStrictEqual([]);expect(serializeWorld(loaded)).toBe(raw);return raw;}
function working(){
 const w=deconstructionCamp(1,32),p=w.pawns[0]!,wall=fixtureBuilding(w,'wall',p.x+1,p.z);
 expect(Number(w.schemaVersion)).toBe(297);
 expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:wall.x,z:wall.z}).ok).toBe(true);
 const job=w.jobs.find(j=>j.kind==='deconstruct');if(!job)throw Error('Actual deconstruction command created no job');
 expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok).toBe(true);
 for(let n=0;n<180&&p.state!=='working';n++)advanceWorldCore297(w);
 expect(p.state).toBe('working');whole(w);return{w,p};
}
function person(w:World){const detail=new AnimationDetail(),layer=new PawnLayer(undefined,detail),timeline=new MotionTimeline();timeline.tick=effectiveCore297(w)/10;layer.update(w,1,true);layer.updateTravel(w,timeline,0,0);return{detail,layer,timeline};}
function pawnFrame(s:ReturnType<typeof person>,ms:number,pixels:number){s.layer.time.value=s.timeline.tick/6;s.detail.beginFrame(ms,camera(pixels),720,s.timeline.tick);s.layer.presentAnimations();}
function body(group:THREE.Group,prefix:string){const mesh=group.children.find(c=>c.name.startsWith(prefix)) as THREE.Mesh|undefined;if(!mesh)throw Error('Actual resident body missing: '+prefix);return mesh.geometry as THREE.InstancedBufferGeometry;}
function cacheFor(g:THREE.BufferGeometry){const cache=g.userData.animationCache as ActorAnimationCache|undefined;if(!cache)throw Error('Actual geometry has no production actor cache');return cache;}

test('a real working pawn selects its continuous original middle rig without CPU pose publications or World mutation',()=>{
 const {w,p}=working(),before=whole(w),s=person(w),spy=vi.spyOn(rigSampling,'samplePawnRig');
 try{
  const geometry=s.layer.feedbackSource;if(!geometry)throw Error('Actual pawn streams missing');
  const motion=geometry.getAttribute('aMotion');expect(motion.getZ(0)).not.toBe(18);expect(motion.getZ(0)).not.toBe(19);
  pawnFrame(s,0,4);const oldPublication=s.layer.animationCache.cpuPublication(0);expect(oldPublication).toBeGreaterThan(0);expect(s.layer.animationCache.cpuPose(0)).toBeDefined();
  spy.mockClear();
  for(const ms of [1,20,40,84,100]){
   pawnFrame(s,ms,16);expect(s.detail.classify(p.x,0,p.z)).toBe(1);
   expect(s.layer.animationCache.get(0,1,3)).toBe(0);
   expect(s.layer.animationCache.cpuPose(0)).toBeUndefined();expect(s.layer.presentedPose(p.id)).toBeUndefined();
   expect(s.layer.animationCache.cpuClock(0,'time')).toBeUndefined();
   expect(s.layer.animationCache.cpuPublication(0)).toBe(oldPublication);
   expect(spy.mock.calls).toHaveLength(0);expect(s.layer.feedbackSource).toBe(geometry);expect(serializeWorld(w)).toBe(before);
  }
  // Near still takes the existing original graph; far still captures once.
  pawnFrame(s,101,32);expect(s.layer.animationCache.cpuPose(0)).toBeUndefined();expect(spy.mock.calls).toHaveLength(0);
  pawnFrame(s,102,4);expect(s.layer.animationCache.cpuPose(0)).toBeDefined();const farPublication=s.layer.animationCache.cpuPublication(0),farCalls=spy.mock.calls.length;
  pawnFrame(s,3000,4);expect(s.layer.animationCache.cpuPublication(0)).toBe(farPublication);expect(spy.mock.calls).toHaveLength(farCalls);
  expect(serializeWorld(w)).toBe(before);whole(w);
 }finally{spy.mockRestore();s.layer.dispose();}
});

test('standing animal breathing and an actually moving or striking mech use the original middle graph while far stays retained',()=>{
 const animalsWorld=animalCombatCamp(),animal=animalsWorld.wildlife!.animals[0]!,fight=mechanoidCombatCamp(),mechanical={world:fight.w,actor:fight.m},m=mechanical.actor;
 for(let n=0;n<180&&!m.motion&&!m.melee?.strike;n++)advanceWorldCore297(mechanical.world);
 expect(!!m.motion||!!m.melee?.strike).toBe(true);
 const animalRaw=whole(animalsWorld),mechRaw=whole(mechanical.world),detail=new AnimationDetail(),wild=new WildlifeLayer(undefined,undefined,detail),machines=new MechanoidLayer(undefined,detail),timeline=new MotionTimeline();
 const animalSpy=vi.spyOn(rigSampling,'sampleAnimalRig'),mechSpy=vi.spyOn(rigSampling,'sampleMechRig');
 try{
  timeline.tick=effectiveCore297(animalsWorld)/10;wild.update(animalsWorld,timeline,true);
  timeline.tick=effectiveCore297(mechanical.world)/10;machines.update(mechanical.world,timeline,true);
  const ag=body(wild.mesh,'Wild '+animal.species+' '),mg=body(machines.group,m.mechKind+' bodies '),ac=cacheFor(ag),mc=cacheFor(mg);
  expect(ag.getAttribute('aAnimal').getZ(0)).toBe(0);expect(ag.getAttribute('aAnimal').getX(0)).toBe(0);
  expect(mg.getAttribute('aRig').getX(0)>.5||mg.getAttribute('aRig').getZ(0)>0).toBe(true);
  const tick=Math.max(effectiveCore297(animalsWorld),effectiveCore297(mechanical.world))/10;
  const frame=(ms:number,pixels:number)=>{detail.beginFrame(ms,camera(pixels),720,tick);wild.presentAnimations();machines.presentAnimations();};
  frame(0,4);expect(ac.cpuPose(0)).toBeDefined();expect(mc.cpuPose(0)).toBeDefined();const ap=ac.cpuPublication(0),mp=mc.cpuPublication(0);animalSpy.mockClear();mechSpy.mockClear();
  for(const ms of [1,20,40,84]){
   frame(ms,16);expect(ac.get(0,1,3)).toBe(0);expect(mc.get(0,1,3)).toBe(0);expect(ac.cpuPose(0)).toBeUndefined();expect(mc.cpuPose(0)).toBeUndefined();
   expect(ac.cpuPublication(0)).toBe(ap);expect(mc.cpuPublication(0)).toBe(mp);expect(animalSpy.mock.calls).toHaveLength(0);expect(mechSpy.mock.calls).toHaveLength(0);
   expect(wild.presentedPose(animal.id)).toBeDefined();expect(serializeWorld(animalsWorld)).toBe(animalRaw);expect(serializeWorld(mechanical.world)).toBe(mechRaw);
  }
  frame(85,4);const af=ac.cpuPublication(0),mf=mc.cpuPublication(0);expect(af).toBeGreaterThan(ap);expect(mf).toBeGreaterThan(mp);
  frame(2000,4);expect(ac.cpuPublication(0)).toBe(af);expect(mc.cpuPublication(0)).toBe(mf);whole(animalsWorld);whole(mechanical.world);
 }finally{animalSpy.mockRestore();mechSpy.mockRestore();wild.dispose();machines.dispose();}
});

test('linked children follow an original middle carrier and reset cannot resurrect an old retained pose',()=>{
 const {w}=working(),raw=whole(w),s=person(w),child=new ActorAnimationCache(s.detail);let childWrites=0;
 child.reconcile(0,70001,'declared renderer child; no World or Raw identity');
 const linked=()=>child.sampleLinked(0,s.layer.animationCache,0,()=>{const root=s.layer.animationCache.cpuPose(0);if(!root)throw Error('A retained child cannot invent an uncaptured parent pose');childWrites++;child.setRoot(0,root,0,0,0,1);});
 try{
  pawnFrame(s,0,4);expect(linked()).toBe(true);expect(child.cpuPose(0)).toBeDefined();const initialWrites=childWrites;
  pawnFrame(s,1,16);expect(linked()).toBe(false);expect(child.cpuPose(0)).toBeUndefined();expect(child.cpuClock(0,'time')).toBeUndefined();expect(childWrites).toBe(initialWrites);
  // A real save/reload keeps its own World; the child is only a declared
  // renderer owner and is never written into that save's identities.
  const loaded=deserializeWorld(raw);expect(serializeWorld(loaded)).toBe(raw);s.layer.update(loaded,1,true);s.timeline.tick=effectiveCore297(loaded)/10;s.layer.updateTravel(loaded,s.timeline,0,0);
  child.reset();child.reconcile(0,70002,'replacement renderer owner');pawnFrame(s,20,16);expect(linked()).toBe(false);expect(child.cpuPose(0)).toBeUndefined();expect(childWrites).toBe(initialWrites);
  pawnFrame(s,21,4);expect(linked()).toBe(true);expect(child.cpuPose(0)).toEqual(s.layer.animationCache.cpuPose(0));
  expect(serializeWorld(loaded)).toBe(raw);expect(serializeWorld(w)).toBe(raw);
 }finally{child.dispose();s.layer.dispose();}
});
