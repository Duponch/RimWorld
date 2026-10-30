import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { AnimationDetail } from '../src/render/AnimationDetail';
import { NaturalAnimationCache,NaturalPhasePalette,NATURAL_PHASE_SAMPLES } from '../src/render/natural-animation-cache';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { PlantClusterLayer } from '../src/render/PlantClusterLayer';
import { GpuGroundGrassLayer } from '../src/render/GpuGroundGrassLayer';
import { PaintedWater } from '../src/render/PaintedWater';
import { createWorld } from '../src/sim/index';
import type { Job } from '../src/sim/types';

// Renderer-only cases below deliberately prepare projection records. They
// are not validated Engine Worlds, RAWs or Native/campaign authority. Pure
// cache/geometry assertions remain ordinary component contracts.
function camera(zoom=1):THREE.OrthographicCamera {
  const camera=new THREE.OrthographicCamera(-40,40,40,-40,.1,1000);
  camera.position.set(8,30,35);camera.lookAt(8,0,8);camera.zoom=zoom;camera.updateProjectionMatrix();return camera;
}
function snapshot(cache:NaturalAnimationCache):number[] {
  return [...cache.wind.value.toArray(),...cache.phaseA.value.toArray(),...cache.phaseB.value.toArray()];
}

test('middle coefficients and the complete wind vector publish together on each new confirmed tick and hold on pause',()=>{
  const detail=new AnimationDetail(),cache=new NaturalAnimationCache(),view=camera();
  detail.beginFrame(0,view,1440,120);expect(detail.classify(8,0,8)).toBe(1);
  expect(cache.capture(detail,1,0,.5,1,2)).toBe(true);const first=snapshot(cache);
  detail.beginFrame(16,view,1440,120.576); // real x6 progress: 36 ticks/s
  expect(cache.capture(detail,0,1,2,3,4)).toBe(true);expect(snapshot(cache)).not.toEqual(first);
  expect(cache.wind.value.toArray()).toEqual([0,1,2]);expect(cache.phaseA.value.x).toBeCloseTo(Math.sin(3));expect(cache.phaseB.value.y).toBeCloseTo(Math.cos(4));
  detail.beginFrame(90,view,1440,123.24);
  expect(cache.capture(detail,0,1,2,3,4)).toBe(true);
  expect(cache.wind.value.toArray()).toEqual([0,1,2]);
  expect(cache.phaseA.value.x).toBeCloseTo(Math.sin(3));expect(cache.phaseB.value.y).toBeCloseTo(Math.cos(4));
  const captured=snapshot(cache);
  for(const now of [110,200,400]){detail.beginFrame(now,view,1440,123.24);cache.capture(detail,1,0,0,5,6);expect(snapshot(cache)).toEqual(captured);}
});

test('missed middle deadlines do not replay captures, while rewind and reset at an identical tick replace old wind',()=>{
  const detail=new AnimationDetail(),cache=new NaturalAnimationCache(),view=camera();
  detail.beginFrame(0,view,1440,100);cache.capture(detail,1,0,1,1);
  detail.beginFrame(1000,view,1440,136);expect(cache.capture(detail,0,1,.2,2)).toBe(true);
  expect(cache.capture(detail,1,0,2,3)).toBe(false);
  detail.reset();detail.beginFrame(1001,view,1440,136);
  expect(cache.capture(detail,-1,0,1.5,4)).toBe(true);expect(cache.wind.value.x).toBe(-1);
  detail.beginFrame(900,view,1440,120);
  expect(cache.capture(detail,0,-1,.8,5)).toBe(true);expect(cache.wind.value.y).toBe(-1);
});

test('phase palette is bounded, periodic and preserves a sine/cosine pair through the repeat seam',()=>{
  const palette=new NaturalPhasePalette(),data=palette.map.image.data as Uint8Array;
  try {
    expect(data.byteLength).toBe(2048);expect(palette.map.image.width).toBe(NATURAL_PHASE_SAMPLES);
    expect(palette.map.type).toBe(THREE.UnsignedByteType);expect(palette.map.minFilter).toBe(THREE.LinearFilter);
    expect(palette.map.wrapS).toBe(THREE.RepeatWrapping);expect(palette.map.generateMipmaps).toBe(false);
    // Independent linear-sampler oracle, including negative and repeated phases.
    for(let i=-4097;i<=4097;i+=17){
      const phase=i*.017,x=((phase/(2*Math.PI)*NATURAL_PHASE_SAMPLES)%NATURAL_PHASE_SAMPLES+NATURAL_PHASE_SAMPLES)%NATURAL_PHASE_SAMPLES;
      const left=Math.floor(x),right=(left+1)%NATURAL_PHASE_SAMPLES,weight=x-left;
      for(const [channel,expected] of [[0,Math.sin(phase)],[1,Math.cos(phase)]] as const){
        const value=((data[left*4+channel]!*(1-weight)+data[right*4+channel]!*weight)/255)*2-1;
        expect(Math.abs(value-expected)).toBeLessThan(.0041);
      }
    }
  }finally{palette.dispose();}
});

