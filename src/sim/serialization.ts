import { validatePlanet } from './planet-save.ts';
import { validateGroupState } from './group-save.ts';
import { registerGroupThingIds } from './group-namespace-save.ts';
import { captureHumanOwners } from './human-owners.ts';
import { validatePawnRecordShape } from './pawn-record-save.ts';
import { validatePileRecordShape } from './material-record-save.ts';
import { validateRelationshipWorld } from './relationship-world-save.ts';
import { validRelationshipState } from './relationship-save.ts';
import { validFamilyBereavementShape } from './family-bereavement-save.ts';
import { validRomanceMemoryShape } from './romance-memories.ts';
import { validMechCorpseShape,validMechSalvageLedger } from './mechanoid-corpse-save.ts';
import { validMechanoidShape,validateMechanoids } from './mechanoid-save.ts';
import { validateMechanoidRanged } from './mechanoid-ranged-save.ts';
import { validateMechanoidRaids } from './mechanoid-raid-save.ts';
import { initializeTelevisionRecreation, validTelevisionState } from './television-save.ts';
import { validSandbagsState } from './sandbags-save.ts';
import { validPackagedSurvivalState } from './packaged-survival-save.ts';
import { validHospitalBedState } from './hospital-bed-save.ts';
import { isBedKind } from './bed-kinds.ts';
import { validateCivilianPost } from './commercial-post.ts';
import { validateCommercialRegistry,validateCommercialBindings } from './commercial-save.ts';
import { commercialOnMapId } from './commercial-trip.ts';
import { validateDomesticAnimals } from './domestic-save.ts';
import { validateBreakdowns } from './breakdown-save.ts';
import { newBreakdownCalendar } from './breakdowns.ts';
import { consolidateLooseRocks } from './loose-rocks.ts';
import { validateAnimalPens } from './animal-pens-save.ts';
import {validatePawnAppearance} from './pawn-appearance.ts';
import { legacyHumanAge, validHumanAge } from './human-age.ts';
import {validFlakWorkShape,validateFlakWorks} from './flak-work.ts';
import {validArtWorkShape,validateArtWorks} from './art-work.ts';
import {validateArtObjects} from './art-save.ts';
import { validateWildFlora } from './wild-flora.ts';
import { validRoomExperience } from './room-experience.ts';
import { V91_ITEM_IDS,V190_ITEM_IDS } from './biome-items.ts';
import { V120_ANIMAL_PRODUCT_ITEMS } from './animal-product-items.ts';
import { validHumanBodyShape,validHumanCorpseShape,validGraveShape,validBurialTaskShape,validateBurials } from './burial-save.ts';
import { validateFlooring } from './flooring-save.ts';
import { validateFilth } from './filth-save.ts';
import { validFoodContamination } from './food-poisoning-save.ts';
import { validVisitorShape,validateVisitors } from './visitor-save.ts';
import { validTradeShape,validateTrade } from './trade-save.ts';
import { validateFires,validateThingDamage } from './fire-save.ts';
import { validateColonyEconomy } from './colony-economy-save.ts';
import { validSiteClimate } from './site-climate-save.ts';
import { validPlantLife } from './plant-life-save.ts';
import { validCropBlight } from './plant-blight-save.ts';
import { validateWeather } from './weather-save.ts';
import { validateWind } from './wind.ts';
import { validateHeaters } from './heater.ts';
import { conduitKeepsPlant } from './power-construction.ts';
import { validatePowerFlicks } from './power-flick.ts';
import { sharesConstructionLayer } from './power-grid.ts';
import { validSite } from './site.ts';
import { validScenario } from './scenario-save.ts';
import { validGameProfile,validateGameProfile } from './game-profile-save.ts';
import { validCorpseShape,validateCorpses } from './corpse-save.ts';
import { validHuntingTask,validateHunting } from './hunting-save.ts';
import { validateWildlife } from './wildlife-save.ts';
import { validateHeat } from './heat-save.ts';
import { validMiscIncidents } from './cassandra-misc-save.ts';
import { validSmallIncidents } from './cassandra-small-save.ts';
import { validWorldIncidents } from './cassandra-world-save.ts';
import { validFlashstorm } from './flashstorm-save.ts';
import { validRainElectrical } from './rain-electric-save.ts';
import { validPawnPodRescue,validPodRescueShape,validatePodRescues } from './pod-rescue-save.ts';
import { createPodDepartureValidator } from './pod-rescue-projection.ts';
import { validateResearch } from './research-save.ts';
import { storageAccepts, validStorageItems } from './storage-filters.ts';
import { validStorageConditions } from './storage-condition.ts';
import { validGunWorkShape,validateGunWorks } from './gun-work.ts';
import { validComponentWorkShape,validateComponentWorks } from './component-work.ts';
import { validUnfinishedShape,validateUnfinished } from './unfinished.ts';
import { validateSocial } from './social-save.ts';
import { validBereavement } from './bereavement-save.ts';
import { validDeathThoughtsTransport } from './death-thoughts-save.ts';
import { validateBarriers } from './barrier-save.ts';
import { validMiniTurretShape,validateMiniTurrets } from './mini-turret-save.ts';
import { validBombRefugeShape,validateBombRefuges } from './bomb-danger.ts';
import { validateBombWaves } from './bomb-state.ts';
import { turretReloadCapacity,turretReloadPawnReason } from './mini-turret-reload.ts';
import { validateRaids } from './raid-save.ts';
import { validateArrivals } from './arrival-save.ts';
import { validateQuests } from './quest-save.ts';
import { groupOnMapMember } from './group-state.ts';
import { validTraits } from './traits.ts';
import { validBackground } from './colonist-backgrounds.ts';
import { validateMental,validMeleeThreatShape } from './mental-save.ts';
import { validApparelShape,validateApparel } from './apparel-save.ts';
import { validDisturbance } from './disturbance-state.ts';
import { validTacticsShape,validateTactics } from './tactics-save.ts';
import { validAttackMemory } from './automatic-combat-save.ts';
import { validAffiliationShape,validateAffiliations } from './affiliation-save.ts';
import { validStagger } from './stagger.ts';
import { travelEnd,validSlowIntervals,validStunIntervals,type TravelSegment } from './travel-timing.ts';
import { validMeleeShape,validStunShape,validateMelee } from './melee-save.ts';
import { validShootingShape,validateShooting } from './shooting-save.ts';
import { validDraftShape,validateDrafting } from './drafting-save.ts';
import { validateProjectiles } from './projectile-save.ts';
import { validEquipmentShape,validWeaponShape,validateEquipment } from './equipment-save.ts';
import { validFeedShape,validateFeeding } from './feeding-save.ts';
import { validTendShape,validateCare } from './care-save.ts';
import { validPawnSurgeryShape,validateSurgeries } from './surgery-save.ts';
import { validRescueShape,validateRescues } from './rescue-save.ts';
import { validSkills } from './skills-save.ts';
import { validateInterruptedCargo } from './interrupted-cargo.ts';
import { initialSkills } from './skills.ts';
import { validPlantThermalFactor } from './thermal-plants.ts';
import { validateTemperature } from './temperature-save.ts';
import { initializeLightWork, validateWorkProgress } from './work-progress-save.ts';
import { workProgress } from './work-progress.ts';
import { legacyProductionTicks, productionWorkTotal, taskRecipe, PRODUCTION_RECIPES } from './production-recipes.ts';
import { validateRoofing } from './roof-save.ts';
import { isRoofJob } from './roof-rules.ts';
import { validateDoors } from './door-save.ts';
import { validateCoolers } from './cooler.ts';
import { validatePower } from './power-save.ts';
import { validateMining } from './mining-save.ts';
import { validateConstructionMaterials } from './construction-material-save.ts';
import { constructionCapacity, constructionSupplied, requiredMaterial } from './construction-materials.ts';
import { validStoneIdentity } from './geology.ts';
import { validateFurnitureHaul } from './furniture-haul-save.ts';
import { validateFurniture } from './furniture-transfer-save.ts';
import { validateDeconstruction } from './deconstruction-save.ts';
import { validatePriorityWork } from './priority-work-state.ts';
import { canStandAt } from './furniture-travel.ts';
import { initializeFurnitureTravel } from './furniture-save.ts';
import { initializeOccupancy } from './occupancy-save.ts';
import { groundOccupancyAllows, occupancyOf } from './occupancy.ts';
import { validSowingClearance } from './sowing-clearance.ts';
import { initializeConstruction, validateConstruction } from './construction-save.ts';
import { initializePlayerOrders, validatePlayerOrders, validSowingDestination } from './player-orders-save.ts';
import { isConstruction } from './construction-rules.ts';
import { initializeRecreation, validateRecreation } from './recreation-save.ts';
import { validateCooking } from './cooking-save.ts';
import { initializeSchedules, validateSchedules } from './schedule-save.ts';
import { initializeFoodPolicies, validateFoodPolicies } from './food-policy-save.ts';
import { initializePreservation, validatePreservation } from './food-preservation-save.ts';
import { fuelCapacity, fuelLimit, isFueledBuilding } from './fuel.ts';
import { hydroponicPlantAllowed,initializeFarming, validateFarming } from './farming-save.ts';
import { jobDuration } from './farming.ts';
import { workType } from './work-planner.ts';
import { asideCapacity, haulingWork } from './haul-aside.ts';
import { harvestable, isPlant, legacyPlantGrowth } from './plants.ts';
import { groundPile, storageCapacity } from './ground-placement.ts';
import { validateTravel,MIN_PAWN_SPEED_V87,MAX_PAWN_DELAY_V87,MIN_PAWN_SPEED_V86,MAX_PAWN_DELAY_V86 } from './travel-validation.ts';
import { validPrisonerPawnShape,validatePrisoners } from './prisoner-save.ts';
import { serviceCell } from './service-reservations.ts';
import { CARRY_CAPACITY, footprintCells, JOB_WOOD_COST, MAX_STACK } from './definitions.ts';
import { deliveredStock, groundQuantity, reservedDestination, reservedSource } from './materials.ts';
import { migrateLegacy, initializeNeeds, initializeDining, initializeFood, initializeSpatial, initializePlants } from './save-migrations.ts';
import type { Resource,World } from './types.ts';
import { validMapDimension } from './map-config.ts';
import { INGEST_TICKS } from './eating.ts';
import { validDiningPlace } from './dining.ts';
import { ITEM_DEFINITIONS,V219_ITEM_IDS } from './items.ts';
import { validPlantGrowthLight } from './plant-light-save.ts';
import { SCHEMA_VERSION, TICKS_PER_DAY } from './types.ts';
import { validateScoutRegistry } from './caravan-save.ts';
import { scoutRegistryView,scoutOnMapId } from './caravan-trip.ts';
import { adultAgeTicks } from './animal-life.ts';
import { adoptFluIncidents } from './flu-incidents.ts';
import { validFluIncidents } from './flu-incidents-save.ts';
import { validEmpStructureTransport,validEmpProductionTransport } from './emp-save.ts';
import { adoptExoticMerchantSchedule } from './visitors.ts';
import { isFurnitureQuality } from './furniture-stats.ts';
import { validateFlowerPotState } from './flower-pot.ts';
import { createDefaultApparelPolicyRegistry,validApparelPolicy } from './apparel-policy.ts';
import { APPAREL_POLICY_INTERVAL,APPAREL_WEAR_INTERVAL,createApparelWearCalendar } from './apparel-renewal.ts';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const bounded = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const stock = (value: unknown): boolean => record(value) && integer(value.wood, 0, MAX_STACK * 32768) && integer(value.food, 0, MAX_STACK * 32768);
const oneOf = (value: unknown, values: string[]): boolean => typeof value === 'string' && values.includes(value);

