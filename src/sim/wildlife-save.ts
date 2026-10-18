import {validGeographicRenewal262} from './geographic-renewal-state-262.ts';
import {isCaveInsectSpecies256} from './cave-insect-constructor-256.ts';
import {validateHiveRuntimeOwners256} from './cave-hive-runtime-save-256.ts';
import {validHiveLordHeader256,validHiveInsectField256,validateCaveHiveOwners256} from './cave-hive-save-256.ts';
import {validStartingPetHeader256} from './starting-pet-state-256.ts';
import {validToxicBuildupTransport256} from './toxic-buildup-save-256.ts';
import {validAnimalMindFields256} from './animal-condition-mental-state-256.ts';
import {validArrivalRotation256} from './arrival-rotation-256.ts';
import {validAnimalAgeCoreRemainder256} from './initial-animal-age-owner-256.ts';
import {actualAnimalMeleeProfile256,actualAnimalProfile256} from './actual-animal-profile-256.ts';
import {CORE_ANIMAL_LIFE_STAGES_256} from './animal-core-data-v256.ts';
import {WEATHER} from './weather-definitions.ts';
import {validWildlifeProfileVersion256} from './geographic-fauna-profile-256.ts';
import {validDuckExitFlight256,validateDuckFlyers256} from './duck-flyer-save-256.ts';
import {validDuckFlightFields256} from './duck-flight-save-256.ts';
import {duckTerrainWalkable256} from './duck-water-256.ts';
import {animalMechanicalReadiness256} from './animal-readiness-v256.ts';
import {isAnimalSpecies256,animalCore256} from './animal-core-v256.ts';
import {validAnimalEggState256} from './animal-egg-save-v256.ts';
import {validAnimalClinicalOwner256} from './animal-clinical-age-v256.ts';
import {validRetainedCorpseDamage256} from './retained-corpse-damage-256.ts';
import { validCorpseRot } from './corpse-save.ts';
import { validStunShape } from './melee-save.ts';
import { validateMedicalRecord } from './injury-validation.ts';
import { validAnimalCarrierMotion } from './animal-rest-save.ts';
import { medicalStatus } from './injury-state.ts';
import { validStagger } from './stagger.ts';
import { travelEnd,validSlowIntervals,type TravelSegment } from './travel-timing.ts';
import type { World } from './types.ts';
import {validActorMapBedField256} from './actor-map-bed-256.ts';
import { MAX_WILDLIFE, type WildAnimal } from './wildlife-state.ts';
import { animalMealTarget } from './wildlife-food.ts';
import { animalNavigation } from './wildlife-navigation.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { animalSpecies,faunaBiome,isAnimalSpecies,isAnimalSpeciesInVersion } from './animal-species.ts';
import { adultAgeTicks, gestationTicks,animalNutritionMax } from './animal-life.ts';
import { validWildlifeManhunterState } from './animal-manhunter-save.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const finite=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const keys=(v:object,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
const capturedWeatherMoves256=Object.values(WEATHER).map(row=>row.movement);
const capturedWeatherMin256=Math.min(1,...capturedWeatherMoves256),capturedWeatherMax256=Math.max(1,...capturedWeatherMoves256);
/** Captured edge admission, never a recomputation from current health, weather,
 * intent or stage. Mobile Moving is rounded to hundredths and strictly >.15,
 * so its existing producer range is [.16,1]. The seven tracked originals use
 * Baby/Juvenile/Adult exactly as trackedAnimalLifeStage256; explicit species
 * use their own stage definitions. No animal, clock or RNG is modified. */