test('grass and water share one immutable phase image and release it only after the last leaf',()=>{
  const detail=new AnimationDetail(),grass=new GpuGroundGrassLayer(undefined,Infinity,undefined,undefined,undefined,detail);
  const paint=new THREE.DataTexture(new Uint8Array([120,150,180,255]),1,1),water=new PaintedWater(paint,()=>{},detail);
  const map=grass['middlePalette']!.map;let disposed=0;map.addEventListener('dispose',()=>{disposed++;});
  expect(water['middlePalette']!.map).toBe(map);const version=map.version;
  const view=camera();
  for(let i=0;i<100;i++){detail.beginFrame(i*16,view,1440,i);grass.presentWind(i);water.present(i/6);}
  expect(map.version).toBe(version);
  grass.dispose();expect(disposed).toBe(0);water.dispose();expect(disposed).toBe(1);paint.dispose();
  const next=new NaturalPhasePalette();expect(next.map).not.toBe(map);next.dispose();next.dispose();
});

test('wind presentations hold resident colour, normals, geometry and coverage without mutating the World',()=>{
  const world=createWorld(331,16,16),detail=new AnimationDetail(),view=camera();
  world.resources=[{id:9001,kind:'tree',species:'oak',x:4,z:5,amount:30,growth:1},
    {id:9002,kind:'wild-plant',species:'grass',x:6,z:5,amount:1,growth:1}];
  const material=new THREE.MeshStandardNodeMaterial({vertexColors:true});material.userData.rendererOwned=true;
  const resources=new ResourceLayer(new THREE.Group(),material,material,detail),plants=new PlantClusterLayer(material,material,detail);
  const grass=new GpuGroundGrassLayer(undefined,Infinity,undefined,undefined,undefined,detail);
  try {
    resources.update(world,true);plants.update(world,true);grass.update(world,true);
    const meshes:THREE.Mesh[]=[];resources.group.traverse(object=>{if(object instanceof THREE.Mesh)meshes.push(object);});
    meshes.push(plants.group.children[0] as THREE.Mesh,grass.mesh);
    const streams=()=>meshes.map(mesh=>Object.entries(mesh.geometry.attributes).map(([name,attribute])=>[name,Array.from(attribute.array),('version' in attribute)?attribute.version:undefined]));
    const original=streams(),raw=JSON.stringify(world),coverage=Array.from(grass.map.image.data as Uint8Array),version=grass.map.version;
    for(let i=0;i<30;i++){
      detail.beginFrame(i*16,view,1440,36*i*.016);
      for(const leaf of [resources,plants,grass]){leaf.setWind(i/20,1,i/10);leaf.presentWind(detail.frameTick);}
    }
    expect(streams()).toEqual(original);expect(Array.from(grass.map.image.data as Uint8Array)).toEqual(coverage);
    expect(grass.map.version).toBe(version);expect(JSON.stringify(world)).toBe(raw);
    const caches=[resources['middleWind'],plants['middleWind'],grass['middleWind']];
    expect(caches[0]!.wind.value.toArray()).toEqual(caches[1]!.wind.value.toArray());
    expect(caches[1]!.wind.value.toArray()).toEqual(caches[2]!.wind.value.toArray());
  }finally{resources.dispose();plants.dispose();grass.dispose();material.dispose();}
});

test('water retains the complete legacy integration through weather changes, pause and load with live middle phases',()=>{
  const paint=new THREE.DataTexture(new Uint8Array([120,150,180,255]),1,1),detail=new AnimationDetail(),view=camera();
  const full=new PaintedWater(paint,()=>{}),lod=new PaintedWater(paint,()=>{},detail);
  try {
    for(const [index,seconds] of [10,10.02,10.04,10.12,10.12,11,8].entries()){
      const strength=index%2?2:.5;
      detail.beginFrame(index*20,view,1440,seconds*6);
      for(const water of [full,lod]){water.setWind(strength,index%2,1);water.present(seconds);}
      expect(lod['time'].value).toBe(full['time'].value);expect(lod['ripplePhase'].value).toBe(full['ripplePhase'].value);
      if(index===0){const first=snapshot(lod['middleWater']);
        detail.beginFrame(1,view,1440,60.006);lod.setWind(2,1,0);lod.present(10.001);
        expect(snapshot(lod['middleWater'])).not.toEqual(first);
        expect(lod['middleWater'].wind.value.toArray()).toEqual([1,0,2]);
        expect(lod['middleWater'].phaseA.value.x).toBeCloseTo(Math.sin(lod['time'].value),10);
        expect(lod['middleWater'].phaseB.value.y).toBeCloseTo(Math.cos(lod['ripplePhase'].value),10);
        // Bring the legacy integrator through that same real input as well.
        full.setWind(2,1,0);full.present(10.001);
      }
    }
    const held=snapshot(lod['middleWater']);lod.reset();full.reset();detail.reset();detail.beginFrame(150,view,1440,48);
    for(const water of [full,lod]){water.setWind(.3,-1,0);water.present(8);}
    expect(snapshot(lod['middleWater'])).not.toEqual(held);expect(lod['time'].value).toBe(full['time'].value);
  }finally{full.dispose();lod.dispose();paint.dispose();}
});

