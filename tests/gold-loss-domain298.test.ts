import {expect,test} from 'vitest';
import fs from 'node:fs';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validateBarriers} from '../src/sim/barrier-save.ts';
test('gold losses enter the existing reader at123 and retain positive integer and closed ingredient guards',()=>{
 const original=deserializeWorld(fs.readFileSync('E:/Code/RimWorld/tests/fixtures/ship-parts-v452-earned.json','utf8'));expect(validateWorld(original)).toEqual([]);const saved=serializeWorld(original);
 // Direct validator domain only: these are not admitted historical Worlds.
 const probe=(version:number,lost:Record<string,number>)=>validateBarriers({...original,destroyed:{count:1,lost}},version);
 expect(probe(122,{wood:1})).toEqual([]);expect(probe(123,{gold:20})).toEqual([]);expect(probe(122,{gold:20})).toContain('Invalid destroyed building ledger.');
 for(const value of [0,-1,.5,Infinity])expect(probe(298,{gold:value})).toContain('Invalid destroyed building ledger.');
 expect(probe(298,{gold:52,'ai-core':1})).toEqual([]);expect(probe(297,{'ai-core':1})).toContain('Invalid destroyed building ledger.');
 expect(probe(298,{'invented-ingredient':1})).toContain('Invalid destroyed building ledger.');expect(serializeWorld(original)).toBe(saved);
});
