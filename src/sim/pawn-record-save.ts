// Common raw Pawn guard. Owner registration and contextual bindings stay outside.
// Identity/Thing registration stays with the owner coordinator. No World clone,
// extra map Pawn, clock catch-up, or mutable gameplay is created here.
import { validFamilyBereavementShape } from './family-bereavement-save.ts';
import { validRomanceMemoryShape } from './romance-memories.ts';
import {validatePawnAppearance} from './pawn-appearance.ts';
import { legacyHumanAge, validHumanAge } from './human-age.ts';
import { validRoomExperience } from './room-experience.ts';
import { validHumanBodyShape,validHumanCorpseShape,validGraveShape,validBurialTaskShape,validateBurials } from './burial-save.ts';
import { validVisitorShape,validateVisitors } from './visitor-save.ts';
import { validTradeShape,validateTrade } from './trade-save.ts';
import { validHuntingTask,validateHunting } from './hunting-save.ts';
import { validPawnPodRescue,validPodRescueShape,validatePodRescues } from './pod-rescue-save.ts';
import { validBombRefugeShape,validateBombRefuges } from './bomb-danger.ts';
import { validTraits } from './traits.ts';
import { validBackground } from './colonist-backgrounds.ts';
import { validateMental,validMeleeThreatShape } from './mental-save.ts';
import { validDisturbance } from './disturbance-state.ts';
import { validTacticsShape,validateTactics } from './tactics-save.ts';
import { validAttackMemory } from './automatic-combat-save.ts';
import { validAffiliationShape,validateAffiliations } from './affiliation-save.ts';
import { validStagger } from './stagger.ts';
import { travelEnd,validSlowIntervals,validStunIntervals,type TravelSegment } from './travel-timing.ts';
import { validMeleeShape,validStunShape,validateMelee } from './melee-save.ts';
import { validShootingShape,validateShooting } from './shooting-save.ts';
import { validDraftShape,validateDrafting } from './drafting-save.ts';
import { validEquipmentShape,validWeaponShape,validateEquipment } from './equipment-save.ts';
import { validFeedShape,validateFeeding } from './feeding-save.ts';
import { validTendShape,validateCare } from './care-save.ts';
import { validPawnSurgeryShape,validateSurgeries } from './surgery-save.ts';
import { validRescueShape,validateRescues } from './rescue-save.ts';
import { validSkills } from './skills-save.ts';
import { initializePlayerOrders, validatePlayerOrders, validSowingDestination } from './player-orders-save.ts';
import { validateTravel,MIN_PAWN_SPEED_V87,MAX_PAWN_DELAY_V87,MIN_PAWN_SPEED_V86,MAX_PAWN_DELAY_V86 } from './travel-validation.ts';
import { validPrisonerPawnShape,validatePrisoners } from './prisoner-save.ts';
import { CARRY_CAPACITY, footprintCells, JOB_WOOD_COST, MAX_STACK } from './definitions.ts';
import type { Resource,World } from './types.ts';
import { INGEST_TICKS } from './eating.ts';
import { SCHEMA_VERSION, TICKS_PER_DAY } from './types.ts';
import { validateMedicalRecord } from './injury-validation.ts';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const bounded = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const oneOf = (value: unknown, values: string[]): boolean => typeof value === 'string' && values.includes(value);

