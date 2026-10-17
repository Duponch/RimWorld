import {expect,test} from 'vitest';
import {describeWorldSite,surfaceTileHash,surfaceNaturalRocks,localSurfaceMapSeed,localGenerationStepSeed} from '../src/sim/world-site-geography.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import type {WorldPhysicalSurface,WorldSurfaceTile} from '../src/sim/world-surface-geography.ts';
import type {WorldRoadLink} from '../src/sim/world-roads.ts';
function fixture(){
 const points:[number,number,number][]=[[100,0,0],[99,1,0],[99,0,1],[99,-1,0],[99,0,-1]];
 const tiles:WorldSurfaceTile[]=points.map((center,id)=>({id,center,corners:[],neighbours:id?[0]:[1,2,3,4],biome:id===1?'ocean':id===2?'lake':'temperate-forest',hilliness:'flat',elevation:id===1?-10:20,meanTemperature:12,rainfall:900,swampiness:.3,rivers:[],riverDistance:id===2||id===3?7:0}));
 tiles[0]!.rivers=[{neighbour:2,river:'river'},{neighbour:3,river:'creek'}];const roads:WorldRoadLink[][]=tiles.map(()=>[]);roads[0]!.push({neighbour:4,road:'stone-road'});
 const surface:WorldPhysicalSurface={revision:3,radius:100,seedText:'fixture',generationSeed:912,settings:{coverage:.3,rainfall:3,temperature:3,population:3},tiles};return {surface,roads};
}
test('actual surface tile hash and map/step seed arithmetic preserve signed32 wrap',()=>{
 const signed=(n:bigint)=>Number(BigInt.asIntN(32,n));
 const combine=(a:number,b:number)=>signed(BigInt(a)^BigInt.asIntN(32,BigInt(b)+2654435769n+(BigInt(a)<<6n)+(BigInt(a)>>2n)));
 for(const id of [0,1,119903,590491,2147483647]){expect(surfaceTileHash(id)).toBe(signed(BigInt(id)*397n));for(const seed of [0,1,-2147483648,2147483647])expect(localSurfaceMapSeed(seed,id)).toBe(combine(seed,signed(BigInt(id)*397n)));}
 expect(localGenerationStepSeed(15,200,0)).toBe(combine(15,200));expect(localGenerationStepSeed(15,200,1)).toBe(combine(15,201));expect(()=>surfaceTileHash(-1)).toThrow();expect(()=>localGenerationStepSeed(NaN,1,0)).toThrow();
});
test('natural rocks use a separate actual tile-only stream and produce two or three distinct ordered definitions',()=>{
 const game=new WorldGenerationRandom(123),before=game.state;
 for(const id of [0,1,2,37,119903]){const rocks=surfaceNaturalRocks(id);expect([2,3]).toContain(rocks.length);expect(new Set(rocks).size).toBe(rocks.length);expect(rocks.every(r=>['sandstone','granite','limestone','slate','marble'].includes(r))).toBe(true);expect(surfaceNaturalRocks(id)).toEqual(rocks);}
 expect(game.state).toEqual(before);expect(localSurfaceMapSeed(1,37)).not.toBe(localSurfaceMapSeed(2,37));
});
test('a real Ocean neighbour yields a coast; a Lake alone does not; visible rivers retain distance tie order and nominal widths',()=>{
 const {surface,roads}=fixture(),before=JSON.stringify({surface,roads}),site=describeWorldSite(surface,roads,0);expect(site.coastAngle).not.toBeNull();expect(site.rivers.map(r=>[r.neighbour,r.width])).toEqual([[2,6],[3,4]]);expect(site.roads).toMatchObject([{neighbour:4,road:'stone-road'}]);expect(site.biome).toBe('temperate-forest');expect(site.elevation).toBe(20);expect(site.waterCovered).toBe(false);expect(JSON.stringify({surface,roads})).toBe(before);
 surface.tiles[1]!.biome='lake';expect(describeWorldSite(surface,roads,0).coastAngle).toBeNull();surface.tiles[0]!.rivers.splice(1);expect(describeWorldSite(surface,roads,0).riverHeading).toBe(0);
});
test('water-covered and bedrock are separate facts; ice hides local links without erasing potential globe links',()=>{
 const {surface,roads}=fixture();surface.tiles[0]!.biome='sea-ice';surface.tiles[0]!.elevation=-1;const before=JSON.stringify(surface.tiles[0]),site=describeWorldSite(surface,roads,0);expect(site.waterCovered).toBe(true);expect(site.hasBedrock).toBe(false);expect(site.rivers).toEqual([]);expect(site.roads).toEqual([]);expect(JSON.stringify(surface.tiles[0])).toBe(before);surface.tiles[0]!.biome='ice-sheet';expect(describeWorldSite(surface,roads,0).hasBedrock).toBe(true);expect(()=>describeWorldSite(surface,[],0)).toThrow();
});
