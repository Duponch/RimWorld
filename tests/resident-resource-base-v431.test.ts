import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler';
import {readResidentResourceBaseChanges} from '../src/bridge/resident-resource-base-changes';
import * as baseFacade from '../src/bridge/resident-resource-base-changes';
import {readSnapshotChanges,readSnapshotResourceStructure} from '../src/bridge/snapshot-changes';
import {SceneResourceIndex,readSceneResourceFrame,type SceneResourceAccess} from '../src/render/scene-resource-index';
import {CropPresentationPartition} from '../src/render/crop-presentation-partition';
import {CropLayer} from '../src/render/CropLayer';
import {RESIDENT_CROP_KINDS,isResidentCrop,isClusterPlantSpecies} from '../src/render/flora-presentation';
import {createWorld,stepWorld} from '../src/sim/index';
import {infectCrop} from '../src/sim/plant-blight';
import {WORLD_SCALE} from '../src/world/scale';
import type {Resource,World} from '../src/sim/types';

function fixture(count=12):World {
 const world=createWorld(431,32,32);world.tiles=world.tiles.map(()=>({terrain:'soil'}));
 world.resources=Array.from({length:count},(_,index)=>({id:world.nextId++,kind:'tree',species:'oak',x:index%32,z:Math.floor(index/32),amount:30,growth:.2,growthTick:0}));
 for(const [index,kind]of RESIDENT_CROP_KINDS.entries())world.resources[index]={...world.resources[index]!,kind,species:undefined,amount:8};
 world.resources[5]={...world.resources[5]!,kind:'rock',stone:'granite'};delete world.resources[5]!.growth;delete world.resources[5]!.growthTick;
 world.resources[6]={...world.resources[6]!,kind:'wild-plant',species:'grass'};
 return world;
}
function harness(world=fixture(),strictOracle=true){
 const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),reader=new ResidentPresentationAssembler(),strict=new SnapshotDecoder();
 const packet=(checkpoint=false)=>structuredClone(encoder.encode(world,0,1,checkpoint));
 const send=(checkpoint=false)=>{
  const publication=packet(checkpoint),expected=strictOracle?strict.adopt(structuredClone(publication)):undefined,result=reader.adopt(publication);
  if(result.status!=='applied')throw Error(JSON.stringify(result));
  if(expected){if(expected.status!=='applied')throw Error(JSON.stringify(expected));expect(result.world).toStrictEqual(expected.world);expect(JSON.stringify(result.world)).toBe(JSON.stringify(expected.world));}
  return result.world;
 };
 return {world,reader,packet,send};
}
function checkScene(access:SceneResourceAccess,world:World):void {
 const chunks=new Map<string,Resource[]>(),trees=new Map<number,number>();
 for(const [source,r]of world.resources.entries()){
  expect(access.resourceSource(r.id)).toBe(source);
  if(isResidentCrop(r)||isClusterPlantSpecies(r.species))continue;
  const key=`${Math.floor(r.x/WORLD_SCALE.resourceChunkSize)}:${Math.floor(r.z/WORLD_SCALE.resourceChunkSize)}`;
  if(!chunks.has(key))chunks.set(key,[]);chunks.get(key)!.push(r);
  if(r.kind==='tree')trees.set(r.z*world.width+r.x,r.id);
 }
 expect(access.chunksFor()!.changedChunks).toEqual([...chunks].map(([key,resources])=>({key,resources})));
 for(const chunk of access.chunksFor()!.changedChunks)for(const r of chunk.resources)expect(r).toBe(world.resources[access.resourceSource(r.id)!]);
 for(const r of world.resources)expect(access.treeAt(r.z*world.width+r.x)).toBe(trees.get(r.z*world.width+r.x));
}
function checkCrops(partition:CropPresentationPartition,world:World,immutable=true):void {
 const actual=partition.read(world,false,immutable);
 for(const kind of RESIDENT_CROP_KINDS){
  const expected=world.resources.filter(r=>r.kind===kind);expect(actual[kind]).toEqual(expected);
  for(const [index,r]of expected.entries())expect(actual[kind][index]).toBe(r);
 }
}

test('closed BASE witness excludes only packed growth and never replaces the public full journals',()=>{
 expect(Object.keys(baseFacade)).toEqual(['readResidentResourceBaseChanges']);
 const h=harness(),first=h.send(),before=structuredClone(first);
 for(const r of h.world.resources)if(r.growth!==undefined)r.growth+=.1;
 const next=h.send(),proof=readResidentResourceBaseChanges(first,next)!;
 expect(proof.edges).toHaveLength(1);expect(proof.edges[0]!.updated).toEqual([]);
 expect(readSnapshotChanges(first,next)!.resourceIndices).toHaveLength(h.world.resources.length-1);
 expect(readSnapshotResourceStructure(first,next)!.edges[0]!.updated).toHaveLength(h.world.resources.length-1);
 expect(Object.isFrozen(proof)).toBe(true);expect(Object.isFrozen(proof.edges)).toBe(true);expect(Object.isFrozen(proof.edges[0])).toBe(true);
 expect(readResidentResourceBaseChanges(first,structuredClone(next))).toBeUndefined();
 expect(readResidentResourceBaseChanges(h.world,next)).toBeUndefined();
 const publicReader=new SnapshotDecoder(),publicResult=publicReader.adopt(h.packet(true));
 if(publicResult.status!=='applied')throw Error(JSON.stringify(publicResult));
 expect(readResidentResourceBaseChanges(publicResult.world,publicResult.world)).toBeUndefined();
 expect(first).toStrictEqual(before);expect(first.resources[0]).not.toBe(next.resources[0]);
});

