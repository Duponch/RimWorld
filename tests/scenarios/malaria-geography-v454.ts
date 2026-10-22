import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,validateWorld} from '../../src/sim/serialization.ts';
import {planetGeography256} from '../../src/sim/planet-geography-256.ts';
import {generateForeignWorldFactions256,completeWorldFactionRegistry256} from '../../src/sim/world-faction-generation.ts';
import {WorldGenerationRandom} from '../../src/sim/world-generation-random.ts';
import {canPlaceWorldSettlement} from '../../src/sim/world-settlement-placement.ts';
import {createGeographicPlanet256} from '../../src/sim/planet-factory-256.ts';
import {geographicLocalSite256} from '../../src/sim/site-geographic-256.ts';
import {prepareGeographicPhysicalMap256} from '../../src/sim/geographic-map-physical-256.ts';
import {populateGeographicRoads256} from '../../src/sim/geographic-roads-256.ts';
import {portableLocalRoadAngular256} from '../../src/sim/local-road-angular-256.ts';
import {generateLocalGeysers256} from '../../src/sim/local-geyser-generation-256.ts';
import {LOCAL_BIOME_RULES_256} from '../../src/sim/local-biome-rules-v256.ts';
import {initializeActualWildFlora256} from '../../src/sim/wild-plant-actual-runtime-256.ts';
import {initializeExploration256} from '../../src/sim/exploration-initial-256.ts';
import {captureActualFogPhysical256} from '../../src/sim/exploration-physical-256.ts';
import {captureGeographicGenerationReachability256} from '../../src/sim/geographic-generation-reachability-256.ts';
import {initializeGeographicInitialSnow256,INITIAL_SNOW_SEED_PART_256} from '../../src/sim/initial-snow-256.ts';
import {localGenerationStepSeed} from '../../src/sim/world-site-geography.ts';
import {initialWorldRegistry} from '../../src/sim/world-map-context.ts';
import {newCampPressure260} from '../../src/sim/camp-pressure-state-260.ts';
import {initializeCampRaidOwner260} from '../../src/sim/camp-raid-owner-260.ts';
import {settleRegisteredMap} from '../../src/sim/world-map-authority.ts';
import {startingPawn} from '../../src/sim/starting-pawns.ts';
import {bindBornHumanFaction259} from '../../src/sim/world-affiliation-259.ts';
import {createMedicalRecord} from '../../src/sim/injury-state.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {crashlandedProfile} from '../../src/sim/game-profile.ts';
import {adoptFluIncidents,adoptImmuneDiseaseIncidents,FLU_FIRST_CHECK} from '../../src/sim/flu-incidents.ts';
import {adoptMiscIncidents,adoptWeatherIncidents} from '../../src/sim/cassandra-misc.ts';
import {adoptSmallIncidents} from '../../src/sim/cassandra-small.ts';
import {adoptWorldIncidents} from '../../src/sim/cassandra-world.ts';
import {adoptShortCircuits} from '../../src/sim/short-circuit.ts';
import {adoptCropBlights} from '../../src/sim/crop-blight-incident.ts';
import {enableVisitors} from '../../src/sim/visitors.ts';
import {SCHEMA_VERSION,type World,type Structure} from '../../src/sim/types.ts';
import type {CampaignGeography256} from '../../src/sim/world-geography-owner-256.ts';
import type {WorldFactionRegistry256} from '../../src/sim/world-faction-state.ts';
import type {WorldLandBiome} from '../../src/sim/world-biome-selection.ts';

export const MALARIA_GEOGRAPHY_SOURCE454='public/test-saves/v419/les-eclaircies.json';
export const MALARIA_GEOGRAPHY_SOURCE_SHA454='49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f';
export const MALARIA_GEOGRAPHY_PREPARATION454='Declared geographic control settlement200², constructed directly at tick53999, not nine days played. Only immutable acquired Planet3 geography is reused; factions/leaders, map/climate/deterioration/breakdown/apparel clocks, empty flora/snow/fog and original healthy disease candidates come from the real producers. Cleared soil, two normal wooden medical beds, three industrial medicines, six simple meals, full needs, Medicine8 and medical work priorities are finite declared preparation, not naturally acquired. Any generated noninfectious age ailments are preserved. The prepared camp is converted by the real Settle operation before the Cassandra profile and disease calendars are adopted prospectively. No pre-existing disease, forced disease RNG, reactor, retrospective episode or played voyage is supplied.';

