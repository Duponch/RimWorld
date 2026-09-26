import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import { TimberCladdingLayer } from '../src/render/TimberCladdingLayer';
import { WORLD_SCALE } from '../src/world/scale';

function wood(id:number,x:number,z:number) {
  return {id,x,z,kind:'wall' as const,material:'wood' as const,orientation:0 as const,footprint:'legacy-single' as const};
}

test('one broad irregular bevelled board covers each wall face with a closed recessed core',()=>{
  const layer=new TimberCladdingLayer();
  const p=layer.wallGeometry.getAttribute('position') as THREE.BufferAttribute;
  const colors=layer.wallGeometry.getAttribute('color') as THREE.BufferAttribute;
  const normals=layer.wallGeometry.getAttribute('normal') as THREE.BufferAttribute;
  expect(layer.group.children).toEqual([layer.wallMesh,layer.eaveMesh]);
  expect(p.count).toBeGreaterThan(250);
  expect(p.count).toBeLessThan(16*4*6);
  expect(layer.wallGeometry.boundingBox!.min.x).toBeLessThanOrEqual(-.5);
  expect(layer.wallGeometry.boundingBox!.max.x).toBeGreaterThanOrEqual(.5);
  expect(layer.wallGeometry.boundingBox!.min.z).toBeLessThanOrEqual(-.5);
  expect(layer.wallGeometry.boundingBox!.max.z).toBeGreaterThanOrEqual(.5);
  expect(layer.wallGeometry.boundingBox!.min.y).toBe(0);
  expect(layer.wallGeometry.boundingBox!.max.y).toBeCloseTo(.982);
  const outward=new Set<string>(),tones=new Set<string>();
  for(let i=0;i<p.count;i++) {
    if(Math.abs(normals.getX(i))>.5||Math.abs(normals.getZ(i))>.5)outward.add(`${Math.sign(normals.getX(i))}:${Math.sign(normals.getZ(i))}`);
    tones.add(`${colors.getX(i).toFixed(3)}:${colors.getY(i).toFixed(3)}:${colors.getZ(i).toFixed(3)}`);
  }
  expect(outward).toEqual(new Set(['0:1','0:-1','1:0','-1:0']));
  expect(tones.size).toBeGreaterThan(8);
  expect(layer.material.vertexColors).toBe(true);
  expect(layer.material.map).toBe(layer.grain);
  const bytes=layer.grain.image.data as Uint8Array;
  expect(Math.min(...bytes)).toBeGreaterThanOrEqual(158);
  expect(new Set(bytes).size).toBeGreaterThan(10);
  layer.dispose();
});

test('wood alone is instanced; eaves overhang by six hundredths and cutaway keeps their thickness',()=>{
  const world=createWorld(7,16,16);
  world.structures=[wood(1,3,4),{...wood(2,5,4),material:'steel'}];
  const layer=new TimberCladdingLayer();
  layer.update(world,false);
  expect(layer.wallMesh.count).toBe(1);expect(layer.eaveMesh.count).toBe(4);
  expect(layer.wallMesh.castShadow).toBe(true);expect(layer.eaveMesh.receiveShadow).toBe(true);
  const m=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  layer.wallMesh.getMatrixAt(0,m);m.decompose(position,rotation,scale);
  expect(position.toArray()).toEqual([3,0,4]);expect(scale.y).toBeCloseTo(WORLD_SCALE.wallHeight);
  layer.eaveMesh.getMatrixAt(0,m);m.decompose(position,rotation,scale);
  expect(position.y).toBeCloseTo(WORLD_SCALE.wallHeight-.055);
  expect(scale.y).toBe(1);
  const eave=layer.eaveGeometry.boundingBox!;
  expect(eave.min.x).toBeCloseTo(-.5);expect(eave.max.z).toBeCloseTo(.56);
  expect(eave.max.y-eave.min.y).toBeCloseTo(.11);
  layer.update(world,true);
  layer.wallMesh.getMatrixAt(0,m);m.decompose(position,rotation,scale);
  expect(scale.y).toBeCloseTo(WORLD_SCALE.wallCutawayHeight);
  layer.eaveMesh.getMatrixAt(0,m);m.decompose(position,rotation,scale);
  expect(position.y).toBeCloseTo(WORLD_SCALE.wallCutawayHeight-.055);
  expect(scale.y).toBe(1);
  layer.dispose();
});

