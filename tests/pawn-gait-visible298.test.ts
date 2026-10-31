import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {PawnLayer} from '../src/render/PawnLayer';
import {MotionTimeline} from '../src/render/MotionTimeline';
import {sampleActorRoot} from '../src/render/ActorAnimationCache';
import {HUMAN_GAIT_RADIANS_PER_UNIT} from '../src/render/gait-presentation';
import type {Pawn,World} from '../src/sim/types.ts';
import type {PresentationSegment} from '../src/sim/travel-timing.ts';
const angle=(value:number)=>Math.atan2(Math.sin(value),Math.cos(value));
const phaseTolerance=3e-5;
type RootPose={x:number;y:number;z:number;phase:number;walkingCode:number};
function streams(layer:PawnLayer){const g=layer.feedbackSource;if(!g)throw Error('Actual PawnLayer geometry missing');return {g,from:g.getAttribute('aFrom') as THREE.InstancedBufferAttribute,to:g.getAttribute('aTo') as THREE.InstancedBufferAttribute,travel:g.getAttribute('aTravel') as THREE.InstancedBufferAttribute,motion:g.getAttribute('aMotion') as THREE.InstancedBufferAttribute};}
function pose(layer:PawnLayer):RootPose {
const a=streams(layer),sample=sampleActorRoot(a.from,a.to,a.travel,0,layer.travelTime.value,layer.blend.value);
expect(a.from.getX(0)).toBe(a.to.getX(0));expect(a.from.getZ(0)).toBe(a.to.getZ(0));
expect(sample.x).toBe(a.from.getX(0));expect(sample.z).toBe(a.from.getZ(0));
return {x:sample.x,y:sample.y,z:sample.z,phase:a.motion.getW(0),walkingCode:a.motion.getX(0)};
}
function sharedRoots(layer:PawnLayer){const a=streams(layer);expect((layer.group.children[1] as THREE.Mesh).geometry.getAttribute('aFrom')).toBe(a.from);expect((layer.group.children[3] as THREE.Mesh).geometry.getAttribute('aFrom')).toBe(a.from);expect((layer.group.children[1] as THREE.Mesh).geometry.getAttribute('aTo')).toBe(a.to);}
function unchanged(world:World,raw:string,core:number,rng:number,nextId:number){expect(effectiveCore297(world)).toBe(core);expect(world.rng).toBe(rng);expect(world.nextId).toBe(nextId);expect(validateWorld(world)).toEqual([]);expect(serializeWorld(world)).toBe(raw);}
function ownReload(world:World){expect(validateWorld(world)).toEqual([]);const raw=serializeWorld(world),loaded=deserializeWorld(raw);expect(validateWorld(loaded)).toEqual([]);expect(serializeWorld(loaded)).toBe(raw);return {raw,loaded};}
function scene(){
const world=deconstructionCamp(1,32),pawn=world.pawns[0]!;
expect(Number(world.schemaVersion)).toBe(298);expect(world.phaseCore297).toBe(0);
Object.assign(pawn,{x:10,z:10,hunger:70,rest:80,needCooldown:20});pawn.schedule.fill('anything');pawn.recreation.level=100;
for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
if(world.wildlife)world.wildlife.animals=[];
expect(validateWorld(world)).toEqual([]);
expect(applyCommand(world,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok).toBe(true);
const layer=new PawnLayer(),timeline=new MotionTimeline();timeline.tick=effectiveCore297(world)/10;layer.update(world,1,true);layer.updateTravel(world,timeline,1/60,1);
expect(applyCommand(world,{type:'draft-move',pawnIds:[pawn.id],target:{x:15,z:10},queue:false}).ok).toBe(true);
const first=pawn.motion;if(!first)throw Error('Real draft-move did not produce its first edge');
expect(first.from).toEqual({x:10,z:10});expect(first.to).toEqual({x:11,z:10});
const edges:PresentationSegment[]=[first];timeline.tracks.set(pawn.id,edges);
layer.update(world,1,false);layer.updateTravel(world,timeline,1/60,1);ownReload(world);sharedRoots(layer);
return {world,layer,timeline,first,edges,pawnId:pawn.id};
}
type Scene=ReturnType<typeof scene>;
function commit(s:Scene){
const before=effectiveCore297(s.world),step=advanceWorldCore297(s.world);expect(step.core).toBe(before+1);s.timeline.tick=step.core/10;
const pawn=s.world.pawns.find(p=>p.id===s.pawnId);if(!pawn)throw Error('Original diagnostic actor disappeared');
const edge=pawn.motion;
if(edge&&edge!==s.edges.at(-1)){s.edges.push(edge);s.timeline.tracks.set(s.pawnId,s.edges);s.layer.update(s.world,1,false);}
return step.core;
}
function assertPhaseDistance(before:RootPose,after:RootPose,label:string){
const distance=Math.hypot(after.x-before.x,after.z-before.z),expected=distance*HUMAN_GAIT_RADIANS_PER_UNIT,observed=angle(after.phase-before.phase),error=angle(observed-expected);
expect.soft(Math.abs(error),label+' gait phase follows displayed ground distance').toBeLessThanOrEqual(phaseTolerance);
}
function paintOnly(s:Scene,dt=1/60,speed:0|1=1){const before=pose(s.layer);s.layer.updateTravel(s.world,s.timeline,dt,speed);return {before,after:pose(s.layer)};}
test('actual298 extra RAF at the same committed Core keeps displayed roots moving and advances gait by that visible distance',()=>{
const s=scene();
try{
for(let i=0;i<3;i++){commit(s);s.layer.updateTravel(s.world,s.timeline,1/60,1);}
const {raw}=ownReload(s.world),core=effectiveCore297(s.world),rng=s.world.rng,nextId=s.world.nextId,initial=pose(s.layer);
expect(core).toBe(3);expect(initial.walkingCode).toBeGreaterThan(.5);
for(let frame=1;frame<=6;frame++){
const {before,after}=paintOnly(s);expect(after.x).toBeGreaterThan(before.x);expect(after.walkingCode).toBeGreaterThan(.5);
assertPhaseDistance(before,after,'same-Core RAF '+frame);
unchanged(s.world,raw,core,rng,nextId);
}
expect(pose(s.layer).x).toBeGreaterThan(initial.x);sharedRoots(s.layer);ownReload(s.world);
}finally{s.layer.dispose();}
});
test('actual298 gait stays with displayed distance across a real next edge, pause, same-actor Full and explicit map reset',()=>{
const s=scene();let fresh:PawnLayer|undefined;
try{
let crossed=false;
for(let guard=0;guard<60;guard++){
const before=pose(s.layer),core=commit(s);s.layer.updateTravel(s.world,s.timeline,1/60,1);const after=pose(s.layer);
assertPhaseDistance(before,after,'Core '+core);
if(s.edges.length>1){crossed=true;break;}
}
expect(crossed,'Real movement must have entered its second edge').toBe(true);expect(s.edges[1]!.from).toEqual({x:11,z:10});expect(s.edges[1]!.to).toEqual({x:12,z:10});
const {raw,loaded}=ownReload(s.world),core=effectiveCore297(s.world),rng=s.world.rng,nextId=s.world.nextId;
for(let frame=0;frame<2;frame++){const row=paintOnly(s);expect(row.after.x).toBeGreaterThan(row.before.x);assertPhaseDistance(row.before,row.after,'after-edge RAF '+frame);}
const paused=pose(s.layer);s.layer.updateTravel(s.world,s.timeline,.25,0);expect(pose(s.layer)).toEqual(paused);unchanged(s.world,raw,core,rng,nextId);
s.world=loaded;s.layer.update(s.world,0,false);s.layer.updateTravel(s.world,s.timeline,.25,0);const afterFull=pose(s.layer);
expect(afterFull.x).toBe(paused.x);expect(afterFull.y).toBe(paused.y);expect(afterFull.z).toBe(paused.z);
expect.soft(Math.abs(angle(afterFull.phase-paused.phase)),'Paused Full preserves displayed gait phase').toBeLessThanOrEqual(phaseTolerance);
unchanged(s.world,raw,core,rng,nextId);const resumed=paintOnly(s);expect(resumed.after.x).toBeGreaterThan(resumed.before.x);
assertPhaseDistance(resumed.before,resumed.after,'resume after Full');
unchanged(s.world,raw,core,rng,nextId);
fresh=new PawnLayer();fresh.update(s.world,1,true);fresh.updateTravel(s.world,s.timeline,0,1);const reference=pose(fresh);
s.layer.update(s.world,1,true);s.layer.updateTravel(s.world,s.timeline,0,1);const reset=pose(s.layer);
expect(reset.x).toBe(reference.x);expect(reset.y).toBe(reference.y);expect(reset.z).toBe(reference.z);
expect.soft(Math.abs(angle(reset.phase-reference.phase)),'Map reset has no previous-actor gait debt').toBeLessThanOrEqual(phaseTolerance);
const held=paintOnly(s);expect(held.after.x).toBe(reset.x);expect(held.after.z).toBe(reset.z);
expect.soft(Math.abs(angle(held.after.phase-reset.phase)),'No gait advances at an unchanged fresh root').toBeLessThanOrEqual(phaseTolerance);
unchanged(s.world,raw,core,rng,nextId);sharedRoots(s.layer);ownReload(s.world);
}finally{fresh?.dispose();s.layer.dispose();}
});
