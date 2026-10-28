import {expect,test}from'vitest';
import * as THREE from'three/webgpu';
import {deconstructionCamp}from'./scenarios/deconstruction.ts';
import {applyCommand,advanceWorldCore297}from'../src/sim/engine.ts';
import {validateWorld}from'../src/sim/serialization.ts';
import {effectiveCore297}from'../src/sim/core-phase-297.ts';
import {PawnLayer}from'../src/render/PawnLayer';
import {MotionTimeline}from'../src/render/MotionTimeline';
import {sampleActorRoot}from'../src/render/ActorAnimationCache';
import {clearGroup}from'../src/render/primitives';
import type {Pawn,World}from'../src/sim/types';

function streams(layer:PawnLayer){const g=layer.feedbackSource!;return {g,from:g.getAttribute('aFrom') as THREE.InstancedBufferAttribute,to:g.getAttribute('aTo') as THREE.InstancedBufferAttribute,travel:g.getAttribute('aTravel') as THREE.InstancedBufferAttribute};}
function scene(){
 const world=deconstructionCamp(1,32),pawn=world.pawns[0]!;expect(Number(world.schemaVersion)).toBe(297);expect(world.phaseCore297).toBe(0);
 Object.assign(pawn,{x:10,z:10,hunger:70,rest:80,needCooldown:20});pawn.schedule.fill('anything');pawn.recreation.level=100;
 for(const key of Object.keys(pawn.priorities) as(keyof Pawn['priorities'])[])pawn.priorities[key]=0;
 if(world.wildlife)world.wildlife.animals=[];expect(validateWorld(world)).toEqual([]);
 expect(applyCommand(world,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok).toBe(true);
 const layer=new PawnLayer(),timeline=new MotionTimeline();timeline.tick=effectiveCore297(world)/10;layer.update(world,1,true);layer.updateTravel(world,timeline,1/60,1);
 expect(applyCommand(world,{type:'draft-move',pawnIds:[pawn.id],target:{x:14,z:10},queue:false}).ok).toBe(true);
 const edge=pawn.motion!;expect(edge).toBeDefined();expect(edge.from).toEqual({x:10,z:10});expect(edge.to).toEqual({x:11,z:10});
 layer.update(world,1,false);timeline.tracks.set(pawn.id,[edge]);layer.updateTravel(world,timeline,1/60,1);
 expect(validateWorld(world)).toEqual([]);return {world,pawn,layer,timeline,edge};
}
function commit(s:ReturnType<typeof scene>){const before=effectiveCore297(s.world),step=advanceWorldCore297(s.world);expect(step.core).toBe(before+1);s.timeline.tick=step.core/10;return step.core;}
/** External reference is the existing historical GPU-root sampler, not a copy
 * of the recurrent update formula. It consumes the exact same produced edge. */
function confirmedTarget(world:World,timeline:MotionTimeline){
 const snapshot=structuredClone(world);(snapshot as {schemaVersion:number}).schemaVersion=296;
 const control=new PawnLayer();control.update(snapshot,1,true);control.updateTravel(snapshot,timeline);const a=streams(control),p=sampleActorRoot(a.from,a.to,a.travel,0,control.travelTime.value,control.blend.value);clearGroup(control.group);return p;
}
function shared(layer:PawnLayer){const a=streams(layer);expect(a.from).toBe((layer.group.children[1] as THREE.Mesh).geometry.getAttribute('aFrom'));expect(a.from).toBe((layer.group.children[3] as THREE.Mesh).geometry.getAttribute('aFrom'));expect(a.to).toBe((layer.group.children[1] as THREE.Mesh).geometry.getAttribute('aTo'));}

test('schema297 shared body/cargo/selection roots progress with real dt on actually committed Core edges, then freeze at speed0',()=>{
 const s=scene();try{
  const a=streams(s.layer);let prior=a.from.getX(0);
  for(let i=0;i<3;i++){commit(s);const target=confirmedTarget(s.world,s.timeline);s.layer.updateTravel(s.world,s.timeline,1/60,1);const now=a.from.getX(0);expect(now).toBeGreaterThan(prior);expect(now).toBeLessThan(target.x);expect(now).toBe(a.to.getX(0));expect(a.from.getZ(0)).toBe(a.to.getZ(0));prior=now;}
  expect(s.pawn.x).toBe(11);expect(prior).toBeLessThan(s.pawn.x);shared(s.layer);
  const core=effectiveCore297(s.world),held=[a.from.getX(0),a.from.getY(0),a.from.getZ(0)];s.layer.updateTravel(s.world,s.timeline,.5,0);expect([a.from.getX(0),a.from.getY(0),a.from.getZ(0)]).toEqual(held);expect(effectiveCore297(s.world)).toBe(core);
  const target=confirmedTarget(s.world,s.timeline);s.layer.updateTravel(s.world,s.timeline,1/60,1);expect(a.from.getX(0)).toBeGreaterThanOrEqual(held[0]!);expect(a.from.getX(0)).toBeLessThanOrEqual(target.x);expect(effectiveCore297(s.world)).toBe(core);
 }finally{clearGroup(s.layer.group);}
});

test('schema297 speed6 adopts only the confirmed sampled root, not the anticipated RAW endpoint or a future cell',()=>{
 const s=scene();try{commit(s);const target=confirmedTarget(s.world,s.timeline),a=streams(s.layer),raw=s.pawn.x;s.layer.updateTravel(s.world,s.timeline,1/60,6);expect(a.from.getX(0)).toBeCloseTo(target.x,6);expect(a.from.getZ(0)).toBeCloseTo(target.z,6);expect(a.from.getX(0)).toBe(a.to.getX(0));expect(a.from.getX(0)).toBeLessThan(raw);expect(s.timeline.tick).toBe(effectiveCore297(s.world)/10);shared(s.layer);}finally{clearGroup(s.layer.group);}
});

test('a same-actor Full adoption preserves the schema297 recurrent root through actual pause and resumes toward the same confirmed target',()=>{
 const s=scene();try{
  for(let i=0;i<3;i++){commit(s);s.layer.updateTravel(s.world,s.timeline,1/60,1);}const a=streams(s.layer),held=[a.from.getX(0),a.from.getY(0),a.from.getZ(0)],snapshot=structuredClone(s.world),core=effectiveCore297(snapshot);
  // Layer-level Full adoption only; this test does not mint a Native receipt.
  s.layer.update(snapshot,0,false);s.layer.updateTravel(snapshot,s.timeline,.25,0);expect([a.from.getX(0),a.from.getY(0),a.from.getZ(0)]).toEqual(held);expect(a.from.getX(0)).toBe(a.to.getX(0));expect(effectiveCore297(snapshot)).toBe(core);
  const target=confirmedTarget(snapshot,s.timeline);s.layer.updateTravel(snapshot,s.timeline,1/60,1);expect(a.from.getX(0)).toBeGreaterThan(held[0]!);expect(a.from.getX(0)).toBeLessThanOrEqual(target.x);expect(effectiveCore297(snapshot)).toBe(core);shared(s.layer);
 }finally{clearGroup(s.layer.group);}
});
