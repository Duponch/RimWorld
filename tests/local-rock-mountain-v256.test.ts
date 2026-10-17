import {expect,test} from 'vitest';
import {generateLocalRockFields256} from '../src/sim/local-rock-fields-256.ts';
import {localMountainPlan256,createLocalMountainField256,mountainElevation256} from '../src/sim/local-mountain-256.ts';
import {generateCoreWorldMutators256,validCoreWorldMutators256,orderedCoreLocalMutators256} from '../src/sim/world-local-mutators-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import type {WorldSurfaceTile} from '../src/sim/world-surface-geography.ts';
test('roof islands need20 cardinal cells across both natural roof kinds; caves keep roof but remove the edifice',()=>{
 const elevation=new Float32Array(64),caves=new Float32Array(64);for(let i=0;i<20;i++)elevation[i]=.75;elevation[0]=.8;caves[0]=1;elevation[63]=.8;
 const before=[elevation.slice(),caves.slice()],result=generateLocalRockFields256({mapSeed:12,width:8,height:8,naturalRocks:['granite','slate'],waterCovered:false,elevation,caves});
 expect(result.roof[0]).toBe(2);expect(result.edifices[0]).toBe(0);expect(result.roof[1]).toBe(1);expect(result.edifices[1]).toBe(1);expect(result.roof[63]).toBe(0);expect(result.edifices[63]).toBe(1);expect(result.roof.filter(Boolean)).toHaveLength(20);expect([elevation,caves]).toEqual(before);
 expect(result.seeds).toHaveLength(2);expect(result.stones.every(id=>id==='granite'||id==='slate')).toBe(true);
});
test('water-covered maps do not create submerged rock edifices or roofs and reject missing actual rock contracts',()=>{
 const input={mapSeed:12,width:8,height:8,naturalRocks:['granite','slate'] as const,waterCovered:true,elevation:new Float32Array(64).fill(1),caves:new Float32Array(64)};
 const result=generateLocalRockFields256(input);expect(result.edifices.some(Boolean)).toBe(false);expect(result.roof.some(Boolean)).toBe(false);expect(()=>generateLocalRockFields256({...input,naturalRocks:['granite','granite']})).toThrow();
});
test('mountain orientation prefers actual ocean then lake coast without an unnecessary angle draw, and does not lift sea floor',()=>{
 const oceanRandom=new WorldGenerationRandom(125),ocean=localMountainPlan256(250,250,90,180,oceanRandom);expect(ocean.angle).toBe(90);expect(oceanRandom.state.counter).toBe(1);
 const lakeRandom=new WorldGenerationRandom(125),lake=localMountainPlan256(250,250,null,180,lakeRandom);expect(lake.angle).toBe(180);expect(lakeRandom.state.counter).toBe(1);
 const inlandRandom=new WorldGenerationRandom(125);localMountainPlan256(250,250,null,null,inlandRandom);expect(inlandRandom.state.counter).toBe(2);
 const field=createLocalMountainField256(ocean);for(const [x,z] of [[0,0],[124,128],[249,249]]){const value=field(x!,z!);expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);expect(mountainElevation256(0,value,true)).toBe(0);}
 expect(mountainElevation256(.8,.9,false)).toBe(Math.fround(.8+.9));
});
function tiles():WorldSurfaceTile[]{return Array.from({length:12},(_,id)=>({id,center:[100,0,0],corners:[],neighbours:[(id+1)%12,(id+11)%12],biome:'temperate-forest',hilliness:'flat',elevation:10,meanTemperature:10,rainfall:1000,swampiness:0,rivers:[],riverDistance:0}));}
test('Core modifiers save chance results once, retain generation order and do not invent a cave on impassable or flat terrain',()=>{
 const surface=tiles();surface[0]!.biome='ocean';surface[3]!.hilliness='mountainous';surface[4]!.hilliness='large-hills';surface[5]!.hilliness='impassable';surface[6]!.rivers=[{neighbour:7,river:'river'}];surface[7]!.rivers=[{neighbour:6,river:'river'}];
 const before=structuredClone(surface),result=generateCoreWorldMutators256(surface,125);expect(result.randomState.counter).toBe(2);expect(orderedCoreLocalMutators256(result.codes[1]!)).toEqual(['coast']);expect(orderedCoreLocalMutators256(result.codes[5]!)).toEqual(['mountain']);expect(orderedCoreLocalMutators256(result.codes[6]!)).toEqual(['river']);expect(validCoreWorldMutators256(result.codes,surface)).toBe(true);expect(surface).toEqual(before);
 const falseFlat=[...result.codes];falseFlat[2]=falseFlat[2]!|2;expect(validCoreWorldMutators256(falseFlat,surface)).toBe(false);const missingCoast=[...result.codes];missingCoast[1]=0;expect(validCoreWorldMutators256(missingCoast,surface)).toBe(false);expect(validCoreWorldMutators256({...result.codes},surface)).toBe(false);
});
