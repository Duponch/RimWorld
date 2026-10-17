import {expect,test,vi} from 'vitest';
import {LOCAL_BIOME_RULES_256,LOCAL_BIOME_TERRAIN_ROLES_256,localBiomeRules256,localBiomeSettlementPermission256,PROSPECTIVE_BIOME_PLANT_BINDINGS_256,EXISTING_BIOME_ANIMAL_BINDINGS_255,resolveLocalBiomeCatalog256,firstBiomeTerrainThreshold256,selectLocalBiomeTerrain256,weightedBiomeDefinition256,type LocalBiomeCatalog256,type CoreLocalAnimalDef256,type CoreLocalTerrainDef256} from '../src/sim/local-biome-rules-v256';
/** Identity-only test catalogs, not factories or delivered species/terrain.
 * No World is made and no generation may infer availability from this fixture. */
function catalog():LocalBiomeCatalog256<string,string,string>{
 const animals:Partial<Record<CoreLocalAnimalDef256,string>>={};for(const rules of Object.values(LOCAL_BIOME_RULES_256))for(const entry of rules.wildAnimals)animals[entry.defId]=`test:${entry.defId}`;
 const terrains:Partial<Record<CoreLocalTerrainDef256,string>>={};for(const def of ['Soil','SoilRich','Gravel','Marsh','MossyTerrain','MarshyTerrain','Mud','Sand','SoftSand','Ice','Riverbank','WaterShallow','WaterDeep','WaterOceanShallow','WaterOceanDeep','WaterMovingShallow','WaterMovingChestDeep'] as const)terrains[def]=`test:${def}`;
 return {plants:PROSPECTIVE_BIOME_PLANT_BINDINGS_256,hasPlant:()=>true,animals,hasAnimal:()=>true,terrains,hasTerrain:()=>true,
 terrainDefaults:{coastalBeachTerrain:'Sand',lakeBeachTerrain:'Sand',riverbankTerrain:'Riverbank',mudTerrain:'Mud',gravelTerrain:'Gravel',waterShallowTerrain:'WaterShallow',waterDeepTerrain:'WaterDeep',oceanShallowTerrain:'WaterOceanShallow',oceanDeepTerrain:'WaterOceanDeep',waterMovingShallowTerrain:'WaterMovingShallow',waterMovingChestDeepTerrain:'WaterMovingChestDeep'},riverbankSizeRangeDefault:[6,8]};
}
test('all14 prospective profiles preserve complete weights and sea-ice bedrock while admission stays separate from facts',()=>{
 expect(Object.keys(LOCAL_BIOME_RULES_256)).toHaveLength(14);
 for(const [id,rules] of Object.entries(LOCAL_BIOME_RULES_256)){expect(localBiomeRules256(id,255)).toBeUndefined();expect(localBiomeRules256(id,256)).toBe(rules);expect(rules.wildPlants.reduce((sum,row)=>sum+row.commonality,0)).toBeCloseTo(rules.totalPlantCommonality,10);expect(rules.wildAnimals.reduce((sum,row)=>sum+row.commonality,0)).toBeCloseTo(rules.totalAnimalCommonality,10);expect(resolveLocalBiomeCatalog256(rules,catalog()).ok).toBe(true);}
 expect(localBiomeRules256(' boreal-forest',256)).toBeUndefined();expect(localBiomeRules256('BorealForest',256)).toBeUndefined();
 expect(localBiomeRules256('ocean',256)!.scalars.isWaterBiome).toBe(true);expect(localBiomeRules256('lake',256)).toBeDefined();expect(localBiomeSettlementPermission256('ocean',256)).toEqual({ok:false,reason:'non-settleable-biome'});expect(localBiomeSettlementPermission256('lake',256).ok).toBe(false);
 expect(localBiomeSettlementPermission256('sea-ice',256).ok).toBe(true);expect(LOCAL_BIOME_RULES_256['sea-ice'].scalars.hasBedrock).toBe(false);expect(LOCAL_BIOME_RULES_256['sea-ice'].scalars.canAutoChoose).toBe(false);
});
test('missing concrete species/terrain/defaults yield exact refusals instead of silently reducing or reassigning the profile',()=>{
 const rules=LOCAL_BIOME_RULES_256['boreal-forest'],before=JSON.stringify(rules),complete=catalog(),result=resolveLocalBiomeCatalog256(rules,{...complete,animals:EXISTING_BIOME_ANIMAL_BINDINGS_255,hasPlant:id=>id!=='bush',terrains:{...complete.terrains,Soil:undefined},terrainDefaults:{...complete.terrainDefaults,waterDeepTerrain:undefined}});
 expect(result.ok).toBe(false);if(result.ok)throw Error('Expected incomplete catalog.');
 expect(result.missing).toEqual(expect.arrayContaining([{domain:'plant',defId:'Plant_Bush',catalogId:'bush',reason:'absent'},{domain:'animal',defId:'Yak',reason:'unbound'},{domain:'terrain',defId:'Soil',reason:'unbound'},{domain:'terrain-default',defId:'waterDeepTerrain',reason:'unbound'}]));expect('value' in result).toBe(false);expect(JSON.stringify(rules)).toBe(before);
});
test('aliasing a missing bush to grass or distinct saltwater to freshwater is explicitly rejected',()=>{
 const complete=catalog(),rules=LOCAL_BIOME_RULES_256['boreal-forest'];const result=resolveLocalBiomeCatalog256(rules,{...complete,plants:{...complete.plants,Plant_Bush:'grass'},terrains:{...complete.terrains,WaterOceanShallow:complete.terrains.WaterShallow!}});
 expect(result.ok).toBe(false);if(result.ok)throw Error('Expected alias refusal.');expect(result.missing.some(row=>row.domain==='plant'&&row.defId==='Plant_Bush'&&row.reason==='aliased')).toBe(true);expect(result.missing.some(row=>row.domain==='terrain'&&row.defId==='WaterOceanShallow'&&row.reason==='aliased')).toBe(true);
});
test('inclusive shared thresholds choose the first row, while patchmakers precede landform and fertility',()=>{
 const boreal=LOCAL_BIOME_RULES_256['boreal-forest'];expect(firstBiomeTerrainThreshold256(boreal.terrainsByFertility,.87)).toBe('Soil');expect(firstBiomeTerrainThreshold256(boreal.terrainPatchMakers[0]!.thresholds,.32)).toBe('MossyTerrain');expect(firstBiomeTerrainThreshold256(boreal.terrainPatchMakers[0]!.thresholds,.76)).toBe('Marsh');
 const sample=vi.fn(()=>({value:.5})),landform=vi.fn(()=>'test:rock');expect(selectLocalBiomeTerrain256(LOCAL_BIOME_RULES_256['cold-bog'],{fertility:1,samplePatch:sample,afterPatches:landform})).toEqual({status:'chosen',terrain:'MarshyTerrain',source:'patch',patchIndex:0});expect(sample).toHaveBeenCalledTimes(1);expect(landform).not.toHaveBeenCalled();
});
test('soft-sand needs a real13-cell component and fertility admission before any lazy patch sampling',()=>{
 const desert=LOCAL_BIOME_RULES_256.desert,afterPatches=vi.fn(()=>undefined);
 expect(selectLocalBiomeTerrain256(desert,{fertility:.8,samplePatch:()=>({value:.65}),afterPatches})).toEqual({status:'needs-component',patchIndex:0,terrain:'SoftSand',minimum:13});expect(afterPatches).not.toHaveBeenCalled();
 expect(selectLocalBiomeTerrain256(desert,{fertility:.8,samplePatch:()=>({value:.65,componentSize:12})})).toEqual({status:'chosen',terrain:'Sand',source:'fertility'});
 expect(selectLocalBiomeTerrain256(desert,{fertility:.8,samplePatch:()=>({value:.65,componentSize:13})})).toEqual({status:'chosen',terrain:'SoftSand',source:'patch',patchIndex:0});
 const sample=vi.fn(()=>({value:.9,componentSize:100}));expect(selectLocalBiomeTerrain256(desert,{fertility:.80001,samplePatch:sample})).toEqual({status:'chosen',terrain:'Soil',source:'fertility'});expect(sample).not.toHaveBeenCalled();
});
test('missing patch fields never fall through; explicit patch suppression and later landform remain observable',()=>{
 const rules=LOCAL_BIOME_RULES_256['boreal-forest'],afterPatches=vi.fn(()=>'test:rock');expect(selectLocalBiomeTerrain256(rules,{fertility:1,samplePatch:()=>undefined,afterPatches})).toEqual({status:'needs-patch-field',patchIndex:0});expect(afterPatches).not.toHaveBeenCalled();
 const sample=vi.fn(()=>undefined);expect(selectLocalBiomeTerrain256(rules,{fertility:1,samplePatch:sample,patchAllowed:()=>false,afterPatches})).toEqual({status:'chosen',terrain:'test:rock',source:'landform'});expect(sample).not.toHaveBeenCalled();
});
test('full ordered weights select the missing DefID itself, never a replacement animal or omitted interval',()=>{
 const entries=[{defId:'Plant_Grass',commonality:3},{defId:'Plant_Bush',commonality:1}] as const;expect(weightedBiomeDefinition256(entries,0)).toBe('Plant_Grass');expect(weightedBiomeDefinition256(entries,.75)).toBe('Plant_Bush');expect(weightedBiomeDefinition256(LOCAL_BIOME_RULES_256['boreal-forest'].wildAnimals,0)).toBe('Yak');expect(weightedBiomeDefinition256([],0)).toBeUndefined();for(const roll of [-1,1,NaN,Infinity])expect(()=>weightedBiomeDefinition256(entries,roll)).toThrow();
 expect(LOCAL_BIOME_TERRAIN_ROLES_256).toContain('waterMovingChestDeepTerrain');expect(LOCAL_BIOME_RULES_256['boreal-forest'].terrainOverrides.waterDeepTerrain).toBeNull();
});
