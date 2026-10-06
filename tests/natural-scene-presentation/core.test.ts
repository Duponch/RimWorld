import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {historicalResources} from './historical-dispatch';
import {SceneRenderCore as CandidateCore} from '../../src/render/SceneRenderCore';
import {NaturalResourcePresentation as Reference} from './NaturalResourcePresentation.reference';
import {NaturalResourcePresentation as Candidate} from '../../src/render/NaturalResourcePresentation';
import {SceneResourceIndex,readSceneResourceFrame,type SceneResourceFrame} from '../../src/render/scene-resource-index';
import {PlantClusterLayer} from '../../src/render/PlantClusterLayer';
import {ResourceLayer} from '../../src/render/ResourceLayer';
import {OverviewLayer} from '../../src/render/OverviewLayer';
import type {OverviewBatch} from '../../src/render/OverviewBatch';
import type {ResourceRangeData} from '../../src/render/StaticGeometry';
import type {World,Resource} from '../../src/sim/types';
import {camp,clock,transport} from './fixtures';

type Nature=Reference|Candidate;
export type Owner={naturalPresentation:Nature;immutableWorlds:WeakSet<World>;plants:PlantClusterLayer;
  resources:ResourceLayer;overview:OverviewLayer;index:SceneResourceIndex};
type Dispatch=(this:Owner,w:World,reset:boolean,frame?:SceneResourceFrame)=>void;
const dispatchA=historicalResources;
const dispatchB=(CandidateCore.prototype as unknown as {updateResources:Dispatch}).updateResources;
function owner(nature:Nature){
  const material=new THREE.MeshStandardNodeMaterial();material.userData.rendererOwned=true;
  const value:Owner={naturalPresentation:nature,immutableWorlds:new WeakSet(),plants:new PlantClusterLayer(material),
    resources:new ResourceLayer(new THREE.Group(),material),overview:new OverviewLayer(),index:new SceneResourceIndex()};
  const dispose=()=>{value.plants.dispose();value.resources.dispose();value.overview.dispose();material.dispose();};
  return {value,dispose};
}
const sphere=(s:THREE.Sphere|null|undefined)=>s?{center:s.center.toArray(),radius:s.radius}:null;
const box=(b:THREE.Box3|null|undefined)=>b?{min:b.min.toArray(),max:b.max.toArray()}:null;
function attribute(a:THREE.BufferAttribute|THREE.InterleavedBufferAttribute|undefined|null):unknown {
  if(!a)return null;
  const value=a as THREE.BufferAttribute;
  return {type:value.array.constructor.name,array:Array.from(value.array),count:value.count,itemSize:value.itemSize,
    normalized:value.normalized,usage:value.usage,version:value.version,
    ranges:'updateRanges' in value?value.updateRanges.map(r=>({...r})):undefined};
}
/** Exact public CPU scene data and order. UUIDs/renderer allocations and node
 * caches are intentionally outside this Node observer; no GPU upload proof. */