test('same-tick mixed upserts, skipped growth and moved rocks use exact target ordinals and current references',()=>{
 const h=harness(),index=new SceneResourceIndex(),crops=new CropPresentationPartition(),first=h.send(),before=structuredClone(first);
 index.adopt(first);checkCrops(crops,first);
 h.world.resources[5]!.x=20;h.world.resources[0]!.growth=.45;h.world.resources[7]!.amount++;
 const middle=h.send();h.world.resources[1]!.growth=.5;h.world.resources[8]!.species='pine';
 const next=h.send(),proof=readResidentResourceBaseChanges(first,next)!;
 expect(next.tick).toBe(first.tick);
 expect(proof.edges.map(edge=>edge.updated.map(edit=>edit.id))).toEqual([[next.resources[5]!.id,next.resources[7]!.id],[next.resources[8]!.id]]);
 expect(readResidentResourceBaseChanges(middle,next)!.edges).toHaveLength(1);
 const access=readSceneResourceFrame(index.adopt(next),next,first)!;checkScene(access,next);checkCrops(crops,next);
 expect(access.rockCoverEdits).toEqual([{before:5,after:undefined},{before:undefined,after:20}]);
 expect(first).toStrictEqual(before);
});

test('removals, births, a removed birth and classification changes compose across skipped publications',()=>{
 const h=harness(),index=new SceneResourceIndex(),crops=new CropPresentationPartition(),first=h.send();index.adopt(first);checkCrops(crops,first);
 const oldRock=h.world.resources.splice(5,1)[0]!,temporary=h.world.nextId++;
 h.world.resources.push({id:temporary,kind:'tree',species:'pine',x:22,z:3,amount:30,growth:.2,growthTick:0});h.send();
 h.world.resources=h.world.resources.filter(r=>r.id!==temporary);h.world.resources[0]!.kind='tree';h.world.resources[0]!.species='oak';
 const born=h.world.nextId++;h.world.resources.push({id:born,kind:'rice',x:23,z:3,amount:8,growth:.3,growthTick:0});
 const next=h.send(),proof=readResidentResourceBaseChanges(first,next)!;
 expect(proof.edges).toHaveLength(2);expect(proof.edges[0]!.removed).toEqual([{id:oldRock.id,beforeOrdinal:5}]);
 const access=readSceneResourceFrame(index.adopt(next),next,first)!;checkScene(access,next);checkCrops(crops,next);
 expect(access.resourceSource(temporary)).toBeUndefined();expect(access.resourceSource(oldRock.id)).toBeUndefined();
 expect(access.previousResourceSource(oldRock.id)).toBe(5);expect(access.rockCoverEdits).toEqual([{before:5,after:undefined}]);
});

test('explicit reorders and checkpoint generations take exact complete fallbacks',()=>{
 const h=harness(),index=new SceneResourceIndex(),crops=new CropPresentationPartition(),first=h.send();index.adopt(first);checkCrops(crops,first);
 h.world.resources.reverse();const reordered=h.send();expect(readResidentResourceBaseChanges(first,reordered)).toBeUndefined();
 checkScene(readSceneResourceFrame(index.adopt(reordered),reordered,first)!,reordered);checkCrops(crops,reordered);
 h.world.resources[0]!.growth=.6;const after=h.send();expect(readResidentResourceBaseChanges(reordered,after)!.edges).toHaveLength(1);
 checkScene(readSceneResourceFrame(index.adopt(after),after,reordered)!,after);checkCrops(crops,after);
 const checkpoint=h.send(true);expect(readResidentResourceBaseChanges(after,checkpoint)).toBeUndefined();
 checkScene(readSceneResourceFrame(index.adopt(checkpoint,true),checkpoint)!,checkpoint);checkCrops(crops,checkpoint);
 const mutable=structuredClone(checkpoint);mutable.resources.reverse();checkCrops(crops,mutable,false);
 checkScene(readSceneResourceFrame(index.adopt(mutable),mutable,checkpoint)!,mutable);
 mutable.resources[0]!.kind='rice';checkCrops(crops,mutable,false);
});

