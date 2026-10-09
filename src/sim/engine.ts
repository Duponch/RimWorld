import { deepDrillingUnlocked,groundScannerUnlocked } from './research.ts';
import { processDeepWork,reconcileDeepWork } from './deep-drilling.ts';
import { adoptDeepResources } from './deep-resources.ts';
import { adoptOrbital,advanceOrbital,applyOrbitalTrade,processOrbitalTrade,reconcileOrbitalTrade } from './orbital.ts';
import { validGroupCommand } from './group-command-shape.ts';
import { applyGroupCommand,groupOnMapMember,cancelGroupPreparation } from './group-authority.ts';
import { processGroupOnMap,tryGroupDeparture,advanceGroup,reconcileGroupPreparation } from './group-driver.ts';
import { processMechanoidCombat,mechanoidCombatBatch } from './mechanoid-combat.ts';
import {isMechSalvageRecipe} from './mechanoid-salvage.ts';
import {advanceMechanoidCorpses} from './mechanoid-corpse.ts';
import {enableMechanoidRaids} from './mechanoid-raids.ts';
import { isBedKind } from './bed-kinds.ts';
import { removeIdentity } from './collection-remove.ts';
import { applyCommercialBuy,applyCommercialSell } from './commercial-post.ts';
import { applyCommercialPreparation,processCommercialOnMap,reconcileCommercialOnMap } from './commercial-loading.ts';
import { applyCommercialReturn,advanceCommercialTrip,departCommercial,commercialOnMapId,commercialPawn } from './commercial-trip.ts';
import { reconcileDomesticWork } from './domestic-reconcile.ts';
import { advanceAnimalProducts } from './animal-products.ts';
import { PEN_ANIMALS, invalidateAnimalPens } from './animal-pens.ts';
import { applyTaming,processHandling,advanceTameness } from './animal-handling.ts';
import { applyAnimalCarePolicy,processAnimalCare } from './animal-care.ts';
import { processAnimalFeeding,reconcileAnimalFeeding } from './animal-feeding.ts';
import {cancelFlakWork,detachMissingFlakBills} from './flak-work.ts';
import {cancelArtWork,detachMissingArtBills} from './art-work.ts';
import { drugProductionUnlocked, machiningUnlocked,microelectronicsUnlocked,multiAnalyzerUnlocked,fabricationUnlocked,autodoorsUnlocked,hospitalBedUnlocked,tubeTelevisionUnlocked,gunTurretsUnlocked,hydroponicsUnlocked } from './research.ts';
import {vitalsMonitorUnlocked} from './research.ts';
import { advanceHumanCorpses } from './human-corpses.ts';
import { advanceDeathThoughts } from './death-thoughts-perception.ts';
import { applyBurial,processBurial,reconcileBurials,initialGrave } from './burial.ts';
import { applyCleanRoom,processCleaning } from './cleaning.ts';
import { advanceFilth,recordFilthMovement,bleedFilth } from './filth.ts';
import { weatherRainRate } from './weather.ts';
import { medicalBleed } from './injury-state.ts';
import { processPawnVomiting } from './food-hygiene.ts';
import { finishFloor,removeFloor,FLOOR_DEFINITIONS,canDesignateFloor } from './flooring.ts';
import { applyTrade } from './trade.ts';
import { processTrade } from './trade-contact.ts';
import { advanceVisitors,processVisitor,exitVisitor,visitorGroupDanger } from './visitors.ts';
import { advancePodRescues,exitPodRescue,reconcilePodRescueResults } from './pod-rescue.ts';
import { processPodRescuePatient } from './pod-rescue-patient.ts';
import { applyScoutCommand,processScoutLoading } from './caravan-loading.ts';
import { advanceScoutTrip,departScout,scoutOnMapId,scoutPawn } from './caravan-trip.ts';
import { requestPowerFlick,reconcilePowerFlicks,advancePowerFlick } from './power-flick.ts';
import { applyCapture } from './capture.ts';
import { applyArrest } from './arrest.ts';
import { adoptEnvironment,advanceSurfaceWeather,advanceSurfaceTemperature } from './environment-step.ts';
import { applyExtinguish,processFirefighting,processBurning } from './firefighting.ts';
import { reconcileFires } from './fire.ts';
import { applyPrisonerMode,applyPrisonBed,reconcilePrisoners,processPrisoner } from './prisoners.ts';
import { advancePrisonBreaks,endPrisonBreak } from './prison-break.ts';
import { prisonBreakActive } from './prison-break-state.ts';
import { processPrisonBreak } from './prison-break-behavior.ts';
import { processWarden,reconcileWarden } from './warden.ts';
import { sharesConstructionLayer } from './power-grid.ts';
import { batteriesUnlocked,solarPowerUnlocked,complexFurnitureUnlocked } from './research.ts';
import { isCropKind } from './crops.ts';
import { isFoodWorkstation } from './food-workstations.ts';
import { designateHunt,processHunting } from './hunting.ts';
import { cancelHunting } from './hunting-state.ts';
import { advanceCorpses } from './corpses.ts';
import { advanceWildlife,enableWildlife,reconcileWildlife } from './wildlife.ts';
import { enableHeatwaves,advanceHeatwaves } from './heatwave.ts';
import { adoptMiscIncidents,adoptWeatherIncidents,advanceMiscIncidents } from './cassandra-misc.ts';
import { adoptShortCircuits } from './short-circuit.ts';
import { adoptCropBlights } from './crop-blight-incident.ts';
import { advanceCropBlight } from './plant-blight.ts';
import { designateBlightedCrops } from './crop-blight-orders.ts';
import { adoptWorldIncidents,advanceWorldIncidents } from './cassandra-world.ts';
import { adoptSmallIncidents,advanceSmallIncidents } from './cassandra-small.ts';
import { advanceHeatExposure } from './heat-exposure.ts';
import { processHeatRefuge } from './heat-refuge.ts';
import { newHeaterState,adjustHeaterTarget } from './heater.ts';
import { newWindTurbineState,setWindAutoCut,adoptWind } from './wind.ts';
import { coolerFaces,coolerFaceBlocked,newCoolerState,setCoolerTarget,adjustCoolerTarget } from './cooler.ts';
import { airConditioningUnlocked, selectResearch,processResearch,researchRate,clothingUnlocked } from './research.ts';
import { craftingQuality,tailoringTemperatureFactor } from './crafting-quality.ts';
import { healthRandom } from './health.ts';
import { FURNITURE_DEFINITIONS,isHabitatFurnitureKind } from './furniture-stats.ts';
import { cancelGunWork,detachMissingGunBills } from './gun-work.ts';
import { cancelComponentWork,detachMissingComponentBills } from './component-work.ts';
import { detachMissingBills,cancelUnfinished } from './unfinished.ts';
import { placeCraftingSpot,removeCraftingSpot } from './crafting-spot.ts';
import { harvestProductLabel } from './plants.ts';
import { advanceSocial } from './social.ts';
import { advanceHumanAges } from './human-age.ts';
import { reconcileRepairs,advanceRepair } from './repairs.ts';
import { advanceBreakdowns,reconcileBreakdownJobs,advanceBreakdownFix,retireBreakdownJob } from './breakdowns.ts';
import { adoptColonyEconomy,sampleColonyEconomy,flushColonyLosses,advanceColonyAdaptation } from './colony-economy.ts';
import { advanceRaids,enableRaids,exitRaider } from './raids.ts';
import { processRaider } from './raid-behavior.ts';
import { advanceArrivals,applyArrival } from './arrivals.ts';
import { advanceQuests,applyQuestCommand } from './quests.ts';
import { advanceFluIncidents } from './flu-incidents.ts';
import { updateMentalBreak,processMentalBreak } from './mental-break.ts';
import { mentalCrisisLabel } from './mental-catalog.ts';
import { isAggressiveCrisis,processAggressiveCrisis } from './aggressive-crisis.ts';
import { expireMealMemories } from './mood.ts';
import { considerAutomaticCombat } from './automatic-combat.ts';
import { cancelAutomaticCombat } from './automatic-combat-state.ts';
import { isColonist,isAdmittedGuest } from './affiliation.ts';
import { applyMeleeCommand,processMelee } from './melee.ts';
import { isStunned } from './stun.ts';
import { processTactics } from './tactics.ts';
import { considerFlee,processFlee,processSentry,threatQueries } from './threats.ts';
import { retryInterruptedCargo } from './interrupted-cargo.ts';
import { applyDraftCommand,processDraft } from './drafting.ts';
import { advanceWorldCombat } from './combat-system.ts';
import { captureFurnitureSight } from './furniture-sight.ts';
import { applyShootingCommand } from './shooting.ts';
import { expireStaggers } from './stagger.ts';
import { collapseFromExhaustion,processDraftSleep } from './needs.ts';
import { applyEquipment,processEquipment,reconcileEquipmentTasks,recoverDroppedWeapon } from './equipment.ts';
import { advanceWorldApparelWear,applyApparelPolicyAssignment,considerApparelPolicy } from './apparel-system.ts';
import { dropIncapacitatedEquipment,reconcileWeaponMemory } from './equipment-state.ts';
import { applyFeeding,processFeeding,reconcileFeeding } from './feeding.ts';
import { applySurgery,processSurgery,reconcileSurgery } from './surgery.ts';
import { applyTending,processTending,reconcileTending } from './tending.ts';
import { reconcilePatientRest } from './patient-rest.ts';
import { MEDICAL_CARE } from './medicine-rules.ts';
import { planUrgentCare } from './urgent-care.ts';
import { applyRescue,processRescue,reconcileRescues } from './rescue.ts';
import { applyMedicalBed } from './medical-beds.ts';
import { carrierOf } from './rescue-state.ts';
import { exitPrisoner } from './prisoner-exit.ts';
import { feedingWork } from './feeding-rules.ts';
import { tickSkills, constructionWorkRate } from './skills.ts';
import { plantWorkRate } from './plant-skills.ts';
import { advancePower, reconcilePower } from './power.ts';
import { adoptRainElectrical,advanceRainElectrical } from './rain-electric.ts';
import { isElectrical, newPowerState } from './power-rules.ts';
import { autoRoofRooms, designateRoofArea, scheduleRoofs, reconcileRoofJobs, reconcileRoofSupport, finishRoofJob } from './roofing.ts';
import { isRoofArea, isRoofJob, roofJobWanted, RoofContext } from './roof-rules.ts';
import { applyDoorCommand, updateDoors } from './doors.ts';
import { builtDoorState,isRoomDoor,isPassageDoor } from './door-rules.ts';
import { taskWork } from './production-recipes.ts';
import { advanceMining } from './mining.ts';
import { advanceFurniture } from './furniture-transfer.ts';
import { minifiable, furnitureIntentAt, furnitureSourceCells, packedAt } from './furniture-rules.ts';
import { designateUninstall, installCommand } from './furniture-commands.ts';
import { deconstructionAt, deconstructionAvailable, designateDeconstruction } from './deconstruction-rules.ts';
import { finishDeconstruction } from './deconstruction.ts';
import { advancePriorityWork } from './priority-work.ts';
import { leaveTransitCell } from './transit-exit.ts';
import { removeZonesForPlan } from './construction-zones.ts';
import { occupancyOf, occupies } from './occupancy.ts';
import { constructionHaulId, constructionSiteFree, constructionWorkTarget, isConstruction } from './construction-rules.ts';
import { advanceOrders, applyOrderCommand, reconcileOrders } from './player-orders.ts';
import { gatherResource, clearingDuration } from './gathering.ts';
import { processRecreation } from './recreation.ts';
import { applyScheduleCommand } from './schedule.ts';
import { applyFoodPolicyCommand } from './food-policy.ts';
import { expireFood } from './food-expiration.ts';
export { queryJobStatus, queryPawnStatus } from './diagnostics.ts';
import { processCooking } from './cooking.ts';
import { WorkEnvironmentCache, type WorkEnvironment } from './work-environment.ts';
import { advanceBeautyNeeds } from './beauty-need.ts';
import { advanceFlowerPots } from './flower-pot-work.ts';
import { createFlowerPotState,cutFlowerPotPlant,flowerPotCanUninstall } from './flower-pot.ts';
import type { LightEnvironment } from './light-environment.ts';
import { advanceWork,workProgress,setWorkUnits,WORK_FRACTIONS } from './work-progress.ts';
import { TemperatureView, reconcileTemperature, advanceTemperature } from './temperature.ts';
import { lightSources } from './light-sources.ts';
import { reconcilePlantLighting } from './plant-lighting.ts';
import { updatePlantTemperatures } from './thermal-plants.ts';
import { updateFoodTemperatures } from './thermal-food.ts';
import { applyBillCommand } from './cooking-commands.ts';
import { cookingCellReserved } from './cooking-bills.ts';
import { burnFuel, refuelable, newBuildingFuel, isFueledBuilding } from './fuel.ts';
import { newMiniTurretState } from './mini-turret-state.ts';
import { reloadableTurret,draftTurretService } from './mini-turret-reload.ts';
import { setTurretHoldFire } from './mini-turret.ts';
import { bombDanger,captureBombDangerSources } from './bomb-danger.ts';
import { processHaul } from './hauling.ts';
import { initializeHydroponicBasin,advanceHydroponics } from './hydroponics.ts';
import { scheduleGrowing, cancelGrowingJobs, growingJobValid, finishSowing, jobDuration, growingZoneAt, resourceAt } from './farming.ts';
import { isPlant, harvestable,choppable,berryYield } from './plants.ts';
import { search, searchCandidates, destinationValid, planWork, type SearchBudget, type NavigationGrid } from './work-planner.ts';
import { workPriority,workType } from './work-types.ts';
import { backgroundWorkRefusal } from './colonist-backgrounds.ts';
import { releaseAssignments, planCommandDrops, commitDrop, releaseWork, type DropPlan } from './work-release.ts';
import { validDiningPlace } from './dining.ts';
import { CIVIL_TRANSIT_BLOCKERS, moveToward } from './travel.ts';
import { haulingWork } from './haul-aside.ts';
import { groundPile } from './ground-placement.ts';
import { generateWorld } from './generation.ts';
import { adjacent, blockedCells, cellIndex, inBounds } from './pathfinding.ts';
import { CARRY_CAPACITY, footprintCells } from './definitions.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { constructionSkillRequired,constructionSupplied, validConstructionMaterial } from './construction-materials.ts';
import { refreshStock } from './materials.ts';
import { queryArea, validStorageSettings } from './designation.ts';
import { constructionLineCells, isLineBuildKind, type LineBuildKind } from './construction-line.ts';
import { processNeeds, updateNeeds } from './needs.ts';
export { HUNGER_PER_TICK, REST_PER_TICK } from './needs.ts';
import type { AreaCommand, BuildLineCommand, Cell, Command, CommandResult, DesignateCommand, Job, JobKind, Pawn, RefusalCode, StorageSettings, World } from './types.ts';
export { JOB_DURATION, JOB_WOOD_COST } from './definitions.ts';

