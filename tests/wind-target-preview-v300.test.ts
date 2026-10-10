import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {WindLayer} from '../src/render/WindLayer';
import type {Structure} from '../src/sim/types';

test('turbine preview colors only its three resident blades and leaves animation history unchanged',()=>{
  const world=createWorld(300,16,16);
  const turbine=(id:number,x:number):Structure=>({id,kind:'wind-turbine',x,z:6,orientation:0,footprint:'standard',power:{on:true,parentId:null},wind:{autoCut:false,updateCounter:0,cachedWatts:1200}});
  world.structures=[turbine(9101,4),turbine(9102,9)];
  const layer=new WindLayer(),reference=new WindLayer();
  try{
    layer.adopt(world,true);reference.adopt(world,true);
    const original=layer.mesh.colorBuffer.array.slice(),matrices=layer.mesh.instanceMatrix.array.slice();
    const current=layer.mesh.geometry.getAttribute('windCurrent').array.slice(),previous=layer.mesh.geometry.getAttribute('windPrevious').array.slice();
    layer.setTargetPreview(new Set([9101]));
    expect(layer.mesh.colorBuffer.array.slice(0,9)).not.toEqual(original.slice(0,9));
    expect(layer.mesh.colorBuffer.array.slice(9)).toEqual(original.slice(9));
    const version=layer.mesh.colorBuffer.version;layer.setTargetPreview(new Set([9101]));layer.present(world.tick+2);
    expect(layer.mesh.colorBuffer.version).toBe(version);expect(layer.mesh.instanceMatrix.array).toEqual(matrices);
    expect(layer.mesh.geometry.getAttribute('windCurrent').array).toEqual(current);
    expect(layer.mesh.geometry.getAttribute('windPrevious').array).toEqual(previous);
    layer.clearTargetPreview();expect(layer.mesh.colorBuffer.array).toEqual(original);
    layer.setTargetPreview(new Set([9101]));world.structures.reverse();world.tick++;world.structures[1]!.wind!.cachedWatts=800;
    layer.adopt(world);reference.adopt(world);
    expect(layer.mesh.colorBuffer.array.slice(0,9)).toEqual(reference.mesh.colorBuffer.array.slice(0,9));
    expect(layer.mesh.colorBuffer.array.slice(9,18)).not.toEqual(reference.mesh.colorBuffer.array.slice(9,18));
    layer.clearTargetPreview();expect(layer.mesh.colorBuffer.array).toEqual(reference.mesh.colorBuffer.array);
    layer.setTargetPreview(new Set([9101]));layer.adopt(world,true);reference.adopt(world,true);
    expect(layer.mesh.colorBuffer.array).toEqual(reference.mesh.colorBuffer.array);
  }finally{layer.dispose();reference.dispose();}
});
