import {groupPawnInterval256} from './group-core-cadence-256.ts';
import {animalConditionMtbEvent256} from './animal-age-condition-runtime-256.ts';
import {animalClinicalRandom256} from './animal-condition-medical-frontier-256.ts';
import {tryApplyAnimalAgeCondition256} from './animal-birthday-application-256.ts';
import {alcoholStage265,alcoholWithdrawal265} from './alcohol-rules-265.ts';
import {partMissing,reconcileMedicalDeath} from './injury-state.ts';
import type {MedicalRecord,MedicalRandom} from './injury-types.ts';
import type {AlcoholState265} from './alcohol-state-265.ts';
const f=Math.fround;
export interface AlcoholOwner265 {id:number;spawned:boolean;awake:boolean;inMentalState?:boolean;chemicalNeedFrozen?:boolean}
const factor=(tolerance:number)=>f(1-f(f(.75)*tolerance));
const addictionMultiplier=(t:number):number=>t<=f(.5)?1+t*8:t<=f(.8)?5+(t-.5)/.3*10:15;
/** Exactly one real unit has already left its holder. No policy preview or
 * reservation can call this physiological producer. The stream is the owner. */
export function ingestAlcoholDose265(record:MedicalRecord,bodySize:number,worldTick:number,random:MedicalRandom):AlcoholState265 {
 if(record.body!==undefined||record.death||!Number.isFinite(bodySize)||bodySize<=0||!Number.isSafeInteger(worldTick)||worldTick!==record.tick)throw Error('Beer requires its actual living human clinical owner');
 const a=record.alcohol??{bornAt:record.tick,high:0,tolerance:0,hangover:0,lastDoseTick:worldTick,dosesToday:0},old=f(a.tolerance),effect=factor(old);
 if(a.addiction)a.addiction.severity=Math.min(1,f(a.addiction.severity+f(.2)));
 else {
  // CompDrug tests its random chance before minToleranceToAddict.
  const roll=random();if(roll<f(.01)*addictionMultiplier(old)&&old>=f(.25))a.addiction={severity:f(.5),need:f(f(.8)+f(random()*f(.2)))};
 }
 if(a.addiction)a.addiction.need=Math.min(1,f(a.addiction.need+f(f(f(.9)*effect)/f(bodySize))));
 a.high=Math.min(3.4028234663852886e38,f(a.high+f(f(.15)*effect)));
 a.tolerance=Math.min(1,f(a.tolerance+f(f(f(.016)*effect)/f(bodySize))));
 a.dosesToday=Math.floor(a.lastDoseTick/6000)===Math.floor(worldTick/6000)?a.dosesToday+1:1;
 a.lastDoseTick=worldTick;record.alcohol=a;reconcileMedicalDeath(record);return a;
}
const curve=(t:number,middle:number,last:number):number=>t<=.5?99999+(middle-99999)*(t-.45)/.05:middle+(last-middle)*(Math.min(1,t)-.5)/.5;
/** One completed unsuspended Core tick on the medical record's true clock.
 * Trials retain the existing shared MTB implementation and hashed cadences. */
export function advanceAlcoholCore265(record:MedicalRecord,atCore:number,owner:AlcoholOwner265,draw:MedicalRandom):void {
 const a=record.alcohol;if(!a||record.death)return;
 if(!Number.isSafeInteger(atCore)||atCore<1||atCore>record.tick*10||atCore<=(record.tick-1)*10)throw Error('Alcohol interval is outside the actual clinical clock');
 const hash=(interval:number)=>groupPawnInterval256(owner.id,atCore,interval,1),random=animalClinicalRandom256(draw),stage=alcoholStage265(a);
 if(hash(60)){
  if(a.tolerance>f(.45)){
   if(animalConditionMtbEvent256(curve(a.tolerance,60,45),60,random)&&!partMissing(record,'liver')&&!a.cirrhosis){random.value();a.cirrhosis=true;}
   if(animalConditionMtbEvent256(curve(a.tolerance,180,150),60,random))tryApplyAnimalAgeCondition256(record,'Carcinoma',random,undefined,['liver']);
  }
  if(stage===4&&animalConditionMtbEvent256(10,60,random)&&!partMissing(record,'brain')&&!a.brainDamage){random.value();a.brainDamage=true;}
  // Off-map owners consume their actual trial but cannot own a map crisis job.
  if(alcoholWithdrawal265(a)&&!owner.inMentalState&&animalConditionMtbEvent256(40,60,random)&&owner.spawned&&owner.awake)a.bingeRequestedAt=atCore;
 }
 if(hash(600)){
  const highMtb=stage===2?.75:stage===3?.2:0;
  if(highMtb&&animalConditionMtbEvent256(highMtb,600,random)&&owner.spawned&&owner.awake)a.vomitRequestedAt=atCore;
  if(a.hangover>=f(.4)&&animalConditionMtbEvent256(.4,600,random)&&owner.spawned&&owner.awake)a.vomitRequestedAt=atCore;
 }
 if(hash(200)){
  a.high=Math.max(0,f(a.high+f(f(-.75)*f(.0033333334))));
  a.tolerance=Math.max(0,f(a.tolerance+f(f(-.016)*f(.0033333334))));
  a.hangover=Math.max(0,f(a.hangover+f(f(-1)*f(.0033333334))));
  if(a.addiction){a.addiction.severity=Math.max(0,f(a.addiction.severity+f(f(-.0333)*f(.0033333334))));if(a.addiction.severity===0)delete a.addiction;}
 }
 if(a.addiction&&!owner.chemicalNeedFrozen&&hash(150))a.addiction.need=Math.max(0,f(a.addiction.need-f(f(.5)*f(.0025))));
 // Alcohol's override runs after the base hediff, including severity comps.
 if(alcoholStage265(a)>=3&&hash(300))a.hangover=1;
}
