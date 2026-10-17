import {expect,test} from 'vitest';
// Deliberate definition-first import order exercises the former bootstrap edge.
import {JOB_DURATION,footprintCells,footprintContains} from '../src/sim/definitions.ts';
import {constructionRecipe} from '../src/sim/construction-materials.ts';
import {ancientCasketCells256 as publicPhysicalCells} from '../src/sim/ancient-casket-physical-256.ts';
import {ancientCasketCells256} from '../src/sim/ancient-casket-footprint-256.ts';
test('definition-first initialization preserves literal two-cell casket geometry in all four rotations',()=>{
 const expected=[[{x:7,z:11},{x:7,z:12}],[{x:7,z:11},{x:8,z:11}],[{x:7,z:11},{x:7,z:10}],[{x:7,z:11},{x:6,z:11}]];
 expect(publicPhysicalCells).toBe(ancientCasketCells256);
 for(const orientation of [0,1,2,3] as const){const entity={kind:'ancient-cryptosleep-casket' as const,x:7,z:11,orientation};expect(ancientCasketCells256(entity,orientation)).toEqual(expected[orientation]);expect(footprintCells(entity)).toEqual(expected[orientation]);for(const c of expected[orientation]!)expect(footprintContains(entity,c)).toBe(true);expect(footprintContains(entity,{x:8,z:12})).toBe(false);}
 expect(JOB_DURATION.wall).toBe(70);expect(constructionRecipe({kind:'wall'})).toEqual({ingredients:[{item:'wood',quantity:5}],work:70,coreWork:700});
});
