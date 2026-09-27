import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { createWorld } from '../src/sim/engine';
import { BRAWL_PARTS,BrawlCloudLayer } from '../src/render/BrawlCloudLayer';

function source(count:number) {
  const geometry=new THREE.InstancedBufferGeometry();
  for(const name of ['aFrom','aTo','aTravel'])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(count*4),4));
  return geometry;
}

function reciprocal(world:ReturnType<typeof createWorld>) {
  const [a,b]=world.pawns;
  b!.x=a!.x+1;b!.z=a!.z;
  a!.social={rng:1,memories:[],fight:{opponentId:b!.id,startedAt:world.tick}};
  b!.social={rng:2,memories:[],fight:{opponentId:a!.id,startedAt:world.tick}};
  return [a!,b!] as const;
}

test('idle colony takes the allocation-free no-fight path without pose uploads',()=>{
  const world=createWorld(280,32,32),poses=new THREE.InstancedBufferGeometry();
  const layer=new BrawlCloudLayer({travelTime:uniform(0),blend:uniform(1)});
  const mesh=layer.group.children[0] as THREE.Mesh<THREE.InstancedBufferGeometry>;
  const buffer=(mesh.geometry.getAttribute('aAFrom') as THREE.InterleavedBufferAttribute).data;
  const version=buffer.version;
  layer.update(world,poses);layer.present(10);
  expect(mesh.geometry.instanceCount).toBe(0);
  expect(mesh.visible).toBe(false);
  expect(buffer.version).toBe(version);
  layer.dispose();poses.dispose();
});

test('one fixed seven-draw volumetric effect contains the reference piece counts',()=>{
  const world=createWorld(281,32,32),[a,b]=reciprocal(world);
  const poses=source(world.pawns.length),layer=new BrawlCloudLayer({travelTime:uniform(0),blend:uniform(1)});
  expect(layer.group.children).toHaveLength(7);
  layer.update(world,poses);
  const meshes=layer.group.children as THREE.Mesh<THREE.InstancedBufferGeometry>[];
  expect(meshes.map(mesh=>mesh.geometry.instanceCount)).toEqual([
    BRAWL_PARTS.puff,BRAWL_PARTS.puff,BRAWL_PARTS.star,BRAWL_PARTS.star,
    BRAWL_PARTS.spike,BRAWL_PARTS.voxel,BRAWL_PARTS.shadow,
  ]);
  expect(meshes.every(mesh=>mesh.visible&&mesh.frustumCulled)).toBe(true);
  expect(meshes.every(mesh=>mesh.geometry.boundingSphere!.radius>=3.8)).toBe(true);
  const impact=meshes[0]!.geometry.getAttribute('aHit') as THREE.InstancedBufferAttribute;
  expect(impact.getX(0)).toBe(-1000);
  a.melee={order:{targetId:b.id,startedDowned:false,auto:'social'},strike:{targetId:b.id,atCore:600,untilCore:720,tool:'left-fist',outcome:'miss'}};
  layer.update(world,poses);expect(impact.getX(0)).toBe(-1000);
  a.melee.strike!.outcome='hit';layer.update(world,poses);expect(impact.getX(0)).toBe(10);
  layer.setDetailVisible(false);expect(meshes.every(mesh=>!mesh.visible)).toBe(true);
  const restore=layer.prepareForCompile();expect(meshes.every(mesh=>mesh.visible&&!mesh.frustumCulled)).toBe(true);
  restore();expect(meshes.every(mesh=>!mesh.visible&&mesh.frustumCulled)).toBe(true);
  layer.dispose();poses.dispose();
});

test('mobile pair follows shared pawn pose buffers and paused clock does not upload',()=>{
  const world=createWorld(282,32,32),[a,b]=reciprocal(world);
  const poses=source(world.pawns.length),from=poses.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
  const to=poses.getAttribute('aTo') as THREE.InstancedBufferAttribute;
  const travel=poses.getAttribute('aTravel') as THREE.InstancedBufferAttribute;
  const clock={travelTime:uniform(0),blend:uniform(1)};
  const layer=new BrawlCloudLayer(clock);
  from.setXYZW(0,a.x,0,a.z,0);to.setXYZW(0,a.x,0,a.z,0);
  from.setXYZW(1,b.x,0,b.z,0);to.setXYZW(1,b.x,0,b.z,0);
  layer.update(world,poses);
  const mesh=layer.group.children[0] as THREE.Mesh<THREE.InstancedBufferGeometry>;
  const copied=mesh.geometry.getAttribute('aATo') as THREE.InterleavedBufferAttribute;
  const firstVersion=copied.data.version;
  layer.present(12);layer.present(12);
  expect(layer.time.value).toBe(2);
  expect(copied.data.version).toBe(firstVersion);
  to.setXYZW(0,a.x+.5,0,a.z+.5,0);
  travel.setXYZW(0,1,3,0,1);
  to.needsUpdate=true;travel.needsUpdate=true;
  clock.travelTime.value=2;
  layer.present(12);
  expect(copied.getX(0)).toBeCloseTo(a.x+.5);
  expect(copied.data.version).toBeGreaterThan(firstVersion);
  const after=copied.data.version;
  layer.present(12);expect(copied.data.version).toBe(after);
  a.state='downed';layer.update(world,poses);
  expect(mesh.geometry.instanceCount).toBe(0);
  expect(mesh.visible).toBe(false);
  layer.dispose();poses.dispose();
});

test('adding another fight does not reshuffle the existing cloud pieces',()=>{
  const world=createWorld(283,32,32);
  reciprocal(world);
  const poses=source(4),layer=new BrawlCloudLayer({travelTime:uniform(0),blend:uniform(1)});
  layer.update(world,poses);
  const mesh=layer.group.children[0] as THREE.Mesh<THREE.InstancedBufferGeometry>;
  const layout=()=>{
    const attr=mesh.geometry.getAttribute('aPartOne') as THREE.InterleavedBufferAttribute;
    return Array.from({length:BRAWL_PARTS.puff},(_,index)=>[
      attr.getX(index),attr.getY(index),attr.getZ(index),attr.getW(index),
    ]);
  };
  const before=layout();
  const c=world.pawns[2]!,d=structuredClone(c);
  d.id=world.nextId++;d.name='Second fighter';d.x=c.x+1;d.z=c.z;
  c.social={rng:3,memories:[],fight:{opponentId:d.id,startedAt:world.tick}};
  d.social={rng:4,memories:[],fight:{opponentId:c.id,startedAt:world.tick}};
  world.pawns.push(d);
  layer.update(world,poses);
  expect(mesh.geometry.instanceCount).toBe(BRAWL_PARTS.puff*2);
  expect(layout()).toEqual(before);
  layer.dispose();poses.dispose();
});
