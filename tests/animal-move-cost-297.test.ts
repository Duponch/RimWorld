import {expect,test} from 'vitest';
import {animalMoveCostCore297,animalMoveEncodingBounds297,type AnimalMoveCostInput297} from '../src/sim/animal-move-cost-297.ts';
const neutral:AnimalMoveCostInput297={speed:6,moving:1,stage:1,weather:1,diagonal:false,walk:false,terrainCore:0,flight:1};

test('hare Jog pays ten Core and the native diagonal constant, while Walk floors both directions at fifty',()=>{
 expect(animalMoveCostCore297(neutral)).toBe(10);
 expect(animalMoveCostCore297({...neutral,diagonal:true})).toBe(14.142099380493164);
 expect(animalMoveCostCore297({...neutral,walk:true})).toBe(50);
 expect(animalMoveCostCore297({...neutral,walk:true,diagonal:true})).toBe(50);
});
test('a tortoise Walk doubles its sixty-Core Jog instead of applying the historical fivefold pace',()=>{
 expect(animalMoveCostCore297({...neutral,speed:1})).toBe(59.999996185302734);
 expect(animalMoveCostCore297({...neutral,speed:1,walk:true})).toBe(119.99999237060547);
});
test('terrain enters before Walk and a nine-hundred-Core raw Walk is paid with its native total/450 floor',()=>{
 expect(animalMoveCostCore297({...neutral,terrainCore:20,walk:true})).toBe(60);
 expect(animalMoveCostCore297({...neutral,terrainCore:500})).toBe(450);
 expect(animalMoveCostCore297({...neutral,terrainCore:500,walk:true})).toBe(450);
});
test('Duck flight pays the already chosen Walk price rather than changing its fifty-Core urgency minimum',()=>{
 expect(animalMoveCostCore297({...neutral,walk:true,flight:2.8})).toBe(Math.fround(50/Math.fround(2.8)));
 expect(animalMoveCostCore297({...neutral,walk:true,flight:2.8})).toBeLessThan(50);
});
test('the prospective envelope includes the exact diagonal codec inflation and slow capped Walk, without an epsilon',()=>{
 const bounds=animalMoveEncodingBounds297({speed:6,stageFactors:[.4,1],weatherMinimum:.8,weatherMaximum:1,flight:1});
 expect(bounds.minimum).toBe(30/450.000030517578125);
 expect(bounds.maximum).toBe(3.000007688371467);
 expect(bounds.maximum).toBeGreaterThan(3);
});
test('the scalar capture leaves the caller input untouched and refuses nonphysical numeric inputs',()=>{
 const input=Object.freeze({...neutral});animalMoveCostCore297(input);expect(input).toEqual(neutral);
 for(const patch of [{speed:0},{moving:NaN},{weather:-1},{terrainCore:501},{flight:0}])expect(()=>animalMoveCostCore297({...neutral,...patch})).toThrow(RangeError);
});