test('stable updates preserve meshes, buffers and colours; real wall changes update only the resident batches',()=>{
  const world=createWorld(8,16,16);world.structures=[wood(11,2,2),wood(12,3,2)];
  const layer=new TimberCladdingLayer();layer.update(world,false);
  const wall=layer.wallMesh,eave=layer.eaveMesh;
  const versions=[wall.instanceMatrix.version,wall.instanceColor!.version,eave.instanceMatrix.version,eave.instanceColor!.version];
  const tint=new THREE.Color(),sameTint=new THREE.Color();wall.getColorAt(0,tint);
  world.tick+=50;layer.update(world,false);
  expect([wall.instanceMatrix.version,wall.instanceColor!.version,eave.instanceMatrix.version,eave.instanceColor!.version]).toEqual(versions);
  expect(layer.wallMesh).toBe(wall);expect(layer.eaveMesh).toBe(eave);
  world.structures=[wood(12,3,2),wood(11,2,2),wood(13,4,2)];layer.update(world,false);
  expect(wall.count).toBe(3);expect(eave.count).toBe(8);
  wall.getColorAt(1,sameTint);expect(sameTint.toArray()).toEqual(tint.toArray());
  expect(wall.instanceMatrix.version).toBeGreaterThan(versions[0]!);
  world.structures=[];layer.update(world,false);
  expect(wall.count).toBe(0);expect(wall.visible).toBe(false);
  const restore=layer.prepareForCompile();expect(wall.count).toBe(1);restore();expect(wall.count).toBe(0);
  layer.dispose();
});

test('the mixed-colony wall count fits two resident draws and leaves a doorway/open roof',()=>{
  const world=createWorld(9,32,32);
  world.structures=Array.from({length:298},(_,i)=>wood(i+1,i%30,Math.floor(i/30)));
  // A doorway has only the short upper cladding, leaving the leaf clear.
  world.structures[35]={...wood(36,5,1),kind:'door'};
  const layer=new TimberCladdingLayer();layer.update(world,false);
  expect(layer.group.children).toHaveLength(2);
  expect(layer.wallMesh.count).toBe(298);expect(layer.eaveMesh.count).toBe(80);
  expect(layer.wallMesh.instanceMatrix.count).toBeGreaterThanOrEqual(297);
  const transform=new THREE.Matrix4(),translation=new THREE.Vector3();
  for(let i=0;i<layer.wallMesh.count;i++) {
    layer.wallMesh.getMatrixAt(i,transform);translation.setFromMatrixPosition(transform);
    if(translation.x===5&&translation.z===1)expect(translation.y).toBeGreaterThan(2);
  }
  const roof=layer.eaveGeometry.getAttribute('position') as THREE.BufferAttribute;
  for(let i=0;i<roof.count;i++) {
    const x=roof.getX(i),z=roof.getZ(i);
    expect(z).toBeGreaterThanOrEqual(.405);
    expect(Math.abs(x)).toBeLessThanOrEqual(.5);
  }
  layer.dispose();
});

function eaveFootprints(layer:TimberCladdingLayer):THREE.Box2[] {
  const footprints:THREE.Box2[]=[],matrix=new THREE.Matrix4(),point=new THREE.Vector3();
  for(let i=0;i<layer.eaveMesh.count;i++) {
    layer.eaveMesh.getMatrixAt(i,matrix);
    const box=new THREE.Box2().makeEmpty();
    for(const x of [-.5,.5])for(const z of [.405,.56]) {
      point.set(x,0,z).applyMatrix4(matrix);box.expandByPoint(new THREE.Vector2(point.x,point.z));
    }
    footprints.push(box);
  }
  return footprints;
}

test('neighbouring walls share a continuous rim without coplanar overlap',()=>{
  const world=createWorld(10,16,16);world.structures=[wood(1,3,3),wood(2,4,3)];
  const layer=new TimberCladdingLayer();layer.update(world,false);
  expect(layer.eaveMesh.count).toBe(6);
  const rectangles=eaveFootprints(layer);
  for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++) {
    const a=rectangles[i]!,b=rectangles[j]!;
    const area=Math.max(0,Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x))*Math.max(0,Math.min(a.max.y,b.max.y)-Math.max(a.min.y,b.min.y));
    expect(area).toBeLessThan(1e-7);
  }
  const north=rectangles.filter(box=>box.min.y>3.4).sort((a,b)=>a.min.x-b.min.x);
  expect(north).toHaveLength(2);
  expect(north[0]!.max.x).toBeCloseTo(north[1]!.min.x);
  layer.dispose();
});

test('a 7×7 house keeps inner and outer eaves continuous across a doorway',()=>{
  const world=createWorld(11,16,16);
  world.structures=[];let id=1;
  for(let z=2;z<9;z++)for(let x=2;x<9;x++)if(x===2||x===8||z===2||z===8) {
    world.structures.push(x===5&&z===2?{...wood(id++,x,z),kind:'door'}:wood(id++,x,z));
  }
  const layer=new TimberCladdingLayer();layer.update(world,false);
  expect(layer.wallMesh.count).toBe(24);
  expect(layer.eaveMesh.count).toBe(48);
  const rectangles=eaveFootprints(layer);
  for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++) {
    const a=rectangles[i]!,b=rectangles[j]!;
    const area=Math.max(0,Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x))*Math.max(0,Math.min(a.max.y,b.max.y)-Math.max(a.min.y,b.min.y));
    expect(area).toBeLessThan(1e-7);
  }
  const doorOuter=rectangles.filter(box=>box.min.y>1.4&&box.max.y<1.7&&box.min.x<5&&box.max.x>5);
  const doorInner=rectangles.filter(box=>box.min.y>2.4&&box.max.y<2.7&&box.min.x<5&&box.max.x>5);
  expect(doorOuter).toHaveLength(1);expect(doorInner).toHaveLength(1);
  layer.dispose();
});
