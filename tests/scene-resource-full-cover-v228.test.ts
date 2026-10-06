// Full projection queries, including hostile post-adoption mutations, remain
// separate from strict saved colonies and ordinary simulation campaigns.
import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots';
import {readSnapshotChanges,sameSnapshotChangeDomain} from '../src/bridge/snapshot-changes';
import {SceneResourceIndex,readSceneResourceFrame,type RockCoverEdit} from '../src/render/scene-resource-index';
import {ResourceLayer} from '../src/render/ResourceLayer';
import {createWorld} from '../src/sim/index';
import type {Resource,World} from '../src/sim/types';
import {WORLD_SCALE} from '../src/world/scale';

function camp():World {
  const w=createWorld(228,96,16);w.tiles=w.tiles.map(()=>({terrain:'soil'}));
  w.resources=[
    {id:w.nextId++,kind:'rock',x:2,z:3,amount:20},
    {id:w.nextId++,kind:'rock',x:2,z:3,amount:20},
    {id:w.nextId++,kind:'tree',species:'oak',x:70,z:3,amount:20,growth:1,growthTick:0},
    {id:w.nextId++,kind:'rice',x:4,z:3,amount:10,growth:1,growthTick:0},
    {id:w.nextId++,kind:'rock',x:12,z:4,amount:20},
  ];return w;
}
function publisher(w:World){
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),old:Array<{world:World;value:World}>=[];
  const send=(checkpoint=false,source=w)=>{
    const packet=structuredClone(encoder.encode(source,0,6,checkpoint)),before=structuredClone(packet),result=decoder.adopt(packet);
    if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(source);expect(packet).toStrictEqual(before);
    for(const snapshot of old)expect(snapshot.world).toStrictEqual(snapshot.value);
    old.push({world:result.world,value:structuredClone(result.world)});return result.world;
  };return {send};
}
function counts(w:World):number[]{const result=Array<number>(w.width*w.height).fill(0);for(const r of w.resources)if(r.kind==='rock')result[r.z*w.width+r.x]!++;return result;}
function checkEdits(before:World,after:World,edits:readonly RockCoverEdit[]):void {
  const actual=counts(before);
  for(const edit of edits){
    if(edit.before!==undefined){expect(actual[edit.before]).toBeGreaterThan(0);actual[edit.before]!--;}
    if(edit.after!==undefined)actual[edit.after]!++;
  }expect(actual).toStrictEqual(counts(after));expect(Object.isFrozen(edits)).toBe(true);
  for(const edit of edits)expect(Object.isFrozen(edit)).toBe(true);
}
function checkMembers(frame:Parameters<typeof readSceneResourceFrame>[0],w:World):void {
  const expected=new Map<string,Resource[]>();
  for(const r of w.resources)if(!['rice','potato','corn','cotton'].includes(r.kind)&&r.species!=='grass'&&r.species!=='tall-grass'){
    const key=`${Math.floor(r.x/WORLD_SCALE.chunkSize)}:${Math.floor(r.z/WORLD_SCALE.chunkSize)}`,group=expected.get(key);
    if(group)group.push(r);else expected.set(key,[r]);
  }
  const chunks=readSceneResourceFrame(frame,w)!.chunksFor()!.changedChunks;
  expect(chunks).toStrictEqual([...expected].map(([key,resources])=>({key,resources})));
  for(const chunk of chunks)for(const r of chunk.resources)expect(r).toBe(w.resources.find(source=>source.id===r.id));
}

test.each(['birth','removal','reorder','classification'] as const)('full %s recaptures source membership but proves empty rock contributions',reason=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),first=send();index.adopt(first);
  if(reason==='birth')w.resources.push({id:w.nextId++,kind:'healroot',x:7,z:7,amount:1,growth:.4,growthTick:0});
  if(reason==='removal')w.resources.splice(3,1);
  if(reason==='reorder')w.resources.reverse();
  if(reason==='classification'){w.resources[2]!.kind='rice';delete w.resources[2]!.species;}
  const next=send(),frame=index.adopt(next),access=readSceneResourceFrame(frame,next,first)!;
  expect(sameSnapshotChangeDomain(first,next)).toBe(true);
  if(reason!=='classification')expect(readSnapshotChanges(first,next)).toBeUndefined();
  expect(access.rockCoverEdits).toStrictEqual([]);checkEdits(first,next,access.rockCoverEdits!);checkMembers(frame,next);
});

test('full rock multisets retain overlaps, ID swaps and fixed old outputs across later recaptures',()=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex();let previous=send();index.adopt(previous);
  const adopt=()=>{const next=send(),frame=index.adopt(next),edits=readSceneResourceFrame(frame,next,previous)!.rockCoverEdits!;checkEdits(previous,next,edits);checkMembers(frame,next);previous=next;return edits;};
  const first=w.resources[0]!,last=w.resources[4]!;[first.x,last.x]=[last.x,first.x];[first.z,last.z]=[last.z,first.z];w.resources.reverse();
  expect(adopt()).toStrictEqual([]);
  const overlap=w.resources.find(r=>r.id===previous.resources[3]!.id)!; // the second original rock in reversed source
  expect(overlap.kind).toBe('rock');w.resources=w.resources.filter(r=>r!==overlap);
  const removed=adopt(),frozen=structuredClone(removed);expect(removed).toHaveLength(1);
  w.resources.push({id:w.nextId++,kind:'rock',x:15,z:5,amount:20});expect(adopt()).toHaveLength(1);
  first.x=20;w.resources.reverse();expect(adopt()).toHaveLength(2);
  expect(removed).toStrictEqual(frozen);
});

