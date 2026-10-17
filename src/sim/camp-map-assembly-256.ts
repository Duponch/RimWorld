import {planVanishGeneratedAncient256} from './generated-ancient-vanish-256.ts';
import {prepareWorldAnimalGeneration256} from './world-pawn-generation-256.ts';
import {actualCampWorldPawnSituation256,actualCampWorldPawnWeight256} from './camp-world-pawn-authority-256.ts';
import {validateGeneratedLocalMap256} from './serialization.ts';
import {adoptFluIncidents} from './flu-incidents.ts';
/** ONE fresh Encounter/Camp, Core-only, prospective256. Every phase uses
 * the same original map. No legacy World, entering pawn, item, reroll, Shrine
 * or Hive is manufactured. A failure returns NO candidate map or prefix. */
import type {World} from './types.ts';
import type {GeographicPlanetState} from './planet-state.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {CampaignField} from './secondary-site-state.ts';
import {CAMPAIGN_FIELDS} from './secondary-site-state.ts';
import {prepareGeographicPhysicalMap256} from './geographic-map-physical-256.ts';
import {validateCapturedGeographicMapInit256,type CapturedGeographicMapInit256} from './geographic-map-init-context-256.ts';
import {planetGeography256} from './planet-geography-256.ts';
import {describeWorldSite,localGenerationStepSeed} from './world-site-geography.ts';
import {WorldGenerationRandom} from './world-generation-random.ts';
import {CORE_4871_GEN_STEP_DEFS,CORE_4871_PAWN_KIND_ORDER} from './core-definition-order-4871.ts';
import {orderedCoreLocalMutators256} from './world-local-mutators-256.ts';
import {populateGeographicRoads256} from './geographic-roads-256.ts';
import type {LocalRoadAngularMath256} from './local-road-generation-256.ts';
import {generateMonumentRuins750256} from './ancient-monument-spawn-256.ts';
import {ANCIENT_STEP_SEEDS_256,type AncientRect256} from './local-ancient-placement-256.ts';
import {CORE_MONUMENT_CATALOGUE_256,validateMonumentCatalogue256,type MonumentCatalogue256} from './ancient-monument-plan-256.ts';
import {findPlayerStartSpot256,PLAYER_START_SEED_PART_256} from './player-start-256.ts';
import {populateGeographicInitialPlants256} from './geographic-initial-plants-256.ts';
import {generateLocalGeysers256} from './local-geyser-generation-256.ts';
import {planVanishMineable256} from './local-mineable-owner-256.ts';
import {localBiomeRules256} from './local-biome-rules-v256.ts';
import {populateGeographicRockChunks256,ROCK_CHUNKS_SEED_PART_256} from './geographic-rock-chunks-256.ts';
import {initializeGeographicInitialSnow256,INITIAL_SNOW_SEED_PART_256} from './initial-snow-256.ts';
import {produceInitialAnimals256,INITIAL_ANIMALS_SEED_PART_256,GEOGRAPHIC_FAUNA_PROFILE_256} from './initial-animals-256.ts';
import {captureRandomClosewalk256} from './random-closewalk-256.ts';
import {initializeExploration256,INITIAL_FOG_SEED_PART_256,type FogEdgeSelectionContext256} from './exploration-initial-256.ts';
import {captureActualFogPhysical256} from './exploration-physical-256.ts';
import {captureGeographicGenerationReachability256} from './geographic-generation-reachability-256.ts';
import {generateLocalRiverFlow256} from './local-river-flow-256.ts';
import {packRiverWater256} from './river-water-owner-256.ts';
import {isNaturalTerrain256,NATURAL_TERRAIN_DEFINITIONS_256} from './local-terrain-definitions-256.ts';
import {footprintCells} from './definitions.ts';

/** Actual observed03 order/index. Indices sort equal orders; SeedPart ordinal
 * counts earlier SAME parts and is0 for every admitted Encounter step here.
 * Common875 is visited but does not generate a starting scenario on a camp. */
