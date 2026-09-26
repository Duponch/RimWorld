import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import type { Job,World } from '../src/sim/types';
import { ResourceLayer,chopRecoilAngle } from '../src/render/ResourceLayer';
import type { ResourceRangeData } from '../src/render/StaticGeometry';

function treeVertices(group:THREE.Group,id:number):number[] {
  const result:number[]=[];
  group.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const data=object.userData.resourceRanges as ResourceRangeData|undefined;
    if(!data)return;
    const positions=object.geometry.getAttribute('position');
    for(const range of data.ranges)if(range.id===id||Math.floor(-range.id/2)===id)for(let vertex=range.vertexStart;vertex<range.vertexStart+range.vertexCount;vertex++){
      result.push(positions.getX(vertex),positions.getY(vertex),positions.getZ(vertex));
    }
  });
  return result;
}

function crossing(id:number):number {
  const cycle=(tick:number)=>Math.floor((11*tick/6+id*1.7-1.5*Math.PI)/(2*Math.PI));
  for(let tick=2;tick<20;tick++)if(cycle(tick)>cycle(tick-1))return tick;
  throw Error('No chop contact in test interval');
}

function setup():{world:World;layer:ResourceLayer;group:THREE.Group;material:THREE.Material} {
  const world=createWorld(83,20,20),pawn=world.pawns[0]!;
  world.resources=[{id:9001,kind:'tree',species:'oak',x:8,z:8,amount:30,growth:1},{id:9002,kind:'tree',species:'oak',x:10,z:8,amount:30,growth:1}];
  pawn.x=7;pawn.z=8;pawn.state='working';pawn.jobId=9100;
  const job:Job={id:9100,kind:'chop',x:8,z:8,orientation:0,footprint:'standard',status:'active',reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0}};
  world.jobs=[job];world.tick=crossing(pawn.id)-1;
  const group=new THREE.Group(),material=new THREE.MeshStandardNodeMaterial({vertexColors:true}),layer=new ResourceLayer(group,material);
  layer.update(world,true);
  return {world,layer,group,material};
}

test('a confirmed chop stroke bends only its target then restores the resident geometry',()=>{
  const {world,layer,group,material}=setup();
  const treeBefore=treeVertices(group,9001),otherBefore=treeVertices(group,9002);
  const meshes=group.children.flatMap(chunk=>chunk.children),geometries=meshes.map(mesh=>(mesh as THREE.Mesh).geometry);
  const next=structuredClone(world);next.tick++;next.jobs[0]!.progress=1;
  layer.adoptChopWork(world,next);
  const phase=next.pawns[0]!.id*1.7-1.5*Math.PI;
  const cycle=Math.floor((11*next.tick/6+phase)/(2*Math.PI));
  const contact=(cycle*2*Math.PI-phase)/11;
  layer.presentChop(contact+.09);
  const recoiling=treeVertices(group,9001);
  expect(recoiling).not.toEqual(treeBefore);
  const meanX=(positions:number[])=>positions.filter((_,index)=>index%3===0).reduce((sum,x)=>sum+x,0)/(positions.length/3);
  expect(meanX(recoiling)).toBeGreaterThan(meanX(treeBefore));
  expect(treeVertices(group,9002)).toEqual(otherBefore);
  expect(meshes.map(mesh=>(mesh as THREE.Mesh).geometry)).toEqual(geometries);
  layer.presentChop(contact+.6);
  expect(treeVertices(group,9001)).toEqual(treeBefore);
  expect(treeVertices(group,9002)).toEqual(otherBefore);
  layer.clear();material.dispose();
});

test('designation alone, unchanged work and interruption never add a tree hit',()=>{
  const {world,layer,group,material}=setup(),before=treeVertices(group,9001);
  const next=structuredClone(world);next.tick++;
  layer.adoptChopWork(world,next);layer.presentChop(next.tick/6+.1);
  expect(treeVertices(group,9001)).toEqual(before);
  next.jobs[0]!.progress=1;layer.adoptChopWork(world,next);layer.presentChop(next.tick/6+.04);
  expect(treeVertices(group,9001)).not.toEqual(before);
  next.pawns[0]!.state='idle';next.pawns[0]!.jobId=null;next.jobs=[];
  layer.adoptChopWork(next,structuredClone(next));
  expect(treeVertices(group,9001)).toEqual(before);
  expect(chopRecoilAngle(.55)).toBe(0);
  layer.clear();material.dispose();
});

