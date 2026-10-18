import {expect,test,vi} from 'vitest';
const capture=vi.hoisted(()=>({construct:vi.fn(),samples:vi.fn((x:number,_y:number,_z:number)=>-.123456789+x*.000000001)}));
vi.mock('../src/sim/world-coherent-noise.ts',()=>({createWorldPerlin:(options:unknown)=>{capture.construct(options);return capture.samples;}}));
import {irregularTemperatureOffset262} from '../src/sim/geographic-irregular-temperature-262';

test('same actual seed and absolute60Core sample computes once and retains negative float conversion',()=>{
 const one=irregularTemperatureOffset262(120000,0),count=capture.samples.mock.calls.length;expect(one).toBe(Math.fround(Math.fround(-.123456788)*7));expect(one).toBeLessThan(0);for(const at of [1,10,59,1,0])expect(irregularTemperatureOffset262(120000,at)).toBe(one);expect(capture.samples.mock.calls).toHaveLength(count);expect(capture.samples.mock.calls.at(-1)).toEqual([1,0,0]);
 irregularTemperatureOffset262(120000,60);expect(capture.samples.mock.calls).toHaveLength(count+1);expect(capture.samples.mock.calls.at(-1)).toEqual([60,0,0]);irregularTemperatureOffset262(120001,60);expect(capture.samples.mock.calls).toHaveLength(count+2);
});

test('cache is bounded and evicted older samples recompute the same pure result',()=>{
 const tile=130000,first=irregularTemperatureOffset262(tile,60);for(const at of [120,180,240,300])irregularTemperatureOffset262(tile,at);const before=capture.samples.mock.calls.length;expect(irregularTemperatureOffset262(tile,60)).toBe(first);expect(capture.samples.mock.calls).toHaveLength(before+1);
 for(let id=140000;id<140065;id++)irregularTemperatureOffset262(id,600);const constructs=capture.construct.mock.calls.length;irregularTemperatureOffset262(140000,600);expect(capture.construct.mock.calls).toHaveLength(constructs+1);
});