const PATH_SEARCHES_PER_TICK = 8;
const JOB_LABEL: Readonly<Record<JobKind, string>> = { 'orbital-beacon':'construction de balise orbitale','comms-console':'construction de console de communication', 'deep-drill':'construction de foreuse profonde','ground-scanner':'construction du scanner souterrain', 'vitals-monitor':'construction du moniteur vital', 'drug-lab':'construction du laboratoire de chimie', 'hydroponics-basin':'construction du bac hydroponique', 'mini-turret':'construction de mini-tourelle', 'tube-television':'construction de télévision cathodique', sandbags:'construction de sacs de sable', autodoor:'construction de porte automatique', fence:'construction de clôture','fence-gate':'construction de portillon','pen-marker':'construction de marqueur d’enclos', 'art-bench':'construction de l’atelier de sculpture','small-sculpture':'petite sculpture','large-sculpture':'grande sculpture', 'machining-table':'construction de l’atelier d’usinage','fabrication-bench':'construction de l’établi de fabrication','hi-tech-research-bench':'construction du bureau de recherche haute technologie','multi-analyzer':'construction du multi-analyseur', grave:'creusement de tombe','lay-floor':'pose de sol','remove-floor':'retrait de sol',heater:'construction de radiateur','wind-turbine':'construction d’éolienne',flick:'commutation électrique','power-conduit':'construction de conduit','power-switch':'construction d’interrupteur',battery:'construction de batterie','solar-generator':'construction de panneau solaire', 'fueled-stove':'construction de cuisinière à bois','electric-stove':'construction de cuisinière électrique','butcher-table':'construction de table de boucherie', 'butcher-spot':'emplacement de boucherie', cooler:'construction de climatiseur', 'research-bench':'construction de bureau de recherche','tailor-bench':'construction d’établi de tailleur','electric-tailor-bench':'construction d’établi de tailleur électrique', 'crafting-spot':'emplacement d’artisanat', repair:'réparer', 'fix-breakdown':'remplacer un composant en panne', 'wood-generator':'construction de générateur à bois', 'sun-lamp':'construction de lampe horticole', 'standing-lamp':'construction de lampe sur pied', 'passive-cooler':'Construction du refroidisseur passif', 'build-roof':'pose de toit', 'remove-roof':'retrait de toit', door:'construction de porte', stonecutter:'construction de table de taille de pierre', mine:'minage', uninstall:'désinstallation', install:'réinstallation', deconstruct: 'déconstruction', chop: 'abattage', harvest: 'récolte', cut: 'coupe de plante', sow: 'semis', horseshoes: 'construction de piquet de fers à cheval', 'chess-table':'construction de table d’échecs', campfire: 'construction de feu de camp', wall: 'construction de mur', bed: 'construction de lit', 'hospital-bed':'construction de lit d’hôpital', table: 'construction de table','table-square':'construction de table carrée','table-long':'construction de table longue', stool: 'construction de tabouret','dining-chair':'construction de chaise',armchair:'construction de fauteuil','end-table':'construction de table de chevet',dresser:'construction de commode','flower-pot':'construction de pot de fleurs' };
const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.z === b.z;
const refusal = (code: RefusalCode, reason: string): CommandResult => ({ ok: false, code, reason });
function event(world: World, type: 'job' | 'need' | 'command', message: string): void {
  world.events.push({ tick: world.tick, type, message });
  if (world.events.length > 80) world.events.splice(0, world.events.length - 80);
}
export function createWorld(seed = 42, width = 32, height = 32): World { return generateWorld(seed, width, height); }

function wakePlanners(world: World): void {
  for (const pawn of world.pawns) if (pawn.jobId === null && pawn.haul === null) pawn.planCooldown = 0;
}

/** One authoritative command, evaluated against the state at execution, without
 * per-cell worker messages or repeated scans of every resource for every cell.
 */
const copyStorageConditions=(settings:StorageSettings)=>({
  ...(settings.quality!==undefined?{quality:{...settings.quality}}:{}),
  ...(settings.hitPoints!==undefined?{hitPoints:{...settings.hitPoints}}:{}),
});
function applyArea(world: World, command: AreaCommand, drops:DropPlan): CommandResult {
  const selection = queryArea(world, command);
  if (!selection.ok) return selection;
  if (!selection.cells.length) return refusal('missing-target', 'Aucune case compatible dans ce rectangle.');
  const creates = command.action === 'lay-floor' || command.action === 'remove-floor' || command.action === 'mine' || command.action === 'deconstruct' || command.action === 'chop' || command.action === 'harvest' || command.action === 'cut' || command.action === 'stockpile' || command.action === 'growing';
  if (creates && !Number.isSafeInteger(world.nextId + selection.cells.length)) return refusal('invalid-command', 'Limite des identités atteinte.');
  let affected = selection.cells.length;
  if(command.action==='home'||command.action==='remove-home'){const cells=new Set(world.home);for(const i of selection.cells)if(command.action==='home')cells.add(i);else cells.delete(i);world.home=[...cells].sort((a,b)=>a-b);if(!world.home.length)delete world.home;} else if (isRoofArea(command.action)) { designateRoofArea(world, selection.cells, command.action); } else if (command.action === 'deconstruct') {
    const selected = new Set(selection.cells);
    const targets = world.structures.filter(s => footprintCells(s).some(c => selected.has(cellIndex(world,c.x,c.z))));
    for (const target of targets)if((target.kind==='crafting-spot'||target.kind==='butcher-spot'))removeCraftingSpot(world,target,drops);else designateDeconstruction(world,target);
    affected = targets.length;
  } else if(command.action==='lay-floor'||command.action==='remove-floor') {
    for(const index of selection.cells)world.jobs.push({id:world.nextId++,kind:command.action,x:index%world.width,z:Math.floor(index/world.width),orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},...command.action==='lay-floor'?{construction:'blueprint',floor:command.floor}:{floor:world.tiles[index]!.floor}});
  } else if(command.action==='haul-chunks') {
    const selected=new Set(selection.cells);for(const p of world.piles)if(p.kind==='chunk'&&p.owner.type==='ground'&&selected.has(cellIndex(world,p.owner.x,p.owner.z)))p.haulRequested=true;
  } else if (command.action === 'mine' || command.action === 'chop' || command.action === 'harvest' || command.action === 'cut') {
    for (const index of selection.cells) world.jobs.push({ id: world.nextId++, kind: command.action, x: index % world.width, z: Math.floor(index / world.width), orientation: 0, footprint: 'standard', status: 'pending', reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 } });
  } else if (command.action === 'growing') {
    world.growingZones = [...world.growingZones, { id: world.nextId++, cells: selection.cells, plant: 'rice', allowSow: true, allowCut: true }];
  } else if (command.action === 'remove-growing') {
    const selected = new Set(selection.cells);
    const changed = new Set(world.growingZones.filter(zone => zone.cells.some(c => selected.has(c))).map(z => z.id));
    cancelGrowingJobs(world, changed,drops);
    world.growingZones = world.growingZones.map(zone => ({...zone, cells: zone.cells.filter(c => !selected.has(c))})).filter(z => z.cells.length);
    world.growingCursor = 0;
  } else if (command.action === 'stockpile') {
    for (const index of selection.cells) world.stockpiles.push({ id: world.nextId++, x: index % world.width, z: Math.floor(index / world.width), filters: { ...(command.filters ?? { wood: true, food: true }) },...(command.items!==undefined?{items:{...command.items}}:{}),...copyStorageConditions(command), priority: command.priority ?? 2, capacity: command.capacity ?? ITEM_DEFINITIONS.silver.stackLimit });
  } else {
    const cells = new Set(selection.cells);
    if (command.action === 'remove-stockpile') {
      const ids = new Set(world.stockpiles.filter(cell => cells.has(cellIndex(world, cell.x, cell.z))).map(cell => cell.id));
      const carriers = new Set(world.pawns.filter(pawn => pawn.haul?.destination.type === 'stockpile' && ids.has(pawn.haul.destination.stockpileId)).map(pawn => pawn.id));
      const returning = world.piles.filter(pile => pile.owner.type === 'pawn' && carriers.has(pile.owner.pawnId)).length;
      if (!Number.isSafeInteger(world.nextId + returning)) return refusal('invalid-command', 'Identités insuffisantes pour déposer les cargaisons.');
      world.stockpiles = world.stockpiles.filter(cell => !ids.has(cell.id));
      for(const pawn of world.pawns)if(pawn.cooking?.storageId&&ids.has(pawn.cooking.storageId)){pawn.cooking.storageId=null;delete pawn.cooking.storageQuantity;pawn.path=[];pawn.planCooldown=0;}
      for (const pawn of world.pawns) if (pawn.haul?.destination.type === 'stockpile' && ids.has(pawn.haul.destination.stockpileId)) releaseWork(world, pawn,drops);
    } else {
      const jobs = world.jobs.filter(job => [...footprintCells(job),...furnitureSourceCells(world,job)].some(cell => cells.has(cellIndex(world, cell.x, cell.z))));
      const ids = new Set(jobs.map(job => job.id)); affected = ids.size;
      const carriers = new Set(world.pawns.filter(pawn => pawn.haul && ids.has(constructionHaulId(pawn.haul.destination) ?? -1)).map(pawn => pawn.id));
      const returning = world.piles.filter(pile => (pile.owner.type === 'job' && ids.has(pile.owner.jobId)) || (pile.owner.type === 'pawn' && carriers.has(pile.owner.pawnId))).length;
      // Reserve an upper bound before releasing any owner. Deposits may merge,
      // but exhausting IDs must never leave a partly removed construction/cargo.
      if (!Number.isSafeInteger(world.nextId + returning)) return refusal('invalid-command', 'Identités insuffisantes pour conserver les matériaux annulés.');
      for (const pawn of world.pawns) if ((pawn.jobId !== null && ids.has(pawn.jobId)) || (pawn.haul && ids.has(constructionHaulId(pawn.haul.destination) ?? -1))) releaseWork(world, pawn,drops);
      world.jobs = world.jobs.filter(job => !ids.has(job.id));
      const delivered = world.piles.filter(pile => pile.owner.type === 'job' && ids.has(pile.owner.jobId));
      const byId = new Map(jobs.map(job => [job.id, job]));
      for (const pile of delivered) if (pile.owner.type === 'job' && !commitDrop(world,pile,byId.get(pile.owner.jobId)!,drops)) throw new Error('Preflighted cancellation has no drop cell.');
    }
  }
  wakePlanners(world); refreshStock(world);
  event(world, 'command', `Rectangle : ${affected} ${command.action === 'cancel' ? 'ordre(s) annulé(s)' : command.action === 'remove-stockpile' ? 'case(s) de réserve retirée(s)' : command.action === 'stockpile' ? 'case(s) de réserve créée(s)' : command.action==='home'||command.action==='remove-home'?'case(s) de foyer modifiée(s)':command.action==='deconstruct' ? 'ordre(s) de déconstruction créé(s)' : isRoofArea(command.action) ? 'case(s) de toiture désignée(s)' : 'ordre(s) de collecte créé(s)'}.`);
  return { ok: true, affected, skipped: selection.skipped };
}