function scene(group:THREE.Group):unknown {
  const visit=(o:THREE.Object3D):unknown=>{
    const base={type:o.type,name:o.name,visible:o.visible,position:o.position.toArray(),rotation:o.rotation.toArray(),
      scale:o.scale.toArray(),matrix:o.matrix.toArray(),castShadow:o.castShadow,receiveShadow:o.receiveShadow,
      children:o.children.map(visit)};
    if(!(o instanceof THREE.Mesh))return base;
    const g=o.geometry as THREE.BufferGeometry,data=o.userData.resourceRanges as ResourceRangeData|undefined;
    const mats=(Array.isArray(o.material)?o.material:[o.material]).map(m=>({type:m.type,name:m.name,visible:m.visible,
      side:m.side,transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite,vertexColors:(m as THREE.MeshStandardMaterial).vertexColors,
      color:(m as THREE.MeshStandardMaterial).color?.toArray(),roughness:(m as THREE.MeshStandardMaterial).roughness,
      metalness:(m as THREE.MeshStandardMaterial).metalness,hasMap:!!(m as THREE.MeshStandardMaterial).map}));
    const mesh=o as THREE.InstancedMesh;
    const overview=o as unknown as OverviewBatch;
    return {...base,material:mats,geometry:{type:g.type,index:attribute(g.index),
      attrs:Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>[k,attribute(a)])),
      groups:g.groups.map(x=>({...x})),drawRange:{...g.drawRange},sphere:sphere(g.boundingSphere),box:box(g.boundingBox)},
      resourceRanges:data?{ranges:data.ranges.map(r=>({...r})),original:Array.from(data.original),originalPositions:Array.from(data.originalPositions)}:undefined,
      instanceMatrix:attribute(mesh.instanceMatrix),instanceColor:attribute(mesh.instanceColor),count:mesh.count,
      colorBuffer:attribute(overview.colorBuffer),activeCount:overview.activeCount,
      sphere:sphere(mesh.boundingSphere),box:box(mesh.boundingBox)};
  };return visit(group);
}
function state(o:Owner){return {plant:scene(o.plants.group),resource:scene(o.resources.group),overview:scene(o.overview.group)};}
function pair(){
  const aa=owner(new Reference()),bb=owner(new Candidate()),a=aa.value,b=bb.value;
  const apply=(w:World,reset=false,readonly=true,missingFrame=false)=>{
    const before=structuredClone(w);
    if(readonly){a.immutableWorlds.add(w);b.immutableWorlds.add(w);}
    const fa=missingFrame?undefined:a.index.adopt(w,reset),fb=missingFrame?undefined:b.index.adopt(w,reset);
    Reflect.apply(dispatchA,a,[w,reset,fa]);Reflect.apply(dispatchB,b,[w,reset,fb]);
    expect([...b.naturalPresentation.changes]).toStrictEqual([...a.naturalPresentation.changes]);
    expect(state(b)).toStrictEqual(state(a));expect(w).toStrictEqual(before);
  };
  return {a,b,apply,dispose:()=>{aa.dispose();bb.dispose();}};
}

test('real Core dispatch retains F32/geometry/order/bounds/versions through cluster-crop edits and recovery',()=>{
  const w=camp(),t=transport(w),p=pair();
  try{
    p.apply(t.send(),true);w.resources[5]!.amount++;p.apply(t.send()); // noView.
    w.resources[0]!.growth=.51;w.resources[3]!.growth=.76;p.apply(t.send());
    const grass=w.resources.find(r=>r.species==='grass')!;
    grass.kind='rice';p.apply(t.send()); // species deliberately retained.
    grass.kind='wild-plant';grass.species='tall-grass';p.apply(t.send());
    w.resources[7]!.x=20;w.resources[7]!.stone='marble';p.apply(t.send());
    const original=w.resources[0]!;w.resources=w.resources.filter(r=>r.id!==original.id);t.send();
    w.resources.push({...original,x:21});const c=t.send();
    w.resources[0]!.x=23;clock(w,1);t.send();p.apply(c); // Decoder D already exists.
    w.resources.reverse();p.apply(t.send());
    p.apply(t.send(true),true);p.a.resources.setTexturesEnabled(false);p.b.resources.setTexturesEnabled(false);
    p.a.plants.setTexturesEnabled(false);p.b.plants.setTexturesEnabled(false);
    p.a.overview.setTexturesEnabled(false);p.b.overview.setTexturesEnabled(false);
    p.a.resources.setFoliageVisible(false);p.b.resources.setFoliageVisible(false);
    p.a.overview.setFoliageVisible(false);p.b.overview.setFoliageVisible(false);
    p.apply(t.send(true),true);
    const restoresA=[p.a.plants.prepareForCompile(),p.a.overview.prepareForCompile()];
    const restoresB=[p.b.plants.prepareForCompile(),p.b.overview.prepareForCompile()];
    w.resources.push({id:w.nextId++,kind:'wild-plant',species:'grass',x:18,z:10,amount:2,growth:1,growthTick:w.tick});
    p.apply(t.send());restoresA.forEach(r=>r());restoresB.forEach(r=>r());
    expect(state(p.b)).toStrictEqual(state(p.a));
    const copied=structuredClone(t.send());p.apply(copied,true,false,true);
    copied.resources[0]!.x=24;p.apply(copied,false,false,true);
  }finally{p.dispose();}
});

