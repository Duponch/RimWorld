import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { BoxBatches } from '../src/render/BoxBatches';
import type { BoxMesh } from '../src/render/BoxMesh';
import { createStylizedSurfaceTexture } from '../src/render/stylized-surfaces';
import { mergedInstances } from '../src/render/StaticGeometry';
import { chunkParts } from '../src/render/chunk-presentation';
import { blockParts } from '../src/render/block-presentation';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { CropLayer } from '../src/render/CropLayer';
import { PlantClusterLayer } from '../src/render/PlantClusterLayer';
import { OverviewLayer } from '../src/render/OverviewLayer';
import { createWorld } from '../src/sim/index';

test('stylized surface is a repeatable, broad opaque grayscale pigment map', () => {
  const first = createStylizedSurfaceTexture(), second = createStylizedSurfaceTexture();
  try {
    const width = first.image.width, height = first.image.height;
    const data = first.image.data as Uint8Array;
    expect([width, height]).toEqual([64, 64]);
    expect(data).toEqual(second.image.data);
    const values: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      expect(data[i]).toBe(data[i + 1]);
      expect(data[i]).toBe(data[i + 2]);
      expect(data[i + 3]).toBe(255);
      values.push(data[i]!);
    }
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(25);
    const neighborDifferences = values.slice(1).map((value, index) => Math.abs(value - values[index]!));
    expect(neighborDifferences.filter(delta => delta > 14).length).toBeLessThan(width * 2);
  } finally {
    first.dispose(); second.dispose();
  }
});

test('vegetation pigment has large readable tonal planes across narrow tree faces', () => {
  const vegetation = createStylizedSurfaceTexture('vegetation');
  const repeated = createStylizedSurfaceTexture('vegetation');
  const neutral = createStylizedSurfaceTexture();
  try {
    const data = vegetation.image.data as Uint8Array;
    const values = Array.from({ length: 64 * 64 }, (_, index) => data[index * 4]!);
    expect(data).toEqual(repeated.image.data);
    expect(data).not.toEqual(neutral.image.data);
    expect(Math.min(...values)).toBeLessThan(175);
    expect(Math.max(...values)).toBeGreaterThan(245);
    const blocks: number[] = [];
    for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
      let sum = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) sum += values[(row * 8 + y) * 64 + column * 8 + x]!;
      blocks.push(sum / 64);
    }
    expect(Math.max(...blocks) - Math.min(...blocks)).toBeGreaterThan(75);
  } finally {
    vegetation.dispose(); repeated.dispose(); neutral.dispose();
  }
});

test('stone paint has irregular broad pastel washes and seamless distant repeats', () => {
  const stone=createStylizedSurfaceTexture('stone'),repeated=createStylizedSurfaceTexture('stone');
  try {
    const pixels=stone.image.data as Uint8Array;
    const size=stone.image.width;
    expect([stone.image.width,stone.image.height]).toEqual([256,256]);
    expect(stone.wrapS).toBe(THREE.RepeatWrapping);
    expect(stone.wrapT).toBe(THREE.RepeatWrapping);
    expect(pixels).toEqual(repeated.image.data);
    const levels=Array.from({length:size*size},(_,i)=>pixels[i*4]!);
    expect(Math.max(...levels)-Math.min(...levels)).toBeGreaterThan(75);
    expect(pixels.some((channel,i)=>i%4===0&&channel!==pixels[i+2])).toBe(true);
    for(let y=0;y<size;y++)for(let channel=0;channel<3;channel++) {
      expect(Math.abs(pixels[(y*size)*4+channel]!-pixels[(y*size+size-1)*4+channel]!)).toBeLessThan(8);
      expect(Math.abs(pixels[y*4+channel]!-pixels[((size-1)*size+y)*4+channel]!)).toBeLessThan(8);
    }
    const patches=new Set<string>();
    for(let by=0;by<8;by++)for(let bx=0;bx<8;bx++) {
      let red=0,blue=0;
      for(let y=0;y<32;y++)for(let x=0;x<32;x++) {
        const offset=((by*32+y)*size+bx*32+x)*4;
        red+=pixels[offset]!;blue+=pixels[offset+2]!;
      }
      patches.add(`${Math.round(red/1024/8)}:${Math.round(blue/1024/8)}`);
    }
    expect(patches.size).toBeGreaterThan(35);
  } finally {stone.dispose();repeated.dispose();}
});

test('small rocks vary their existing vertex colours by facet without changing the shared mesh format', () => {
  const group=new THREE.Group(),material=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  const rock=new THREE.DodecahedronGeometry(1,0);
  const plain=new THREE.DodecahedronGeometry(1,0);
  try {
    const painted=mergedInstances(group,[{geometry:rock,items:[{x:1,y:0,z:1,key:31,color:0xaaa59b,pigment:'stone'}]}],material,true,true)!;
    const unpainted=mergedInstances(group,[{geometry:plain,items:[{x:3,y:0,z:1,key:32,color:0xaaa59b}]}],material,true,true)!;
    const colors=painted.geometry.getAttribute('color') as THREE.BufferAttribute;
    const other=unpainted.geometry.getAttribute('color') as THREE.BufferAttribute;
    const tones=new Set(Array.from({length:colors.count},(_,i)=>colors.getX(i).toFixed(3)+':'+colors.getY(i).toFixed(3)+':'+colors.getZ(i).toFixed(3)));
    expect(tones.size).toBeGreaterThan(3);
    expect(new Set(Array.from({length:other.count},(_,i)=>other.getX(i).toFixed(3)+':'+other.getY(i).toFixed(3)+':'+other.getZ(i).toFixed(3))).size).toBe(1);
    expect(painted.geometry.getAttribute('uv').count).toBe(colors.count);
    expect(painted.geometry.attributes).toHaveProperty('color');
    expect(Object.keys(painted.geometry.attributes).sort()).toEqual(Object.keys(unpainted.geometry.attributes).sort());
    expect(painted.material).toBe(unpainted.material);
  } finally {
    for(const mesh of group.children as THREE.Mesh[])mesh.geometry.dispose();
    material.dispose();
  }
});

