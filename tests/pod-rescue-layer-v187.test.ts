import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { POD_RESCUE_PARTS,PodRescueLayer } from '../src/render/PodRescueLayer';

function pending(world:ReturnType<typeof createWorld>,x=12,z=9) {
  world.podRescues={profile:'civilian-pod-rescue-v1',serial:1,incidents:[],departed:[],
    pending:{id:1,start:10,landAt:16,openAt:20,cell:{x,z},seed:4871}};
}

test('capsule retains one six-part box batch, stable attributes and unchanged worlds',()=>{
  const world=createWorld(187,32,32),layer=new PodRescueLayer();
  const mesh=layer.mesh,geometry=mesh.geometry,matrix=mesh.instanceMatrix,color=mesh.colorBuffer;
  const attrs={...geometry.attributes},index=geometry.index;
  expect(layer.group.children).toEqual([mesh]);
  expect(matrix.count).toBe(POD_RESCUE_PARTS);
  expect(mesh.activeCount).toBe(0);expect(mesh.visible).toBe(false);
  pending(world);const before=structuredClone(world);
  layer.adopt(world);layer.present(10);
  expect(world).toEqual(before);expect(mesh.activeCount).toBe(6);
  expect(mesh.castShadow&&mesh.receiveShadow).toBe(true);
  const version=matrix.version;
  for(let i=0;i<12;i++){layer.adopt(structuredClone(world));layer.present(16);}
  expect(matrix.version).toBe(version);expect(mesh.geometry).toBe(geometry);
  expect(mesh.instanceMatrix).toBe(matrix);expect(mesh.colorBuffer).toBe(color);
  expect(geometry.index).toBe(index);
  for(const [name,attr] of Object.entries(attrs))expect(geometry.getAttribute(name)).toBe(attr);
  expect(index!.count).toBe(36);expect(geometry.getAttribute('normal').count).toBe(24);
  delete world.podRescues!.pending;layer.adopt(world);
  expect(mesh.activeCount).toBe(0);expect(mesh.visible).toBe(false);
  pending(world,7,6);layer.adopt(world);
  expect(mesh.geometry).toBe(geometry);expect(matrix.version).toBe(version);
  layer.dispose();
});

test('presentation changes only its confirmed tick uniform and bounds cover the fall and open lids',()=>{
  const world=createWorld(188,32,32);pending(world);
  const layer=new PodRescueLayer();layer.adopt(world);
  const matrix=Array.from(layer.mesh.instanceMatrix.array),color=Array.from(layer.mesh.colorBuffer.array);
  const versions=[layer.mesh.instanceMatrix.version,layer.mesh.colorBuffer.version];
  layer.present(16.25);layer.present(16.25);
  expect(layer.tick.value).toBe(16.25);
  expect(Array.from(layer.mesh.instanceMatrix.array)).toEqual(matrix);
  expect(Array.from(layer.mesh.colorBuffer.array)).toEqual(color);
  expect([layer.mesh.instanceMatrix.version,layer.mesh.colorBuffer.version]).toEqual(versions);
  const bounds=layer.mesh.boundingSphere;
  for(const height of [0,24.9])for(const x of [-1.4,1.4])for(const z of [-1.4,1.4])
    expect(bounds.containsPoint(new THREE.Vector3(12+x,height,9+z))).toBe(true);
  pending(world,4,5);layer.adopt(world);expect(bounds.center.x).toBe(4);expect(bounds.center.z).toBe(5);
  layer.dispose();
});

test('lighting configures both resident surfaces and textures select a distinct plain graph',()=>{
  const configured:THREE.MeshStandardNodeMaterial[]=[],layer=new PodRescueLayer(m=>configured.push(m));
  expect(configured).toHaveLength(2);
  const painted=layer.mesh.material;layer.setTexturesEnabled(false);
  const plain=layer.mesh.material as THREE.MeshStandardNodeMaterial;
  expect(plain).not.toBe(painted);expect(plain.colorNode).toBeTruthy();
  const samples=(surface:THREE.MeshStandardNodeMaterial)=>{
    let count=0;surface.colorNode!.traverse(node=>{if('isTextureNode' in node&&node.isTextureNode)count++;});return count;
  };
  expect(plain.map).toBeNull();expect(samples(plain)).toBe(0);
  expect(samples(painted as THREE.MeshStandardNodeMaterial)).toBe(1);
  expect(plain.positionNode).toBe((painted as THREE.MeshStandardNodeMaterial).positionNode);
  expect(plain.opacityNode).toBe((painted as THREE.MeshStandardNodeMaterial).opacityNode);
  const version=layer.mesh.instanceMatrix.version;layer.setTexturesEnabled(false);layer.setTexturesEnabled(true);
  expect(layer.mesh.material).toBe(painted);expect(layer.mesh.instanceMatrix.version).toBe(version);
  layer.dispose();expect(layer.group.children).toHaveLength(0);
});