export function validWildlifeMotionTiming(tick:number,version:number,a:Pick<WildAnimal,'species'|'growthTracker'>,m:TravelSegment):boolean {
  if(Object.hasOwn(m,'animalFlight')&&(version<256||a.species!=='duck'||m.animalFlight!==true))return false;
  if(!finite(m.start,0,tick)||!finite(m.terrainDelay,0,50)
    ||!validSlowIntervals(m.stagger,version,m.start,tick)||!validSlowIntervals(m.stuns,version,m.start,tick))return false;
  let endLimit=tick+100;
  // Migrated, unmarked original seven have no persisted receipt identifying
  // the profile that captured their edge. Keep their historical envelope.
  if(version>=256&&(isAnimalSpecies256(a.species)||a.growthTracker)){
    if(m.animalFlight!==undefined&&(a.species!=='duck'||m.animalFlight!==true))return false;
    const profile=actualAnimalProfile256(a),stages:readonly (keyof typeof CORE_ANIMAL_LIFE_STAGES_256)[]=isAnimalSpecies256(a.species)
      ?animalCore256(a.species).lifeStages.map(row=>row.defId)
      :a.growthTracker?['AnimalBaby','AnimalJuvenile','AnimalAdult']:[];
    const factors=stages.length?stages.map(id=>(CORE_ANIMAL_LIFE_STAGES_256[id].statFactors as Readonly<Record<string,number>>).MoveSpeed??1):[1];
    const flight=m.animalFlight===true?animalCore256('duck').race.flightSpeedFactor:1;
    const minimum=3/(Math.max(profile.moveTicks,profile.walkTicks)/(.16*capturedWeatherMin256*Math.min(...factors))/flight);
    const maximum=3/(Math.min(profile.moveTicks,profile.walkTicks)/(capturedWeatherMax256*Math.max(...factors))/flight);
    if(!finite(m.speedFactor,minimum,maximum))return false;
    // Every admitted stagger/stun window ends by tick+9.5. After that frontier
    // the remaining cost cannot exceed one full diagonal edge plus the already
    // bounded captured terrain delay. Slow animals need no arbitrary +100 cap.
    endLimit=tick+9.5+3*Math.SQRT2/m.speedFactor!+50;
  }else if(!(version>=77?finite(m.speedFactor,version>=87?.096*.8:.096,3):[3,.6].includes(m.speedFactor!)))return false;
  return finite(m.end,0,endLimit)&&m.end>m.start&&Math.abs(m.end-travelEnd(m))<=1e-7;
}
/** Cheap transport/save check; no route search or mutable World reference. */
export function validAnimalExit(w:Pick<World,'width'|'height'|'tick'>,version:number,a:WildAnimal):boolean {
  const exit:unknown=a.exiting;
  if(exit===undefined)return true;
  if(version<174||!object(exit)||!keys(exit,['destination','nextFoodCheck'])
    ||!object(exit.destination)||!keys(exit.destination,['x','z'])
    ||!int(exit.destination.x,0,w.width-1)||!int(exit.destination.z,0,w.height-1)
    ||!(exit.destination.x===0||exit.destination.z===0||exit.destination.x===w.width-1||exit.destination.z===w.height-1)
    ||!int(exit.nextFoodCheck,0,Math.min(Number.MAX_SAFE_INTEGER,w.tick+100))
    ||a.food>0||a.domestic||a.meal||a.predation||a.burning||a.flee||a.threat||a.retaliation||a.strike||a.stun
    ||!['idle','moving','hungry'].includes(a.state)||!Array.isArray(a.path))return false;
  const last=a.path.at(-1);
  return !last||last.x===exit.destination.x&&last.z===exit.destination.z;
}
export function validWildlifeExitState(w:Pick<World,'width'|'height'|'tick'|'wildlife'>,version:number):boolean {
  const s=w.wildlife;
  return s===undefined||object(s)&&Array.isArray(s.animals)
    &&(s.exitedAnimals===undefined||version>=174&&int(s.exitedAnimals,1))
    &&s.animals.every(a=>object(a)&&validAnimalExit(w,version,a));
}
/** Snapshot boundary: identity and sparse intent only, no path flood. */
export function validWildlifePredationState(w:Pick<World,'tick'|'width'|'height'|'wildlife'|'piles'|'nextId'|'site'>,version:number):boolean {
  const s=w.wildlife;if(!s)return true;
  if(!object(s)||!validGeographicRenewal262(w,version)||!validWildlifeProfileVersion256(w,version,s)||!Array.isArray(s.animals)||validateDuckFlyers256(w,version).length||version<178&&s.profile==='biome-fauna-v2')return false;
  return s.animals.every(a=>{
    if(!object(a)||!validAnimalMindFields256(a,version,w.tick,w.width,w.height)||!validArrivalRotation256(a,version)||!validAnimalAgeCoreRemainder256(a,version,w.tick)||!validActorMapBedField256(a,version,w.nextId)||!validRetainedCorpseDamage256(a,version)||!isAnimalSpeciesInVersion(a.species,version)||version<178&&a.species==='red-fox')return false;
    if(!validDuckExitFlight256(a,version,w.tick)||!validDuckFlightFields256(a,version,w.tick)||!validAnimalEggState256(a,version,w)||a.health&&Object.hasOwn(a.health,'animalBirthTick')&&!isAnimalSpecies256(a.species)&&!a.growthTracker)return false;
    if(isAnimalSpecies256(a.species)&&!animalMechanicalReadiness256(a.species).ok||(isAnimalSpecies256(a.species)||a.growthTracker)&&!int(a.ageTicks)||a.health&&(!validAnimalClinicalOwner256(a.health,a.species,a.ageTicks,w.tick)||!!validateMedicalRecord(a.health,true,true,false,false,true,true,true,true,true,true,true,version)))return false;
    const hunt:unknown=a.predation;if(hunt===undefined)return true;
    return version>=178&&isAnimalSpecies(a.species)&&animalSpecies(a.species).predator===true&&object(hunt)
      &&keys(hunt,['targetId','startedAtCore','firstHit'])&&int(hunt.targetId,1,w.nextId-1)&&hunt.targetId!==a.id
      &&int(hunt.startedAtCore,0,w.tick*10)&&typeof hunt.firstHit==='boolean'
      &&!a.domestic&&!a.meal&&!a.exiting&&!a.flee&&!a.burning&&['idle','moving'].includes(a.state)
      &&(s.animals.some(other=>other.id===hunt.targetId)||w.piles.some(p=>p.corpse?.animalId===hunt.targetId));
  });
}
export function validateWildlife(w:World,version:number,ids:Set<number>):string[] {
  const s=w.wildlife;if(s===undefined)return [];
  const errors:string[]=[];
  if(!validHiveLordHeader256(s,version,w.nextId,w.tick))return ['Invalid or future insect Lord header'];
  if(!validWildlifePredationState(w,version))errors.push('Invalid wildlife predation state.');
  if(!validWildlifeManhunterState(w,version))errors.push('Invalid wildlife manhunter state.');
  if(!validWildlifeExitState(w,version))errors.push('Invalid wildlife exit state.');
  if(version<76||!object(s)||!validWildlifeProfileVersion256(w,version,s)
    ||!keys(s,['profile','rng','animals','eatenPlants','eatenNutrition','eatenItems',...(version>=174?['exitedAnimals']:[]),...(version>=256?['flyers','hiveLords']:[]),...((Number(version)===262||Number(version)===263)?['geographicRenewal262']:[]),...(['biome-herbivores-v1','biome-fauna-v2'].includes(s.profile)?['population']:[])])
    ||!int(s.rng,1,0xffffffff)||!Array.isArray(s.animals)||s.animals.length>MAX_WILDLIFE||!int(s.eatenPlants)||!int(s.eatenItems)||!finite(s.eatenNutrition,0,Number.MAX_SAFE_INTEGER))return ['Invalid wildlife state.'];
  if(['biome-herbivores-v1','biome-fauna-v2'].includes(s.profile)){
    const p=s.population;if(!object(p)||!keys(p,['biome','fullTargetWeight','targetWeight','nextCheck','checks','arrivals'])||!['temperate-forest','boreal-forest','arid-shrubland','tundra'].includes(String(p.biome)))return ['Invalid wildlife population state.'];
    if(w.site?.biome==='tundra'&&(version<239||p.biome!=='tundra'))return ['Invalid tundra wildlife habitat.'];
    const biome=faunaBiome(p.biome as Parameters<typeof faunaBiome>[0],s.profile==='biome-fauna-v2'),full=w.width*w.height*biome.animalDensity/10000,implemented=biome.entries.reduce((n,e)=>n+e.commonality,0),target=full*implemented/biome.totalCommonality;
    if(p.fullTargetWeight!==full||p.targetWeight!==target||!int(p.nextCheck,w.tick+1,w.tick+122)||!int(p.checks)||!int(p.arrivals,0,p.checks))return ['Invalid wildlife population state.'];
  } else if(s.population!==undefined)return ['Invalid wildlife population state.'];
  if(s.animals.some(a=>!object(a)))return ['Invalid wild animal.'];
  const matingFemales=new Set<number>();
  let navigation:ReturnType<typeof animalNavigation>|undefined,hareNavigation:ReturnType<typeof animalNavigation>|undefined;
  const cell=(c:unknown):c is {x:number;z:number}=>object(c)&&keys(c,['x','z'])&&int(c.x,0,w.width-1)&&int(c.z,0,w.height-1);
  for(const a of s.animals) {
    if(!object(a)||!validStartingPetHeader256(a,version)||!keys(a,['id','species','sex','x','z','food','rest','state','path','motion','nextDecision','meal',...(version>=77?['health','flee','stagger','sleepUntilCore']:[]),...(version>=78?['threat','retaliation','strike','stun']:[]),...(version>=79?['corpseRot']:[]),...(version>=87?['burning']:[]),...(version>=106?['domestic','taming']:[]),...(version>=121?['ageTicks','parents','pregnancy','mating']:[]),...(version>=174?['exiting']:[]),...(version>=178?['predation']:[]),...(version>=183?['manhunter']:[]),...(version>=221?['animalRest']:[]),...(version>=256?['eggLayer','eggLay','corpseDamage','mapBed','caravanCarrySick','flight','exitFlight','ageCoreRemainder','growthTracker','arrivalRotation','wander','confusion','hive','hiveThink','hiveJob','startingPet']:[])])||!int(a.id,1,w.nextId-1)||!int(a.x,0,w.width-1)||!int(a.z,0,w.height-1)||!isAnimalSpeciesInVersion(a.species,version)||version<178&&a.species==='red-fox'||(version<91||version<256&&s.profile==='temperate-hares-v1')&&a.species!=='hare'||version<256&&['biome-herbivores-v1','biome-fauna-v2'].includes(s.profile)&&!faunaBiome(s.population!.biome,s.profile==='biome-fauna-v2').entries.some(e=>e.species===a.species)&&!(version>=119&&!!a.domestic)||!['female','male'].includes(a.sex)||!validAnimalAgeCoreRemainder256(a,version,w.tick)||!validAnimalMindFields256(a,version,w.tick,w.width,w.height)||!finite(a.food,0,a.growthTracker?animalNutritionMax(a):animalSpecies(a.species).nutrition)||!finite(a.rest,0,1)||!['idle','moving','eating','sleeping','hungry',...(version>=77?['downed','dead']:[])].includes(a.state)||!int(a.nextDecision,0,w.tick+100)||!Array.isArray(a.path)||a.path.length>w.width*w.height||!a.path.every(cell)){errors.push('Invalid wild animal.');continue;}
    if(!validHiveInsectField256(a,version,w.nextId))errors.push('Invalid or future insect membership');
    if(!validDuckExitFlight256(a,version,w.tick))errors.push('Invalid or future Duck exit wait.');
    if(!validDuckFlightFields256(a,version,w.tick))errors.push('Invalid or future Duck flight tracker.');
    if(!validAnimalEggState256(a,version,w))errors.push('Invalid or future animal egg state.');
    if(version>=121){
      if(!int(a.ageTicks))errors.push('Invalid animal age.');
      const parents:unknown=a.parents;
      if(parents!==undefined&&(!object(parents)||!keys(parents,['motherId','fatherId'])
        ||!int(parents.motherId,1,a.id-1)||!int(parents.fatherId,1,a.id-1)||parents.motherId===parents.fatherId))errors.push('Invalid animal parentage.');
      const pregnancy:unknown=a.pregnancy;
      if(pregnancy!==undefined){
        const father=object(pregnancy)&&int(pregnancy.fatherId,1,w.nextId-1)
          ?s.animals.find(other=>other.id===pregnancy.fatherId):undefined;
        if(!object(pregnancy)||!keys(pregnancy,['fatherId','progress'])
          ||!int(pregnancy.fatherId,1,w.nextId-1)||pregnancy.fatherId===a.id
          ||!int(pregnancy.progress,0,gestationTicks(a.species))
          ||a.sex!=='female'||!int(a.ageTicks,adultAgeTicks(a.species))||version<256&&a.state==='dead'
          ||father&&(father.species!==a.species||father.sex!=='male'||!isAnimalSpecies(father.species)||!int(father.ageTicks,adultAgeTicks(father.species))))errors.push('Invalid animal pregnancy.');
      }
      const mating:unknown=a.mating;
      if(mating!==undefined){
        const female=object(mating)&&int(mating.femaleId,1,w.nextId-1)
          ?s.animals.find(other=>other.id===mating.femaleId):undefined;
        if(!object(mating)||!keys(mating,['femaleId','progress'])
          ||!int(mating.femaleId,1,w.nextId-1)||!int(mating.progress,0,49)
          ||a.sex!=='male'||!a.domestic||a.state==='dead'||!int(a.ageTicks,adultAgeTicks(a.species))
          ||!female||female.species!==a.species||female.sex!=='female'||!female.domestic
          ||female.state==='dead'||female.pregnancy!==undefined||!int(female.ageTicks,adultAgeTicks(a.species))
          ||matingFemales.has(Number(mating.femaleId)))errors.push('Invalid animal mating.');
        else matingFemales.add(Number(mating.femaleId));
      }
    }
    const hunt:unknown=a.predation;
    if(hunt!==undefined&&(!object(hunt)||!keys(hunt,['targetId','startedAtCore','firstHit'])
      ||version<178||!animalSpecies(a.species).predator||a.domestic||a.meal||a.exiting||a.flee||a.burning
      ||!['idle','moving'].includes(a.state)||!int(hunt.targetId,1,w.nextId-1)||hunt.targetId===a.id
      ||!int(hunt.startedAtCore,0,w.tick*10)||typeof hunt.firstHit!=='boolean'
      ||!s.animals.some(other=>other.id===hunt.targetId)&&!w.piles.some(p=>p.corpse?.animalId===hunt.targetId)))errors.push('Invalid animal predation.');
    if(Object.hasOwn(a,'caravanCarrySick')&&(version<256||typeof a.caravanCarrySick!=='boolean'))errors.push('Invalid animal caravan carry preference.');
    if(a.corpseRot!==undefined&&(version<79||a.state!=='dead'||!a.health?.death||!validCorpseRot(a.corpseRot,w.tick,a.health.death.tick,a.health)))errors.push('Invalid retained animal corpse age.');
    if(ids.has(a.id))errors.push('Duplicate wildlife identity.');ids.add(a.id);
    if((['water','rock'].includes(w.tiles[a.z*w.width+a.x]!.terrain)||version>=256&&!duckTerrainWalkable256(w,a,w.tiles[a.z*w.width+a.x]!.terrain)&&!(a.species==='duck'&&a.motion?.animalFlight===true&&w.tiles[a.z*w.width+a.x]!.terrain==='water-deep'))||w.structures.some(s=>(s.kind==='wall'||s.kind==='cooler')&&s.x===a.x&&s.z===a.z))errors.push('Wildlife inside solid terrain.');
    if(!validToxicBuildupTransport256(a,version,w.tick,w))errors.push('Invalid actual animal toxic clinical owner');
    if(a.health!==undefined){
      if(validateMedicalRecord(a.health,true,true,false,false,true,version>=79,version>=81,version>=84,version>=87,version>=88,version>=89,version)||a.health.body!==a.species){errors.push('Invalid animal medical record.');continue;}
      if(!validAnimalClinicalOwner256(a.health,a.species,a.ageTicks,w.tick))errors.push('Invalid animal clinical age owner.');
      if(a.health.death?a.health.tick>w.tick:a.health.tick!==w.tick)errors.push('Invalid animal medical clock.');
      const status=medicalStatus(a.health);if(status==='mobile'?a.state==='dead'||a.state==='downed':a.state!==status)errors.push('Invalid animal medical state.');
    } else if(a.state==='dead'||a.state==='downed')errors.push('Animal stopped without health record.');
    if((a.state==='dead'||a.state==='downed')&&(a.path.length||a.meal||a.predation||a.manhunter&&!a.manhunter.permanent261||a.flee||a.threat||a.retaliation||a.strike||a.stun))errors.push('Incapacitated animal retains activity.');
    if(!validStagger(a.stagger,version,w.tick)||a.sleepUntilCore!==undefined&&!int(a.sleepUntilCore,w.tick*10+1,w.tick*10+1000))errors.push('Invalid animal impact delay.');
    if(a.flee!==undefined&&(!object(a.flee)||!keys(a.flee,['danger','until'])||!cell(a.flee.danger)||!int(a.flee.until,w.tick+1,w.tick+600)||a.meal||!['idle','moving'].includes(a.state)))errors.push('Invalid animal flight.');
    if(!validStunShape(a.stun,version,w.tick,version>=178?420:45))errors.push('Invalid animal stun.');
    if(a.threat!==undefined&&(!object(a.threat)||!keys(a.threat,['targetId','harmedAtCore'])||!int(a.threat.harmedAtCore,Math.max(0,w.tick*10-400),w.tick*10)||!w.pawns.some(p=>p.id===a.threat!.targetId)&&!(version>=178&&s.animals.some(other=>other.id===a.threat!.targetId&&other.id!==a.id))||a.meal||a.flee||!['idle','moving'].includes(a.state)))errors.push('Invalid animal melee threat.');
    if(a.retaliation!==undefined&&(!object(a.retaliation)||!keys(a.retaliation,['targetId','untilCore'])||!a.threat||a.retaliation.targetId!==a.threat.targetId||!int(a.retaliation.untilCore,w.tick*10+1,w.tick*10+200)||a.strike))errors.push('Invalid animal retaliation job.');
    if(a.strike!==undefined&&(!object(a.strike)||!keys(a.strike,['targetId','atCore','untilCore','tool','outcome',...(version>=183?['structure']:[])])||a.strike.structure!==undefined&&(version<183||!cell(a.strike.structure)||a.strike.outcome!=='hit')||!(int(a.strike.targetId,1)||version>=256&&a.strike.targetId===null&&(a.strike.structure===undefined||version>=256&&isCaveInsectSpecies256(a.species)&&!!a.hive))||!int(a.strike.atCore,0,w.tick*10)||!int(a.strike.untilCore,w.tick*10+1)||!['hit','miss','dodge'].includes(String(a.strike.outcome))||!actualAnimalMeleeProfile256(a).some(t=>t.id===a.strike!.tool&&a.strike!.untilCore-a.strike!.atCore===t.cooldownCore)||!(version>=256&&a.strike.targetId===null)&&!a.strike.structure&&!w.pawns.some(p=>p.id===a.strike!.targetId)&&!w.raids?.departed.some(d=>d.pawnId===a.strike!.targetId)&&!(version>=256&&a.hive&&w.mechanoids?.some(m=>m.id===a.strike!.targetId))&&!(version>=178&&(s.animals.some(other=>other.id===a.strike!.targetId&&other.id!==a.id)||w.piles.some(p=>p.corpse?.animalId===a.strike!.targetId)))||a.meal||a.path.length||(a.motion?.end??0)>w.tick||!(version>=183?['idle','sleeping']:['idle']).includes(a.state)))errors.push('Invalid animal melee recovery.');
    const m=a.motion;
    if(m!==undefined&&!validAnimalCarrierMotion(w,a,version)) {
      if(!object(m)||!keys(m,['from','to','start','end','speedFactor','terrainDelay',...(version>=77?['stagger']:[]),...(version>=78?['stuns']:[]),...(version>=239?['snowEntryPending']:[]),...(version>=256?['animalFlight']:[])])||!cell(m.from)||!cell(m.to)||Math.max(Math.abs(m.from.x-m.to.x),Math.abs(m.from.z-m.to.z))!==1||m.to.x!==a.x||m.to.z!==a.z||!validWildlifeMotionTiming(w.tick,version,a,m))errors.push('Invalid wildlife motion.');
      else if(m.end>w.tick){
        if(!['moving','downed','dead'].includes(a.state))errors.push('Active wildlife edge without movement.');
        const pathNavigation=version>=256&&a.species==='duck'?animalNavigation(w,false,true,a,m.animalFlight===true):a.species==='hare'||a.species==='snow-hare'||animalSpecies(a.species).predator
          ?(hareNavigation??=animalNavigation(w,false,true)):(navigation??=animalNavigation(w));
        if(!pathNavigation.step(m.from,m.to))errors.push('Wildlife edge crosses a solid obstacle.');
      }
    }
    let previous={x:a.x,z:a.z};for(const c of a.path){if(Math.max(Math.abs(c.x-previous.x),Math.abs(c.z-previous.z))!==1)errors.push('Disconnected wildlife path.');previous=c;}
    if(a.meal!==undefined) {
      const m=a.meal;
      const species=animalSpecies(a.species);
      if(!object(m)||!keys(m,['kind','id','quantity','progress'])||!['plant','pile'].includes(m.kind)||!int(m.id,1,w.nextId-1)||!int(m.quantity,1,75)||m.kind==='plant'&&m.quantity!==1||!(version>=77?finite(m.progress,0,species.ingestTicks)&&m.progress<species.ingestTicks:int(m.progress,0,species.ingestTicks-1))||!['moving','eating'].includes(a.state)){errors.push('Invalid wildlife meal.');continue;}
      const target=animalMealTarget(w,a);
      if(a.state==='moving'&&m.progress!==0)errors.push('Animal chewed during travel.');
      const pile=m.kind==='pile'?w.piles.find(p=>p.id===m.id):undefined;
      if(pile&&!pile.corpse&&m.quantity>Math.max(1,Math.ceil(species.nutrition/(ITEM_DEFINITIONS[pile.item].nutrition/100))))errors.push('Oversized wildlife meal.');
      if(!target)errors.push('Missing or overreserved wildlife food.');
      else if(a.state==='eating'&&(a.path.length||Math.abs(a.x-target.x)+Math.abs(a.z-target.z)>1))errors.push('Remote animal ingestion.');
    } else if(a.state==='eating')errors.push('Animal eating without food.');
    if(a.state==='sleeping'&&a.path.length)errors.push('Sleeping animal with route.');
  }
  errors.push(...validateDuckFlyers256(w,version,ids));
  errors.push(...validateCaveHiveOwners256(w,version),...validateHiveRuntimeOwners256(w));
  return errors;
}
