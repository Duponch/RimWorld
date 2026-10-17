import {expect,test} from 'vitest';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {findLocalCentralCell256,findLocalNotEdgeCell256} from '../src/sim/local-cell-selection-256.ts';
import {localOreCount256,scatterLocalOres256,LOCAL_ORE_ROWS_256,localIrregularOreLump256} from '../src/sim/local-ore-scattering-256.ts';
import {generateLocalRockChunks256,type LocalChunkInputs256} from '../src/sim/local-rock-chunks-256.ts';

test('central search uses real edge-touching districts, while its documented final fallback checks only standability',()=>{
 const w=32,h=24,random=new WorldGenerationRandom(718),standable=()=>true,extra=()=>false;
 const before=random.state;
 expect(findLocalNotEdgeCell256(w,h,13,()=>true,random)).toBeNull();expect(random.state).toEqual(before);
 const closed={width:w,height:h,tightness:2,minimumDistrictCells:10,readers:{standable,district:()=>({touchesMapEdge:true,cellCount:40}),extra}};
 expect(findLocalCentralCell256({...closed,invalidOnFailure:true},random)).toBeNull();
 const afterReject=random.state.counter;
 expect(findLocalCentralCell256(closed,random)).not.toBeNull();expect(random.state.counter-afterReject).toBe(4002);
 const physical={...closed,readers:{standable,district:()=>({touchesMapEdge:true,cellCount:40}),extra:()=>true}};
 expect(findLocalCentralCell256(physical,new WorldGenerationRandom(718))).not.toBeNull();
});

test('seven minerals retain installed relative order and real rectangular width-squared count, with neutral water skip',()=>{
 expect(LOCAL_ORE_ROWS_256.map(row=>row.id)).toEqual(['steel','silver','gold','uranium','plasteel','jade','machinery']);
 expect([1,2,3,4,5].map(h=>localOreCount256(100,h as 1|2|3|4|5))).toEqual([4,8,11,15,16]);
 const random=new WorldGenerationRandom(19),before=random.state;
 const result=scatterLocalOres256({width:32,height:24,hilliness:4,waterCovered:true,naturalEdifices:new Uint8Array(768),caves:new Float32Array(768),usedRectCells:new Set(),isStartingMap:true,mapInitializing:true,tutorial:false},random);
 expect(result.placements).toEqual([]);expect(random.state).toEqual(before);
});

test('lump can extend into open ground, respects actual UsedRects/caves and never edits source grids',()=>{
 const width=32,height=32,center=16*width+16,edifices=new Uint8Array(1024).fill(1),caves=new Float32Array(1024);edifices[center]=1;
 const forbidden=new Set([center+1]),before=edifices.slice(),caveBefore=caves.slice();
 const result=scatterLocalOres256({width,height,hilliness:1,waterCovered:false,naturalEdifices:edifices,caves,usedRectCells:forbidden,isStartingMap:true,mapInitializing:true,tutorial:false,count:1,forcedOre:'jade',forcedSize:8},new WorldGenerationRandom(52));
 expect(result.placements.length).toBe(8);expect(localIrregularOreLump256(width,height,center,8,()=>true,new WorldGenerationRandom(52)).some(cell=>cell!==center)).toBe(true);
 expect(result.placements.every(row=>row.ore==='jade'&&!forbidden.has(row.cell))).toBe(true);
 expect(edifices).toEqual(before);expect(caves).toEqual(caveBefore);
 const shape=localIrregularOreLump256(width,height,center,6,cell=>cell!==center,new WorldGenerationRandom(1));
 expect(shape.length).toBe(6);expect(new Set(shape).size).toBe(6);expect(shape).not.toContain(center);
});

function chunkInputs():LocalChunkInputs256 {
 const width=32,height=32,n=width*height,zero=()=>new Uint8Array(n),one=()=>new Uint8Array(n).fill(1);
 return {width,height,elevation:new Float32Array(n),waterCovered:false,underground:false,chunkDensityFactors:[1000],rocks:['granite'],rockHasChunk:{granite:true,limestone:true,marble:true,sandstone:true,slate:true},nextId:1000,atCore:0,rubble:[],adjacentPermutation:[0,1,2,3,4,5,6,7],physical:{edifices:zero(),items:zero(),doors:zero(),heavy:one(),rubbleBlocked:zero(),walkableByAny:one(),vacuum:zero(),acceptsUnnaturalFilth:one(),filthMultiplier:new Float32Array(n).fill(1)}};
}
test('chunks allocate real distinct owners, TTL uses generation stream, physical masks and input allocator stay untouched',()=>{
 const input=chunkInputs(),source=structuredClone(input),random=new WorldGenerationRandom(901),result=generateLocalRockChunks256(input,random);
 expect(result.chunks.length).toBeGreaterThan(0);expect(result.rubble.length).toBeGreaterThan(0);
 expect(result.chunks.every(row=>row.item==='granite-chunk'&&row.quantity===1)).toBe(true);
 const ids=[...result.chunks,...result.rubble].map(row=>row.id);expect(new Set(ids).size).toBe(ids.length);expect(result.nextId).toBe(1000+ids.length);
 expect(result.rubble.every(row=>row.expiresAfterCore>=2700000&&row.expiresAfterCore<=3000000)).toBe(true);
 expect(input).toEqual(source);
 const blocked=chunkInputs();blocked.physical.items.fill(1);expect(generateLocalRockChunks256(blocked,new WorldGenerationRandom(901)).chunks).toEqual([]);
});
test('water-covered chunk step has no seed draw and rejects missing physical/static-list provenance',()=>{
 const input=chunkInputs(),random=new WorldGenerationRandom(99),before=random.state;
 expect(generateLocalRockChunks256({...input,waterCovered:true},random).noiseSeed).toBeNull();expect(random.state).toEqual(before);
 expect(()=>generateLocalRockChunks256({...input,adjacentPermutation:[0,0,1,2,3,4,5,6]},random)).toThrow(/provenance/);
});