/** One ordered worker command for a straight construction stroke. Each cell is
 * rechecked against the world left by preceding cells, just like separate clicks.
 */
function applyBuildLine(world: World, command: BuildLineCommand): CommandResult {
  if (!isLineBuildKind(command.kind) || !command.from || !command.to
    || !inBounds(world, command.from.x, command.from.z) || !inBounds(world, command.to.x, command.to.z)
    || !validConstructionMaterial(command.kind, command.material, world.schemaVersion))
    return refusal('invalid-command', 'Tracé ou matériau de construction invalide.');
  const cells = constructionLineCells(command.from, command.to);
  if (!Number.isSafeInteger(world.nextId + cells.length)) return refusal('invalid-command', 'Limite des identités atteinte.');
  let affected = 0;
  for (const cell of cells) {
    const result = applyCommandInternal(world, { type: 'designate', kind: command.kind, ...cell,
      orientation: 0, ...(command.material ? { material: command.material } : {}) });
    if (result.ok) affected++;
  }
  if (!affected) return refusal('missing-target', 'Aucune case compatible sur ce tracé.');
  return { ok: true, affected, skipped: cells.length - affected };
}

/** Snapshot-local spatial index for repeated line previews. It is never saved or
 * reused after a World mutation; canDesignate remains the common authority. */
export interface ConstructionCellIndex { kind: LineBuildKind; flags: Uint8Array }
export function buildConstructionCellIndex(world: World, kind: LineBuildKind): ConstructionCellIndex {
  const flags=new Uint8Array(world.width*world.height);
  const mark=(cell:Cell,bit:number)=>{if(inBounds(world,cell.x,cell.z))flags[cellIndex(world,cell.x,cell.z)]!|=bit;};
  for(const job of world.jobs)if(!isRoofJob(job)&&sharesConstructionLayer(job.furniture?.kind??job.deconstruction?.kind??job.flick?.kind??job.fixBreakdown?.kind??job.kind,kind))
    for(const cell of footprintCells(job))mark(cell,1);
  for(const structure of world.structures)if(sharesConstructionLayer(structure.kind,kind))
    for(const cell of footprintCells(structure))mark(cell,2);
  for(const resource of world.resources)if(resource.kind==='rock')mark(resource,4);
  return {kind,flags};
}