/** Structural validation first, cross-reference validation second; accepts arbitrary JSON without throwing. */
export function validateWorld(input: unknown): string[] {
  return validateSchema(input, SCHEMA_VERSION);
}
function validateSchema(raw: unknown, version: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70 | 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80 | 81 | 82 | 83 | 84 | 85 | 86 | 87 | 88 | 89 | 90 | 91 | 101 | 103 | 104 | 105 | 106 | 109 | 119 | 120 | 121 | 122 | 123 | 124 | 125 | 127 | 134 | 135 | 138 | 139 | 141 | 143 | 144 | 148 | 150 | 152 | 154 | 155 | 156 | 157 | 159 | 160 | 161 | 162 | 163 | 164 | 165 | 166 | 167 | 168 | 169 | 170 | 171 | 172 | 173 | 174 | 175 | 176 | 177 | 178 | 179 | 180 | 181 | 182 | 183 | 184 | 185 | 186 | 187 | 188 | 189 | 190 | 191 | 192 | 193 | 194 | 195 | 196 | 197 | 198 | 199 | 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 209 | 210 | 211 | 212 | 213, relationshipContext = true): string[] {
  const legacyV2 = version === 2;
  const errors: string[] = [];
  if (!record(raw)) return ['World must be an object.'];
  if(version<=195&&['planet','group','groupLosses'].some(k=>Object.hasOwn(raw,k)))return ['Historical schema contains future world/group fields.'];
  let input=raw;
  if (version >= 5 && !oneOf(input.foodRules, ['legacy', 'adult'])) errors.push('Invalid food rules profile.');
  if (version < 5 && input.foodRules !== undefined) errors.push('Legacy save contains version 5 fields.');
  if (input.schemaVersion !== version) errors.push('Unsupported schema version; migrate older saves through deserializeWorld.');
  if (!integer(input.seed, 0, 0xffffffff) || !integer(input.rng, 1, 0xffffffff)) errors.push('Invalid deterministic random state.');
  if (!integer(input.tick, 0) || !integer(input.nextId, 1)) errors.push('Invalid tick or nextId.');
  if (!integer(input.logisticsCursor, 0)) errors.push('Invalid logistics search cursor.');
  if (!validMapDimension(input.width) || !validMapDimension(input.height)) return [...errors, 'Invalid dimensions.'];
  if(!validScenario(input.scenario,version,input.width,input.height))errors.push('Invalid scenario provenance for schema.');
  if(!validGameProfile(input.gameProfile,version,input.scenario))errors.push('Invalid game profile for schema.');
  if(!validSite(input.site,version,input.scenario as World['scenario']))errors.push('Invalid local site provenance for schema.');
  if(!validSiteClimate(input.climate,version,input as unknown as World))errors.push('Invalid site climate for schema.');
  const size = input.width * input.height;
  if(!validPodRescueShape(input.podRescues,version,input as unknown as World))errors.push('Invalid or future pod rescue state for schema.');
  if(input.mechanoids!==undefined&&(version<194||!Array.isArray(input.mechanoids)||input.mechanoids.length>size||input.mechanoids.some(m=>!validMechanoidShape(m,version,input.tick as number))))errors.push('Invalid or future mechanoid population.');
  if(!validMechSalvageLedger(input as unknown as World,version))errors.push('Invalid or future mechanoid salvage ledger.');
  if(version<195&&Object.hasOwn(input,'relationships')||!validRelationshipState(input.relationships,version,input.tick as number))errors.push('Invalid or future relationship graph.');
  const arrays = ['tiles', 'pawns', 'resources', 'structures', 'jobs', 'piles', 'stockpiles', 'events'] as const;
  if (arrays.some(key => !Array.isArray(input[key]))) return [...errors, 'Missing world arrays.'];
  if(version<180&&(input.commercialTrip!==undefined||input.civilianPost!==undefined))return [...errors,'Future commercial state in legacy save.'];
  const commercialWorld=input as unknown as World;
  const commercialErrors=validateCommercialRegistry(commercialWorld,version);
  if(commercialErrors.length)return [...errors,...commercialErrors];
  const scoutErrors=validateScoutRegistry(input as unknown as World,version);
  if(scoutErrors.length)return [...errors,...scoutErrors];
  // A projection validates every original Pawn/possession once with the common
  // rules. It never changes map arrays, persisted owners or derived map stock.
  const offMapScout=input.scout&&record(input.scout)&&record(input.scout.pawn)?input.scout.pawn:input.commercialTrip&&record(input.commercialTrip)&&record(input.commercialTrip.pawn)?input.commercialTrip.pawn:undefined;
  input=scoutRegistryView(input as unknown as World) as unknown as Record<string,unknown>;
  const tiles = input.tiles as unknown[];
  if (tiles.length !== size || tiles.some(tile => !record(tile) || !oneOf(tile.terrain, ['grass', 'soil', 'water', 'rock', ...(version>=28?['rough-stone']:[]), ...(version>=83?['rich-soil','gravel']:[])]) || !validStoneIdentity(tile.stone, tile.terrain, version))) errors.push('Invalid terrain grid.');
  if (!stock(input.stock)) errors.push('Invalid derived stock.');
  const coord = (item: Record<string, unknown>): boolean => integer(item.x, 0, (input.width as number) - 1) && integer(item.z, 0, (input.height as number) - 1);
  const ids = new Set<number>();
  errors.push(...validateCivilianPost(commercialWorld,version,ids));
  if(errors.length)return errors;
  for (const key of ['pawns', 'resources', 'structures', 'jobs', 'piles', 'stockpiles'] as const) {
    const items = input[key] as unknown[];
    if (items.length > (key === 'piles' ? 32768 : key==='jobs'&&version>=35?size*(version>=85?3:2):key==='structures'&&version>=85?size*2:size)) errors.push(`Too many ${key}.`);
    for (const item of items) {
      if (!record(item) || !integer(item.id, 1) || (key !== 'piles' && !coord(item))) { errors.push(`Invalid ${key} identity or cell.`); continue; }
      if (ids.has(item.id)) errors.push('Duplicate entity ID.'); ids.add(item.id);
      if (integer(input.nextId, 1) && item.id >= input.nextId) errors.push('nextId must exceed all entity IDs.');
      if(key==='resources'&&!validPlantLife(item as unknown as World['resources'][number],version,input as unknown as World))errors.push('Invalid plant life for schema.');
      if(key==='resources'&&!validCropBlight(item,version,input as unknown as World))errors.push('Invalid crop blight for schema.');
      if (key === 'pawns') {
        errors.push(...validatePawnRecordShape(item, input as unknown as World, version));
      } else if (key === 'resources') {
        if (!validPlantThermalFactor(item,version)) errors.push('Invalid plant thermal factor.');
        if (!validStoneIdentity(item.stone, item.kind, version)) errors.push('Invalid resource stone identity.');
        if (!oneOf(item.kind, ['tree', 'berries', 'rock', ...(version >= 8 ? ['rice'] : []), ...(version>=71?['cotton']:[]),...(version>=84?['potato','corn']:[]),...(version>=91?['wild-plant']:[]),...(version>=182?['healroot']:[])]) || !integer(item.amount, version>=91&&item.kind==='wild-plant'?0:1, item.kind==='healroot'?1:1000000)) errors.push('Invalid resource.');
        if(!validPlantGrowthLight(item as unknown as Resource,version,input.tick as number))errors.push('Invalid plant light interval.');
        if (item.growth !== undefined || item.growthTick !== undefined) {
          if (version < 7 || !(item.kind === 'berries' || (version >= 8 && item.kind === 'rice') || (version>=71&&item.kind==='cotton') || (version>=84&&(item.kind==='potato'||item.kind==='corn')) || (version>=182&&item.kind==='healroot') || (version>=91&&item.species!==undefined&&(item.kind==='tree'||item.kind==='wild-plant'))) || typeof item.growth !== 'number' || !Number.isFinite(item.growth) || item.growth < 0 || item.growth > 1 || !integer(item.growthTick, 0, input.tick as number)) errors.push('Invalid plant growth checkpoint.');
        }
        if(version<91&&item.species!==undefined||version<167&&item.species==='healroot-wild')errors.push('Future flora species in older save.');
      } else if (key === 'structures' || key === 'jobs') {
        if(Object.hasOwn(item,'turret')&&(key!=='structures'||item.kind!=='mini-turret'||!validMiniTurretShape(item.turret,version,Number(input.tick)*10,Number(input.nextId))))errors.push('Invalid turret state for schema.');
        if(item.gatherSpot!==undefined&&(version<124||key!=='structures'||!['campfire','table','table-square','table-long'].includes(String(item.kind))||typeof item.gatherSpot!=='boolean'))errors.push('Invalid or future gathering spot.');
        const flowerPotId=item.flowerPotId;
        if(flowerPotId!==undefined){
          const pot=(input.structures as Record<string,unknown>[]).find(s=>s.id===flowerPotId&&s.kind==='flower-pot');
          const flower=pot&&record(pot.flower)?pot.flower:undefined,plant=flower?.plant;
          if(version<90||key!=='jobs'||!integer(flowerPotId,1)||!pot||pot.x!==item.x||pot.z!==item.z||item.kind!=='sow'&&item.kind!=='cut'||item.kind==='sow'&&(plant!==undefined||flower?.allowSow!==true)||item.kind==='cut'&&plant===undefined)errors.push('Invalid flower pot work target.');
        }
        const qualityKinds=['bed',...(version>=187?['hospital-bed']:[]),'table','stool','dining-chair','armchair','end-table','dresser','table-square','table-long','flower-pot',...(version>=122?['chess-table']:[])];
        if(version<90?item.quality!==undefined:key==='structures'&&(qualityKinds.includes(String(item.kind))||version>=104&&['small-sculpture','large-sculpture'].includes(String(item.kind)))?!isFurnitureQuality(item.quality):item.quality!==undefined)errors.push('Invalid furniture quality for schema.');
        if(item.flower!==undefined&&(version<90||key!=='structures'||item.kind!=='flower-pot'||validateFlowerPotState(item.flower,input.tick as number).length>0))errors.push('Invalid flower pot state for schema.');
        if(version>=90&&key==='structures'&&item.kind==='flower-pot'&&item.flower===undefined)errors.push('Flower pot lacks its physical plant state.');
        if(item.kind==='grave'&&key==='structures'?!validGraveShape(item.grave,version):item.grave!==undefined)errors.push('Invalid grave state.');
        if(item.medical!==undefined&&(version<46||key!=='structures'||!isBedKind(item.kind)||item.kind==='hospital-bed'&&version<187||item.medical!==true))errors.push('Invalid medical bed role.');
        if(item.prisoner!==undefined&&(version<86||key!=='structures'||!isBedKind(item.kind)||item.kind==='hospital-bed'&&version<187||item.prisoner!==true))errors.push('Invalid prisoner bed role.');
        if (!oneOf(item.kind, key === 'structures' ? (version < 4 ? ['wall', 'bed'] : ['wall', 'bed', 'table', 'stool', ...(version>=10?['campfire']:[]), ...(version>=15?['horseshoes']:[]), ...(version>=31?['stonecutter']:[]), ...(version>=34?['door']:[]),...(version>=143?['autodoor']:[]), ...(version>=40?['passive-cooler']:[]),...(version>=42?['wood-generator','standing-lamp']:[]),...(version>=177?['sun-lamp']:[]),...(version>=187?['hospital-bed']:[]),...(version>=75?['cooler']:[]),...(version>=73?['research-bench','tailor-bench']:[]),...(version>=72?['crafting-spot']:[]),...(version>=79?['butcher-spot']:[]),...(version>=84?['fueled-stove','electric-stove','butcher-table']:[]),...(version>=85?['power-conduit','power-switch','battery','solar-generator']:[]),...(version>=87?['heater','wind-turbine']:[]),...(version>=89?['grave']:[]),...(version>=104?['art-bench','small-sculpture','large-sculpture']:[]),...(version>=101?['machining-table']:[]),...(version>=123?['hi-tech-research-bench','multi-analyzer','fabrication-bench']:[]),...(version>=90?['electric-tailor-bench','table-square','table-long','dining-chair','armchair','end-table','dresser','flower-pot']:[]),...(version>=122?['chess-table']:[]),...(version>=119?['fence','fence-gate','pen-marker']:[]),...(version>=189?['sandbags']:[]),...(version>=190?['tube-television']:[]),...(version>=193?['mini-turret']:[]),...(version>=203?['hydroponics-basin']:[]),...(version>=206?['drug-lab']:[]),...(version>=211?['vitals-monitor']:[])]) : (version < 4 ? ['chop', 'harvest', 'wall', 'bed'] : [...(version>=84?['fueled-stove','electric-stove','butcher-table']:[]),...(version>=85?['power-conduit','power-switch','battery','solar-generator']:[]),...(version>=87?['heater','wind-turbine']:[]),...(version>=89?['grave','lay-floor','remove-floor']:[]),...(version>=104?['art-bench']:[]),...(version>=101?['machining-table']:[]),...(version>=123?['hi-tech-research-bench','multi-analyzer','fabrication-bench']:[]),...(version>=90?['electric-tailor-bench','table-square','table-long','dining-chair','armchair','end-table','dresser','flower-pot']:[]),...(version>=122?['chess-table']:[]),...(version>=119?['fence','fence-gate','pen-marker']:[]),...(version>=189?['sandbags']:[]),...(version>=190?['tube-television']:[]),...(version>=193?['mini-turret']:[]),...(version>=203?['hydroponics-basin']:[]),...(version>=206?['drug-lab']:[]),...(version>=211?['vitals-monitor']:[]),...(version>=35?['build-roof','remove-roof']:[]), ...(version>=28?['mine']:[]), ...(version>=25?['install','uninstall']:[]), ...(version>=75?['cooler']:[]),...(version>=73?['research-bench','tailor-bench']:[]),...(version>=67?['repair']:[]),...(version>=144?['fix-breakdown']:[]),...(version>=85?['flick']:[]), ...(version>=24?['deconstruct']:[]), 'chop', 'harvest', ...(version >= 7 ? ['cut'] : []), ...(version >= 8 ? ['sow'] : []), 'wall', 'bed', 'table', 'stool', ...(version>=10?['campfire']:[]), ...(version>=15?['horseshoes']:[]), ...(version>=31?['stonecutter']:[]), ...(version>=34?['door']:[]),...(version>=143?['autodoor']:[]), ...(version>=40?['passive-cooler']:[]),...(version>=42?['wood-generator','standing-lamp']:[]),...(version>=177?['sun-lamp']:[]),...(version>=187?['hospital-bed']:[])])) || !integer(item.orientation, 0, 3)
          || !oneOf(item.footprint, ['standard', 'legacy-single']) || (item.footprint === 'legacy-single' && item.kind !== 'bed' && !(version>=24&&item.kind==='deconstruct'||version>=25&&['install','uninstall'].includes(String(item.kind))))) errors.push('Invalid structure definition or footprint.');
        if (key==='structures' && isFueledBuilding(item.kind)) {
          const f=item.fuel;
          if(version<10||!record(f)||!integer(f.ticks,0,fuelLimit(item.kind))||!integer(f.burned,0,(input.tick as number)*(item.kind==='wood-generator'?3:item.kind==='fueled-stove'?16:1))||typeof f.autoRefuel!=='boolean'||(item.kind==='wood-generator'?!integer(f.burnRemainder,0,4):f.burnRemainder!==undefined))errors.push('Invalid building fuel.');
        } else if(item.fuel!==undefined)errors.push('Unexpected fuel state.');
        if (key === 'jobs' && (!oneOf(item.status, ['pending', 'active']) || !(item.reservedBy === null || integer(item.reservedBy, 1)) || !stock(item.escrow) || !integer(item.progress, 0, version>=31?Number.MAX_SAFE_INTEGER:119))) errors.push('Invalid job.');
      } else if (key === 'piles') {
        errors.push(...validatePileRecordShape(item, input as unknown as World, version));
      } else if (item.items!==undefined&&(version<197&&V219_ITEM_IDS.some(i=>Object.hasOwn(item.items as object,i))||version<194&&Object.hasOwn(item.items as object,'scyther-corpse')||version<101||version<178&&Object.keys(item.items as object).some(i=>V190_ITEM_IDS.includes(i))||!validStorageItems(item.items,version)||version<104&&Object.hasOwn(item.items as object,'unfinished-sculpture')||version<120&&Object.keys(item.items as object).some(i=>V120_ANIMAL_PRODUCT_ITEMS.includes(i))||version<123&&Object.keys(item.items as object).some(i=>['gold','plasteel','advanced-component'].includes(i))||version<141&&Object.keys(item.items as object).some(i=>i==='flak-helmet'||i==='unfinished-flak-helmet')||version<148&&Object.keys(item.items as object).some(i=>i==='recon-helmet'||i==='unfinished-recon-helmet')||version<152&&Object.hasOwn(item.items as object,'fine-meal')||version<154&&Object.hasOwn(item.items as object,'lavish-meal')||version<155&&Object.hasOwn(item.items as object,'vegetarian-fine-meal')||version<156&&Object.hasOwn(item.items as object,'carnivore-fine-meal')||version<157&&Object.hasOwn(item.items as object,'vegetarian-lavish-meal')||version<159&&Object.hasOwn(item.items as object,'carnivore-lavish-meal'))||!record(item.filters) || typeof item.filters.wood !== 'boolean' || typeof item.filters.food !== 'boolean' || item.filters['mech-corpse']!==undefined&&(version<194||typeof item.filters['mech-corpse']!=='boolean') || item.filters.silver!==undefined&&(version<88||typeof item.filters.silver!=='boolean') || item.filters.corpse!==undefined&&(version<79||typeof item.filters.corpse!=='boolean') || item.filters.unfinished!==undefined&&(version<72||typeof item.filters.unfinished!=='boolean') || item.filters.textile!==undefined&&(version<71||typeof item.filters.textile!=='boolean') || item.filters.apparel!==undefined&&(version<63||typeof item.filters.apparel!=='boolean') || item.filters.weapon!==undefined&&(version<52||typeof item.filters.weapon!=='boolean') || Object.hasOwn(item.filters,'neutroamine')&&(version<206||typeof item.filters.neutroamine!=='boolean') || item.filters.medicine!==undefined&&(version<51||typeof item.filters.medicine!=='boolean') || item.filters.component!==undefined&&(version<41||typeof item.filters.component!=='boolean') || item.filters.blocks!==undefined&&(version<32||typeof item.filters.blocks!=='boolean') || item.filters.gold!==undefined&&(version<123||typeof item.filters.gold!=='boolean') || item.filters.plasteel!==undefined&&(version<123||typeof item.filters.plasteel!=='boolean') || item.filters['advanced-component']!==undefined&&(version<123||typeof item.filters['advanced-component']!=='boolean') || item.filters.steel!==undefined&&(version<29||typeof item.filters.steel!=='boolean') || item.filters.chunk!==undefined&&(version<28||typeof item.filters.chunk!=='boolean') || item.filters.furniture!==undefined&&(version<26||typeof item.filters.furniture!=='boolean')
        || !validStorageConditions(item,version) || !integer(item.priority, 1, 4) || !integer(item.capacity, 1, version>=88?ITEM_DEFINITIONS.silver.stackLimit:MAX_STACK)) errors.push('Invalid storage policy.');
    }
  }
  const events = input.events as unknown[];
  if (events.length > 80 || events.some(item => !record(item) || !integer(item.tick, 0, input.tick as number) || !oneOf(item.type, ['job', 'need', 'command']) || typeof item.message !== 'string' || item.message.length > 240)) errors.push('Invalid event log.');
  if (version >= 8 && !errors.length) errors.push(...validateFarming(input, size, ids));
  if(!errors.length)errors.push(...validateTemperature(input as unknown as World,version));
  if(!errors.length)errors.push(...validateWorkProgress(input as unknown as World,version));
  if(!errors.length)errors.push(...validateMining(input as unknown as World,version));
  if(!errors.length)errors.push(...validateFurniture(input as unknown as World,version,ids,true));
  if(!errors.length)for(const pack of (input as unknown as World).packed??[])if(pack.building.gatherSpot!==undefined&&(version<124||!['table','table-square','table-long'].includes(pack.building.kind)||typeof pack.building.gatherSpot!=='boolean'))errors.push('Invalid or future packed gathering spot.');
  if(!errors.length)errors.push(...validateBarriers(input as unknown as World,version));
  if(!errors.length)errors.push(...validateBreakdowns(input as unknown as World,version));
  if(!errors.length)errors.push(...validateDeconstruction(input as unknown as World,version,true));
  if(!errors.length)errors.push(...validatePriorityWork(input as unknown as World,version));
  if(!errors.length)errors.push(...validatePlayerOrders(input as unknown as World,version,true));
  if(!errors.length)errors.push(...validateCooking(input,version,ids));
  if(!errors.length)errors.push(...validateDoors(input as unknown as World,version));
  if(!errors.length)errors.push(...validateAnimalPens(input as unknown as World,version));
  if(!errors.length)errors.push(...validateConstructionMaterials(input as unknown as World,version));
  if(!errors.length)errors.push(...validatePreservation(input as unknown as World,version));
  if(!errors.length)errors.push(...validateSchedules(input as unknown as World,version));
  if(!errors.length)errors.push(...validateFoodPolicies(input as unknown as World,version));
  if(!errors.length)errors.push(...validateRecreation(input as unknown as World,version));
  if(!errors.length)errors.push(...validateConstruction(input as unknown as World,version));
  if(!errors.length)errors.push(...validateRoofing(input as unknown as World,version));
  if(!errors.length)errors.push(...validatePlayerOrders(input as unknown as World,version));
  if(!errors.length&&!validateWildFlora(input as unknown as World,version))errors.push('Invalid wild flora.');
  if(!errors.length)errors.push(...validateV90Persistence(input as unknown as World,version));
  if (errors.length) return errors;
  const groupErrors=validateGroupState(commercialWorld,version);
  if(groupErrors.length)return groupErrors;
  const planetErrors=validatePlanet(commercialWorld.planet,commercialWorld,version);
  if(planetErrors.length)return planetErrors;
  const knownPeople=(commercialWorld.group||commercialWorld.groupLosses?.length)?captureHumanOwners(commercialWorld).people:undefined;
  const world = input as unknown as World;
  errors.push(...validateFlooring(world,version),...validateFilth(world,version,ids),...validateBurials(world,version,ids));
  if(errors.length)return errors;
  errors.push(...validateMechanoids(world,version,ids));
  if(errors.length)return errors;
  errors.push(...validateColonyEconomy(world,version));
  errors.push(...validateGameProfile(world));
  errors.push(...validateRaids(world,version,ids));
  if(!errors.length)errors.push(...validatePrisoners(world,version,ids));
  if(errors.length)return errors;
  errors.push(...validateArrivals(world,version));
  errors.push(...validateQuests(commercialWorld,version));
  errors.push(...validateMental(world,version));
  errors.push(...validateSocial(world,version,knownPeople?new Set(knownPeople.keys()):undefined));
  for(const pawn of world.pawns)if(!validBereavement(pawn.bereavement,pawn.id,version,world,knownPeople))errors.push('Invalid bereavement memory.');
  if(!validDeathThoughtsTransport(commercialWorld,version))errors.push('Invalid perceived death memory or owner.');
  if(!validArtificialPartsWorldTransport(commercialWorld,version))errors.push('Invalid artificial anatomy or owner clock.');
  if(version>=44)errors.push(...validateInterruptedCargo(world));
  if(version>=45)errors.push(...validatePawnHealth(world));
  if(version>=46)errors.push(...validateRescues(world));
  if(version>=48)errors.push(...validateFeeding(world));
  if(version>=47)errors.push(...validateCare(world));
  errors.push(...validateSurgeries(world,version));
  errors.push(...validateHeat(world,version));
  if(!validMiscIncidents(world.miscIncidents,version,world))errors.push('Invalid or future Misc incident calendar for schema.');
  if(!validSmallIncidents(world.smallIncidents,version,world))errors.push('Invalid or future small threat calendar for schema.');
  if(version<184&&Object.hasOwn(world,'worldIncidents')||!validWorldIncidents(world.worldIncidents,version,world))errors.push('Invalid or future World incident calendar for schema.');
  if(!validFlashstorm(world.flashstorm,version,world))errors.push('Invalid or future Flashstorm incident for schema.');
  if(!validRainElectrical(world.rainElectrical,version,world))errors.push('Invalid or future electrical rain state for schema.');
  if(!validFluIncidents(world,version))errors.push('Invalid or missing flu incident calendar for schema.');
  if(!validEmpStructureTransport(world,version))errors.push('Invalid or future EMP device state.');
  if(!validEmpProductionTransport(world,version))errors.push('Locked or future EMP production.');
  errors.push(...validateWildlife(world,version,ids));
  if(!errors.length)errors.push(...validateDomesticAnimals(world,version));
  if(errors.length)return errors;
  errors.push(...validateCommercialBindings(commercialWorld,version,ids));
  if(errors.length)return errors;
  errors.push(...validateCorpses(world,version),...validateHunting(world,version));
  errors.push(...validateResearch(world,version));
  if(!errors.length&&!validSandbagsState(world,version))errors.push('Invalid sandbags state.');
  if(!errors.length&&!validTelevisionState(world,version))errors.push('Invalid television state.');
  if(!errors.length&&!validHospitalBedState(world,version))errors.push('Invalid hospital bed state.');
  if(!errors.length&&!validPackagedSurvivalState(world,version))errors.push('Invalid packaged survival state.');
  errors.push(...validateUnfinished(world,version),...validateGunWorks(world,version),...validateFlakWorks(world,version),...validateComponentWorks(world,version),...validateArtWorks(world,version),...validateArtObjects(world,version));
  errors.push(...validateTrade(world,version),...validateVisitors(world,version,ids));
  if(version>=63)errors.push(...validateApparel(world));
  if(version>=52)errors.push(...validateEquipment(world));
  if(version>=53)errors.push(...validateDrafting(world));
  if(version>=59)errors.push(...validateMelee(world));
  if(version>=61)errors.push(...validateTactics(world));
  if(version>=58)errors.push(...validateAffiliations(world));
  errors.push(...validateFurniture(world,version,ids));
  if(!errors.length)errors.push(...validatePodRescues(world,version,ids,createPodDepartureValidator(projection=>validateSchema(projection,version,false))));
  if(!errors.length)errors.push(...validateFires(world,version,ids),...validateThingDamage(world,version));
  if(!errors.length)errors.push(...registerGroupThingIds(commercialWorld,ids));
  if(!errors.length&&version>=56)errors.push(...validateShooting(world,version,ids));
  if(!errors.length&&world.raids?.mechActive)errors.push(...validateMechanoidRaids(world,version,ids));
  if(!errors.length)for(const mech of world.mechanoids??[])errors.push(...validateMechanoidRanged(world,mech,version,ids));
  if(!errors.length&&relationshipContext)errors.push(...validateRelationshipWorld(commercialWorld,version));
  if(!errors.length)errors.push(...validateProjectiles(world,version,ids));
  if(!errors.length){validateBombWaves(world,errors,ids);validateMiniTurrets(world,errors);validateBombRefuges(world,errors,ids);}
  if(!errors.length)errors.push(...validateWeather(world,version),...validateWind(world,version),...validateHeaters(world,version));
  if(!errors.length)errors.push(...validatePower(world,version),...validatePowerFlicks(world,version),...validateCoolers(world,version));
  if(errors.length)return errors;
  errors.push(...validateDeconstruction(world,version));
  if(version>=6)errors.push(...validateTravel(world, version < 14));
  const cellKey = (item: { x: number; z: number }): number => item.z * world.width + item.x;
  const pawnById = new Map(world.pawns.map(item => [item.id, item])); const jobById = new Map(world.jobs.map(item => [item.id, item]));
  const pileById = new Map(world.piles.map(item => [item.id, item]));
  const resourceCells = new Map(world.resources.map(item => [cellKey(item), item]));
  const structureCells = new Map<number, World['structures'][number]>(); const jobCells = new Map<number, World['jobs'][number]>();
  if (resourceCells.size !== world.resources.length || new Set(world.stockpiles.map(cellKey)).size !== world.stockpiles.length) errors.push('Duplicate cell occupancy.');
  for (const [items, map] of [[world.structures, structureCells], [world.jobs, jobCells]] as const) {
    const occupants=new Map<number,typeof items[number][]>();
    for (const item of items) if(!isRoofJob(item)) for (const cell of footprintCells(item)) {
      if (cell.x < 0 || cell.z < 0 || cell.x >= world.width || cell.z >= world.height) { errors.push('Footprint outside map.'); continue; }
      const key=cellKey(cell),others=occupants.get(key)??[];
      const kind=(s:typeof item)=>'deconstruction' in s&&s.deconstruction?s.deconstruction.kind:'furniture' in s&&s.furniture?s.furniture.kind:'flick' in s&&s.flick?s.flick.kind:s.kind;
      if(others.some(other=>sharesConstructionLayer(kind(other),kind(item))))errors.push('Overlapping footprints.');
      others.push(item);occupants.set(key,others);
      // The primary surface remains the building, regardless of insertion order.
      if(!map.has(key)||kind(item)!=='power-conduit')(map as Map<number,typeof item>).set(key,item);
    }
  }
  const isImpassable = (cell: { x: number; z: number }): boolean => ['water', 'rock'].includes(world.tiles[cellKey(cell)]!.terrain);
  const spatialPawns=world.pawns.filter(pawn=>pawn.id!==offMapScout?.id&&!(version>=89&&pawn.state==='dead'&&(pawn.body?.pileId!==undefined||pawn.body?.lostAt!==undefined))),spatialPawnSet=new Set(spatialPawns);
  for (const item of [...world.resources, ...spatialPawns, ...world.stockpiles]) if (isImpassable(item)) errors.push('Entity placed on impassable terrain.');
  for (const [key,item] of [...structureCells, ...jobCells]) if (item.kind!=='mine'&&['water', 'rock'].includes(world.tiles[key]!.terrain)) errors.push('Footprint on impassable terrain.');
  for (const resource of world.resources) if (structureCells.has(cellKey(resource))&&!conduitKeepsPlant(structureCells.get(cellKey(resource))!.kind,resource.kind)&&!(version>=203&&structureCells.get(cellKey(resource))!.kind==='hydroponics-basin'&&hydroponicPlantAllowed(world,structureCells.get(cellKey(resource))!.id,resource))) errors.push('Resource overlaps a structure.');
  for (const zone of world.stockpiles) if (resourceCells.has(cellKey(zone)) || (version<21?structureCells.has(cellKey(zone))||jobCells.has(cellKey(zone)) : occupancyOf(structureCells.get(cellKey(zone))?.kind??'cut')?.zones===false || jobCells.has(cellKey(zone))&&!['deconstruct','uninstall'].includes(jobCells.get(cellKey(zone))!.kind)&&occupancyOf(jobCells.get(cellKey(zone))!.furniture?.kind??jobCells.get(cellKey(zone))!.kind)?.zones!==true)) errors.push('Storage overlaps fixed content.');
  if(version>=21)for(const zone of world.growingZones)if(zone.cells.some(c=>occupancyOf(structureCells.get(c)?.kind??'cut')?.zones===false&&!(version>=203&&structureCells.get(c)?.kind==='hydroponics-basin'&&zone.basinId===structureCells.get(c)!.id)||occupancyOf(jobCells.get(c)?.furniture?.kind??jobCells.get(c)?.kind??'cut')?.zones===false))errors.push('Growing zone overlaps incompatible construction.');
  const pawnCells = new Set<number>();
  const bedOwners = new Set<number>();
  const sleepingBeds = new Set<number>();
  const diningCells = new Set<number>();
  const serviceCells = new Set<number>();
  for (const pawn of world.pawns) {
    const key = cellKey(pawn);
    const spatial=spatialPawnSet.has(pawn);
    if(version>=22&&pawn.transitExit&&!pawn.motion)errors.push('Furniture exit lacks a physical edge.');
    if(version>=14) {
      const service=serviceCell(pawn);
      if(service) {const target=cellKey(service);if(serviceCells.has(target))errors.push('Conflicting service reservation.');serviceCells.add(target);}
    }
    if (spatial) {if (version < 14 && pawnCells.has(key)) errors.push('Pawns overlap.'); pawnCells.add(key);}
    if (spatial&&((version<22?['wall', 'table']:['wall']).includes(structureCells.get(key)?.kind ?? '') || version<16&&['wall', 'table'].includes(jobCells.get(key)?.kind ?? ''))) errors.push('Pawn occupies a wall target.');
    if (Number(version>=179&&!!pawn.surgery) + Number(version>=106&&!!pawn.animalHandling) + Number(version>=106&&!!pawn.animalCare) + Number(version>=86&&!!pawn.ward) + Number(version>=52&&!!pawn.equipmentTask) + Number(version>=48&&!!pawn.feed) + Number(version>=47&&!!pawn.tend) + Number(version>=46&&!!pawn.rescue) + Number(version>=10&&!!pawn.cooking) + Number(pawn.jobId !== null) + Number(pawn.haul !== null) + Number(!legacyV2 && pawn.need !== null) > 1) errors.push('Pawn has two simultaneous tasks.');
    if (pawn.jobId !== null) {
      const job = jobById.get(pawn.jobId);
      if (!job || job.reservedBy !== pawn.id || job.status !== 'active') errors.push('Pawn/job reservation mismatch.');
      if (job && pawn.priorities[workType(job)] === 0 && !(version>=17&&pawn.orders.active===job.id)) errors.push('Pawn assigned to disabled work.');
    }
    const owned = world.piles.filter(pile => pile.owner.type === 'pawn' && pile.owner.pawnId === pawn.id);
    if (owned.length > 1 || (owned.length === 1 && !(version>=210&&pawn.surgery?.implant&&pawn.surgery.phase==='approach'&&Array.isArray(pawn.surgery.ingredients)&&pawn.surgery.ingredients.some(i=>i?.stage==='held')) && !(version>=179&&pawn.surgery?.medicine&&pawn.surgery.phase==='approach') && !(version>=106&&pawn.animalHandling&&pawn.animalHandling.phase!=='pickup') && !(version>=106&&pawn.animalCare?.medicine&&pawn.animalCare.phase!=='pickup') && !(version>=89&&pawn.burial&&pawn.burial.phase!=='pickup') && !(version>=86&&pawn.ward?.kind==='food'&&pawn.ward.phase==='deliver') && !(version>=51&&pawn.tend?.medicine&&pawn.tend.phase!=='pickup') && !(version>=48&&pawn.feed&&pawn.feed.phase!=='pickup') && !(version>=44&&pawn.interruptedCargo) && !(version >= 10 && pawn.cooking) && pawn.haul?.phase !== 'deliver' && (legacyV2 || pawn.need?.kind !== 'eat' || pawn.need.phase === 'pickup'))) errors.push('Carried ownership mismatch.');
    if (version>=179&&pawn.surgery || version>=86&&pawn.ward || version>=73&&pawn.research || pawn.jobId !== null || pawn.haul !== null || version>=52&&pawn.equipmentTask || version>=48&&pawn.feed || version>=47&&pawn.tend || version>=46&&pawn.rescue || version >= 10 && pawn.cooking) { if (!['moving', 'working'].includes(pawn.state)) errors.push('Assigned pawn has incompatible state.'); }
    else if (!(version>=196&&groupOnMapMember(world,pawn.id))&&!(version>=193&&pawn.bombRefuge)&&!(version>=171&&scoutOnMapId(world)===pawn.id||version>=180&&commercialOnMapId(world)===pawn.id)&&!(version>=106&&(pawn.animalHandling||pawn.animalCare))&&!(version>=89&&(pawn.burial||pawn.cleaning))&&!(version>=88&&(pawn.visitor||pawn.trade))&&!(version>=87&&(pawn.burning||pawn.firefighting))&&!(version>=86&&pawn.prisoner)&&!(version>=79&&pawn.hunting)&&!(version>=74&&pawn.heatRefuge)&&!(version>=68&&pawn.raid)&&!(version>=65&&pawn.mental?.crisis)&&!(version>=61&&pawn.tactics)&&!(version>=59&&pawn.melee)&&!(version>=58&&pawn.flee) && !(version>=53&&pawn.draft) && !(version>=15&&pawn.recreation.task) && (legacyV2 || pawn.need === null) && (pawn.path.length || ['moving', 'working'].includes(pawn.state)) && !(version>=22&&pawn.transitExit&&pawn.state!=='working')) errors.push('Unassigned pawn has path or work state.');
    if (!legacyV2) {
      if (pawn.bedId !== null) {
        if (![...world.structures,...(world.packed??[]).map(p=>p.building)].some(bed => isBedKind(bed.kind) && !bed.medical && bed.id === pawn.bedId) || bedOwners.has(pawn.bedId)) errors.push('Invalid or duplicate bed ownership.');
        bedOwners.add(pawn.bedId);
      }
      const need = pawn.need;
      if (need?.kind === 'eat') {
        if (need.sourcePileId >= world.nextId) errors.push('Invalid food source identity.');
        const pile = pileById.get(need.phase === 'pickup' ? need.sourcePileId : need.carryPileId!);
        if (need.phase === 'pickup') {
          if (pawn.state !== 'moving' || need.progress !== 0 || need.carryPileId !== null || !pile || pile.kind !== 'food' || pile.owner.type !== 'ground' || reservedSource(world, pile.id) > pile.quantity) errors.push('Invalid meal reservation.');
        } else {
          if (owned[0]?.id !== need.carryPileId || !pile || pile.kind !== 'food' || pile.quantity !== (need.quantity ?? 1) || pile.owner.type !== 'pawn' || pile.owner.pawnId !== pawn.id) errors.push('Invalid ingestion ownership or state.');
          if (need.phase === 'ingest' ? pawn.state !== 'eating' || pawn.path.length > 0 : pawn.state !== 'moving' || need.progress !== 0) errors.push('Invalid meal phase or state.');
        }
        if (version >= 5 && pile && need.quantity > ITEM_DEFINITIONS[pile.item].maxIngest) errors.push('Meal exceeds item ingestion limit.');
        if (version >= 4) {
          if (need.phase === 'pickup' || need.phase === 'choose-spot') {
            if (need.dining !== null || (need.phase === 'choose-spot' && pawn.path.length && !(version>=22&&pawn.transitExit))) errors.push('Meal search has a premature dining reservation.');
          } else {
            const place = need.dining;
            if (!place || !validDiningPlace(world, place)) errors.push('Invalid dining furniture reference.');
            else {
              const target = cellKey(place.target);
              if (diningCells.has(target) || isImpassable(place.target) || ['wall', 'table'].includes(structureCells.get(target)?.kind ?? '') || (version<16||jobCells.get(target)?.construction==='frame')&&['wall', 'table'].includes(jobCells.get(target)?.kind ?? '')) errors.push('Invalid or duplicate dining destination.');
              diningCells.add(target);
              if (need.phase === 'ingest' && key !== target) errors.push('Eating away from reserved place.');
              if (place.seatId !== null && place.tableId === null) errors.push('Dining seat has no eating surface.');
            }
          }
        }
      } else if (need?.kind === 'sleep') {
        if (need.bedId !== null) {
          const bed = world.structures.find(item => item.id === need.bedId && isBedKind(item.kind));
          if (!bed || (pawn.bedId !== bed.id && !(version>=46&&bed.medical&&(pawn.state==='downed'||version>=47&&!!need.medical))) || cellKey(bed) !== cellKey(need.target) || sleepingBeds.has(need.bedId)) errors.push('Invalid sleep reservation.');
          sleepingBeds.add(need.bedId);
        }
        if(version>=22&&need.bedId===null&&!canStandAt(world,need.target)) errors.push('Ground sleep requires a standable cell.');
        if (need.phase === 'sleep' ? (pawn.state !== 'sleeping' && !(version>=47&&pawn.state==='resting'&&need.medical) && !(version>=45&&pawn.state==='downed')) || pawn.path.length > 0 || cellKey(pawn) !== cellKey(need.target) : pawn.state !== 'moving') errors.push('Invalid sleep position or phase.');
      } else if (['eating', 'sleeping',...(version>=47?['resting']:[])].includes(pawn.state)) errors.push('Need action without a task.');
    }
    if(pawn.haul?.whole)errors.push(...validateFurnitureHaul(world,pawn));
    if (pawn.haul && !pawn.haul.whole) {
      const haul = pawn.haul;
      if (pawn.priorities[haulingWork(haul.destination)] === 0 && !(version>=18&&pawn.orders.active==='haul')) errors.push('Pawn hauling with disabled work.');
      if (haul.sourcePileId >= world.nextId) errors.push('Invalid source identity.');
      const pile = pileById.get(haul.phase === 'pickup' ? haul.sourcePileId : haul.carryPileId!);
      if(haul.destination.type==='stockpile'&&haul.destination.forHunting&&(pile?.kind!=='corpse'||haul.quantity!==1||haul.whole))errors.push('Hunting can only haul one corpse.');
      if (haul.phase === 'pickup') {
        if (haul.carryPileId !== null || !pile || pile.owner.type !== 'ground' || reservedSource(world, pile.id) > pile.quantity) errors.push('Invalid source quantity reservation.');
      } else if (!pile || pile.owner.type !== 'pawn' || pile.owner.pawnId !== pawn.id || pile.quantity !== haul.quantity || owned[0]?.id !== haul.carryPileId) errors.push('Invalid carried quantity.');
      if(haul.destination.type==='turret'){
        if(version<193||pile?.item!=='steel'||turretReloadPawnReason(pawn)||turretReloadCapacity(world,haul.destination.structureId,pawn.id,haul.destination.forced)<haul.quantity)errors.push('Invalid turret service reservation.');
      } else if (haul.destination.type === 'fuel') {
        const fuelTargetId=haul.destination.structureId;
        if(haul.destination.forCooking&&!['campfire',...(version>=84?['fueled-stove']:[])].includes(world.structures.find(s=>s.id===fuelTargetId)?.kind??''))errors.push('Cooking refuel targets a non-cooking building.');
        if(pile?.item!=='wood'||fuelCapacity(world,haul.destination.structureId,pawn.id,haul.destination.forced)<haul.quantity)errors.push('Invalid fuel delivery reservation.');
      } else if (haul.destination.type === 'job') {
        const job = jobById.get(haul.destination.jobId);
        const capacity = job && pile ? version < 5
          ? JOB_WOOD_COST[job.kind] - deliveredStock(world,job.id).wood - reservedDestination(world,haul.destination,pawn.id)
          : constructionCapacity(world,job,pile.item,pawn.id) : 0;
        if (!job || !pile || version < 5 && pile.kind !== 'wood' || capacity < haul.quantity) errors.push('Invalid construction delivery reservation.');
      } else if (haul.destination.type === 'aside') {
        if (!validSowingClearance(world,haul.destination)||!pile || asideCapacity(world, haul.destination, pile.item, pawn.id) < haul.quantity
          || (pile.owner.type === 'ground' && cellKey(pile.owner) === cellKey(haul.destination))) errors.push('Invalid clearing destination reservation.');
      } else {
        const zone = world.stockpiles.find(item => haul.destination.type === 'stockpile' && item.id === haul.destination.stockpileId);
        if (!zone || !pile || !storageAccepts(zone,pile) || (version>=6 ? storageCapacity(world,zone,pile,pawn.id)<haul.quantity : groundQuantity(world, zone) + reservedDestination(world, haul.destination) > zone.capacity)) errors.push('Invalid storage capacity reservation.');
        if (zone && pile?.owner.type === 'ground' && cellKey(zone) === cellKey(pile.owner)) errors.push('Haul source is its own destination.');
      }
    }
  }
  for (const job of world.jobs) {
    if (workProgress(job) >= jobDuration(world, job)) errors.push('Completed job left in queue.');
    if ((job.status === 'active') !== (job.reservedBy !== null)) errors.push('Job reservation/status mismatch.');
    if (job.reservedBy !== null && pawnById.get(job.reservedBy)?.jobId !== job.id && !(version>=17&&pawnById.get(job.reservedBy)?.orders.queue.includes(job.id))) errors.push('Job references missing or mismatched pawn.');
    const delivered = deliveredStock(world, job.id);
    if (job.escrow.wood !== delivered.wood || job.escrow.food !== delivered.food || delivered.food !== 0 || delivered.wood > requiredMaterial(job,'wood')) errors.push('Invalid delivered material view.');
    // Version 1 could refund escrow on interruption while retaining progress. Such plans
    // keep that progress, but may only acquire a builder after physical delivery again.
    if (job.reservedBy !== null && !job.clearance && (version<5 ? delivered.wood<JOB_WOOD_COST[job.kind] : !constructionSupplied(world,job))) errors.push('Construction work started before delivery.');
    const resource = resourceCells.get(cellKey(job));
    if (job.kind === 'chop' || job.kind === 'harvest' || job.kind === 'cut') { if (!(version>=90&&(job as typeof job&{flowerPotId?:number}).flowerPotId)&&(!resource || !(job.kind === 'chop' ? resource.kind === 'tree' : isPlant(resource)))) errors.push('Gather job has no matching resource.'); else if (version >= 7 && job.kind === 'harvest' && resource && !(version === 7 ? legacyPlantGrowth(world,resource) > .65 : harvestable(world,resource))) errors.push('Harvest job targets an immature plant.'); }
    else if(!(version>=90&&(job as typeof job&{flowerPotId?:number}).flowerPotId)&&!isRoofJob(job)&&job.kind!=='repair'&&job.kind!=='fix-breakdown'&&job.kind!=='flick'&&job.kind!=='mine'&&job.kind!=='deconstruct'&&job.kind!=='uninstall'&&job.kind!=='install')for (const cell of footprintCells(job)) {
      const obstacle=resourceCells.get(cellKey(cell));
      if (obstacle&&!conduitKeepsPlant(job.kind,obstacle.kind)&&(version<16||!isConstruction(job)||obstacle.kind==='rock') || world.structures.some(s=>sharesConstructionLayer(job.kind,s.kind)&&footprintCells(s).some(c=>cellKey(c)===cellKey(cell))&&!(version>=203&&job.kind==='sow'&&s.kind==='hydroponics-basin'&&world.growingZones.some(z=>z.id===job.growingZoneId&&z.basinId===s.id&&z.cells.includes(cellKey(cell)))))) errors.push('Construction overlaps existing content.');
    }
  }
  const available = { wood: 0, food: 0 };
  for (const pile of world.piles) {
    const owner = pile.owner;
    if (owner.type === 'ground') {
      if (version>=6 && groundPile(world,owner)?.id!==pile.id) errors.push('Several item stacks occupy one floor cell.');
      if (version>=21&&!groundOccupancyAllows(world,owner) || isImpassable(owner) || structureCells.get(cellKey(owner))?.kind === 'wall' || version<16&&jobCells.get(cellKey(owner))?.kind === 'wall') errors.push('Pile on impassable cell.');
      if(pile.kind==='wood'||pile.kind==='food')available[pile.kind] += pile.quantity;
    } else if (owner.type === 'pawn') { if (!pawnById.has(owner.pawnId)) errors.push('Pile references missing carrier.'); if((pile.kind==='wood'||pile.kind==='food')&&(version<88||(pawnById.get(owner.pawnId)?.faction??'colony')==='colony'))available[pile.kind] += pile.quantity; }
    else if(owner.type==='equipment'||owner.type==='apparel'||owner.type==='inventory'){if(!pawnById.has(owner.pawnId))errors.push('Missing equipment owner.');}
    else if(owner.type==='grave'){if(!world.structures.some(s=>s.kind==='grave'&&s.id===owner.graveId))errors.push('Missing grave owner.');}
    else if (!jobById.has(owner.jobId)) errors.push('Pile references missing construction.');
  }
  if (world.stock.wood !== available.wood || world.stock.food !== available.food) errors.push('Derived stock differs from physical piles.');
  return errors;
}

