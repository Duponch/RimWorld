import {expect,test} from 'vitest';
import {planVanishGeneratedAncient256} from '../src/sim/generated-ancient-vanish-256.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
test('a played or historical map is refused without consuming, dropping or rewriting anything',()=>{
 const w=deconstructionCamp(),s=fixtureBuilding(w,'wall',14,16);Object.assign(s,{material:'steel',factionId:null});const before=JSON.stringify(w);
 expect(planVanishGeneratedAncient256(w,16*w.width+14,true)).toBe(null);expect(planVanishGeneratedAncient256(w,16*w.width+14,false as never)).toBe(null);expect(JSON.stringify(w)).toBe(before);
});
