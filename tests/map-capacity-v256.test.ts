import {expect,test} from 'vitest';
import {DEFAULT_MAP_SIZE,MAP_SIZE_PRESETS,MAX_MAP_SIZE,MIN_MAP_SIZE,MAX_EXTENDED_MAP_SIZE,validMapDimension,validMapDimensionForSchema} from '../src/sim/map-config';
import {WeightedSearch} from '../src/sim/weighted-search';
import {CARDINAL_COST} from '../src/sim/movement';
import {terrainPaintPixelsPerCell} from '../src/render/TerrainLayer';
const coreSizes=[200,225,250,275,300,325,350,400] as const;

test('prospective schema256 accepts the eight Core dimensions while every historical version retains250',()=>{
 for(const size of coreSizes){expect(validMapDimensionForSchema(size,256)).toBe(true);for(let version=1;version<=255;version++)expect(validMapDimensionForSchema(size,version)).toBe(size<=250);}
 expect(validMapDimensionForSchema(400,257)).toBe(true); // This helper bounds dimensions, not schema support; import guards still reject unsupported schemas.
});
test('both sides of each bound, non-integers and malformed values stay refused, including rectangular dimensions checked independently',()=>{
 for(const value of [7,401,400.5,NaN,Infinity,-Infinity,'400',null,undefined])expect(validMapDimensionForSchema(value,256)).toBe(false);
 for(const value of [251,275,400])expect(validMapDimensionForSchema(value,255)).toBe(false);
 expect(validMapDimensionForSchema(MIN_MAP_SIZE,256)&&validMapDimensionForSchema(MAX_EXTENDED_MAP_SIZE,256)).toBe(true);
 expect(validMapDimensionForSchema(8,255)&&validMapDimensionForSchema(400,255)).toBe(false);
 for(const version of [NaN,Infinity,0,-1,255.5])expect(validMapDimensionForSchema(32,version)).toBe(false);
});
test('legacy callback validation and public presets remain unchanged until qualification',()=>{
 expect([32,250].every(validMapDimension)).toBe(true);expect([32,275].every(validMapDimension)).toBe(false);
 expect(MAP_SIZE_PRESETS).toEqual([64,128,200,250]);expect(DEFAULT_MAP_SIZE).toBe(250);expect(MAX_MAP_SIZE).toBe(250);
});
test('existing weighted navigation keeps exact cell IDs above65535 and at the400square far edge',()=>{
 const width=400,height=400,size=width*height;
 for(const start of [65535,size-2]){const target=start+1,blocked=new Uint8Array(size).fill(1);blocked[start]=blocked[target]=0;const field=new WeightedSearch(width,height,start,blocked).finish(new Set([target]));expect(field.parents).toHaveLength(size);expect(field.parents[target]).toBe(start);expect(field.parents[start]).toBe(-1);expect(field.costs[target]).toBe(CARDINAL_COST);expect(field.parents[0]).toBe(-2);}
});
test('an index crossing a row boundary never becomes a false neighbouring cell above65535',()=>{
 const width=400,height=400,start=65599,target=65600,blocked=new Uint8Array(width*height).fill(1);blocked[start]=blocked[target]=0;const field=new WeightedSearch(width,height,start,blocked).finish(new Set([target]));expect(field.parents[target]).toBe(-2);expect(field.costs[target]).toBe(Infinity);
});
test('the existing paint atlas stays within2048 on every Core dimension and reduces sampling rather than cropping cells',()=>{
 const scales=coreSizes.map(size=>terrainPaintPixelsPerCell({width:size,height:size}));expect(scales).toEqual([8,8,8,7,6,6,5,5]);
 for(const [index,size] of coreSizes.entries()){expect(size*scales[index]!).toBeLessThanOrEqual(2048);expect(size*scales[index]!).toBeGreaterThanOrEqual(size);}
 expect(terrainPaintPixelsPerCell({width:8,height:400})).toBe(5);
});
