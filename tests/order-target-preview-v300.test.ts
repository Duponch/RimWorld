import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/index';
import {ResourceLayer} from '../src/render/ResourceLayer';
import {CropLayer} from '../src/render/CropLayer';
import {PlantClusterLayer} from '../src/render/PlantClusterLayer';
import {OrderTargetPreviewLayer} from '../src/render/OrderTargetPreviewLayer';
import {rangeTargetResourceId} from '../src/render/resource-target-tint';
import type {ResourceRangeData} from '../src/render/StaticGeometry';
import {ROCK_VERTICES,writeRockCell} from '../src/render/RockSurface';

function meshes(group:THREE.Group):THREE.Mesh[]{const out:THREE.Mesh[]=[];group.traverse(o=>{if(o instanceof THREE.Mesh)out.push(o);});return out;}
function colorsFor(group:THREE.Group,id:number):number[]{
  const out:number[]=[];for(const mesh of meshes(group)){
    const data=mesh.userData.resourceRanges as ResourceRangeData|undefined;if(!data)continue;
    const color=mesh.geometry.getAttribute('color');
    for(const range of data.ranges)if(rangeTargetResourceId(range.id)===id)out.push(...color.array.slice(range.vertexStart*3,(range.vertexStart+range.vertexCount)*3));
  }return out;
}
function setup(){
  const world=createWorld(300,20,20);world.resources=[
    {id:9001,kind:'tree',species:'oak',x:4,z:4,amount:30,growth:1},
    {id:9002,kind:'tree',species:'oak',x:4,z:4,amount:30,growth:1},
    {id:9003,kind:'rock',x:6,z:4,amount:20},
  ];
  const group=new THREE.Group(),material=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  const layer=new ResourceLayer(group,material);layer.update(world,true);return{world,group,material,layer};
}

test('ID tint includes crown aliases, excludes neighbouring models and restores exact colors without changing meshes/materials',()=>{
  const {group,material,layer}=setup();try{
    const original=meshes(group),materials=original.map(m=>m.material),tree=colorsFor(group,9001),other=colorsFor(group,9002),rock=colorsFor(group,9003);
    expect(tree.length).toBeGreaterThan(0);expect(other.length).toBeGreaterThan(0);expect(rock.length).toBeGreaterThan(0);
    const positions=original.map(m=>m.geometry.getAttribute('position').array.slice());
    layer.setTargetPreview(new Set([9001]));expect(colorsFor(group,9001)).not.toEqual(tree);
    expect(colorsFor(group,9002)).toEqual(other);expect(colorsFor(group,9003)).toEqual(rock);
    expect(meshes(group)).toEqual(original);expect(original.map(m=>m.material)).toEqual(materials);
    expect(original.map(m=>m.geometry.getAttribute('position').array)).toEqual(positions);
    layer.clearTargetPreview();expect(colorsFor(group,9001)).toEqual(tree);
  }finally{layer.dispose();material.dispose();}
});

test('identical selection and frame wind are inert; repeated culled drags have bounded pending ranges and no color drift',()=>{
  const {group,material,layer}=setup();try{
    const before=meshes(group).map(m=>m.geometry.getAttribute('color').array.slice());
    layer.setTargetPreview(new Set([9001]));
    const selected=meshes(group).map(m=>(m.geometry.getAttribute('color') as THREE.BufferAttribute).version);
    layer.setTargetPreview(new Set([9001]));layer.presentWind(123);
    expect(meshes(group).map(m=>(m.geometry.getAttribute('color') as THREE.BufferAttribute).version)).toEqual(selected);
    for(let i=0;i<100;i++)layer.setTargetPreview(new Set([i%2?9001:9002]));
    for(const mesh of meshes(group))expect((mesh.geometry.getAttribute('color') as THREE.BufferAttribute).updateRanges.length).toBeLessThanOrEqual(1);
    layer.clearTargetPreview();expect(meshes(group).map(m=>m.geometry.getAttribute('color').array)).toEqual(before);
  }finally{layer.dispose();material.dispose();}
});