test.each(['malformed','refuse','throw'] as const)('a %s candidate publishes no BASE stamp and the unchanged packet still retries exactly',mode=>{
 const h=harness(),first=h.send(),before=structuredClone(first);h.world.resources[0]!.growth=.5;h.world.resources[5]!.x=20;
 const good=h.packet();if(good.kind!=='delta')throw Error('Delta expected');let rejected:World|undefined;
 if(mode==='malformed'){
  const bad=structuredClone(good);bad.resources!.growth![0]=h.world.nextId+1;
  expect(h.reader.adopt(bad).status).toBe('resync');
 }else{
  const extra=(candidate:World)=>{rejected=candidate;if(mode==='throw')throw Error('late refusal');return false;};
  if(mode==='throw')expect(()=>h.reader.adopt(good,extra)).toThrow('late refusal');
  else expect(h.reader.adopt(good,extra).status).toBe('resync');
  expect(readResidentResourceBaseChanges(first,rejected!)).toBeUndefined();expect(readResidentResourceBaseChanges(rejected!,rejected!)).toBeUndefined();
 }
 expect(readResidentResourceBaseChanges(first,first)).toEqual({edges:[]});expect(first).toStrictEqual(before);
 const result=h.reader.adopt(good);if(result.status!=='applied')throw Error(JSON.stringify(result));
 expect(readResidentResourceBaseChanges(first,result.world)!.edges[0]!.updated).toEqual([{id:first.resources[5]!.id,afterOrdinal:5}]);
 expect(readSnapshotChanges(first,result.world)!.resourceIndices).toEqual([0,5]);expect(first).toStrictEqual(before);
 expect(h.reader.adopt(good).status).toBe('stale');
});

test('64 dense growth edges keep BASE bounded independently of full value history, then expire conservatively',()=>{
 const h=harness(fixture(300),false),first=h.send(),before=structuredClone(first),index=new SceneResourceIndex(),crops=new CropPresentationPartition();index.adopt(first);checkCrops(crops,first);
 const frames=[first];
 for(let step=0;step<64;step++){for(const r of h.world.resources)if(r.growth!==undefined)r.growth+=.001;frames.push(h.send());}
 let next=frames.at(-1)!;expect(readResidentResourceBaseChanges(first,next)!.edges).toHaveLength(64);
 expect(readSnapshotResourceStructure(first,next)).toBeUndefined();
 checkScene(readSceneResourceFrame(index.adopt(next),next,first)!,next);checkCrops(crops,next);
 for(const r of h.world.resources)if(r.growth!==undefined)r.growth+=.001;next=h.send();
 expect(readResidentResourceBaseChanges(first,next)).toBeUndefined();expect(readResidentResourceBaseChanges(frames[1]!,next)!.edges).toHaveLength(64);
 expect(first).toStrictEqual(before);
});

test('BASE numerical budget overflow loses only old optimization history, preserving newest exact consumer state',()=>{
 const h=harness(fixture(300),false),first=h.send(),index=new SceneResourceIndex(),crops=new CropPresentationPartition();index.adopt(first);checkCrops(crops,first);
 for(const r of h.world.resources)r.amount++;const middle=h.send();
 for(const r of h.world.resources)r.amount++;const next=h.send();
 expect(readResidentResourceBaseChanges(first,next)).toBeUndefined();expect(readResidentResourceBaseChanges(middle,next)!.edges).toHaveLength(1);
 checkScene(readSceneResourceFrame(index.adopt(next),next,first)!,next);checkCrops(crops,next);
});

test('resident crop references preserve complete matrices, colors, slots and upload ranges through growth and actual blight',()=>{
 const h=harness(),material=new THREE.MeshStandardNodeMaterial(),candidate=new CropLayer(material),reference=new CropLayer(material);
 const observe=(layer:CropLayer)=>{
  const batches=(layer as unknown as {batches:{slots:Map<number,number>;free:number[];used:number;mesh:THREE.InstancedMesh}[]}).batches;
  return batches.map(({slots,free,used,mesh})=>({slots:[...slots],free:[...free],used,count:mesh.count,matrix:Array.from(mesh.instanceMatrix.array),color:Array.from(mesh.instanceColor!.array),
   matrixVersion:mesh.instanceMatrix.version,colorVersion:mesh.instanceColor!.version,matrixRanges:mesh.instanceMatrix.updateRanges,colorRanges:mesh.instanceColor!.updateRanges,
   bounds:mesh.boundingSphere?{center:mesh.boundingSphere.center.toArray(),radius:mesh.boundingSphere.radius}:null}));
 };
 const update=(reset=false)=>{const world=h.send(reset);candidate.update(world,reset,true);reference.update(world,reset,false);expect(observe(candidate)).toStrictEqual(observe(reference));};
 try{
  update(true);for(const r of h.world.resources)if(r.growth!==undefined){r.growth=.65;r.growthTick=h.world.tick;}update();
  // Advance the real simulation rather than jumping its tick past the other
  // retained owner clocks. These remain prepared presentation conditions.
  stepWorld(h.world);update();
  // Ordinary cultivated crops cannot legally acquire leaflessAt. Exercise
  // their real infection transition, with its own staggered clock and growth.
  expect(infectCrop(h.world,h.world.resources[1]!,1)).toBe(true);update();
  delete h.world.resources[1]!.blight;update();
  h.world.resources.splice(2,1);update();h.world.resources.reverse();update();
 }finally{candidate.dispose();reference.dispose();material.dispose();}
});