test('compile preparation restores exact empty data without discarding a newer adopted capsule',()=>{
  const world=createWorld(189,32,32),layer=new PodRescueLayer();
  const geometry=layer.mesh.geometry,buffer=layer.mesh.instanceMatrix;
  const initial=Array.from(buffer.array),restore=layer.prepareForCompile();
  expect(layer.mesh.activeCount).toBe(1);expect(layer.mesh.visible).toBe(true);expect(layer.mesh.frustumCulled).toBe(false);
  restore();expect(layer.mesh.activeCount).toBe(0);expect(layer.mesh.visible).toBe(false);
  expect(Array.from(buffer.array)).toEqual(initial);expect(layer.mesh.frustumCulled).toBe(true);
  const switched=layer.prepareForCompile();layer.setTexturesEnabled(false);switched();
  expect(layer.mesh.activeCount).toBe(0);expect(layer.mesh.visible).toBe(false);
  const newer=layer.prepareForCompile();pending(world);layer.adopt(world);newer();
  expect(layer.mesh.activeCount).toBe(6);expect(layer.mesh.visible).toBe(true);
  expect(Array.from(buffer.array)).toEqual(initial);expect(layer.mesh.geometry).toBe(geometry);
  const active=layer.prepareForCompile();delete world.podRescues!.pending;layer.adopt(world);active();
  expect(layer.mesh.activeCount).toBe(0);expect(layer.mesh.visible).toBe(false);
  expect(layer.mesh.frustumCulled).toBe(true);layer.dispose();
});

test('compile restoration never overwrites a newer resident matrix version',()=>{
  const layer=new PodRescueLayer(),buffer=layer.mesh.instanceMatrix,restore=layer.prepareForCompile();
  buffer.array[12]=7;buffer.needsUpdate=true;layer.mesh.activeCount=6;
  restore();expect(buffer.array[12]).toBe(7);expect(layer.mesh.activeCount).toBe(6);
  expect(layer.mesh.visible).toBe(true);expect(layer.mesh.frustumCulled).toBe(true);layer.dispose();
});

test('blocked pending remains closed beyond its deadline and opens only after the actual incident',()=>{
  const world=createWorld(190,32,32);pending(world);
  const layer=new PodRescueLayer();layer.adopt(world);
  const buffer=layer.mesh.instanceMatrix,version=buffer.version;
  for(const tick of [20,21,120]){
    world.tick=tick;const before=structuredClone(world);
    layer.present(tick);layer.adopt(world);
    expect(layer.mesh.activeCount).toBe(6);expect(layer.mesh.visible).toBe(true);
    expect(layer.opening.value.y).toBe(0);
    expect(world).toEqual(before);
  }
  expect(buffer.version).toBe(version);
  world.tick=120;delete world.podRescues!.pending;
  world.podRescues!.incidents.push({id:1,start:10,openedAt:120,pawnId:world.pawns[0]!.id});
  layer.adopt(world);
  expect(layer.opening.value.toArray()).toEqual([120,1]);
  expect(layer.mesh.activeCount).toBe(6);expect(layer.mesh.visible).toBe(true);
  layer.present(121);layer.present(121);
  expect(layer.opening.value.toArray()).toEqual([120,1]);expect(buffer.version).toBe(version);
  world.tick=121;layer.adopt(world);expect(layer.mesh.activeCount).toBe(6);
  world.tick=122;layer.adopt(world);expect(layer.mesh.activeCount).toBe(6);
  layer.present(122);layer.adopt(world);expect(layer.mesh.activeCount).toBe(0);expect(layer.mesh.visible).toBe(false);
  expect(buffer.version).toBe(version);layer.dispose();
});
