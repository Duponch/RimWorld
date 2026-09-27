import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { vec4 } from 'three/tsl';
import { createWorld } from '../src/sim/engine';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { PlantClusterLayer,plantClusterPresentation } from '../src/render/PlantClusterLayer';
import { GpuGroundGrassLayer } from '../src/render/GpuGroundGrassLayer';
import { StructureVfxLayer } from '../src/render/StructureVfxLayer';
import { PaintedWater } from '../src/render/PaintedWater';
import type { ResourceRangeData } from '../src/render/StaticGeometry';

test('tree wind uses stable per-vertex roots and only changes shared shader uniforms',()=>{
  const world=createWorld(137,16,16);
  world.resources=[
    {id:9001,kind:'tree',species:'oak',x:4,z:5,amount:35,growth:1},
    {id:9002,kind:'rock',x:6,z:5,amount:4},
  ];
  const material=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  material.userData.rendererOwned=true;
  const group=new THREE.Group(),layer=new ResourceLayer(group,material);
  try {
    const lighting=vec4(1,1,1,1);
    material.outputNode=lighting;
    layer.update(world,true);
    const meshes:THREE.Mesh[]=[];
    group.traverse(object=>{if(object instanceof THREE.Mesh)meshes.push(object);});
    const windy=meshes.filter(mesh=>mesh.geometry.hasAttribute('windRoot'));
    expect(windy.length).toBeGreaterThan(0);
    expect((windy[0]!.material as THREE.MeshStandardNodeMaterial).outputNode).toBe(lighting);
    let treeVertices=0,rockVertices=0;
    for(const mesh of windy){
      const ranges=(mesh.userData.resourceRanges as ResourceRangeData).ranges;
      const roots=mesh.geometry.getAttribute('windRoot');
      expect(roots.count).toBe(mesh.geometry.getAttribute('position').count);
      for(const range of ranges)for(let i=range.vertexStart;i<range.vertexStart+range.vertexCount;i++){
        if(range.id===9001||Math.floor(-range.id/2)===9001){
          expect(roots.getX(i)).toBe(4);expect(roots.getY(i)).toBe(5);
          expect(roots.getZ(i)).toBeGreaterThan(0);treeVertices++;
        }else if(range.id===9002){expect(roots.getZ(i)).toBe(0);rockVertices++;}
      }
    }
    expect(treeVertices).toBeGreaterThan(0);
    expect(rockVertices).toBeGreaterThan(0);
    const positionVersions=windy.map(mesh=>(mesh.geometry.getAttribute('position') as THREE.BufferAttribute).version);
    const rootVersions=windy.map(mesh=>(mesh.geometry.getAttribute('windRoot') as THREE.BufferAttribute).version);
    layer.setWind(1.4,0,2);layer.presentWind(180);
    expect(layer['windStrength'].value).toBe(1.4);
    expect(layer['windDirection'].value.toArray()).toEqual([0,1]);
    expect(layer['windTick'].value).toBe(180);
    expect(windy.map(mesh=>(mesh.geometry.getAttribute('position') as THREE.BufferAttribute).version)).toEqual(positionVersions);
    expect(windy.map(mesh=>(mesh.geometry.getAttribute('windRoot') as THREE.BufferAttribute).version)).toEqual(rootVersions);
  } finally {layer.dispose();material.dispose();}
});

test('both grass batches and smoke share wind direction without rewriting instances each frame',()=>{
  const world=createWorld(138,12,12);
  const grass={id:9003,kind:'wild-plant' as const,species:'tall-grass' as const,x:4,z:4,amount:1,growth:1};
  world.resources=[grass];
  const material=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  const plants=new PlantClusterLayer(material),ground=new GpuGroundGrassLayer(),smoke=new StructureVfxLayer();
  try {
    const lighting=vec4(1,1,1,1);
    material.outputNode=lighting;
    plants.update(world,true);ground.update(world);smoke.adopt(world,true);
    const plantMesh=plants.group.children[0] as THREE.InstancedMesh;
    expect((plantMesh.material as THREE.MeshStandardNodeMaterial).outputNode).toBe(lighting);
    const yaw=plantMesh.geometry.getAttribute('windYaw') as THREE.InstancedBufferAttribute;
    expect(yaw.getX(0)).toBeCloseTo(plantClusterPresentation(world,grass).rotation,5);
    const matrixVersion=plantMesh.instanceMatrix.version,yawVersion=yaw.version;
    const grassMapVersion=ground.map.version,bladeVersion=(ground.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).version;
    const smokePosition=smoke.smoke.geometry.getAttribute('smokePosition') as THREE.InstancedBufferAttribute;
    const smokeVersion=smokePosition.version;
    for(const layer of [plants,ground,smoke])layer.setWind(1.25,3,4);
    plants.presentWind(90);ground.presentWind(90);smoke.present(90);
    expect(plants['windDirection'].value.toArray()).toEqual([.6,.8]);
    expect(ground['windDirection'].value.toArray()).toEqual([.6,.8]);
    expect(smoke['windDirection'].value.toArray()).toEqual([.6,.8]);
    expect(plantMesh.instanceMatrix.version).toBe(matrixVersion);
    expect(yaw.version).toBe(yawVersion);
    expect(ground.map.version).toBe(grassMapVersion);
    expect((ground.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).version).toBe(bladeVersion);
    expect(smokePosition.version).toBe(smokeVersion);
    expect(plants['windTick'].value).toBe(90);
    expect(ground['windTick'].value).toBe(90);
    expect(smoke['tick'].value).toBe(90);
  } finally {plants.dispose();ground.dispose();smoke.dispose();material.dispose();}
});

test('painted water integrates wind speed without a phase jump when weather changes',()=>{
  const texture=new THREE.DataTexture(new Uint8Array([120,150,180,255]),1,1);
  const water=new PaintedWater(texture,()=>{});
  try {
    water.setWind(.5,1,0);water.present(10);
    const swell=water['time'].value,ripple=water['ripplePhase'].value;
    water.setWind(2,0,1);water.present(10);
    expect(water['time'].value).toBe(swell);
    expect(water['ripplePhase'].value).toBe(ripple);
    water.present(10.5);
    expect(water['time'].value).toBeCloseTo((swell+1.35)%(2*Math.PI),8);
    expect(water['ripplePhase'].value).toBeCloseTo((ripple+2.65)%(2*Math.PI),8);
    const frozen=water['ripplePhase'].value;
    water.present(10.5);expect(water['ripplePhase'].value).toBe(frozen);
  } finally {water.dispose();texture.dispose();}
});
