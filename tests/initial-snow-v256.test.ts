import {expect,test} from 'vitest';
import {initialSnowSeason256,initialSnowTwelfthMean256,prepareInitialSnow256,initialTerrainMeltSnowRadius256,addInitialSnowRadial256,type InitialSnowLandscape256} from '../src/sim/initial-snow-256.ts';
import {initializeGeographicSnowSurface256,type FreshSnowLandscape256} from '../src/sim/snow-surface.ts';
import {SnowSweepRuntime} from '../src/sim/snow-sweep.ts';
import {snowVisitsPerLocalTick} from '../src/sim/snow-rules.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import type {ClimateDefinition} from '../src/sim/site-climate.ts';
const cold:ClimateDefinition={meanTemperature:-100,amplitude:28,latitude:90,longitude:0,rainfall:1000};
/** Isolated actual cell/climate-owner fields, not a fabricated World, room or
 * gameplay fixture. Only these fields are read/written by the narrow helper. */
function landscape(tick=0,definition:ClimateDefinition=cold):InitialSnowLandscape256&FreshSnowLandscape256 {
 return {schemaVersion:256,tick,seed:44,width:8,height:8,site:{revision:3,tileId:1},climate:{revision:4,tileId:1,adoptedAt:tick,calendarOrigin:1500+tick,definition},tiles:Array.from({length:64},()=>({terrain:'soil-natural'})),structures:[],roofing:{constructed:[],build:[],remove:[],cursor:0}};
}
test('three actual twelfths wrap across year;0/1/2/3 negative seasonal averages stay distinct',()=>{
 const definition={...cold,meanTemperature:0};
 const counts=[0,1,2,3].map(t=>{const tick=(t*5+2.5)*60000;return initialSnowSeason256(definition,tick,tick).coldTwelfths;});
 expect(counts).toEqual([3,2,1,0]);
 const wrap=initialSnowSeason256(definition,0,1);
 expect(wrap.averages).toEqual([10,11,0].map(t=>initialSnowTwelfthMean256(definition,t)));expect(wrap.twelfth).toBe(0);
 const south={...definition,latitude:-90};expect(initialSnowTwelfthMean256(south,6)).toBeLessThan(0);expect(initialSnowTwelfthMean256(definition,6)).toBeGreaterThan(0);
});
test('Core float32 warm multiplier retains the literal double>.4 boundary for three cold periods',()=>{
 const definition={...cold,meanTemperature:2},local=4.9*60000,season=initialSnowSeason256(definition,local,local);
 expect(season.coldTwelfths).toBe(3);expect(season.seasonalTemperature).toBeGreaterThan(0);expect(season.baseAmount).toBe(Math.fround(.4));expect(season.baseAmount).toBeGreaterThan(.4);
 const map=landscape(0,definition);map.climate={revision:4,tileId:1,adoptedAt:0,calendarOrigin:local/10,definition};
 const plan=prepareInitialSnow256(map,new WorldGenerationRandom(8));expect(plan.noiseSeed).not.toBeNull();expect(plan.depths.some(d=>d>=.2)).toBe(true);
});
test('initial noise has one actual seed and respects real roof/full building/terrain/bridge/collapsed owners without mutation',()=>{
 const map=landscape();map.roofing={constructed:[17],build:[],remove:[],cursor:0,natural:{thin:[18],thick:[19]}};
 map.tiles[20]={terrain:'water-deep'};map.tiles[21]={terrain:'water-shallow'};map.tiles[22]={terrain:'water-shallow',bridge:true};map.tiles[23]={terrain:'rock',bridge:true,collapsedRock:{id:8,terrain:'water-shallow'}};
 map.structures.push({id:9,kind:'wall',orientation:0,footprint:'standard',x:6,z:6});
 const before=structuredClone(map),rng=new WorldGenerationRandom(19),oracle=new WorldGenerationRandom(19),seed=oracle.integer(0,651431),plan=prepareInitialSnow256(map,rng);
 expect(plan.baseAmount).toBe(1);expect(plan.noiseSeed).toBe(seed);expect(rng.state.counter).toBe(1);expect(plan.random).toEqual(rng.state);
 expect([17,18,19,20,21,23,54].map(i=>plan.depths[i])).toEqual([0,0,0,0,0,0,0]);expect(plan.depths[22]).toBeGreaterThanOrEqual(.5);expect(map).toEqual(before);
});
test('noise allocation is lazy by AddFallenSnow call, not by accepted snow depth or biome substitution',()=>{
 const covered=landscape();covered.roofing={constructed:Array.from({length:64},(_,i)=>i),build:[],remove:[],cursor:0};
 const rng=new WorldGenerationRandom(1),plan=prepareInitialSnow256(covered,rng);expect(plan.noiseSeed).toBeNull();expect(rng.state.counter).toBe(0);
 const water=landscape();for(const tile of water.tiles)tile.terrain='water-deep';const waterRng=new WorldGenerationRandom(1),empty=prepareInitialSnow256(water,waterRng);
 expect(empty.depths.every(d=>d===0)).toBe(true);expect(empty.noiseSeed).not.toBeNull();expect(waterRng.state.counter).toBe(1);
 const warm=landscape(0,{...cold,meanTemperature:100});const warmRng=new WorldGenerationRandom(1),none=prepareInitialSnow256(warm,warmRng);expect(none.coldTwelfths).toBe(0);expect(none.noiseSeed).toBeNull();expect(warmRng.state.counter).toBe(0);
});
test('a newly generated camp adopts snow at its real nonzero clock and resumes without historical sweep/catch-up',()=>{
 const map=landscape(1792),before=structuredClone(map.tiles);initializeGeographicSnowSurface256(map);
 expect(map.snow).toMatchObject({revision:1,adoptedAt:1792,lastTick:1792,cursor:0});expect(map.tiles).toEqual(before);
 const state=map.snow!;const sweep=new SnowSweepRuntime(state,{width:8,height:8,depth:()=>0,writeDepth:()=>{throw Error('No snow should be written');},retains:()=>true,roofed:()=>false,usesIndoorAir:()=>false,temperature:()=>-20,snowRate:()=>0,changed:()=>{}});
 expect(sweep.advance(state,1792).visited).toBe(0);expect(state.cursor).toBe(0);sweep.advance(state,1793);expect(state.cursor).toBe(snowVisitsPerLocalTick(64)%64);expect(state.lastTick).toBe(1793);expect(()=>sweep.advance(state,1795)).toThrow(/discontinuous/);
});
test('terrain-radius fact is explicitly zero for current Core; actual radial falloff preserves boundary, bounds and chance-draw ordering',()=>{
 expect(initialTerrainMeltSnowRadius256({terrain:'water-shallow'})).toBe(0);expect(initialTerrainMeltSnowRadius256({terrain:'soil-natural'})).toBe(0);expect(initialTerrainMeltSnowRadius256({terrain:'water-shallow',bridge:true})).toBe(0);
 const depths=new Float32Array(49);depths.fill(1);const rng=new WorldGenerationRandom(8);
 addInitialSnowRadial256({width:7,height:7,depths,center:24,radius:2,retains:()=>true},rng);
 expect(depths[24]).toBe(0);expect(depths[25]).toBe(.5);expect(depths[26]).toBe(1);expect(depths[0]).toBe(1);expect(rng.state.counter).toBe(0);
 const other=new Float32Array(49);other.fill(1);addInitialSnowRadial256({width:7,height:7,depths:other,center:24,radius:2.1,retains:()=>true},rng);expect(rng.state.counter).toBeGreaterThan(0);
});
test('old/adopted/partially populated landscapes cannot receive new history; physical preparation remains clock-neutral',()=>{
 const old=landscape();old.schemaVersion=255;expect(()=>initializeGeographicSnowSurface256(old)).toThrow(/geographic/);expect(()=>prepareInitialSnow256(old,new WorldGenerationRandom(1))).toThrow(/fresh/);
 const stale=landscape(1792);stale.climate={revision:4,tileId:1,adoptedAt:0,calendarOrigin:1500,definition:cold};expect(()=>prepareInitialSnow256(stale,new WorldGenerationRandom(1))).toThrow(/fresh/);
 const existing=landscape();existing.tiles[2]!.snowDepth=.2;const rng=new WorldGenerationRandom(9);expect(()=>prepareInitialSnow256(existing,rng)).toThrow(/fresh/);expect(rng.state.counter).toBe(0);
 const map=landscape(1792),before=structuredClone(map),result=prepareInitialSnow256(map,new WorldGenerationRandom(3));expect(result.depths.some(d=>d>0)).toBe(true);expect(map).toEqual(before);
 initializeGeographicSnowSurface256(map);expect(()=>initializeGeographicSnowSurface256(map)).toThrow(/fresh/);
});
