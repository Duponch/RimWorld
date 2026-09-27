import { describe,expect,it } from 'vitest';
import type * as THREE from 'three/webgpu';
import { OrthographicCamera, Vector3 } from 'three/webgpu';
import { createWorld } from '../src/sim/engine.ts';
import type { CookingTask } from '../src/sim/cooking-types.ts';
import type { Structure } from '../src/sim/types.ts';
import { FireLayer } from '../src/render/FireLayer.ts';
import { StructureVfxLayer } from '../src/render/StructureVfxLayer.ts';
import { ensureFireState } from '../src/sim/fire-rules.ts';

const structure=(kind:Structure['kind'],id:number,x=8,z=8):Structure=>({id,kind,x,z,orientation:0,footprint:'standard'});

describe('resident structure effects',()=>{
  it('shows hot steel and smoke only during confirmed powered production work',()=>{
    const world=createWorld(1251,20,20),table=structure('machining-table',900);
    world.structures=[table];table.power={on:true,parentId:null};
    const pawn=world.pawns[0]!,layer=new StructureVfxLayer();
    layer.adopt(world,true);
    expect(layer.glow.activeCount).toBe(1); // powered status lamp
    expect(layer.smoke.geometry.instanceCount).toBe(0);
    pawn.state='working';pawn.cooking={recipe:'make-revolver',stationId:table.id,phase:'work'} as CookingTask;
    layer.adopt(world);
    expect(layer.glow.activeCount).toBe(3);
    expect(layer.smoke.geometry.instanceCount).toBe(2);
    const version=(layer.smoke.geometry.getAttribute('smokePosition') as THREE.InstancedBufferAttribute).version;
    layer.present(17.5);layer.adopt(world);
    expect((layer.smoke.geometry.getAttribute('smokePosition') as THREE.InstancedBufferAttribute).version).toBe(version);
    pawn.cooking.phase='output';layer.adopt(world);
    expect(layer.glow.activeCount).toBe(1);
    expect(layer.smoke.geometry.instanceCount).toBe(0);
    table.power.on=false;layer.adopt(world);
    expect(layer.glow.activeCount).toBe(0);
    expect(layer.smoke.visible).toBe(false);
    layer.dispose();
  });

  it('tracks fabrication, stove steam and battery charge without inventing power',()=>{
    const world=createWorld(1252,20,20),bench=structure('fabrication-bench',901),stove=structure('electric-stove',902,12,9),battery=structure('battery',903,15,9);
    bench.power={on:true,parentId:null};stove.power={on:false,parentId:null};battery.battery={stored:BATTERY_QUARTER};
    world.structures=[bench,stove,battery];
    const pawn=world.pawns[0]!,layer=new StructureVfxLayer();
    pawn.state='working';pawn.cooking={recipe:'make-component',stationId:bench.id,phase:'work'} as CookingTask;
    layer.adopt(world,true);
    expect(layer.glow.activeCount).toBe(4); // bench lamp, two hot pieces, one charge bar
    expect(layer.smoke.geometry.instanceCount).toBe(2);
    pawn.cooking={stationId:stove.id,phase:'work'} as CookingTask;
    layer.adopt(world);
    expect(layer.smoke.geometry.instanceCount).toBe(0); // electric stove is unpowered
    stove.power.on=true;layer.adopt(world);
    expect(layer.smoke.geometry.instanceCount).toBe(3);
    battery.battery!.stored=0;layer.adopt(world);
    expect(layer.glow.activeCount).toBe(3); // stove status, stove heat, bench idle status
    layer.setDistant(true);expect(layer.group.visible).toBe(false);
    layer.setDistant(false);expect(layer.group.visible).toBe(true);
    layer.dispose();
  });

  it('draws lit campfire cones in the existing fire batch, without static boxes',()=>{
    const world=createWorld(1253,20,20),camp=structure('campfire',904);
    camp.fuel={ticks:0,burned:0,autoRefuel:true};world.structures=[camp];
    const fire=new FireLayer();fire.adopt(world,true);
    const a=fire.mesh.geometry.getAttribute('firePosition');
    expect(a.getW(0)).toBe(0);
    camp.fuel.ticks=100;fire.adopt(world);
    expect((fire.mesh.geometry as import('three/webgpu').InstancedBufferGeometry).instanceCount).toBe(3);
    expect(a.getW(0)).toBeGreaterThan(0);
    camp.fuel.ticks=0;fire.adopt(world);
    expect(a.getW(0)).toBe(0);
    fire.dispose();
  });

  it('caps ground smoke to 128 camera-local fires and refreshes it after panning',()=>{
    const world=createWorld(1254,100,100),state=ensureFireState(world),camp=structure('campfire',950,22,22);
    camp.fuel={ticks:100,burned:0,autoRefuel:true};world.structures=[camp];
    let id=1000;
    for(const base of [15,75])for(let z=0;z<10;z++)for(let x=0;x<16;x++)
      state.items.push({id:id++,x:base+x,z:base+z,size:1,bornCore:0,nextPulseCore:15,complexCore:150,spreadCore:150});
    const camera=new OrthographicCamera(-18,18,18,-18,.1,150);
    const target=new Vector3(22,0,22);
    camera.position.set(52,50,52);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const layer=new StructureVfxLayer();layer.adopt(world,true);layer.setView(camera,target);
    let position=layer.smoke.geometry.getAttribute('smokePosition') as THREE.InstancedBufferAttribute;
    expect(layer.smoke.geometry.instanceCount).toBe(2+128*2); // campfire + bounded ground fire
    for(let i=2;i<layer.smoke.geometry.instanceCount;i++)expect(position.getX(i)).toBeLessThan(32);
    const version=position.version;layer.setView(camera,target);expect(position.version).toBe(version);
    target.set(82,0,82);camera.position.set(112,50,112);camera.lookAt(target);camera.updateMatrixWorld();
    layer.setView(camera,target);position=layer.smoke.geometry.getAttribute('smokePosition') as THREE.InstancedBufferAttribute;
    expect(layer.smoke.geometry.instanceCount).toBe(2+128*2);
    for(let i=2;i<layer.smoke.geometry.instanceCount;i++)expect(position.getX(i)).toBeGreaterThan(73);
    layer.dispose();
  });
});

const BATTERY_QUARTER=600*120_000/4;
