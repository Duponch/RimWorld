import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import type { Resource,World } from '../src/sim/types';
import { CropLayer } from '../src/render/CropLayer';
import { NaturalResourcePresentation } from '../src/render/NaturalResourcePresentation';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { OverviewLayer } from '../src/render/OverviewLayer';
import type { OverviewBatch } from '../src/render/OverviewBatch';
import { appendFlora,floraSize,floraColor,type FloraParts } from '../src/render/flora-presentation';
import type { ResourceRangeData } from '../src/render/StaticGeometry';

function camp(growth=.1) {
  const w=createWorld(195,32,32); w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  const plant:Resource={id:w.nextId++,kind:'healroot',x:5,z:6,amount:1,growth,growthTick:w.tick};
  w.resources=[plant]; return {w,plant};
}
function leafless(w:World,p:Resource) { p.plantLife={since:w.tick,age:0,darkTicks:0,leaflessAt:w.tick,nextCheck:w.tick+200}; }
const meshes=(group:THREE.Group):THREE.Mesh[]=>{const out:THREE.Mesh[]=[];group.traverse(o=>{if(o instanceof THREE.Mesh)out.push(o);});return out;};
function materials() {
  const plain=new THREE.MeshStandardNodeMaterial({vertexColors:true});plain.userData.rendererOwned=true;
  const painted=new THREE.MeshStandardNodeMaterial({vertexColors:true,map:new THREE.Texture()});painted.userData.rendererOwned=true;
  return {plain,painted,dispose:()=>{painted.map!.dispose();painted.dispose();plain.dispose();}};
}
function expectVisibleBounds(mesh:THREE.Mesh) {
  const g=mesh.geometry,positions=g.getAttribute('position'),sphere=g.boundingSphere!,normal=g.getAttribute('normal'),point=new THREE.Vector3();
  expect(sphere).not.toBeNull();
  for(let i=0;i<g.drawRange.count;i++) {
    const vertex=g.index!.getX(i); point.fromBufferAttribute(positions,vertex);
    expect(point.distanceTo(sphere.center)).toBeLessThanOrEqual(sphere.radius+1e-5);
    expect(Math.hypot(normal.getX(vertex),normal.getY(vertex),normal.getZ(vertex))).toBeCloseTo(1,5);
    expect(point.y).toBeGreaterThanOrEqual(-1e-6);
  }
}

test('cultivated healroot uses the same anchored medicinal rosette and shrub parts as the wild plant',()=>{
  const {w,plant}=camp(1),parts:FloraParts={trunks:[],crowns:[],cones:[],bushes:[],blades:[],cacti:[],fruit:[]};
  const wild:Resource={...plant,kind:'wild-plant',species:'healroot-wild'};
  const wildParts:FloraParts={trunks:[],crowns:[],cones:[],bushes:[],blades:[],cacti:[],fruit:[]};
  const before=JSON.stringify(w);appendFlora(parts,w,plant,.5);appendFlora(wildParts,w,wild,.5);
  expect(parts).toEqual(wildParts);expect(floraColor(plant)).toBe(floraColor(wild));
  expect(parts.bushes.some(p=>p.key===plant.id)).toBe(true);
  expect(parts.bushes.some(p=>p.key===-plant.id*2)).toBe(true);
  expect(parts.trunks.length+parts.crowns.length+parts.cones.length+parts.blades.length+parts.cacti.length+parts.fruit.length).toBe(0);
  expect(JSON.stringify(w)).toBe(before);
});

