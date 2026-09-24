import { describe, expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { createWorld } from '../src/sim/engine';
import { jobDuration } from '../src/sim/farming';
import { ActionFeedbackLayer } from '../src/render/ActionFeedbackLayer';
import { actionProgress, selectedConfirmedPath } from '../src/render/action-feedback';

function source(capacity:number):THREE.InstancedBufferGeometry {
  const geometry=new THREE.InstancedBufferGeometry();
  for(const name of ['aFrom','aTo','aTravel'])
    geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));
  return geometry;
}

describe('V99 measured action feedback',()=>{
  test('captured crop targets retain the original work-duration oracle, including absence',()=>{
    const world=createWorld(79,32,32);
    world.resources=[{id:world.nextId++,kind:'rice',x:4,z:5,amount:6,growth:1,growthTick:world.tick}];
    for(const kind of ['cut','harvest','chop','sow'] as const)for(const x of [4,6]){
      const job={id:world.nextId++,kind,x,z:5,orientation:0 as const,footprint:'standard' as const,status:'active' as const,reservedBy:world.pawns[0]!.id,progress:5,escrow:{wood:0,food:0}};
      const target=world.resources.find(r=>r.x===x&&r.z===5)??null;
      expect(jobDuration(world,job,target)).toBe(jobDuration(world,job));
    }
  });
  test('uses completed simulation work, without making travel or rest look timed',()=>{
    const world=createWorld(79,32,32),pawn=world.pawns[0]!;
    const job={id:world.nextId++,kind:'chop' as const,x:pawn.x,z:pawn.z,orientation:0 as const,
      footprint:'standard' as const,status:'active' as const,reservedBy:pawn.id,
      progress:5,workRemainder:5000,escrow:{wood:0,food:0}};
    world.jobs.push(job);pawn.jobId=job.id;pawn.state='working';
    const before=structuredClone(world);
    expect(actionProgress(world,pawn)).toMatchObject({kind:'job',completed:5.5,total:jobDuration(world,job),fraction:5.5/jobDuration(world,job)});
    expect(world).toEqual(before);
    const geometry=source(world.pawns.length),layer=new ActionFeedbackLayer({blend:uniform(1),travelTime:uniform(0)});
    expect(layer.path.visible).toBe(false);expect(layer.bars.visible).toBe(false);
    layer.update(world,new Set(),geometry);
    expect(layer.stats.activeBars).toBe(1);
    expect(layer.bars.visible).toBe(true);
    const actionBuffer=layer.bars.geometry.getAttribute('aAction');
    const uploads=layer.stats.barUploads;
    layer.update(world,new Set(),geometry);
    expect(layer.stats.barUploads).toBe(uploads);
    layer.setBarsDetailVisible(false);layer.update(world,new Set(),geometry);
    expect(layer.bars.visible).toBe(false);
    expect(layer.bars.geometry.getAttribute('aAction')).toBe(actionBuffer);
    pawn.state='moving';expect(actionProgress(world,pawn)).toBeUndefined();
    pawn.state='resting';expect(actionProgress(world,pawn)).toBeUndefined();
    pawn.state='working';pawn.jobId=null;pawn.research={stationId:1,spot:{x:pawn.x,z:pawn.z},worked:100};
    expect(actionProgress(world,pawn)).toBeUndefined();
    layer.update(world,new Set(),geometry);expect(layer.stats.activeBars).toBe(0);
    layer.dispose();geometry.dispose();
  });

  test('uses the already confirmed edge before the remaining path',()=>{
    const world=createWorld(80,32,32),pawn=world.pawns[0]!;
    pawn.state='moving';pawn.motion={from:{x:1,z:1},to:{x:2,z:1},start:10,end:15};
    pawn.path=[{x:3,z:1},{x:4,z:2}];world.tick=12;
    expect(selectedConfirmedPath(world,pawn)).toEqual([{x:2,z:1},{x:3,z:1},{x:4,z:2}]);
    world.tick=15;expect(selectedConfirmedPath(world,pawn)).toEqual(pawn.path);
    pawn.state='sleeping';expect(selectedConfirmedPath(world,pawn)).toEqual([]);
  });

  test('keeps mesh and buffer identity while only selected edge data follows the GPU pose',()=>{
    const world=createWorld(81,32,32),pawn=world.pawns[0]!;
    pawn.state='moving';pawn.motion={from:{x:1,z:1},to:{x:2,z:1},start:10,end:15};
    pawn.path=[{x:3,z:1}];world.tick=12;
    const selection=new Set([pawn.id]),geometry=source(world.pawns.length),clock={blend:uniform(1),travelTime:uniform(0)};
    const from=geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
    const to=geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute;
    const travel=geometry.getAttribute('aTravel') as THREE.InstancedBufferAttribute;
    from.setXYZW(0,1,0,1,0);to.setXYZW(0,2,0,1,0);travel.setXYZW(0,10,15,0,1);
    const layer=new ActionFeedbackLayer(clock),mesh=layer.path,buffer=layer.path.geometry.getAttribute('aPathEnd');
    const before=structuredClone(world);
    layer.update(world,selection,geometry);
    expect(world).toEqual(before);
    expect(layer.stats).toMatchObject({activeBars:0,pathSegments:2,pathRebuilds:1,travelCopies:1});
    expect(layer.bars.visible).toBe(false);expect(layer.path.visible).toBe(true);
    expect(layer.bars.geometry.getAttribute('aFrom')).toBe(from);
    layer.update(world,selection,geometry);
    expect(layer.stats.pathRebuilds).toBe(1);
    expect(layer.path).toBe(mesh);expect(layer.path.geometry.getAttribute('aPathEnd')).toBe(buffer);
    from.setXYZW(0,1.5,0,1,0);from.needsUpdate=true;layer.syncTravel(geometry);
    expect((layer.path.geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute).getX(0)).toBe(1.5);
    expect(layer.stats.travelCopies).toBe(2);
    layer.syncTravel(geometry);expect(layer.stats.travelCopies).toBe(2);
    layer.update(world,new Set(),geometry);
    expect(layer.stats.pathSegments).toBe(0);
    expect(layer.path.visible).toBe(false);
    const copies=layer.stats.travelCopies;layer.syncTravel(geometry);expect(layer.stats.travelCopies).toBe(copies);
    layer.dispose();geometry.dispose();
  });
});
