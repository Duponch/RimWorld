import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation.ts';
import {appendFlora,BLIGHT_COLOR,floraColor,floraIdentity,type FloraParts} from '../src/render/flora-presentation.ts';
import {CropLayer} from '../src/render/CropLayer.ts';
import * as THREE from 'three/webgpu';
import {plantInspection} from '../src/ui/plant-inspection.ts';
import {applyCommand,createWorld} from '../src/sim/engine.ts';
import {infectCrop} from '../src/sim/plant-blight.ts';
import type {Resource} from '../src/sim/types.ts';

function fixture(kind:'healroot'|'rice'='healroot'){
  const w=createWorld(270,32,32);w.tiles=w.tiles.map(()=>({terrain:'soil'}));w.resources=[];
  const p:Resource={id:w.nextId++,kind,x:5,z:5,amount:kind==='healroot'?1:6,growth:.5,growthTick:w.tick};w.resources=[p];
  return {w,p};
}

test('medicinal infection dirties resident natural geometry through a confirmed delta and skipped publication',()=>{
  const {w,p}=fixture(),encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),scene=new NaturalResourcePresentation();
  const accept=()=>{const result=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Rejected');return result.world;};
  const a=accept();scene.read(a,true,true);const old=structuredClone(a);
  expect(infectCrop(w,p,72)).toBe(true);accept();
  p.blight!.severity+=1/30;const c=accept();
  expect(scene.read(c,false,true)).toBeDefined();expect(scene.changes.get(p.id)?.resource).toBe(c.resources[0]);
  expect(floraIdentity(c,c.resources[0]!)).toContain(':blight');expect(floraColor(c.resources[0]!)).toBe(BLIGHT_COLOR);
  expect(a).toEqual(old);expect(a.resources[0]!.blight).toBeUndefined();
  const parts:FloraParts={trunks:[],crowns:[],cones:[],bushes:[],blades:[],cacti:[],fruit:[]};appendFlora(parts,c,c.resources[0]!,0);
  expect(parts.bushes.filter(b=>b.color===BLIGHT_COLOR).length).toBe(4);
  // Gravity alone is inspection state; the same diseased silhouette stays resident.
  p.blight!.severity+=1/30;expect(scene.read(accept(),false,true)).toBeUndefined();
});

test('all four resident crop batches tint infected plants on their ordinary update',()=>{
  for(const kind of ['rice','potato','corn','cotton'] as const){
    const {w,p}=fixture('rice');p.kind=kind;
    const material=new THREE.MeshBasicNodeMaterial(),layer=new CropLayer(material);
    try{
      layer.update(w,true);const mesh=layer.group.children.find(m=>(m as THREE.InstancedMesh).count)! as THREE.InstancedMesh;
      const before=new THREE.Color();mesh.getColorAt(0,before);expect(before.getHex()).not.toBe(BLIGHT_COLOR);
      expect(infectCrop(w,p,4)).toBe(true);layer.update(w,false);
      const after=new THREE.Color();mesh.getColorAt(0,after);expect(after.getHex()).toBe(BLIGHT_COLOR);
    }finally{layer.dispose();material.dispose();}
  }
});

test('inspection explains frozen growth, contagion and no harvest; global command only creates real work',()=>{
  const {w,p}=fixture();expect(infectCrop(w,p,87)).toBe(true);
  expect(plantInspection(w,p)).toContain('Fléau des cultures');expect(plantInspection(w,p)).toContain('Récolte impossible');
  const healthy:Resource={...p,id:w.nextId++,x:7};delete healthy.blight;w.resources.push(healthy);
  const rng=w.rng;expect(applyCommand(w,{type:'cut-blighted-crops'})).toMatchObject({ok:true,affected:1});
  expect(w.resources).toHaveLength(2);expect(p.blight).toBeDefined();expect(w.rng).toBe(rng);
  expect(w.jobs.filter(j=>j.kind==='cut')).toMatchObject([{x:p.x,z:p.z,reservedBy:null}]);
  expect(applyCommand(w,{type:'cut-blighted-crops'}).ok).toBe(false);
});

test('global cut rejects unknown fields and exhausted identities without partial jobs',()=>{
  const {w,p}=fixture();infectCrop(w,p,1);
  expect(applyCommand(w,{type:'cut-blighted-crops',instant:true} as never).ok).toBe(false);expect(w.jobs).toHaveLength(0);
  w.nextId=Number.MAX_SAFE_INTEGER;
  expect(applyCommand(w,{type:'cut-blighted-crops'}).ok).toBe(false);expect(w.jobs).toHaveLength(0);expect(p.blight).toBeDefined();
});
