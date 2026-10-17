import {expect,test} from 'vitest';
import {LOCAL_BIOME_RULES_256,firstBiomeTerrainThreshold256} from '../src/sim/local-biome-rules-v256.ts';
import {NATURAL_TERRAIN_DEFINITIONS_256 as terrain,naturalTerrainHas256} from '../src/sim/local-terrain-definitions-256.ts';
import {createBiomePatchFields256,generateLocalTerrain256,terrainPatchComponentSizes256} from '../src/sim/local-terrain-fields-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
test('fertile marshy soil, bare mud, soft sand and bridge have distinct real supports',()=>{
 expect(naturalTerrainHas256('marshy-soil','Light')).toBe(true);expect(naturalTerrainHas256('marshy-soil','Heavy')).toBe(false);expect(terrain['marshy-soil'].fertility).toBe(1);
 expect(naturalTerrainHas256('mud','Bridgeable')).toBe(true);expect(naturalTerrainHas256('mud','Light')).toBe(false);expect(terrain.mud.extraDeterioration).toBe(0);
 expect(naturalTerrainHas256('soft-sand','Light')).toBe(true);expect(naturalTerrainHas256('soft-sand','Bridgeable')).toBe(false);expect(()=>naturalTerrainHas256('soft-sand','Light',true)).toThrow();
 expect(naturalTerrainHas256('river-chest-deep','Light',true)).toBe(true);expect(naturalTerrainHas256('river-chest-deep','Heavy',true)).toBe(false);expect(naturalTerrainHas256('marshy-soil','GrowSoil',true)).toBe(false);
});
test('water physical cost is independent of perception, with deep water closed and inherited fire/snow/filth rules',()=>{
 expect(terrain['river-chest-deep'].pathCostCore).toBe(42);expect(terrain['river-chest-deep'].perceivedCivilCore).toBe(180);expect(terrain['river-chest-deep'].perceivedDraftedCore).toBe(18);
 expect(naturalTerrainHas256('water-deep','Walkable')).toBe(false);expect(naturalTerrainHas256('ocean-deep','Bridgeable')).toBe(false);
 for(const id of ['marsh','ocean-shallow','river-shallow'] as const){expect(terrain[id].extinguishesFire).toBe(true);expect(terrain[id].holdsSnow).toBe(false);expect(terrain[id].acceptsUnnaturalFilth).toBe(false);expect(terrain[id].extraDeterioration).toBe(3);}
 expect(terrain.ice.water).toBe(false);expect(terrain.ice.holdsSnow).toBe(true);
});
test('patch connectivity includes unlike admitted thresholds, ignores fertility internally and excludes diagonal-only neighbours',()=>{
 const values=new Float32Array(64).fill(-1),thresholds=[{terrain:'Sand',min:.2,max:.4},{terrain:'WaterShallow',min:.4,max:.6}] as const;
 // Twelve adjacent cells of two terrain rows, followed by one cardinal cell.
 for(const cell of [0,1,2,3,4,5,6,7,8,9,10,11])values[cell]=cell%2?Math.fround(.3):Math.fround(.5);
 values[19]=Math.fround(.3);values[28]=Math.fround(.3);
 const sizes=terrainPatchComponentSizes256(values,thresholds,8,8);expect(sizes[0]).toBe(13);expect(sizes[19]).toBe(13);expect(sizes[28]).toBe(1);expect(sizes[63]).toBe(-1);
 expect(firstBiomeTerrainThreshold256(thresholds,Math.fround(.2))).toBe('Sand');expect(firstBiomeTerrainThreshold256(thresholds,Math.fround(.4))).toBe('Sand');
});
test('actual patch noise is seeded lazily after fertility admission, once per maker and never on a suppressed pond',()=>{
 const random=new WorldGenerationRandom(123),patches=createBiomePatchFields256(LOCAL_BIOME_RULES_256.desert,random,16,16);
 expect(patches.terrainAt(0,.9)).toBeUndefined();expect(random.state.counter).toBe(0);expect(patches.initialized).toHaveLength(0);
 patches.terrainAt(0,.8);const after=random.state;expect(after.counter).toBe(1);patches.terrainAt(1,.8);expect(random.state).toEqual(after);
 const suppressedRandom=new WorldGenerationRandom(123),suppressed=createBiomePatchFields256(LOCAL_BIOME_RULES_256['boreal-forest'],suppressedRandom,16,16);
 suppressed.terrainAt(0,1,{preventPatches:true});expect(suppressedRandom.state.counter).toBe(0);
 const withNoPond=structuredClone(LOCAL_BIOME_RULES_256['boreal-forest']);withNoPond.terrainPatchMakers.forEach(p=>{(p as {isPond:boolean}).isPond=true;});
 const noPond=createBiomePatchFields256(withNoPond,suppressedRandom,16,16);noPond.terrainAt(0,1,{preventPonds:true});expect(suppressedRandom.state.counter).toBe(0);
});
test('base ground uses actual float thresholds and rock/cave grids; it does not invent rock from biome or overwrite old soil',()=>{
 const input={mapSeed:77,width:8,height:8,rules:LOCAL_BIOME_RULES_256['temperate-forest'],elevation:new Float32Array(64).fill(.2),fertility:new Float32Array(64).fill(.6),rockEdifices:new Uint8Array(64),caves:new Float32Array(64),preventPatches:true};
 input.elevation[0]=.55;input.elevation[1]=.56;input.elevation[2]=.61;input.rockEdifices[3]=1;input.caves[4]=1;
 const before=structuredClone(input),result=generateLocalTerrain256(input);expect(result.terrain.slice(0,6)).toEqual(['soil-natural','gravel','rough-stone','rough-stone','rough-stone','soil-natural']);expect(result.randomState.counter).toBe(0);expect(input).toEqual(before);expect(result.terrain).not.toContain('soil');
 input.fertility[10]=NaN;expect(()=>generateLocalTerrain256(input)).toThrow();
});
