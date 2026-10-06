import {expect,test} from 'vitest';
import {NaturalDirtyContractOracle} from './scenarios/natural-dirty-contract-v233';
import * as THREE from 'three/webgpu';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots';
import {createWorld} from '../src/sim/index';
import type {Job,Resource,World} from '../src/sim/types';
import {WORLD_SCALE} from '../src/world/scale';
import {SceneResourceIndex,readSceneResourceFrame,type SceneResourceAccess,type SceneResourceFrame} from '../src/render/scene-resource-index';
import {ResourceLayer} from '../src/render/ResourceLayer';
import {NaturalResourcePresentation,type NaturalPresentationChange} from '../src/render/NaturalResourcePresentation';
import {NaturalResourcePresentationV225 as NaturalReference} from './scenarios/natural-presentation-baseline-v225';
import {OverviewLayer} from '../src/render/OverviewLayer';
import {PlantClusterLayer} from '../src/render/PlantClusterLayer';
import type {OverviewBatch} from '../src/render/OverviewBatch';
import type {ResourceRangeData} from '../src/render/StaticGeometry';

const built=(r:Resource)=>!['rice','potato','corn','cotton'].includes(r.kind)&&r.species!=='grass'&&r.species!=='tall-grass';
const key=(r:Resource)=>`${Math.floor(r.x/WORLD_SCALE.chunkSize)}:${Math.floor(r.z/WORLD_SCALE.chunkSize)}`;
function camp():World {
  const w=createWorld(228,250,16),c=WORLD_SCALE.chunkSize;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  w.resources=[
    {id:w.nextId++,kind:'tree',species:'oak',x:2*c+2,z:2,amount:30,growth:.1,growthTick:0,growthThermalFactor:0},
    {id:w.nextId++,kind:'tree',species:'oak',x:2,z:2,amount:30,growth:1,growthTick:0},
    {id:w.nextId++,kind:'rock',stone:'granite',x:c+1,z:2,amount:20},
    {id:w.nextId++,kind:'berries',x:4,z:2,amount:10,growth:.64,growthTick:0,growthThermalFactor:0},
    {id:w.nextId++,kind:'tree',species:'pine',x:3*c+2,z:2,amount:30,growth:1,growthTick:0},
    {id:w.nextId++,kind:'wild-plant',species:'grass',x:5,z:2,amount:2,growth:.1,growthTick:0},
    {id:w.nextId++,kind:'rice',x:6,z:2,amount:10,growth:.2,growthTick:0},
    {id:w.nextId++,kind:'healroot',x:7,z:2,amount:1,growth:.3,growthTick:0},
  ];return w;
}
function transport(w:World){
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const packet=(checkpoint=false)=>structuredClone(encoder.encode(w,0,6,checkpoint));
  const send=(checkpoint=false)=>{
    const result=decoder.adopt(packet(checkpoint));
    if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(w);return result.world;
  };return {send,packet,decoder};
}
function exhaustive(w:World){
  const chunks=new Map<string,Resource[]>(),trees=new Map<number,number>();
  for(const r of w.resources)if(built(r)){
    const k=key(r),members=chunks.get(k);if(members)members.push(r);else chunks.set(k,[r]);
    if(r.kind==='tree')trees.set(r.z*w.width+r.x,r.id);
  }return {chunks:[...chunks].map(([key,resources])=>({key,resources})),trees};
}
function check(access:SceneResourceAccess,w:World):void {
  const expected=exhaustive(w),chunks=access.chunksFor()!;
  expect(chunks.changedChunks).toStrictEqual(expected.chunks);
  for(const chunk of chunks.changedChunks)for(const r of chunk.resources)expect(r).toBe(w.resources.find(source=>source.id===r.id));
  for(const r of w.resources){const cell=r.z*w.width+r.x;expect(access.treeAt(cell)).toBe(expected.trees.get(cell));}
  expect(access.treeAt(-1)).toBeUndefined();
}
const change=(r:Resource|undefined):NaturalPresentationChange=>({resource:r,size:1});