let geography454:CampaignGeography256|undefined;
let factions454:WorldFactionRegistry256|undefined;
let firstThing454:number|undefined;
const baselines454=new Map<string,World>();

function valid454(w:World,phase:string):void {
 const errors=validateWorld(w);if(errors.length)throw Error(`Invalid V454 ${phase}: ${errors.join('; ')}`);
}
function source454():{geography:CampaignGeography256;factions:WorldFactionRegistry256;nextId:number} {
 if(!geography454){
  const text=readFileSync(MALARIA_GEOGRAPHY_SOURCE454,'utf8');
  if(createHash('sha256').update(text).digest('hex')!==MALARIA_GEOGRAPHY_SOURCE_SHA454)throw Error('Acquired immutable malaria geography source changed');
  const acquired=deserializeCampaign(text);if(acquired.planet?.revision!==3)throw Error('Actual acquired Planet3 required');
  const geography=planetGeography256(acquired.planet);
  const foreign=generateForeignWorldFactions256({version:SCHEMA_VERSION,tick:0,tiles:geography.surface.tiles,selection:[...geography.definition.factions],population:3,nextFactionId:1,nextSettlementId:1,nextThingId:1,random:new WorldGenerationRandom(718)});
  if(!foreign.ok)throw Error(foreign.reason);
  const complete=completeWorldFactionRegistry256({version:SCHEMA_VERSION,draft:foreign.draft,playerDef:'PlayerColony',name:'Soins géographiques déclarés',postWorldRandom:new WorldGenerationRandom(991)});
  if(!complete.ok)throw Error(complete.reason);
  geography454=geography;factions454=complete.registry;firstThing454=foreign.nextThingId;
 }
 return {geography:geography454,factions:structuredClone(factions454!),nextId:firstThing454!};
}

/** No Vitest/browser dependency, no played tick and no incident-stream pin.
 * The whole prepared World is validated before the caller selects a ticket.
 * Current creation dimensions require200² for a true later settlement. */
