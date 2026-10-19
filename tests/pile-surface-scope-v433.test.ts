import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {pileSurfaces,pileIdentitySurfaces,withPileSurfaceReads} from '../src/render/pile-surfaces';

test('scene readers share supports only during one synchronous application and restore after throws',()=>{
  const world=createWorld(433,16);world.structures=[{id:world.nextId++,kind:'table',x:5,z:5,material:'wood',orientation:0,footprint:'standard'}];
  const cold=pileSurfaces(world);
  withPileSurfaceReads(()=>{
    const first=pileSurfaces(world);expect(first).toEqual(cold);expect(pileSurfaces(world)).toBe(first);
    const identities=pileIdentitySurfaces(world);expect(pileIdentitySurfaces(world)).toBe(identities);
    withPileSurfaceReads(()=>expect(pileSurfaces(world)).not.toBe(first));expect(pileSurfaces(world)).toBe(first);
    expect(pileSurfaces({...world})).not.toBe(first);
  });
  world.structures[0]!.x=10;expect(pileSurfaces(world)).not.toEqual(cold);
  expect(()=>withPileSurfaceReads(()=>{pileSurfaces(world);throw Error('abort');})).toThrow('abort');
  world.structures=[];expect(pileSurfaces(world).size).toBe(0);
});