test('stone fragments and cut blocks have several pastel tones in one existing pile batch', () => {
  const fragments=chunkParts(8,9,'granite-chunk');
  const blocks=blockParts(8,9,'granite-blocks',75);
  expect(fragments).toHaveLength(2);
  expect(blocks).toHaveLength(5);
  expect(new Set(fragments.map(part=>part.color)).size).toBe(2);
  expect(new Set(blocks.map(part=>part.color)).size).toBeGreaterThan(3);
  expect(blockParts(8,9,'granite-blocks',75)).toEqual(blocks);
  const group=new THREE.Group(),boxes=new BoxBatches();
  try {
    boxes.set(group,'stone-pile',[...fragments,...blocks]);
    expect(group.children).toHaveLength(1);
    expect((group.children[0] as BoxMesh).activeCount).toBe(7);
    expect((group.children[0] as BoxMesh).colorBuffer.count).toBeGreaterThanOrEqual(7);
  } finally {boxes.dispose();}
});

test('vegetation uses textured geometry at both distances and switches existing batches to plain materials',()=>{
  const world=createWorld(93,16,16);
  world.resources=[
    {id:world.nextId++,kind:'tree',x:4,z:4,amount:12},
    {id:world.nextId++,kind:'rice',x:6,z:6,amount:6,growth:1},
    {id:world.nextId++,kind:'wild-plant',species:'grass',x:8,z:8,amount:1,growth:1},
  ];
  const plain=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  const paint=createStylizedSurfaceTexture();
  const textured=new THREE.MeshStandardNodeMaterial({vertexColors:true,map:paint});
  plain.userData.rendererOwned=textured.userData.rendererOwned=true;
  const resources=new ResourceLayer(new THREE.Group(),plain,textured);
  const crops=new CropLayer(plain,textured),plants=new PlantClusterLayer(plain,textured),overview=new OverviewLayer();
  try {
    resources.update(world,true);crops.update(world,true);plants.update(world,true);overview.update(world,true);
    const tree=resources.group.getObjectByName('tree-canopy') as THREE.Mesh;
    expect(tree).toBeTruthy();expect(tree.material).toBe(textured);
    expect(tree.geometry.getAttribute('uv').count).toBe(tree.geometry.getAttribute('position').count);
    const crop=(crops.group.children[0] as THREE.Mesh),plant=(plants.group.children[0] as THREE.Mesh);
    const treeGeometry=tree.geometry,cropGeometry=crop.geometry,plantGeometry=plant.geometry;
    resources.setTexturesEnabled(false);crops.setTexturesEnabled(false);plants.setTexturesEnabled(false);overview.setTexturesEnabled(false);
    expect(tree.material).toBe(plain);expect(crop.material).toBe(plain);expect(plant.material).toBe(plain);
    expect(tree.geometry).toBe(treeGeometry);expect(crop.geometry).toBe(cropGeometry);expect(plant.geometry).toBe(plantGeometry);
    expect(plain.map).toBeNull();
    resources.setTexturesEnabled(true);crops.setTexturesEnabled(true);plants.setTexturesEnabled(true);overview.setTexturesEnabled(true);
    expect(tree.material).toBe(textured);expect(crop.material).toBe(textured);expect(plant.material).toBe(textured);
  } finally {
    resources.clear();crops.dispose();plants.dispose();overview.dispose();plain.dispose();textured.dispose();paint.dispose();
  }
});

test('box textures switch to a plain resident material without rebuilding static placements', () => {
  const boxes = new BoxBatches(), group = new THREE.Group();
  try {
    boxes.set(group, 'furniture', [{ x: 2, y: 0.4, z: 3, sx: 2, sz: 4, color: 0x345673 }]);
    boxes.set(group, 'roof-areas', [{ x: 3, y: 0.1, z: 4 }], 'overlay');
    const mesh = group.getObjectByName('furniture') as BoxMesh;
    const overlay = group.getObjectByName('roof-areas') as BoxMesh;
    const textured = mesh.material, overlayMaterial = overlay.material;
    const geometry = mesh.geometry, instanceMatrix = mesh.instanceMatrix, colors = mesh.colorBuffer;
    expect(mesh.geometry.getAttribute('uv').count).toBe(24);

    boxes.setTexturesEnabled(false);
    const plain = mesh.material as THREE.MeshStandardNodeMaterial;
    expect(plain).not.toBe(textured);
    expect(plain.map).toBeNull();
    expect(plain.colorNode).not.toBe((textured as THREE.MeshStandardNodeMaterial).colorNode);
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.instanceMatrix).toBe(instanceMatrix);
    expect(mesh.colorBuffer).toBe(colors);
    expect(overlay.material).toBe(overlayMaterial);

    boxes.setTexturesEnabled(true);
    expect(mesh.material).toBe(textured);
    boxes.setTexturesEnabled(false);
    boxes.set(group, 'new-furniture', [{ x: 1, y: 0.5, z: 1 }]);
    expect((group.getObjectByName('new-furniture') as BoxMesh).material).toBe(plain);
    boxes.set(group, 'furniture', Array.from({ length: 300 }, (_, i) => ({ x: i, y: 0.5, z: 0 })));
    expect(mesh.material).toBe(plain);
    expect(mesh.geometry.getAttribute('uv').count).toBe(24);
  } finally {
    boxes.dispose();
  }
});
