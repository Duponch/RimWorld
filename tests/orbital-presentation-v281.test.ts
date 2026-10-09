import { expect,test } from 'vitest';
import { Matrix4 } from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import { orbitalParts } from '../src/render/orbital-parts';
import { OrbitalDeliveryLayer,ORBITAL_CAPSULE_PARTS } from '../src/render/OrbitalDeliveryLayer';
import { pawnWorkPose } from '../src/render/work-presentation';
import type { Structure } from '../src/sim/types';

function fixture(){
  const world=createWorld(281,32,32);
  const console:Structure={id:world.nextId++,kind:'comms-console',x:12,z:12,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  const beacon:Structure={id:world.nextId++,kind:'orbital-beacon',x:7,z:7,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  world.structures=[console,beacon];
  world.orbital={profile:'orbital-v1',adoptedAt:world.tick,rng:1,cycleStart:world.tick,scheduledAt:world.tick+100,nextCheckAt:world.tick+100,ships:[],pending:[]};
  return {world,console,beacon};
}

test('machines rotate around their actual anchor and power never rebuilds their authored shape',()=>{
  const {world,console,beacon}=fixture();world.structures=[console];const base=orbitalParts(world);
  expect(base.every(p=>Math.abs(p.x-console.x)+(p.sx??1)/2<=1.5&&p.z-console.z-(p.sz??1)/2>=-.5&&p.z-console.z+(p.sz??1)/2<=1.5)).toBe(true);
  console.orientation=1;const rotated=orbitalParts(world);expect(rotated).toHaveLength(base.length);
  for(let i=0;i<base.length;i++){
    expect(rotated[i]!.x-console.x).toBeCloseTo(base[i]!.z-console.z);
    expect(rotated[i]!.z-console.z).toBeCloseTo(-(base[i]!.x-console.x));
  }
  console.power!.on=false;expect(orbitalParts(world)).toEqual(rotated);
  world.structures=[beacon];expect(orbitalParts(world)).not.toEqual(base);
});

test('delivery uses persisted times and destinations, shares the clock and retains obstructed cargo visually',()=>{
  const {world}=fixture(),layer=new OrbitalDeliveryLayer();
  world.orbital!.pending=[{id:world.nextId++,shipId:999,negotiatorId:world.pawns[0]!.id,cell:{x:8,z:9},createdAt:world.tick,landAt:world.tick+6,openAt:world.tick+10}];
  const before=structuredClone(world);
  try{
    layer.adopt(world);expect(layer.mesh.activeCount).toBe(ORBITAL_CAPSULE_PARTS);
    const matrix=new Matrix4();layer.mesh.getMatrixAt(0,matrix);expect(matrix.elements[12]).toBe(8);expect(matrix.elements[14]).toBe(9);
    const times=layer.mesh.geometry.getAttribute('orbitalTimes');expect(times.getX(0)).toBe(world.tick);expect(times.getY(0)).toBe(world.tick+6);expect(times.getZ(0)).toBe(world.tick+10);
    const version=layer.mesh.instanceMatrix.version;layer.present(world.tick+30);layer.adopt(world);
    expect(layer.tick.value).toBe(world.tick+30);expect(layer.mesh.instanceMatrix.version).toBe(version);expect(layer.mesh.activeCount).toBe(ORBITAL_CAPSULE_PARTS);expect(world).toEqual(before);
    world.orbital!.pending=[];layer.adopt(world);expect(layer.mesh.activeCount).toBe(0);
  }finally{layer.dispose();}
});

test('compile preparation restores an empty batch but preserves a newer adopted delivery',()=>{
  const {world}=fixture(),layer=new OrbitalDeliveryLayer();
  try{
    const restoreEmpty=layer.prepareForCompile();expect(layer.mesh.activeCount).toBe(1);restoreEmpty();expect(layer.mesh.activeCount).toBe(0);
    const restore=layer.prepareForCompile();
    world.orbital!.pending=[{id:world.nextId++,shipId:999,negotiatorId:world.pawns[0]!.id,cell:{x:5,z:6},createdAt:world.tick,landAt:world.tick+6,openAt:world.tick+10}];
    layer.adopt(world);restore();expect(layer.mesh.activeCount).toBe(ORBITAL_CAPSULE_PARTS);expect(layer.mesh.visible).toBe(true);
    const painted=layer.mesh.material;layer.setTexturesEnabled(false);expect(layer.mesh.material).not.toBe(painted);layer.setTexturesEnabled(true);expect(layer.mesh.material).toBe(painted);
  }finally{layer.dispose();}
});

test('console approach and basket contact invent no working animation',()=>{
  const {world,console}=fixture(),p=world.pawns[0]!;
  p.orbitalTrade={shipId:999,consoleId:console.id,spot:{x:12,z:14},phase:'approach',startedAt:world.tick};
  p.state='moving';expect(pawnWorkPose(p,undefined,'comms-console')).toBe(0);
  p.orbitalTrade.phase='ready';p.state='idle';expect(pawnWorkPose(p,undefined,'comms-console')).toBe(0);
});