test('fresh capture has exact source order/current references and an unforgeable synchronous handle',async()=>{
  const w=camp(),current=transport(w).send(),index=new SceneResourceIndex(),frame=index.adopt(current),access=readSceneResourceFrame(frame,current)!;
  check(access,current);expect(access.rockCoverEdits).toBeUndefined();
  expect(readSceneResourceFrame({} as SceneResourceFrame,current)).toBeUndefined();
  expect(readSceneResourceFrame(frame,structuredClone(current))).toBeUndefined();
  const forged={owner:index,generation:1,world:current,resources:current.resources,tick:current.tick,seed:current.seed,width:current.width,height:current.height,active:true} as never;
  expect(index.accepts(forged)).toBe(false);expect(index.treeAt(forged,2*current.width+2)).toBeUndefined();expect(index.chunksFor(forged)).toBeUndefined();
  const materialized=access.chunksFor()!,saved=structuredClone(materialized);
  await Promise.resolve();
  expect(readSceneResourceFrame(frame,current)).toBeUndefined();expect(access.chunksFor()).toBeUndefined();expect(access.treeAt(2*current.width+2)).toBeUndefined();
  expect(materialized).toStrictEqual(saved);
});

test('composed sparse movements and silent patches keep source ordinals, old contributions and current references',()=>{
  const w=camp(),{send}=transport(w),index=new SceneResourceIndex(),first=send();
  const initial=index.adopt(first),old=readSceneResourceFrame(initial,first)!.chunksFor()!,oldValue=structuredClone(old);
  w.resources[2]!.x=2*WORLD_SCALE.chunkSize+4;send();
  w.resources[1]!.x=WORLD_SCALE.chunkSize+3;w.resources[0]!.amount++;
  const next=send(),frame=index.adopt(next),access=readSceneResourceFrame(frame,next,first)!;
  check(access,next);expect(access.rockCoverEdits).toStrictEqual([{before:2*w.width+WORLD_SCALE.chunkSize+1,after:2*w.width+2*WORLD_SCALE.chunkSize+4}]);
  expect(readSceneResourceFrame(frame,next)).toHaveProperty('rockCoverEdits',undefined);
  expect(readSceneResourceFrame(frame,next,structuredClone(first))).toBeUndefined();
  const changes=new Map([[next.resources[1]!.id,change(next.resources[1])],[next.resources[2]!.id,change(next.resources[2])]]);
  const selected=access.chunksFor(changes)!;
  expect(selected.changedChunks.map(chunk=>chunk.key)).toStrictEqual(exhaustive(next).chunks.filter(chunk=>['0:0','1:0','2:0'].includes(chunk.key)).map(chunk=>chunk.key));
  expect(old).toStrictEqual(oldValue);expect(readSceneResourceFrame(initial,first)).toBeUndefined();
  w.resources[0]!.amount++;const silent=send(),silentAccess=readSceneResourceFrame(index.adopt(silent),silent,next)!;
  expect(silentAccess.rockCoverEdits).toStrictEqual([]);check(silentAccess,silent);
  expect(silentAccess.chunksFor()!.changedChunks[0]!.resources[0]).toBe(silent.resources[0]);
});

test.each(['reset','membership','reorder','classification','eviction'] as const)('unknown %s boundaries recapture fully before deriving any rock balance',reason=>{
  const w=camp(),{send}=transport(w),index=new SceneResourceIndex(),first=send();index.adopt(first);
  if(reason==='membership')w.resources.push({id:w.nextId++,kind:'rock',x:12,z:3,amount:20});
  if(reason==='reorder')w.resources.reverse();
  if(reason==='classification')w.resources[3]!.kind='rice';
  if(reason==='eviction'){for(let i=0;i<65;i++)send();}
  const next=send(reason==='reset'),frame=index.adopt(next,reason==='reset'),access=readSceneResourceFrame(frame,next,first)!;
  if(reason==='reset')expect(access.rockCoverEdits).toBeUndefined();
  else expect(access.rockCoverEdits).toStrictEqual(reason==='membership'?[{before:undefined,after:3*w.width+12}]:[]);
  check(access,next);
});

test('stale/refused packets do not invent contributions and a later valid patch retains the actual predecessor',()=>{
  const w=camp(),{send,packet,decoder}=transport(w),index=new SceneResourceIndex(),first=send();index.adopt(first);
  w.resources[2]!.x+=1;const valid=packet(),invalid=structuredClone(valid);
  if(invalid.kind!=='delta')throw Error('expected delta');
  Reflect.set(invalid.world,'schemaVersion',Number.NaN);expect(decoder.adopt(invalid).status).toBe('resync');
  const result=decoder.adopt(valid);if(result.status!=='applied')throw Error(JSON.stringify(result));
  expect(decoder.adopt(valid).status).toBe('stale');
  const access=readSceneResourceFrame(index.adopt(result.world),result.world,first)!;
  expect(access.rockCoverEdits).toStrictEqual([{before:2*w.width+WORLD_SCALE.chunkSize+1,after:2*w.width+WORLD_SCALE.chunkSize+2}]);check(access,result.world);
});

