/** Original local-field orchestrator. Explicit Init provenance, no fabricated
 * Map, arrival clearing, rerolled modifier or guessed pre-Init random counter.
 * This result is pre-ore/pre-flow and retains unresolved roof-collapse work. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import {prepareInitialMapWeather256,type InitialWeatherInputs256} from './initial-weather-256.ts';
import {removeBulkCollapsingNaturalRoofs256} from './roof-natural-generation-256.ts';
import {localGenerationStepSeed,type WorldSiteGeography} from './world-site-geography.ts';
import {orderedCoreLocalMutators256} from './world-local-mutators-256.ts';
import {generateLocalSurfaceFields256,localSurfaceNoisePlan256} from './local-surface-fields-256.ts';
import {localMountainPlan256,createLocalMountainField256,mountainElevation256} from './local-mountain-256.ts';
import {localCaveInitPlan256,generateLocalCaves256,type LocalCaveInitPlan256} from './local-caves-256.ts';
import {localCaveTerrainPlan256,applyLocalCaveTerrain256} from './local-cave-terrain-256.ts';
import {localCoastPlan256,createLocalCoastField256,coastalElevation256,coastalTerrain256,type LocalCoastPlan256} from './local-coast-256.ts';
import {localRiverNoisePlan256,localRiverNode256,createLocalRiverField256,riverTerrainDecision256,type LocalRiverNoisePlan256} from './local-river-256.ts';
import {generateLocalRockFields256} from './local-rock-fields-256.ts';
import {generateLocalTerrain256} from './local-terrain-fields-256.ts';
import {NATURAL_TERRAIN_BINDINGS_256,NATURAL_TERRAIN_DEFINITIONS_256,type NaturalTerrainId256} from './local-terrain-definitions-256.ts';
import {LOCAL_BIOME_RULES_256,type LocalBiomeRules256} from './local-biome-rules-v256.ts';
import {scatterLocalOres256} from './local-ore-scattering-256.ts';
export interface LocalDefinitionContext256 {
 readonly isStartingMap:boolean;readonly mapInitializing:boolean;readonly tutorial:boolean;
 readonly usedRectCells:ReadonlySet<number>;readonly nomadicFactor?:number;
 /** Actual RocksFromGrid definition: Encounter's NoMinerals variant is zero.
  * Isolated Base_Player field controls may omit its ordinary unbounded value. */
 readonly maxValue?:number;
}
export interface LocalInitProvenance256 {
 readonly revision:1; readonly mapSeed:number;
 /** State immediately before the FIRST actual mutator.Init, after real
  * ConstructComponents. A supplied state is evidence, not certified here. */
 readonly seed:number; readonly counter:number; readonly source:string;
}
export interface LocalCompositionInputs256 {
 readonly mineableOwner?:import('./local-mineable-generation-256.ts').MineableGenerationRecorder256;
 readonly width:number;readonly height:number;
 readonly site:Readonly<WorldSiteGeography>;readonly rules:LocalBiomeRules256;
 readonly mutatorCode:number;readonly lakeCoastAngle:number|null;
 readonly init:{readonly random:WorldGenerationRandom;readonly provenance:LocalInitProvenance256};
 readonly preventNaturalElevation?:boolean;readonly preventPatches?:boolean;readonly preventPonds?:boolean;
 /** Omitted only by isolated pre-definition field callers. A completed map
  * must supply the actual campaign/scenario context at RocksFromGrid200. */
 readonly definitionContext?:LocalDefinitionContext256;
 /** Actual Init consumer, before any pushed GenStep. Isolated scalar field
  * controls may omit it; complete home/Camp factories must supply it. */
 readonly initialWeather?:Omit<InitialWeatherInputs256,'biome'|'mutatorCode'|'postMutatorInit'>;
}
export function composeLocalSurface256(input:LocalCompositionInputs256){
 const {width,height,site,rules}=input,n=width*height,p=input.init?.provenance,random=input.init?.random;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>400||height>400||!site||!Number.isInteger(site.mapSeed)||site.mapSeed< -2147483648||site.mapSeed>0xffffffff||!rules||rules!==LOCAL_BIOME_RULES_256[site.biome]||!(random instanceof WorldGenerationRandom)||!p||p.revision!==1||p.mapSeed!==site.mapSeed||p.seed!==(site.mapSeed>>>0)||!Number.isInteger(p.counter)||p.counter<0||p.counter>0xffffffff||typeof p.source!=='string'||!p.source.trim()||random.state.seed!==p.seed||random.state.counter!==p.counter||input.lakeCoastAngle!==null&&(!Number.isFinite(input.lakeCoastAngle)||input.lakeCoastAngle<0||input.lakeCoastAngle>=360))throw Error('Missing actual local Init provenance');
 const ordered=orderedCoreLocalMutators256(input.mutatorCode);
 if(ordered.includes('coast')&&(site.coastAngle===null||!Number.isFinite(site.coastAngle)||site.coastAngle<0||site.coastAngle>=360)||ordered.includes('river')&&(!site.rivers.length||site.riverHeading===null)||!ordered.includes('river')&&site.rivers.length>0||!ordered.includes('coast')&&site.coastAngle!==null)throw Error('Local modifiers disagree with actual geography');
 let caveInit:LocalCaveInitPlan256|undefined,riverInit:LocalRiverNoisePlan256|undefined,coastInit:LocalCoastPlan256|undefined;
 // Init precedes Elevation. Mountain's Init has no draws. No stage stream is
 // reset until its real GenStep frontier; the caller's Init stream advances.
 for(const id of ordered){if(id==='caves')caveInit=localCaveInitPlan256(random);else if(id==='river')riverInit=localRiverNoisePlan256(width,height,random);else if(id==='coast')coastInit=localCoastPlan256(width,height,site.coastAngle!,random);}
 const initEnd=random.state;
 const initialWeather=input.initialWeather?prepareInitialMapWeather256({...input.initialWeather,biome:site.biome as import('./world-biome-selection.ts').WorldLandBiome,mutatorCode:input.mutatorCode,postMutatorInit:initEnd},random):undefined;
 const surfaceSettings={mapSeed:site.mapSeed,hilliness:site.hilliness,waterCovered:site.waterCovered,preventNaturalElevation:input.preventNaturalElevation};
 const surface=generateLocalSurfaceFields256(surfaceSettings,width,height),elevation=surface.elevation,fertility=surface.fertility;
 const postElevation=new WorldGenerationRandom(localGenerationStepSeed(site.mapSeed,1239847543,0));
 let caves:Float32Array=new Float32Array(n);let mountainPlan:ReturnType<typeof localMountainPlan256>|undefined;
 const coastField=coastInit?createLocalCoastField256(coastInit):undefined;
 for(const id of ordered){
  if(id==='mountain'){mountainPlan=localMountainPlan256(width,height,site.coastAngle,input.lakeCoastAngle,postElevation);const mountain=createLocalMountainField256(mountainPlan);for(let z=0;z<height;z++)for(let x=0;x<width;x++){const cell=z*width+x;elevation[cell]=mountainElevation256(elevation[cell]!,mountain(x,z),site.waterCovered);}}
  else if(id==='caves')caves=generateLocalCaves256({width,height,elevation,plan:caveInit!},postElevation);
  else if(id==='coast')for(let z=0;z<height;z++)for(let x=0;x<width;x++){const cell=z*width+x;elevation[cell]=coastalElevation256(elevation[cell]!,coastField!(x,z));}
 }
 const rocks=generateLocalRockFields256({mapSeed:site.mapSeed,width,height,naturalRocks:site.naturalRocks,waterCovered:site.waterCovered,elevation,caves,onNaturalSpawn:(cell,stone)=>input.mineableOwner?.naturalSpawn(cell,stone)});
 const oreStream=new WorldGenerationRandom(localGenerationStepSeed(site.mapSeed,1182952823,0));
 const hilliness=({flat:1,'small-hills':2,'large-hills':3,mountainous:4,impassable:5} as const)[site.hilliness];
 const deposits=input.definitionContext?scatterLocalOres256({width,height,hilliness,waterCovered:site.waterCovered,naturalEdifices:rocks.edifices,caves,...input.definitionContext,onOreSpawn:(cell,ore)=>input.mineableOwner?.oreSpawn(cell,ore,rocks.stones[cell]!)},oreStream):undefined;
 if(deposits)rocks.edifices.set(deposits.edifices);
 const ground=generateLocalTerrain256({mapSeed:site.mapSeed,width,height,rules,elevation,fertility,rockEdifices:rocks.edifices,caves,preventPatches:input.preventPatches,preventPonds:input.preventPonds,onTerrainDecided:(cell,terrain)=>input.mineableOwner?.terrainDecided(cell,terrain)});
 let terrain=ground.terrain;
 // GenStep_Terrain destroys actual unsupported rock edifices AFTER its
 // decision. Roof collapse is a separate unresolved spatial operation.
 const terrainCollapse:number[]=[],riverCollapse:number[]=[];
 for(let cell=0;cell<n;cell++)if(rocks.edifices[cell]&&!NATURAL_TERRAIN_DEFINITIONS_256[terrain[cell]!].supportsRock){input.mineableOwner?.vanish(cell);rocks.edifices[cell]=0;if(deposits)deposits.ores[cell]=null;terrainCollapse.push(cell);}
 rocks.roof=removeBulkCollapsingNaturalRoofs256({width,height,roof:rocks.roof,edifices:rocks.edifices},terrainCollapse);
 const postTerrain=new WorldGenerationRandom(localGenerationStepSeed(site.mapSeed,562343345,0));
 let caveTerrainPlan:ReturnType<typeof localCaveTerrainPlan256>|undefined,riverNode:ReturnType<typeof localRiverNode256>|undefined;
 const fresh=NATURAL_TERRAIN_BINDINGS_256[rules.terrainOverrides.waterShallowTerrain??'WaterShallow'];
 for(const id of ordered){
  if(id==='caves'){caveTerrainPlan=localCaveTerrainPlan256(postTerrain);terrain=applyLocalCaveTerrain256({width,height,elevation,caves,terrain,plan:caveTerrainPlan,shallowFreshWaterAt:()=>fresh,onTerrainDecided:(cell,terrain)=>input.mineableOwner?.terrainDecided(cell,terrain)});}
  else if(id==='river'){
   riverNode=localRiverNode256(riverInit!,site.riverHeading!,site.rivers[0]!.width,postTerrain);const river=createLocalRiverField256(riverInit!,riverNode);
   for(let z=0;z<height;z++)for(let x=0;x<width;x++){const cell=z*width+x,edifice=rocks.edifices[cell]===1,decision=riverTerrainDecision256(terrain[cell]!,edifice,river.sample(x,z),rules);
    if(decision.destroyEdifice){input.mineableOwner?.vanish(cell);rocks.edifices[cell]=0;if(deposits)deposits.ores[cell]=null;}if(decision.clearRoof)rocks.roof[cell]=0;if(decision.collapseRoof)riverCollapse.push(cell);
    if(decision.terrain!==undefined){terrain[cell]=decision.terrain;input.mineableOwner?.terrainDecided(cell,decision.terrain);}if(decision.elevation!==undefined)elevation[cell]=decision.elevation;
   }
   rocks.roof=removeBulkCollapsingNaturalRoofs256({width,height,roof:rocks.roof,edifices:rocks.edifices},riverCollapse);
  }else if(id==='coast'){
   const roles={deep:NATURAL_TERRAIN_BINDINGS_256[rules.terrainOverrides.oceanDeepTerrain??'WaterOceanDeep'],shallow:NATURAL_TERRAIN_BINDINGS_256[rules.terrainOverrides.oceanShallowTerrain??'WaterOceanShallow'],beach:NATURAL_TERRAIN_BINDINGS_256[rules.terrainOverrides.coastalBeachTerrain??'Sand']};
   for(let z=0;z<height;z++)for(let x=0;x<width;x++){const cell=z*width+x,next=coastalTerrain256(terrain[cell]!,rocks.edifices[cell]===1,coastField!(x,z),roles);if(next!==undefined){terrain[cell]=next;input.mineableOwner?.terrainDecided(cell,next);}}
  }
 }
 return {width,height,elevation,fertility,caves,terrain,rocks,deposits,...initialWeather?{initialWeather}:{},
  plans:{init:{caves:caveInit,river:riverInit,coast:coastInit},surface:localSurfaceNoisePlan256(surfaceSettings),mountain:mountainPlan,caveTerrain:caveTerrainPlan,river:riverNode,patches:ground.patchSeeds},
  random:{initStart:{...p},initEnd,postElevation:postElevation.state,ores:deposits?.random,terrain:ground.randomState,postTerrain:postTerrain.state},
  roofCleanup:{terrain:terrainCollapse,river:riverCollapse},
  unresolved:{riverFlowLookup:riverNode!==undefined,oreScattering:deposits===undefined},
  frontier:deposits?'post-terrain-before-flow-and-definition-steps' as const:'post-terrain-before-flow-and-ore' as const};
}
