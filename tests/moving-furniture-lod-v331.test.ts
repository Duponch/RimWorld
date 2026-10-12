import { expect,test } from 'vitest';
import { Group,OrthographicCamera } from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { newDoorState } from '../src/sim/door-rules';
import { AnimationDetail } from '../src/render/AnimationDetail';
import { DoorLayer } from '../src/render/DoorLayer';
import { WindLayer } from '../src/render/WindLayer';
import { PodRescueLayer } from '../src/render/PodRescueLayer';
import { MiniTurretLayer } from '../src/render/MiniTurretLayer';
import { BoxBatches } from '../src/render/BoxBatches';
import { campTurret,miniTurretCamp } from './scenarios/mini-turret-v212';

const setup=(pixels:number)=>{
  const detail=new AnimationDetail(),camera=new OrthographicCamera(-50,50,50,-50,.1,1000);
  camera.position.set(0,100,100);camera.lookAt(0,0,0);camera.zoom=pixels/10;camera.updateProjectionMatrix();
  return {detail,camera,frame:(now:number,tick:number)=>detail.beginFrame(now,camera,1000,tick)};
};

test('far door retains leaf amount across actual reversals; return medium adopts the current segment',()=>{
  const world=createWorld(331,16,16),f=setup(4),layer=new DoorLayer(undefined,f.detail);
  world.structures=[{id:world.nextId++,kind:'door',material:'wood',x:8,z:8,orientation:0,footprint:'standard',door:newDoorState(0)}];
  const door=world.structures[0]!;door.door={...door.door!,open:true,changedAt:100,from:0};
  layer.update(world,false,true);f.frame(0,102);layer.present(102);
  const held=layer['animation'].owners[0]!.values[0];expect(held).toBeGreaterThan(0);expect(held).toBeLessThan(1);
  const geometry=layer.mesh.geometry;
  door.door={...door.door!,open:false,changedAt:104,from:.8};layer.update(world,false);
  f.frame(2000,110);layer.present(110);expect(layer['animation'].owners[0]!.values[0]).toBe(held);
  f.camera.zoom=1.6;f.camera.updateProjectionMatrix();f.frame(2001,110);layer.present(110);
  expect(layer['animation'].owners[0]!.values[0]).toBeLessThan(held);expect(layer.mesh.geometry).toBe(geometry);layer.dispose();
});

test('far turbine retains angle through power adoption and emits no periodic palette upload',()=>{
  const world=createWorld(332,16,16),f=setup(4),layer=new WindLayer(undefined,f.detail);
  world.structures=[{id:world.nextId++,kind:'wind-turbine',material:'steel',x:8,z:8,orientation:0,footprint:'standard',power:{on:true,parentId:null},wind:{cachedWatts:2000,autoCut:false,updateCounter:0}} as WorldStructure];
  layer.adopt(world,true);f.frame(0,100);layer.present(100);
  const held=layer['animation'].owners.map(owner=>Array.from(owner.values)),before=JSON.stringify(world);
  f.frame(1000,200);layer.present(200);expect(layer['animation'].owners.map(owner=>Array.from(owner.values))).toEqual(held);expect(JSON.stringify(world)).toBe(before);
  world.structures[0]!.power!.on=false;layer.adopt(world);f.frame(2000,300);layer.present(300);
  expect(layer['animation'].owners.map(owner=>Array.from(owner.values))).toEqual(held);
  world.structures=[];layer.adopt(world);expect(layer.mesh.activeCount).toBe(0);expect(layer['animation'].owners).toHaveLength(0);layer.dispose();
});
type WorldStructure=ReturnType<typeof createWorld>['structures'][number];

test('capsule lifecycle retires a held far pose on the confirmed actual opening',()=>{
  const world=createWorld(333,32,32),f=setup(4),layer=new PodRescueLayer(undefined,f.detail);
  world.podRescues={profile:'civilian-pod-rescue-v1',serial:1,incidents:[],departed:[],pending:{id:1,start:10,landAt:16,openAt:20,cell:{x:12,z:9},seed:4871}};
  layer.adopt(world);f.frame(0,12);layer.present(12);const fall=layer['animation'].owners[0]!.values[1];
  f.frame(1000,18);layer.present(18);expect(layer['animation'].owners[0]!.values[1]).toBe(fall);
  delete world.podRescues.pending;world.podRescues.incidents=[{id:1,openedAt:20} as NonNullable<typeof world.podRescues>['incidents'][number]];
  layer.adopt(world);f.frame(2000,22);layer.present(22);expect(layer.mesh.activeCount).toBe(0);layer.dispose();
});

test('far aiming skips matrix writes, resumes near immediately and preserves physical goals',()=>{
  const world=miniTurretCamp(),turret=campTurret(world),target=world.pawns[1]!,f=setup(4),batches=new BoxBatches(),group=new Group(),layer=new MiniTurretLayer(f.detail);
  turret.turret!.targetKey=`pawn:${target.id}`;layer.update(world,group,batches,true);
  target.x=turret.x+7;target.z=turret.z-7;layer.update(world,group,batches);
  f.frame(0,100);layer.present(1/240);const mesh=layer['mesh']!,version=mesh.instanceMatrix.version,before=JSON.stringify(world);
  for(let k=1;k<100;k++){f.frame(k*5,100+k);expect(layer.present(1/240)).toBe(false);}
  expect(mesh.instanceMatrix.version).toBe(version);expect(JSON.stringify(world)).toBe(before);
  f.camera.zoom=4;f.camera.updateProjectionMatrix();f.frame(501,201);expect(layer.present(1/240)).toBe(true);batches.dispose();
});