test('mutable and unconfirmed Worlds recapture, tree collisions keep the last source, and clear revokes handles',()=>{
  // Collision is a presentation query fixture, not a serialized game save.
  const w=camp(),index=new SceneResourceIndex();w.resources[0]!.x=w.resources[1]!.x;w.resources[0]!.z=w.resources[1]!.z;
  let frame=index.adopt(w);check(readSceneResourceFrame(frame,w)!,w);
  expect(readSceneResourceFrame(frame,w)!.treeAt(2*w.width+2)).toBe(w.resources[1]!.id);
  w.resources.reverse();const prior=frame;frame=index.adopt(w);check(readSceneResourceFrame(frame,w)!,w);
  expect(readSceneResourceFrame(frame,w,w)!.rockCoverEdits).toBeUndefined();expect(readSceneResourceFrame(prior,w)).toBeUndefined();
  const clone=structuredClone(w);frame=index.adopt(clone);expect(readSceneResourceFrame(frame,clone,w)!.rockCoverEdits).toBeUndefined();
  index.clear();expect(readSceneResourceFrame(frame,clone)).toBeUndefined();
});

test('consumer geometry keys clear skipped old chunks without replacing current source ordering',()=>{
  const w=camp(),{send}=transport(w),index=new SceneResourceIndex(),first=send();index.adopt(first);
  w.resources[2]!.x=2*WORLD_SCALE.chunkSize+4;const middle=send();index.adopt(middle);
  w.resources[2]!.x=3*WORLD_SCALE.chunkSize+4;const next=send(),access=readSceneResourceFrame(index.adopt(next),next,middle)!;
  const r=next.resources[2]!,result=access.chunksFor(new Map([[r.id,change(r)]]),new Set(['1:0']))!;
  expect(result.emptiedKeys).toContain('1:0');
  expect(result.changedChunks.map(chunk=>chunk.key)).toStrictEqual(['2:0','3:0']);
  expect(result.changedChunks[1]!.resources.map(r=>r.id)).toStrictEqual([next.resources[2]!.id,next.resources[4]!.id]);
});

const sphere=(s:THREE.Sphere|null|undefined)=>s?{center:s.center.toArray(),radius:s.radius}:undefined;
function appearance(group:THREE.Group){
  return group.children.map(chunk=>({name:chunk.name,meshes:chunk.children.map(object=>{
    const mesh=object as THREE.Mesh,g=mesh.geometry,data=mesh.userData.resourceRanges as ResourceRangeData;
    return {name:mesh.name,visible:mesh.visible,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,drawRange:{...g.drawRange},
      ranges:data.ranges.map(r=>({...r})),originalIndex:Array.from(data.original),originalPositions:Array.from(data.originalPositions),
      index:Array.from(g.index!.array),attributes:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,Array.from(a.array)])),
      sphere:sphere(g.boundingSphere),updates:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,'updateRanges' in a?a.updateRanges:undefined]))};
  })}));
}
function instances(group:THREE.Group){
  const rows:unknown[]=[];group.traverse(object=>{
    if(object instanceof THREE.InstancedMesh)rows.push({name:object.name,count:object.count,matrix:Array.from(object.instanceMatrix.array),color:Array.from(object.instanceColor!.array),sphere:sphere(object.boundingSphere)});
    else if(object instanceof THREE.Mesh&&'colorBuffer' in object){const batch=object as OverviewBatch;rows.push({name:batch.name,count:batch.activeCount,matrix:Array.from(batch.instanceMatrix.array),color:Array.from(batch.colorBuffer.array),sphere:sphere(batch.boundingSphere),drawRange:{...batch.geometry.drawRange}});}
  });return rows;
}