test('same-tick growth and leaf loss preserve chunk geometry/buffers, ground bounds and the living base',()=>{
  const {w,plant}=camp(),view=new NaturalResourcePresentation(),group=new THREE.Group(),m=materials(),layer=new ResourceLayer(group,m.plain,m.painted);
  layer.setTexturesEnabled(false);
  const adopt=(reset=false)=>{const natural=view.read(w,reset);expect(natural).toBeDefined();layer.update(natural!,reset,view.changes);};
  adopt(true);const mesh=meshes(group)[0]!,geometry=mesh.geometry,position=geometry.getAttribute('position'),index=geometry.index!,size=floraSize(w,plant);
  const before=Array.from(position.array),fullCount=geometry.drawRange.count;
  plant.growth=1;adopt();expect(floraSize(w,plant)).toBeGreaterThan(size);
  expect(meshes(group)[0]).toBe(mesh);expect(geometry.getAttribute('position')).toBe(position);expect(geometry.index).toBe(index);
  expect(Array.from(position.array)).not.toEqual(before);expectVisibleBounds(mesh);
  const grown=Array.from(position.array);leafless(w,plant);adopt();
  expect(geometry.drawRange.count).toBeGreaterThan(0);expect(geometry.drawRange.count).toBeLessThan(fullCount);
  expect(Array.from(position.array)).toEqual(grown);expectVisibleBounds(mesh);
  delete plant.plantLife!.leaflessAt;adopt();expect(geometry.drawRange.count).toBe(fullCount);
  expect(geometry.index).toBe(index);expect(mesh.material).toBe(m.plain);expect(m.plain.map).toBeNull();
  w.resources=[];adopt();expect(geometry.drawRange.count).toBe(0);
  w.resources=[plant];adopt();expect(geometry.drawRange.count).toBe(fullCount);expect(meshes(group)[0]).toBe(mesh);
  const oldId=plant.id;w.resources=[{...plant,id:w.nextId++}];adopt();
  const ids=meshes(group).flatMap(o=>(o.userData.resourceRanges as ResourceRangeData).ranges.map(r=>r.id));
  expect(ids).not.toContain(oldId);expect(ids).toContain(w.resources[0]!.id);
  layer.dispose();m.dispose();
});

test('immutable snapshots still detect time-only medicinal leaf recovery and sparse/full overview agree',()=>{
  const {w,plant}=camp(1);leafless(w,plant);w.tick=5999;
  const view=new NaturalResourcePresentation(),sparse=new OverviewLayer(),full=new OverviewLayer();
  const initial=view.read(w,true,true)!;sparse.update(initial,true,view.changes);full.update(initial,true);
  const original=(sparse.group.children[1] as THREE.Group).children.slice();
  const data=(layer:OverviewLayer)=>meshes(layer.group).map(m=>({matrix:Array.from((m as OverviewBatch).instanceMatrix.array),color:(m as OverviewBatch).colorBuffer?Array.from((m as OverviewBatch).colorBuffer!.array):null}));
  expect(data(sparse)).toEqual(data(full));expect(original).toHaveLength(4);
  const old=data(sparse);w.tick=6000;
  const recovered=view.read(w,false,true);expect(recovered).toBeDefined();expect(view.changes.get(plant.id)?.resource).toBe(plant);
  sparse.update(recovered!,false,view.changes);full.update(recovered!,false);
  expect(data(sparse)).toEqual(data(full));expect(data(sparse)).not.toEqual(old);
  expect((sparse.group.children[1] as THREE.Group).children).toEqual(original);
  sparse.setTexturesEnabled(false);
  for(const mesh of meshes(sparse.group))expect((mesh.material as THREE.MeshStandardNodeMaterial).map).toBeNull();
  sparse.dispose();full.dispose();
});

test('adding, growing and removing healroot keeps exactly four dedicated crop arrays and preparation cannot erase a newer adoption',()=>{
  const {w,plant}=camp(),m=materials(),layer=new CropLayer(m.plain,m.painted);
  layer.update(w,true);const batches=layer.group.children.slice() as THREE.InstancedMesh[],arrays=batches.map(b=>b.instanceMatrix),geometry=batches.map(b=>b.geometry);
  expect(batches).toHaveLength(4);expect(batches.map(b=>b.count)).toEqual([0,0,0,0]);
  const restoreEmpty=layer.prepareForCompile();restoreEmpty();expect(batches.map(b=>b.count)).toEqual([0,0,0,0]);
  const restore=layer.prepareForCompile();w.resources.push({id:w.nextId++,kind:'rice',x:8,z:8,amount:6,growth:1,growthTick:w.tick});
  layer.update(w,false);restore();expect(batches.map(b=>b.count)).toEqual([1,0,0,0]);
  plant.growth=1;leafless(w,plant);layer.update(w,false);
  w.resources=w.resources.filter(r=>r!==plant);layer.update(w,false);
  expect(layer.group.children).toEqual(batches);expect(batches.map(b=>b.instanceMatrix)).toEqual(arrays);expect(batches.map(b=>b.geometry)).toEqual(geometry);
  layer.setTexturesEnabled(false);expect(batches.every(b=>b.material===m.plain)).toBe(true);
  layer.dispose();m.dispose();
});
