import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {ProjectileLayer} from '../src/render/ProjectileLayer';
import {createBulletFlight} from '../src/sim/bullet-flight';
import {registerWorldProjectile} from '../src/sim/projectile-system';
import {CORE_TICKS_PER_LOCAL,revolverProfile} from '../src/sim/ranged-statistics';
import {serializeWorld,deserializeWorld,stepWorld,validateWorld} from '../src/sim/index';
import {TICKS_PER_SECOND} from '../src/sim/types';
import {medicalCamp} from './scenarios/health';

const streams=['bulletFrom','bulletTo','bulletTime','bulletColor'] as const;
function camera(pixels=16):THREE.OrthographicCamera {
  const camera=new THREE.OrthographicCamera(-24,24,8,-8,.1,1000);
  camera.position.set(15,50,10.03125);camera.up.set(0,0,-1);camera.lookAt(15,0,10.03125);
  camera.zoom=pixels/16;camera.updateProjectionMatrix();return camera;
}
function flight(){
  const world=medicalCamp(2);Object.assign(world.pawns[0]!,{x:5,z:10});Object.assign(world.pawns[1]!,{x:25,z:10});
  expect(validateWorld(world)).toEqual([]);
  const projectile=registerWorldProjectile(world,createBulletFlight({origin:{x:5.5,z:10.5},destination:{x:25.5,z:10.5},launcherKey:`pawn:${world.pawns[0]!.id}`,equipmentKey:null,intendedKey:`pawn:${world.pawns[1]!.id}`,usedKey:`pawn:${world.pawns[1]!.id}`,flags:7,preventFriendlyFire:false,speedPerCoreTick:revolverProfile('normal').projectileTilesPerCoreTick}),'normal',{friendlyPawnIds:world.pawns.map(p=>p.id),friendlyFireFactor:.4});
  expect(projectile.flight.remainingCoreTicks).toBe(37);expect(validateWorld(world)).toEqual([]);
  const raw=serializeWorld(world);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
  return {world,projectile,raw,start:projectile.emittedAtCore/CORE_TICKS_PER_LOCAL};
}
function streamState(layer:ProjectileLayer){
  const geometry=layer.mesh.geometry;
  return streams.map(name=>{const attribute=geometry.getAttribute(name) as THREE.InstancedBufferAttribute;return{name,attribute,version:attribute.version,values:Array.from(attribute.array)};});
}
function sameStreams(layer:ProjectileLayer,before:ReturnType<typeof streamState>){
  const geometry=layer.mesh.geometry;
  for(const row of before){const attribute=geometry.getAttribute(row.name) as THREE.InstancedBufferAttribute;expect(attribute).toBe(row.attribute);expect(attribute.version).toBe(row.version);expect(Array.from(attribute.array)).toEqual(row.values);}
}

test('confirmed projectile time stays live between middle publications while flight streams and Whole stay unchanged',()=>{
  const {world,raw,start}=flight(),detail=new AnimationDetail(),layer=new ProjectileLayer(detail),view=camera();
  const geometry=layer.mesh.geometry as THREE.InstancedBufferGeometry,material=layer.mesh.material;
  const frame=(ms:number,tick:number)=>{detail.beginFrame(ms,view,256,tick);expect(detail.classify(15,1.12,10)).toBe(1);layer.present(tick);};
  try{
    layer.adopt(world,true);frame(0,start);expect(geometry.instanceCount).toBe(1);expect(layer.mesh.visible).toBe(true);
    const before=streamState(layer),clock=layer.tick.value;
    for(const ms of [20,40]){
      const tick=start+ms*6*TICKS_PER_SECOND/1000;frame(ms,tick);
      expect(layer.tick.value-clock).toBeCloseTo(tick-start,10);expect(geometry.instanceCount).toBe(1);expect(layer.mesh.visible).toBe(true);
      expect(layer.mesh.geometry).toBe(geometry);expect(layer.mesh.material).toBe(material);sameStreams(layer,before);expect(serializeWorld(world)).toBe(raw);
    }
    const pausedClock=layer.tick.value;frame(60,start+40*6*TICKS_PER_SECOND/1000);expect(layer.tick.value).toBe(pausedClock);sameStreams(layer,before);
    // A fresh authentic Full of exactly the same flight does not invent an upload.
    const loaded=deserializeWorld(raw);layer.adopt(loaded);frame(61,start+40*6*TICKS_PER_SECOND/1000);sameStreams(layer,before);
    expect(serializeWorld(loaded)).toBe(raw);expect(serializeWorld(world)).toBe(raw);
  }finally{layer.dispose();}
});

test('confirmed projectile birth, far readmission and exact arrival do not wait for a middle publication',()=>{
  const {world,projectile,raw,start}=flight(),detail=new AnimationDetail(),layer=new ProjectileLayer(detail),middle=camera(),far=camera(5);
  const geometry=layer.mesh.geometry as THREE.InstancedBufferGeometry;
  const frame=(ms:number,tick:number,view=middle)=>{detail.beginFrame(ms,view,256,tick);layer.present(tick);};
  try{
    layer.adopt(world,true);frame(0,start-.001);expect(geometry.instanceCount).toBe(0);expect(layer.mesh.visible).toBe(false);
    frame(10,start+.1);expect(detail.classify(15,1.12,10)).toBe(1);expect(geometry.instanceCount).toBe(1);expect(layer.mesh.visible).toBe(true);
    frame(20,start+.1,far);expect(detail.classify(15,1.12,10)).toBe(2);expect(geometry.instanceCount).toBe(0);expect(layer.mesh.visible).toBe(false);
    frame(21,start+.1);expect(detail.classify(15,1.12,10)).toBe(1);expect(geometry.instanceCount).toBe(1);expect(layer.mesh.visible).toBe(true);
    // Only genuine Engine steps establish the physical arrival and terminal export.
    const played=deserializeWorld(raw);stepWorld(played,4);expect(validateWorld(played)).toEqual([]);
    const arrived=played.projectiles?.find(p=>p.id===projectile.id);expect(arrived?.arrival).toBeTruthy();expect(arrived!.advancedAtCore-projectile.emittedAtCore).toBe(37);
    const terminal=serializeWorld(played),end=arrived!.advancedAtCore/CORE_TICKS_PER_LOCAL;layer.adopt(played);
    frame(80,end-.0001);expect(geometry.instanceCount).toBe(1);expect(layer.mesh.visible).toBe(true);
    // Both times remain before the next 83.33ms publication; expiry is immediate.
    frame(80.1,end);expect(geometry.instanceCount).toBe(0);expect(layer.mesh.visible).toBe(false);
    expect(serializeWorld(world)).toBe(raw);expect(serializeWorld(played)).toBe(terminal);expect(serializeWorld(deserializeWorld(terminal))).toBe(terminal);
  }finally{layer.dispose();}
});