test('64-record eviction permits an exhaustive same-domain diff without claiming a sparse suffix',()=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),first=send();index.adopt(first);
  for(let i=0;i<66;i++){if(i===4)w.resources.push({id:w.nextId++,kind:'rock',x:15,z:5,amount:20});w.tick++;send();}
  const next=send();expect(readSnapshotChanges(first,next)).toBeUndefined();expect(sameSnapshotChangeDomain(first,next)).toBe(true);
  const frame=index.adopt(next),edits=readSceneResourceFrame(frame,next,first)!.rockCoverEdits!;
  checkEdits(first,next,edits);expect(edits).toStrictEqual([{before:undefined,after:5*w.width+15}]);checkMembers(frame,next);
});

test.each(['checkpoint','epoch','clone','same object','reset','another decoder'] as const)('%s cannot borrow full-cover authority',reason=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),first=send();index.adopt(first);
  w.resources.push({id:w.nextId++,kind:'rock',x:15,z:5,amount:20});
  let next:World;
  if(reason==='checkpoint')next=send(true);
  else if(reason==='epoch')next=send(false,structuredClone(w));
  else if(reason==='clone')next=structuredClone(send());
  else if(reason==='same object'){first.resources.push({id:w.nextId++,kind:'rock',x:16,z:5,amount:20});next=first;}
  else if(reason==='another decoder')next=publisher(w).send();
  else next=send();
  if(reason==='another decoder'){
    expect(readSnapshotChanges(first,first)).toBeDefined();expect(readSnapshotChanges(next,next)).toBeDefined();expect(sameSnapshotChangeDomain(first,next)).toBe(false);
  }
  const frame=index.adopt(next,reason==='reset');
  expect(readSceneResourceFrame(frame,next,first)!.rockCoverEdits).toBeUndefined();checkMembers(frame,next);
});

test('reversed revisions and mutated predecessor metadata do not certify a full balance',()=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),first=send();index.adopt(first);
  w.resources.push({id:w.nextId++,kind:'rock',x:15,z:5,amount:20});const second=send();
  expect(sameSnapshotChangeDomain(second,first)).toBe(false);
  first.width=48;const frame=index.adopt(second);expect(readSceneResourceFrame(frame,second,first)!.rockCoverEdits).toBeUndefined();
  first.width=w.width;
  index.clear();index.adopt(second);w.resources.reverse();const third=send();second.seed++;
  const nextFrame=index.adopt(third);expect(readSceneResourceFrame(nextFrame,third,second)!.rockCoverEdits).toBeUndefined();
});

test.each(['width','seed'] as const)('owned %s metadata declines a forged sparse continuation to fresh geometry',field=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),first=send();index.adopt(first);
  w.resources[0]!.x=8;const second=send();expect(readSnapshotChanges(first,second)).toBeDefined();
  // Hostile post-adoption globals on BOTH identities must not erase the private
  // origin dimensions/seed. No claim is made that these mutations form a save.
  if(field==='width'){first.width=192;second.width=192;}else{first.seed++;second.seed++;}
  const frame=index.adopt(second),access=readSceneResourceFrame(frame,second,first)!;
  expect(access.rockCoverEdits).toBeUndefined();checkMembers(frame,second);
  expect(access.treeAt(3*second.width+70)).toBe(second.resources[2]!.id);
  const material=new THREE.MeshStandardNodeMaterial();material.userData.rendererOwned=true;
  const reference=new ResourceLayer(new THREE.Group(),material),candidate=new ResourceLayer(new THREE.Group(),material);
  const buffers=(group:THREE.Group)=>group.children.map(chunk=>({name:chunk.name,meshes:chunk.children.map(object=>{
    const mesh=object as THREE.Mesh,g=mesh.geometry;return {name:mesh.name,drawRange:{...g.drawRange},index:Array.from(g.index!.array),
      attributes:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,Array.from(a.array)])),ranges:mesh.userData.resourceRanges};
  })}));
  try{reference.update(second,true);candidate.update(second,true,undefined,frame);expect(buffers(candidate.group)).toStrictEqual(buffers(reference.group));}
  finally{reference.dispose();candidate.dispose();material.dispose();}
});

test.each(['duplicate','coordinate'] as const)('late hostile %s in an admitted World publishes no partial frame and recovers cold',fault=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),first=send();index.adopt(first);
  w.resources.push({id:w.nextId++,kind:'rock',x:15,z:5,amount:20});const admitted=send();
  // Hostile post-adoption mutation tests the frame guard, not a valid save.
  if(fault==='duplicate')admitted.resources.at(-1)!.id=admitted.resources[0]!.id;else admitted.resources.at(-1)!.x=admitted.width;
  const badFrame=index.adopt(admitted);expect(readSceneResourceFrame(badFrame,admitted,first)).toBeUndefined();
  // A fresh producer/decoder retains ordinary admissions independently of the hostile object.
  const recovered=publisher(w).send(),frame=index.adopt(recovered);
  expect(readSceneResourceFrame(frame,recovered)!.rockCoverEdits).toBeUndefined();checkMembers(frame,recovered);
});

test('full edits keep the grass predecessor requirement even if their net balance is empty',()=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),a=send();index.adopt(a);
  w.resources[0]!.x=8;const b=send();index.adopt(b);
  w.resources.push({id:w.nextId++,kind:'healroot',x:7,z:7,amount:1});const c=send(),frame=index.adopt(c);
  expect(readSceneResourceFrame(frame,c,a)).toBeUndefined();expect(readSceneResourceFrame(frame,c,b)!.rockCoverEdits).toStrictEqual([]);
});
