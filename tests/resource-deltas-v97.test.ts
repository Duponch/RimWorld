import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import type { Resource,World } from '../src/sim/types';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { NaturalResourcePresentation } from '../src/render/NaturalResourcePresentation';
import { isClusterPlantSpecies } from '../src/render/flora-presentation';

function appearance(group:THREE.Group) {
  return group.children.map(chunk=>({
    name:chunk.name,
    meshes:chunk.children.map(object=>{
      const mesh=object as THREE.Mesh,geometry=mesh.geometry;
      const range=mesh.userData.resourceRanges as {ranges:{id:number;start:number;count:number;vertexStart:number;vertexCount:number}[];original:Uint16Array|Uint32Array;originalPositions:Float32Array};
      return {
        name:mesh.name,visible:mesh.visible,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,
        drawRange:{...geometry.drawRange},ranges:range.ranges.map(item=>({...item})),
        index:Array.from(geometry.index!.array),originalIndex:Array.from(range.original),
        positions:Array.from(geometry.getAttribute('position').array),originalPositions:Array.from(range.originalPositions),
        normals:Array.from(geometry.getAttribute('normal').array),colors:Array.from(geometry.getAttribute('color').array),
      };
    }),
  }));
}

test('resource deltas match full chunk updates across growth, masks, replacement and chunk moves',()=>{
  const world:World=createWorld(42,64,64);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[
    {id:1,kind:'tree',species:'oak',x:2,z:2,amount:20,growth:.01,growthTick:0},
    {id:2,kind:'berries',x:3,z:2,amount:10,growth:.64,growthTick:world.tick},
    {id:3,kind:'rock',stone:'granite',x:17,z:2,amount:20},
    {id:4,kind:'tree',species:'pine',x:34,z:2,amount:20},
    {id:5,kind:'tree',species:'oak',x:50,z:2,amount:20},
    {id:6,kind:'wild-plant',species:'grass',x:5,z:2,amount:2},
  ];
  const presentation=new NaturalResourcePresentation();
  const incrementalGroup=new THREE.Group(),fullGroup=new THREE.Group();
  const material=new THREE.MeshStandardNodeMaterial();material.userData.rendererOwned=true;
  const incremental=new ResourceLayer(incrementalGroup,material),full=new ResourceLayer(fullGroup,material);
  const visible=(view:World):World=>({...view,resources:view.resources.filter(r=>!isClusterPlantSpecies(r.species))});
  const initial=visible(presentation.read(world,true)!);
  incremental.update(initial,true,presentation.changes);full.update(initial,true);
  expect(appearance(incrementalGroup)).toEqual(appearance(fullGroup));
  const stable=incrementalGroup.children.find(chunk=>chunk.name==='Resources 3:0')!;
  const stableMeshes=stable.children as THREE.Mesh[];
  const stableGeometries=stableMeshes.map(mesh=>mesh.geometry);
  const stableVersions=stableMeshes.map(mesh=>[mesh.geometry.index!.version,(mesh.geometry.getAttribute('position') as THREE.BufferAttribute).version]);
  const check=()=>{
    const view=presentation.read(world);
    expect(view).toBeDefined();
    const rendering=visible(view!);
    const rng=world.rng;
    incremental.update(rendering,false,presentation.changes);
    full.update(rendering,false);
    expect(world.rng).toBe(rng);
    expect(appearance(incrementalGroup)).toEqual(appearance(fullGroup));
    expect(incrementalGroup.children.find(chunk=>chunk.name==='Resources 3:0')).toBe(stable);
    expect(stableMeshes.map(mesh=>mesh.geometry)).toEqual(stableGeometries);
    expect(stableMeshes.map(mesh=>[mesh.geometry.index!.version,(mesh.geometry.getAttribute('position') as THREE.BufferAttribute).version])).toEqual(stableVersions);
  };
  try {
    world.resources[5]!.growth=.4;check(); // cluster-only delta never touches a resource chunk
    world.resources[0]!.growth=.5;check();
    world.resources[1]!.growth=.66;check();
    world.resources[0]!.plantLife={since:world.tick,age:0,darkTicks:0,leaflessAt:world.tick,nextCheck:world.tick+100};check();
    delete world.resources[0]!.plantLife;check();
    const berry=world.resources[1]!;world.resources=world.resources.filter(r=>r.id!==berry.id);check();
    world.resources.splice(1,0,berry);check();
    world.resources[2]!.x=32;check(); // old chunk becomes empty
    world.resources[2]!.stone='marble';check();
    Object.assign(world.resources[2]!,{kind:'tree',species:'birch'} satisfies Partial<Resource>);check();
    incremental.setFoliageVisible(false);full.setFoliageVisible(false);
    world.resources.push({id:7,kind:'tree',species:'saguaro',x:18,z:3,amount:10});check();
    incremental.setFoliageVisible(true);full.setFoliageVisible(true);
    world.resources=world.resources.filter(r=>r.id!==7);check();
  } finally {incremental.clear();full.clear();material.dispose();}
});