const ENCOUNTER_STEPS_256=new Set(['ElevationFertility','MutatorPostElevationFertility','RocksFromGrid_NoMinerals','Terrain','MutatorPostTerrain','Roads','MutatorCriticalStructures','MutatorNonCriticalStructures','ScatterRuinsSimple','FindPlayerStartSpot','ScenParts','Plants','SteamGeysers','RockChunks','Snow','Animals','Fog','MutatorFinal']);
export const ENCOUNTER_GENERATION_ORDER_256=Object.freeze(CORE_4871_GEN_STEP_DEFS.filter(row=>ENCOUNTER_STEPS_256.has(row.defName)).sort((a,b)=>a.order-b.order||a.index-b.index).map(row=>Object.freeze({...row})));
export const CAMP_STEAM_GEYSERS_SEED_PART_256=1158116095;
export const ENCOUNTER_ORDER_SOURCE_256='Core4871 native def-order03.xml; Core-only Encounter/CommonMapBase';
export interface CampGenerationSource256 {readonly source:string;readonly atTick:number;readonly nextId:number;readonly tile:number}
export interface CampMapInputs256 {
 /** Plain captured shared fields, no World and no live forwarding writers.
  * Arrays/registries remain their original read-only references in generation. */
 readonly campaign:Pick<World,CampaignField> & {readonly schemaVersion:256;readonly planet:GeographicPlanetState;readonly worldFactions:NonNullable<World['worldFactions']>};
 readonly tile:number;readonly size:200;readonly calendarOrigin:number;
 readonly daysPassedSinceSettle:number;
 readonly provenance:CampGenerationSource256;
 readonly init?:CapturedGeographicMapInit256;
 readonly context:{readonly tutorial:boolean;readonly nomadicFactor:number;readonly layoutRects:readonly AncientRect256[];readonly usedRects:readonly AncientRect256[]};
 readonly angular:LocalRoadAngularMath256;
 /** Actual global adjacent static state, never a default identity permutation. */
 readonly chunks:{readonly adjacentPermutation:readonly number[];readonly provenance:CampGenerationSource256};
 readonly animals:{readonly pawnKindOrder:readonly string[];readonly unspawned:readonly WildAnimal[];readonly runtimeRng:number;readonly provenance:CampGenerationSource256};
 /** If provided, this must be the actual prior CellFinder static edge list.
  * Absence means genuinely unmaterialized; initializeExploration owns lazy creation. */
 readonly fog:{readonly rootsToUnfog:readonly number[];readonly edgeContext?:FogEdgeSelectionContext256;readonly provenance:CampGenerationSource256};
 readonly monumentCatalogue?:MonumentCatalogue256;
 /** Needed only for a REAL non-Mineable edifice in Geyser ClearSpace. It must
  * return an infallible actual no-product generation removal, never damage,
  * free salvage, owner deletion without retirement or a boolean placeholder. */
 readonly planOtherGeyserEdificeRemoval?:(world:World,cell:number)=>{id:number;commit():void}|null;
}
export interface CampMapProgress256 {readonly phase:string;readonly completed?:number;readonly total?:number}
export type CampMapResult256=
 |{readonly status:'ready';readonly world:World;readonly nextId:number;readonly rng:number;readonly start:number|null;
   readonly riverFlow:ReturnType<typeof generateLocalRiverFlow256>|null;
   readonly initialGrowth:Extract<ReturnType<typeof produceInitialAnimals256>,{status:'ready'}>['initialGrowth'];
   readonly adjacentPermutation:readonly number[];readonly adjacentUses:number;readonly edgeContext?:FogEdgeSelectionContext256;
   readonly steps:readonly {phase:string;random?:Readonly<{seed:number;counter:number}>}[];
   readonly initialization:ReturnType<typeof prepareGeographicPhysicalMap256>['initialization'];
   readonly worldAnimalGeneration:ReturnType<typeof prepareWorldAnimalGeneration256>;
   readonly frontier:'generated-encounter-before-entry-and-campaign-adoption'}
 |{readonly status:'blocked';readonly phase:string;readonly reason:string;readonly animal?:Extract<ReturnType<typeof produceInitialAnimals256>,{status:'blocked'}>};
