import {expect,test} from 'vitest';
import {ancientCount256,ancientRect256,clipAncientRect256,ancientStepOrder256,sampleRuinSize256,sampleAncientExtent256,scatterAncient750256} from '../src/sim/local-ancient-placement-256.ts';
import {commitActualAncientLayout256} from '../src/sim/local-ancient-commit-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {registryCamp} from './helpers/world-maps-v255.ts';

test('Core750 count is rounded reciprocal then width squared, including small-map zero and exact zero density',()=>{expect(ancientCount256(250,.12)).toBe(1);expect(ancientCount256(250,.25)).toBe(2);expect(ancientCount256(200,.12)).toBe(0);expect(ancientCount256(250,3)).toBe(19);expect(ancientCount256(250,0)).toBe(0);expect(()=>ancientCount256(250,NaN)).toThrow();});

test('actual CellRect even-size anchor and clipping retain the chosen center without moving or drying cells',()=>{expect(ancientRect256(16*32+16,32,4,5)).toEqual({minX:14,minZ:14,maxX:17,maxZ:18});expect(clipAncientRect256(ancientRect256(5*32+5,32,20,20),32,32)).toEqual({minX:0,minZ:0,maxX:14,maxZ:14});});

test('same750 ordering uses actual Def.index and rejects an invented tie',()=>{expect(ancientStepOrder256({ruins:20,shrines:10})).toEqual(['shrines','ruins']);expect(ancientStepOrder256({ruins:3,shrines:8})).toEqual(['ruins','shrines']);expect(()=>ancientStepOrder256({ruins:2,shrines:2})).toThrow();});

test('ruin curve is two draws and Shrine keeps both axis draws PLUS the inherited unused curve draws',()=>{const calls:string[]=[];const r={float:(min:number,max:number)=>{calls.push('float');return min;},integer:(min:number,max:number)=>{calls.push('integer');return calls.length===1?15:20;}};expect(sampleRuinSize256(r)).toBe(6);expect(calls).toEqual(['float','float']);calls.length=0;expect(sampleAncientExtent256('shrines',r)).toEqual([15,20]);expect(calls).toEqual(['integer','integer','float','float']);});

test('a historical real map is not a fresh750 owner; refusal changes no Thing, stream, tick or PRNG',()=>{const w=registryCamp(),r=new WorldGenerationRandom(123),before=JSON.stringify(w),state=r.state;expect(()=>scatterAncient750256(w,'ruins',{startingMap:true,waterCovered:false,mapInitializing:true,layoutRects:[],usedRects:[]},r,()=>{throw Error('Historical map reached an ancient resolver');})).toThrow('fresh750');expect(JSON.stringify(w)).toBe(before);expect(r.state).toEqual(state);});

test('legacy maps reject an ancient layout before touching an accessor or a namespace frontier',()=>{const w=registryCamp(),before=JSON.stringify(w);let reads=0;const layout={};Object.defineProperty(layout,'structures',{get(){reads++;throw Error('read');}});expect(commitActualAncientLayout256(w,layout as never,true).ok).toBe(false);expect(reads).toBe(0);expect(JSON.stringify(w)).toBe(before);});
