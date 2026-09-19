import { validateBarriers } from './barrier-save.ts';
import { validateRaids } from './raid-save.ts';
import { validateArrivals } from './arrival-save.ts';
import { validateMental } from './mental-save.ts';
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
import { validRescueShape,validateRescues } from './rescue-save.ts';
import { validSkills } from './skills-save.ts';
import { validateInterruptedCargo } from './interrupted-cargo.ts';
import { initialSkills } from './skills.ts';
import { validPlantThermalFactor } from './thermal-plants.ts';
import { validateTemperature } from './temperature-save.ts';
import { initializeLightWork, validateWorkProgress } from './work-progress-save.ts';
import { workProgress } from './work-progress.ts';
import { legacyProductionTicks, productionWorkTotal, taskRecipe } from './production-recipes.ts';
import { validateRoofing } from './roof-save.ts';
import { isRoofJob } from './roof-rules.ts';
import { validateDoors } from './door-save.ts';
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
import { initializeFarming, validateFarming } from './farming-save.ts';
import { jobDuration } from './farming.ts';
import { workType } from './work-planner.ts';
import { asideCapacity, haulingWork } from './haul-aside.ts';
import { harvestable, isPlant, legacyPlantGrowth } from './plants.ts';
import { groundPile, storageCapacity } from './ground-placement.ts';
import { validateTravel } from './travel-validation.ts';
import { serviceCell } from './service-reservations.ts';
import { CARRY_CAPACITY, footprintCells, JOB_WOOD_COST, MAX_STACK } from './definitions.ts';
import { deliveredStock, groundQuantity, reservedDestination, reservedSource } from './materials.ts';
import { migrateLegacy, initializeNeeds, initializeDining, initializeFood, initializeSpatial, initializePlants } from './save-migrations.ts';
import type { World } from './types.ts';
import { validMapDimension } from './map-config.ts';
import { INGEST_TICKS } from './eating.ts';
import { validDiningPlace } from './dining.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { SCHEMA_VERSION, TICKS_PER_DAY } from './types.ts';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const bounded = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const stock = (value: unknown): boolean => record(value) && integer(value.wood, 0, MAX_STACK * 32768) && integer(value.food, 0, MAX_STACK * 32768);
const oneOf = (value: unknown, values: string[]): boolean => typeof value === 'string' && values.includes(value);

