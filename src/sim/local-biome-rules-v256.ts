import {LOCAL_BIOME_DATA_256} from './local-biome-data-v256.ts';

export const LOCAL_BIOME_SCHEMA_256=256;
export type NaturalBiomeId256=keyof typeof LOCAL_BIOME_DATA_256;
type DataProfile=typeof LOCAL_BIOME_DATA_256[NaturalBiomeId256];
export type CoreLocalPlantDef256=DataProfile['wildPlants'][number]['defId'];
export type CoreLocalAnimalDef256=DataProfile['wildAnimals'][number]['defId'];
export type CoreLocalTerrainDef256='Soil'|'SoilRich'|'Gravel'|'Marsh'|'MossyTerrain'|'MarshyTerrain'|'Mud'|'Sand'|'SoftSand'|'Ice'|'Riverbank'|'WaterShallow'|'WaterDeep'|'WaterOceanShallow'|'WaterOceanDeep'|'WaterMovingShallow'|'WaterMovingChestDeep';
export const LOCAL_BIOME_TERRAIN_ROLES_256=['coastalBeachTerrain','lakeBeachTerrain','riverbankTerrain','mudTerrain','gravelTerrain','waterShallowTerrain','waterDeepTerrain','oceanShallowTerrain','oceanDeepTerrain','waterMovingShallowTerrain','waterMovingChestDeepTerrain'] as const;
export type LocalBiomeTerrainRole256=typeof LOCAL_BIOME_TERRAIN_ROLES_256[number];
export interface LocalBiomeScalars256 {
 readonly animalDensity:number;readonly plantDensity:number;readonly wildPlantRegrowDays:number;
 readonly wildPlantsCareAboutLocalFertility:boolean;readonly wildAnimalsCanWanderInto:boolean;
 readonly hasBedrock:boolean;readonly noGravel:boolean;readonly isExtremeBiome:boolean;readonly isWaterBiome:boolean;
 readonly canBuildBase:boolean;readonly canAutoChoose:boolean;readonly impassable:boolean;readonly hasVirtualPlants:boolean;
 readonly forageability:number;readonly geyserCountFactor:number;readonly allowRoads:boolean;readonly allowRivers:boolean;
 readonly movementDifficulty:number;readonly settlementSelectionWeight:number;readonly foragedFood:'RawBerries'|'RawAgave'|null;
}
export interface BiomeTerrainThreshold256 {readonly terrain:CoreLocalTerrainDef256;readonly min:number;readonly max:number}
export interface BiomeTerrainPatch256 {
 readonly perlinFrequency:number;readonly perlinLacunarity:number;readonly perlinPersistence:number;readonly perlinOctaves:number;
 readonly minFertility:number;readonly maxFertility:number;readonly minSize:number;readonly isPond:boolean;
 readonly thresholds:readonly BiomeTerrainThreshold256[];
}
export interface BiomeSpeciesWeight256<Def extends string> {readonly defId:Def;readonly commonality:number}
export interface LocalBiomeRules256 {
 readonly defId:string;readonly scalars:LocalBiomeScalars256;
 readonly terrainOverrides:Readonly<Record<LocalBiomeTerrainRole256,CoreLocalTerrainDef256|null>>&{readonly riverbankSizeRange:string|null};
 readonly terrainsByFertility:readonly BiomeTerrainThreshold256[];readonly terrainPatchMakers:readonly BiomeTerrainPatch256[];
 readonly wildPlants:readonly BiomeSpeciesWeight256<CoreLocalPlantDef256>[];readonly wildAnimals:readonly BiomeSpeciesWeight256<CoreLocalAnimalDef256>[];
 readonly totalPlantCommonality:number;readonly totalAnimalCommonality:number;
 readonly extraRockTypes:readonly [];readonly forceRockTypes:null;
}
function freezeFacts<T>(value:T):T {if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeFacts(child);Object.freeze(value);}return value;}
/** A separate prospective table. No World, historical table or RNG is read or changed. */
export const LOCAL_BIOME_RULES_256:Readonly<Record<NaturalBiomeId256,LocalBiomeRules256>>=freezeFacts(LOCAL_BIOME_DATA_256);
export const isNaturalBiome256=(value:unknown):value is NaturalBiomeId256=>typeof value==='string'&&Object.hasOwn(LOCAL_BIOME_RULES_256,value);
export function localBiomeRules256(id:unknown,version:number):LocalBiomeRules256|undefined {
 return Number.isSafeInteger(version)&&version>=LOCAL_BIOME_SCHEMA_256&&isNaturalBiome256(id)?LOCAL_BIOME_RULES_256[id]:undefined;
}
/** Facts include Ocean/Lake. Settlement admission is a distinct operation and
 * does not assert that every non-settleable biome can never host another map. */