export function validatePawnRecordShape(item:Record<string,unknown>, world:World, version:number, validationTick=world.tick):string[] {
  const input=world as unknown as Record<string,unknown>;
  const legacyV2=version===2, size=world.width*world.height, errors:string[]=[];
  const coord=(value:Record<string,unknown>)=>integer(value.x,0,world.width-1)&&integer(value.z,0,world.height-1);
  if(!validPawnPodRescue(item,version,input as unknown as World))errors.push('Invalid or future pod rescue mandate for schema.');
  if(!validHumanAge(item.age,version))errors.push('Invalid or future human age.');
  if(version<195&&(Object.hasOwn(item,'familyBereavement')||Object.hasOwn(item,'romanceMemories'))
    ||!validFamilyBereavementShape(item.familyBereavement,version,validationTick)||!validRomanceMemoryShape(item.romanceMemories,version,validationTick))errors.push('Invalid or future family/romance memory shape.');
  if(!validBackground(item.background,version,item.age as import('./human-age.ts').HumanAge|undefined))errors.push('Invalid or future colonist background.');
  if(!validRoomExperience(item,version,validationTick))errors.push('Invalid or future room experience.');
  if(version>=90?(typeof item.beauty!=='number'||!Number.isFinite(item.beauty)||item.beauty<0||item.beauty>100):item.beauty!==undefined)errors.push('Invalid or future beauty need.');
  for(const field of ['apparelPolicyId','apparelAutomation','nextApparelCheckAt'])if(version<90&&item[field]!==undefined)errors.push('Legacy pawn contains apparel policy state.');
  if(!validPrisonerPawnShape(item,version,input as unknown as World))errors.push('Invalid prisoner, warden or recruitment shape for schema.');
  if(!validHumanBodyShape(item.body,version,validationTick)||!validBurialTaskShape(item.burial,version))errors.push('Invalid body or burial shape.');
  const art=(item.priorities as Record<string,unknown>)?.art;if(version>=104?!integer(art,0,4):art!==undefined)errors.push('Invalid art priority for schema.');
  const clean=(item.priorities as Record<string,unknown>)?.clean;if(version>=89?!integer(clean,0,4):clean!==undefined)errors.push('Invalid cleaning priority for schema.');
  const firefight=(item.priorities as Record<string,unknown>)?.firefight;
  if(version>=87?!integer(firefight,0,4):firefight!==undefined)errors.push('Invalid firefighting priority for schema.');
  const warden=(item.priorities as Record<string,unknown>)?.warden;
  if(version>=86?!integer(warden,0,4):warden!==undefined)errors.push('Invalid warden work priority for schema.');
  const basic=(item.priorities as Record<string,unknown>)?.basic;
  if(version>=85?!integer(basic,0,4):basic!==undefined)errors.push('Invalid basic work priority for schema.');
  if(!validDisturbance(item.disturbance,version,validationTick))errors.push('Invalid disturbance for schema.');
  if(!validTradeShape(item,version,input as unknown as World))errors.push('Invalid trade task for schema.');
  if(item.appearance!==undefined){if(version<109)errors.push('Future pawn appearance in older save.');else errors.push(...validatePawnAppearance(item.appearance));}
  if(!validVisitorShape(item,version,input as unknown as World))errors.push('Invalid visitor for schema.');
  if(!validHuntingTask(item.hunting,version,validationTick))errors.push('Invalid hunting task for schema.');
  if(!validTacticsShape(item.tactics,version,input as unknown as World))errors.push('Invalid tactics shape for schema.');
  if(!validAffiliationShape(item,version,input as unknown as World))errors.push('Invalid affiliation or flee shape for schema.');
  if(version>=46?!integer((item.priorities as Record<string,unknown>)?.doctor,0,4):(item.priorities as Record<string,unknown>)?.doctor!==undefined)errors.push('Invalid medical work priority for schema.');
  for(const key of ['patient','bedrest'])if(version>=47?!integer((item.priorities as Record<string,unknown>)?.[key],0,4):(item.priorities as Record<string,unknown>)?.[key]!==undefined)errors.push('Invalid patient priority for schema.');
  if(!validAttackMemory(item.lastAttack,version,validationTick))errors.push('Invalid attack memory for schema.');
  if(Object.hasOwn(item,'bombRefuge')&&!validBombRefugeShape(item.bombRefuge,version))errors.push('Invalid bomb refuge for schema.');
  if(version<192&&Object.hasOwn(item,'meleeThreat')||!validMeleeThreatShape(item.meleeThreat,version,validationTick))errors.push('Invalid melee threat for schema.');
  if(!validStagger(item.stagger,version,validationTick))errors.push('Invalid stagger state for schema.');
  if(!validMeleeShape(item.melee,version,validationTick)||!validStunShape(item.stun,version,validationTick))errors.push('Invalid melee or stun shape for schema.');
  if(!validShootingShape(item.shooting,version,validationTick))errors.push('Invalid shooting state for schema.');
  if(!validDraftShape(item.draft,version,input as unknown as World))errors.push('Invalid draft state for schema.');
  if(!validEquipmentShape(item,version))errors.push('Invalid equipment state for schema.');
  if(item.feed!==undefined&&!validFeedShape(item.feed,version,input as unknown as World))errors.push('Invalid feeding task shape.');
  if(item.tend!==undefined&&!validTendShape(item.tend,version,input as unknown as World))errors.push('Invalid tending shape for schema.');
  if(!validPawnSurgeryShape(item,version,input as unknown as World))errors.push('Invalid or future surgery shape for schema.');
  if(item.selfTend!==undefined&&(version<49||item.selfTend!==true))errors.push('Invalid self-tend policy for schema.');
  if(item.medicalCare!==undefined&&(version<51||!oneOf(item.medicalCare,['none','dry','herbal','industrial','best'])||item.careDisabled!==undefined))errors.push('Invalid medical care ceiling for schema.');
  if(item.careDisabled!==undefined&&(version<47||item.careDisabled!==true))errors.push('Invalid medical policy for schema.');
  if(record(item.need)&&item.need.medical!==undefined&&(version<47||item.need.kind!=='sleep'||!oneOf(item.need.medical,['patient','bedrest'])))errors.push('Invalid medical rest purpose for schema.');
  if(item.rescue!==undefined&&!validRescueShape(item.rescue,version))errors.push('Invalid rescue shape for schema.');
  if(item.medicalSleep!==undefined&&(version<45||item.medicalSleep!==true))errors.push('Invalid medical sleep marker for schema.');
  if(item.health!==undefined&&(version<45||validateMedicalRecord(item.health,version>=54,version>=59,version>=74,version>=75,false,false,version>=81,version>=84,version>=87,version>=88,version>=89,version,version>=127)))errors.push('Invalid medical record for schema.');
  if(!validTraits(item.traits,version))errors.push('Invalid pawn traits for schema.');
  if(version>=43 ? !validSkills(item.skills,validationTick,version) : item.skills!==undefined) errors.push('Invalid pawn skills for schema.');
  if(item.interruptedCargo!==undefined&&(version<44||item.interruptedCargo!==true))errors.push('Invalid interrupted cargo marker for schema.');
  if (typeof item.name !== 'string' || item.name.length === 0 || item.name.length > 80 || !bounded(item.hunger) || !bounded(item.rest) || !bounded(item.mood)
    || !oneOf(item.state, legacyV2 ? ['idle', 'moving', 'working', 'sleeping', 'hungry'] : ['idle', 'moving', 'working', 'sleeping', 'hungry', 'eating', ...(version>=15?['recreating']:[]),...(version>=45?['downed','dead']:[]),...(version>=47?['resting']:[])]) || !(item.jobId === null || integer(item.jobId, 1))
    || !record(item.priorities) || !integer(item.priorities.gather, 0, 4) || !integer(item.priorities.build, 0, 4) || !integer(item.priorities.haul, 0, 4) || (version >= 8 && !integer(item.priorities.grow, 0, 4))
    || !(version < 6 ? integer(item.moveCooldown, 0, 3) : typeof item.moveCooldown === 'number' && Number.isFinite(item.moveCooldown) && item.moveCooldown >= 0 && item.moveCooldown <= (version>=87?MAX_PAWN_DELAY_V87:version>=86?MAX_PAWN_DELAY_V86:version>=65?78:version>=59?49.5:version>=57?45:version>=45?38.146:version>=37?10.304:version>=22?8.443:version>=16?5.643:4.243)) || !integer(item.planCooldown, 0, 20)) errors.push('Invalid pawn state.');
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
    if(!record(m)||!record(m.from)||!record(m.to)||!coord(m.from)||!coord(m.to)||typeof m.start!=='number'||typeof m.end!=='number'||!Number.isFinite(m.start)||!Number.isFinite(m.end)||m.start<0||m.start>validationTick||m.to.x!==item.x||m.to.z!==item.z||Math.max(Math.abs((m.to.x as number)-(m.from.x as number)),Math.abs((m.to.z as number)-(m.from.z as number)))!==1) errors.push('Invalid travel segment.');
    else if(!validStunIntervals(m.stuns,version,m.start as number,validationTick)||!validSlowIntervals(m.stagger,version,m.start as number,validationTick)||(m.speedFactor!==undefined&&(version<37||typeof m.speedFactor!=='number'||!Number.isFinite(m.speedFactor)||m.speedFactor<(version>=87?MIN_PAWN_SPEED_V87:version>=86?MIN_PAWN_SPEED_V86:version>=65?.128*((4.6-.12)/4.6)/2:version>=63?.128*((4.6-.12)/4.6):version>=45?.128:.8)||m.speedFactor>1))||(m.terrainDelay!==undefined&&(version<16||(version<22?m.terrainDelay!==1.4:!(version>=31?[.2,1.4,3,4.2,5]:version>=28?[.2,1.4,3,4.2]:[1.4,3,4.2]).includes(m.terrainDelay as number))))||Math.abs(m.end-travelEnd(m as unknown as TravelSegment))>1e-7 || Math.abs((item.moveCooldown as number)-Math.max(0,m.end-validationTick))>1e-7) errors.push('Inconsistent travel duration.');
  }
  const haul = item.haul;
  if(record(haul)&&haul.whole!==undefined&&(version<26||haul.whole!==true||haul.quantity!==1||!record(haul.destination)||!['stockpile','aside'].includes(String(haul.destination.type))))errors.push('Invalid whole furniture haul shape.');
  if(record(haul)&&record(haul.destination)&&('growingZoneId' in haul.destination||'sowCell' in haul.destination)&&(version<20||!validSowingDestination(haul.destination,input as unknown as World)))errors.push('Invalid sowing clearance shape.');
  if(record(haul)&&haul.serviceProgress!==undefined&&(version<10||!record(haul.destination)||!(haul.destination.type==='fuel'||version>=193&&haul.destination.type==='turret')||haul.phase!=='deliver'||!integer(haul.serviceProgress,1,23)))errors.push('Invalid refuel interaction progress.');
  if(record(haul)&&record(haul.destination)&&haul.destination.forced!==undefined&&(version<19||!(haul.destination.type==='fuel'||version>=193&&haul.destination.type==='turret')||haul.destination.forced!==true))errors.push('Invalid forced refuel flag.');
  if(record(haul)&&record(haul.destination)&&haul.destination.forCooking!==undefined&&(haul.destination.type!=='fuel'||typeof haul.destination.forCooking!=='boolean'))errors.push('Invalid cooking refuel purpose.');
  if(record(haul)&&record(haul.destination)&&haul.destination.type==='turret'&&(version<193||Object.keys(haul.destination).some(k=>!['type','structureId','forced'].includes(k))))errors.push('Invalid turret service destination.');
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
    if (!bounded(item.comfort) || !Array.isArray(item.memories) || item.memories.length > (version >= 152 ? 3 : version >= 8 ? 2 : 1) || item.memories.some(memory => !record(memory) || !oneOf(memory.kind, version >= 154 ? ['ate-without-table', 'ate-raw-food', 'ate-fine-meal', 'ate-lavish-meal'] : version >= 152 ? ['ate-without-table', 'ate-raw-food', 'ate-fine-meal'] : version >= 8 ? ['ate-without-table', 'ate-raw-food'] : ['ate-without-table']) || !integer(memory.expiresAt, validationTick + 1, validationTick + TICKS_PER_DAY))) errors.push('Invalid comfort or meal memory.');
    else if (new Set(item.memories.map(memory => (memory as {kind:string}).kind)).size !== item.memories.length) errors.push('Duplicate meal memory.');
    else if (item.memories.some(memory => (memory as {kind:string}).kind === 'ate-fine-meal') && item.memories.some(memory => (memory as {kind:string}).kind === 'ate-lavish-meal')) errors.push('Conflicting meal memories.');
    if (record(item.need) && item.need.kind === 'eat') {
      const dining = item.need.dining;
      if (dining !== null && (!record(dining) || !record(dining.target) || !coord(dining.target) || !(dining.seatId === null || integer(dining.seatId, 1)) || !(dining.tableId === null || integer(dining.tableId, 1)))) errors.push('Invalid dining place.');
    }
  } else if (item.comfort !== undefined || item.memories !== undefined || (record(item.need) && item.need.dining !== undefined)) errors.push('Legacy save contains version 4 fields.');
  if (haul !== null) {
    if(record(haul)&&record(haul.destination)&&haul.destination.forHunting!==undefined&&!(version>=79&&haul.destination.type==='stockpile'&&haul.destination.forHunting===true))errors.push('Invalid hunting haul provenance.');
    if (record(haul) && haul.pickupCell!==undefined && (version<6 || haul.phase!=='deliver' || !record(haul.pickupCell) || !coord(haul.pickupCell))) errors.push('Invalid pickup facing cell.');
    if (!record(haul) || !integer(haul.sourcePileId, 1) || !integer(haul.quantity, 1, CARRY_CAPACITY) || !oneOf(haul.phase, ['pickup', 'deliver'])
      || !(haul.carryPileId === null || integer(haul.carryPileId, 1)) || !record(haul.destination)
      || !(haul.destination.type === 'job' ? integer(haul.destination.jobId, 1) : (haul.destination.type === 'fuel' && version>=10 ||haul.destination.type==='turret'&&version>=193) ? integer(haul.destination.structureId,1) : haul.destination.type === 'stockpile' ? integer(haul.destination.stockpileId, 1) : version >= 9 && haul.destination.type === 'aside' && coord(haul.destination))) errors.push('Invalid haul task.');
  }
  return errors;
}
