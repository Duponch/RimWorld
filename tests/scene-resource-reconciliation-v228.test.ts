// Future location: tests/. Real transport admissions are separate from the
// explicitly hostile or mutable local projection queries at the end.
import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots';
import {readSnapshotChanges} from '../src/bridge/snapshot-changes';
import {SceneResourceIndex,readSceneResourceFrame,type SceneResourceAccess,type RockCoverEdit} from '../src/render/scene-resource-index';
import type {NaturalPresentationChange} from '../src/render/NaturalResourcePresentation';
import {createWorld} from '../src/sim/index';
import type {Resource,World} from '../src/sim/types';
import {WORLD_SCALE} from '../src/world/scale';

const built=(r:Resource)=>!['rice','potato','corn','cotton'].includes(r.kind)&&r.species!=='grass'&&r.species!=='tall-grass';
const key=(r:Resource)=>`${Math.floor(r.x/WORLD_SCALE.chunkSize)}:${Math.floor(r.z/WORLD_SCALE.chunkSize)}`;
function camp():World {
  const w=createWorld(228,250,16),c=WORLD_SCALE.chunkSize;w.tiles=w.tiles.map(()=>({terrain:'soil'}));
  w.resources=[
    {id:w.nextId++,kind:'tree',species:'oak',x:2*c+2,z:2,amount:30,growth:1,growthTick:0},
    {id:w.nextId++,kind:'tree',species:'oak',x:2,z:2,amount:30,growth:1,growthTick:0},
    {id:w.nextId++,kind:'rock',x:c+1,z:2,amount:20},
    {id:w.nextId++,kind:'berries',x:4,z:2,amount:10,growth:.64,growthTick:0},
    {id:w.nextId++,kind:'tree',species:'pine',x:3*c+2,z:2,amount:30,growth:1,growthTick:0},
    {id:w.nextId++,kind:'wild-plant',species:'grass',x:5,z:2,amount:2,growth:.1,growthTick:0},
    {id:w.nextId++,kind:'rice',x:6,z:2,amount:10,growth:.2,growthTick:0},
    {id:w.nextId++,kind:'healroot',x:7,z:2,amount:1,growth:.3,growthTick:0},
  ];return w;
}
function publisher(w:World){
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),history:Array<{world:World;value:World}>=[];
  const send=()=>{
    const packet=structuredClone(encoder.encode(w,0,6)),original=structuredClone(packet),result=decoder.adopt(packet);
    if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(w);expect(packet).toStrictEqual(original);
    for(const old of history)expect(old.world).toStrictEqual(old.value);
    history.push({world:result.world,value:structuredClone(result.world)});return result.world;
  };return {send};
}
function exhaustive(w:World){
  const chunks=new Map<string,Resource[]>(),trees=new Map<number,number>();
  for(const r of w.resources)if(built(r)){
    const k=key(r),members=chunks.get(k);if(members)members.push(r);else chunks.set(k,[r]);
    if(r.kind==='tree')trees.set(r.z*w.width+r.x,r.id);
  }return {chunks:[...chunks].map(([key,resources])=>({key,resources})),trees};
}
function check(access:SceneResourceAccess,w:World,old?:World):void {
  const expected=exhaustive(w),actual=access.chunksFor()!;expect(actual.changedChunks).toStrictEqual(expected.chunks);
  for(const chunk of actual.changedChunks)for(const r of chunk.resources)expect(r).toBe(w.resources.find(current=>current.id===r.id));
  for(const r of [...(old?.resources??[]),...w.resources])expect(access.treeAt(r.z*w.width+r.x)).toBe(expected.trees.get(r.z*w.width+r.x));
  expect(access.treeAt(-1)).toBeUndefined();
}
function selected(access:SceneResourceAccess,before:World,after:World,ids:readonly number[],extra=new Set<string>()):void {
  const changes=new Map<number,NaturalPresentationChange>(),keys=new Set(extra),expected=exhaustive(after).chunks;
  for(const id of ids){
    const old=before.resources.find(r=>r.id===id),current=after.resources.find(r=>r.id===id);
    changes.set(id,{resource:current,size:1});if(old&&built(old))keys.add(key(old));if(current&&built(current))keys.add(key(current));
  }
  const actual=access.chunksFor(changes,extra)!;
  expect(actual.changedChunks).toStrictEqual(expected.filter(chunk=>keys.has(chunk.key)));
  expect(actual.emptiedKeys).toStrictEqual([...keys].filter(k=>!expected.some(chunk=>chunk.key===k)));
  for(const chunk of actual.changedChunks)for(const r of chunk.resources)expect(r).toBe(after.resources.find(current=>current.id===r.id));
}
function rockCounts(w:World){const counts=new Map<number,number>();for(const r of w.resources)if(r.kind==='rock'){const cell=r.z*w.width+r.x;counts.set(cell,(counts.get(cell)??0)+1);}return counts;}
function balance(before:World,after:World,edits:readonly RockCoverEdit[]):void {
  const actual=rockCounts(before);
  for(const edit of edits){
    if(edit.before!==undefined){const n=actual.get(edit.before)??0;expect(n).toBeGreaterThan(0);if(n===1)actual.delete(edit.before);else actual.set(edit.before,n-1);}
    if(edit.after!==undefined)actual.set(edit.after,(actual.get(edit.after)??0)+1);
    expect(Object.isFrozen(edit)).toBe(true);
  }expect([...actual].sort((a,b)=>a[0]-b[0])).toStrictEqual([...rockCounts(after)].sort((a,b)=>a[0]-b[0]));expect(Object.isFrozen(edits)).toBe(true);
}

