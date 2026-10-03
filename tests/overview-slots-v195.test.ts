import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import type { Resource } from '../src/sim/types';
import { OverviewLayer } from '../src/render/OverviewLayer';
import type { OverviewBatch } from '../src/render/OverviewBatch';
import { NaturalResourcePresentation } from '../src/render/NaturalResourcePresentation';

const batches=(layer:OverviewLayer)=>new Map((layer.group.children[1] as THREE.Group).children.map(m=>[m.name,m as OverviewBatch]));
/** Compare rendered live placements, independently of the allocator's slot order. */
function placements(layer:OverviewLayer) {
  const result:Record<string,{matrix:number[];color:number[]}[]>={};
  for(const [name,mesh] of batches(layer)){
    const rows:{matrix:number[];color:number[]}[]=[];
    for(let i=0;i<mesh.activeCount;i++){
      const matrix=Array.from(mesh.instanceMatrix.array.slice(i*16,i*16+16));
      if(Math.hypot(matrix[0]!,matrix[1]!,matrix[2]!)===0)continue;
      rows.push({matrix,color:Array.from(mesh.colorBuffer!.array.slice(i*3,i*3+3))});
    }
    result[name]=rows.sort((a,b)=>a.matrix[12]!-b.matrix[12]!||a.matrix[14]!-b.matrix[14]!);
  }
  return result;
}
function setup() {
  const w=createWorld(195,32,32);w.resources=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  const add=(kind:Resource['kind'],x:number,z:number):Resource=>{const r={id:w.nextId++,kind,x,z,amount:1,growth:1,growthTick:w.tick};w.resources.push(r);return r;};
  add('tree',3,3);add('berries',4,4);add('rock',5,5);
  const layer=new OverviewLayer(),view=new NaturalResourcePresentation();
  const adopt=(reset=false)=>{const natural=view.read(w,reset);if(natural)layer.update(natural,reset,view.changes);};
  adopt(true);return {w,add,layer,adopt};
}

test('medicinal births grow only their existing overview batch and reuse vacated slots without rebuilding other geometry',()=>{
  const {w,add,layer,adopt}=setup(),original=batches(layer);
  const old=original.get('overview-wild-plant')!,geometry=old.geometry,material=old.material;
  let geometryDisposals=0;geometry.addEventListener('dispose',()=>geometryDisposals++);
  for(let i=0;i<17;i++){add('healroot',8+i%8,8+Math.floor(i/8));adopt();}
  const grown=batches(layer).get('overview-wild-plant')!;
  expect(grown).toBe(old);expect(grown.instanceMatrix.count).toBe(32);expect(grown.activeCount).toBe(17);
  expect(grown.geometry).not.toBe(geometry);expect(grown.material).toBe(material);expect(geometryDisposals).toBe(1);
  for(const name of ['overview-tree','overview-berries','overview-rock'])expect(batches(layer).get(name)).toBe(original.get(name));
  const removed=w.resources.find(r=>r.kind==='healroot')!;
  w.resources=w.resources.filter(r=>r!==removed);adopt();
  add('healroot',28,28);adopt();expect(batches(layer).get('overview-wild-plant')).toBe(grown);expect(grown.activeCount).toBe(17);
  const before=JSON.stringify(w),fresh=new OverviewLayer();fresh.update(w,true);
  expect(placements(layer)).toEqual(placements(fresh));expect(JSON.stringify(w)).toBe(before);
  layer.dispose();fresh.dispose();expect(geometryDisposals).toBe(1);
});

test('kind changes, crop exclusions and full snapshots remove old silhouettes without orphans or slot leaks',()=>{
  const {w,add,layer,adopt}=setup();
  const plant=add('healroot',12,12);adopt();plant.kind='berries';adopt();
  expect(placements(layer)['overview-wild-plant']).toHaveLength(0);expect(placements(layer)['overview-berries']).toHaveLength(2);
  plant.kind='rice';adopt();expect(placements(layer)['overview-berries']).toHaveLength(1);
  for(let i=0;i<40;i++){
    const r=add('healroot',10,10);adopt();w.resources=w.resources.filter(p=>p.id!==r.id);adopt();
  }
  expect(batches(layer).get('overview-wild-plant')!.instanceMatrix.count).toBe(16);
  const stone=w.resources.find(r=>r.kind==='rock')!;stone.kind='healroot';
  const before=JSON.stringify(w);layer.update(w,false);
  const fresh=new OverviewLayer();fresh.update(w,true);expect(placements(layer)).toEqual(placements(fresh));
  expect(placements(layer)['overview-rock']).toHaveLength(0);expect(JSON.stringify(w)).toBe(before);
  for(const mesh of batches(layer).values()){
    expect(mesh.boundingSphere).not.toBeNull();expect(mesh.instanceMatrix.usage).toBe(THREE.StaticDrawUsage);
    expect(mesh.instanceMatrix.count).toBeLessThanOrEqual(w.width*w.height);
    expect(Array.from(mesh.instanceMatrix.array).every(Number.isFinite)).toBe(true);
    const vertex=mesh.geometry.getAttribute('position'),point=new THREE.Vector3(),matrix=new THREE.Matrix4();
    for(let slot=0;slot<mesh.activeCount;slot++){
      mesh.getMatrixAt(slot,matrix);
      for(let i=0;i<vertex.count;i++){
        point.fromBufferAttribute(vertex,i).applyMatrix4(matrix);
        expect(point.distanceTo(mesh.boundingSphere.center)).toBeLessThanOrEqual(mesh.boundingSphere.radius+1e-5);
      }
    }
  }
  layer.dispose();fresh.dispose();
});

test('compilation exposes empty overview attributes and restores exact state without erasing newer adoption',()=>{
  const {add,layer,adopt}=setup(),batch=batches(layer).get('overview-wild-plant')!;
  const geometry=batch.geometry,matrices=Array.from(batch.instanceMatrix.array),sphere=batch.boundingSphere.clone();
  const restore=layer.prepareForCompile();expect(batch.activeCount).toBe(1);expect(batch.visible).toBe(true);
  restore();expect(batch.activeCount).toBe(0);expect(batch.visible).toBe(false);expect(batch.geometry).toBe(geometry);
  expect(Array.from(batch.instanceMatrix.array)).toEqual(matrices);expect(batch.boundingSphere).toEqual(sphere);
  const stale=layer.prepareForCompile();add('healroot',14,14);adopt();stale();
  expect(batch.activeCount).toBe(1);expect(placements(layer)['overview-wild-plant']).toHaveLength(1);
  layer.dispose();
});