function treeStreams(group:THREE.Group):{positions:number[][];versions:number[]} {
  const positions:number[][]=[],versions:number[]=[];
  group.traverse(object=>{if(object instanceof THREE.Mesh&&object.geometry.hasAttribute('windRoot')){
    const position=object.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.push(Array.from(position.array));versions.push(position.version);
  }});return {positions,versions};
}
test('tree recoil follows current middle time, pauses without upload and returns to rest once on entry into far',()=>{
  const world=createWorld(332,20,20),pawn=world.pawns[0]!,detail=new AnimationDetail(),view=camera();
  world.resources=[{id:9001,kind:'tree',species:'oak',x:8,z:8,amount:30,growth:1}];
  pawn.x=7;pawn.z=8;pawn.state='working';pawn.jobId=9100;
  const job:Job={id:9100,kind:'chop',x:8,z:8,orientation:0,footprint:'standard',status:'active',reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0}};
  world.jobs=[job];const phase=pawn.id*1.7-1.5*Math.PI;
  let crossing=2;while(Math.floor((11*crossing/6+phase)/(2*Math.PI))<=Math.floor((11*(crossing-1)/6+phase)/(2*Math.PI)))crossing++;
  world.tick=crossing-1;
  const material=new THREE.MeshStandardNodeMaterial({vertexColors:true});material.userData.rendererOwned=true;
  const layer=new ResourceLayer(new THREE.Group(),material,material,detail);
  try {
    layer.update(world,true);const rest=treeStreams(layer.group).positions;
    const next=structuredClone(world);next.tick++;next.jobs[0]!.progress=1;layer.adoptChopWork(world,next);
    const contact=(Math.floor((11*next.tick/6+phase)/(2*Math.PI))*2*Math.PI-phase)/11;
    const present=(now:number,age:number)=>{detail.beginFrame(now,view,1440,(contact+age)*6);layer.presentChop(contact+age);};
    present(0,.09);const first=treeStreams(layer.group);expect(first.positions).not.toEqual(rest);
    present(16,.12);const continuous=treeStreams(layer.group);expect(continuous.positions).not.toEqual(first.positions);
    expect(continuous.versions.some((version,index)=>version>first.versions[index]!)).toBe(true);
    present(32,.12);expect(treeStreams(layer.group)).toEqual(continuous);
    present(90,.18);expect(treeStreams(layer.group).positions).not.toEqual(first.positions);
    view.zoom=.2;view.updateProjectionMatrix();present(100,.2);
    const far=treeStreams(layer.group);expect(far.positions).toEqual(rest);
    present(116,.23);expect(treeStreams(layer.group)).toEqual(far);
  }finally{layer.dispose();material.dispose();}
});

test('plant capacity growth preserves old bases and subsequent wind never uploads the expanded field',()=>{
  const world=createWorld(333,20,20),detail=new AnimationDetail(),material=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  const plants=new PlantClusterLayer(material,material,detail);
  world.resources=Array.from({length:2},(_,i)=>({id:9000+i,kind:'wild-plant' as const,species:'grass' as const,x:i,z:5,amount:1,growth:1}));
  try {
    plants.update(world,true);const first=plants.group.children[0] as THREE.InstancedMesh;
    const oldBasis=Array.from(first.geometry.getAttribute('windBasis').array).slice(0,8);
    for(let i=2;i<140;i++)world.resources.push({id:9000+i,kind:'wild-plant',species:'grass',x:i%20,z:Math.floor(i/20),amount:1,growth:1});
    plants.update(world,false);const expanded=plants.group.children[0] as THREE.InstancedMesh;
    expect(expanded).not.toBe(first);expect(Array.from(expanded.geometry.getAttribute('windBasis').array).slice(0,8)).toEqual(oldBasis);
    const basis=expanded.geometry.getAttribute('windBasis') as THREE.BufferAttribute,version=basis.version;
    detail.beginFrame(0,camera(),1440,10);plants.setWind(1,0,1);plants.presentWind(10);
    expect(basis.version).toBe(version);expect(expanded.count).toBe(140);
  }finally{plants.dispose();material.dispose();}
});