function validateV90Persistence(world:World,version:number):string[] {
  const errors:string[]=[],future=[world.apparelWear,world.apparelPolicies,world.nextApparelPolicyId];
  if(version<90){
    if(future.some(value=>value!==undefined))errors.push('Legacy save contains V90 apparel persistence.');
  }else{
    const wear=world.apparelWear;
    // Focused subsystem tests and tools can advance the global tick without
    // running the engine scheduler. The overdue pulse is replayed on the next
    // engine step; only a pulse more than one interval ahead is impossible.
    if(!record(wear)||Object.keys(wear).some(key=>!['nextWearAt','rng'].includes(key))||!integer(wear.nextWearAt,0,world.tick+APPAREL_WEAR_INTERVAL)||!integer(wear.rng,0,0xffffffff))errors.push('Invalid apparel wear calendar.');
    const policies=world.apparelPolicies;
    if(!Array.isArray(policies)||policies.length<1||policies.length>32||!integer(world.nextApparelPolicyId??0,1))errors.push('Invalid apparel policy registry.');
    else {
      const ids=new Set<number>(),allowed=['id','label','allowedItems','allowedMaterials','minQuality','maxQuality','minHitPointsPercent','maxHitPointsPercent'];
      for(const policy of policies){
        if(!record(policy)||Object.keys(policy).length!==allowed.length||Object.keys(policy).some(key=>!allowed.includes(key))||!validApparelPolicy(policy as never)||version<120&&(Array.isArray(policy.allowedItems)&&policy.allowedItems.some(i=>V120_ANIMAL_PRODUCT_ITEMS.includes(String(i)))||Array.isArray(policy.allowedMaterials)&&policy.allowedMaterials.includes('muffalo-wool'))||version<141&&Array.isArray(policy.allowedItems)&&policy.allowedItems.includes('flak-helmet')||version<148&&Array.isArray(policy.allowedItems)&&policy.allowedItems.includes('recon-helmet')||version<178&&(Array.isArray(policy.allowedItems)&&policy.allowedItems.some(i=>V190_ITEM_IDS.includes(String(i)))||Array.isArray(policy.allowedMaterials)&&policy.allowedMaterials.includes('foxfur'))||String(policy.label).length>60||ids.has(Number(policy.id)))errors.push('Invalid apparel policy.');
        else ids.add(Number(policy.id));
      }
      if(ids.size&&Number(world.nextApparelPolicyId)<=Math.max(...ids))errors.push('Apparel policy identity was reused.');
      for(const pawn of world.pawns){
        const ordinary=(pawn.faction??'colony')==='colony'&&!pawn.visitor&&!pawn.prisoner&&pawn.state!=='dead';
        const hasPolicy=pawn.apparelPolicyId!==undefined||pawn.apparelAutomation!==undefined||pawn.nextApparelCheckAt!==undefined;
        if(ordinary&&!hasPolicy)errors.push('Player pawn lacks an apparel policy.');
        // A check may remain due while urgent work, incapacity or a player order
        // owns the pawn. Only the next future interval has an upper bound.
        if(hasPolicy&&(!integer(pawn.apparelPolicyId,1)||!ids.has(pawn.apparelPolicyId!)||typeof pawn.apparelAutomation!=='boolean'||!integer(pawn.nextApparelCheckAt,0,world.tick+APPAREL_POLICY_INTERVAL.max)))errors.push('Invalid pawn apparel policy assignment.');
      }
    }
  }
  const qualityKinds=new Set(['bed',...(version>=187?['hospital-bed']:[]),'table','stool','dining-chair','armchair','end-table','dresser','table-square','table-long','flower-pot',...(version>=122?['chess-table']:[])]);
  for(const pack of world.packed??[]){
    const building=pack.building;
    if(version<90?building.quality!==undefined:(qualityKinds.has(building.kind)||version>=104&&['small-sculpture','large-sculpture'].includes(building.kind))?!isFurnitureQuality(building.quality):building.quality!==undefined)errors.push('Invalid packed furniture quality for schema.');
    if(building.flower!==undefined&&(version<90||building.kind!=='flower-pot'||validateFlowerPotState(building.flower,world.tick).length>0))errors.push('Invalid packed flower pot state for schema.');
    if(version>=90&&building.kind==='flower-pot'&&building.flower===undefined)errors.push('Packed flower pot lacks its physical plant state.');
  }
  return errors;
}