for(const resident of ['crop','cluster'] as const)test(`${resident} preview targets exact slots and restores current growth colors through removals, reuse and reset`,()=>{
  const world=createWorld(302,8,8),material=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  world.resources=resident==='crop'
    ?[{id:9101,kind:'rice',x:2,z:2,amount:6,growth:1,growthTick:world.tick},{id:9102,kind:'rice',x:2,z:2,amount:6,growth:.8,growthTick:world.tick}]
    :[{id:9101,kind:'wild-plant',species:'grass',x:2,z:2,amount:1,growth:1,growthTick:world.tick},{id:9102,kind:'wild-plant',species:'tall-grass',x:2,z:2,amount:1,growth:.8,growthTick:world.tick}];
  const layer=resident==='crop'?new CropLayer(material):new PlantClusterLayer(material);
  const reference=resident==='crop'?new CropLayer(material):new PlantClusterLayer(material);
  const active=(owner:CropLayer|PlantClusterLayer)=>owner.group.children.find(o=>(o as THREE.InstancedMesh).count>0) as THREE.InstancedMesh;
  const update=(reset=false)=>{layer.update(world,reset);reference.update(world,reset);};
  try{
    update(true);const mesh=active(layer),original=mesh.instanceColor!.array.slice(),matrix=mesh.instanceMatrix.array.slice(),count=mesh.count;
    layer.setTargetPreview(new Set([9101]));
    expect(mesh.instanceColor!.array.slice(0,3)).not.toEqual(original.slice(0,3));
    expect(mesh.instanceColor!.array.slice(3)).toEqual(original.slice(3));
    expect(mesh.instanceMatrix.array).toEqual(matrix);expect(mesh.count).toBe(count);
    const version=mesh.instanceColor!.version;layer.setTargetPreview(new Set([9101]));expect(mesh.instanceColor!.version).toBe(version);
    world.resources[0]!.growth=.25;update();
    expect(active(layer).instanceColor!.array.slice(0,3)).not.toEqual(active(reference).instanceColor!.array.slice(0,3));
    layer.clearTargetPreview();expect(active(layer).instanceColor!.array).toEqual(active(reference).instanceColor!.array);
    layer.setTargetPreview(new Set([9101]));world.resources=world.resources.filter(r=>r.id!==9101);update();
    world.resources.push({...world.resources[0]!,id:9103,x:5,growth:.5});update();
    layer.clearTargetPreview();expect(active(layer).instanceColor!.array).toEqual(active(reference).instanceColor!.array);
    layer.setTargetPreview(new Set([9103]));update(true);
    expect(active(layer).instanceColor!.array).toEqual(active(reference).instanceColor!.array);
    expect(layer.group.children).toHaveLength(resident==='crop'?4:1);
  }finally{layer.dispose();reference.dispose();material.dispose();}
});

test('a selected chunk rebuild uses fresh baseline colors and checkpoint reset clears the preview',()=>{
  const {world,group,material,layer}=setup();try{
    layer.setTargetPreview(new Set([9001]));world.resources[0]!.x=7;layer.update(world,false);
    const current=colorsFor(group,9001);expect(current.length).toBeGreaterThan(0);
    layer.clearTargetPreview();expect(colorsFor(group,9001)).not.toEqual(current);
    const resetBaseline=colorsFor(group,9001);layer.setTargetPreview(new Set([9001]));layer.update(world,true);
    expect(colorsFor(group,9001)).toEqual(resetBaseline);
  }finally{layer.dispose();material.dispose();}
});

test('mining overlay uses exact selected terrain surface, never loose resource rocks, and preserves a newer selection during compile',()=>{
  const world=createWorld(301,12,12);world.tiles=world.tiles.map(()=>({terrain:'soil'}));
  const cell=4*world.width+4;world.tiles[cell]={terrain:'rock'};world.tiles[cell+1]={terrain:'rock'};
  world.resources=[{id:9001,kind:'rock',x:2,z:2,amount:20}];
  const layer=new OrderTargetPreviewLayer();try{
    const restore=layer.prepareForCompile();layer.updateRock(world,[cell,cell,2*world.width+2]);restore();
    expect(layer.mesh.visible).toBe(true);
    const expected=new Float32Array(ROCK_VERTICES*3),faces=writeRockCell(world,4,4,expected,0),geometry=layer.mesh.geometry;
    expect(geometry.getAttribute('position').array.slice(0,expected.length)).toEqual(expected);
    expect(geometry.index!.array.slice(0,faces.length)).toEqual(new Uint32Array(faces));expect(geometry.drawRange.count).toBe(faces.length);
    layer.updateRock(world,[2*world.width+2]);expect(layer.mesh.visible).toBe(false);expect(geometry.drawRange.count).toBe(0);
    const cold=layer.prepareForCompile();cold();expect(layer.mesh.visible).toBe(false);expect(geometry.drawRange.count).toBe(0);
  }finally{layer.dispose();}
});
