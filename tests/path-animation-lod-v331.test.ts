import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { createWorld } from '../src/sim/index';
import { ActionFeedbackLayer } from '../src/render/ActionFeedbackLayer';
import { ActorAnimationCache } from '../src/render/ActorAnimationCache';
import { AnimationDetail } from '../src/render/AnimationDetail';

function setup(long=false){
  const world=createWorld(331,24,24);world.pawns=world.pawns.slice(0,2);world.tick=100;
  const [first,second]=world.pawns;
  Object.assign(first!,{x:2,z:1,state:'moving',motion:{from:{x:1,z:1},to:{x:2,z:1},start:100,end:104},path:[{x:3,z:1},{x:4,z:1}]});
  Object.assign(second!,{x:9,z:8,state:'moving',motion:{from:{x:8,z:8},to:{x:9,z:8},start:100,end:104},
    path:Array.from({length:long?18:2},(_,i)=>({x:10+i%10,z:8+Math.floor(i/10)}))});
  const source=new THREE.InstancedBufferGeometry();
  source.setAttribute('aFrom',new THREE.InstancedBufferAttribute(new Float32Array([1,0,1,0,8,0,8,1]),4));
  source.setAttribute('aTo',new THREE.InstancedBufferAttribute(new Float32Array([2,0,1,0,9,0,8,1]),4));
  source.setAttribute('aTravel',new THREE.InstancedBufferAttribute(new Float32Array([0,1,0,1,0,1,0,1]),4));
  const detail=new AnimationDetail(),cache=new ActorAnimationCache(detail),view=new THREE.OrthographicCamera(-100,100,100,-100,.1,1000);
  view.position.set(0,100,100);view.lookAt(0,0,0);detail.beginFrame(0,view,1000,100);
  for(let slot=0;slot<2;slot++){
    cache.reconcile(slot,world.pawns[slot]!.id,'test-owner');
    cache.sample(slot,slot,0,0,1,()=>cache.setRoot(slot,{x:20+slot,y:0,z:20,yaw:0},0,0,0,1));
  }
  const clock={blend:uniform(.5),travelTime:uniform(.5),animationCache:cache};
  const feedback=new ActionFeedbackLayer(clock);
  return {world,source,detail,cache,feedback,dispose(){feedback.dispose();cache.dispose();source.dispose();}};
}
function tuple(attribute:THREE.BufferAttribute|THREE.InterleavedBufferAttribute,index:number):number[]{
  return Array.from({length:attribute.itemSize},(_,component)=>attribute.array[index*attribute.itemSize+component]!);
}

test('a selected pawn in slot one owns only its first route segment, independently of path instance index',()=>{
  const {world,source,cache,feedback,dispose}=setup(),raw=JSON.stringify(world);
  try{
    feedback.update(world,new Set([world.pawns[1]!.id]),source);
    const geometry=feedback.path.geometry,owner=geometry.getAttribute('aPathOwner');
    expect(geometry.instanceCount).toBe(3);
    expect([0,1,2].map(slot=>owner.getX(slot))).toEqual([1,-1,-1]);
    expect(tuple(geometry.getAttribute('aFrom'),0)).toEqual(tuple(source.getAttribute('aFrom'),1));
    expect(tuple(geometry.getAttribute('aTo'),0)).toEqual(tuple(source.getAttribute('aTo'),1));
    expect(tuple(geometry.getAttribute('aFrom'),1)).toEqual([9,0,8,0]);
    expect(tuple(geometry.getAttribute('aFrom'),2)).toEqual([10,0,8,0]);
    expect([0,1,2].map(slot=>tuple(geometry.getAttribute('aPathEnd'),slot))).toEqual([[9,0,8],[10,0,8],[11,0,8]]);
    // Distinct held roots make the previous slot-zero alias observable in the mapping.
    expect(cache.cpuPose(owner.getX(0))).toEqual({x:21,y:0,z:20,yaw:0});
    expect(cache.cpuPose(0)?.x).toBe(20);expect(JSON.stringify(world)).toBe(raw);
  }finally{dispose();}
});

test('multiple selected routes survive capacity growth and travel copies preserve every stationary segment',()=>{
  const {world,source,feedback,dispose}=setup(true);
  try{
    feedback.update(world,new Set(world.pawns.map(pawn=>pawn.id)),source);
    const geometry=feedback.path.geometry,count=geometry.instanceCount,owner=geometry.getAttribute('aPathOwner');
    expect(count).toBe(22);expect(owner.count).toBeGreaterThanOrEqual(count);
    expect(Array.from({length:count},(_,slot)=>owner.getX(slot))).toEqual([0,-1,-1,1,...Array(18).fill(-1)]);
    const fixed=Array.from({length:count},(_,slot)=>slot).filter(slot=>owner.getX(slot)<0);
    const before=fixed.map(slot=>[tuple(geometry.getAttribute('aFrom'),slot),tuple(geometry.getAttribute('aTo'),slot),tuple(geometry.getAttribute('aPathEnd'),slot)]);
    const from=source.getAttribute('aFrom') as THREE.BufferAttribute,to=source.getAttribute('aTo') as THREE.BufferAttribute;
    from.setXYZW(1,8.25,.5,8,1.2);to.setXYZW(1,9.25,.5,8,1.2);from.needsUpdate=to.needsUpdate=true;
    feedback.syncTravel(source);
    expect(tuple(geometry.getAttribute('aFrom'),3)).toEqual(tuple(from,1));
    expect(tuple(geometry.getAttribute('aTo'),3)).toEqual(tuple(to,1));
    expect(fixed.map(slot=>[tuple(geometry.getAttribute('aFrom'),slot),tuple(geometry.getAttribute('aTo'),slot),tuple(geometry.getAttribute('aPathEnd'),slot)])).toEqual(before);
    // Removing the first selected owner compacts route rows but keeps pawn slot one.
    feedback.update(world,new Set([world.pawns[1]!.id]),source);
    expect(geometry.instanceCount).toBe(19);
    expect(Array.from({length:19},(_,slot)=>geometry.getAttribute('aPathOwner').getX(slot))).toEqual([1,...Array(18).fill(-1)]);
    expect(tuple(geometry.getAttribute('aFrom'),0)).toEqual(tuple(from,1));
  }finally{dispose();}
});
