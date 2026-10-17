import {animalSpecies,type AnimalSpeciesProfile,type AnimalSpeciesId} from './animal-species.ts';
import {animalMeleeProfiles256} from './animal-melee-profiles-256.ts';
import {NATIVE_SEVEN_PROFILE_DATA_256} from './native-seven-profile-data-256.ts';
import {isAnimalSpecies256,animalLifeStageData256} from './animal-core-v256.ts';
import {trackedAnimalLifeStage256} from './animal-growth-runtime-256.ts';
import type {WildAnimal} from './wildlife-state.ts';
type OriginalProfileOwner256=Pick<WildAnimal,'species'|'growthTracker'>;
type NativeSevenId=keyof typeof NATIVE_SEVEN_PROFILE_DATA_256;
const meatOwners:Readonly<Record<string,AnimalSpeciesId>>={Hare:'hare',Snowhare:'snow-hare',Deer:'deer',Muffalo:'muffalo',Gazelle:'gazelle',Dromedary:'dromedary',Fox_Red:'red-fox',Fox_Fennec:'fennec-fox'};
const leathers:Readonly<Record<string,AnimalSpeciesProfile['leatherItem']>>={Leather_Light:'light-leather',Leather_Plain:'plainleather',Leather_Bluefur:'bluefur',Leather_Camel:'camelhide',Leather_Fox:'foxfur'};
const range=(value:string):readonly [number,number]=>{const pair=value.split('~').map(Number);return [pair[0]!,pair[1]??pair[0]!];};
// A single immutable seven-profile table. No anatomical/body/clinical cache.
const profiles:Readonly<Record<NativeSevenId,AnimalSpeciesProfile>>=Object.freeze(Object.fromEntries((Object.keys(NATIVE_SEVEN_PROFILE_DATA_256) as NativeSevenId[]).map(id=>{
 const f=NATIVE_SEVEN_PROFILE_DATA_256[id],legacy=animalSpecies(id),meat=meatOwners[f.meatFrom],leather=leathers[f.leatherDef];
 if(!meat||leather===undefined)throw Error('Unbound native seven product identity');
 const profile:AnimalSpeciesProfile={id,label:legacy.label,bodyTemplate:f.body,bodySize:f.baseBodySize,healthScale:f.baseHealthScale,combatPower:f.combatPower,...f.predator?{predator:true,maxPreySize:f.maxPreyBodySize}:{},nutrition:f.maxNutrition*f.baseBodySize,foodPerDay:f.baseHungerRate*1.6,moveTicks:6/f.moveSpeed,walkTicks:30/f.moveSpeed,ingestTicks:50,ecoSystemWeight:f.ecoSystemWeight,wildGroupSize:range(f.wildGroupSize),corpseItem:`${id}-corpse`,meatItem:`${meat}-meat` as AnimalSpeciesProfile['meatItem'],leatherItem:leather,rawMeat:f.meatAmount*f.baseBodySize,rawLeather:f.leatherAmount*f.baseBodySize,melee:animalMeleeProfiles256(f.body,f.tools)};
 return [id,Object.freeze(profile)];
})) as Record<NativeSevenId,AnimalSpeciesProfile>);
/** Admitted ORIGINAL actor/corpse only. A species string is never provenance.
 * Unmarked records and the existing39 keep their literal profile reference. */
export function actualAnimalProfile256(original:OriginalProfileOwner256):AnimalSpeciesProfile {
 return original.growthTracker&&Object.hasOwn(profiles,original.species)?profiles[original.species as NativeSevenId]:animalSpecies(original.species);
}
export const actualAnimalMeleeProfile256=(original:OriginalProfileOwner256)=>actualAnimalProfile256(original).melee;
export function actualAnimalMeleeDamageFactor256(original:Pick<WildAnimal,'species'|'growthTracker'|'ageTicks'>):number {
 return original.growthTracker?trackedAnimalLifeStage256(original.species,original.growthTracker).meleeDamageFactor:isAnimalSpecies256(original.species)?animalLifeStageData256(original.species,original.ageTicks).meleeDamageFactor:1;
}
/** Extra exact native7 stats, for named consumers with an original witness. */
export function actualNativeSevenFacts256(original:OriginalProfileOwner256){
 return original.growthTracker&&Object.hasOwn(NATIVE_SEVEN_PROFILE_DATA_256,original.species)?NATIVE_SEVEN_PROFILE_DATA_256[original.species as NativeSevenId]:undefined;
}

/** Real stage modifier read only when a tracked original or the admitted new
 * species carries that stage; unmarked original seven retain factor1. */
export function actualAnimalMoveSpeedFactor256(original:Pick<WildAnimal,'species'|'growthTracker'|'ageTicks'>):number {
 const stage=original.growthTracker?trackedAnimalLifeStage256(original.species,original.growthTracker):isAnimalSpecies256(original.species)?animalLifeStageData256(original.species,original.ageTicks):undefined;
 return stage?(stage.statFactors as Readonly<Record<string,number>>).MoveSpeed??1:1;
}