/** Pure shared rule used by preview and command execution. */
export function canDesignate(world: World, command: DesignateCommand, installing=false, index?:ConstructionCellIndex): CommandResult {
  if((command?.kind==='orbital-beacon'||command?.kind==='comms-console')&&(world.schemaVersion<216||command.kind==='comms-console'&&installing||!installing&&!microelectronicsUnlocked(world)))return refusal('invalid-command','Recherchez Microélectronique pour construire cet appareil ; la console ne se désinstalle pas.');
  if(command?.kind==='deep-drill'&&(world.schemaVersion<215||!installing&&!deepDrillingUnlocked(world)))return refusal('invalid-command','Recherchez Forage profond pour construire une foreuse.');
  if(command?.kind==='ground-scanner'&&(world.schemaVersion<215||installing||!groundScannerUnlocked(world)))return refusal('invalid-command','Recherchez Scanner souterrain pour construire cet appareil non déplaçable.');
  if(command?.kind==='ground-scanner'&&footprintCells({...command,orientation:command.orientation??0,footprint:'standard'}).some(c=>world.roofing?.constructed.includes(c.z*world.width+c.x)))return refusal('invalid-command','Le scanner doit être installé à ciel ouvert.');
  if(command?.kind==='vitals-monitor'&&(world.schemaVersion<211||!installing&&!vitalsMonitorUnlocked(world)))return refusal('invalid-command','Recherchez Moniteur vital pour construire cet appareil.');
  if(command?.kind==='lay-floor'||command?.kind==='remove-floor')return canDesignateFloor(world,command);
  if(command?.kind==='drug-lab'&&(world.schemaVersion<206||!installing&&!drugProductionUnlocked(world)))return refusal('invalid-command','Recherchez Production de drogues pour construire ce laboratoire.');
  if(command?.kind==='hydroponics-basin'&&(world.schemaVersion<203||installing||!hydroponicsUnlocked(world)))return refusal('invalid-command','Recherchez Hydroponie pour construire ce bac ; désinstallation indisponible.');
  if(command?.kind==='battery'&&!batteriesUnlocked(world))return refusal('invalid-command','Recherchez Batteries pour construire cet appareil.');
  if(command?.kind==='solar-generator'&&!solarPowerUnlocked(world))return refusal('invalid-command','Recherchez Panneaux solaires pour construire cet appareil.');
  if(command?.kind==='cooler'&&!airConditioningUnlocked(world))return refusal('invalid-command','Recherchez Climatisation pour construire cet appareil.');
  if(command?.kind==='machining-table'&&!machiningUnlocked(world))return refusal('invalid-command','Recherchez Usinage pour construire cet atelier.');
  if(command?.kind==='hi-tech-research-bench'&&!microelectronicsUnlocked(world))return refusal('invalid-command','Recherchez Microélectronique pour construire ce bureau.');
  if(command?.kind==='multi-analyzer'&&!multiAnalyzerUnlocked(world))return refusal('invalid-command','Recherchez Multi-analyseur pour construire cet appareil.');
  if(command?.kind==='fabrication-bench'&&!fabricationUnlocked(world))return refusal('invalid-command','Recherchez Fabrication pour construire cet établi.');
  if(command?.kind==='autodoor'&&!autodoorsUnlocked(world))return refusal('invalid-command','Recherchez Portes automatiques pour construire cette porte.');
  if(command?.kind==='mini-turret'&&(world.schemaVersion<193||installing||!gunTurretsUnlocked(world)))return refusal('invalid-command','Recherchez Tourelles automatiques pour construire cet appareil ; minification indisponible.');
  if(command?.kind==='tube-television'&&(world.schemaVersion<190||!installing&&!tubeTelevisionUnlocked(world)))return refusal('invalid-command','Recherchez Télévision cathodique pour construire cet appareil.');
  if(command?.kind==='sandbags'&&world.schemaVersion<189)return refusal('invalid-command','Sacs de sable absents de cet ancien schéma.');
  if(command?.kind==='hospital-bed'&&(world.schemaVersion<187||!installing&&!hospitalBedUnlocked(world)))return refusal('invalid-command','Recherchez Lit d’hôpital pour construire ce lit.');
  if((command?.kind==='tailor-bench'||command?.kind==='electric-tailor-bench')&&!clothingUnlocked(world))return refusal('invalid-command','Recherchez Vêtements complexes pour construire cet établi.');
  if(command&&isHabitatFurnitureKind(command.kind)&&FURNITURE_DEFINITIONS[command.kind].research==='complex-furniture'&&!complexFurnitureUnlocked(world))return refusal('invalid-command','Recherchez Mobilier complexe pour construire ce meuble.');
  if (!command || ![...(installing?['small-sculpture','large-sculpture']:[]),'orbital-beacon','comms-console','deep-drill','ground-scanner','vitals-monitor','drug-lab','hydroponics-basin','mini-turret','tube-television','sandbags','art-bench','machining-table','hi-tech-research-bench','multi-analyzer','fabrication-bench','grave','heater','wind-turbine','power-conduit','power-switch','battery','solar-generator','fueled-stove','electric-stove','butcher-table','butcher-spot','cooler','research-bench','tailor-bench','electric-tailor-bench','crafting-spot','wood-generator','sun-lamp','standing-lamp','passive-cooler','door','autodoor','fence','fence-gate','pen-marker','stonecutter', 'mine', 'uninstall', 'deconstruct', 'chop', 'harvest', 'cut', 'wall', 'bed', 'hospital-bed', 'table','table-square','table-long', 'stool','dining-chair','armchair','end-table','dresser','flower-pot', 'campfire', 'horseshoes', 'chess-table'].includes(command.kind)) return refusal('invalid-command', 'Type de travail inconnu.');
  if((command.kind==='sandbags'||isRoomDoor(command.kind)||command.kind==='fence-gate'||command.kind==='pen-marker'||command.kind==='passive-cooler'||isElectrical(command.kind)&&command.kind!=='comms-console'&&command.kind!=='deep-drill'&&command.kind!=='ground-scanner'&&command.kind!=='vitals-monitor'&&command.kind!=='hydroponics-basin'&&command.kind!=='tube-television'&&command.kind!=='machining-table'&&command.kind!=='hi-tech-research-bench'&&command.kind!=='fabrication-bench'&&command.kind!=='cooler'&&command.kind!=='electric-stove'&&command.kind!=='battery'&&command.kind!=='wind-turbine')&&command.orientation!==undefined&&command.orientation!==0)return refusal('invalid-command','Ce bâtiment ne se tourne pas manuellement.');
  if (command.orientation !== undefined && (!Number.isInteger(command.orientation) || command.orientation < 0 || command.orientation > 3)) return refusal('invalid-command', 'Orientation invalide.');
  const material=command.kind==='sandbags'?(command.material??'cloth'):command.kind==='orbital-beacon'||command.kind==='comms-console'||command.kind==='deep-drill'||command.kind==='ground-scanner'||command.kind==='vitals-monitor'||command.kind==='hydroponics-basin'||command.kind==='mini-turret'||command.kind==='hospital-bed'||command.kind==='tube-television'?(command.material??'steel'):command.material;
  if(!validConstructionMaterial(command.kind,material,world.schemaVersion))return refusal('invalid-command','Matériau incompatible avec cette construction.');
  if(command.kind==='cooler'){const faces=coolerFaces(command);if(coolerFaceBlocked(world,faces.cold,true)||coolerFaceBlocked(world,faces.hot,true))return refusal('occupied','Les faces froide et chaude doivent rester dégagées.');}
  if(command.targetId!==undefined&&(!Number.isSafeInteger(command.targetId)||command.targetId<1||command.kind!=='deconstruct'&&command.kind!=='uninstall'))return refusal('invalid-command','Cible de retrait invalide.');
  const target = (command.kind==='deconstruct'||command.kind==='uninstall')?deconstructionAt(world,command):undefined;
  if((command.kind==='deconstruct'||command.kind==='uninstall')&&!target)return refusal('missing-target','Aucun bâtiment à déconstruire ici.');
  if(target&&world.jobs.some(j=>j.furniture?.structureId===target.id))return refusal('occupied','Ce meuble a déjà un ordre de déplacement.');
  if(command.kind==='uninstall'&&(!minifiable(target!.kind)||target!.kind==='flower-pot'&&!flowerPotCanUninstall(target!.flower??createFlowerPotState())))return refusal('incompatible-resource','Coupez la plante avant de désinstaller ce pot.');
  const cells = footprintCells(target??command);
  if (cells.some(cell => !inBounds(world, cell.x, cell.z))) return refusal('out-of-bounds', 'Empreinte hors de la carte.');
  if(command.kind==='grave'&&world.jobs.some(j=>j.kind==='lay-floor'&&cells.some(c=>sameCell(c,j))))return refusal('occupied','Un plan de sol occupe la future tombe.');
  if(command.kind==='grave'&&cells.some(c=>{const tile=world.tiles[cellIndex(world,c.x,c.z)]!;return !!tile.floor||!['grass','soil','rich-soil','gravel'].includes(tile.terrain);}))return refusal('incompatible-resource','La tombe exige un terrain meuble à creuser.');
  if (index?.kind===command.kind ? cells.some(cell=>!!(index.flags[cellIndex(world,cell.x,cell.z)]!&1))
    : world.jobs.some(job => !isRoofJob(job) && !(command.kind==='deconstruct'&&(job.kind==='repair'||job.kind==='fix-breakdown'||job.kind==='flick')) && sharesConstructionLayer(job.furniture?.kind??job.deconstruction?.kind??job.flick?.kind??job.fixBreakdown?.kind??job.kind,target?.kind??command.kind) && footprintCells(job).some(cell => cells.some(target => sameCell(cell, target))))) return refusal('occupied', 'Un ordre existe déjà dans cette empreinte.');
  if(command.kind==='deconstruct'||command.kind==='uninstall')return {ok:true};
  if(command.kind==='mine')return world.tiles[cellIndex(world,command.x,command.z)]!.terrain==='rock'?{ok:true}:refusal('incompatible-resource','Désigner un massif rocheux à miner.');
  if((command.kind==='crafting-spot'||command.kind==='butcher-spot')&&world.resources.some(r=>sameCell(r,command)))return refusal('occupied','Dégager la plante avant de placer cet emplacement.');
  if (command.kind === 'chop' || command.kind === 'harvest' || command.kind === 'cut') {
    const resource = world.resources.find(candidate => sameCell(candidate, command));
    return resource && (command.kind === 'chop' ? choppable(world,resource) : isPlant(resource)) && (command.kind !== 'harvest' || harvestable(world, resource)) ? { ok: true } : refusal('incompatible-resource', 'Ressource incompatible.');
  }
  for (const cell of cells) {
    if (['water', 'rock'].includes(world.tiles[cellIndex(world, cell.x, cell.z)]!.terrain)
      || (index?.kind===command.kind ? !!(index.flags[cellIndex(world,cell.x,cell.z)]!&4) : world.resources.some(item => item.kind==='rock'&&sameCell(item, cell)))
      || (index?.kind===command.kind ? !!(index.flags[cellIndex(world,cell.x,cell.z)]!&2) : world.structures.some(item => sharesConstructionLayer(item.kind,command.kind)&&footprintCells(item).some(target => sameCell(target, cell))))
      || world.pawns.some(p => p.haul?.destination.type === 'aside' && sameCell(p.haul.destination, cell))
      || cookingCellReserved(world,cell)) {
      return refusal('occupied', 'Construction impossible : terrain, ouvrage ou réservation incompatible dans l’empreinte.');
    }
  }
  return { ok: true };
}
export function applyCommand(world: World, command: Command): CommandResult {
  const result=applyCommandInternal(world,command);
  if(result.ok){
    reconcilePodRescueResults(world);
    reconcileWildlife(world);
    detachMissingBills(world);detachMissingGunBills(world);detachMissingFlakBills(world);detachMissingArtBills(world);detachMissingComponentBills(world);reconcileBreakdownJobs(world);reconcileRepairs(world);reconcilePowerFlicks(world);
    if(command.type.startsWith('order-')&&'pawnId' in command){const actor=world.pawns.find(p=>p.id===command.pawnId);if(actor)delete actor.flee;}
    reconcilePrisoners(world);reconcileRescues(world);reconcileWarden(world);reconcilePatientRest(world);reconcileTending(world);reconcileSurgery(world);reconcileFeeding(world);reconcileAnimalFeeding(world);reconcileEquipmentTasks(world);for(const pawn of world.pawns){if(pawn.orbitalTrade)reconcileOrbitalTrade(world,pawn);if(pawn.deepWork)reconcileDeepWork(world,pawn);reconcileWeaponMemory(world,pawn);}reconcileOrders(world);const thermal=reconcileTemperature(world);reconcilePlantLighting(world,()=>readPlantLight(world));updateFoodTemperatures(world,thermal);updatePlantTemperatures(world,thermal);}
  return result;
}
function applyCommandInternal(world: World, command: Command): CommandResult {
  if (!command || typeof command !== 'object') return refusal('invalid-command', 'Commande invalide.');
  if(command.type==='cut-blighted-crops'){
    if(Object.keys(command).length!==1)return refusal('invalid-command','Commande de coupe invalide.');
    const result=designateBlightedCrops(world);
    if(result.ok){wakePlanners(world);event(world,'command',`${result.affected} plant(s) malade(s) désigné(s) pour coupe, sans récolte.`);}
    return result;
  }
  if(command.type==='planet-adopt'||command.type==='group-start'||command.type==='group-cancel'||command.type==='group-pause'||command.type==='group-route'||command.type==='group-buy'||command.type==='group-sell'||command.type==='group-unload')return validGroupCommand(command)?applyGroupCommand(world,command):refusal('invalid-command','Commande de groupe invalide.');
  if(command.type==='commercial-start'||command.type==='commercial-cancel'||command.type==='commercial-unload')return applyCommercialPreparation(world,command);
  if(command.type==='commercial-buy')return applyCommercialBuy(world,command);
  if(command.type==='commercial-sell')return applyCommercialSell(world,command);
  if(command.type==='commercial-return')return applyCommercialReturn(world);
  if(command.type==='scout-start'||command.type==='scout-cancel'||command.type==='scout-unload')return applyScoutCommand(world,command);
  const actors='pawnIds' in command&&Array.isArray(command.pawnIds)?command.pawnIds:'pawnId' in command&&command.pawnId!==null?[command.pawnId]:[];
  if(actors.some(id=>world.pawns.find(p=>p.id===id)?.prisoner)&&!['medical-care','medical-policy','food-policy-assign'].includes(command.type))return refusal('invalid-command','Une personne détenue ne reçoit pas d’ordres de colon. Utilisez son inspection de prison.');
  if(actors.some(id=>groupOnMapMember(world,id))&&(typeof command.type==='string'&&command.type.startsWith('order-')||['clear-orders','draft','draft-move','draft-stop','shoot','melee','clean-room'].includes(command.type)))return refusal('invalid-command','Terminez ou annulez la préparation du groupe avant de donner un autre ordre.');
  const scoutId=scoutOnMapId(world)??commercialOnMapId(world);
  if(scoutId!==null&&actors.includes(scoutId)&&(typeof command.type==='string'&&command.type.startsWith('order-')||['clear-orders','draft','draft-move','draft-stop','shoot','melee','clean-room'].includes(command.type)))
    return refusal('invalid-command','Terminez ou annulez le voyage et son déchargement avant de donner un autre ordre à ce colon.');
  const traveler=scoutPawn(world)??commercialPawn(world);
  if(traveler&&'policyId' in command&&command.policyId===traveler.foodPolicyId
    &&(command.type==='food-policy-delete'||command.type==='food-policy-update'&&Array.isArray(command.allowed)&&!command.allowed.includes('survival-meal')))
    return refusal('invalid-command','Ce régime est engagé pour le voyage : conservez les repas de survie jusqu’au retour ou à l’annulation.');
  // Core's Vomit job is not player-interruptible. Reject the entire group
  // before any early command handler can replace a task or mutate a stance.
  if((typeof command.type==='string'&&command.type.startsWith('order-')||['clean-room','draft','draft-move','draft-stop','fire-at-will','clear-orders','shoot','melee','cancel-trade','trade-execute','cancel-orbital-trade','orbital-trade-execute'].includes(command.type))
    &&actors.some(id=>{const h=world.pawns.find(p=>p.id===id)?.health;return h?.foodPoisoning?.vomit||h?.flu?.vomit||h?.immuneDiseases?.malaria?.vomit;}))return refusal('invalid-command','Ce colon vomit et ne peut pas interrompre cet épisode.');
  if(command?.type==='order-bury'||command?.type==='grave-policy'||command?.type==='assign-grave')return applyBurial(world,command);
  if(command?.type==='apparel-policy-assign')return applyApparelPolicyAssignment(world,command);
  if(command?.type==='clean-room'){const reason=applyCleanRoom(world,command);return reason?refusal('invalid-command',reason):{ok:true};}
  if(command?.type==='designate'&&command.kind==='flick')return refusal('invalid-command','Utilisez le bouton marche/arrêt de l’appareil.');
  if(command?.type==='designate'&&(command.kind==='repair'||command.kind==='fix-breakdown'))return refusal('invalid-command','Utilisez la zone de foyer pour activer les réparations.');
  if(command.type==='heater-adjust')return adjustHeaterTarget(world,command.structureId,command.offset);
  if(command.type==='wind-auto-cut')return setWindAutoCut(world,command.structureId,command.enabled);
  if(command.type==='gather-spot'){
    const spot=world.structures.find(structure=>structure.id===command.structureId);
    if(!spot||!['campfire','table','table-square','table-long'].includes(spot.kind)||typeof command.enabled!=='boolean')
      return refusal('invalid-command','Point de rencontre invalide.');
    if(command.enabled)delete spot.gatherSpot;else spot.gatherSpot=false;
    if(!command.enabled)for(const pawn of world.pawns)if(pawn.recreation.task?.activity==='social-relax'&&pawn.recreation.task.buildingId===spot.id)releaseWork(world,pawn);
    return {ok:true};
  }
  if(command.type==='adopt-economy'){if(adoptColonyEconomy(world))event(world,'command','Patrimoine, attentes et progression des menaces activés à partir de maintenant.');return {ok:true};}
  if(command.type==='climate-adopt'){const adopted=adoptEnvironment(world);if(adopted)event(world,'command','Climat saisonnier et météo activés à partir de maintenant.');return {ok:true};}
  if(command.type==='order-extinguish'){const reason=applyExtinguish(world,command);return reason?refusal('invalid-command',reason):{ok:true};}
  if(command.type==='power-flick')return requestPowerFlick(world,command.structureId,command.on);
  if(command.type==='cancel-unfinished')return world.piles.some(p=>p.id===command.itemId&&p.componentWork)?cancelComponentWork(world,command.itemId):world.piles.some(p=>p.id===command.itemId&&p.flakWork)?cancelFlakWork(world,command.itemId):world.piles.some(p=>p.id===command.itemId&&p.artWork)?cancelArtWork(world,command.itemId):world.piles.some(p=>p.id===command.itemId&&p.gunWork)?cancelGunWork(world,command.itemId):cancelUnfinished(world,command.itemId);
  if(command.type==='enable-wildlife'){enableWildlife(world);return {ok:true};}
  if(command.type==='enable-heatwaves'){if(world.gameProfile)return {ok:false,code:'invalid-command',reason:'Le calendrier de canicule historique n’est pas disponible avec ce narrateur.'};enableHeatwaves(world);return {ok:true};}
  if(command.type==='order-orbital-trade'||command.type==='cancel-orbital-trade'||command.type==='orbital-trade-execute')return applyOrbitalTrade(world,command);
  if(command.type==='enable-visitors'||command.type==='order-trade'||command.type==='cancel-trade'||command.type==='trade-execute')return applyTrade(world,command);
  if(command.type==='enable-mech-raids')return enableMechanoidRaids(world)?{ok:true}:{ok:false,code:'invalid-command',reason:'Le calendrier Cassandra est requis pour les menaces mécaniques.'};
  if(command.type==='enable-raids'){enableRaids(world);return {ok:true};}
  if(command.type==='enable-arrivals'||command.type==='answer-arrival')return applyArrival(world,command);
  if(command.type==='enable-quests'||command.type==='answer-quest')return applyQuestCommand(world,command);
  if(command.type==='prison-bed')return applyPrisonBed(world,command);
  if(command.type==='prisoner-mode')return applyPrisonerMode(world,command);
  if(actors.some(id=>{const p=world.pawns.find(p=>p.id===id);return p&&!isColonist(p)&&!((p.prisoner||isAdmittedGuest(p))&&['medical-care','medical-policy','food-policy-assign'].includes(command.type));}))return refusal('invalid-command','Cette personne ne fait pas partie de la colonie.');
  if(typeof command.type==='string'&&command.type.startsWith('order-')||['draft','draft-move','draft-stop','fire-at-will','clear-orders','shoot','melee'].includes(command.type)){
    const affected=actors.map(id=>world.pawns.find(p=>p.id===id)).find(p=>p?.mental?.crisis);
    if(affected?.mental?.crisis)return refusal('invalid-command',`${mentalCrisisLabel(affected.mental.crisis.kind)} : ce colon ne peut pas obéir pendant sa crise.`);
  }
  if(command.type==='hostility-response'){const p=world.pawns.find(p=>p.id===command.pawnId);if(!p||!['flee','ignore','attack'].includes(command.response))return refusal('invalid-command','Réaction invalide.');if(command.response==='flee')delete p.hostilityResponse;else p.hostilityResponse=command.response;cancelAutomaticCombat(p);if(p.flee&&command.response!=='flee'){delete p.flee;p.path=[];p.state='idle';}return {ok:true};}
  if(typeof command.type==='string'&&command.type.startsWith('order-')&&'pawnId' in command&&world.pawns.find(p=>p.id===command.pawnId)?.melee?.strike)return refusal('invalid-command','Le colon récupère après sa frappe.');
  if(command.type==='melee'||command.type==='shoot'){const result=command.type==='melee'?applyMeleeCommand(world,command):applyShootingCommand(world,command);if(result.ok){const target=world.pawns.find(p=>p.id===command.targetId);if(target?.visitor)visitorGroupDanger(world,target,'hostile');}return result;}
  if(typeof command.type==='string'&&'pawnId' in command&&command.type.startsWith('order-')&&world.pawns.find(p=>p.id===command.pawnId)?.shooting?.stance?.phase==='cooldown')return {ok:false,code:'invalid-command',reason:'Le colon récupère après son tir.'};
  if(command.type==='draft'||command.type==='draft-move'||command.type==='draft-stop'||command.type==='fire-at-will')return applyDraftCommand(world,command);
  if(typeof command.type==='string'&&command.type.startsWith('order-')&&'pawnId' in command&&world.pawns.find(p=>p.id===command.pawnId)?.draft
    &&!(world.schemaVersion>=193&&command.type==='order-haul'&&command.target?.type==='turret'))return refusal('invalid-command','Démobilisez ce colon avant un ordre civil.');
  if(command.type==='clear-orders'&&world.pawns.find(p=>p.id===command.pawnId)?.draft)return applyDraftCommand(world,{type:'draft-stop',pawnIds:[command.pawnId]});
  if(command.type==='order-equipment'||command.type==='weapon-permission'||command.type==='apparel-permission'||command.type==='forget-weapon')return applyEquipment(world,command);
  if(command.type==='order-feed')return applyFeeding(world,command);
  if(command.type==='tame')return applyTaming(world,command);
  if(command.type==='pen-species'){
    if(!Number.isSafeInteger(command.markerId)||typeof command.accepted!=='boolean'||!PEN_ANIMALS.includes(command.species))return refusal('invalid-command','Réglage d’enclos invalide.');
    const marker=world.structures.find(s=>s.id===command.markerId&&s.kind==='pen-marker');
    if(!marker?.pen)return refusal('missing-target','Marqueur d’enclos introuvable.');
    const selected=new Set(marker.pen.accepted);
    if(command.accepted)selected.add(command.species);else selected.delete(command.species);
    marker.pen.accepted=PEN_ANIMALS.filter(id=>selected.has(id));
    reconcileDomesticWork(world);wakePlanners(world);return {ok:true};
  }
  if(command.type==='animal-care-policy')return applyAnimalCarePolicy(world,command);
  if(command.type==='surgery-request'||command.type==='surgery-cancel'||command.type==='surgery-install')return applySurgery(world,command);
  if(command.type==='order-tend')return applyTending(world,command);
  if(command.type==='self-tend-policy'){
    const p=world.pawns.find(p=>p.id===command.pawnId);
    if(!p||p.state==='dead'||typeof command.enabled!=='boolean')return refusal('invalid-command','Réglage d’auto-soin invalide.');
    if(command.enabled)p.selfTend=true;else delete p.selfTend;
    p.planCooldown=0;return {ok:true};
  }
  if(command.type==='medical-care'){
    const p=world.pawns.find(p=>p.id===command.pawnId);
    if(!p||p.state==='dead'||typeof command.care!=='string'||!Object.hasOwn(MEDICAL_CARE,command.care))return refusal('invalid-command','Plafond médical invalide.');
    delete p.careDisabled;p.medicalCare=command.care;p.planCooldown=0;return {ok:true};
  }
  if(command.type==='medical-policy'){
    const p=world.pawns.find(p=>p.id===command.pawnId);
    if(!p||typeof command.enabled!=='boolean')return refusal('invalid-command','Politique médicale invalide.');
    delete p.medicalCare;if(command.enabled)delete p.careDisabled;else p.careDisabled=true;
    p.planCooldown=0;return {ok:true};
  }
  if(command.type==='order-rescue')return applyRescue(world,command);
  if(command.type==='order-capture')return applyCapture(world,command);
  if(command.type==='order-arrest')return applyArrest(world,command);
  if(command.type==='medical-bed')return applyMedicalBed(world,command);
  if(command.type==='order-job'||command.type==='order-cook'||command.type==='order-haul'||command.type==='clear-orders')return applyOrderCommand(world,command);
  if (command.type === 'schedule-paint' || command.type === 'schedule-replace') return applyScheduleCommand(world, command);
  if (command.type === 'food-policy-create' || command.type === 'food-policy-update' || command.type === 'food-policy-delete' || command.type === 'food-policy-assign') return applyFoodPolicyCommand(world, command);
  if(command.type==='door-policy'){
    const result=applyDoorCommand(world,command);
    if(result.ok)reconcileDomesticWork(world);
    return result;
  }
  if(command.type==='install')return installCommand(world,command);
  const drops=planCommandDrops(world,command);
  if(!drops)return refusal('occupied','Pas de place à proximité pour les matériaux libérés.');
  if(command.type==='hunt')return designateHunt(world,command);
  if(command.type==='cooler-adjust')return adjustCoolerTarget(world,command.structureId,command.offset);
  if(command.type==='cooler-target')return setCoolerTarget(world,command.structureId,command.target);
  if(command.type==='research-project')return selectResearch(world,command.project);
  if(command.type==='bill-add'||command.type==='bill-update'||command.type==='bill-remove'||command.type==='bill-move') {
    const result=applyBillCommand(world,command,drops);if(result.ok){detachMissingBills(world);detachMissingGunBills(world);detachMissingFlakBills(world);detachMissingArtBills(world);detachMissingComponentBills(world);wakePlanners(world);refreshStock(world);}return result;
  }
  if (command.type === 'area') return applyArea(world, command,drops);
  if (command.type === 'build-line') return applyBuildLine(world, command);
  if(command.type==='turret-hold-fire'||command.type==='turret-auto-reload'){
    const s=reloadableTurret(world,command.structureId);
    if(world.schemaVersion<193||!s||typeof command.enabled!=='boolean')return refusal('invalid-command','Mini-tourelle ou réglage invalide.');
    if(command.type==='turret-hold-fire')setTurretHoldFire(s,command.enabled);
    else {
      if(!command.enabled)for(const p of world.pawns)if(p.haul?.destination.type==='turret'&&!p.haul.destination.forced&&p.haul.destination.structureId===s.id)releaseWork(world,p,drops);
      s.turret!.autoReload=command.enabled;wakePlanners(world);refreshStock(world);
    }
    return {ok:true};
  }
  if (command.type === 'refuel-policy') {
    const fire=refuelable(world,command.structureId);
    if (!fire || typeof command.enabled!=='boolean') return refusal('invalid-command','Bâtiment ou réglage de ravitaillement invalide.');
    if(!command.enabled)for(const pawn of world.pawns)if(pawn.haul?.destination.type==='fuel'&&!pawn.haul.destination.forced&&pawn.haul.destination.structureId===fire.id)releaseWork(world,pawn,drops);
    fire.fuel!.autoRefuel=command.enabled;wakePlanners(world);refreshStock(world);return {ok:true};
  }
  if (command.type === 'growing-policy') {
    const zone = world.growingZones.find(z => z.id === command.zoneId);
    if (!zone || typeof command.allowSow !== 'boolean' || typeof command.allowCut !== 'boolean' || command.plant!==undefined&&!isCropKind(command.plant)) return refusal('invalid-command', 'Zone ou réglages de culture invalides.');
    if(zone.basinId!==undefined&&(command.plant??zone.plant)==='corn')return refusal('invalid-command','Le maïs ne peut pas être cultivé en hydroponie.');
    cancelGrowingJobs(world, new Set([zone.id]),drops);
    world.growingZones = world.growingZones.map(z => z === zone ? {...z, plant:command.plant??z.plant, allowSow: command.allowSow, allowCut: command.allowCut} : z);
    wakePlanners(world); return {ok:true};
  }
  if (command.type === 'assign-bed') {
    const bed = world.structures.find(item => item.id === command.bedId && isBedKind(item.kind));
    const owner = world.pawns.find(item => item.id === command.pawnId);
    if (!bed || bed.medical || bed.prisoner || (command.pawnId !== null && (!owner||owner.state==='dead'))) return refusal('missing-target', 'Lit ou colon introuvable.');
    for (const pawn of world.pawns) if (pawn.bedId === bed.id || pawn === owner) {
      if (pawn.need?.kind === 'sleep') releaseWork(world, pawn,drops);
      pawn.bedId = null; pawn.needCooldown = 0;
    }
    if (owner) owner.bedId = bed.id;
    return { ok: true };
  }
  if (command.type === 'priority') {
    if (!['handle','art','clean','firefight','warden','basic','hunt','research','patient','bedrest','doctor','mine', 'gather', 'build', 'haul', 'grow', 'cook', 'craft'].includes(command.work) || !Number.isInteger(command.value) || command.value < 0 || command.value > 4) return refusal('invalid-priority', 'La priorité doit être comprise entre 0 et 4.');
    const pawn = world.pawns.find(candidate => candidate.id === command.pawnId);
    if (!pawn) return refusal('missing-target', 'Colon introuvable.');
    const background=backgroundWorkRefusal(pawn,command.work);if(command.value>0&&background)return refusal('invalid-priority',background);
    pawn.priorities[command.work] = command.value;
    if(command.value===0&&pawn.deepWork&&command.work===(pawn.deepWork.kind==='drill'?'mine':'research'))releaseWork(world,pawn,drops);
    if(command.value===0&&(command.work==='handle'&&pawn.animalHandling||command.work==='doctor'&&(pawn.animalCare||pawn.animalFeed)))releaseWork(world,pawn,drops);
    if(command.work==='hunt'&&command.value===0&&pawn.hunting){cancelHunting(pawn);pawn.path=[];pawn.state='idle';}if(command.work==='research'&&command.value===0&&pawn.research)releaseAssignments(world,pawn);
    if(command.value===0&&pawn.feed&&command.work===feedingWork(world.pawns.find(p=>p.id===pawn.feed!.patientId))&&pawn.orders.active!=='feed')releaseWork(world,pawn,drops);
    if(command.work==='doctor'&&command.value===0&&(pawn.surgery||pawn.tend&&pawn.orders.active!=='tend'))releaseWork(world,pawn);
    if(command.work==='clean'&&command.value===0&&pawn.cleaning&&!pawn.cleaning.forced)releaseWork(world,pawn,drops);
    if(command.work==='haul'&&command.value===0&&pawn.burial&&pawn.orders.active!=='bury')releaseWork(world,pawn,drops);
    if(command.work==='firefight'&&command.value===0&&pawn.firefighting&&!pawn.firefighting.forced)releaseWork(world,pawn,drops);
    if(command.work==='warden'&&command.value===0&&pawn.ward)releaseWork(world,pawn,drops);
    if(command.value===0&&pawn.rescue&&pawn.orders.active!=='rescue'&&(pawn.rescue.release?
      (command.work==='basic'||command.work==='warden')&&!workPriority(pawn,'basic')&&!workPriority(pawn,'warden'):
      command.work===(world.pawns.find(p=>p.id===pawn.rescue!.patientId)?.prisoner?'warden':'doctor')))releaseWork(world,pawn,drops);
    const job = world.jobs.find(candidate => candidate.id === pawn.jobId);
    if (command.value === 0 && ((job && workType(job) === command.work && pawn.orders.active===null) || (pawn.haul && pawn.orders.active!=='haul' && command.work === haulingWork(pawn.haul.destination)) || (pawn.cooking && pawn.orders.active!=='cook' && command.work === taskWork(pawn.cooking)))) releaseWork(world, pawn,drops);
    pawn.planCooldown = 0; refreshStock(world); return { ok: true };
  }
  if (!['designate', 'cancel', 'stockpile'].includes(command.type)) return refusal('invalid-command', 'Commande inconnue.');
  if (!inBounds(world, command.x, command.z)) return refusal('out-of-bounds', 'Cellule hors de la carte.');
  if (command.type === 'stockpile') {
    if(cookingCellReserved(world,command))return refusal('occupied','Case réservée par un cuisinier.');
    if (world.pawns.some(p => p.haul?.destination.type === 'aside' && !p.haul.whole && sameCell(p.haul.destination, command))) return refusal('occupied', 'Case réservée pour le dégagement des cultures.');
    if (typeof command.enabled !== 'boolean' || !validStorageSettings(command,world.schemaVersion)) return refusal('invalid-storage', `Filtres, priorité (1–4) ou capacité (1–${ITEM_DEFINITIONS.silver.stackLimit}) invalides.`);
    const existing = world.stockpiles.find(zone => sameCell(zone, command));
    if (!command.enabled) {
      if (!existing) return refusal('missing-target', 'Aucune cellule de stockage ici.');
      removeIdentity(world.stockpiles,existing);
    } else {
      if (growingZoneAt(world, cellIndex(world, command.x, command.z)) || ['water', 'rock'].includes(world.tiles[cellIndex(world, command.x, command.z)]!.terrain)
        || world.resources.some(item => sameCell(item, command))
        || [...world.structures, ...world.jobs].some(item => !['deconstruct','uninstall'].includes(item.kind)&&occupancyOf('furniture' in item?item.furniture?.kind??item.kind:item.kind)?.zones!==true&&occupies(item,command))) return refusal('occupied', 'Stockage impossible sur cette cellule occupée ou infranchissable.');
      if (existing) {
        if(Object.hasOwn(command,'items')){if(command.items===undefined)delete existing.items;else existing.items={...command.items};}
        if(Object.hasOwn(command,'quality')){if(command.quality===undefined)delete existing.quality;else existing.quality={...command.quality};}
        if(Object.hasOwn(command,'hitPoints')){if(command.hitPoints===undefined)delete existing.hitPoints;else existing.hitPoints={...command.hitPoints};}
        existing.filters = command.filters ? { ...command.filters } : existing.filters;
        existing.priority = command.priority ?? existing.priority;
        existing.capacity = command.capacity ?? existing.capacity;
      } else world.stockpiles.push({ id: world.nextId++, x: command.x, z: command.z, filters: { ...(command.filters ?? { wood: true, food: true }) },...(command.items!==undefined?{items:{...command.items}}:{}),...copyStorageConditions(command), priority: command.priority ?? 2, capacity: command.capacity ?? ITEM_DEFINITIONS.silver.stackLimit });
    }
    for(const pawn of world.pawns)if(pawn.cooking?.storageId===existing?.id&&pawn.cooking){pawn.cooking.storageId=null;delete pawn.cooking.storageQuantity;pawn.path=[];pawn.planCooldown=0;}
    // Re-evaluate pending capacity reservations atomically after the policy change.
    for (const pawn of world.pawns) if (pawn.haul?.destination.type === 'stockpile'
      && (!destinationValid(world, pawn) || pawn.haul.destination.stockpileId === existing?.id)) releaseWork(world, pawn,drops);
    for(const p of world.pawns)if(p.haul?.whole&&p.haul.destination.type==='aside'&&!destinationValid(world,p))releaseWork(world,p,drops);
    wakePlanners(world); refreshStock(world); return { ok: true };
  }
  if (command.type === 'cancel') {
    const existing = world.jobs.find(job => footprintCells(job).some(cell => sameCell(cell, command)))??furnitureIntentAt(world,command);
    if (!existing) return refusal('missing-target', 'Aucun ordre à annuler ici.');
    if(existing.kind==='repair'||existing.kind==='fix-breakdown')return refusal('invalid-command','Retirez la zone de foyer pour suspendre cet entretien automatique.');
    if(isRoofJob(existing)){designateRoofArea(world,[cellIndex(world,command.x,command.z)],'ignore-roof');wakePlanners(world);return {ok:true};}
    for (const pawn of world.pawns) if (pawn.jobId === existing.id || (pawn.haul && constructionHaulId(pawn.haul.destination) === existing.id)) releaseWork(world, pawn,drops);
    removeIdentity(world.jobs,existing);
    const delivered = world.piles.filter(pile => pile.owner.type === 'job' && pile.owner.jobId === existing.id);
    for (const pile of delivered) if(!commitDrop(world,pile,existing,drops)) throw new Error('Preflighted cancellation has no drop cell.');
    event(world, 'command', 'Ordre annulé ; les matériaux restent sur place.');
    wakePlanners(world); refreshStock(world); return { ok: true };
  }
  const result = canDesignate(world, command);
  if (!result.ok) return result;
  if(command.kind==='uninstall') {
    if(!Number.isSafeInteger(world.nextId+1))return refusal('invalid-command','Limite des identités atteinte.');
    const source=deconstructionAt(world,command)!;
    const maintenance=world.jobs.find(j=>j.fixBreakdown?.structureId===source.id);
    if(maintenance&&!retireBreakdownJob(world,maintenance))return refusal('occupied','Pas de place pour restituer le composant de réparation.');
    designateUninstall(world,source);wakePlanners(world);return {ok:true};
  }
  if(command.kind==='deconstruct') {
    if(!Number.isSafeInteger(world.nextId+1))return refusal('invalid-command','Limite des identités atteinte.');
    const target=deconstructionAt(world,command)!;if((target.kind==='crafting-spot'||target.kind==='butcher-spot'))removeCraftingSpot(world,target,drops);else designateDeconstruction(world,target);
    wakePlanners(world);event(world,'command','Bâtiment désigné pour déconstruction.');return {ok:true};
  }
  if(command.kind==='crafting-spot'||command.kind==='butcher-spot'){const r=placeCraftingSpot(world,command,drops);if(r.ok)wakePlanners(world);return r;}
  removeZonesForPlan(world,command,drops);
  world.jobs.push({ id: world.nextId++, kind: command.kind, ...(isConstruction(command)?{construction:command.kind==='grave'?'frame' as const:'blueprint' as const,...command.kind==='grave'||command.kind==='lay-floor'?{}:{material:command.material??(command.kind==='sandbags'?'cloth' as const:command.kind==='orbital-beacon'||command.kind==='comms-console'||command.kind==='deep-drill'||command.kind==='ground-scanner'||command.kind==='vitals-monitor'||command.kind==='hydroponics-basin'||command.kind==='mini-turret'||command.kind==='hospital-bed'||command.kind==='tube-television'?'steel' as const:'wood' as const)}}:{}),...(command.kind==='lay-floor'?{floor:command.floor}:command.kind==='remove-floor'?{floor:world.tiles[command.z*world.width+command.x]!.floor}:{}), x: command.x, z: command.z, orientation: command.orientation ?? 0, footprint: 'standard', status: 'pending', reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 } });
  refreshStock(world); wakePlanners(world); event(world, 'command', `Nouvel ordre : ${JOB_LABEL[command.kind]} (${command.x}, ${command.z}).`); return { ok: true };
}

