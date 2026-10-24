// Ownership/restoration contracts; native pipeline compilation is checked separately.
import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {cargoGeometry,prepareCargoGeometryForCompile,selectCargoGeometryKinds} from '../src/render/pawn-geometry';
import {PawnLayer} from '../src/render/PawnLayer';
import {createWorld} from '../src/sim/engine';

test('empty cargo exposes only the real packed range and restores exact identities',()=>{
  const geometry=cargoGeometry(),groups=geometry.groups,attributes={...geometry.attributes};
  const packed=geometry.userData.cargoRangesByKind[4];
  selectCargoGeometryKinds(geometry,new Set());
  const restore=prepareCargoGeometryForCompile(geometry);
  expect(geometry.instanceCount).toBe(1);expect(geometry.groups).toBe(groups);
  expect(groups).toHaveLength(1);expect(groups[0]).toEqual(packed);
  expect(groups[0]).not.toBe(packed);expect(groups[0]!.count).toBe(72);expect(Object.isFrozen(groups[0])).toBe(true);
  for(const [key,value] of Object.entries(attributes))expect(geometry.attributes[key]).toBe(value);
  restore();restore();expect(geometry.instanceCount).toBe(0);expect(geometry.groups).toBe(groups);expect(groups).toEqual([]);
  selectCargoGeometryKinds(geometry,new Set());expect(groups).toEqual([]);geometry.dispose();
});

test('already occupied cargo retains literal range objects and count',()=>{
  const geometry=cargoGeometry();selectCargoGeometryKinds(geometry,new Set([4]));geometry.instanceCount=3;
  const group=geometry.groups[0],restore=prepareCargoGeometryForCompile(geometry);
  expect(geometry.groups[0]).toBe(group);expect(geometry.instanceCount).toBe(3);
  restore();expect(geometry.groups[0]).toBe(group);expect(geometry.instanceCount).toBe(3);geometry.dispose();
});

test('same-empty producer selection retires override before signature cache hit',()=>{
  const geometry=cargoGeometry();selectCargoGeometryKinds(geometry,new Set());
  const restore=prepareCargoGeometryForCompile(geometry);
  geometry.instanceCount=1;selectCargoGeometryKinds(geometry,new Set());
  expect(geometry.groups).toEqual([]);restore();expect(geometry.instanceCount).toBe(1);expect(geometry.groups).toEqual([]);geometry.dispose();
});

test('same-kind producer count wins even when it equals the temporary count',()=>{
  const geometry=cargoGeometry();selectCargoGeometryKinds(geometry,new Set([4]));geometry.instanceCount=0;
  const group=geometry.groups[0],restore=prepareCargoGeometryForCompile(geometry);
  geometry.instanceCount=1;selectCargoGeometryKinds(geometry,new Set([4]));restore();
  expect(geometry.instanceCount).toBe(1);expect(geometry.groups[0]).toBe(group);geometry.dispose();
});

test('partial clear wins without requiring any attribute version increment',()=>{
  const geometry=cargoGeometry(),stream=new THREE.InstancedBufferAttribute(new Float32Array(4),4);
  geometry.setAttribute('aTransferCargo',stream);selectCargoGeometryKinds(geometry,new Set([4]));geometry.instanceCount=1;
  const version=stream.version,restore=prepareCargoGeometryForCompile(geometry);
  geometry.instanceCount=0;selectCargoGeometryKinds(geometry,new Set());restore();
  expect(stream.version).toBe(version);expect(geometry.instanceCount).toBe(0);expect(geometry.groups).toEqual([]);geometry.dispose();
});

test('replacement owner and independently selected clone remain untouched',()=>{
  const geometry=cargoGeometry(),restore=prepareCargoGeometryForCompile(geometry);
  const clone=geometry.clone() as THREE.InstancedBufferGeometry;
  clone.instanceCount=2;selectCargoGeometryKinds(clone,new Set([4]));const selected=clone.groups[0];
  restore(false);expect(clone.instanceCount).toBe(2);expect(clone.groups[0]).toBe(selected);
  geometry.dispose();clone.dispose();
});

