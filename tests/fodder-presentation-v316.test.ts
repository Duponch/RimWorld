import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/engine';
import type {Resource} from '../src/sim/types';
import {infectCrop} from '../src/sim/plant-blight';
import {CropLayer,cropGeometry} from '../src/render/CropLayer';
import {CropPresentationPartition} from '../src/render/crop-presentation-partition';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {BLIGHT_COLOR,isResidentCrop} from '../src/render/flora-presentation';
import {ITEM_SHAPES} from '../src/render/item-geometry';
import {centreItemParts,itemGeometry,itemCargoKind} from '../src/render/item-presentation';
import {geometryPortraitSvg,itemPortraitSvg,placementGeometry,placementsPortraitSvg} from '../src/render/item-portrait';
import {cargoGeometry,selectCargoGeometryKinds} from '../src/render/pawn-geometry';
import {pileParts} from '../src/render/pile-parts';

const field=()=>{
  const world=createWorld(316,16,16);world.resources=[];world.structures=[];world.growingZones=[];
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  return world;
};
const plant=(world:ReturnType<typeof field>,growth=1):Resource=>({id:world.nextId++,kind:'haygrass',x:6,z:6,amount:200,growth,growthTick:world.tick});

test('hay has actual bound straw volumes and kibble has exposed individual pellets within the resident budget',()=>{
  const hay=itemGeometry('hay'),kibble=itemGeometry('kibble');
  expect(hay).toHaveLength(16);expect(hay.filter(p=>p.shape==='item-log')).toHaveLength(8);
  expect(hay.filter(p=>p.shape===undefined)).toHaveLength(8);
  const bands=hay.filter(p=>p.shape===undefined);expect(new Set(bands.map(p=>p.x)).size).toBe(2);
  expect(kibble).toHaveLength(14);expect(kibble.every(p=>p.shape==='item-disc')).toBe(true);
  expect(new Set(kibble.map(p=>`${p.x}:${p.y}:${p.z}`)).size).toBe(kibble.length);
  expect(new Set(kibble.map(p=>p.y)).size).toBe(3);
  for(const item of ['hay','kibble'] as const){
    for(const quantity of [1,75,200,100000]){
      const parts=itemGeometry(item,quantity);expect(parts).toHaveLength(item==='hay'?16:14);
      for(const p of parts){
        expect([p.x,p.y,p.z,p.sx,p.sy,p.sz].every(Number.isFinite)).toBe(true);
        expect(p.sy).toBeGreaterThan(0);expect(Math.abs(p.x)+p.sx!/2).toBeLessThan(.5);
        expect(Math.abs(p.z)+p.sz!/2).toBeLessThan(.5);
        expect(p.shape===undefined||ITEM_SHAPES.includes(p.shape as typeof ITEM_SHAPES[number])).toBe(true);
      }
    }
  }
});

test('fodder ground piles and portraits project the shared parts with target ownership intact',()=>{
  for(const item of ['hay','kibble'] as const){
    const base=itemGeometry(item),ground=pileParts([{x:4,z:8,item,kind:'food',quantity:200,supplied:false,targetId:316}]);
    expect(ground).toHaveLength(base.length);
    base.forEach((p,i)=>expect(ground[i]).toEqual({...p,x:p.x+4,z:p.z+8,targetId:316}));
    expect(itemPortraitSvg(item)).toBe(placementsPortraitSvg(base,item));
    expect(itemPortraitSvg(item)).toContain('<path ');
  }
  const body=(item:'hay'|'kibble'|'rice')=>itemPortraitSvg(item).replace(/<title>.*?<\/title>/,'');
  expect(new Set(['hay','kibble','rice'].map(item=>body(item as 'hay'|'kibble'|'rice'))).size).toBe(3);
});

test('carried fodder retains every ground-model vertex after the shared centred transform',()=>{
  const cargo=cargoGeometry(),position=cargo.getAttribute('position');
  try{
    for(const item of ['hay','kibble'] as const){
      selectCargoGeometryKinds(cargo,new Set([itemCargoKind(item)]));expect(cargo.groups).toHaveLength(1);
      const range=cargo.groups[0]!,parts=centreItemParts(itemGeometry(item),true),point=new THREE.Vector3(),matrix=new THREE.Matrix4();
      let cursor=range.start;
      for(const p of parts){
        const mesh=placementGeometry(p),source=mesh.getAttribute('position'),index=mesh.index;
        matrix.compose(new THREE.Vector3(p.x,p.y,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.ry??0),new THREE.Vector3(p.sx??1,p.sy??1,p.sz??1));
        for(let i=0;i<(index?.count??source.count);i++){
          point.fromBufferAttribute(source,index?index.getX(i):i).applyMatrix4(matrix);
          expect(position.getX(cursor)).toBeCloseTo(point.x,6);expect(position.getY(cursor)).toBeCloseTo(point.y,6);expect(position.getZ(cursor)).toBeCloseTo(point.z,6);cursor++;
        }
      }
      expect(cursor).toBe(range.start+range.count);
    }
  }finally{cargo.dispose();}
});