function completeJob(world: World, pawn: Pawn, job: Job): void {
  if(job.flowerPotId!==undefined&&job.kind==='cut'){
    const pot=world.structures.find(s=>s.id===job.flowerPotId&&s.kind==='flower-pot');if(!pot?.flower?.plant){releaseWork(world,pawn);return;}pot.flower=cutFlowerPotPlant(pot.flower);
  } else if (job.kind === 'chop' || job.kind === 'harvest' || job.kind === 'cut') {
    const resource = world.resources.find(item => sameCell(item, job));
    if (!resource) { releaseWork(world, pawn); return; }
    if (job.kind === 'harvest' && !harvestable(world, resource)) { releaseWork(world, pawn); return; }
    const quantity=gatherResource(world,resource,job.kind,job.id,pawn);
    if(quantity===null){setWorkUnits(job,Math.max(0,Math.round((jobDuration(world,job)-1)*WORK_FRACTIONS)));releaseWork(world,pawn);return;}
    if(job.kind!=='chop'&&quantity>0)event(world,'job',`${pawn.name} a récolté ${quantity} ${harvestProductLabel(resource)}.`);
  } else if(job.kind==='lay-floor'||job.kind==='remove-floor'){
    if(!(job.kind==='lay-floor'?finishFloor(world,job):removeFloor(world,job))){releaseWork(world,pawn);return;}
  } else if (isRoofJob(job)) {
    finishRoofJob(world,job);
  } else if (job.kind === 'deconstruct') {
    const target=world.structures.find(s=>s.id===job.deconstruction?.structureId);
    if(!finishDeconstruction(world,pawn,job)){releaseWork(world,pawn);return;}
    invalidateAnimalPens(world);reconcileDomesticWork(world);
    if(target?.kind==='wall'||isRoomDoor(target?.kind))reconcileRoofSupport(world,false,target);
  } else if (job.kind==='mine'||job.kind==='install'||job.kind==='uninstall') {
    return; // Furniture transfers are processed by their physical state machine.
  } else if (job.kind === 'sow') {
    finishSowing(world, job);
  } else {
    if(!constructionSupplied(world,job)||!constructionSiteFree(world,job,pawn.id)||!Number.isSafeInteger(world.nextId+(job.kind==='hydroponics-basin'?2:1))){setWorkUnits(job,Math.max(0,Math.round((jobDuration(world,job)-1)*WORK_FRACTIONS)));releaseWork(world,pawn);return;}
    world.piles = world.piles.filter(pile => pile.owner.type !== 'job' || pile.owner.jobId !== job.id);
    if(job.kind==='wind-turbine')adoptWind(world);
    const qualityStream={rng:world.rng},quality=isHabitatFurnitureKind(job.kind)&&FURNITURE_DEFINITIONS[job.kind].quality?craftingQuality(pawn.skills.construction.level,()=>healthRandom(qualityStream)):undefined;if(quality)world.rng=qualityStream.rng;
    world.structures.push({ ...(job.kind==='mini-turret'?{turret:newMiniTurretState()}:{}),...(job.kind==='hospital-bed'?{medical:true as const}:{}),...(job.kind==='grave'?{grave:initialGrave()}:{}),...(job.kind==='pen-marker'?{pen:{accepted:[...PEN_ANIMALS]}}:{}),...(job.kind==='heater'?{heater:newHeaterState()}:{}),...(job.kind==='wind-turbine'?{wind:newWindTurbineState()}:{}),...(job.kind==='battery'?{battery:{stored:0}}:{}),...(job.kind==='cooler'?{cooler:newCoolerState()}:{}),...(job.kind==='flower-pot'?{flower:createFlowerPotState()}:{}),...(quality?{quality}:{}),...(isElectrical(job.kind)?{power:newPowerState(job.kind)}:{}),...(isPassageDoor(job.kind)?{door:builtDoorState(world,job)}:{}),...(job.material?{material:job.material}:{}),...(isFueledBuilding(job.kind)?{fuel:newBuildingFuel(job.kind as import('./types.ts').StructureKind)}:{}),...(job.kind==='drug-lab'||job.kind==='art-bench'||job.kind==='machining-table'||job.kind==='fabrication-bench'||job.kind==='tailor-bench'||job.kind==='electric-tailor-bench'||job.kind==='campfire'||isFoodWorkstation(job.kind)||job.kind==='stonecutter'?{bills:[]}:{}), id: world.nextId++, kind: job.kind as import('./types.ts').StructureKind, x: job.x, z: job.z, orientation: job.orientation, footprint: job.footprint });
    if(job.kind==='hydroponics-basin')initializeHydroponicBasin(world,world.structures.at(-1)!);
    if(job.kind==='fence'||job.kind==='fence-gate'||job.kind==='pen-marker'||job.kind==='wall'||isRoomDoor(job.kind)||job.kind==='cooler')invalidateAnimalPens(world);
  }
  if(job.kind==='cooler'||job.kind==='wall'||isRoomDoor(job.kind))autoRoofRooms(world,job);
  removeIdentity(world.jobs,job); pawn.jobId = null; pawn.path = []; if(!medicallyStopped(pawn))pawn.state = 'idle'; pawn.planCooldown = 0;
  event(world, 'job', `${pawn.name} a terminé le travail : ${JOB_LABEL[job.kind]}.`); wakePlanners(world);
}
const workEnvironments=new WeakMap<World,WorkEnvironmentCache>();
function environmentCache(world:World):WorkEnvironmentCache {
  let cache=workEnvironments.get(world);if(!cache){cache=new WorkEnvironmentCache();workEnvironments.set(world,cache);}return cache;
}
const readPlantLight=(world:World):LightEnvironment=>environmentCache(world).readLight(world);
const plantLightSourcesKey=(world:World):string=>lightSources(world).map(s=>`${s.cell}:${s.radius}:${s.red}:${s.green}:${s.blue}:${s.overlightRadius??0}`).join('|');
export function stepWorld(world: World, ticks = 1, diagnostics?:import('./work-planner.ts').SearchStats): void {
  if (!Number.isInteger(ticks) || ticks < 0 || ticks > 100000) throw new Error('Tick count must be an integer between 0 and 100000.');
  if(!ticks)return;
  // Old profiles start this new stream prospectively, when play resumes.
  // Loading or pausing never invents a past opportunity or heat exposure.
  adoptMiscIncidents(world);
  adoptWeatherIncidents(world);
  adoptShortCircuits(world);
  adoptCropBlights(world);
  adoptDeepResources(world);adoptOrbital(world);
  adoptWorldIncidents(world);
  adoptSmallIncidents(world);
  adoptRainElectrical(world);
  let thermal=reconcileTemperature(world);reconcilePlantLighting(world,()=>readPlantLight(world));updateFoodTemperatures(world,thermal);updatePlantTemperatures(world,thermal);
  for (let step = 0; step < ticks; step++) {
    flushColonyLosses(world);
    world.tick++;
    let light:LightEnvironment|undefined,lightKey:string|undefined;
    const getLight=()=>{if(!light){light=readPlantLight(world);lightKey=plantLightSourcesKey(world);}return light;};
    advanceHumanAges(world);
    sampleColonyEconomy(world);
    advanceArrivals(world);advanceHeatwaves(world);advanceMiscIncidents(world);advanceSmallIncidents(world);advanceVisitors(world);advancePodRescues(world);advanceFluIncidents(world);
    const beforeWeather=world.structures;
    advanceSurfaceWeather(world,cell=>{const c={type:'designate' as const,kind:'chop' as const,...cell};if(canDesignate(world,c).ok)applyCommand(world,c);});
    if(beforeWeather!==world.structures)thermal=reconcileTemperature(world);
    advancePower(world);advanceHydroponics(world);advanceOrbital(world);
    advanceCropBlight(world);
    advanceWorldIncidents(world);
    const beforeElectricalRain=world.structures;
    advanceRainElectrical(world);
    if(beforeElectricalRain!==world.structures)thermal=reconcileTemperature(world);
    advanceBreakdowns(world);
    expireFood(world);
    thermal=advanceSurfaceTemperature(world,thermal,getLight);
    burnFuel(world);
    advanceTameness(world);reconcileDomesticWork(world);advanceWildlife(world);
    updateDoors(world);
    advancePrisonBreaks(world);
    const structuresBeforeCombat=world.structures;
    advanceWorldCombat(world);advanceCorpses(world,thermal);advanceMechanoidCorpses(world);reconcileDomesticWork(world);advanceAnimalProducts(world);advanceHumanCorpses(world);advanceDeathThoughts(world);reconcileBurials(world);reconcileCommercialOnMap(world);
    detachMissingBills(world);detachMissingGunBills(world);detachMissingFlakBills(world);detachMissingArtBills(world);detachMissingComponentBills(world);if(world.tick%20===0)reconcileBreakdownJobs(world);reconcileRepairs(world);reconcilePowerFlicks(world);
    expireStaggers(world);advanceFilth(world,weatherRainRate(world));
    scheduleGrowing(world);
    scheduleRoofs(world);advanceWorldApparelWear(world);reconcilePrisoners(world);reconcileRescues(world);reconcileWarden(world);reconcilePatientRest(world);reconcileTending(world);reconcileSurgery(world);reconcileFeeding(world);reconcileEquipmentTasks(world);for(const pawn of world.pawns){if(pawn.orbitalTrade)reconcileOrbitalTrade(world,pawn);if(pawn.deepWork)reconcileDeepWork(world,pawn);reconcileWeaponMemory(world,pawn);}
    // Build only if this tick actually plans or moves. No cross-tick cache can hide
    // a command, edited terrain, restored save, or a wall that changed between calls.
    let blocked: Uint8Array | undefined;
    let roofs: RoofContext | undefined;
    let environment:WorkEnvironment|undefined;
    let furnitureSight:ReturnType<typeof captureFurnitureSight>|undefined;
    const getEnvironmentCache=()=>{
      return environmentCache(world);
    };
    if(structuresBeforeCombat!==world.structures)light=undefined;
    const getEnvironment=()=>environment??=getEnvironmentCache().read(world,getLight());
    const getFurnitureSight=()=>furnitureSight??=captureFurnitureSight(world);
    // Sparse live references for this decision phase. Each consumer still
    // rechecks hostility/state; ordinary fauna is not scanned per colonist.
    const bombSources=captureBombDangerSources(world);
    const animalThreats=world.wildlife?.animals.filter(a=>a.manhunter&&!['dead','downed'].includes(a.state))??[];
    const getThreats=()=>threatQueries(world,animalThreats);
    advanceBeautyNeeds(world,getLight().topology);
    advanceFlowerPots(world,getLight(),new TemperatureView(world,thermal));
    const hasAdversary=world.pawns.some(p=>p.faction==='outlaws'&&!p.prisoner||prisonBreakActive(p)||p.mental?.crisis?.kind==='berserk')||animalThreats.length>0||(world.mechanoids??[]).some(m=>!['dead','downed'].includes(m.state));
    let thermalDirty=structuresBeforeCombat!==world.structures;
    const invalidateEnvironment=()=>{environment=undefined;light=undefined;furnitureSight=undefined;thermalDirty=true;};
    const getRoofs = () => roofs ??= new RoofContext(world);
    const getBlocked: NavigationGrid = () => blocked ??= blockedCells(world);
    const occupied = CIVIL_TRANSIT_BLOCKERS;
    const budget: SearchBudget = { remaining: PATH_SEARCHES_PER_TICK, pairs: 32768,stats:diagnostics };
    const processMechanicalDecisions=()=>{
      const actors=world.mechanoids;if(!actors?.length)return;
      const batch=mechanoidCombatBatch(world,getBlocked);
      for(let offset=0;offset<actors.length;offset++)processMechanoidCombat(world,actors[(world.tick-1+offset)%actors.length]!,getBlocked,budget,getLight,batch);
    };
    // Both populations share the unchanged global search/pair cap. Alternate
    // first admission and rotate owners so a continuously busy colony cannot
    // starve the mechanical tail. Historical worlds take the same human path.
    if(world.tick%2)processMechanicalDecisions();
    for (let offset = 0; offset < world.pawns.length; offset++) {
      const pawn = world.pawns[((world.tick - 1) + offset) % world.pawns.length]!;
      const completedEdge=pawn.moveCooldown>0&&(pawn.motion?.end??0)<=world.tick;
      pawn.moveCooldown = Math.max(0, (pawn.motion?.end ?? world.tick) - world.tick); if (pawn.planCooldown > 0) pawn.planCooldown--;
      advanceHeatExposure(world,pawn,()=>new TemperatureView(world,thermal).at(world,pawn));
      const body=updatePawnHealth(world,pawn);
      if(prisonBreakActive(pawn)&&(pawn.state==='downed'||pawn.state==='dead'))endPrisonBreak(world,pawn);
      if(scoutOnMapId(world)===pawn.id&&(pawn.state==='dead'||pawn.state==='downed'))applyScoutCommand(world,{type:'scout-cancel'});
      if(commercialOnMapId(world)===pawn.id&&(pawn.state==='dead'||pawn.state==='downed'))applyCommercialPreparation(world,{type:'commercial-cancel'});
      if(groupOnMapMember(world,pawn.id)&&(pawn.state==='dead'||pawn.state==='downed'||pawn.mental?.crisis))cancelGroupPreparation(world);
      if(pawn.equipmentDropPending)dropIncapacitatedEquipment(world,pawn,true);
      if(pawn.state==='dead'){expireMealMemories(world,pawn);updateMentalBreak(world,pawn);continue;}
      if(completedEdge)recordFilthMovement(world,pawn);
      if(pawn.health)bleedFilth(world,pawn,medicalBleed(pawn.health),pawn.state==='downed'||pawn.state==='sleeping');
      tickSkills(world,pawn);
      updateNeeds(world, pawn,body,getFurnitureSight,()=>getLight().topology);
      updateMentalBreak(world,pawn,budget);
      if(prisonBreakActive(pawn)&&(pawn.mental?.crisis||pawn.state==='downed'||pawn.need))endPrisonBreak(world,pawn);
      if(pawn.mental?.crisis){
        if(scoutOnMapId(world)===pawn.id)applyScoutCommand(world,{type:'scout-cancel'});
        if(commercialOnMapId(world)===pawn.id)applyCommercialPreparation(world,{type:'commercial-cancel'});
      }
      if(processPawnVomiting(world,pawn)){if(prisonBreakActive(pawn))endPrisonBreak(world,pawn);continue;}
      if(pawn.stun&&pawn.stun.untilCore<=world.tick*10)delete pawn.stun;
      if(pawn.state==='downed'||carrierOf(world,pawn.id)||isStunned(pawn,world.tick*10))continue;
      if((hasAdversary||pawn.meleeThreat&&world.tick*10-pawn.meleeThreat.atCore<=400)&&!pawn.prisoner&&!pawn.mental?.crisis){considerAutomaticCombat(world,pawn,budget,animalThreats);considerFlee(world,pawn,getThreats());}
      if(pawn.need?.kind==='eat' && pawn.need.dining && !validDiningPlace(world,pawn.need.dining)) {pawn.need.phase='choose-spot';pawn.need.dining=null;pawn.need.progress=0;delete pawn.need.workRemainder;pawn.path=[];pawn.state='moving';}
      if(pawn.orbitalTrade)reconcileOrbitalTrade(world,pawn);if(pawn.deepWork)reconcileDeepWork(world,pawn);
      if (pawn.moveCooldown > 0) { if(pawn.draft)pawn.draft.lastActiveTick=world.tick; pawn.state = groupOnMapMember(world,pawn.id) || scoutOnMapId(world)===pawn.id || commercialOnMapId(world)===pawn.id || pawn.orbitalTrade || pawn.deepWork || pawn.animalHandling || pawn.animalCare || pawn.animalFeed || pawn.burial || pawn.cleaning || pawn.visitor || pawn.podRescue || pawn.trade || pawn.burning || pawn.firefighting || pawn.hunting || pawn.mental?.crisis || pawn.raid || pawn.tactics || pawn.melee || pawn.flee || pawn.draft || pawn.bombRefuge || pawn.heatRefuge || pawn.research || pawn.jobId !== null || pawn.equipmentTask || pawn.ward || pawn.feed || pawn.tend || pawn.surgery || pawn.rescue || pawn.haul || pawn.need || pawn.cooking || pawn.recreation.task ? 'moving' : 'idle'; continue; }
      const needsContext = {
        recreationTopology:()=>getLight().topology,
        search: (goals?: ReadonlySet<number>) => search(world, pawn, getBlocked(), occupied, budget, goals),
        move: (target: Cell, exact: boolean) => moveToward(world, pawn, target, true, getBlocked, budget, exact, getLight),
        release: () => releaseWork(world, pawn),
        event: (message: string) => event(world, 'need', message),
      };
      if(processBurning(world,pawn,needsContext))continue;
      if(bombDanger(world,pawn,getBlocked,budget,getLight,bombSources))continue;
      if(processGroupOnMap(world,pawn,needsContext))continue;
      if(processCommercialOnMap(world,pawn,needsContext))continue;
      if(processScoutLoading(world,pawn,needsContext))continue;
      if(processPrisonBreak(world,pawn,getBlocked,budget,getLight,needsContext))continue;
      if(pawn.prisoner&&!(world.schemaVersion>=213&&isColonist(pawn)&&pawn.mental?.crisis)){processPrisoner(world,pawn,needsContext);continue;}
      if(pawn.mental?.crisis){
        if(isAggressiveCrisis(pawn.mental))processAggressiveCrisis(world,pawn,getBlocked,budget,getLight,needsContext);
        else processMentalBreak(world,pawn,needsContext,()=>searchCandidates(world,pawn,getBlocked(),occupied,budget));
        continue;
      }
      if(pawn.visitor){processVisitor(world,pawn,needsContext);continue;}
      if(pawn.raid){if(!processDraftSleep(world,pawn,needsContext))processRaider(world,pawn,getBlocked,budget,getLight);continue;}
      if(pawn.tactics){if(!processDraftSleep(world,pawn,needsContext))processTactics(world,pawn,getBlocked,budget,getLight);continue;}
      if(pawn.melee){if(!processDraftSleep(world,pawn,needsContext)&&pawn.melee)processMelee(world,pawn,getBlocked,budget,getLight);continue;}
      if(processPodRescuePatient(world,pawn,needsContext))continue;
      if(!isColonist(pawn)){if(!processDraftSleep(world,pawn,needsContext))processSentry(world,pawn,getThreats());continue;}
      if(pawn.flee){if(!processDraftSleep(world,pawn,needsContext)&&pawn.flee)processFlee(world,pawn,getThreats(),getBlocked,budget,getLight);continue;}
      if(pawn.shooting)collapseFromExhaustion(world,pawn,needsContext);
      // Finish post-shot recovery before choosing another civilian activity.
      if(pawn.hunting&&pawn.shooting?.stance?.phase==='cooldown')continue;
      if(pawn.shooting&&!pawn.hunting){if(pawn.draft)pawn.draft.lastActiveTick=world.tick;continue;}
      if(pawn.draft&&processFirefighting(world,pawn,needsContext))continue;
      if(pawn.draft&&draftTurretService(world,pawn)){
        pawn.draft.lastActiveTick=world.tick;
        if(!processDraftSleep(world,pawn,needsContext)){
          if(advanceOrders(world,pawn,getBlocked,budget))continue;
          if(advancePriorityWork(world,pawn,getBlocked,budget))continue;
          if(pawn.haul?.destination.type==='turret')processHaul(world,pawn,(target,allow)=>moveToward(world,pawn,target,allow,getBlocked,budget,false,getLight),()=>wakePlanners(world));
        }
        continue;
      }
      if(pawn.draft){if(!processDraftSleep(world,pawn,needsContext)){processDraft(world,pawn,getBlocked,budget,getLight);if(pawn.moveCooldown===0)retryInterruptedCargo(world,pawn);}continue;}
      if(pawn.firefighting&&processFirefighting(world,pawn,needsContext))continue;
      if(pawn.interruptedCargo){processNeeds(world,pawn,needsContext);continue;}
      if (leaveTransitCell(world,pawn,getBlocked,budget,getLight)) continue;
      if(pawn.orbitalTrade&&processOrbitalTrade(world,pawn,needsContext))continue;
      if(pawn.trade&&processTrade(world,pawn,needsContext))continue;
      if(pawn.equipmentTask){processEquipment(world,pawn,needsContext);continue;}
      if(pawn.orders.active==='bury'&&pawn.burial){processBurial(world,pawn,needsContext);continue;}
      if(pawn.cleaning?.forced&&processCleaning(world,pawn,needsContext))continue;
      if (advanceOrders(world,pawn,getBlocked,budget)) continue;
      if (!pawn.animalHandling&&!pawn.animalCare&&!pawn.animalFeed&&!pawn.ward&&!pawn.feed&&!pawn.tend&&!pawn.surgery&&!pawn.rescue&&advancePriorityWork(world,pawn,getBlocked,budget)) continue;
      if(processHeatRefuge(world,pawn,needsContext,thermal))continue;
      if(processFirefighting(world,pawn,needsContext))continue;
      if (planUrgentCare(world,pawn,()=>searchCandidates(world,pawn,getBlocked(),occupied,budget))) continue;
      if (processNeeds(world, pawn, needsContext) || !pawn.animalHandling&&!pawn.animalCare&&!pawn.animalFeed&&!pawn.ward&&!pawn.feed&&!pawn.tend&&!pawn.surgery&&!pawn.rescue&&pawn.orders.active===null&&processRecreation(world, pawn, needsContext)) continue;
      if(!pawn.surgery&&pawn.planCooldown===0&&recoverDroppedWeapon(world,pawn,()=>searchCandidates(world,pawn,getBlocked(),occupied,budget)))continue;
      if(!pawn.surgery&&pawn.planCooldown===0&&considerApparelPolicy(world,pawn,()=>searchCandidates(world,pawn,getBlocked(),occupied,budget)))continue;
      if (pawn.jobId === null && pawn.haul === null && !pawn.rescue && !pawn.animalHandling && !pawn.animalCare && !pawn.animalFeed && !pawn.ward&&!pawn.feed&&!pawn.tend&&!pawn.surgery && !pawn.cooking && !pawn.hunting && !pawn.orbitalTrade && !pawn.deepWork && !pawn.research && !pawn.burial && !pawn.cleaning && pawn.planCooldown === 0) planWork(world, pawn, getBlocked, occupied, budget);
      if(pawn.firefighting&&processFirefighting(world,pawn,needsContext))continue;
      if(pawn.animalHandling){processHandling(world,pawn,{...needsContext,candidates:()=>searchCandidates(world,pawn,getBlocked(),occupied,budget),blocked:getBlocked});continue;}
      if(pawn.animalFeed){processAnimalFeeding(world,pawn,needsContext);continue;}
      if(pawn.animalCare){processAnimalCare(world,pawn,{...needsContext,candidates:()=>searchCandidates(world,pawn,getBlocked(),occupied,budget),blocked:getBlocked},()=>getLight().speedAt(pawn));continue;}
      if(pawn.hunting){processHunting(world,pawn,{...needsContext,candidates:()=>searchCandidates(world,pawn,getBlocked(),occupied,budget),blocked:getBlocked});continue;}
      if(pawn.burial){processBurial(world,pawn,needsContext);continue;}
      if(processCleaning(world,pawn,needsContext))continue;
      if(pawn.deepWork){processDeepWork(world,pawn,needsContext,()=>getLight().speedAt(pawn));continue;}
      if(pawn.research){processResearch(world,pawn,needsContext.move,s=>researchRate(pawn,s,getEnvironment(),new TemperatureView(world,thermal).at(world,s),world),message=>event(world,'job',message));continue;}
      if(pawn.ward){processWarden(world,pawn,needsContext);continue;}
      if(pawn.feed){processFeeding(world,pawn,needsContext);continue;}
      if(pawn.surgery){processSurgery(world,pawn,needsContext,()=>getLight().lightAt(pawn),cell=>getLight().lightAt(cell));continue;}
      if(pawn.tend){processTending(world,pawn,needsContext,()=>getLight().speedAt(pawn),()=>searchCandidates(world,pawn,getBlocked(),occupied,budget));continue;}
      if(pawn.rescue){processRescue(world,pawn,needsContext);continue;}
      if (pawn.haul) { const refueling=pawn.haul.destination.type==='fuel';processHaul(world, pawn, (target, allow) => moveToward(world, pawn, target, allow, getBlocked, budget,false,getLight), () => {wakePlanners(world);if(refueling)invalidateEnvironment();});continue; }
      if(pawn.cooking) {processCooking(world,pawn,{
        workRate:(station,worker)=>getEnvironment().production(station,worker).total*((isFoodWorkstation(station.kind)||station.kind==='butcher-spot'||station.kind==='crafting-spot'||station.kind==='tailor-bench'||station.kind==='electric-tailor-bench'||station.kind==='machining-table'||station.kind==='art-bench'||station.kind==='drug-lab')?tailoringTemperatureFactor(new TemperatureView(world,thermal).at(world,station)):1)*(taskWork(pawn.cooking!)==='cook'||isMechSalvageRecipe(pawn.cooking!.recipe)||pawn.cooking!.recipe==='make-medicine'?1:physicalWorkFactor(pawn,'craft',body)),
        candidates:()=>searchCandidates(world,pawn,getBlocked(),occupied,budget),
        search:goals=>search(world,pawn,getBlocked(),occupied,budget,goals),
        move:(target,exact)=>moveToward(world,pawn,target,true,getBlocked,budget,exact,getLight),
        release:()=>releaseWork(world,pawn),event:message=>event(world,'job',message),
      });continue;}
      const job = world.jobs.find(candidate => candidate.id === pawn.jobId); if (!job) { processRecreation(world,pawn,needsContext,true); continue; }
      if(backgroundWorkRefusal(pawn,workType(job))){releaseWork(world,pawn);continue;}
       if ((job.growingZoneId !== undefined||job.flowerPotId!==undefined) && !growingJobValid(world, job)) { releaseWork(world, pawn); world.jobs = world.jobs.filter(j => j.id !== job.id); continue; }
      if (job.kind === 'sow' && groundPile(world, job)) { releaseWork(world, pawn); continue; }
      if(isRoofJob(job)) {
        if(!roofJobWanted(world,job,getRoofs())){releaseWork(world,pawn);reconcileRoofJobs(world,getRoofs());continue;}
        const tree=job.kind==='build-roof'?world.resources.find(r=>r.kind==='tree'&&sameCell(r,job)):undefined;
        if(tree&&!job.clearance){
          if(world.jobs.some(j=>j.id!==job.id&&sameCell(j,tree)&&(!isRoofJob(j)||j.clearance))){releaseWork(world,pawn);continue;}
          job.clearance={resourceId:tree.id,progress:0};
        }
      }
      if(job.clearance) {
        const plant=world.resources.find(r=>r.id===job.clearance!.resourceId);
        if(!plant){releaseWork(world,pawn);continue;}
        if(adjacent(pawn,plant)) {
          pawn.path=[];pawn.state='working';advanceWork(job.clearance,getLight().speedAt(pawn)*plantWorkRate(pawn,body,plant.kind==='tree'&&choppable(world,plant)&&berryYield(world,plant)>0));
          if(job.clearance.progress>=clearingDuration(plant)) {
            const quantity=gatherResource(world,plant,plant.kind==='tree'?'chop':'cut',job.id,pawn);
            if(quantity!==null)event(world,'job',`${pawn.name} a dégagé le chantier${plant.kind!=='tree'&&quantity>0?` et a récolté ${quantity} ${harvestProductLabel(plant)}`:''}.`);
            releaseWork(world,pawn);wakePlanners(world);
          }
        } else moveToward(world,pawn,constructionWorkTarget(world,job),false,getBlocked,budget,false,getLight);
        continue;
      }
      if(job.kind==='flick'){
        if(footprintCells(job).some(c=>adjacent(pawn,c))&&!footprintCells(job).some(c=>sameCell(pawn,c))){pawn.path=[];pawn.state='working';if(advancePowerFlick(world,job)){releaseWork(world,pawn);world.jobs=world.jobs.filter(j=>j!==job);invalidateEnvironment();event(world,'job',`${pawn.name} a actionné l’interrupteur.`);}}
        else moveToward(world,pawn,job,false,getBlocked,budget,false,getLight);
        continue;
      }
      if(job.kind==='repair'){
        if(adjacent(pawn,job)&&!sameCell(pawn,job)){if(advanceRepair(world,pawn,job,getLight().speedAt(pawn),body)){releaseWork(world,pawn);world.jobs=world.jobs.filter(j=>j!==job);event(world,'job',`${pawn.name} a réparé l’ouvrage.`);}}
        else moveToward(world,pawn,job,false,getBlocked,budget,false,getLight);
        continue;
      }
      if(job.kind==='fix-breakdown'){
        if(!constructionSupplied(world,job)){releaseWork(world,pawn);continue;}
        if(footprintCells(job).some(c=>adjacent(pawn,c))&&!footprintCells(job).some(c=>sameCell(pawn,c))){
          const result=advanceBreakdownFix(world,pawn,job,body);
          if(result){releaseWork(world,pawn);if(result==='success'){world.jobs=world.jobs.filter(j=>j!==job);event(world,'job',`${pawn.name} a remplacé le composant en panne.`);}else event(world,'job',`${pawn.name} a échoué à remplacer le composant ; une autre pièce est nécessaire.`);}
        }else moveToward(world,pawn,job,false,getBlocked,budget,false,getLight);
        continue;
      }
      if(job.kind==='sow'&&packedAt(world,job)){releaseWork(world,pawn);continue;}
      if(job.furniture){if(advanceFurniture(world,pawn,job,target=>moveToward(world,pawn,target,false,getBlocked,budget,false,getLight),()=>releaseWork(world,pawn),()=>constructionWorkRate(pawn,job,getLight().speedAt(pawn),body))){blocked=undefined;roofs=undefined;invalidateEnvironment();wakePlanners(world);}continue;}
      if(job.kind==='deconstruct'&&!deconstructionAvailable(world,job,pawn.id)){releaseWork(world,pawn);continue;}
      if(isConstruction(job)&&(pawn.skills.construction.level<(job.kind==='lay-floor'&&job.floor?FLOOR_DEFINITIONS[job.floor].skill:constructionSkillRequired(job.kind))||!constructionSupplied(world,job)||!constructionSiteFree(world,job,pawn.id))){releaseWork(world,pawn);continue;}
      if(job.kind==='mine') {
        if(Math.max(Math.abs(pawn.x-job.x),Math.abs(pawn.z-job.z))===1) {
          if(advanceMining(world,pawn,job,()=>getLight().speedAt(pawn),body)) {removeIdentity(world.jobs,job);pawn.jobId=null;pawn.state='idle';pawn.planCooldown=0;reconcileRoofSupport(world,false,job);reconcilePawnHealth(world,pawn);blocked=undefined;roofs=undefined;invalidateEnvironment();wakePlanners(world);event(world,'job',`${pawn.name} a terminé le minage.`);}
        } else moveToward(world,pawn,job,false,getBlocked,budget,false,getLight);
        continue;
      }
      const cells = footprintCells(job);
      if (cells.some(cell => adjacent(pawn, cell)) && !cells.some(cell => sameCell(pawn, cell))) {
        pawn.path = []; pawn.state = 'working';
        const plantJob=job.kind==='sow'||job.kind==='harvest'||job.kind==='cut'||job.kind==='chop';
        const tree=job.kind==='chop'?resourceAt(world,job.z*world.width+job.x):undefined;
        const plantLearning=job.kind==='sow'||job.kind==='harvest'||!!tree&&choppable(world,tree)&&berryYield(world,tree)>0;
        advanceWork(job,plantJob?getLight().speedAt(pawn)*plantWorkRate(pawn,body,plantLearning):constructionWorkRate(pawn,job,getLight().speedAt(pawn),body));
        if (workProgress(job) >= jobDuration(world, job)) {completeJob(world, pawn, job);blocked=undefined;roofs=undefined;invalidateEnvironment();}
      } else moveToward(world, pawn, job, false, getBlocked, budget,false,getLight);
    }
    if(!(world.tick%2))processMechanicalDecisions();
    for(const pawn of [...world.pawns])if(pawn.visitor)exitVisitor(world,pawn);
    reconcilePodRescueResults(world);
    for(const pawn of [...world.pawns])if(pawn.podRescue)exitPodRescue(world,pawn);
    for(const pawn of world.pawns)if(pawn.trade&&!world.pawns.some(t=>t.id===pawn.trade!.traderId&&t.visitor)){delete pawn.trade;pawn.path=[];pawn.state='idle';}
    for(const pawn of [...world.pawns])if(pawn.prisoner?.escape)exitPrisoner(world,pawn);
    if(world.raids)for(const pawn of [...world.pawns])if(pawn.raid?.exiting&&!pawn.prisoner)exitRaider(world,pawn);
    const scoutId=scoutOnMapId(world);
    if(scoutId!==null){const pawn=world.pawns.find(p=>p.id===scoutId);if(pawn)departScout(world,pawn);}
    const commercialId=commercialOnMapId(world);
    if(commercialId!==null){const pawn=world.pawns.find(p=>p.id===commercialId);if(pawn)departCommercial(world,pawn);}
    reconcileGroupPreparation(world);
    tryGroupDeparture(world);
    advanceColonyAdaptation(world);
    advanceRaids(world);
    advanceQuests(world);
    advanceSocial(world);
    if(world.roofing)reconcileRoofJobs(world,roofs);
    reconcileFires(world);reconcilePowerFlicks(world);reconcilePower(world);reconcileOrders(world);reconcileWildlife(world);advanceCorpses(world,thermal);advanceMechanoidCorpses(world);reconcileDomesticWork(world);advanceHumanCorpses(world);reconcileBurials(world);reconcileCommercialOnMap(world);
    if(world.hunting)world.hunting.targets=world.hunting.targets.filter(id=>world.wildlife?.animals.some(a=>a.id===id&&a.state!=='dead')||world.pawns.some(p=>p.hunting?.animalId===id));
    advanceScoutTrip(world);advanceCommercialTrip(world);advanceGroup(world);
    refreshStock(world);
    if(thermalDirty)thermal=reconcileTemperature(world);
    updateFoodTemperatures(world,thermal);
    if(light&&lightKey!==plantLightSourcesKey(world))light=undefined;
    reconcilePlantLighting(world,getLight);updatePlantTemperatures(world,thermal);reconcilePrisoners(world);reconcileRescues(world);reconcileWarden(world);reconcilePatientRest(world);reconcileTending(world);reconcileSurgery(world);reconcileFeeding(world);reconcileEquipmentTasks(world);for(const pawn of world.pawns){if(pawn.orbitalTrade)reconcileOrbitalTrade(world,pawn);if(pawn.deepWork)reconcileDeepWork(world,pawn);reconcileWeaponMemory(world,pawn);}
  }
}
import { updatePawnHealth,reconcilePawnHealth } from './health.ts';
import { medicallyStopped,physicalWorkFactor } from './health-rules.ts';