function cargo(layer:PawnLayer,name:string):THREE.Mesh<THREE.InstancedBufferGeometry> {
  const mesh=layer.group.getObjectByName(name);
  if(!(mesh instanceof THREE.Mesh))throw Error('Missing actual resident cargo mesh');
  return mesh as THREE.Mesh<THREE.InstancedBufferGeometry>;
}
test('both actual meshes restore after awaited compile failure without changing World or materials',async()=>{
  const world=createWorld(42,32);world.piles=[];const layer=new PawnLayer();layer.update(world,1,true);
  const exact=JSON.stringify(world),meshes=[cargo(layer,'Carried materials — shared GPU pawn poses'),cargo(layer,'Partial material releases — resident transfer batch')];
  const saved=meshes.map(mesh=>({geometry:mesh.geometry,material:mesh.material,count:mesh.geometry.instanceCount,groups:[...mesh.geometry.groups]}));
  meshes.forEach(mesh=>{mesh.visible=false;});const error=new Error('compile rejected');
  const prepare=async()=>{const restore=layer.prepareCargoForCompile();try{
    for(const mesh of meshes){expect(mesh.visible).toBe(true);expect(mesh.geometry.instanceCount).toBeGreaterThanOrEqual(1);expect(mesh.geometry.groups.length).toBeGreaterThan(0);}
    await Promise.reject(error);
  }finally{restore();}};
  await expect(prepare()).rejects.toBe(error);
  meshes.forEach((mesh,i)=>{expect(mesh.visible).toBe(false);expect(mesh.geometry).toBe(saved[i]!.geometry);expect(mesh.material).toBe(saved[i]!.material);expect(mesh.geometry.instanceCount).toBe(saved[i]!.count);expect(mesh.geometry.groups).toEqual(saved[i]!.groups);});
  expect(JSON.stringify(world)).toBe(exact);layer.dispose();
});

test('failed second mesh setup rolls back the first mesh immediately',()=>{
  const world=createWorld(42,32);world.piles=[];const layer=new PawnLayer();layer.update(world,1,true);
  const main=cargo(layer,'Carried materials — shared GPU pawn poses'),partial=cargo(layer,'Partial material releases — resident transfer batch');
  const count=main.geometry.instanceCount,groups=[...main.geometry.groups];main.visible=false;
  delete partial.geometry.userData.cargoRangesByKind;
  expect(()=>layer.prepareCargoForCompile()).toThrow('Packed cargo preparation range is missing');
  expect(main.visible).toBe(false);expect(main.geometry.instanceCount).toBe(count);expect(main.geometry.groups).toEqual(groups);layer.dispose();
});

test('rearming immediately before the next capture includes newly adopted empty cargo',async()=>{
  const world=createWorld(42,32);world.piles=[];const layer=new PawnLayer();layer.update(world,1,true);
  const meshes=[cargo(layer,'Carried materials — shared GPU pawn poses'),cargo(layer,'Partial material releases — resident transfer batch')];
  let restore=()=>{};const rearm=()=>{restore();restore=layer.prepareCargoForCompile();};
  try {
    rearm();await Promise.resolve();
    layer.update(world,1,false); // Actual producer clears groups, including the unchanged empty signature.
    const actual=meshes.map(mesh=>mesh.geometry.instanceCount);
    expect(meshes.every(mesh=>mesh.geometry.groups.length===0)).toBe(true);
    rearm(); // Next synchronous compile/render capture sees both real material ranges.
    expect(meshes.every(mesh=>mesh.geometry.groups.length===1)).toBe(true);
    await Promise.resolve();restore();
    meshes.forEach((mesh,i)=>{expect(mesh.geometry.instanceCount).toBe(actual[i]);expect(mesh.geometry.groups).toEqual([]);});
  }finally{restore();layer.dispose();}
});

test('actual growth retains adopted count/groups and restores visibility on the same mesh',()=>{
  const world=createWorld(42,32);world.piles=[];const layer=new PawnLayer();layer.update(world,1,true);
  const main=cargo(layer,'Carried materials — shared GPU pawn poses'),partial=cargo(layer,'Partial material releases — resident transfer batch');
  const previous=main.geometry,capacity=previous.getAttribute('aFrom').count;
  main.visible=partial.visible=false;const restore=layer.prepareCargoForCompile();
  while(world.pawns.length<=capacity)world.pawns.push({...world.pawns[0]!,id:world.nextId++});
  const exact=JSON.stringify(world);layer.update(world,1,false);
  expect(main.geometry).not.toBe(previous);expect(main.geometry.groups).toEqual([]);
  const actual=main.geometry.instanceCount;restore();restore();
  expect(main.geometry.instanceCount).toBe(actual);expect(actual).toBe(world.pawns.length);
  expect(main.geometry.groups).toEqual([]);expect(partial.geometry.groups).toEqual([]);
  expect(main.visible).toBe(false);expect(partial.visible).toBe(false);expect(JSON.stringify(world)).toBe(exact);layer.dispose();
});