export function malariaGeographicCamp454(biome:WorldLandBiome,count=2):{w:World;bedIds:number[];medicineId?:number;preparation:string} {
 if(!Number.isInteger(count)||count<0||count>2)throw Error('V454 control supports zero, one or two disease candidates');
 const key=`${biome}/${count}`,cached=baselines454.get(key);
 if(cached){const w={...structuredClone(cached),planet:cached.planet};return result454(w);}
 const {geography,factions,nextId}=source454(),occupied=new Set(factions.settlements.map(s=>s.tile));
 // Choose the first legal tile of this actual biome, never rerolling the
 // geography/map seed or choosing a successful disease opportunity.
 const tile=geography.surface.tiles.find(t=>t.biome===biome&&!geography.roads[t.id]!.length&&canPlaceWorldSettlement(geography.surface.tiles,t.id,{settlementTiles:occupied}));
 if(!tile)throw Error(`Fixed acquired geography has no road-free legal ${biome} tile`);
 const planet=createGeographicPlanet256({geography,factions,homeTile:tile.id,adoptedAt:0,nextGroupId:1}),site=geographicLocalSite256(planet,tile.id);
 const tick=FLU_FIRST_CHECK-1,size=200;
 const {world:w,description}=prepareGeographicPhysicalMap256({schemaVersion:SCHEMA_VERSION,planet,factions,tile:tile.id,width:size,height:size,tick,calendarOrigin:0,nextId,rng:454,initialWeather:{gameInitDataPresent:false,daysPassedSinceSettle:0},definitionContext:{isStartingMap:false,mapInitializing:true,tutorial:false,nomadicFactor:.5,usedRectCells:new Set()}});
 // Explicit isolated control landscape. No removal yield is manufactured.
 w.tiles=w.tiles.map(()=>({terrain:'soil-natural'}));delete w.roofing;
 populateGeographicRoads256(w,[],portableLocalRoadAngular256);
 generateLocalGeysers256(w,{waterCovered:description.waterCovered,biomeFactor:LOCAL_BIOME_RULES_256[biome].scalars.geyserCountFactor,mutatorFactors:[],layoutRects:[],usedRects:[{minX:90,minZ:90,maxX:110,maxZ:110}],ancientCaskets:[],mapInitializing:true,planEdificeRemoval:()=>null},new WorldGenerationRandom(localGenerationStepSeed(site.mapSeed,1158116095,0)));
 initializeActualWildFlora256(w);
 initializeGeographicInitialSnow256(w,new WorldGenerationRandom(localGenerationStepSeed(site.mapSeed,INITIAL_SNOW_SEED_PART_256,0)));
 const reach=captureGeographicGenerationReachability256(w);
 initializeExploration256(w,{start:100*size+100,rootsToUnfog:[],readers:{standable:reach.physical.standable,roofed:reach.physical.roofed,canReachMapEdgeNoPassClosedDoorsOrWater:reach.canReachMapEdgeNoPassClosedDoorsOrWater}},captureActualFogPhysical256(w),new WorldGenerationRandom(454));
 for(let i=0;i<Math.max(1,count);i++){
  const p=startingPawn(w.nextId++,i===0?'Médecin déclaré':'Patient déclaré',100+i*3,100,i,100,w.seed,w.tick,SCHEMA_VERSION);
  p.health??=createMedicalRecord(w.tick);p.hunger=100;p.rest=100;p.mood=100;p.hostilityResponse='ignore';p.schedule.fill('work');delete p.selfTend;
  for(const priority of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[priority]=0;
  p.priorities.doctor=1;p.priorities.patient=1;p.priorities.bedrest=1;
  p.skills!.medicine={level:8,xp:0,dailyXp:0,passion:0};
  if(!bindBornHumanFaction259(w,p,factions.playerFactionId))throw Error('Actual malaria candidate faction binding refused');
  w.pawns.push(p);
 }
 for(let i=0;i<2;i++){const bed:Structure={id:w.nextId++,kind:'bed',x:100+i*3,z:103,orientation:0,footprint:'standard',material:'wood',quality:'normal',medical:true};w.structures.push(bed);}
 addMaterial(w,'medicine',3,{type:'ground',x:101,z:101},'medicine');
 addMaterial(w,'food',6,{type:'ground',x:102,z:101},'simple-meal');refreshStock(w);
 initialWorldRegistry(w);w.worldMaps!.campaignSeed=planet.generationSeed;w.worldMaps!.calendarOrigin=0;
 const record=w.worldMaps!.sites[0]!;record.kind='camp';record.createdAt=w.tick;record.campPressure=newCampPressure260(w.tick*10)!;
 initializeCampRaidOwner260(w);valid454(w,'prepared camp before actual Settle');
 const settled=settleRegisteredMap(w,0);if(!settled.ok)throw Error(`Actual prepared camp Settle refused: ${settled.reason}`);
 // The zero-candidate branch declares an empty newly founded colony after
 // the same real command; it supplies no phantom patient or resurrection.
 if(count===0)w.pawns=[];
 w.gameProfile=crashlandedProfile();
 adoptFluIncidents(w);adoptImmuneDiseaseIncidents(w);
 adoptMiscIncidents(w);adoptWeatherIncidents(w);adoptShortCircuits(w);adoptCropBlights(w);
 adoptSmallIncidents(w);adoptWorldIncidents(w);enableVisitors(w,false,true);
 if(w.tick!==53999||w.fluIncidents?.nextCheck!==54000||w.fluIncidents.checks!==0||w.fluIncidents.immuneDiseases?.adoptedAt!==53999||w.fluIncidents.immuneDiseases.draws!==0||w.pawns.some(p=>p.health?.immuneDiseases!==undefined||p.health?.flu!==undefined))throw Error('V454 preparation crossed its unplayed disease frontier');
 valid454(w,'settlement before the first real disease opportunity');
 baselines454.set(key,{...structuredClone(w),planet:w.planet});
 return result454(w);
}
function result454(w:World):{w:World;bedIds:number[];medicineId?:number;preparation:string} {
 return {w,bedIds:w.structures.filter(s=>s.kind==='bed'&&s.medical).map(s=>s.id),medicineId:w.piles.find(p=>p.item==='medicine')?.id,preparation:MALARIA_GEOGRAPHY_PREPARATION454};
}
