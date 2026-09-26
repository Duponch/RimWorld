import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { DoorLayer } from '../src/render/DoorLayer';
import { DOOR_LEAF_BOTTOM, doorLeafTop, doorParts, doorSurroundMaterial } from '../src/render/door-parts';
import { TimberCladdingLayer } from '../src/render/TimberCladdingLayer';
import { createWorld } from '../src/sim/index';
import { newDoorState } from '../src/sim/door-rules';
import type { Structure, World } from '../src/sim/types';
import { WORLD_SCALE } from '../src/world/scale';

function doorway(axis:0|1,material:Structure['material']='wood'):World {
  const world=createWorld(42,16,16);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.structures=[];world.jobs=[];
  const door:Structure={id:world.nextId++,kind:'door',material,x:8,z:8,orientation:0,footprint:'standard',door:newDoorState(world.tick)};
  world.structures.push(door);
  for(const side of [-1,1])world.structures.push({id:world.nextId++,kind:'wall',material,x:8+(axis===0?side:0),z:8+(axis===1?side:0),orientation:0,footprint:'standard'});
  return world;
}

test('a lower door and recessed leaves fit a full-height wall in both axes',()=>{
  expect(doorLeafTop(false)).toBe(WORLD_SCALE.futureDoorClearance);
  for(const axis of [0,1] as const)for(const material of ['wood','steel','granite-blocks'] as const) {
    const world=doorway(axis,material),parts=doorParts(world,false),leaves=new DoorLayer();
    leaves.update(world,false);
    expect(parts).toHaveLength(material==='wood'?6:5);
    const [panel,cap,lintel,left,right]=material==='wood'?[undefined,undefined,parts[0],parts[1],parts[2]]:parts;
    if(panel&&cap){
      expect(panel.y+panel.sy!/2).toBeGreaterThanOrEqual(cap.y-cap.sy!/2);
      expect(cap.y+cap.sy!/2).toBeCloseTo(WORLD_SCALE.wallHeight);
      expect(panel.sz).toBe(.96);
      expect(panel.color).toBeDefined();
    }
    expect(lintel!.y-lintel!.sy!/2).toBeCloseTo(WORLD_SCALE.futureDoorClearance);
    expect(left!.y+left!.sy!/2).toBeCloseTo(WORLD_SCALE.futureDoorClearance);
    expect(right!.y+right!.sy!/2).toBeCloseTo(WORLD_SCALE.futureDoorClearance);
    expect(lintel!.color).toBeDefined();
    for(let i=0;i<2;i++) {
      const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
      leaves.mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
      expect(position.y+scale.y/2).toBeCloseTo(WORLD_SCALE.futureDoorClearance);
      expect(position.y-scale.y/2).toBeCloseTo(DOOR_LEAF_BOTTOM);
      expect(scale.z).toBeCloseTo(.14);
      expect(lintel!.sz).toBe(material==='wood'?.09:.34);
      expect(axis===0?position.z:position.x).toBeCloseTo(8);
    }
    leaves.dispose();
  }
});

test('cutaway clips door and frame to wall height; transitions keep retained leaf geometry',()=>{
  const world=doorway(1),parts=doorParts(world,true),leaves=new DoorLayer();
  expect(parts).toHaveLength(6);
  expect(doorLeafTop(true)).toBeCloseTo(WORLD_SCALE.wallCutawayHeight-.14);
  expect(parts.every(part=>part.y+part.sy!/2<=WORLD_SCALE.wallCutawayHeight+1e-6)).toBe(true);
  leaves.update(world,true);
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  leaves.mesh.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);
  expect(position.y+scale.y/2).toBeCloseTo(doorLeafTop(true));
  const geometry=leaves.mesh.geometry,instances=leaves.mesh.instanceMatrix,version=instances.version;
  const door=world.structures[0]!;
  door.door!.open=true;door.door!.changedAt=world.tick+1;
  leaves.update(world,true);
  expect(leaves.mesh.geometry).toBe(geometry);expect(leaves.mesh.instanceMatrix).toBe(instances);
  expect(geometry.getAttribute('doorCurrent').getZ(0)).toBeGreaterThan(0);
  expect(geometry.getAttribute('doorPrevious').getZ(0)).toBeLessThan(0);
  leaves.update(world,true);expect(instances.version).toBeGreaterThan(version);
  const stable=instances.version;world.tick++;leaves.update(world,true);expect(instances.version).toBe(stable);
  leaves.dispose();
});

test('a steel door in a wooden house receives a timber lintel rather than a full-height steel column',()=>{
  const world=doorway(0,'wood');
  world.structures[0]!.material='steel';
  expect(doorSurroundMaterial(world,8,8,0)).toBe('wood');
  const parts=doorParts(world,false),timber=new TimberCladdingLayer(),leaves=new DoorLayer();
  timber.update(world,false);leaves.update(world,false);
  expect(parts).toHaveLength(6);
  expect(parts.every(part=>part.y+part.sy!/2<=doorLeafTop(false)+.11+1e-6)).toBe(true);
  expect(timber.wallMesh.count).toBe(3);
  expect(timber.eaveMesh.count).toBeGreaterThan(0);
  expect(leaves.mesh.activeCount).toBe(2);
  timber.dispose();leaves.dispose();
});
