import {expect,test} from 'vitest';
import {initialMapGenerationRuntime256,captureMapGenerationRuntime256,finishMapGenerationRuntime256,validMapGenerationRuntime256,validMapGenerationRuntimeEnvelope256} from '../src/sim/map-generation-runtime-256';
import {initializeExploration256} from '../src/sim/exploration-initial-256';
import {captureActualFogPhysical256,type ActualFogMap256} from '../src/sim/exploration-physical-256';
import {generateLocalRockChunks256,type LocalChunkInputs256} from '../src/sim/local-rock-chunks-256';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';

/** Isolated state and real primitive transitions. These inputs are NOT a full
 * World/Planet admission, entered caravan or completed generated campaign. */
test('generation statics preserve old absence and refuse future/undefined/accessor or malformed lists',()=>{
 expect(validMapGenerationRuntimeEnvelope256({},255,2)).toBe(true);
 for(const value of [undefined,initialMapGenerationRuntime256()])expect(validMapGenerationRuntimeEnvelope256({generationRuntime:value},255,3)).toBe(false);
 expect(validMapGenerationRuntimeEnvelope256({generationRuntime:initialMapGenerationRuntime256()},256,2)).toBe(false);
 let called=false;const registry={get generationRuntime(){called=true;return initialMapGenerationRuntime256();}};
 expect(validMapGenerationRuntimeEnvelope256(registry,256,3)).toBe(false);expect(called).toBe(false);
 expect(validMapGenerationRuntime256({revision:1,adjacentPermutation:[0,0,1,2,3,4,5,6]})).toBe(false);
 expect(validMapGenerationRuntime256({revision:1,adjacentPermutation:Array(8)})).toBe(false);
 expect(validMapGenerationRuntime256({revision:1,adjacentPermutation:null,edgeSelection:undefined})).toBe(false);
 expect(validMapGenerationRuntimeEnvelope256({generationRuntime:initialMapGenerationRuntime256()},256,3)).toBe(true);
});

test('cancelled and unused first captures never materialize the lazy adjacent owner',()=>{
 const source=initialMapGenerationRuntime256(),before=JSON.stringify(source),capture=captureMapGenerationRuntime256(source,200,200);
 expect(capture.adjacentPermutation).toEqual([0,1,2,3,4,5,6,7]);capture.adjacentPermutation.reverse();expect(JSON.stringify(source)).toBe(before);
 const fresh=captureMapGenerationRuntime256(source,200,200),unused=finishMapGenerationRuntime256(source,{...fresh,adjacentUses:0});expect(unused.adjacentPermutation).toBeNull();
 expect(()=>finishMapGenerationRuntime256(source,{adjacentPermutation:capture.adjacentPermutation,adjacentUses:0})).toThrow(/Unused/);
 // A real shuffle can return the identity. Its invocation still materializes.
 const used=finishMapGenerationRuntime256(source,{...fresh,adjacentUses:1});expect(used.adjacentPermutation).toEqual(fresh.adjacentPermutation);expect(Object.isFrozen(used.adjacentPermutation)).toBe(true);
 fresh.adjacentPermutation.reverse();expect(used.adjacentPermutation).toEqual([0,1,2,3,4,5,6,7]);
});

function border(width:number,height:number):number[]{const cells:number[]=[];for(let z=0;z<height;z++)for(let x=0;x<width;x++)if(!x||!z||x===width-1||z===height-1)cells.push(z*width+x);return cells;}
test('save/read keeps the exact prior shuffle and only passes an edge cache to a compatible map',()=>{
 const first=finishMapGenerationRuntime256(initialMapGenerationRuntime256(),{adjacentPermutation:[7,2,3,0,1,6,5,4],adjacentUses:3,edgeContext:{width:16,height:20,edgeCells:border(16,20).reverse()}}),saved=JSON.stringify(first),restored:unknown=JSON.parse(saved);
 expect(validMapGenerationRuntime256(restored)).toBe(true);if(!validMapGenerationRuntime256(restored))throw Error('Invalid roundtrip');
 expect(captureMapGenerationRuntime256(restored,16,20)).toEqual(captureMapGenerationRuntime256(first,16,20));
 const other=captureMapGenerationRuntime256(restored,200,200);expect(other.edgeContext).toBeUndefined();
 const notUsed=finishMapGenerationRuntime256(restored,{...other,adjacentUses:0});expect(notUsed.edgeSelection).toEqual(first.edgeSelection);expect(JSON.stringify(restored)).toBe(saved);
 const bad={...first,edgeSelection:{width:400,height:400,edgeCells:[0,0]}};expect(validMapGenerationRuntime256(bad)).toBe(false);
});

