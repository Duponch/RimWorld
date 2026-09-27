import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { createWorld } from '../src/sim/engine';
import type { StructureKind } from '../src/sim/types';
import type { CookingTask } from '../src/sim/cooking-types';
import { ACTION_FX,ActionVfxLayer,SPRITES_PER_PAWN,actionFxForPawn } from '../src/render/ActionVfxLayer';

function poseSource(count:number):THREE.InstancedBufferGeometry {
  const geometry=new THREE.InstancedBufferGeometry();
  for(const name of ['aFrom','aTo','aTravel'])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(count*4),4));
  return geometry;
}
function classify(world:ReturnType<typeof createWorld>,index=0){
  return actionFxForPawn(world,world.pawns[index]!,new Map(world.pawns.map(p=>[p.id,p])),
    new Map(world.jobs.map(job=>[job.id,job])),new Map(world.structures.map(s=>[s.id,s])));
}

test('one resident geometry routes active stations to distinct comic marks',()=>{
  const world=createWorld(128,32,32),pawn=world.pawns[0]!;
  pawn.state='working';
  const station={id:world.nextId++,kind:'machining-table' as StructureKind,x:pawn.x+1,z:pawn.z,orientation:0 as const,footprint:'standard' as const};
  world.structures.push(station);
  pawn.cooking={stationId:station.id,phase:'work',actionCell:{x:station.x,z:station.z}} as CookingTask;
  for(const [kind,effect] of [
    ['machining-table',ACTION_FX.smith],['fabrication-bench',ACTION_FX.smith],
    ['tailor-bench',ACTION_FX.tailor],['electric-tailor-bench',ACTION_FX.tailor],
    ['stonecutter',ACTION_FX.stonecraft],['art-bench',ACTION_FX.art],
    ['electric-stove',ACTION_FX.cook],['crafting-spot',ACTION_FX.tailorGround],
  ] as const){station.kind=kind;expect(classify(world).kind).toBe(effect);}
  station.kind='crafting-spot';pawn.cooking.recipe='tribalwear';expect(classify(world).kind).toBe(ACTION_FX.tailorGround);
  station.kind='butcher-spot';pawn.cooking.recipe='butcher-creature';expect(classify(world).kind).toBe(ACTION_FX.butcherGround);
  station.kind='butcher-table';expect(classify(world).kind).toBe(ACTION_FX.butcher);
});

test('fight state stays available to the volumetric layer without duplicate sprite effects',()=>{
  const world=createWorld(128,32,32),[a,b]=world.pawns;
  b!.x=a!.x+1;b!.z=a!.z;
  a!.social={rng:1,memories:[],fight:{opponentId:b!.id,startedAt:world.tick}};
  b!.social={rng:2,memories:[],fight:{opponentId:a!.id,startedAt:world.tick}};
  const body=poseSource(world.pawns.length),layer=new ActionVfxLayer({blend:uniform(1),travelTime:uniform(0)});
  expect(classify(world,0)).toEqual({kind:ACTION_FX.brawl,x:b!.x,z:b!.z});
  layer.update(world,body);
  expect(layer.mesh.visible).toBe(false);
  expect(layer.mesh.geometry.instanceCount).toBe(0);
  a!.melee={order:{targetId:b!.id,startedDowned:false,auto:'social'},strike:{targetId:b!.id,atCore:world.tick*10,untilCore:world.tick*10+120,tool:'left-fist',outcome:'miss'}};
  expect(classify(world,0).impactCore).toBeUndefined();
  a!.melee.strike!.outcome='hit';
  expect(classify(world,0).impactCore).toBe(world.tick*10);
  layer.update(world,body);expect(layer.mesh.visible).toBe(false);
  a!.state='sleeping';layer.update(world,body);
  expect(layer.mesh.visible).toBe(true);
  expect(layer.mesh.frustumCulled).toBe(true);
  const bound=layer.mesh.geometry.boundingSphere!;
  expect(bound.radius).toBeGreaterThanOrEqual(3);
  expect(bound.center.x).toBeCloseTo(a!.x);
  const compiled=layer.prepareForCompile();expect(layer.mesh.frustumCulled).toBe(false);compiled();expect(layer.mesh.frustumCulled).toBe(true);
  expect(SPRITES_PER_PAWN).toBe(8);
  expect(layer.mesh.geometry.getAttribute('actionPart').count).toBe(SPRITES_PER_PAWN*4);
  expect(layer.mesh.material.depthTest).toBe(true);
  layer.dispose();body.dispose();
});

test('pause and 200-second wrap keep one shader clock with no CPU particle loop',()=>{
  const layer=new ActionVfxLayer({blend:uniform(1),travelTime:uniform(0)});
  const clock=(layer as unknown as {time:{value:number}}).time;
  layer.present(1199);const before=clock.value;
  layer.present(1199);expect(clock.value).toBe(before);
  layer.present(1200);expect(clock.value).toBe(0);
  layer.present(1201);expect(clock.value).toBeCloseTo(1/6);
  layer.dispose();
});