export function localBiomeSettlementPermission256(id:unknown,version:number):{ok:true}|{ok:false;reason:'unsupported-biome-or-version'|'non-settleable-biome'} {
 const rules=localBiomeRules256(id,version);return !rules?{ok:false,reason:'unsupported-biome-or-version'}:rules.scalars.canBuildBase&&!rules.scalars.impassable?{ok:true}:{ok:false,reason:'non-settleable-biome'};
}

/** Existing identity contracts, not a declaration of completeness. */
export const EXISTING_BIOME_PLANT_BINDINGS_255={"Plant_Grass":"grass","Plant_TreePine":"pine","Plant_Moss":"moss","Plant_Brambles":"brambles","Plant_TreeBirch":"birch","Plant_TreePoplar":"poplar","Plant_Berry":"berry-bush","Plant_HealrootWild":"healroot-wild","Plant_TallGrass":"tall-grass","Plant_TreeOak":"oak","Plant_Agave":"agave","Plant_SaguaroCactus":"saguaro","Plant_TreeDrago":"drago"} as const;
export const EXISTING_BIOME_ANIMAL_BINDINGS_255={"Hare":"hare","Muffalo":"muffalo","Deer":"deer","Fox_Red":"red-fox","Snowhare":"snow-hare","Gazelle":"gazelle","Dromedary":"dromedary"} as const;
/** Sixteen new IDs confirmed by the plant owner; actual definitions must also
 * pass hasPlant. Merely exporting these IDs does not deliver a species. */
export const PROSPECTIVE_BIOME_PLANT_BINDINGS_256={...EXISTING_BIOME_PLANT_BINDINGS_255,...{"Plant_Alocasia":"alocasia","Plant_Astragalus":"astragalus","Plant_Bush":"bush","Plant_Chokevine":"chokevine","Plant_Clivia":"clivia","Plant_Dandelion":"dandelion","Plant_PincushionCactus":"pincushion-cactus","Plant_Rafflesia":"rafflesia","Plant_ShrubLow":"low-shrub","Plant_TreeBamboo":"bamboo","Plant_TreeCecropia":"cecropia","Plant_TreeCypress":"cypress","Plant_TreeMaple":"maple","Plant_TreePalm":"palm","Plant_TreeTeak":"teak","Plant_TreeWillow":"willow"}} as const;

export interface LocalBiomeCatalog256<P extends string,A extends string,T extends string> {
 readonly plants:Readonly<Partial<Record<CoreLocalPlantDef256,P>>>;readonly hasPlant:(id:P)=>boolean;
 readonly animals:Readonly<Partial<Record<CoreLocalAnimalDef256,A>>>;readonly hasAnimal:(id:A)=>boolean;
 readonly terrains:Readonly<Partial<Record<CoreLocalTerrainDef256,T>>>;readonly hasTerrain:(id:T)=>boolean;
 /** Null overrides mean these real call-site defaults, never absent terrain. */
 readonly terrainDefaults:Readonly<Partial<Record<LocalBiomeTerrainRole256,CoreLocalTerrainDef256>>>;
 readonly riverbankSizeRangeDefault?:readonly [number,number];
}
export interface MissingLocalBiomeContract256 {
 readonly domain:'plant'|'animal'|'terrain'|'terrain-default';readonly defId:string;
 readonly reason:'unbound'|'absent'|'aliased'|'invalid';readonly catalogId?:string;
}
export interface ResolvedBiomeSpecies256<Def extends string,Id extends string> extends BiomeSpeciesWeight256<Def> {readonly catalogId:Id}
export interface ResolvedLocalBiome256<P extends string,A extends string,T extends string> {
 readonly rules:LocalBiomeRules256;
 readonly plants:readonly ResolvedBiomeSpecies256<CoreLocalPlantDef256,P>[];
 readonly animals:readonly ResolvedBiomeSpecies256<CoreLocalAnimalDef256,A>[];
 readonly terrains:readonly {readonly defId:CoreLocalTerrainDef256;readonly catalogId:T}[];
 readonly terrainRoles:Readonly<Record<LocalBiomeTerrainRole256,T>>;
 readonly riverbankSizeRange:readonly [number,number];
}
/** Complete binding of required definitions. Missing weights are not dropped or
 * reassigned. Availability functions must consult concrete adopted catalogs;
 * they are not feature booleans, substitute factories or generation callbacks. */