function fogMap():ActualFogMap256 {return {schemaVersion:256,site:{revision:3},width:64,height:64,tiles:Array.from({length:4096},()=>({terrain:'soil-natural'})),structures:[],jobs:[]};}
test('the actual edge fast path does not invent a CellFinder cache before its hundred misses',()=>{
 const map=fogMap(),onEdge=(c:number)=>c%64===0||c%64===63||Math.floor(c/64)===0||Math.floor(c/64)===63;
 const result=initializeExploration256(map,{start:null,rootsToUnfog:[],readers:{standable:onEdge,roofed:()=>false,canReachMapEdgeNoPassClosedDoorsOrWater:()=>true}},captureActualFogPhysical256(map),new WorldGenerationRandom(123));
 expect(result.root).not.toBeNull();expect(onEdge(result.root!)).toBe(true);expect(result.edgeContext).toBeUndefined();
});
test('actual exhausted edge samples materialize and return the complete shuffled cache',()=>{
 const map=fogMap(),result=initializeExploration256(map,{start:null,rootsToUnfog:[],readers:{standable:()=>false,roofed:()=>false,canReachMapEdgeNoPassClosedDoorsOrWater:()=>false}},captureActualFogPhysical256(map),new WorldGenerationRandom(123));
 expect(result.root).toBeNull();expect(result.edgeContext?.edgeCells).toHaveLength(252);expect(new Set(result.edgeContext?.edgeCells).size).toBe(252);
 expect(validMapGenerationRuntime256({revision:1,adjacentPermutation:null,edgeSelection:result.edgeContext})).toBe(true);
});

function chunkMasks(wet:boolean):LocalChunkInputs256 {
 const width=32,height=32,n=width*height,zero=()=>new Uint8Array(n),one=()=>new Uint8Array(n).fill(1),walkable=one(),heavy=one(),accepts=one();
 // Declared isolated land/deep-water masks; no fake World or ore owner.
 if(wet)for(let c=0;c<n;c++)if(c%4===0){walkable[c]=0;heavy[c]=0;accepts[c]=0;}
 return {width,height,elevation:new Float32Array(n),waterCovered:false,underground:false,chunkDensityFactors:[1000],rocks:['granite'],rockHasChunk:{granite:true,limestone:true,marble:true,sandstone:true,slate:true},nextId:1000,atCore:0,rubble:[],adjacentPermutation:captureMapGenerationRuntime256(initialMapGenerationRuntime256(),width,height).adjacentPermutation,
  physical:{edifices:zero(),items:zero(),doors:zero(),heavy,rubbleBlocked:zero(),walkableByAny:walkable,vacuum:zero(),acceptsUnnaturalFilth:accepts,filthMultiplier:new Float32Array(n).fill(1)}};
}
test('the actual chunk producer counts real shuffle calls, including propagation near nonwalkable water',()=>{
 const dry=generateLocalRockChunks256(chunkMasks(false),new WorldGenerationRandom(901));expect(dry.adjacentUses).toBe(0);
 expect(finishMapGenerationRuntime256(initialMapGenerationRuntime256(),dry).adjacentPermutation).toBeNull();
 const input=chunkMasks(true),before=structuredClone(input),wet=generateLocalRockChunks256(input,new WorldGenerationRandom(901));expect(wet.adjacentUses).toBeGreaterThan(0);expect(input).toEqual(before);
 const state=finishMapGenerationRuntime256(initialMapGenerationRuntime256(),wet);expect(state.adjacentPermutation).toEqual(wet.adjacentPermutation);
});
