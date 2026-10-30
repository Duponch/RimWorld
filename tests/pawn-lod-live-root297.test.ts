import {expect,test,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {PawnLayer} from '../src/render/PawnLayer';
import {MotionTimeline} from '../src/render/MotionTimeline';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {DEFAULT_ANIMATION_SETTINGS} from '../src/render/animation-settings';
import {sampleActorRoot} from '../src/render/ActorAnimationCache';
import * as rigSampling from '../src/render/actor-animation-sampling';
import type {Pawn,World} from '../src/sim/types.ts';
import type {PresentationSegment} from '../src/sim/travel-timing.ts';

type Pose={x:number;y:number;z:number;yaw:number};
type Row={frame:number;mode:'cached'|'near'|'off'|'restored';core:number;tick:number;ms:number;level:number;live:Pose;presented:Pose|undefined;cpuForId:Pose|undefined;cell0:number[];publication:number;clocks:(number|undefined)[];rigToken:string;rigCalls:number;cacheActive:boolean};
function camera(pixels:number){const c=new THREE.OrthographicCamera(-360/pixels,360/pixels,360/pixels,-360/pixels,.1,1000);c.position.set(0,20,20);c.lookAt(0,0,0);c.updateProjectionMatrix();return c;}
function streams(layer:PawnLayer){const g=layer.feedbackSource;if(!g)throw Error('Actual PawnLayer streams missing');return {g,from:g.getAttribute('aFrom') as THREE.InstancedBufferAttribute,to:g.getAttribute('aTo') as THREE.InstancedBufferAttribute,travel:g.getAttribute('aTravel') as THREE.InstancedBufferAttribute};}
function livePose(layer:PawnLayer):Pose{const a=streams(layer);expect(a.from.getX(0)).toBe(a.to.getX(0));expect(a.from.getZ(0)).toBe(a.to.getZ(0));return sampleActorRoot(a.from,a.to,a.travel,0,layer.travelTime.value,layer.blend.value);}
function copyPose(value:Pose|undefined){return value?{x:value.x,y:value.y,z:value.z,yaw:value.yaw}:undefined;}
function whole(world:World){expect(validateWorld(world)).toEqual([]);const raw=serializeWorld(world),loaded=deserializeWorld(raw);expect(validateWorld(loaded)).toEqual([]);expect(serializeWorld(loaded)).toBe(raw);return raw;}
function scene(){
  const world=deconstructionCamp(1,32),pawn=world.pawns[0]!;expect(Number(world.schemaVersion)).toBe(297);expect(effectiveCore297(world)).toBe(0);
  Object.assign(pawn,{x:10,z:10,hunger:70,rest:80,needCooldown:20});pawn.schedule.fill('anything');pawn.recreation.level=100;
  for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
  if(world.wildlife)world.wildlife.animals=[];expect(validateWorld(world)).toEqual([]);
  expect(applyCommand(world,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok).toBe(true);
  const detail=new AnimationDetail(),layer=new PawnLayer(undefined,detail),timeline=new MotionTimeline();timeline.tick=0;layer.update(world,1,true);layer.updateTravel(world,timeline,1/60,1);
  expect(applyCommand(world,{type:'draft-move',pawnIds:[pawn.id],target:{x:15,z:10},queue:false}).ok).toBe(true);
  const edge=pawn.motion;if(!edge)throw Error('Real move command produced no edge');expect(edge.from).toEqual({x:10,z:10});expect(edge.to).toEqual({x:11,z:10});
  const edges:PresentationSegment[]=[edge];timeline.tracks.set(pawn.id,edges);layer.update(world,1,false);whole(world);
  return {world,pawn,detail,layer,timeline,edges};
}
function rigToken(layer:PawnLayer){const values:number[]=[];for(let cell=3;cell<63;cell++)for(let component=0;component<4;component++)values.push(layer.animationCache.get(0,cell,component));return JSON.stringify(values);}

test.each([{pixels:16,level:1,name:'middle16px'},{pixels:4,level:2,name:'far4px'}])('$name: cached rig remains paced while the production CPU presented-root reader follows the live297 root',({pixels,level,name})=>{
  const s=scene(),rows:Row[]=[],c=camera(pixels),near=camera(32),sampleSpy=vi.spyOn(rigSampling,'samplePawnRig');
  let heldRaw:string|undefined,heldRng:number|undefined,heldNextId:number|undefined;
  const frame=(index:number,mode:Row['mode']='cached',view=c)=>{
    const before=serializeWorld(s.world),core=effectiveCore297(s.world);
    s.layer.updateTravel(s.world,s.timeline,1/60,1);
    s.layer.time.value=(s.timeline.tick/6)%(2*Math.PI);
    s.detail.beginFrame(index*1000/60,view,720,s.timeline.tick);
    s.layer.presentAnimations();
    const live=livePose(s.layer),cache=s.layer.animationCache,presented=copyPose(s.layer.presentedPose(s.pawn.id)),cpuForId=copyPose(s.layer.cpuPoseForId(s.pawn.id));
    const row:Row={frame:index,mode,core,tick:s.timeline.tick,ms:index*1000/60,level:s.detail.classify(live.x,live.y,live.z),live,presented,cpuForId,
      cell0:[0,1,2,3].map(component=>cache.get(0,0,component)),publication:cache.cpuPublication(0),clocks:[cache.cpuClock(0,'time'),cache.cpuClock(0,'travelTime'),cache.cpuClock(0,'cargoTime'),cache.cpuClock(0,'blend')],rigToken:rigToken(s.layer),rigCalls:sampleSpy.mock.calls.length,cacheActive:cache.cpuPose(0)!==undefined};
    expect(s.layer.presentedPose(Number.MAX_SAFE_INTEGER)).toBeUndefined();expect(s.layer.cpuPoseForId(Number.MAX_SAFE_INTEGER)).toBeUndefined();
    if(mode==='cached'||mode==='restored'){
      expect(row.level).toBe(level);expect(row.cacheActive).toBe(true);expect(row.publication).toBeGreaterThan(0);
      expect.soft(presented,name+' frame'+index+' active cache has a production presented pose').toBeDefined();
      if(presented){expect.soft(presented.x,name+' frame'+index+' presented X follows live root').toBeCloseTo(live.x,5);expect.soft(presented.y,name+' frame'+index+' presented Y follows live root').toBeCloseTo(live.y,5);expect.soft(presented.z,name+' frame'+index+' presented Z follows live root').toBeCloseTo(live.z,5);}
    }else{
      expect(row.level).toBe(0);expect(row.cacheActive).toBe(false);expect(presented).toBeUndefined();expect(cpuForId).toBeUndefined();
    }
    const prior=rows.at(-1);
    if(prior&&row.publication===prior.publication){expect(row.rigToken).toBe(prior.rigToken);expect(row.rigCalls).toBe(prior.rigCalls);if(row.cacheActive&&prior.cacheActive){expect(row.cell0).toEqual(prior.cell0);expect(row.clocks).toEqual(prior.clocks);}}
    expect(serializeWorld(s.world)).toBe(before);expect(effectiveCore297(s.world)).toBe(core);rows.push(row);return row;
  };
  try{
    frame(0);
    for(let core=1;core<=19;core++){
      const step=advanceWorldCore297(s.world);expect(step.core).toBe(core);s.timeline.tick=step.core/10;
      const current=s.world.pawns.find(p=>p.id===s.pawn.id);if(!current)throw Error('Actual diagnostic actor missing after Core');
      const edge=current.motion;if(edge&&edge!==s.edges.at(-1)){s.edges.push(edge);s.timeline.tracks.set(s.pawn.id,s.edges);s.layer.update(s.world,1,false);}
      frame(core);
    }
    expect(s.edges.length).toBeGreaterThan(1);heldRaw=whole(s.world);heldRng=s.world.rng;heldNextId=s.world.nextId;
    for(let extra=0;extra<60;extra++){frame(20+extra);expect(effectiveCore297(s.world)).toBe(19);expect(s.world.rng).toBe(heldRng);expect(s.world.nextId).toBe(heldNextId);}
    const cached=rows.filter(row=>row.mode==='cached'),held=cached.filter(row=>row.frame>=20),publications=new Set(cached.map(row=>row.publication));
    expect(held).toHaveLength(60);expect(held.at(-1)!.live.x).toBeGreaterThan(held[0]!.live.x);
    const witnesses=cached.filter((row,index)=>index>0&&row.publication===cached[index-1]!.publication&&Math.hypot(row.live.x-cached[index-1]!.live.x,row.live.z-cached[index-1]!.live.z)>0);
    expect(witnesses.length,'The actual root must move while a rig publication is held').toBeGreaterThan(0);
    if(level===2){expect(publications.size).toBe(1);expect(cached.at(-1)!.rigCalls).toBe(cached[0]!.rigCalls);}
    else{
      expect(publications.size).toBeGreaterThan(1);expect(publications.size).toBeLessThan(cached.length);
      const changed=cached.filter((row,index)=>index===0||row.publication!==cached[index-1]!.publication);
      for(let i=1;i<changed.length;i++)expect(changed[i]!.ms-changed[i-1]!.ms).toBeGreaterThanOrEqual(1000/s.detail.settings.middleHz-1000/60-1e-6);
    }
    const last=cached.at(-1)!;const nearRow=frame(80,'near',near);expect(nearRow.publication).toBe(last.publication);expect(nearRow.rigCalls).toBe(last.rigCalls);
    s.detail.setSettings({...DEFAULT_ANIMATION_SETTINGS,enabled:false});const offRow=frame(81,'off');expect(offRow.publication).toBe(last.publication);expect(offRow.rigCalls).toBe(last.rigCalls);
    s.detail.setSettings({...DEFAULT_ANIMATION_SETTINGS});const restored=frame(82,'restored');expect(restored.publication).toBeGreaterThan(last.publication);expect(restored.rigCalls).toBe(last.rigCalls+1);
    expect(serializeWorld(s.world)).toBe(heldRaw);expect(s.world.rng).toBe(heldRng);expect(s.world.nextId).toBe(heldNextId);expect(effectiveCore297(s.world)).toBe(19);whole(s.world);
  }finally{
    sampleSpy.mockRestore();s.layer.dispose();
  }
});