export function resolveLocalBiomeCatalog256<P extends string,A extends string,T extends string>(rules:LocalBiomeRules256,catalog:LocalBiomeCatalog256<P,A,T>):
 {ok:true;value:ResolvedLocalBiome256<P,A,T>}|{ok:false;missing:readonly MissingLocalBiomeContract256[]} {
 const missing:MissingLocalBiomeContract256[]=[];
 function species<Def extends string,Id extends string>(domain:'plant'|'animal',entries:readonly BiomeSpeciesWeight256<Def>[],bindings:Readonly<Partial<Record<Def,Id>>>,has:(id:Id)=>boolean){
  const result:ResolvedBiomeSpecies256<Def,Id>[]=[],owners=new Map<string,string>();
  for(const entry of entries){const id=bindings[entry.defId];if(id===undefined||id.length===0){missing.push({domain,defId:entry.defId,reason:'unbound'});continue;}
   const owner=owners.get(id);if(owner!==undefined&&owner!==entry.defId){missing.push({domain,defId:entry.defId,catalogId:id,reason:'aliased'});continue;}owners.set(id,entry.defId);
   if(!has(id)){missing.push({domain,defId:entry.defId,catalogId:id,reason:'absent'});continue;}result.push({...entry,catalogId:id});
  }return result;
 }
 const plants=species('plant',rules.wildPlants,catalog.plants,catalog.hasPlant),animals=species('animal',rules.wildAnimals,catalog.animals,catalog.hasAnimal);
 const required=new Set<CoreLocalTerrainDef256>();for(const row of rules.terrainsByFertility)required.add(row.terrain);for(const patch of rules.terrainPatchMakers)for(const row of patch.thresholds)required.add(row.terrain);
 const roleDefs=new Map<LocalBiomeTerrainRole256,CoreLocalTerrainDef256>();for(const role of LOCAL_BIOME_TERRAIN_ROLES_256){const def=rules.terrainOverrides[role]??catalog.terrainDefaults[role];if(def===undefined){missing.push({domain:'terrain-default',defId:role,reason:'unbound'});continue;}roleDefs.set(role,def);required.add(def);}
 const terrains:{defId:CoreLocalTerrainDef256;catalogId:T}[]=[],terrainRoles={} as Record<LocalBiomeTerrainRole256,T>,terrainOwners=new Map<string,CoreLocalTerrainDef256>();
 for(const defId of required){const id=catalog.terrains[defId];if(id===undefined||id.length===0){missing.push({domain:'terrain',defId,reason:'unbound'});continue;}const owner=terrainOwners.get(id);if(owner!==undefined&&owner!==defId){missing.push({domain:'terrain',defId,catalogId:id,reason:'aliased'});continue;}terrainOwners.set(id,defId);if(!catalog.hasTerrain(id)){missing.push({domain:'terrain',defId,catalogId:id,reason:'absent'});continue;}terrains.push({defId,catalogId:id});}
 for(const [role,def] of roleDefs){const id=catalog.terrains[def];if(id!==undefined)terrainRoles[role]=id;}
 let riverbankSizeRange=catalog.riverbankSizeRangeDefault;const ownRange=rules.terrainOverrides.riverbankSizeRange;if(ownRange!==null){const [min,max]=ownRange.split('~').map(Number);riverbankSizeRange=[min!,max!];}
 if(!riverbankSizeRange||riverbankSizeRange.length!==2||!riverbankSizeRange.every(Number.isSafeInteger)||riverbankSizeRange[0]<0||riverbankSizeRange[1]<riverbankSizeRange[0])missing.push({domain:'terrain-default',defId:'riverbankSizeRange',reason:riverbankSizeRange?'invalid':'unbound'});
 if(missing.length)return {ok:false,missing};
 return {ok:true,value:{rules,plants,animals,terrains,terrainRoles,riverbankSizeRange:[riverbankSizeRange![0],riverbankSizeRange![1]]}};
}
/** Inclusive thresholds, first row wins at shared boundaries. No clamps. */
export function firstBiomeTerrainThreshold256(rows:readonly BiomeTerrainThreshold256[],value:number):CoreLocalTerrainDef256|undefined {
 if(!Number.isFinite(value))throw Error('Non-finite biome terrain input.');const actual=Math.fround(value);return rows.find(row=>actual>=Math.fround(row.min)&&actual<=Math.fround(row.max))?.terrain;
}
export type LocalBiomeTerrainChoice256=
 |{status:'chosen';terrain:string;source:'patch'|'landform'|'fertility'|'fallback';patchIndex?:number}
 |{status:'needs-patch-field';patchIndex:number}
 |{status:'needs-component';patchIndex:number;terrain:CoreLocalTerrainDef256;minimum:number}
 |{status:'none'};
