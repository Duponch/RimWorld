import { expect, test } from 'vitest';
import { MeshStandardNodeMaterial, type InstancedMesh } from 'three/webgpu';
import { CropLayer } from '../src/render/CropLayer';
import { CropLayer as ReferenceCropLayer } from './scenarios/crop-layer-baseline-v224';
import { createWorld } from '../src/sim/index';
import type { Resource, World } from '../src/sim/types';

type ObservedBatch={slots:Map<number,number>;free:number[];used:number;mesh:InstancedMesh};
type ObservedLayer={batches:ObservedBatch[]};
const observe=(layer:CropLayer|ReferenceCropLayer)=>{
  const batches=(layer as unknown as ObservedLayer).batches;
  return batches.map(batch=>({
    slots:[...batch.slots],free:batch.free.slice(),used:batch.used,
    count:batch.mesh.count,capacity:batch.mesh.instanceMatrix.count,
    matrices:Array.from(batch.mesh.instanceMatrix.array),colors:Array.from(batch.mesh.instanceColor!.array),
    matrixVersion:batch.mesh.instanceMatrix.version,colorVersion:batch.mesh.instanceColor!.version,
    matrixRanges:batch.mesh.instanceMatrix.updateRanges,colorRanges:batch.mesh.instanceColor!.updateRanges,
    bounds:batch.mesh.boundingSphere?{center:batch.mesh.boundingSphere.center.toArray(),radius:batch.mesh.boundingSphere.radius}:null,
  }));
};
function camp():World {
  const world=createWorld(224,32,32);
  world.tick=0;world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];
  const add=(resource:Omit<Resource,'id'>)=>world.resources.push({id:world.nextId++,...resource});
  add({kind:'tree',species:'oak',x:2,z:2,amount:46,growth:1});
  for(let row=0;row<3;row++)for(const [column,kind] of (['corn','rice','cotton','potato'] as const).entries()) {
    add({kind,x:6+column,z:6+row,amount:8,growth:.15+row*.3,growthTick:0,growthThermalFactor:1});
    add({kind:'berries',species:'berry-bush',x:12+column,z:6+row,amount:10,growth:.6,growthTick:0});
  }
  add({kind:'healroot',x:18,z:6,amount:1,growth:.4,growthTick:0,growthThermalFactor:1});
  return world;
}

test('one crop partition preserves four-filter slots, matrices, colors, upload ranges and bounds through an entire lifecycle',()=>{
  const world=camp(),plain=new MeshStandardNodeMaterial(),painted=new MeshStandardNodeMaterial();
  const reference=new ReferenceCropLayer(plain,painted),candidate=new CropLayer(plain,painted);
  const update=(reset=false)=>{
    const before=structuredClone(world);
    reference.update(world,reset);candidate.update(world,reset);
    expect(world).toStrictEqual(before);expect(observe(candidate)).toEqual(observe(reference));
    for(let i=0;i<4;i++)expect((candidate.group.children[i] as InstancedMesh).material).toBe((reference.group.children[i] as InstancedMesh).material);
  };
  try {
    update(true);
    world.tick=1800;update();
    const removed=world.resources.find(resource=>resource.kind==='rice')!;
    world.resources=world.resources.filter(resource=>resource.id!==removed.id);
    world.resources.splice(2,0,{id:world.nextId++,kind:'rice',x:21,z:7,amount:8,growth:.8,growthTick:world.tick});update();
    world.resources=world.resources.slice().reverse();update();
    const changed=world.resources.find(resource=>resource.kind==='cotton')!;
    changed.kind='corn';changed.x=22;update();
    const leafless=world.resources.find(resource=>resource.kind==='potato')!;
    leafless.plantLife={since:0,age:0,darkTicks:0,leaflessAt:0,nextCheck:7000};
    world.tick=5999;update();world.tick=6000;update();
    reference.setTexturesEnabled(false);candidate.setTexturesEnabled(false);update();
    reference.setTexturesEnabled(true);candidate.setTexturesEnabled(true);update();
    world.resources=[];update();
    world.width=16;world.height=32;world.tiles=Array.from({length:512},()=>({terrain:'grass'}));update(true);
  } finally {reference.dispose();candidate.dispose();plain.dispose();painted.dispose();}
});

test('crop warmup restoration keeps an intervening real update and identical retained slots',()=>{
  const world=camp(),material=new MeshStandardNodeMaterial();
  const reference=new ReferenceCropLayer(material),candidate=new CropLayer(material);
  try {
    const restoreReference=reference.prepareForCompile(),restoreCandidate=candidate.prepareForCompile();
    expect(observe(candidate)).toEqual(observe(reference));
    reference.update(world,true);candidate.update(world,true);
    restoreReference();restoreCandidate();expect(observe(candidate)).toEqual(observe(reference));
    const restoreReferenceAgain=reference.prepareForCompile(),restoreCandidateAgain=candidate.prepareForCompile();
    restoreReferenceAgain();restoreCandidateAgain();expect(observe(candidate)).toEqual(observe(reference));
  } finally {reference.dispose();candidate.dispose();material.dispose();}
});
