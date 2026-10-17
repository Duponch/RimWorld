import {expect,test} from 'vitest';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
test('a resumed real generation frontier continues identically without advancing its source',()=>{
 const source=new WorldGenerationRandom(479492383);
 for(let i=0;i<17;i++)source.value();
 const before=source.state,restored=WorldGenerationRandom.fromState(before);
 expect(restored).not.toBe(source);expect(restored.state).toEqual(before);expect(source.state).toEqual(before);
 const observed=Array.from({length:32},()=>restored.integerValue());
 expect(source.state).toEqual(before);
 expect(Array.from({length:32},()=>source.integerValue())).toEqual(observed);
});
test('restoration copies values and preserves the real uint32 wrap instead of replaying padding draws',()=>{
 const state={seed:118,counter:4294967295},restored=WorldGenerationRandom.fromState(state);
 expect(restored.state).toEqual(state);restored.integerValue();expect(restored.state).toEqual({seed:118,counter:0});
 state.seed=7;state.counter=5;expect(restored.state).toEqual({seed:118,counter:0});
});
test('invalid or incomplete generation frontiers refuse without creating a replacement stream',()=>{
 for(const state of [{seed:-1,counter:0},{seed:0,counter:-1},{seed:0,counter:.5},{seed:4294967296,counter:0},{seed:0,counter:4294967296}]){
  expect(()=>WorldGenerationRandom.fromState(state)).toThrow('frontier');
 }
 expect(()=>WorldGenerationRandom.fromState({seed:0} as {seed:number;counter:number})).toThrow('frontier');
});