/** Receives already prepared patch fields. This selector does not manufacture
 * Perlin seeds/components or consume RNG. The caller lazily seeds a patch only
 * when invoked, preserving its isolated construction stream and patch order.
 * Elevation/gravel/rock handling follows patches, supplied by the local builder. */
export function selectLocalBiomeTerrain256(rules:LocalBiomeRules256,options:{fertility:number;
 samplePatch:(index:number,patch:BiomeTerrainPatch256)=>{value:number;componentSize?:number}|undefined;
 patchAllowed?:(index:number,patch:BiomeTerrainPatch256)=>boolean;
 afterPatches?:()=>string|undefined;fallbackTerrain?:CoreLocalTerrainDef256}):LocalBiomeTerrainChoice256 {
 if(!Number.isFinite(options.fertility))throw Error('Non-finite biome fertility.');
 for(let index=0;index<rules.terrainPatchMakers.length;index++){
  const patch=rules.terrainPatchMakers[index]!;if(Math.fround(options.fertility)<Math.fround(patch.minFertility)||Math.fround(options.fertility)>Math.fround(patch.maxFertility)||options.patchAllowed&&!options.patchAllowed(index,patch))continue;
  const sample=options.samplePatch(index,patch);if(sample===undefined)return {status:'needs-patch-field',patchIndex:index};
  const terrain=firstBiomeTerrainThreshold256(patch.thresholds,sample.value);if(terrain===undefined)continue;
  if(patch.minSize>0){if(sample.componentSize===undefined)return {status:'needs-component',patchIndex:index,terrain,minimum:patch.minSize};if(!Number.isSafeInteger(sample.componentSize)||sample.componentSize<0)throw Error('Invalid biome patch component size.');if(sample.componentSize<patch.minSize)continue;}
  return {status:'chosen',terrain,source:'patch',patchIndex:index};
 }
 const landform=options.afterPatches?.();if(landform!==undefined)return {status:'chosen',terrain:landform,source:'landform'};
 const terrain=firstBiomeTerrainThreshold256(rules.terrainsByFertility,options.fertility);if(terrain!==undefined)return {status:'chosen',terrain,source:'fertility'};
 return options.fallbackTerrain===undefined?{status:'none'}:{status:'chosen',terrain:options.fallbackTerrain,source:'fallback'};
}
/** A caller-supplied unit roll, no RNG calls or replacement interval. Order is
 * the explicit profile order; it is not a native seed/output parity claim. */
export function weightedBiomeDefinition256<Def extends string>(entries:readonly BiomeSpeciesWeight256<Def>[],roll:number):Def|undefined {
 if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('Biome species roll must be in [0,1).');
 let total=0;for(const entry of entries){if(!Number.isFinite(entry.commonality)||entry.commonality<=0)throw Error('Invalid biome species weight.');total+=entry.commonality;}
 if(!entries.length)return undefined;let remaining=roll*total;for(const entry of entries){remaining-=entry.commonality;if(remaining<0)return entry.defId;}return entries.at(-1)!.defId;
}
