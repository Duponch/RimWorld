import {expect,test,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {WildlifeLayer} from '../src/render/WildlifeLayer';
import {createWorld} from '../src/sim/index';
import {adultAgeTicks} from '../src/sim/animal-life';
import type {WildAnimal} from '../src/sim/wildlife-state';
import type {AutoSlaughterConfig} from '../src/sim/auto-slaughter-state';

const policy:AutoSlaughterConfig={species:'hare',maxTotal:1,maxMales:-1,maxMalesYoung:-1,maxFemales:-1,maxFemalesYoung:-1,allowPregnant:false};
function fixture(){
  const w=createWorld(90,16,16);w.resources=[];w.jobs=[];
  const animal=(age:number,x:number):WildAnimal=>({id:w.nextId++,species:'hare',sex:'female',ageTicks:adultAgeTicks('hare')+age,
    x,z:4,food:.15,rest:.8,state:'moving',path:[],nextDecision:100,
    domestic:{since:0,care:'none',tameness:5,nextDecay:45000},motion:{from:{x:x-1,z:4},to:{x,z:4},start:0,end:2}});
  const oldest=animal(100,7),younger=animal(10,10);
  w.wildlife={profile:'temperate-hares-v1',rng:1,animals:[younger,oldest],eatenItems:0,eatenPlants:0,eatenNutrition:0};
  w.autoSlaughter=[{...policy}];return {w,oldest,younger};
}
function renderer(){
  const errors:string[]=[],log=vi.spyOn(console,'error').mockImplementation(message=>errors.push(String(message)));
  let layer:WildlifeLayer;
  try {layer=new WildlifeLayer();} finally {log.mockRestore();}
  expect(errors).toEqual([]);return layer;
}
function marker(layer:WildlifeLayer){
  return layer.mesh.children.find(m=>m.name.startsWith('Domestic slaughter')&&(m as THREE.Mesh<THREE.InstancedBufferGeometry>).geometry.instanceCount===2) as THREE.Mesh<THREE.InstancedBufferGeometry>;
}

test('quota marker follows only the elected original animal, without changing its manual designation or uploading each frame',()=>{
  const {w}=fixture(),before=structuredClone(w),layer=renderer();
  try{
    layer.update(w,undefined,true);
    const m=marker(layer),body=layer.mesh.children.find(m=>m.name==='Wild hare — GPU rig') as THREE.Mesh<THREE.InstancedBufferGeometry>;
    expect(m.visible).toBe(true);
    const flags=m.geometry.getAttribute('aSlaughter') as THREE.InstancedBufferAttribute;
    expect([flags.getX(0),flags.getX(1)]).toEqual([0,1]);
    for(const name of ['aFrom','aTo','aTravel','aScale'])expect(m.geometry.getAttribute(name)).toBe(body.geometry.getAttribute(name));
    const version=flags.version;
    for(let i=0;i<5;i++)layer.update(w,undefined,false);
    expect(flags.version).toBe(version);expect(w).toEqual(before);
  }finally{layer.dispose();}
});

test('same-tick quota changes remove only automatic markers and preserve an independent manual instruction',()=>{
  const {w,younger}=fixture(),layer=renderer();younger.domestic!.slaughter=true;
  try{
    layer.update(w,undefined,true);const m=marker(layer),flags=m.geometry.getAttribute('aSlaughter');
    expect([flags.getX(0),flags.getX(1)]).toEqual([1,1]);
    const revoked=structuredClone(w);delete revoked.autoSlaughter;
    layer.update(revoked,undefined);expect(m.visible).toBe(true);
    expect([flags.getX(0),flags.getX(1)]).toEqual([1,0]);
    const manualCancelled=structuredClone(revoked);delete manualCancelled.wildlife!.animals[0]!.domestic!.slaughter;
    layer.update(manualCancelled,undefined);expect(m.visible).toBe(false);
  }finally{layer.dispose();}
});

test('a confirmed death satisfies the quota without electing a replacement among the survivors',()=>{
  const {w,oldest}=fixture(),layer=renderer();
  try{
    layer.update(w,undefined,true);const m=marker(layer);
    const killed=structuredClone(w);killed.wildlife!.animals=killed.wildlife!.animals.filter(a=>a.id!==oldest.id);
    layer.update(killed,undefined);expect(m.visible).toBe(false);
    expect(m.geometry.instanceCount).toBe(1);expect(m.geometry.getAttribute('aSlaughter').getX(0)).toBe(0);
  }finally{layer.dispose();}
});
