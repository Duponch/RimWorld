import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import type { Structure,World } from '../src/sim/types';
import { FLOOR_KINDS } from '../src/sim/flooring';
import { newDoorState } from '../src/sim/door-rules';
import { buildFurniture } from '../src/render/FurnitureLayer';
import type { BoxBatches } from '../src/render/BoxBatches';
import type { Placement } from '../src/render/primitives';
import { createTimberGeometry,timberCladdingParts,TimberCladdingLayer } from '../src/render/TimberCladdingLayer';
import { floorPartsForKind } from '../src/render/HygieneLayer';
import { penParts } from '../src/render/pen-parts';
import { doorLeafParts,doorParts } from '../src/render/door-parts';

const structure=(id:number,kind:Structure['kind'],x:number,z:number,material:Structure['material']='wood'):Structure=>({id,kind,x,z,material,orientation:0,footprint:'standard',...(kind==='door'||kind==='fence-gate'?{door:newDoorState(0)}:{})});
function camp(structures:Structure[]):World {
  const world=createWorld(42,16,16);world.structures=structures;world.packed=[];
  return world;
}
function bounds(part:Placement):THREE.Box3 {
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(part.x,part.y,part.z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),part.ry??0),
    new THREE.Vector3(part.sx??1,part.sy??1,part.sz??1));
  return new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(matrix);
}

test('wooden wall skins close every vertical corner on the exact cell limits without bowing into a neighbor',()=>{
  const geometry=createTimberGeometry(false);
  try {
    const position=geometry.getAttribute('position');
    expect(geometry.boundingBox!.min.x).toBe(-.5);expect(geometry.boundingBox!.max.x).toBe(.5);
    expect(geometry.boundingBox!.min.z).toBe(-.5);expect(geometry.boundingBox!.max.z).toBe(.5);
    for(const x of [-.5,.5])for(const z of [-.5,.5]) {
      const levels=new Set<number>();
      for(let i=0;i<position.count;i++)if(position.getX(i)===x&&position.getZ(i)===z)levels.add(position.getY(i));
      for(const y of [0,.32,.67,.967])expect([...levels].some(level=>Math.abs(level-y)<1e-7),`${x}/${z}/${y}`).toBe(true);
    }
  } finally { geometry.dispose(); }
});

test('selected timber ghost parts keep the real connected topology and exactly match retained finished poses',()=>{
  const walls=[structure(1,'wall',3,3),structure(2,'wall',4,3),structure(3,'wall',4,4),structure(4,'wall',4,5)];
  const world=camp(walls),layer=new TimberCladdingLayer(),before=structuredClone(world);
  try {
    for(const cutaway of [false,true]) {
      const all=timberCladdingParts(world,cutaway),selected=timberCladdingParts(world,cutaway,[walls[1]!]);
      expect(selected.walls).toEqual(all.walls.filter(p=>p.key===2));
      expect(selected.eaves).toEqual(all.eaves.filter(p=>p.key===2));
      layer.update(world,cutaway);
      const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
      for(const [mesh,parts] of [[layer.wallMesh,all.walls],[layer.eaveMesh,all.eaves]] as const)for(let i=0;i<parts.length;i++) {
        mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
        expect(position.x).toBeCloseTo(parts[i]!.x);expect(position.y).toBeCloseTo(parts[i]!.y);expect(position.z).toBeCloseTo(parts[i]!.z);
        expect(scale.x).toBeCloseTo(parts[i]!.sx!);expect(scale.y).toBeCloseTo(parts[i]!.sy!);expect(scale.z).toBeCloseTo(parts[i]!.sz!);
      }
    }
    expect(world).toEqual(before);
  } finally { layer.dispose(); }
});

test('masonry bodies and caps meet exactly in both directions, including mixed material joints',()=>{
  const world=camp([structure(1,'wall',3,3,'steel'),structure(2,'wall',4,3,'granite-blocks'),structure(3,'wall',3,4,'steel')]);
  let parts:Placement[]=[];
  const batches={set(_group:THREE.Group,_key:string,items:Placement[]){parts=items;}} as unknown as BoxBatches;
  for(const cutaway of [false,true]) {
    buildFurniture(world,new THREE.Group(),cutaway,batches);
    expect(parts).toHaveLength(6);
    const bodies=parts.slice(0,3).map(bounds),caps=parts.slice(3).map(bounds);
    for(const boxes of [bodies,caps]) {
      expect(boxes[0]!.max.x).toBe(boxes[1]!.min.x);
      expect(boxes[0]!.max.z).toBe(boxes[2]!.min.z);
    }
  }
});