/** Structural validation first, cross-reference validation second; accepts arbitrary JSON without throwing. */
export function validateWorld(input: unknown): string[] {
  return validateSchema(input, SCHEMA_VERSION);
}
function validateSchema(input: unknown, version: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68): string[] {
  const legacyV2 = version === 2;
  const errors: string[] = [];
  if (!record(input)) return ['World must be an object.'];
  if (version >= 5 && !oneOf(input.foodRules, ['legacy', 'adult'])) errors.push('Invalid food rules profile.');
  if (version < 5 && input.foodRules !== undefined) errors.push('Legacy save contains version 5 fields.');
  if (input.schemaVersion !== version) errors.push('Unsupported schema version; migrate older saves through deserializeWorld.');
  if (!integer(input.seed, 0, 0xffffffff) || !integer(input.rng, 1, 0xffffffff)) errors.push('Invalid deterministic random state.');
  if (!integer(input.tick, 0) || !integer(input.nextId, 1)) errors.push('Invalid tick or nextId.');
  if (!integer(input.logisticsCursor, 0)) errors.push('Invalid logistics search cursor.');
  if (!validMapDimension(input.width) || !validMapDimension(input.height)) return [...errors, 'Invalid dimensions.'];
  const size = input.width * input.height;
  const arrays = ['tiles', 'pawns', 'resources', 'structures', 'jobs', 'piles', 'stockpiles', 'events'] as const;
  if (arrays.some(key => !Array.isArray(input[key]))) return [...errors, 'Missing world arrays.'];
  const tiles = input.tiles as unknown[];
  if (tiles.length !== size || tiles.some(tile => !record(tile) || !oneOf(tile.terrain, ['grass', 'soil', 'water', 'rock', ...(version>=28?['rough-stone']:[])]) || !validStoneIdentity(tile.stone, tile.terrain, version))) errors.push('Invalid terrain grid.');
  if (!stock(input.stock)) errors.push('Invalid derived stock.');
  const coord = (item: Record<string, unknown>): boolean => integer(item.x, 0, (input.width as number) - 1) && integer(item.z, 0, (input.height as number) - 1);
  const ids = new Set<number>();
  for (const key of ['pawns', 'resources', 'structures', 'jobs', 'piles', 'stockpiles'] as const) {
    const items = input[key] as unknown[];
    if (items.length > (key === 'piles' ? 32768 : key==='jobs'&&version>=35?size*2:size)) errors.push(`Too many ${key}.`);
    for (const item of items) {
      if (!record(item) || !integer(item.id, 1) || (key !== 'piles' && !coord(item))) { errors.push(`Invalid ${key} identity or cell.`); continue; }
      if (ids.has(item.id)) errors.push('Duplicate entity ID.'); ids.add(item.id);
      if (integer(input.nextId, 1) && item.id >= input.nextId) errors.push('nextId must exceed all entity IDs.');
      if (key === 'pawns') {
        if(!validDisturbance(item.disturbance,version,input.tick as number))errors.push('Invalid disturbance for schema.');
        if(!validTacticsShape(item.tactics,version,input as unknown as World))errors.push('Invalid tactics shape for schema.');
        if(!validAffiliationShape(item,version,input as unknown as World))errors.push('Invalid affiliation or flee shape for schema.');
        if(version>=46?!integer((item.priorities as Record<string,unknown>)?.doctor,0,4):(item.priorities as Record<string,unknown>)?.doctor!==undefined)errors.push('Invalid medical work priority for schema.');
        for(const key of ['patient','bedrest'])if(version>=47?!integer((item.priorities as Record<string,unknown>)?.[key],0,4):(item.priorities as Record<string,unknown>)?.[key]!==undefined)errors.push('Invalid patient priority for schema.');
        if(!validAttackMemory(item.lastAttack,version,input.tick as number))errors.push('Invalid attack memory for schema.');
        if(!validStagger(item.stagger,version,input.tick as number))errors.push('Invalid stagger state for schema.');
        if(!validMeleeShape(item.melee,version,input.tick as number)||!validStunShape(item.stun,version,input.tick as number))errors.push('Invalid melee or stun shape for schema.');
        if(!validShootingShape(item.shooting,version,input.tick as number))errors.push('Invalid shooting state for schema.');
        if(!validDraftShape(item.draft,version,input as unknown as World))errors.push('Invalid draft state for schema.');
        if(!validEquipmentShape(item,version))errors.push('Invalid equipment state for schema.');
        if(item.feed!==undefined&&!validFeedShape(item.feed,version,input as unknown as World))errors.push('Invalid feeding task shape.');
        if(item.tend!==undefined&&!validTendShape(item.tend,version,input as unknown as World))errors.push('Invalid tending shape for schema.');
        if(item.selfTend!==undefined&&(version<49||item.selfTend!==true))errors.push('Invalid self-tend policy for schema.');
        if(item.medicalCare!==undefined&&(version<51||!oneOf(item.medicalCare,['none','dry','herbal','industrial','best'])||item.careDisabled!==undefined))errors.push('Invalid medical care ceiling for schema.');
        if(item.careDisabled!==undefined&&(version<47||item.careDisabled!==true))errors.push('Invalid medical policy for schema.');
        if(record(item.need)&&item.need.medical!==undefined&&(version<47||item.need.kind!=='sleep'||!oneOf(item.need.medical,['patient','bedrest'])))errors.push('Invalid medical rest purpose for schema.');
        if(item.rescue!==undefined&&!validRescueShape(item.rescue,version))errors.push('Invalid rescue shape for schema.');
        if(item.medicalSleep!==undefined&&(version<45||item.medicalSleep!==true))errors.push('Invalid medical sleep marker for schema.');
        if(item.health!==undefined&&(version<45||validateMedicalRecord(item.health,version>=54,version>=59)))errors.push('Invalid medical record for schema.');
        if(version>=43 ? !validSkills(item.skills,input.tick as number,version) : item.skills!==undefined) errors.push('Invalid pawn skills for schema.');
        if(item.interruptedCargo!==undefined&&(version<44||item.interruptedCargo!==true))errors.push('Invalid interrupted cargo marker for schema.');
        if (typeof item.name !== 'string' || item.name.length === 0 || item.name.length > 80 || !bounded(item.hunger) || !bounded(item.rest) || !bounded(item.mood)
          || !oneOf(item.state, legacyV2 ? ['idle', 'moving', 'working', 'sleeping', 'hungry'] : ['idle', 'moving', 'working', 'sleeping', 'hungry', 'eating', ...(version>=15?['recreating']:[]),...(version>=45?['downed','dead']:[]),...(version>=47?['resting']:[])]) || !(item.jobId === null || integer(item.jobId, 1))
          || !record(item.priorities) || !integer(item.priorities.gather, 0, 4) || !integer(item.priorities.build, 0, 4) || !integer(item.priorities.haul, 0, 4) || (version >= 8 && !integer(item.priorities.grow, 0, 4))
          || !(version < 6 ? integer(item.moveCooldown, 0, 3) : typeof item.moveCooldown === 'number' && Number.isFinite(item.moveCooldown) && item.moveCooldown >= 0 && item.moveCooldown <= (version>=65?78:version>=59?49.5:version>=57?45:version>=45?38.146:version>=37?10.304:version>=22?8.443:version>=16?5.643:4.243)) || !integer(item.planCooldown, 0, 20)) errors.push('Invalid pawn state.');
        if (!Array.isArray(item.path) || item.path.length > size) errors.push('Invalid pawn path.');
        else {
          let previous = item;
          for (const cell of item.path) {
            if (!record(cell) || !coord(cell)) { errors.push('Invalid pawn path cell.'); break; }
            if ((version<6 ? Math.abs((cell.x as number)-(previous.x as number))+Math.abs((cell.z as number)-(previous.z as number)) : Math.max(Math.abs((cell.x as number)-(previous.x as number)),Math.abs((cell.z as number)-(previous.z as number)))) !== 1) { errors.push('Non-contiguous pawn path.'); break; }
            previous = cell;
          }
        }
        if(version<6 && item.motion!==undefined) errors.push('Legacy save contains spatial fields.');
        if(item.transitExit!==undefined&&(version<22||item.transitExit!==true)) errors.push('Invalid furniture exit intent.');
        if(version>=6 && item.motion==null && item.moveCooldown!==0) errors.push('Missing travel segment for movement delay.');
        if(version>=6 && item.motion!=null) {
          const m=item.motion;
          if(!record(m)||!record(m.from)||!record(m.to)||!coord(m.from)||!coord(m.to)||typeof m.start!=='number'||typeof m.end!=='number'||!Number.isFinite(m.start)||!Number.isFinite(m.end)||m.start<0||m.start>(input.tick as number)||m.to.x!==item.x||m.to.z!==item.z||Math.max(Math.abs((m.to.x as number)-(m.from.x as number)),Math.abs((m.to.z as number)-(m.from.z as number)))!==1) errors.push('Invalid travel segment.');
          else if(!validStunIntervals(m.stuns,version,m.start as number,input.tick as number)||!validSlowIntervals(m.stagger,version,m.start as number,input.tick as number)||(m.speedFactor!==undefined&&(version<37||typeof m.speedFactor!=='number'||!Number.isFinite(m.speedFactor)||m.speedFactor<(version>=65?.128*((4.6-.12)/4.6)/2:version>=63?.128*((4.6-.12)/4.6):version>=45?.128:.8)||m.speedFactor>1))||(m.terrainDelay!==undefined&&(version<16||(version<22?m.terrainDelay!==1.4:!(version>=31?[.2,1.4,3,4.2,5]:version>=28?[.2,1.4,3,4.2]:[1.4,3,4.2]).includes(m.terrainDelay as number))))||Math.abs(m.end-travelEnd(m as unknown as TravelSegment))>1e-7 || Math.abs((item.moveCooldown as number)-Math.max(0,m.end-(input.tick as number)))>1e-7) errors.push('Inconsistent travel duration.');
        }
        const haul = item.haul;
        if(record(haul)&&haul.whole!==undefined&&(version<26||haul.whole!==true||haul.quantity!==1||!record(haul.destination)||!['stockpile','aside'].includes(String(haul.destination.type))))errors.push('Invalid whole furniture haul shape.');
        if(record(haul)&&record(haul.destination)&&('growingZoneId' in haul.destination||'sowCell' in haul.destination)&&(version<20||!validSowingDestination(haul.destination,input as unknown as World)))errors.push('Invalid sowing clearance shape.');
        if(record(haul)&&haul.serviceProgress!==undefined&&(version<10||!record(haul.destination)||haul.destination.type!=='fuel'||haul.phase!=='deliver'||!integer(haul.serviceProgress,1,23)))errors.push('Invalid refuel interaction progress.');
        if(record(haul)&&record(haul.destination)&&haul.destination.forced!==undefined&&(version<19||haul.destination.type!=='fuel'||haul.destination.forced!==true))errors.push('Invalid forced refuel flag.');
        if(record(haul)&&record(haul.destination)&&haul.destination.forCooking!==undefined&&(haul.destination.type!=='fuel'||typeof haul.destination.forCooking!=='boolean'))errors.push('Invalid cooking refuel purpose.');
        if (!legacyV2) {
          if (!(item.bedId === null || integer(item.bedId, 1)) || !integer(item.needCooldown, 0, 20)) errors.push('Invalid need cadence or bed ownership.');
          const need = item.need;
          if (need !== null && (!record(need) || (need.kind === 'eat'
            ? !oneOf(need.phase, version < 4 ? ['pickup', 'ingest'] : ['pickup', 'choose-spot', 'travel', 'ingest']) || !integer(need.sourcePileId, 1) || !(need.carryPileId === null || integer(need.carryPileId, 1)) || !integer(need.progress, 0, INGEST_TICKS - 1)
            : need.kind === 'sleep' ? !oneOf(need.phase, ['travel', 'sleep']) || !(need.bedId === null || integer(need.bedId, 1)) || !record(need.target) || !coord(need.target)
              : true))) errors.push('Invalid need task.');
        } else if (item.need !== undefined || item.bedId !== undefined || item.needCooldown !== undefined) errors.push('Version 2 cannot contain version 3 task fields.');
        if (record(item.need) && item.need.kind === 'eat') {
          if (version >= 5 ? !integer(item.need.quantity, 1, MAX_STACK) : item.need.quantity !== undefined) errors.push('Invalid meal quantity.');
        }
        if (version >= 4) {
          if (!bounded(item.comfort) || !Array.isArray(item.memories) || item.memories.length > (version >= 8 ? 2 : 1) || item.memories.some(memory => !record(memory) || !oneOf(memory.kind, version >= 8 ? ['ate-without-table', 'ate-raw-food'] : ['ate-without-table']) || !integer(memory.expiresAt, (input.tick as number) + 1, (input.tick as number) + TICKS_PER_DAY))) errors.push('Invalid comfort or meal memory.');
          else if (new Set(item.memories.map(memory => (memory as {kind:string}).kind)).size !== item.memories.length) errors.push('Duplicate meal memory.');
          if (record(item.need) && item.need.kind === 'eat') {
            const dining = item.need.dining;
            if (dining !== null && (!record(dining) || !record(dining.target) || !coord(dining.target) || !(dining.seatId === null || integer(dining.seatId, 1)) || !(dining.tableId === null || integer(dining.tableId, 1)))) errors.push('Invalid dining place.');
          }
        } else if (item.comfort !== undefined || item.memories !== undefined || (record(item.need) && item.need.dining !== undefined)) errors.push('Legacy save contains version 4 fields.');
        if (haul !== null) {
          if (record(haul) && haul.pickupCell!==undefined && (version<6 || haul.phase!=='deliver' || !record(haul.pickupCell) || !coord(haul.pickupCell))) errors.push('Invalid pickup facing cell.');
          if (!record(haul) || !integer(haul.sourcePileId, 1) || !integer(haul.quantity, 1, CARRY_CAPACITY) || !oneOf(haul.phase, ['pickup', 'deliver'])
            || !(haul.carryPileId === null || integer(haul.carryPileId, 1)) || !record(haul.destination)
            || !(haul.destination.type === 'job' ? integer(haul.destination.jobId, 1) : haul.destination.type === 'fuel' && version>=10 ? integer(haul.destination.structureId,1) : haul.destination.type === 'stockpile' ? integer(haul.destination.stockpileId, 1) : version >= 9 && haul.destination.type === 'aside' && coord(haul.destination))) errors.push('Invalid haul task.');
        }
      } else if (key === 'resources') {
        if (!validPlantThermalFactor(item,version)) errors.push('Invalid plant thermal factor.');
        if (!validStoneIdentity(item.stone, item.kind, version)) errors.push('Invalid resource stone identity.');
        if (!oneOf(item.kind, ['tree', 'berries', 'rock', ...(version >= 8 ? ['rice'] : [])]) || !integer(item.amount, 1, 1000000)) errors.push('Invalid resource.');
        if (item.growth !== undefined || item.growthTick !== undefined) {
          if (version < 7 || !(item.kind === 'berries' || (version >= 8 && item.kind === 'rice')) || typeof item.growth !== 'number' || !Number.isFinite(item.growth) || item.growth < 0 || item.growth > 1 || !integer(item.growthTick, 0, input.tick as number)) errors.push('Invalid plant growth checkpoint.');
        }
      } else if (key === 'structures' || key === 'jobs') {
        if(item.medical!==undefined&&(version<46||key!=='structures'||item.kind!=='bed'||item.medical!==true))errors.push('Invalid medical bed role.');
        if (!oneOf(item.kind, key === 'structures' ? (version < 4 ? ['wall', 'bed'] : ['wall', 'bed', 'table', 'stool', ...(version>=10?['campfire']:[]), ...(version>=15?['horseshoes']:[]), ...(version>=31?['stonecutter']:[]), ...(version>=34?['door']:[]), ...(version>=40?['passive-cooler']:[]),...(version>=42?['wood-generator','standing-lamp']:[])]) : (version < 4 ? ['chop', 'harvest', 'wall', 'bed'] : [...(version>=35?['build-roof','remove-roof']:[]), ...(version>=28?['mine']:[]), ...(version>=25?['install','uninstall']:[]), ...(version>=67?['repair']:[]), ...(version>=24?['deconstruct']:[]), 'chop', 'harvest', ...(version >= 7 ? ['cut'] : []), ...(version >= 8 ? ['sow'] : []), 'wall', 'bed', 'table', 'stool', ...(version>=10?['campfire']:[]), ...(version>=15?['horseshoes']:[]), ...(version>=31?['stonecutter']:[]), ...(version>=34?['door']:[]), ...(version>=40?['passive-cooler']:[]),...(version>=42?['wood-generator','standing-lamp']:[])])) || !integer(item.orientation, 0, 3)
          || !oneOf(item.footprint, ['standard', 'legacy-single']) || (item.footprint === 'legacy-single' && item.kind !== 'bed' && !(version>=24&&item.kind==='deconstruct'||version>=25&&['install','uninstall'].includes(String(item.kind))))) errors.push('Invalid structure definition or footprint.');
        if (key==='structures' && isFueledBuilding(item.kind)) {
          const f=item.fuel;
          if(version<10||!record(f)||!integer(f.ticks,0,fuelLimit(item.kind))||!integer(f.burned,0,(input.tick as number)*(item.kind==='wood-generator'?3:1))||typeof f.autoRefuel!=='boolean'||(item.kind==='wood-generator'?!integer(f.burnRemainder,0,4):f.burnRemainder!==undefined))errors.push('Invalid building fuel.');
        } else if(item.fuel!==undefined)errors.push('Unexpected fuel state.');
        if (key === 'jobs' && (!oneOf(item.status, ['pending', 'active']) || !(item.reservedBy === null || integer(item.reservedBy, 1)) || !stock(item.escrow) || !integer(item.progress, 0, version>=31?Number.MAX_SAFE_INTEGER:119))) errors.push('Invalid job.');
      } else if (key === 'piles') {
        if(!validApparelShape(item,version))errors.push('Invalid apparel state for schema.');
        if(!validWeaponShape(item,version))errors.push('Invalid weapon state for schema.');
        if (!oneOf(item.kind, ['wood', 'food', ...(version>=28?['chunk']:[]), ...(version>=29?['steel']:[]), ...(version>=32?['blocks']:[]), ...(version>=41?['component']:[]), ...(version>=51?['medicine']:[]), ...(version>=52?['weapon']:[]), ...(version>=63?['apparel']:[])]) || !integer(item.quantity, 1, MAX_STACK) || !record(item.owner)) errors.push('Invalid material pile.');
        else {
          if (version >= 5) {
            if (typeof item.item !== 'string' || !Object.hasOwn(ITEM_DEFINITIONS, item.item)) errors.push('Unknown item definition.');
            else {
              if(version<10&&item.item==='simple-meal')errors.push('Legacy save contains cooked meal.');
              const definition = ITEM_DEFINITIONS[item.item as keyof typeof ITEM_DEFINITIONS];
              if (definition.kind !== item.kind || (item.quantity as number) > definition.stackLimit) errors.push('Invalid item category or stack limit.');
            }
          } else if (item.item !== undefined) errors.push('Legacy save contains version 5 item.');
          const owner = item.owner;
          if (owner.type === 'ground' ? !coord(owner) || Object.keys(owner).some(key => !['type', 'x', 'z'].includes(key))
            : (owner.type === 'pawn'||version>=52&&owner.type==='equipment'||version>=63&&owner.type==='apparel') ? !integer(owner.pawnId, 1) || Object.keys(owner).some(key => !['type', 'pawnId'].includes(key))
              : owner.type === 'job' ? !integer(owner.jobId, 1) || Object.keys(owner).some(key => !['type', 'jobId'].includes(key)) : true) errors.push('Invalid material owner.');
        }
      } else if (!record(item.filters) || typeof item.filters.wood !== 'boolean' || typeof item.filters.food !== 'boolean' || item.filters.apparel!==undefined&&(version<63||typeof item.filters.apparel!=='boolean') || item.filters.weapon!==undefined&&(version<52||typeof item.filters.weapon!=='boolean') || item.filters.medicine!==undefined&&(version<51||typeof item.filters.medicine!=='boolean') || item.filters.component!==undefined&&(version<41||typeof item.filters.component!=='boolean') || item.filters.blocks!==undefined&&(version<32||typeof item.filters.blocks!=='boolean') || item.filters.steel!==undefined&&(version<29||typeof item.filters.steel!=='boolean') || item.filters.chunk!==undefined&&(version<28||typeof item.filters.chunk!=='boolean') || item.filters.furniture!==undefined&&(version<26||typeof item.filters.furniture!=='boolean')
        || !integer(item.priority, 1, 4) || !integer(item.capacity, 1, MAX_STACK)) errors.push('Invalid storage policy.');
    }
  }
  const events = input.events as unknown[];
  if (events.length > 80 || events.some(item => !record(item) || !integer(item.tick, 0, input.tick as number) || !oneOf(item.type, ['job', 'need', 'command']) || typeof item.message !== 'string' || item.message.length > 240)) errors.push('Invalid event log.');
  if (version >= 8 && !errors.length) errors.push(...validateFarming(input, size, ids));
  if(!errors.length)errors.push(...validateTemperature(input as unknown as World,version));
  if(!errors.length)errors.push(...validateWorkProgress(input as unknown as World,version));
  if(!errors.length)errors.push(...validateMining(input as unknown as World,version));
  if(!errors.length)errors.push(...validateFurniture(input as unknown as World,version,ids,true));
  if(!errors.length)errors.push(...validateBarriers(input as unknown as World,version));
  if(!errors.length)errors.push(...validateDeconstruction(input as unknown as World,version,true));
  if(!errors.length)errors.push(...validatePriorityWork(input as unknown as World,version));
  if(!errors.length)errors.push(...validatePlayerOrders(input as unknown as World,version,true));
  if(!errors.length)errors.push(...validateCooking(input,version,ids));
  if(!errors.length)errors.push(...validateDoors(input as unknown as World,version));
  if(!errors.length)errors.push(...validateConstructionMaterials(input as unknown as World,version));
  if(!errors.length)errors.push(...validatePreservation(input as unknown as World,version));
  if(!errors.length)errors.push(...validateSchedules(input as unknown as World,version));
  if(!errors.length)errors.push(...validateFoodPolicies(input as unknown as World,version));
  if(!errors.length)errors.push(...validateRecreation(input as unknown as World,version));
  if(!errors.length)errors.push(...validateConstruction(input as unknown as World,version));
  if(!errors.length)errors.push(...validateRoofing(input as unknown as World,version));
  if(!errors.length)errors.push(...validatePlayerOrders(input as unknown as World,version));
  if (errors.length) return errors;
  const world = input as unknown as World;
  errors.push(...validateRaids(world,version,ids));
  if(errors.length)return errors;
  errors.push(...validateArrivals(world,version));
  errors.push(...validateMental(world,version));
  if(version>=44)errors.push(...validateInterruptedCargo(world));
  if(version>=45)errors.push(...validatePawnHealth(world));
  if(version>=46)errors.push(...validateRescues(world));
  if(version>=48)errors.push(...validateFeeding(world));
  if(version>=47)errors.push(...validateCare(world));
  if(version>=63)errors.push(...validateApparel(world));
  if(version>=52)errors.push(...validateEquipment(world));
  if(version>=53)errors.push(...validateDrafting(world));
  errors.push(...validateProjectiles(world,version,ids));
  if(version>=56)errors.push(...validateShooting(world));
  if(version>=59)errors.push(...validateMelee(world));
  if(version>=61)errors.push(...validateTactics(world));
  if(version>=58)errors.push(...validateAffiliations(world));
  errors.push(...validateFurniture(world,version,ids));
  if(!errors.length)errors.push(...validatePower(world,version));
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
    for (const item of items) if(!isRoofJob(item)) for (const cell of footprintCells(item)) {
      if (cell.x < 0 || cell.z < 0 || cell.x >= world.width || cell.z >= world.height) { errors.push('Footprint outside map.'); continue; }
      if (map.has(cellKey(cell))) errors.push('Overlapping footprints.');
      (map as Map<number, typeof item>).set(cellKey(cell), item);
    }
  }
  const isImpassable = (cell: { x: number; z: number }): boolean => ['water', 'rock'].includes(world.tiles[cellKey(cell)]!.terrain);
  for (const item of [...world.resources, ...world.pawns, ...world.stockpiles]) if (isImpassable(item)) errors.push('Entity placed on impassable terrain.');
  for (const [key,item] of [...structureCells, ...jobCells]) if (item.kind!=='mine'&&['water', 'rock'].includes(world.tiles[key]!.terrain)) errors.push('Footprint on impassable terrain.');
  for (const resource of world.resources) if (structureCells.has(cellKey(resource))) errors.push('Resource overlaps a structure.');
  for (const zone of world.stockpiles) if (resourceCells.has(cellKey(zone)) || (version<21?structureCells.has(cellKey(zone))||jobCells.has(cellKey(zone)) : occupancyOf(structureCells.get(cellKey(zone))?.kind??'cut')?.zones===false || jobCells.has(cellKey(zone))&&!['deconstruct','uninstall'].includes(jobCells.get(cellKey(zone))!.kind)&&occupancyOf(jobCells.get(cellKey(zone))!.furniture?.kind??jobCells.get(cellKey(zone))!.kind)?.zones!==true)) errors.push('Storage overlaps fixed content.');
  if(version>=21)for(const zone of world.growingZones)if(zone.cells.some(c=>occupancyOf(structureCells.get(c)?.kind??'cut')?.zones===false||occupancyOf(jobCells.get(c)?.furniture?.kind??jobCells.get(c)?.kind??'cut')?.zones===false))errors.push('Growing zone overlaps incompatible construction.');
  const pawnCells = new Set<number>();
  const bedOwners = new Set<number>();
  const sleepingBeds = new Set<number>();
  const diningCells = new Set<number>();
  const serviceCells = new Set<number>();
  for (const pawn of world.pawns) {
    const key = cellKey(pawn);
    if(version>=22&&pawn.transitExit&&!pawn.motion)errors.push('Furniture exit lacks a physical edge.');
    if(version>=14) {
      const service=serviceCell(pawn);
      if(service) {const target=cellKey(service);if(serviceCells.has(target))errors.push('Conflicting service reservation.');serviceCells.add(target);}
    }
    if (version < 14 && pawnCells.has(key)) errors.push('Pawns overlap.'); pawnCells.add(key);
    if ((version<22?['wall', 'table']:['wall']).includes(structureCells.get(key)?.kind ?? '') || version<16&&['wall', 'table'].includes(jobCells.get(key)?.kind ?? '')) errors.push('Pawn occupies a wall target.');
    if (Number(version>=52&&!!pawn.equipmentTask) + Number(version>=48&&!!pawn.feed) + Number(version>=47&&!!pawn.tend) + Number(version>=46&&!!pawn.rescue) + Number(version>=10&&!!pawn.cooking) + Number(pawn.jobId !== null) + Number(pawn.haul !== null) + Number(!legacyV2 && pawn.need !== null) > 1) errors.push('Pawn has two simultaneous tasks.');
    if (pawn.jobId !== null) {
      const job = jobById.get(pawn.jobId);
      if (!job || job.reservedBy !== pawn.id || job.status !== 'active') errors.push('Pawn/job reservation mismatch.');
      if (job && pawn.priorities[workType(job)] === 0 && !(version>=17&&pawn.orders.active===job.id)) errors.push('Pawn assigned to disabled work.');
    }
    const owned = world.piles.filter(pile => pile.owner.type === 'pawn' && pile.owner.pawnId === pawn.id);
    if (owned.length > 1 || (owned.length === 1 && !(version>=51&&pawn.tend?.medicine&&pawn.tend.phase!=='pickup') && !(version>=48&&pawn.feed&&pawn.feed.phase!=='pickup') && !(version>=44&&pawn.interruptedCargo) && !(version >= 10 && pawn.cooking) && pawn.haul?.phase !== 'deliver' && (legacyV2 || pawn.need?.kind !== 'eat' || pawn.need.phase === 'pickup'))) errors.push('Carried ownership mismatch.');
    if (pawn.jobId !== null || pawn.haul !== null || version>=52&&pawn.equipmentTask || version>=48&&pawn.feed || version>=47&&pawn.tend || version>=46&&pawn.rescue || version >= 10 && pawn.cooking) { if (!['moving', 'working'].includes(pawn.state)) errors.push('Assigned pawn has incompatible state.'); }
    else if (!(version>=68&&pawn.raid)&&!(version>=65&&pawn.mental?.crisis)&&!(version>=61&&pawn.tactics)&&!(version>=59&&pawn.melee)&&!(version>=58&&pawn.flee) && !(version>=53&&pawn.draft) && !(version>=15&&pawn.recreation.task) && (legacyV2 || pawn.need === null) && (pawn.path.length || ['moving', 'working'].includes(pawn.state)) && !(version>=22&&pawn.transitExit&&pawn.state!=='working')) errors.push('Unassigned pawn has path or work state.');
    if (!legacyV2) {
      if (pawn.bedId !== null) {
        if (![...world.structures,...(world.packed??[]).map(p=>p.building)].some(bed => bed.kind === 'bed' && !bed.medical && bed.id === pawn.bedId) || bedOwners.has(pawn.bedId)) errors.push('Invalid or duplicate bed ownership.');
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
          const bed = world.structures.find(item => item.id === need.bedId && item.kind === 'bed');
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
      if (haul.phase === 'pickup') {
        if (haul.carryPileId !== null || !pile || pile.owner.type !== 'ground' || reservedSource(world, pile.id) > pile.quantity) errors.push('Invalid source quantity reservation.');
      } else if (!pile || pile.owner.type !== 'pawn' || pile.owner.pawnId !== pawn.id || pile.quantity !== haul.quantity || owned[0]?.id !== haul.carryPileId) errors.push('Invalid carried quantity.');
      if (haul.destination.type === 'fuel') {
        const fuelTargetId=haul.destination.structureId;
        if(haul.destination.forCooking&&world.structures.find(s=>s.id===fuelTargetId)?.kind!=='campfire')errors.push('Cooking refuel targets a non-cooking building.');
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
        if (!zone || !pile || !zone.filters[pile.kind] || (version>=6 ? storageCapacity(world,zone,pile.item,pawn.id)<haul.quantity : groundQuantity(world, zone) + reservedDestination(world, haul.destination) > zone.capacity)) errors.push('Invalid storage capacity reservation.');
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
    if (job.kind === 'chop' || job.kind === 'harvest' || job.kind === 'cut') { if (!resource || !(job.kind === 'chop' ? resource.kind === 'tree' : isPlant(resource))) errors.push('Gather job has no matching resource.'); else if (version >= 7 && job.kind === 'harvest' && !(version === 7 ? legacyPlantGrowth(world,resource) > .65 : harvestable(world,resource))) errors.push('Harvest job targets an immature plant.'); }
    else if(!isRoofJob(job)&&job.kind!=='repair'&&job.kind!=='mine'&&job.kind!=='deconstruct'&&job.kind!=='uninstall'&&job.kind!=='install')for (const cell of footprintCells(job)) {
      const obstacle=resourceCells.get(cellKey(cell));
      if (obstacle&&(version<16||!isConstruction(job)||obstacle.kind==='rock') || structureCells.has(cellKey(cell))) errors.push('Construction overlaps existing content.');
    }
  }
  const available = { wood: 0, food: 0 };
  for (const pile of world.piles) {
    const owner = pile.owner;
    if (owner.type === 'ground') {
      if (version>=6 && groundPile(world,owner)?.id!==pile.id) errors.push('Several item stacks occupy one floor cell.');
      if (version>=21&&!groundOccupancyAllows(world,owner) || isImpassable(owner) || structureCells.get(cellKey(owner))?.kind === 'wall' || version<16&&jobCells.get(cellKey(owner))?.kind === 'wall') errors.push('Pile on impassable cell.');
      if(pile.kind==='wood'||pile.kind==='food')available[pile.kind] += pile.quantity;
    } else if (owner.type === 'pawn') { if (!pawnById.has(owner.pawnId)) errors.push('Pile references missing carrier.'); if(pile.kind==='wood'||pile.kind==='food')available[pile.kind] += pile.quantity; }
    else if(owner.type==='equipment'||owner.type==='apparel'){if(!pawnById.has(owner.pawnId))errors.push('Missing equipment owner.');}
    else if (!jobById.has(owner.jobId)) errors.push('Pile references missing construction.');
  }
  if (world.stock.wood !== available.wood || world.stock.food !== available.food) errors.push('Derived stock differs from physical piles.');
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
  if(record(input)&&input.schemaVersion===42){const errors=validateSchema(input,42);if(errors.length)throw new Error('Invalid version 42 save: '+errors.join(' '));const w=input as unknown as World;for(const p of w.pawns){p.skills=initialSkills(8,0);delete (p.skills as Partial<typeof p.skills>).medicine;delete (p.skills as Partial<typeof p.skills>).shooting;delete (p.skills as Partial<typeof p.skills>).melee;}input.schemaVersion=43;}
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
  const errors = validateWorld(input); if (errors.length) throw new Error(`Invalid save: ${errors.join(' ')}`); return input as World;
}
/** Deterministic diagnostic fingerprint, not a cryptographic digest. */
export function hashWorld(world: World): string {
  const serialized = JSON.stringify(world); let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index++) { hash ^= serialized.charCodeAt(index); hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
import { validateMedicalRecord } from './injury-validation.ts';
import { validatePawnHealth } from './health-save.ts';