test('haygrass is one cultivated resident resource and never duplicated in forest geometry',()=>{
  const world=field(),hay=plant(world);world.resources=[hay];
  const before=JSON.stringify(world),partition=new CropPresentationPartition();
  expect(isResidentCrop(hay)).toBe(true);expect(partition.read(world,true).haygrass).toEqual([hay]);
  expect(new NaturalResourcePresentation().read(world,true)?.resources).toEqual([]);
  expect(JSON.stringify(world)).toBe(before);
  world.resources=[];expect(partition.read(world).haygrass).toEqual([]);
});

test('the high grass portrait projects its actual finite blade mesh',()=>{
  const hay=cropGeometry('haygrass'),rice=cropGeometry('rice');
  try{
    hay.computeBoundingBox();const bounds=hay.boundingBox!;
    expect(bounds.max.y-bounds.min.y).toBeGreaterThan(1.2);
    expect(bounds.max.x-bounds.min.x).toBeLessThan(1);expect(bounds.max.z-bounds.min.z).toBeLessThan(1);
    const positions=hay.getAttribute('position');expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
    expect(hay.getAttribute('normal').count).toBe(positions.count);
    const portrait=(geometry:THREE.BufferGeometry)=>geometryPortraitSvg([{geometry,placement:{x:0,y:0,z:0,color:0xc6b56b}}]);
    expect(portrait(hay)).toContain('<path ');expect(portrait(hay)).not.toBe(portrait(rice));
  }finally{hay.dispose();rice.dispose();}
});

test('historical crop maps keep four batches and first haygrass snapshot creates only one persistent batch',()=>{
  const world=field(),plain=new THREE.MeshBasicNodeMaterial(),textured=new THREE.MeshBasicNodeMaterial(),layer=new CropLayer(plain,textured);
  try{
    layer.update(world,true);expect(layer.group.children).toHaveLength(4);
    const historical=[...layer.group.children];layer.setTexturesEnabled(false);
    const hay=plant(world);world.resources=[hay];const before=JSON.stringify(world);layer.update(world,false);
    expect(layer.group.children).toHaveLength(5);expect(layer.group.children.slice(0,4)).toEqual(historical);
    const mesh=layer.group.children[4] as THREE.InstancedMesh,geometry=mesh.geometry;expect(mesh.count).toBe(1);expect(mesh.material).toBe(plain);
    expect(mesh.instanceMatrix.count).toBeGreaterThanOrEqual(world.width*world.height);
    const pose=new THREE.Matrix4();mesh.getMatrixAt(0,pose);expect(pose.elements[12]).toBe(hay.x);expect(pose.elements[14]).toBe(hay.z);
    expect(JSON.stringify(world)).toBe(before);
    layer.setTexturesEnabled(true);expect(mesh.material).toBe(textured);
    world.resources=[];layer.update(world,false);expect(mesh.count).toBe(0);
    world.resources=[hay];layer.update(world,false);expect(layer.group.children[4]).toBe(mesh);expect(mesh.geometry).toBe(geometry);expect(mesh.count).toBe(1);
  }finally{layer.dispose();plain.dispose();textured.dispose();}
});

test('haygrass ordinary instance tint follows growth, blight and target preview without replacing geometry',()=>{
  const world=field(),hay=plant(world,.2);world.resources=[hay];
  const material=new THREE.MeshBasicNodeMaterial(),layer=new CropLayer(material),color=new THREE.Color();
  try{
    layer.update(world,true);const mesh=layer.group.children[4] as THREE.InstancedMesh,geometry=mesh.geometry;
    mesh.getColorAt(0,color);const young=color.getHex();hay.growth=1;layer.update(world,false);
    mesh.getColorAt(0,color);expect(color.getHex()).not.toBe(young);
    expect(infectCrop(world,hay,316)).toBe(true);layer.update(world,false);mesh.getColorAt(0,color);expect(color.getHex()).toBe(BLIGHT_COLOR);
    layer.setTargetPreview(new Set([hay.id]));mesh.getColorAt(0,color);expect(color.getHex()).not.toBe(BLIGHT_COLOR);
    layer.clearTargetPreview();mesh.getColorAt(0,color);expect(color.getHex()).toBe(BLIGHT_COLOR);expect(mesh.geometry).toBe(geometry);
  }finally{layer.dispose();material.dispose();}
});
