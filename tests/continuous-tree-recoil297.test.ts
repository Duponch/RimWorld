import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {ResourceLayer} from '../src/render/ResourceLayer';
import {createWorld} from '../src/sim/index';
import type {Job} from '../src/sim/types';

/** DECLARED RENDERER PROJECTION, derived from the existing natural-lod case.
 * Prepared job progress0→1 is only the input to adoptChopWork. It is not a
 * played Engine/RAW/Native continuation; no validate/save claim is made here.
 * The original historical test is left unchanged until ROOT reproduces this. */
function camera(){const c=new THREE.OrthographicCamera(-40,40,40,-40,.1,1000);c.position.set(8,30,35);c.lookAt(8,0,8);c.updateProjectionMatrix();return c;}
function streams(group:THREE.Group){const positions:number[][]=[],normals:number[][]=[],versions:number[]=[];group.traverse(o=>{if(o instanceof THREE.Mesh&&o.geometry.hasAttribute('windRoot')){const p=o.geometry.getAttribute('position') as THREE.BufferAttribute,n=o.geometry.getAttribute('normal') as THREE.BufferAttribute;positions.push(Array.from(p.array));normals.push(Array.from(n.array));versions.push(p.version,n.version);}});return{positions,normals,versions};}

test('active tree recoil changes before the middle deadline, pauses exactly, then restores far geometry only once',()=>{
 const world=createWorld(332,20,20),pawn=world.pawns[0]!,detail=new AnimationDetail(),view=camera();
 world.resources=[{id:9001,kind:'tree',species:'oak',x:8,z:8,amount:30,growth:1}];pawn.x=7;pawn.z=8;pawn.state='working';pawn.jobId=9100;
 const job:Job={id:9100,kind:'chop',x:8,z:8,orientation:0,footprint:'standard',status:'active',reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0}};world.jobs=[job];
 const phase=pawn.id*1.7-1.5*Math.PI;let crossing=2;while(Math.floor((11*crossing/6+phase)/(2*Math.PI))<=Math.floor((11*(crossing-1)/6+phase)/(2*Math.PI)))crossing++;
 world.tick=crossing-1;const before=JSON.stringify(world),material=new THREE.MeshStandardNodeMaterial({vertexColors:true});material.userData.rendererOwned=true;
 const layer=new ResourceLayer(new THREE.Group(),material,material,detail);
 try{
  layer.update(world,true);const rest=streams(layer.group);expect(rest.positions.length).toBeGreaterThan(0);
  const next=structuredClone(world);next.tick++;next.jobs[0]!.progress=1;const nextBefore=JSON.stringify(next);layer.adoptChopWork(world,next);
  const contact=(Math.floor((11*next.tick/6+phase)/(2*Math.PI))*2*Math.PI-phase)/11;
  const present=(ms:number,age:number)=>{detail.beginFrame(ms,view,1440,(contact+age)*6);layer.presentChop(contact+age);};
  present(0,.09);expect(detail.classify(8,0,8)).toBe(1);const first=streams(layer.group);expect(first.positions).not.toEqual(rest.positions);
  present(16,.12);const second=streams(layer.group);expect(second.positions).not.toEqual(first.positions);expect(second.normals).not.toEqual(first.normals);expect(second.versions.some((v,i)=>v>first.versions[i]!)).toBe(true);
  present(32,.12);expect(streams(layer.group)).toEqual(second);
  view.zoom=.2;view.updateProjectionMatrix();present(48,.2);expect(detail.classify(8,0,8)).toBe(2);const far=streams(layer.group);expect(far.positions).toEqual(rest.positions);expect(far.normals).toEqual(rest.normals);
  present(64,.23);expect(streams(layer.group)).toEqual(far);expect(JSON.stringify(world)).toBe(before);expect(JSON.stringify(next)).toBe(nextBefore);
 }finally{layer.dispose();material.dispose();}
});