test('frame invalidated after actual Plant update uses complete C without an extra Nature read or ghost',()=>{
  for(const reread of [false,true]){
    const w=camp(),t=transport(w),p=pair();
    try{
      p.apply(t.send(),true);w.resources[0]!.x=18;w.resources[3]!.growth=.76;const c=t.send();
      p.a.immutableWorlds.add(c);p.b.immutableWorlds.add(c);
      const fa=p.a.index.adopt(c),fb=p.b.index.adopt(c);expect(readSceneResourceFrame(fb,c)).toBeDefined();
      let publicReads=0,sceneReads=0;
      const bNature=p.b.naturalPresentation as Candidate,br=bNature.read,bs=bNature.readScene;
      bNature.read=function(...args){publicReads++;return Reflect.apply(br,this,args);};
      bNature.readScene=function(...args){sceneReads++;return Reflect.apply(bs,this,args);};
      for(const o of [p.a,p.b]){const update=o.plants.update;
        o.plants.update=function(...args){Reflect.apply(update,this,args);
          if(reread)o.naturalPresentation.read(c,false,true);o.index.clear();};}
      Reflect.apply(dispatchA,p.a,[c,false,fa]);Reflect.apply(dispatchB,p.b,[c,false,fb]);
      expect(sceneReads).toBe(1);expect(publicReads).toBe(reread?1:0);
      expect(readSceneResourceFrame(fb,c)).toBeUndefined();
      expect([...p.b.naturalPresentation.changes]).toStrictEqual([...p.a.naturalPresentation.changes]);
      expect(state(p.b)).toStrictEqual(state(p.a));
    }finally{p.dispose();}
  }
});

test('own result discrimination tolerates inherited resources while preserving World extra changed',()=>{
  const w=camp(),t=transport(w),p=pair(),old=Object.getOwnPropertyDescriptor(Object.prototype,'resources');
  try{
    p.apply(t.send(),true);w.resources[0]!.x=19;const next=t.send();
    Object.defineProperty(Object.prototype,'resources',{value:[],writable:true,configurable:true,enumerable:false});
    p.apply(next); // Neither {changed:true} nor World fallback is misclassified.
  }finally{
    if(old)Object.defineProperty(Object.prototype,'resources',old);else Reflect.deleteProperty(Object.prototype,'resources');
    p.dispose();
  }
  const q=pair();try{Reflect.set(w,'changed',true);q.apply(t.send(true),true);w.resources.reverse();q.apply(t.send());}
  finally{q.dispose();}
});

test('mutable Core fallback keeps Nature then Plant then frame-check ordering and Proxy reads',()=>{
  const observed=(dispatch:Dispatch,nature:Nature)=>{
    const o=owner(nature),tape:string[]=[];let tracing=false;
    const raw=camp(),world=new Proxy(raw,{get(t,key,receiver){if(tracing)tape.push('world.get:'+String(key));return Reflect.get(t,key,receiver);}});
    const frame=o.value.index.adopt(world,true),read=nature.read,plant=o.value.plants.update;
    nature.read=function(...args){if(tracing)tape.push('Nature.read');return Reflect.apply(read,this,args);};
    o.value.plants.update=function(...args){if(tracing)tape.push('Plant.update');return Reflect.apply(plant,this,args);};
    try{tracing=true;Reflect.apply(dispatch,o.value,[world,true,frame]);tracing=false;return {tape,state:state(o.value),changes:[...nature.changes]};}
    finally{tracing=false;o.dispose();}
  };
  const a=observed(dispatchA,new Reference()),b=observed(dispatchB,new Candidate());
  expect(b).toStrictEqual(a);expect(a.tape.indexOf('Nature.read')).toBeLessThan(a.tape.indexOf('Plant.update'));
});