test.each(['healroot','grass','rice'] as const)('tail %s birth/removal preserves source chunks, current references and old materializations',kind=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),a=send(),initial=index.adopt(a);
  const old=readSceneResourceFrame(initial,a)!.chunksFor()!,value=structuredClone(old);
  const born:Resource={id:w.nextId++,kind:kind==='grass'?'wild-plant':kind,x:3*WORLD_SCALE.chunkSize+3,z:3,amount:1,growth:.3,growthTick:0};
  if(kind==='grass')born.species='grass';w.resources.push(born);
  const b=send();expect(readSnapshotChanges(a,b)).toBeUndefined();
  let access=readSceneResourceFrame(index.adopt(b),b,a)!;check(access,b,a);balance(a,b,access.rockCoverEdits!);selected(access,a,b,[born.id]);
  expect(access.rockCoverEdits).toStrictEqual([]);const frozen=access.chunksFor()!,saved=structuredClone(frozen);
  w.resources.pop();const c=send();access=readSceneResourceFrame(index.adopt(c),c,b)!;
  check(access,c,b);balance(b,c,access.rockCoverEdits!);selected(access,b,c,[born.id]);
  expect(old).toStrictEqual(value);expect(frozen).toStrictEqual(saved);
});

test.each(['reverse','rotate left','rotate right','ID swap','middle removal','middle insertion','tail move and truncation','new ID'] as const)('%s repairs every ordinal and the by-ID lookup on an exhaustive full',reason=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),before=send();index.adopt(before);
  if(reason==='reverse')w.resources.reverse();
  if(reason==='rotate left')w.resources.push(w.resources.shift()!);
  if(reason==='rotate right')w.resources.unshift(w.resources.pop()!);
  if(reason==='ID swap')[w.resources[0]!.id,w.resources[4]!.id]=[w.resources[4]!.id,w.resources[0]!.id];
  if(reason==='middle removal')w.resources.splice(2,1);
  if(reason==='middle insertion')w.resources.splice(2,0,{id:w.nextId++,kind:'rock',x:12,z:3,amount:20});
  if(reason==='tail move and truncation')w.resources=[w.resources.at(-1)!,w.resources[0]!];
  if(reason==='new ID')w.resources[0]!.id=w.nextId++;
  const after=send();expect(readSnapshotChanges(before,after)).toBeUndefined();
  const access=readSceneResourceFrame(index.adopt(after),after,before)!;check(access,after,before);balance(before,after,access.rockCoverEdits!);
  const ids=new Set([...before.resources,...after.resources].map(r=>r.id));
  for(const id of ids)selected(access,before,after,[id]);
  selected(access,before,after,[...ids],new Set(['consumer-old-only']));
});

test('classification, moved cells and recreation at another ordinal rebuild only their exact contributions',()=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),a=send();index.adopt(a);
  const original=w.resources[0]!,rock=w.resources[2]!;original.kind='rice';delete original.species;rock.x=2;
  w.resources[1]!.x=3*WORLD_SCALE.chunkSize+2; // two built trees collide; last source wins.
  w.resources.push({id:w.nextId++,kind:'wild-plant',species:'grass',x:12,z:3,amount:2});
  const b=send(),accessB=readSceneResourceFrame(index.adopt(b),b,a)!;
  expect(readSnapshotChanges(a,b)).toBeUndefined();check(accessB,b,a);balance(a,b,accessB.rockCoverEdits!);
  selected(accessB,a,b,[original.id,rock.id,w.resources[1]!.id]);
  const returned=w.resources.splice(1,1)[0]!;returned.x=2*WORLD_SCALE.chunkSize+5;w.resources.push(returned);
  const c=send(),accessC=readSceneResourceFrame(index.adopt(c),c,b)!;
  check(accessC,c,b);balance(b,c,accessC.rockCoverEdits!);selected(accessC,b,c,[returned.id]);
});

test.each(['duplicate','coordinate'] as const)('late %s clears partial in-place reconciliation and the next adoption is cold',fault=>{
  const w=camp(),{send}=publisher(w),index=new SceneResourceIndex(),a=send();index.adopt(a);
  w.resources.reverse();w.resources[0]!.x=8;w.resources.push({id:w.nextId++,kind:'rock',x:12,z:3,amount:20});
  const bad=send(); // The following mutations deliberately invalidate this admitted query.
  if(fault==='duplicate')bad.resources.at(-1)!.id=bad.resources[0]!.id;else bad.resources.at(-1)!.x=bad.width;
  expect(readSceneResourceFrame(index.adopt(bad),bad,a)).toBeUndefined();
  const recovered=publisher(w).send(),access=readSceneResourceFrame(index.adopt(recovered),recovered)!;
  expect(access.rockCoverEdits).toBeUndefined();check(access,recovered);
});

test('same-object mutable queries still read all primitives and cannot publish a rock balance',()=>{
  const w=camp(),before=structuredClone(w),index=new SceneResourceIndex();index.adopt(w);
  w.resources[2]!.x=2;w.resources.reverse();w.resources.pop();
  const access=readSceneResourceFrame(index.adopt(w),w,w)!;
  expect(access.rockCoverEdits).toBeUndefined();check(access,w);
  for(const r of w.resources)selected(access,before,w,[r.id]);
});
