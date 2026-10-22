import {HUMAN_YEAR_TICKS} from './human-age.ts';
import {nativeHumanBiologicalCore256,type NativeHumanIdentity256} from './native-human-identity-256.ts';

export const COUPLE_CORE_HOUR285=2500;
export interface CoupleAgeOwner285 {
 readonly age?:{readonly biologicalTicks:number};
 readonly nativeHuman?:NativeHumanIdentity256;
}
export interface CoupleMtbPerson285 {
 readonly ageYears:number;
 readonly pain:number;
 readonly consciousness:number;
 /** Opinion of, and attraction towards, the other actual participant. */
 readonly opinion:number;
 readonly attraction:number;
}
const finite=(n:number)=>Number.isFinite(n);
const adult=(years:number)=>finite(years)&&years>=18;

/** Biological age belongs to this person. A present invalid native header
 * cannot fall back to the rounded historical age; absence never becomes30. */
export function coupleBiologicalYears285(owner:CoupleAgeOwner285):number|undefined {
 try{
  if('nativeHuman'in owner)return nativeHumanBiologicalCore256(owner)/(HUMAN_YEAR_TICKS*10);
  const ticks=owner.age?.biologicalTicks;
  return ticks!==undefined&&Number.isSafeInteger(ticks)&&ticks>=0&&Number.isSafeInteger(ticks*10)?ticks/HUMAN_YEAR_TICKS:undefined;
 }catch{return undefined;}
}
export function coupleAdult285(owner:CoupleAgeOwner285):boolean {
 const years=coupleBiologicalYears285(owner);return years!==undefined&&adult(years);
}

/** Mathematical native factor, independent of admission. Values below18
 * are useful to identify the primary curve, but never admit an activity.
 * Pain1 or consciousness0 has an infinite delay, hence zero opportunity. */
export function coupleIndividualFactor285(ageYears:number,pain:number,consciousness:number):number|undefined {
 if(!finite(ageYears)||ageYears<0||!finite(pain)||pain<0||pain>1||!finite(consciousness)||consciousness<0)return;
 const ageFactor=ageYears<14?0:ageYears<16?(ageYears-14)/2:ageYears<25?1:ageYears<80?1-(ageYears-25)*.8/55:.2;
 let factor=1/(1-pain);
 if(consciousness<.5)factor/=consciousness*2;
 return factor/ageFactor;
}

/** Frequency only: the real owner must separately admit both living, awake-
 * capable, nonstarving, nonbleeding partners in their actual shared bed.
 * No sex, orientation, beauty, manipulation or medical state is invented. */
export function coupleMtbHours285(first:CoupleMtbPerson285,second:CoupleMtbPerson285):number|undefined {
 if(!adult(first.ageYears)||!adult(second.ageYears))return;
 const valid=(p:CoupleMtbPerson285)=>finite(p.opinion)&&p.opinion>=-100&&p.opinion<=100&&finite(p.attraction)&&p.attraction>=0;
 if(!valid(first)||!valid(second))return;
 const a=coupleIndividualFactor285(first.ageYears,first.pain,first.consciousness),b=coupleIndividualFactor285(second.ageYears,second.pain,second.consciousness);
 if(a===undefined||b===undefined)return;
 // Preserve the order of the two native participant factors and opinions.
 let hours=12;hours*=a;hours*=b;
 hours/=Math.max(first.attraction,.1);hours/=Math.max(second.attraction,.1);
 hours*=1.3+(first.opinion+100)/200*(.7-1.3);
 hours*=1.3+(second.opinion+100)/200*(.7-1.3);
 return Number.isNaN(hours)?undefined:hours;
}

/** One2500-Core-tick check. Native MTB is linear duration/(MTB*unit),
 * capped by the random comparison, rather than a Poisson exponential.
 * This returns a probability only; the caller owns cadence and random draws. */
export function coupleHourlyChance285(mtbHours:number):number {
 return mtbHours>0?Math.min(1,1/mtbHours):0;
}

/** Caller supplies the existing uniform draw; this function consumes no RNG.
 * Closed endpoints describe the native float range's limiting values. */
export function coupleDurationCore285(uniform:number):number|undefined {
 if(!finite(uniform)||uniform<0||uniform>1)return;
 return Math.trunc(COUPLE_CORE_HOUR285*(.1+uniform));
}

const cooldownAges=Object.freeze([18,22,30,50,75]);
const cooldownHours=Object.freeze([1.5,1.5,4,12,36]);
export function coupleCooldownMeanHours285(ageYears:number):number|undefined {
 if(!adult(ageYears))return;
 for(let i=1;i<cooldownAges.length;i++)if(ageYears<cooldownAges[i]!){
  const before=cooldownAges[i-1]!,after=cooldownAges[i]!;
  return cooldownHours[i-1]!+(cooldownHours[i]!-cooldownHours[i-1]!)*(ageYears-before)/(after-before);
 }
 return cooldownHours[cooldownHours.length-1]!;
}
/** Independent personal minimum delay: age mean +0.3h times an explicitly
 * supplied standard normal, bounded below by0.5h, truncated in Core ticks.
 * It is not the initial MTB, and contains no hidden PRNG or DLC multiplier. */
export function coupleCooldownCore285(ageYears:number,standardNormal:number):number|undefined {
 const mean=coupleCooldownMeanHours285(ageYears);if(mean===undefined||!finite(standardNormal))return;
 const ticks=Math.trunc(Math.max(.5,mean+.3*standardNormal)*COUPLE_CORE_HOUR285);
 return Number.isSafeInteger(ticks)?ticks:undefined;
}