const sourced=(s:CampGenerationSource256,w:CampMapInputs256)=>!!s&&typeof s.source==='string'&&!!s.source.trim()&&s.atTick===w.campaign.tick&&s.nextId===w.campaign.nextId&&s.tile===w.tile;
const validRect=(r:AncientRect256)=>[r.minX,r.minZ,r.maxX,r.maxZ].every(Number.isSafeInteger)&&r.minX<=r.maxX&&r.minZ<=r.maxZ;
/** Before the first supplied Init draw or new-map allocation. This proves
 * consistency, not authenticity of an externally captured input's label. */
export function preflightCampMap256(input:CampMapInputs256):void {
 const c=input?.campaign;
 if(!c||typeof c!=='object'||Array.isArray(c))throw Error('Missing captured campaign data');
 for(const key of Reflect.ownKeys(c)){const d=Object.getOwnPropertyDescriptor(c,key)!;if(typeof key!=='string'||!(CAMPAIGN_FIELDS as readonly string[]).includes(key)||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('Camp shared input must be captured data, never a World/accessor');}
 if(c.schemaVersion!==256||input.size!==200||!Number.isSafeInteger(c.tick)||c.tick<0||!Number.isSafeInteger(c.tick*10)||!Number.isSafeInteger(c.nextId)||c.nextId<1||!Number.isSafeInteger(c.rng)||c.rng<1||c.rng>0xffffffff||!Number.isSafeInteger(input.calendarOrigin)||!sourced(input.provenance,input))throw Error('Missing captured Camp256 ownership/clock frontier');
 for(const key of ['schemaVersion','tick','rng','nextId','planet','worldFactions','foodPolicies','nextFoodPolicyId','apparelPolicies','nextApparelPolicyId','foodRules','restRules'] as const)if(!Object.hasOwn(c,key))throw Error('Captured campaign shared authority is incomplete');
 if(c.planet.revision!==3||!c.worldFactions||c.worldFactions.generatedAt>c.tick)throw Error('Missing actual geographic/faction authority');
 if(!c.worldPawns||c.worldPawns.atCore!==c.tick*10)throw Error('Actual Camp1200 WorldPawns owner is absent or stale');
 if(!Number.isSafeInteger(input.daysPassedSinceSettle)||input.daysPassedSinceSettle<0)throw Error('Missing actual campaign initial-weather settlement age');
 const owner=planetGeography256(c.planet);if(!Number.isInteger(input.tile)||input.tile<0||input.tile>=owner.surface.tiles.length)throw Error('Camp tile outside actual geography');
 const site=describeWorldSite(owner.surface,owner.roads,input.tile);orderedCoreLocalMutators256(owner.mutators[input.tile]!);
 if(ENCOUNTER_GENERATION_ORDER_256.length!==18)throw Error('Observed Encounter GenStep registry is incomplete');
 if(!input.context||typeof input.context.tutorial!=='boolean'||!Number.isFinite(input.context.nomadicFactor)||input.context.nomadicFactor<0||!Array.isArray(input.context.layoutRects)||!Array.isArray(input.context.usedRects)||[...input.context.layoutRects,...input.context.usedRects].some(r=>!validRect(r)))throw Error('Missing actual Camp definition context');
 if(!input.angular||typeof input.angular.horizontal!=='function'||typeof input.angular.flatAngle!=='function'||typeof input.angular.angleDifference!=='function')throw Error('Actual road angular boundary unavailable');
 const chunks=input.chunks;if(!chunks||!sourced(chunks.provenance,input)||!Array.isArray(chunks.adjacentPermutation)||chunks.adjacentPermutation.length!==8||new Set(chunks.adjacentPermutation).size!==8||chunks.adjacentPermutation.some(v=>!Number.isInteger(v)||v<0||v>7))throw Error('Actual adjacent permutation unavailable');
 const animals=input.animals;if(!animals||!sourced(animals.provenance,input)||!Array.isArray(animals.pawnKindOrder)||animals.pawnKindOrder.length!==107||new Set(animals.pawnKindOrder).size!==107||animals.pawnKindOrder.some((v,i)=>v!==CORE_4871_PAWN_KIND_ORDER[i])||!Array.isArray(animals.unspawned)||!Number.isInteger(animals.runtimeRng)||animals.runtimeRng<1||animals.runtimeRng>0xffffffff)throw Error('Actual ordered species/retained originals/runtime RNG unavailable');
 if(!input.fog||!sourced(input.fog.provenance,input)||!Array.isArray(input.fog.rootsToUnfog)||input.fog.rootsToUnfog.some(v=>!Number.isInteger(v)||v<0||v>=40000))throw Error('Actual fog root context unavailable');
 validateMonumentCatalogue256(input.monumentCatalogue??CORE_MONUMENT_CATALOGUE_256);
 if(input.init!==undefined)validateCapturedGeographicMapInit256(input.init,site.mapSeed,200,200);
}
/** A synchronous generator: only new private owners are modified. Discard the
 * entire invocation on cancellation/blocked; never adopt a yielded prefix. */
export function* assembleEncounterCamp256(input:CampMapInputs256):Generator<CampMapProgress256,CampMapResult256,void> {
 let phase='preflight';const steps:{phase:string;random?:Readonly<{seed:number;counter:number}>}[]=[];
 try {
  preflightCampMap256(input);const c=Object.freeze({...input.campaign}),usedRects=input.context.usedRects.map(r=>({...r})),layoutRects=input.context.layoutRects;
  phase='physical10-220';yield {phase};
  const physical=prepareGeographicPhysicalMap256({planet:c.planet,factions:c.worldFactions,tile:input.tile,width:200,height:200,tick:c.tick,calendarOrigin:input.calendarOrigin,nextId:c.nextId,rng:c.rng,
   ...(input.init?{init:input.init}:{}),initialWeather:{gameInitDataPresent:false,daysPassedSinceSettle:input.daysPassedSinceSettle},definitionContext:{isStartingMap:false,mapInitializing:true,tutorial:input.context.tutorial,nomadicFactor:input.context.nomadicFactor,maxValue:0,usedRectCells:new Set(usedRects.flatMap(r=>{const out:number[]=[];for(let z=Math.max(0,r.minZ);z<=Math.min(199,r.maxZ);z++)for(let x=Math.max(0,r.minX);x<=Math.min(199,r.maxX);x++)out.push(z*200+x);return out;}))}});
  const {world:w,description,composition}=physical;
  // Keep local physical calendars but carry captured shared authorities. No
  // forwarding setter is installed until ROOT's actual campaign adoption.
  const postPhysicalNextId=w.nextId;
  for(const key of CAMPAIGN_FIELDS){if(key==='nextId')continue;const d=Object.getOwnPropertyDescriptor(c,key);if(d)Object.defineProperty(w,key,{value:d.value,enumerable:true,configurable:true,writable:true});else delete (w as unknown as Record<string,unknown>)[key];}
  if(w.nextId!==postPhysicalNextId)throw Error('Shared authority transfer rewound the actual Mineable allocator');
  if(w.climate?.revision!==4)throw Error('Actual Camp climate owner is missing');
  w.expeditionSite={tile:input.tile,createdAt:c.tick,calendarOffset:w.climate.calendarOrigin-input.calendarOrigin-c.tick};
  // Same prospective local disease-calendar producer as existing new sites.
  // It does not age people, spend the campaign RNG or replay past checks.
  if(w.gameProfile)adoptFluIncidents(w);
  const stream=(seedPart:number)=>new WorldGenerationRandom(localGenerationStepSeed(description.mapSeed,seedPart,0));
  steps.push({phase,random:composition.random.postTerrain});
  phase='roads390';yield {phase};populateGeographicRoads256(w,usedRects,input.angular);steps.push({phase});
  // The four admitted Core-only mutators have no critical/noncritical
  // structures override; their actual nontrivial fields ran in composition.
  steps.push({phase:'mutators500-700-no-structure-overrides'});
  phase='ruins750';yield {phase};const ruins=stream(ANCIENT_STEP_SEEDS_256.ruins);generateMonumentRuins750256(w,{startingMap:false,waterCovered:description.waterCovered,mapInitializing:true,layoutRects,usedRects},ruins,input.monumentCatalogue??CORE_MONUMENT_CATALOGUE_256);steps.push({phase,random:ruins.state});
  phase='start850';yield {phase};const startRandom=stream(PLAYER_START_SEED_PART_256),rect=(r:AncientRect256)=>({minX:r.minX,minZ:r.minZ,width:r.maxX-r.minX+1,height:r.maxZ-r.minZ+1});
  const start=findPlayerStartSpot256({map:w,layoutRects:layoutRects.map(rect),usedRects:usedRects.map(rect)},startRandom);steps.push({phase,random:startRandom.state});
  steps.push({phase:'scenParts875-no-starting-scenario-on-camp'});
  phase='plants900';yield {phase};const plants=populateGeographicInitialPlants256(w);let plant=plants.next();while(!plant.done){yield {phase,completed:plant.value.completed,total:plant.value.total};plant=plants.next();}steps.push({phase,random:plant.value.stepState});
  phase='geysers950';yield {phase};const geysers=stream(CAMP_STEAM_GEYSERS_SEED_PART_256),rules=localBiomeRules256(description.biome,256);if(!rules)throw Error('Actual camp biome rules unavailable');
  generateLocalGeysers256(w,{waterCovered:description.waterCovered,biomeFactor:rules.scalars.geyserCountFactor,mutatorFactors:[],layoutRects,usedRects,ancientCaskets:[],mapInitializing:true,
   planEdificeRemoval(cell){const mineable=w.tiles[cell]?.mineable;if(mineable)return planVanishMineable256(w,cell,mineable.id,true);const owners=w.structures.filter(s=>footprintCells(s).some(p=>p.z*w.width+p.x===cell));if(owners.length!==1)return null;const plan=input.planOtherGeyserEdificeRemoval?input.planOtherGeyserEdificeRemoval(w,cell):planVanishGeneratedAncient256(w,cell,true);return plan?.id===owners[0]!.id?plan:null;}},geysers);steps.push({phase,random:geysers.state});
  phase='chunks970';yield {phase};const chunksRandom=stream(ROCK_CHUNKS_SEED_PART_256),chunks=populateGeographicRockChunks256(physical,input.chunks,chunksRandom);steps.push({phase,random:chunksRandom.state});
  phase='snow1150';yield {phase};const snow=stream(INITIAL_SNOW_SEED_PART_256);initializeGeographicInitialSnow256(w,snow);steps.push({phase,random:snow.state});
  phase='animals1200';yield {phase};const animalRandom=stream(INITIAL_ANIMALS_SEED_PART_256);
  if(!c.worldPawns)throw Error('Actual Camp1200 WorldPawns owner is absent');
  const worldAnimalGeneration=prepareWorldAnimalGeneration256(c.worldPawns,{tick:w.tick,nextId:w.nextId,random:animalRandom,situation:actualCampWorldPawnSituation256,weight:actualCampWorldPawnWeight256});
  const animals=produceInitialAnimals256(w,{random:animalRandom,pawnKindOrder:input.animals.pawnKindOrder,unspawnedAnimals:input.animals.unspawned,closewalk:captureRandomClosewalk256(w),worldGeneration:worldAnimalGeneration});
  if(animals.status==='blocked')return {status:'blocked',phase,reason:animals.reason,animal:animals};
  w.wildlife={profile:GEOGRAPHIC_FAUNA_PROFILE_256,rng:input.animals.runtimeRng,animals:animals.originals,eatenPlants:0,eatenNutrition:0,eatenItems:0};w.nextId=animals.nextId;steps.push({phase,random:animalRandom.state});
  phase='fog1500';yield {phase};const fogRandom=stream(INITIAL_FOG_SEED_PART_256),reach=captureGeographicGenerationReachability256(w),fog=initializeExploration256(w,{start:start.cell,rootsToUnfog:input.fog.rootsToUnfog,readers:{standable:reach.physical.standable,roofed:reach.physical.roofed,canReachMapEdgeNoPassClosedDoorsOrWater:reach.canReachMapEdgeNoPassClosedDoorsOrWater},...(input.fog.edgeContext?{edgeContext:{...input.fog.edgeContext,edgeCells:[...input.fog.edgeContext.edgeCells]}}:{})},captureActualFogPhysical256(w),fogRandom);steps.push({phase,random:fogRandom.state});
  phase='flowPostFog1600';yield {phase};let riverFlow:ReturnType<typeof generateLocalRiverFlow256>|null=null;
  if(composition.plans.init.river||composition.plans.river){if(!composition.plans.init.river||!composition.plans.river)throw Error('Actual river Init/node pair is incomplete');riverFlow=generateLocalRiverFlow256({plan:composition.plans.init.river,node:composition.plans.river,isRiver:cell=>{const t=w.tiles[cell]!;return !t.floor&&!t.bridge&&isNaturalTerrain256(t.terrain)&&NATURAL_TERRAIN_DEFINITIONS_256[t.terrain].river;}});w.riverWater=packRiverWater256(riverFlow.values,w.width,w.height);}steps.push({phase});
  if(w.pawns.length||w.startingArrival||w.jobs.length||w.stockpiles.length||w.growingZones.length||w.planet!==c.planet||w.worldFactions!==c.worldFactions||w.tick!==c.tick||w.rng!==c.rng)throw Error('Camp acquired a starting scenario, foreign authority or advanced clock');
  // Fresh physical owners only; foreign faction leaders/shared knowledge are
  // references outside this map. Identity holes from true Vanish stay holes.
  const reused=new Set(worldAnimalGeneration.selectedOriginals.map(a=>a.id));
  const ids=new Set<number>(),add=(id:number)=>{if(!Number.isSafeInteger(id)||id<c.nextId&&!reused.has(id)||id>=w.nextId||ids.has(id))throw Error('Generated Camp original collides or leaves its captured identity frontier');ids.add(id);};
  // Small candidate owner projection excludes the selected originals while
  // local guards admit their private redress outcomes. Root is untouched.
  w.worldPawns=worldAnimalGeneration.candidateState;
  for(const tile of w.tiles)if(tile.mineable)add(tile.mineable.id);
  for(const rows of [w.structures,w.resources,w.piles,w.geysers?.items??[],w.filth?.items??[],w.wildlife?.animals??[]])for(const owner of rows)add(owner.id);
  if(w.packed.length||w.wildlife?.flyers?.length)throw Error('Unrepresented generated Camp holder');
  phase='local-schema';const admission=validateGeneratedLocalMap256(w,{calendarOrigin:input.calendarOrigin});
  if(admission.length)throw Error(`Generated Camp local schema refused: ${admission.join(' ')}`);
  return {status:'ready',world:w,nextId:w.nextId,rng:w.rng,start:start.cell,riverFlow,worldAnimalGeneration,initialGrowth:animals.initialGrowth,adjacentPermutation:chunks.adjacentPermutation,adjacentUses:chunks.adjacentUses,...fog.edgeContext?{edgeContext:fog.edgeContext}:{},steps,initialization:physical.initialization,frontier:'generated-encounter-before-entry-and-campaign-adoption'};
 }catch(error){return {status:'blocked',phase,reason:error instanceof Error?error.message:String(error)};}
}
