import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {removeBulkCollapsingNaturalRoofs256,roofingFromNaturalFields256} from '../src/sim/roof-natural-generation-256.ts';
import {roofCoverage,roofKindAt,isRoofed} from '../src/sim/roof-rules.ts';
import {validNaturalRoofState256,validateRoofing} from '../src/sim/roof-save.ts';

test('generation removes unsupported thin and thick quietly, preserves inputs and actual held components',()=>{
 const width=32,height=32,n=width*height,roof=new Uint8Array(n),edifices=new Uint8Array(n),i=16*width+16;
 roof[i]=2;roof[i+1]=1;edifices[i-1]=1;const before=roof.slice();
 expect(removeBulkCollapsingNaturalRoofs256({width,height,roof,edifices},[i])).toEqual(before);
 edifices[i-1]=0;const removed=removeBulkCollapsingNaturalRoofs256({width,height,roof,edifices},[i-1]);
 expect(removed[i]).toBe(0);expect(removed[i+1]).toBe(0);expect(roof).toEqual(before);
 expect(roofingFromNaturalFields256(removed)).toEqual({constructed:[],build:[],remove:[],cursor:0,natural:{thin:[],thick:[]}});
});
test('generation support must be roof-connected and within 6.9, not a nearby holder across a gap',()=>{
 const width=32,height=32,roof=new Uint8Array(1024),edifices=new Uint8Array(1024),i=16*32+16;
 roof[i]=2;roof[i+2]=2;edifices[i-1]=1;
 const result=removeBulkCollapsingNaturalRoofs256({width,height,roof,edifices},[i+1]);
 expect(result[i]).toBe(2);expect(result[i+2]).toBe(0);
 const line=new Uint8Array(1024);for(let x=8;x<=20;x++)line[16*32+x]=1;const holders=new Uint8Array(1024);holders[16*32+7]=1;
 const short=removeBulkCollapsingNaturalRoofs256({width,height,roof:line,edifices:holders},[16*32+14]);
 expect(short[16*32+13]).toBe(1);expect(short[16*32+14]).toBe(0);
});
test('natural readers union three disjoint types and strict data refuses old ownership/accessors/overlap',()=>{
 const w=deconstructionCamp();fixtureBuilding(w,'wall',16,16);const i=16*32+16;
 w.roofing={constructed:[i],build:[],remove:[],cursor:0,natural:{thin:[i+1],thick:[i+2]}};
 expect(roofCoverage(w)).toEqual([i,i+1,i+2]);expect(roofKindAt(w,i+2)).toBe('natural-thick');expect(isRoofed(w,i+1)).toBe(true);
 expect(validateRoofing(w,256)).toEqual([]);expect(validNaturalRoofState256(w.roofing,255,1024)).toBe(false);
 expect(validNaturalRoofState256({natural:undefined},255,1024)).toBe(false);expect(validNaturalRoofState256({natural:undefined},256,1024)).toBe(false);
 let reads=0;const cells:number[]=[];Object.defineProperty(cells,'0',{get(){reads++;throw Error('getter');},enumerable:true});
 expect(validNaturalRoofState256({natural:{thin:cells,thick:[]}},256,1024)).toBe(false);expect(reads).toBe(0);
 w.roofing.natural!.thick=[i+1];expect(validateRoofing(w,256)).toContain('Two roof types occupy one cell.');
});
