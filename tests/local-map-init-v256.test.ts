import {expect,test} from 'vitest';
import {localMapInit256} from '../src/sim/local-map-init-256.ts';

test('four isolated installed GasGrid constructors corroborate the actual first retained draw, dimensions and counter',()=>{
 // ROOT managed witness root-gasgrid02.json. It executed the real Map,
 // MapInfo, CellIndices and GasGrid constructors; not a full Vanilla map.
 for(const [seed,width,height,value] of [[0,32,32,74],[123,200,200,8163],[-1,250,250,17723],[2147483647,400,300,26903]]){
  const init=localMapInit256(seed!,width!,height!);
  expect(init.gasDiffusionCycleIndex).toBe(value);expect(init.provenance.seed).toBe(seed!>>>0);
  expect(init.provenance.counter).toBe(1);expect(init.random.state).toEqual({seed:seed!>>>0,counter:1});
 }
 expect(()=>localMapInit256(1,7,32)).toThrow();expect(()=>localMapInit256(1,32,401)).toThrow();
});
