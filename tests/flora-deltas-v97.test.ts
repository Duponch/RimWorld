import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import type { Resource, World } from '../src/sim/types';
import { NaturalResourcePresentation } from '../src/render/NaturalResourcePresentation';
import { OverviewLayer } from '../src/render/OverviewLayer';
import { PlantClusterLayer } from '../src/render/PlantClusterLayer';
import { material } from '../src/render/primitives';
import { isClusterPlantSpecies } from '../src/render/flora-presentation';

function resource(id:number,kind:Resource['kind'],species:Resource['species'],x:number,z:number):Resource {
  return {id,kind,species,x,z,amount:1,growth:1,growthTick:0};
}

function overviewBuffers(layer:OverviewLayer):unknown[] {
  const vegetation=layer.group.children[1] as THREE.Group;
  return vegetation.children.map(child=>{
    const mesh=child as THREE.InstancedMesh;
    return {count:mesh.count,matrix:Array.from(mesh.instanceMatrix.array),color:mesh.instanceColor?Array.from(mesh.instanceColor.array):null};
  });
}

function expectAllClusterVerticesInside(mesh:THREE.InstancedMesh):void {
  const sphere=mesh.boundingSphere;
  expect(sphere).not.toBeNull();
  const positions=mesh.geometry.getAttribute('position');
  const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
  for(let i=0;i<mesh.count;i++) {
    mesh.getMatrixAt(i,matrix);
    for(let vertex=0;vertex<positions.count;vertex++) {
      point.fromBufferAttribute(positions,vertex).applyMatrix4(matrix);
      expect(point.distanceTo(sphere!.center)).toBeLessThanOrEqual(sphere!.radius+1e-5);
    }
  }
}

test('overview sparse deltas retain the same resident buffers as the full path',()=>{
  const world:World=createWorld(97,64,64);
  world.resources=[
    resource(101,'tree','oak',4,5),
    resource(102,'berries','berry-bush',8,7),
    resource(103,'wild-plant','agave',12,9),
    resource(104,'rock',undefined,20,11),
    resource(105,'wild-plant','grass',25,26),
  ];
  const presentation=new NaturalResourcePresentation();
  const sparse=new OverviewLayer(),full=new OverviewLayer();
  const initial=presentation.read(world,true)!;
  const visible=(view:World):World=>({...view,resources:view.resources.filter(r=>!isClusterPlantSpecies(r.species))});
  sparse.update(visible(initial),true,presentation.changes);full.update(visible(initial),true);
  expect(overviewBuffers(sparse)).toEqual(overviewBuffers(full));

  const compare=()=>{
    const view=presentation.read(world);
    expect(view).toBeDefined();
    sparse.update(visible(view!),false,presentation.changes);
    full.update(visible(view!),false);
    expect(overviewBuffers(sparse)).toEqual(overviewBuffers(full));
  };
  const originalMeshes=(sparse.group.children[1] as THREE.Group).children.slice();
  world.resources[4]!.growth=.1;compare(); // unfiltered tuft delta has no overview slot
  expect((sparse.group.children[1] as THREE.Group).children.every((mesh,i)=>mesh===originalMeshes[i])).toBe(true);
  world.resources[0]!.growth=.1;compare(); // growth stage
  world.resources[0]!.x=40;compare(); // move across render chunks
  world.resources[2]!.species='moss';compare(); // same-kind species/color
  world.resources[2]!.species='grass';compare(); // formerly visible slot disappears
  world.resources[2]!.species='moss';compare(); // slot is restored
  const removed=world.resources[1]!;
  world.resources=world.resources.filter(r=>r.id!==removed.id);compare();
  world.resources=[world.resources[0]!,removed,...world.resources.slice(1)];compare(); // reuse slot
  world.resources[2]!.kind='tree';world.resources[2]!.species='pine';compare(); // full rebuild
  world.resources.push(resource(106,'tree','pine',32,31));compare(); // new slot/capacity
  sparse.dispose();full.dispose();
});

test('cluster bounds conservatively contain every instance through growth, removal and restoration',()=>{
  const world:World=createWorld(97,80,80);
  world.resources=[resource(201,'wild-plant','grass',2,3),resource(202,'wild-plant','tall-grass',70,65)];
  const shared=material(0xffffff,{vertexColors:true});
  shared.userData.rendererOwned=true;
  const layer=new PlantClusterLayer(shared),presentation=new NaturalResourcePresentation();
  layer.update(presentation.read(world,true)!,true,presentation.changes);
  const mesh=layer.group.children[0] as THREE.InstancedMesh;
  expectAllClusterVerticesInside(mesh);
  const recompute=mesh.computeBoundingSphere;
  mesh.computeBoundingSphere=()=>{throw new Error('Delta must not scan every instance');};
  const update=()=>{layer.update(presentation.read(world)!,false,presentation.changes);expectAllClusterVerticesInside(mesh);};
  world.resources[0]!.growth=.1;update();
  world.resources[0]!.growth=1;update(); // mature maximum after a smaller stage
  world.resources[1]!.x=79;world.resources[1]!.z=78;update();
  const removed=world.resources[1]!;
  world.resources=[world.resources[0]!];update();
  world.resources.push(removed);update();
  mesh.computeBoundingSphere=recompute;
  layer.dispose();shared.dispose();
});
