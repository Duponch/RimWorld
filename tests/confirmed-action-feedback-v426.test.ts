import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {uniform} from 'three/tsl';
import {createWorld} from '../src/sim/engine';
import {ActionFeedbackLayer} from '../src/render/ActionFeedbackLayer';
import {actionProgress,selectedConfirmedPath} from '../src/render/action-feedback';
import {createClosedMainMapIntentReader} from '../src/render/closed-main-map-intents';

// Same resident-pose fixture as action-feedback-v99; no replacement path oracle.
function source(capacity:number):THREE.InstancedBufferGeometry {
  const geometry=new THREE.InstancedBufferGeometry();
  for(const name of ['aFrom','aTo','aTravel'])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));
  for(let i=0;i<capacity;i++){
    (geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute).setXYZW(i,10+i,0,20+i,0);
    (geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute).setXYZW(i,11+i,0,20+i,0);
    (geometry.getAttribute('aTravel') as THREE.InstancedBufferAttribute).setXYZW(i,10,15,0,1);
  }
  return geometry;
}
function ends(layer:ActionFeedbackLayer){const a=layer.path.geometry.getAttribute('aPathEnd');return Array.from({length:layer.path.geometry.instanceCount},(_,i)=>({x:a.getX(i),z:a.getZ(i)}));}

test('admitted route IDs bind to executed slots, with absent bodies skipped and GPU buffers retained',()=>{
  const latest=createWorld(426,16,16);
  latest.pawns.forEach((pawn,i)=>{pawn.state='moving';pawn.motion=null;pawn.path=[{x:4+i,z:6}];});
  const routes=createClosedMainMapIntentReader().admit!(latest).routes,executed=structuredClone(latest);
  executed.pawns=[executed.pawns[1]!,executed.pawns[0]!];
  const geometry=source(executed.pawns.length),layer=new ActionFeedbackLayer({blend:uniform(.25),travelTime:uniform(12)}),selected=new Set(latest.pawns.map(p=>p.id));
  const before=structuredClone(executed);
  try{
    layer.update(executed,selected,geometry,true);layer.updateConfirmedPath(routes,executed,selected,geometry);
    expect(ends(layer)).toEqual([latest.pawns[1]!.path[0],latest.pawns[0]!.path[0]]);
    const owner=layer.path.geometry.getAttribute('aPathOwner'),from=layer.path.geometry.getAttribute('aFrom');
    expect([owner.getX(0),owner.getX(1)]).toEqual([0,1]);expect([from.getX(0),from.getX(1)]).toEqual([10,11]);
    const mesh=layer.path,buffer=layer.path.geometry.getAttribute('aPathEnd'),rebuilds=layer.stats.pathRebuilds;
    layer.updateConfirmedPath(routes,executed,selected,geometry);
    expect(layer.stats.pathRebuilds).toBe(rebuilds);expect(layer.path).toBe(mesh);expect(layer.path.geometry.getAttribute('aPathEnd')).toBe(buffer);
    const moved=geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute;moved.setX(1,99);moved.needsUpdate=true;
    layer.syncTravel(geometry);expect(layer.path.geometry.getAttribute('aFrom').getX(1)).toBe(99);
    expect(executed).toEqual(before);
  }finally{layer.dispose();geometry.dispose();}
});

test('a future origin or confirmed edge mismatch retains the real executed route instead of drawing a chord',()=>{
  for(const mismatch of ['origin','edge'] as const){
    const executed=createWorld(426,16,16),pawn=executed.pawns[0]!;executed.tick=12;
    pawn.x=1;pawn.z=1;pawn.state='moving';pawn.motion={from:{x:1,z:1},to:{x:2,z:1},start:10,end:15};pawn.path=[{x:2,z:2},{x:3,z:2}];
    const latest=structuredClone(executed),future=latest.pawns[0]!;
    if(mismatch==='origin')future.x=2;else future.motion={from:{x:1,z:1},to:{x:1,z:2},start:10,end:15};
    future.path=[{x:7,z:7}];
    const routes=createClosedMainMapIntentReader().admit!(latest).routes,geometry=source(executed.pawns.length),layer=new ActionFeedbackLayer({blend:uniform(.2),travelTime:uniform(12)});
    try{
      layer.updateConfirmedPath(routes,executed,new Set([pawn.id]),geometry);
      expect(ends(layer)).toEqual(selectedConfirmedPath(executed,pawn));expect(ends(layer).at(-1)).not.toEqual({x:7,z:7});
    }finally{layer.dispose();geometry.dispose();}
  }
});

test('confirmed cancellation stays empty through an old physical update, without suppressing measured physical work',()=>{
  const executed=createWorld(426,16,16),pawn=executed.pawns[0]!;pawn.state='moving';pawn.motion=null;pawn.path=[{x:4,z:5}];
  const reader=createClosedMainMapIntentReader(),routes=reader.admit!(executed).routes,geometry=source(executed.pawns.length),layer=new ActionFeedbackLayer({blend:uniform(.4),travelTime:uniform(0)}),selected=new Set([pawn.id]);
  try{
    layer.updateConfirmedPath(routes,executed,selected,geometry);expect(layer.path.visible).toBe(true);
    const cancelled=structuredClone(executed);cancelled.pawns[0]!.state='idle';cancelled.pawns[0]!.path=[];
    layer.updateConfirmedPath(reader.admit!(cancelled).routes,executed,selected,geometry);
    layer.update(executed,selected,geometry,true);expect(layer.path.visible).toBe(false);expect(layer.path.geometry.instanceCount).toBe(0);
    const job={id:executed.nextId++,kind:'chop' as const,x:pawn.x,z:pawn.z,orientation:0 as const,footprint:'standard' as const,status:'active' as const,reservedBy:pawn.id,progress:5,workRemainder:5000,escrow:{wood:0,food:0}};
    executed.jobs=[job];pawn.jobId=job.id;pawn.state='working';
    layer.update(executed,selected,geometry,true);
    expect(layer.stats.activeBars).toBe(1);expect(layer.bars.geometry.getAttribute('aAction').getX(0)).toBe(Math.fround(actionProgress(executed,pawn)!.fraction));
    expect(layer.path.visible).toBe(false);layer.updateConfirmedPath(routes,executed,new Set(),geometry);expect(layer.path.visible).toBe(false);
  }finally{layer.dispose();geometry.dispose();}
});