test('sparse confirmed snapshots can animate two trees in one resident buffer without advancing in pause',()=>{
  const {world,layer,group,material}=setup();
  const second=world.pawns[1]!;second.x=9;second.z=8;second.state='working';second.jobId=9101;
  world.jobs.push({...world.jobs[0]!,id:9101,x:10,reservedBy:second.id});
  const phaseCrossed=(id:number,from:number,to:number)=>{
    const cycle=(tick:number)=>Math.floor((11*tick/6+id*1.7-1.5*Math.PI)/(2*Math.PI));
    return cycle(to)>cycle(from);
  };
  let tick=3;while(tick<100&&(!phaseCrossed(world.pawns[0]!.id,tick-2,tick)||!phaseCrossed(second.id,tick-2,tick)))tick++;
  expect(tick).toBeLessThan(100);
  world.tick=tick-2;
  const beforeA=treeVertices(group,9001),beforeB=treeVertices(group,9002);
  const next=structuredClone(world);next.tick=tick;for(const job of next.jobs)job.progress=2;
  layer.adoptChopWork(world,next);
  const shown=tick/6+.02;layer.presentChop(shown);
  expect(treeVertices(group,9001)).not.toEqual(beforeA);
  expect(treeVertices(group,9002)).not.toEqual(beforeB);
  const pausedA=treeVertices(group,9001),pausedB=treeVertices(group,9002);
  layer.presentChop(shown);
  expect(treeVertices(group,9001)).toEqual(pausedA);
  expect(treeVertices(group,9002)).toEqual(pausedB);
  for(let frame=0;frame<25;frame++)layer.presentChop(shown+frame/240);
  const updated=group.children.flatMap(chunk=>chunk.children).filter(mesh=>{
    const position=(mesh as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute;
    return position.updateRanges.length>0;
  }) as THREE.Mesh[];
  expect(updated.length).toBeGreaterThan(0);
  for(const mesh of updated){
    const ranges=(mesh.userData.resourceRanges as ResourceRangeData).ranges;
    const expected=ranges.filter(range=>range.id===9001||range.id===9002||Math.floor(-range.id/2)===9001||Math.floor(-range.id/2)===9002);
    const position=mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    expect(position.updateRanges).toEqual(expect.arrayContaining(expected.map(range=>({start:range.vertexStart*3,count:range.vertexCount*3}))));
    expect(position.updateRanges.length).toBeLessThanOrEqual(expected.length);
  }
  layer.clearChopRecoil();
  expect(treeVertices(group,9001)).toEqual(beforeA);
  expect(treeVertices(group,9002)).toEqual(beforeB);
  layer.clear();material.dispose();
});

test('growth while a tree recoils restores its new size without accumulating tilt',()=>{
  const {world,layer,group,material}=setup(),next=structuredClone(world);
  next.tick++;next.jobs[0]!.progress=1;
  layer.adoptChopWork(world,next);layer.presentChop(next.tick/6+.04);
  next.resources[0]!.growth=.61;
  layer.update(next,false);
  for(const object of group.children.flatMap(chunk=>chunk.children)){
    const mesh=object as THREE.Mesh,data=mesh.userData.resourceRanges as ResourceRangeData|undefined;
    if(!data?.ranges.some(range=>range.id===9001||Math.floor(-range.id/2)===9001))continue;
    const exact=mesh.geometry.boundingSphere!.radius;
    mesh.geometry.computeBoundingSphere();
    expect(exact).toBeGreaterThanOrEqual(mesh.geometry.boundingSphere!.radius+1.49);
  }
  const expectedGroup=new THREE.Group(),expectedMaterial=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  const expectedLayer=new ResourceLayer(expectedGroup,expectedMaterial);expectedLayer.update(next,true);
  const resized=treeVertices(group,9001),fresh=treeVertices(expectedGroup,9001);
  expect(resized).toHaveLength(fresh.length);
  expect(Math.max(...resized.map((value,index)=>Math.abs(value-fresh[index]!)))).toBeLessThan(.000002);
  layer.presentChop(next.tick/6+.2);
  expect(treeVertices(group,9001)).toEqual(resized);
  layer.clear();material.dispose();expectedLayer.clear();expectedMaterial.dispose();
});
