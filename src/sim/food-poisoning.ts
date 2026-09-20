import type { ItemId } from './items.ts';
import type { Cell } from './types.ts';

export type FoodContaminationCause='filthy-kitchen'|'incompetent-cook'|'unknown';
export type FoodPoisonCause=FoodContaminationCause|'dangerous-food';
/** A stack has a probability, not a hidden integer count of toxic portions. */
export interface FoodContamination {fraction:number;cause:FoodContaminationCause}
export interface VomitState {remainingCore:number;cell:Cell}
export interface FoodPoisoningState {
  /** 300000 is full severity; a 200-Core pulse removes exactly 1000. */
  severity:number;bornAt:number;cause:FoodPoisonCause;item:ItemId;
  /** May outlive the last severity pulse, until this physical episode ends. */
  vomit?:VomitState;
}
export type FoodPoisonRandom=()=>number;
export const FOOD_POISON_UNIT=300000,FOOD_POISON_INTERVAL=20,VOMIT_CHECK_INTERVAL=60,VOMIT_PULSE_INTERVAL=15;
export const FOOD_POISON_CAUSES:readonly FoodPoisonCause[]=['filthy-kitchen','incompetent-cook','unknown','dangerous-food'];
const COOK_CHANCES=[.05,.04,.03,.02,.015,.01,.005,.0025,.0015,.001] as const;
const chance=(probability:number,random:FoodPoisonRandom):boolean=>probability>=1||probability>0&&random()<probability;

export function cookFoodPoisonChance(level:number):number {return COOK_CHANCES[Math.max(0,Math.min(9,Math.floor(level)))]!;}
export function roomFoodPoisonChance(cleanliness:number|null):number {
  return cleanliness===null?.02:Math.max(0,Math.min(.05,(-2-cleanliness)/60));
}
/** Evaluate only once after the recipe's material/output preconditions succeed,
 * using the cook's current room and skill before completion XP. */
export function foodPoisonFromRecipe(cleanliness:number|null,level:number,random:FoodPoisonRandom):FoodContamination|undefined {
  if(chance(roomFoodPoisonChance(cleanliness),random))return {fraction:1,cause:'filthy-kitchen'};
  if(chance(cookFoodPoisonChance(level),random))return {fraction:1,cause:'incompetent-cook'};
  return undefined;
}
export function foodCanCarryPoison(item:ItemId):boolean {return item==='simple-meal'||item==='survival-meal';}
export function rawFoodPoisonChance(item:ItemId):number {
  return item==='berries'||item==='rice'||item==='potato'||item==='corn'||item==='hare-meat'?.02:0;
}
export function copyFoodPoison(poison:FoodContamination|undefined):FoodContamination|undefined {return poison?{...poison}:undefined;}
/** Both quantities are captured before the transfer. Only the incoming amount
 * actually absorbed participates; ties in toxic mass select the incoming cause. */
export function mergedFoodPoison(a:FoodContamination|undefined,quantityA:number,b:FoodContamination|undefined,quantityB:number):FoodContamination|undefined {
  if(!Number.isSafeInteger(quantityA)||quantityA<0||!Number.isSafeInteger(quantityB)||quantityB<0||!Number.isSafeInteger(quantityA+quantityB)||quantityA+quantityB===0)throw new Error('Invalid food contamination merge');
  if(quantityB===0)return copyFoodPoison(a);
  if(quantityA===0)return copyFoodPoison(b);
  const massA=(a?.fraction??0)*quantityA,massB=(b?.fraction??0)*quantityB;
  if(massA+massB===0)return undefined;
  const causeA=a?.cause??'unknown',causeB=b?.cause??'unknown';
  const cause=causeA==='unknown'?causeB:causeB==='unknown'?causeA:massA>massB?causeA:causeB;
  return {fraction:(massA+massB)/(quantityA+quantityB),cause};
}
/** Call once for a completed ingestion, independent of the number of raw units.
 * Raw-type risk is human-only; poisoned prepared food can affect other flesh. */
export function ingestionFoodPoison(pile:{item:ItemId;foodPoison?:FoodContamination},humanlike:boolean,factor:number,random:FoodPoisonRandom):FoodPoisonCause|undefined {
  const raw=rawFoodPoisonChance(pile.item);
  if(humanlike&&chance(raw*factor,random))return 'dangerous-food';
  if(foodCanCarryPoison(pile.item)&&pile.foodPoison&&chance(pile.foodPoison.fraction*factor,random))return pile.foodPoison.cause;
  return undefined;
}
/** An initial case is not restarted by a second exposure. Later phases return
 * just below .8, and therefore stay major rather than restarting the mild stage. */
export function exposeFoodPoisoning(previous:FoodPoisoningState|undefined,cause:FoodPoisonCause,item:ItemId,tick:number):FoodPoisoningState {
  if(!previous)return {severity:FOOD_POISON_UNIT,bornAt:tick,cause,item};
  if(previous.severity<FOOD_POISON_UNIT*.8){previous.severity=239700;previous.cause=cause;previous.item=item;}
  return previous;
}
export type FoodPoisoningStage='none'|'initial'|'major'|'recovering';
export function foodPoisoningStage(state:FoodPoisoningState|undefined):FoodPoisoningStage {
  const n=state?.severity??0;return n<=0?'none':n>=240000?'initial':n>=60000?'major':'recovering';
}
export interface FoodPoisoningModifiers {
  painOffset:number;consciousnessFactor:number;movingFactor:number;manipulationFactor:number;
  bloodFiltrationFactor:number;eatingFactor:number;talkingFactor:number;
}
export function foodPoisoningModifiers(state:FoodPoisoningState|undefined):FoodPoisoningModifiers {
  const stage=foodPoisoningStage(state),major=stage==='major';
  if(stage==='none')return {painOffset:0,consciousnessFactor:1,movingFactor:1,manipulationFactor:1,bloodFiltrationFactor:1,eatingFactor:1,talkingFactor:1};
  return {painOffset:major?.4:.2,consciousnessFactor:major?.5:.6,movingFactor:major?.5:.8,manipulationFactor:major?.8:.9,bloodFiltrationFactor:major?.85:.95,eatingFactor:major?.3:.5,talkingFactor:major?.8:1};
}
/** Called once at each reached medical tick. Returns whether state is still
 * needed; the owner removes it only when both disease and vomiting have ended. */
export function advanceFoodPoisoning(state:FoodPoisoningState,tick:number,phase:number):boolean {
  if(tick>state.bornAt&&tick%FOOD_POISON_INTERVAL===phase%FOOD_POISON_INTERVAL)state.severity=Math.max(0,state.severity-1000);
  return state.severity>0||!!state.vomit;
}
export function foodPoisonVomitChance(state:FoodPoisoningState|undefined):number {
  const stage=foodPoisoningStage(state);return stage==='none'?0:.01/(stage==='initial'?.3:stage==='major'?.2:.4);
}