test('indexed complete Worlds match historical geometry/ranges/uploads and Overview/cluster routing over edits and restoration',()=>{
  const w=camp(),{send}=transport(w),index=new SceneResourceIndex(),natural=new NaturalResourcePresentation(),reference=new NaturalReference();
  const dirtyContract=new NaturalDirtyContractOracle();
  const material=new THREE.MeshStandardNodeMaterial();material.userData.rendererOwned=true;
  const a=new ResourceLayer(new THREE.Group(),material),b=new ResourceLayer(new THREE.Group(),material);
  const overviewA=new OverviewLayer(),overviewB=new OverviewLayer(),clusterA=new PlantClusterLayer(material),clusterB=new PlantClusterLayer(material);
  const check=(reset=false)=>{
    const world=send(reset),before=structuredClone(world),frame=index.adopt(world,reset),old=reference.read(world,reset,true),view=natural.read(world,reset,true);
    expect(view===undefined).toBe(old===undefined);dirtyContract.assert(world,reset,true,natural.changes,reference.changes);
    if(view&&old){
      const visible={...old,resources:old.resources.filter(built)};
      a.update(visible,reset,reference.changes);b.update(world,reset,natural.changes,frame);
      overviewA.update(visible,reset,reference.changes);overviewB.update(world,reset,natural.changes);
      clusterA.update(old,reset,reference.changes);clusterB.update(world,reset,natural.changes);
    }
    expect(appearance(b.group)).toStrictEqual(appearance(a.group));
    expect(instances(overviewB.group)).toStrictEqual(instances(overviewA.group));expect(instances(clusterB.group)).toStrictEqual(instances(clusterA.group));
    expect(world).toStrictEqual(before);
  };
  try{
    check(true);const stableA=a.group.children.find(chunk=>chunk.name==='Resources 3:0')!,stableB=b.group.children.find(chunk=>chunk.name==='Resources 3:0')!;
    const buffersA=stableA.children.map(object=>(object as THREE.Mesh).geometry),buffersB=stableB.children.map(object=>(object as THREE.Mesh).geometry);
    w.resources[0]!.amount++;check();w.resources[5]!.growth=.7;check();
    w.resources[0]!.growth=.5;check();w.resources[3]!.growth=.66;check();
    w.resources[2]!.x=2*WORLD_SCALE.chunkSize+4;check();w.resources[2]!.stone='marble';check();
    expect(stableA.children.map(object=>(object as THREE.Mesh).geometry)).toStrictEqual(buffersA);expect(stableB.children.map(object=>(object as THREE.Mesh).geometry)).toStrictEqual(buffersB);
    const removed=w.resources.splice(3,1)[0]!;check();w.resources.splice(3,0,removed);check();
    w.resources.reverse();check();removed.kind='rice';check();removed.kind='berries';check();
    a.setFoliageVisible(false);b.setFoliageVisible(false);a.setTexturesEnabled(false);b.setTexturesEnabled(false);check(true);
  }finally{a.dispose();b.dispose();overviewA.dispose();overviewB.dispose();clusterA.dispose();clusterB.dispose();material.dispose();}
});

test('indexed tree lookup and expired pending fallback preserve reserved chopping recoil',async()=>{
  // A geometric contact fixture: no played campaign or checkpoint is claimed.
  const w=camp(),pawn=w.pawns[0]!,tree=w.resources[1]!;pawn.x=tree.x-1;pawn.z=tree.z;pawn.state='working';pawn.jobId=w.nextId++;
  const job:Job={id:pawn.jobId,kind:'chop',x:tree.x,z:tree.z,orientation:0,footprint:'standard',status:'active',reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0}};w.jobs=[job];
  const cycle=(tick:number)=>Math.floor((11*tick/6+pawn.id*1.7-1.5*Math.PI)/(2*Math.PI));
  let tick=2;while(tick<20&&cycle(tick)===cycle(tick-1))tick++;expect(tick).toBeLessThan(20);w.tick=tick-1;
  const material=new THREE.MeshStandardNodeMaterial();material.userData.rendererOwned=true;
  const a=new ResourceLayer(new THREE.Group(),material),b=new ResourceLayer(new THREE.Group(),material),pending=new ResourceLayer(new THREE.Group(),material),index=new SceneResourceIndex();
  // A non-rendered cluster tree shares the cell; the old renderer filtered it.
  w.resources.push({id:w.nextId++,kind:'tree',species:'grass',x:tree.x,z:tree.z,amount:2});
  try{
    const frame=index.adopt(w);a.update({...w,resources:w.resources.filter(built)},true);b.update(w,true,undefined,frame);pending.update(w,true,undefined,frame);
    await Promise.resolve();const next=structuredClone(w);next.tick++;next.jobs[0]!.progress=1;
    const nextFrame=index.adopt(next);a.adoptChopWork(w,next);b.adoptChopWork(w,next,false,nextFrame);pending.adoptChopWork(w,next);
    const phase=pawn.id*1.7-1.5*Math.PI,contact=(cycle(next.tick)*2*Math.PI-phase)/11;
    a.presentChop(contact+.09);b.presentChop(contact+.09);pending.presentChop(contact+.09);
    expect(appearance(b.group)).toStrictEqual(appearance(a.group));expect(appearance(pending.group)).toStrictEqual(appearance(a.group));
    a.presentChop(contact+.6);b.presentChop(contact+.6);pending.presentChop(contact+.6);
    expect(appearance(b.group)).toStrictEqual(appearance(a.group));expect(appearance(pending.group)).toStrictEqual(appearance(a.group));
  }finally{a.dispose();b.dispose();pending.dispose();material.dispose();}
});