test('timber edge trim stops at a masonry neighbor instead of intruding through its cap',()=>{
  const world=camp([structure(1,'wall',3,3),structure(2,'wall',4,3,'steel')]);
  const geometry=createTimberGeometry(true),parts=timberCladdingParts(world,false,[world.structures[0]!]);
  try {
    const masonry=new THREE.Box3(new THREE.Vector3(3.5,0,2.5),new THREE.Vector3(4.5,3,3.5));
    for(const p of parts.eaves) {
      const matrix=new THREE.Matrix4().compose(new THREE.Vector3(p.x,p.y,p.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.ry??0),new THREE.Vector3(p.sx!,p.sy!,p.sz!));
      const box=geometry.boundingBox!.clone().applyMatrix4(matrix);
      const overlap=Math.max(0,Math.min(box.max.x,masonry.max.x)-Math.max(box.min.x,masonry.min.x))*
        Math.max(0,Math.min(box.max.z,masonry.max.z)-Math.max(box.min.z,masonry.min.z));
      expect(overlap).toBeLessThan(1e-12);
    }
  } finally { geometry.dispose(); }
});

test('all floor materials and the three wooden planks cover each cell without gaps or overlaps at their edges',()=>{
  for(const floor of [...FLOOR_KINDS,'burned-wood'] as const) {
    const a=floorPartsForKind(floor,0,0).map(bounds),b=floorPartsForKind(floor,1,0).map(bounds);
    const union=new THREE.Box3().makeEmpty();for(const box of a)union.union(box);
    expect(union.min.x).toBeCloseTo(-.5);expect(union.max.x).toBeCloseTo(.5);
    expect(union.min.z).toBe(-.5);expect(union.max.z).toBe(.5);
    expect(union.max.y).toBeCloseTo(.062);
    for(let i=0;i<a.length-1;i++)expect(a[i]!.max.x).toBeCloseTo(a[i+1]!.min.x,12);
    expect(a.at(-1)!.max.x).toBeCloseTo(b[0]!.min.x,12);
    expect(a.reduce((area,box)=>area+(box.max.x-box.min.x)*(box.max.z-box.min.z),0)).toBeCloseTo(1,12);
  }
});

test('fence half-rails butt against posts and shared cell limits without crossing at a corner',()=>{
  const world=camp([structure(1,'fence',3,3),structure(2,'fence',4,3),structure(3,'fence',3,4)]);
  const rails=penParts(world).filter(p=>p.y===.34).map(bounds);
  const horizontal=rails.filter(b=>b.max.x-b.min.x>.1).sort((a,b)=>a.min.x-b.min.x);
  const vertical=rails.filter(b=>b.max.z-b.min.z>.1).sort((a,b)=>a.min.z-b.min.z);
  expect(horizontal).toHaveLength(2);expect(vertical).toHaveLength(2);
  expect(horizontal[0]!.min.x).toBeCloseTo(3.06);expect(horizontal[0]!.max.x).toBeCloseTo(horizontal[1]!.min.x);
  expect(vertical[0]!.min.z).toBeCloseTo(3.06);expect(vertical[0]!.max.z).toBeCloseTo(vertical[1]!.min.z);
  for(let i=0;i<rails.length;i++)for(let j=i+1;j<rails.length;j++) {
    const a=rails[i]!,b=rails[j]!;
    const overlap=Math.max(0,Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x))*Math.max(0,Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z));
    expect(overlap).toBeLessThan(1e-12);
  }
});

test('closed gate and room leaves meet at the center and frame faces in both axes',()=>{
  for(const kind of ['door','fence-gate'] as const)for(const axis of [0,1] as const) {
    const target=structure(1,kind,5,5,'steel'),world=camp([target,
      structure(2,kind==='door'?'wall':'fence',5+(axis===0?1:0),5+(axis===1?1:0),'steel'),
      structure(3,kind==='door'?'wall':'fence',5-(axis===0?1:0),5-(axis===1?1:0),'steel')]);
    const leaves=doorLeafParts(world,false,[target]).map(bounds),dimension=axis===0?'x':'z';
    leaves.sort((a,b)=>a.min[dimension]-b.min[dimension]);
    expect(leaves[0]!.max[dimension]).toBeCloseTo(5);expect(leaves[1]!.min[dimension]).toBeCloseTo(5);
    const frame=(kind==='door'?doorParts(world,false,[target]):penParts(world,[target])).map(bounds)
      .filter(b=>b.min.y<.1&&b.max.y>.9).sort((a,b)=>a.min[dimension]-b.min[dimension]);
    expect(frame).toHaveLength(2);
    expect(leaves[0]!.min[dimension]).toBeCloseTo(frame[0]!.max[dimension]);
    expect(leaves[1]!.max[dimension]).toBeCloseTo(frame[1]!.min[dimension]);
    if(kind==='fence-gate'){expect(frame[0]!.min[dimension]).toBeCloseTo(4.5);expect(frame[1]!.max[dimension]).toBeCloseTo(5.5);}
  }
});