export function serializeWorld(world: World): string {
  const errors = validateWorld(world); if (errors.length) throw new Error(`Cannot save invalid world: ${errors.join(' ')}${errors.includes('Missing travel segment for movement delay.')?' Travel diagnostic: '+JSON.stringify(world.pawns.map(p=>({id:p.id,cooldown:p.moveCooldown,motion:p.motion}))):''}`);
  const serialized = JSON.stringify(world); if (serialized.length > 16_000_000) throw new Error('Save exceeds supported size.'); return serialized;
}
export function deserializeWorld(serialized: string): World {
  if (typeof serialized !== 'string' || serialized.length > 16_000_000) throw new Error('Invalid or oversized save.');
  let input: unknown = JSON.parse(serialized);
  if (record(input) && input.schemaVersion === 1) input = migrateLegacy(input);
  if (record(input) && input.schemaVersion === 2) {
    const errors = validateSchema(input, 2);
    if (errors.length) throw new Error(`Invalid version 2 save: ${errors.join(' ')}`);
    input.schemaVersion = 4;
    initializeNeeds(input as unknown as World);
    initializeDining(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 3) {
    const errors = validateSchema(input, 3);
    if (errors.length) throw new Error(`Invalid version 3 save: ${errors.join(' ')}`);
    input.schemaVersion = 4;
    initializeDining(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 4) {
    const errors = validateSchema(input, 4);
    if (errors.length) throw new Error(`Invalid version 4 save: ${errors.join(' ')}`);
    initializeFood(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 5) {
    const errors=validateSchema(input,5);if(errors.length) throw new Error(`Invalid version 5 save: ${errors.join(' ')}`);
    initializeSpatial(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 6) {
    const errors=validateSchema(input,6); if(errors.length) throw new Error(`Invalid version 6 save: ${errors.join(' ')}`);
    initializePlants(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 7) {
    const errors=validateSchema(input,7); if(errors.length) throw new Error(`Invalid version 7 save: ${errors.join(' ')}`);
    initializeFarming(input as unknown as World);
  }
  if (record(input) && input.schemaVersion === 8) {
    const errors = validateSchema(input, 8); if (errors.length) throw new Error(`Invalid version 8 save: ${errors.join(' ')}`);
    // Existing paths, reservations and meals continue; only future decisions change.
    input.schemaVersion = 9;
  }
  if(record(input)&&input.schemaVersion===9) {
    const errors=validateSchema(input,9);if(errors.length)throw new Error(`Invalid version 9 save: ${errors.join(' ')}`);
    for(const pawn of (input as unknown as World).pawns){pawn.cooking=null;pawn.priorities.cook=2;}
    input.schemaVersion=10; // No old campfires: preserve all existing objects and tasks.
  }
  if(record(input)&&input.schemaVersion===10) {
    const errors=validateSchema(input,10);if(errors.length)throw new Error(`Invalid version 10 save: ${errors.join(' ')}`);
    initializePreservation(input as unknown as World);
  }
  if(record(input)&&input.schemaVersion===11) {
    const errors=validateSchema(input,11);if(errors.length)throw new Error(`Invalid version 11 save: ${errors.join(' ')}`);
    initializeSchedules(input as unknown as World);
  }
  if(record(input)&&input.schemaVersion===12) {
    const errors=validateSchema(input,12);if(errors.length)throw new Error(`Invalid version 12 save: ${errors.join(' ')}`);
    initializeFoodPolicies(input as unknown as World);
  }
  if(record(input)&&input.schemaVersion===13) {
    const errors=validateSchema(input,13);if(errors.length)throw new Error(`Invalid version 13 save: ${errors.join(' ')}`);
    input.schemaVersion=14; // Positions, active edges, jobs and reservations are preserved.
  }
  if(record(input)&&input.schemaVersion===14) {
    const errors=validateSchema(input,14);if(errors.length)throw new Error(`Invalid version 14 save: ${errors.join(' ')}`);
    initializeRecreation(input as unknown as World);
  }
  if(record(input)&&input.schemaVersion===15) {
    const errors=validateSchema(input,15);if(errors.length)throw new Error(`Invalid version 15 save: ${errors.join(' ')}`);
    initializeConstruction(input as unknown as World);
  }
  if(record(input)&&input.schemaVersion===16) {
    const errors=validateSchema(input,16);if(errors.length)throw new Error(`Invalid version 16 save: ${errors.join(' ')}`);
    initializePlayerOrders(input as unknown as World);
  }
  if(record(input)&&input.schemaVersion===17) {
    const errors=validateSchema(input,17);if(errors.length)throw new Error(`Invalid version 17 save: ${errors.join(' ')}`);
    input.schemaVersion=18; // Existing numeric work orders and active tasks continue unchanged.
  }
  if(record(input)&&input.schemaVersion===18) {
    const errors=validateSchema(input,18);if(errors.length)throw new Error(`Invalid version 18 save: ${errors.join(' ')}`);
    input.schemaVersion=19; // New contextual providers; preserve existing tasks and quantities.
  }
  if(record(input)&&input.schemaVersion===19) {
    const errors=validateSchema(input,19);if(errors.length)throw new Error(`Invalid version 19 save: ${errors.join(' ')}`);
    input.schemaVersion=20; // Preserve tasks; enable queued recipes and sowing-clearance intents.
  }
  if(record(input)&&input.schemaVersion===20) {
    const errors=validateSchema(input,20);if(errors.length)throw new Error(`Invalid version 20 save: ${errors.join(' ')}`);
    initializeOccupancy(input as unknown as World);
  }
  if(record(input)&&input.schemaVersion===21) {
    const errors=validateSchema(input,21);if(errors.length)throw new Error(`Invalid version 21 save: ${errors.join(' ')}`);
    initializeFurnitureTravel(input as unknown as World);
  }
  if(record(input)&&input.schemaVersion===22) {
    const errors=validateSchema(input,22);if(errors.length)throw new Error(`Invalid version 22 save: ${errors.join(' ')}`);
    input.schemaVersion=23; // No invented priority for orders accepted by an older version.
  }
  if(record(input)&&input.schemaVersion===23) {
    const errors=validateSchema(input,23);if(errors.length)throw new Error(`Invalid version 23 save: ${errors.join(' ')}`);
    input.schemaVersion=24;input.deconstructed={count:0,lostWood:0,fuelTicks:0};
  }
  if(record(input)&&input.schemaVersion===24){const errors=validateSchema(input,24);if(errors.length)throw new Error(`Invalid version 24 save: ${errors.join(' ')}`);input.schemaVersion=25;input.packed=[];}
  if(record(input)&&input.schemaVersion===25){const errors=validateSchema(input,25);if(errors.length)throw new Error(`Invalid version 25 save: ${errors.join(' ')}`);input.schemaVersion=26;}
  if(record(input)&&input.schemaVersion===26){const errors=validateSchema(input,26);if(errors.length)throw new Error(`Invalid version 26 save: ${errors.join(' ')}`);input.schemaVersion=27;}
  if(record(input)&&input.schemaVersion===27){const errors=validateSchema(input,27);if(errors.length)throw new Error(`Invalid version 27 save: ${errors.join(' ')}`);input.schemaVersion=28;for(const p of (input as unknown as World).pawns)p.priorities.mine=2;}
  if(record(input)&&input.schemaVersion===28){const errors=validateSchema(input,28);if(errors.length)throw new Error(`Invalid version 28 save: ${errors.join(' ')}`);input.schemaVersion=29;}
  if(record(input)&&input.schemaVersion===29){const errors=validateSchema(input,29);if(errors.length)throw new Error(`Invalid version 29 save: ${errors.join(' ')}`);input.schemaVersion=30;}
  if(record(input)&&input.schemaVersion===30){const errors=validateSchema(input,30);if(errors.length)throw new Error(`Invalid version 30 save: ${errors.join(' ')}`);input.schemaVersion=31;}
  if(record(input)&&input.schemaVersion===31){const errors=validateSchema(input,31);if(errors.length)throw new Error(`Invalid version 31 save: ${errors.join(' ')}`);input.schemaVersion=32;const w=input as unknown as World;for(const p of w.pawns)p.priorities.craft=2;for(const s of [...w.structures,...w.packed.map(p=>p.building)])if(s.kind==='stonecutter')s.bills=[];}
  if(record(input)&&input.schemaVersion===32){const errors=validateSchema(input,32);if(errors.length)throw new Error(`Invalid version 32 save: ${errors.join(' ')}`);input.schemaVersion=33;}
  if(record(input)&&input.schemaVersion===33){const errors=validateSchema(input,33);if(errors.length)throw new Error(`Invalid version 33 save: ${errors.join(' ')}`);input.schemaVersion=34;}
  if(record(input)&&input.schemaVersion===34){const errors=validateSchema(input,34);if(errors.length)throw new Error(`Invalid version 34 save: ${errors.join(' ')}`);input.schemaVersion=35;}
  if(record(input)&&input.schemaVersion===35){const errors=validateSchema(input,35);if(errors.length)throw new Error(`Invalid version 35 save: ${errors.join(' ')}`);const w=input as unknown as World;for(const p of w.pawns)if(p.cooking)p.cooking.progress*=productionWorkTotal(taskRecipe(p.cooking))/legacyProductionTicks(taskRecipe(p.cooking));input.schemaVersion=36;}
  if(record(input)&&input.schemaVersion===36){const errors=validateSchema(input,36);if(errors.length)throw new Error(`Invalid version 36 save: ${errors.join(' ')}`);initializeLightWork(input as unknown as World);}
  if(record(input)&&input.schemaVersion===37){const errors=validateSchema(input,37);if(errors.length)throw new Error('Invalid version 37 save: '+errors.join(' '));input.schemaVersion=38;}
  if(record(input)&&input.schemaVersion===38){const errors=validateSchema(input,38);if(errors.length)throw new Error('Invalid version 38 save: '+errors.join(' '));input.schemaVersion=39;}
  if(record(input)&&input.schemaVersion===39){const errors=validateSchema(input,39);if(errors.length)throw new Error('Invalid version 39 save: '+errors.join(' '));input.schemaVersion=40;}
  if(record(input)&&input.schemaVersion===40){const errors=validateSchema(input,40);if(errors.length)throw new Error('Invalid version 40 save: '+errors.join(' '));input.schemaVersion=41;}
  if(record(input)&&input.schemaVersion===41){const errors=validateSchema(input,41);if(errors.length)throw new Error('Invalid version 41 save: '+errors.join(' '));input.schemaVersion=42;}
  if(record(input)&&input.schemaVersion===42){const errors=validateSchema(input,42);if(errors.length)throw new Error('Invalid version 42 save: '+errors.join(' '));const w=input as unknown as World;for(const p of w.pawns){p.skills=initialSkills(8,0);delete (p.skills as Partial<typeof p.skills>).medicine;delete (p.skills as Partial<typeof p.skills>).shooting;delete (p.skills as Partial<typeof p.skills>).melee;delete p.skills.cooking;}input.schemaVersion=43;}
  if(record(input)&&input.schemaVersion===43){const errors=validateSchema(input,43);if(errors.length)throw new Error('Invalid version 43 save: '+errors.join(' '));input.schemaVersion=44;}
  if(record(input)&&input.schemaVersion===44){const errors=validateSchema(input,44);if(errors.length)throw new Error('Invalid version 44 save: '+errors.join(' '));input.schemaVersion=45;}
  if(record(input)&&input.schemaVersion===45){const errors=validateSchema(input,45);if(errors.length)throw new Error('Invalid version 45 save: '+errors.join(' '));for(const p of (input as unknown as World).pawns)p.priorities.doctor=1;input.schemaVersion=46;}
  if(record(input)&&input.schemaVersion===46){const errors=validateSchema(input,46);if(errors.length)throw new Error('Invalid version 46 save: '+errors.join(' '));for(const p of (input as unknown as World).pawns){p.priorities.patient=1;p.priorities.bedrest=3;p.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};}input.schemaVersion=47;}
  if(record(input)&&input.schemaVersion===47){const errors=validateSchema(input,47);if(errors.length)throw new Error('Invalid version 47 save: '+errors.join(' '));input.schemaVersion=48;}
  if(record(input)&&input.schemaVersion===48){const errors=validateSchema(input,48);if(errors.length)throw new Error('Invalid version 48 save: '+errors.join(' '));input.schemaVersion=49;}
  if(record(input)&&input.schemaVersion===49){const errors=validateSchema(input,49);if(errors.length)throw new Error('Invalid version 49 save: '+errors.join(' '));input.schemaVersion=50;}
  if(record(input)&&input.schemaVersion===50){const errors=validateSchema(input,50);if(errors.length)throw new Error('Invalid version 50 save: '+errors.join(' '));input.schemaVersion=51;}
  if(record(input)&&input.schemaVersion===51){const errors=validateSchema(input,51);if(errors.length)throw new Error('Invalid version 51 save: '+errors.join(' '));input.schemaVersion=52;}
  if(record(input)&&input.schemaVersion===52){const errors=validateSchema(input,52);if(errors.length)throw new Error('Invalid version 52 save: '+errors.join(' '));input.schemaVersion=53;}
  if(record(input)&&input.schemaVersion===53){const errors=validateSchema(input,53);if(errors.length)throw new Error('Invalid version 53 save: '+errors.join(' '));input.schemaVersion=54;}
  if(record(input)&&input.schemaVersion===54){const errors=validateSchema(input,54);if(errors.length)throw new Error('Invalid version 54 save: '+errors.join(' '));input.schemaVersion=55;}
  if(record(input)&&input.schemaVersion===55){const errors=validateSchema(input,55);if(errors.length)throw new Error('Invalid version 55 save: '+errors.join(' '));for(const p of (input as unknown as World).pawns)p.skills.shooting={level:8,xp:0,dailyXp:0,passion:0};input.schemaVersion=56;}
  if(record(input)&&input.schemaVersion===56){const errors=validateSchema(input,56);if(errors.length)throw new Error('Invalid version 56 save: '+errors.join(' '));input.schemaVersion=57;}
  if(record(input)&&input.schemaVersion===57){const errors=validateSchema(input,57);if(errors.length)throw new Error('Invalid version 57 save: '+errors.join(' '));input.schemaVersion=58;}
  if(record(input)&&input.schemaVersion===58){const errors=validateSchema(input,58);if(errors.length)throw new Error('Invalid version 58 save: '+errors.join(' '));for(const p of (input as unknown as World).pawns)p.skills.melee={level:8,xp:0,dailyXp:0,passion:0};input.schemaVersion=59;}
  if(record(input)&&input.schemaVersion===59){const errors=validateSchema(input,59);if(errors.length)throw new Error('Invalid version 59 save: '+errors.join(' '));input.schemaVersion=60;}
  if(record(input)&&input.schemaVersion===60){const errors=validateSchema(input,60);if(errors.length)throw new Error('Invalid version 60 save: '+errors.join(' '));input.schemaVersion=61;}
  if(record(input)&&input.schemaVersion===61){const errors=validateSchema(input,61);if(errors.length)throw new Error('Invalid version 61 save: '+errors.join(' '));input.schemaVersion=62;}
  if(record(input)&&input.schemaVersion===62){const errors=validateSchema(input,62);if(errors.length)throw new Error('Invalid version 62 save: '+errors.join(' '));input.schemaVersion=63;}
  if(record(input)&&input.schemaVersion===63){const errors=validateSchema(input,63);if(errors.length)throw new Error('Invalid version 63 save: '+errors.join(' '));input.schemaVersion=64;}
  if(record(input)&&input.schemaVersion===64){const errors=validateSchema(input,64);if(errors.length)throw new Error('Invalid version 64 save: '+errors.join(' '));input.schemaVersion=65;}
  if(record(input)&&input.schemaVersion===65){const errors=validateSchema(input,65);if(errors.length)throw new Error('Invalid version 65 save: '+errors.join(' '));input.schemaVersion=66;}
  if(record(input)&&input.schemaVersion===66){const errors=validateSchema(input,66);if(errors.length)throw new Error('Invalid version 66 save: '+errors.join(' '));input.schemaVersion=67;}
  if(record(input)&&input.schemaVersion===67){const errors=validateSchema(input,67);if(errors.length)throw new Error('Invalid version 67 save: '+errors.join(' '));input.schemaVersion=68;}
  if(record(input)&&input.schemaVersion===68){const errors=validateSchema(input,68);if(errors.length)throw new Error('Invalid version 68 save: '+errors.join(' '));input.schemaVersion=69;}
  if(record(input)&&input.schemaVersion===69){const errors=validateSchema(input,69);if(errors.length)throw new Error('Invalid version 69 save: '+errors.join(' '));input.schemaVersion=70;}
  if(record(input)&&input.schemaVersion===70){const errors=validateSchema(input,70);if(errors.length)throw new Error('Invalid version 70 save: '+errors.join(' '));input.schemaVersion=71;}
  if(record(input)&&input.schemaVersion===71){const errors=validateSchema(input,71);if(errors.length)throw new Error('Invalid version 71 save: '+errors.join(' '));input.schemaVersion=72;}
  if(record(input)&&input.schemaVersion===72){const errors=validateSchema(input,72);if(errors.length)throw new Error('Invalid version 72 save: '+errors.join(' '));input.schemaVersion=73;for(const p of (input as unknown as World).pawns)p.priorities.research=3;}
  if(record(input)&&input.schemaVersion===73){const errors=validateSchema(input,73);if(errors.length)throw new Error('Invalid version 73 save: '+errors.join(' '));input.schemaVersion=74;}
  if(record(input)&&input.schemaVersion===74){const errors=validateSchema(input,74);if(errors.length)throw new Error('Invalid version 74 save: '+errors.join(' '));input.schemaVersion=75;}
  if(record(input)&&input.schemaVersion===75){const errors=validateSchema(input,75);if(errors.length)throw new Error('Invalid version 75 save: '+errors.join(' '));input.schemaVersion=76;}
  if(record(input)&&input.schemaVersion===76){const errors=validateSchema(input,76);if(errors.length)throw new Error('Invalid version 76 save: '+errors.join(' '));input.schemaVersion=77;}
  if(record(input)&&input.schemaVersion===77){const errors=validateSchema(input,77);if(errors.length)throw new Error('Invalid version 77 save: '+errors.join(' '));input.schemaVersion=78;}
  if(record(input)&&input.schemaVersion===78){const errors=validateSchema(input,78);if(errors.length)throw new Error('Invalid version 78 save: '+errors.join(' '));input.schemaVersion=79;for(const p of (input as unknown as World).pawns)p.priorities.hunt=0;}
  if(record(input)&&input.schemaVersion===79){const errors=validateSchema(input,79);if(errors.length)throw new Error('Invalid version 79 save: '+errors.join(' '));input.schemaVersion=80;}
  if(record(input)&&input.schemaVersion===80){const errors=validateSchema(input,80);if(errors.length)throw new Error('Invalid version 80 save: '+errors.join(' '));input.schemaVersion=81;}
  if(record(input)&&input.schemaVersion===81){const errors=validateSchema(input,81);if(errors.length)throw new Error('Invalid version 81 save: '+errors.join(' '));input.schemaVersion=82;}
  if(record(input)&&input.schemaVersion===82){const errors=validateSchema(input,82);if(errors.length)throw new Error('Invalid version 82 save: '+errors.join(' '));input.schemaVersion=83;}
  if(record(input)&&input.schemaVersion===83){const errors=validateSchema(input,83);if(errors.length)throw new Error('Invalid version 83 save: '+errors.join(' '));input.schemaVersion=84;}
  if(record(input)&&input.schemaVersion===84){const errors=validateSchema(input,84);if(errors.length)throw new Error('Invalid version 84 save: '+errors.join(' '));input.schemaVersion=85;for(const p of (input as unknown as World).pawns)p.priorities.basic=3;}
  if(record(input)&&input.schemaVersion===85){const errors=validateSchema(input,85);if(errors.length)throw new Error('Invalid version 85 save: '+errors.join(' '));input.schemaVersion=86;for(const p of (input as unknown as World).pawns)p.priorities.warden=3;}
  if(record(input)&&input.schemaVersion===86){const errors=validateSchema(input,86);if(errors.length)throw new Error('Invalid version 86 save: '+errors.join(' '));input.schemaVersion=87;for(const p of (input as unknown as World).pawns)p.priorities.firefight=1;}
  if(record(input)&&input.schemaVersion===87){const errors=validateSchema(input,87);if(errors.length)throw new Error('Invalid version 87 save: '+errors.join(' '));input.schemaVersion=88;}
  if(record(input)&&input.schemaVersion===88){const errors=validateSchema(input,88);if(errors.length)throw new Error('Invalid version 88 save: '+errors.join(' '));input.schemaVersion=89;for(const p of (input as unknown as World).pawns)p.priorities.clean=p.visitor?0:3;}
  if(record(input)&&input.schemaVersion===89){
    const errors=validateSchema(input,89);if(errors.length)throw new Error('Invalid version 89 save: '+errors.join(' '));
    const world=input as unknown as World,registry=createDefaultApparelPolicyRegistry(false,false,false);
    for(const structure of [...world.structures,...world.packed.map(pack=>pack.building)])if(['bed','table','stool'].includes(structure.kind))structure.quality='normal';
    for(const pile of world.piles){
      if(pile.apparel&&(pile.item==='cloth-shirt'||pile.item==='cloth-tribalwear'))pile.apparel.material='cloth';
      if(pile.unfinished){pile.unfinished.material='cloth';pile.unfinished.units=pile.unfinished.cloth!;}
    }
    for(const departure of world.raids?.departed??[])for(const pile of departure.items)
      if(pile.apparel&&(pile.item==='cloth-shirt'||pile.item==='cloth-tribalwear'))pile.apparel.material='cloth';
    for(const departure of world.visitors?.departed??[]){
      departure.pawn.beauty=40;
      for(const pile of departure.items)if(pile.apparel&&(pile.item==='cloth-shirt'||pile.item==='cloth-tribalwear'))pile.apparel.material='cloth';
    }
    if(world.tailoring)world.tailoring.lostLeather=0;
    world.apparelWear=createApparelWearCalendar(world.tick,(world.seed^world.tick^0x0a77e1)>>>0);
    world.apparelPolicies=registry.apparelPolicies;world.nextApparelPolicyId=registry.nextApparelPolicyId;
    for(const pawn of world.pawns){
      pawn.beauty=40;
      if((pawn.faction??'colony')==='colony'&&!pawn.visitor&&!pawn.prisoner&&pawn.state!=='dead'){
        pawn.apparelPolicyId=registry.apparelPolicies[0]!.id;pawn.apparelAutomation=false;pawn.nextApparelCheckAt=world.tick+APPAREL_POLICY_INTERVAL.min+pawn.id%(APPAREL_POLICY_INTERVAL.max-APPAREL_POLICY_INTERVAL.min+1);
      }
    }
    input.schemaVersion=90;
  }
  if(record(input)&&input.schemaVersion===90){const errors=validateSchema(input,90);if(errors.length)throw new Error('Invalid version 90 save: '+errors.join(' '));input.schemaVersion=91;}
  if(record(input)&&input.schemaVersion===91){const errors=validateSchema(input,91);if(errors.length)throw new Error('Invalid version 91 save: '+errors.join(' '));input.schemaVersion=101;}
  if(record(input)&&input.schemaVersion===101){const errors=validateSchema(input,101);if(errors.length)throw new Error('Invalid version 101 save: '+errors.join(' '));input.schemaVersion=103;}
  if(record(input)&&input.schemaVersion===103){const errors=validateSchema(input,103);if(errors.length)throw new Error('Invalid version 103 save: '+errors.join(' '));input.schemaVersion=104;for(const pawn of (input as unknown as World).pawns)pawn.priorities.art=0;}
  if(record(input)&&input.schemaVersion===104){const errors=validateSchema(input,104);if(errors.length)throw new Error('Invalid version 104 save: '+errors.join(' '));input.schemaVersion=105;}
  if(record(input)&&input.schemaVersion===105){const errors=validateSchema(input,105);if(errors.length)throw new Error('Invalid version 105 save: '+errors.join(' '));input.schemaVersion=106;for(const pawn of (input as unknown as World).pawns)pawn.priorities.handle=0;}
  if(record(input)&&input.schemaVersion===106){const errors=validateSchema(input,106);if(errors.length)throw new Error('Invalid version 106 save: '+errors.join(' '));input.schemaVersion=109;}
  if(record(input)&&input.schemaVersion===109){const errors=validateSchema(input,109);if(errors.length)throw new Error('Invalid version 109 save: '+errors.join(' '));input.schemaVersion=119;}
  if(record(input)&&input.schemaVersion===119){
    const errors=validateSchema(input,119);if(errors.length)throw new Error('Invalid version 119 save: '+errors.join(' '));
    const world=input as unknown as World;
    for(const animal of world.wildlife?.animals??[])if(animal.domestic&&(animal.species==='muffalo'||animal.species==='dromedary'&&animal.sex==='female'))animal.domestic.productFullness=0;
    for(const structure of [...world.structures,...world.packed.map(pack=>pack.building)])for(const bill of structure.bills??[]){
      if(PRODUCTION_RECIPES[bill.recipe].inputs.includes('milk'))bill.filters.milk=false;
      if(PRODUCTION_RECIPES[bill.recipe].inputs.includes('muffalo-wool'))bill.filters['muffalo-wool']=false;
    }
    input.schemaVersion=120;
  }
  if(record(input)&&input.schemaVersion===120){
    const errors=validateSchema(input,120);if(errors.length)throw new Error('Invalid version 120 save: '+errors.join(' '));
    const world=input as unknown as World;
    for(const animal of world.wildlife?.animals??[])animal.ageTicks=adultAgeTicks(animal.species);
    for(const pile of world.piles)if(pile.corpse)pile.corpse.ageTicks=adultAgeTicks(pile.corpse.species);
    input.schemaVersion=121;
  }
  if(record(input)&&input.schemaVersion===121){
    const errors=validateSchema(input,121);if(errors.length)throw new Error('Invalid version 121 save: '+errors.join(' '));
    for(const pawn of (input as unknown as World).pawns){pawn.recreation.tolerance.cerebral=0;pawn.recreation.bored.cerebral=false;}
    input.schemaVersion=122;
  }
  if(record(input)&&input.schemaVersion===122){
    const errors=validateSchema(input,122);if(errors.length)throw new Error('Invalid version 122 save: '+errors.join(' '));
    input.schemaVersion=123;
    adoptExoticMerchantSchedule(input as unknown as World);
  }
  if(record(input)&&input.schemaVersion===123){
    const errors=validateSchema(input,123);if(errors.length)throw new Error('Invalid version 123 save: '+errors.join(' '));
    for(const pawn of (input as unknown as World).pawns){pawn.recreation.tolerance.social=0;pawn.recreation.bored.social=false;}
    input.schemaVersion=124;
  }
  if(record(input)&&input.schemaVersion===124){
    const errors=validateSchema(input,124);if(errors.length)throw new Error('Invalid version 124 save: '+errors.join(' '));
    // New negative memories and physical fights arise only after play resumes.
    input.schemaVersion=125;
  }
  if(record(input)&&input.schemaVersion===125){
    const errors=validateSchema(input,125);if(errors.length)throw new Error('Invalid version 125 save: '+errors.join(' '));
    // A future opportunity is scheduled without introducing illness or spending
    // the established simulation PRNG on an old colony's migration boundary.
    input.schemaVersion=127;
    adoptFluIncidents(input as unknown as World);
  }
  if(record(input)&&input.schemaVersion===127){
    const errors=validateSchema(input,127);if(errors.length)throw new Error('Invalid version 127 save: '+errors.join(' '));
    // No trait, exchange, opinion or mood is granted to an old colony.
    input.schemaVersion=134;
  }
  if(record(input)&&input.schemaVersion===134){
    const errors=validateSchema(input,134);if(errors.length)throw new Error('Invalid version 134 save: '+errors.join(' '));
    // Existing one-animal leads resume unchanged; new ropes are acquired only
    // at physical contact after this neutral migration.
    input.schemaVersion=135;
  }
  if(record(input)&&input.schemaVersion===135){
    const errors=validateSchema(input,135);if(errors.length)throw new Error('Invalid version 135 save: '+errors.join(' '));
    const world=input as unknown as World;
    for(const pawn of world.pawns)pawn.age=legacyHumanAge();
    for(const departure of world.visitors?.departed??[])departure.pawn.age=legacyHumanAge();
    input.schemaVersion=138;
  }
  if(record(input)&&input.schemaVersion===138){
    const errors=validateSchema(input,138);if(errors.length)throw new Error('Invalid version 138 save: '+errors.join(' '));
    // Research, ingredients and authored work begin only after play resumes.
    input.schemaVersion=139;
  }
  if(record(input)&&input.schemaVersion===139){
    const errors=validateSchema(input,139);if(errors.length)throw new Error('Invalid version 139 save: '+errors.join(' '));
    // New equipment is earned only through future work or trade. Persisted
    // clothing policies, including player restrictions, are left untouched.
    input.schemaVersion=141;
  }
  if(record(input)&&input.schemaVersion===141){
    const errors=validateSchema(input,141);if(errors.length)throw new Error('Invalid version 141 save: '+errors.join(' '));
    // A researched design is not granted to existing colonies retroactively.
    input.schemaVersion=143;
  }
  if(record(input)&&input.schemaVersion===143){
    const errors=validateSchema(input,143);if(errors.length)throw new Error('Invalid version 143 save: '+errors.join(' '));
    const world=input as unknown as World;
    world.breakdown=newBreakdownCalendar(world.seed,world.tick);
    input.schemaVersion=144;
  }
  if(record(input)&&input.schemaVersion===144){
    const errors=validateSchema(input,144);if(errors.length)throw new Error('Invalid version 144 save: '+errors.join(' '));
    // New research, bills and equipment are earned only after play resumes.
    // Preserve the PRNG and every existing player policy unchanged.
    input.schemaVersion=148;
  }
  if(record(input)&&input.schemaVersion===148){
    const errors=validateSchema(input,148);if(errors.length)throw new Error('Invalid version 148 save: '+errors.join(' '));
    // A new crisis can occur only through future simulation. Preserve all
    // existing moods, tasks, reservations and the simulation PRNG exactly.
    input.schemaVersion=150;
  }
  if(record(input)&&input.schemaVersion===150){
    const errors=validateSchema(input,150);if(errors.length)throw new Error('Invalid version 150 save: '+errors.join(' '));
    // Existing policies, food, memories, spoilage and PRNG continue unchanged.
    // New meals arise only through future physical production and ingestion.
    input.schemaVersion=152;
  }
  if(record(input)&&input.schemaVersion===152){
    const errors=validateSchema(input,152);if(errors.length)throw new Error('Invalid version 152 save: '+errors.join(' '));
    // Production and ingestion grant the new meal and memory only during play.
    // Preserve existing food policies, spoilage, tasks and PRNG unchanged.
    input.schemaVersion=154;
  }
  if(record(input)&&input.schemaVersion===154){
    const errors=validateSchema(input,154);if(errors.length)throw new Error('Invalid version 154 save: '+errors.join(' '));
    // The new meal, recipe and policy permission can arise only after play resumes.
    // Keep every identity, quantity, task, memory, food age and PRNG state intact.
    input.schemaVersion=155;
  }
  if(record(input)&&input.schemaVersion===155){
    const errors=validateSchema(input,155);if(errors.length)throw new Error('Invalid version 155 save: '+errors.join(' '));
    // New content begins only after play resumes. Keep policies, inventories,
    // active work, food condition, memories and the PRNG untouched.
    input.schemaVersion=156;
  }
  if(record(input)&&input.schemaVersion===156){
    const errors=validateSchema(input,156);if(errors.length)throw new Error('Invalid version 156 save: '+errors.join(' '));
    // New content arises only through future play; leave all existing state intact.
    input.schemaVersion=157;
  }
  if(record(input)&&input.schemaVersion===157){
    const errors=validateSchema(input,157);if(errors.length)throw new Error('Invalid version 157 save: '+errors.join(' '));
    // New content arises only through future play; preserve the existing state.
    input.schemaVersion=159;
  }
  if(record(input)&&input.schemaVersion===159){
    const errors=validateSchema(input,159);if(errors.length)throw new Error('Invalid version 159 save: '+errors.join(' '));
    // The bulk bill is chosen in later play, never granted to an older world.
    input.schemaVersion=160;
  }
  if(record(input)&&input.schemaVersion===160){
    const errors=validateSchema(input,160);if(errors.length)throw new Error('Invalid version 160 save: '+errors.join(' '));
    // The mixed fine bulk bill is chosen only during later play.
    input.schemaVersion=161;
  }
  if(record(input)&&input.schemaVersion===161){
    const errors=validateSchema(input,161);if(errors.length)throw new Error('Invalid version 161 save: '+errors.join(' '));
    // The vegetarian fine bulk bill is chosen only during later play.
    input.schemaVersion=162;
  }
  if(record(input)&&input.schemaVersion===162){
    const errors=validateSchema(input,162);if(errors.length)throw new Error('Invalid version 162 save: '+errors.join(' '));
    // The carnivore fine bulk bill is chosen only during later play.
    input.schemaVersion=163;
  }
  if(record(input)&&input.schemaVersion===163){
    const errors=validateSchema(input,163);if(errors.length)throw new Error('Invalid version 163 save: '+errors.join(' '));
    // The mixed lavish bulk bill is chosen only during later play.
    input.schemaVersion=164;
  }
  if(record(input)&&input.schemaVersion===164){
    const errors=validateSchema(input,164);if(errors.length)throw new Error('Invalid version 164 save: '+errors.join(' '));
    // The vegetarian lavish bulk bill is chosen only during later play.
    input.schemaVersion=165;
  }
  if(record(input)&&input.schemaVersion===165){
    const errors=validateSchema(input,165);if(errors.length)throw new Error('Invalid version 165 save: '+errors.join(' '));
    // The carnivore lavish bulk bill is chosen only during later play.
    input.schemaVersion=166;
  }
  if(record(input)&&input.schemaVersion===166){
    const errors=validateSchema(input,166);if(errors.length)throw new Error('Invalid version 166 save: '+errors.join(' '));
    // No retrospective plants, doses or RNG draws; only future wild renewal may use the new species.
    input.schemaVersion=167;
  }
  if(record(input)&&input.schemaVersion===167){
    const errors=validateSchema(input,167);if(errors.length)throw new Error('Invalid version 167 save: '+errors.join(' '));
    // An absent Plants profile retains the old neutral work and harvest behavior
    // until a colonist performs future plant work. No past XP or RNG is invented.
    input.schemaVersion=168;
  }
  if(record(input)&&input.schemaVersion===168){
    const errors=validateSchema(input,168);if(errors.length)throw new Error('Invalid version 168 save: '+errors.join(' '));
    // No retrospective event, calendar, exposure or RNG draw. Playing resumes
    // the selected profile through an explicit prospective engine adoption.
    input.schemaVersion=169;
  }
  if(record(input)&&input.schemaVersion===169){
    const errors=validateSchema(input,169);if(errors.length)throw new Error('Invalid version 169 save: '+errors.join(' '));
    // Death memories arise at future transitions, never from retained historical bodies.
    input.schemaVersion=170;
  }
  if(record(input)&&input.schemaVersion===170){
    const errors=validateSchema(input,170);if(errors.length)throw new Error('Invalid version 170 save: '+errors.join(' '));
    input.schemaVersion=171;
  }
  if(record(input)&&input.schemaVersion===171){
    const errors=validateSchema(input,171);if(errors.length)throw new Error('Invalid version 171 save: '+errors.join(' '));
    // The quest calendar is enabled only through a later player decision.
    input.schemaVersion=172;
  }
  if(record(input)&&input.schemaVersion===172){
    const errors=validateSchema(input,172);if(errors.length)throw new Error('Invalid version 172 save: '+errors.join(' '));
    // Flashstorm exists only at a future eligible Misc opportunity.
    input.schemaVersion=173;
  }
  if(record(input)&&input.schemaVersion===173){
    const errors=validateSchema(input,173);if(errors.length)throw new Error('Invalid version 173 save: '+errors.join(' '));
    // No departed animal, route, ecological history or random draw is invented.
    input.schemaVersion=174;
  }
  if(record(input)&&input.schemaVersion===174){
    const errors=validateSchema(input,174);if(errors.length)throw new Error('Invalid version 174 save: '+errors.join(' '));
    // No patient, capsule, injuries, items, admission or random draw is invented.
    input.schemaVersion=175;
  }
  if(record(input)&&input.schemaVersion===175){
    const errors=validateSchema(input,175);if(errors.length)throw new Error('Invalid version 175 save: '+errors.join(' '));
    // Absent quality/HP ranges retain historical storage rules without invented settings.
    input.schemaVersion=176;
  }
  if(record(input)&&input.schemaVersion===176){
    const errors=validateSchema(input,176);if(errors.length)throw new Error('Invalid version 176 save: '+errors.join(' '));
    // No lamp, crop, light history, power or random draw is invented.
    input.schemaVersion=177;
  }
  if(record(input)&&input.schemaVersion===177){
    const errors=validateSchema(input,177);if(errors.length)throw new Error('Invalid version 177 save: '+errors.join(' '));
    // No predator, consumed anatomy, hunt, food or ecological target is invented.
    input.schemaVersion=178;
  }
  if(record(input)&&input.schemaVersion===178){
    const errors=validateSchema(input,178);if(errors.length)throw new Error('Invalid version 178 save: '+errors.join(' '));
    // No request, dose, operation, anesthetic or medical history is invented.
    input.schemaVersion=179;
  }
  if(record(input)&&input.schemaVersion===179){
    const errors=validateSchema(input,179);if(errors.length)throw new Error('Invalid version 179 save: '+errors.join(' '));
    // No expedition, destination, stock, money or purchase is invented.
    input.schemaVersion=180;
  }
  if(record(input)&&input.schemaVersion===180){
    const errors=validateSchema(input,180);if(errors.length)throw new Error('Invalid version 180 save: '+errors.join(' '));
    // No exposure, discharge, clock or random draw is invented.
    input.schemaVersion=181;
  }
  if(record(input)&&input.schemaVersion===181){
    const errors=validateSchema(input,181);if(errors.length)throw new Error('Invalid version 181 save: '+errors.join(' '));
    // No cultivated plant, medicine, profile, exposure, progress or draw is invented.
    input.schemaVersion=182;
  }
  if(record(input)&&input.schemaVersion===182){
    const errors=validateSchema(input,182);if(errors.length)throw new Error('Invalid version 182 save: '+errors.join(' '));
    // No incident, rage, mental clock or random draw is invented.
    input.schemaVersion=183;
  }
  if(record(input)&&input.schemaVersion===183){
    const errors=validateSchema(input,183);if(errors.length)throw new Error('Invalid version 183 save: '+errors.join(' '));
    // No World calendar, condition, stored energy or random draw is invented.
    input.schemaVersion=184;
  }
  if(record(input)&&input.schemaVersion===184){
    const errors=validateSchema(input,184);if(errors.length)throw new Error('Invalid version 184 save: '+errors.join(' '));
    // No cargo, trade, silver, stock or progress is granted.
    input.schemaVersion=185;
  }
  if(record(input)&&input.schemaVersion===185){
    const errors=validateSchema(input,185);if(errors.length)throw new Error('Invalid version 185 save: '+errors.join(' '));
    // No Mining profile, past XP, yield contribution or random draw is invented.
    // Missing contributions from historical rock damage remain neutral at use.
    input.schemaVersion=186;
  }
  if(record(input)&&input.schemaVersion===186){
    const errors=validateSchema(input,186);if(errors.length)throw new Error('Invalid version 186 save: '+errors.join(' '));
    // No hospital bed, research, ingredients or clinical history is invented.
    input.schemaVersion=187;
  }
  if(record(input)&&input.schemaVersion===187){
    const errors=validateSchema(input,187);if(errors.length)throw new Error('Invalid version 187 save: '+errors.join(' '));
    // Existing rations remain unchanged; no project, bill, meal or work is granted.
    input.schemaVersion=188;
  }
  if(record(input)&&input.schemaVersion===188){
    const errors=validateSchema(input,188);if(errors.length)throw new Error('Invalid version 188 save: '+errors.join(' '));
    input.schemaVersion=189;
  }
  if(record(input)&&input.schemaVersion===189){
    const errors=validateSchema(input,189);if(errors.length)throw new Error('Invalid version 189 save: '+errors.join(' '));
    initializeTelevisionRecreation(input as unknown as World);
    input.schemaVersion=190;
  }
  if(record(input)&&input.schemaVersion===190){
    const errors=validateSchema(input,190);if(errors.length)throw new Error('Invalid version 190 save: '+errors.join(' '));
    // Past, skills, priorities, offers, archives and all RNG streams stay exact.
    input.schemaVersion=191;
  }
  if(record(input)&&input.schemaVersion===191){
    const errors=validateSchema(input,191);if(errors.length)throw new Error('Invalid version 191 save: '+errors.join(' '));
    // No crisis, target, threat, counter or random draw is added to old owners.
    input.schemaVersion=192;
  }
  if(record(input)&&input.schemaVersion===192){
    const errors=validateSchema(input,192);if(errors.length)throw new Error('Invalid version 192 save: '+errors.join(' '));
    // Existing owners, histories, research and RNG stay exact; only the version advances.
    input.schemaVersion=193;
  }
  if(record(input)&&input.schemaVersion===193){
    const errors=validateSchema(input,193);if(errors.length)throw new Error('Invalid version 193 save: '+errors.join(' '));
    // No actor, carcass, raid permission, salvage count or draw is added to old owners.
    input.schemaVersion=194;
  }
  if(record(input)&&input.schemaVersion===194){
    const errors=validateSchema(input,194);if(errors.length)throw new Error('Invalid version 194 save: '+errors.join(' '));
    // No relationship, partner, offer, memory, archive or draw is invented.
    input.schemaVersion=195;
  }
  if(record(input)&&input.schemaVersion===195){
    const errors=validateSchema(input,195);if(errors.length)throw new Error('Invalid version 195 save: '+errors.join(' '));
    // Existing owners remain unchanged; planet and groups are prospective commands.
    input.schemaVersion=196;
  }
  if(record(input)&&input.schemaVersion===196){
    const errors=validateSchema(input,196);if(errors.length)throw new Error('Invalid version 196 save: '+errors.join(' '));
    // Races, ranged permission and corpse filters remain prospective; number only.
    input.schemaVersion=197;
  }
  if(record(input)&&input.schemaVersion===197){
    const errors=validateSchema(input,197);if(errors.length)throw new Error('Invalid version 197 save: '+errors.join(' '));
    // Human Busy clocks are adopted only at their first prospective Core pass.
    input.schemaVersion=198;
  }
  if(record(input)&&input.schemaVersion===198){
    const errors=validateSchema(input,198);if(errors.length)throw new Error('Invalid version 198 save: '+errors.join(' '));
    // Existing capsules retain their affiliation and outcome; joining is prospective.
    input.schemaVersion=199;
  }
  if(record(input)&&input.schemaVersion===199){
    const errors=validateSchema(input,199);if(errors.length)throw new Error('Invalid version 199 save: '+errors.join(' '));
    // The weather envelope is adopted only by a future played step.
    input.schemaVersion=200;
  }
  if(record(input)&&input.schemaVersion===200){
    const errors=validateSchema(input,200);if(errors.length)throw new Error('Invalid version 200 save: '+errors.join(' '));
    // Electrical accidents begin only on a future played step.
    input.schemaVersion=201;
  }
  if(record(input)&&input.schemaVersion===201){
    const errors=validateSchema(input,201);if(errors.length)throw new Error('Invalid version 201 save: '+errors.join(' '));
    input.schemaVersion=202;
  }
  if(record(input)&&input.schemaVersion===202){
    const errors=validateSchema(input,202);if(errors.length)throw new Error('Invalid version 202 save: '+errors.join(' '));
    // Existing soil zones and plants are untouched; basins are prospective.
    input.schemaVersion=203;
  }
  if(record(input)&&input.schemaVersion===203){
    const errors=validateSchema(input,203);if(errors.length)throw new Error('Invalid version 203 save: '+errors.join(' '));
    // Prison breaks are adopted prospectively; no prisoner history is invented.
    input.schemaVersion=204;
  }
  if(record(input)&&input.schemaVersion===204){
    const errors=validateSchema(input,204);if(errors.length)throw new Error('Invalid version 204 save: '+errors.join(' '));
    // Blight is prospective: neither infections nor incident history are invented.
    input.schemaVersion=205;
  }
  if(record(input)&&input.schemaVersion===205){
    const errors=validateSchema(input,205);if(errors.length)throw new Error('Invalid version 205 save: '+errors.join(' '));
    // Drug production is prospective; no bench, research, ingredient or bill is added.
    input.schemaVersion=206;
  }
  if(record(input)&&input.schemaVersion===206){
    const errors=validateSchema(input,206);if(errors.length)throw new Error('Invalid version 206 save: '+errors.join(' '));
    // Immune diseases and their incident stream are adopted only by future play.
    input.schemaVersion=207;
  }
  if(record(input)&&input.schemaVersion===207){
    const errors=validateSchema(input,207);if(errors.length)throw new Error('Invalid version 207 save: '+errors.join(' '));
    // EMP weapons and their retained effects are prospective, with no invented history.
    input.schemaVersion=208;
  }
  if(record(input)&&input.schemaVersion===208){
    const errors=validateSchema(input,208);if(errors.length)throw new Error('Invalid version 208 save: '+errors.join(' '));
    // Perceived deaths and corpse exposure begin prospectively during play.
    input.schemaVersion=209;
  }
  if(record(input)&&input.schemaVersion===209){
    const errors=validateSchema(input,209);if(errors.length)throw new Error('Invalid version 209 save: '+errors.join(' '));
    // Wooden prostheses and their surgical ingredients require future play.
    input.schemaVersion=210;
  }
  if(record(input)&&input.schemaVersion===210){
    const errors=validateSchema(input,210);if(errors.length)throw new Error('Invalid version 210 save: '+errors.join(' '));
    // Hospital support is prospective: preserve all research, terrain and RNG.
    input.schemaVersion=211;
  }
  if(record(input)&&input.schemaVersion===211){
    const errors=validateSchema(input,211);if(errors.length)throw new Error('Invalid version 211 save: '+errors.join(' '));
    // Herd veterinary care is prospective; no animal, medicine or intent is added.
    input.schemaVersion=212;
  }
  if(record(input)&&input.schemaVersion===212){
    const errors=validateSchema(input,212);if(errors.length)throw new Error('Invalid version 212 save: '+errors.join(' '));
    // Arrest is prospective; retain all people, possessions, intent and RNG.
    input.schemaVersion=213;
  }
  const errors = validateWorld(input); if (errors.length) throw new Error(`Invalid save: ${errors.join(' ')}`);
  const world = input as World;
  consolidateLooseRocks(world);
  const normalizedErrors = validateWorld(world);
  if (normalizedErrors.length) throw new Error(`Invalid consolidated save: ${normalizedErrors.join(' ')}`);
  return world;
}
/** Deterministic diagnostic fingerprint, not a cryptographic digest. */
export function hashWorld(world: World): string {
  const serialized = JSON.stringify(world); let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index++) { hash ^= serialized.charCodeAt(index); hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
import { validateMedicalRecord } from './injury-validation.ts';
import { validatePawnHealth,validArtificialPartsWorldTransport } from './health-save.ts';
