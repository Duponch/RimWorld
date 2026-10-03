import type { MedicalRandom, MedicalRecord } from './injury-types.ts';

/** Human clinical condition, independent of an operation or sleeping task. */
export interface AnestheticState {
  bornAt:number;
  /** Exact Core deadline; the owning local tick removes it on crossing. */
  expiresAtCore:number;
  /** Billionths of severity, initially one. */
  severity:number;
  /** Numerator left over from the exact 8,000,000 / 3 cadence loss. */
  remainder:number;
}
export const ANESTHETIC_UNIT=1_000_000_000;
export const ANESTHETIC_INTERVAL=20; // 200 Core ticks.
export const ANESTHETIC_DELAY_MIN_CORE=45_000;
export const ANESTHETIC_DELAY_MAX_CORE=120_000;
const LOSS_NUMERATOR=8_000_000,LOSS_DENOMINATOR=3;

export function anestheticStage(severity:number):'none'|'sedated'|'woozy'|'wearing-off' {
  return severity<=0?'none':severity>=800_000_000?'sedated':severity>=600_000_000?'woozy':'wearing-off';
}
export interface AnestheticModifiers {
  readonly painFactor:number; readonly consciousnessMax:number;
  readonly movingOffset:number; readonly manipulationOffset:number;
  readonly talkingOffset:number; readonly digestionOffset:number; readonly sightOffset:number;
}
const NONE:AnestheticModifiers=Object.freeze({painFactor:1,consciousnessMax:Infinity,movingOffset:0,manipulationOffset:0,talkingOffset:0,digestionOffset:0,sightOffset:0});
const SEDATED:AnestheticModifiers=Object.freeze({...NONE,painFactor:0,consciousnessMax:.01});
const WOOZY:AnestheticModifiers=Object.freeze({painFactor:.8,consciousnessMax:.7,movingOffset:-.2,manipulationOffset:-.2,talkingOffset:-.2,digestionOffset:-.2,sightOffset:-.15});
const WEARING_OFF:AnestheticModifiers=Object.freeze({...NONE,painFactor:.95,consciousnessMax:.9,movingOffset:-.05,manipulationOffset:-.1});
export function anestheticModifiers(state:AnestheticState|undefined):AnestheticModifiers {
  const stage=anestheticStage(state?.severity??0);
  return stage==='sedated'?SEDATED:stage==='woozy'?WOOZY:stage==='wearing-off'?WEARING_OFF:NONE;
}

/** Caller anchors health and owns the dose/PRNG transaction. Refusals happen
 * before drawing; an existing condition is never merged or re-administered. */
export function canAdministerAnesthetic(record:MedicalRecord):boolean {
  return !record.death&&record.body===undefined&&record.anesthetic===undefined&&Number.isSafeInteger(record.tick)&&record.tick>=0&&Number.isSafeInteger(record.tick*10+ANESTHETIC_DELAY_MAX_CORE);
}
export function administerAnesthetic(record:MedicalRecord,random:MedicalRandom):boolean {
  if(!canAdministerAnesthetic(record))return false;
  const draw=random();
  if(!Number.isFinite(draw)||draw<0||draw>=1)throw new Error('Invalid anesthetic random value');
  record.anesthetic={bornAt:record.tick,expiresAtCore:record.tick*10+ANESTHETIC_DELAY_MIN_CORE+
    Math.floor(draw*(ANESTHETIC_DELAY_MAX_CORE-ANESTHETIC_DELAY_MIN_CORE+1)),severity:ANESTHETIC_UNIT,remainder:0};
  return true;
}

/** Called once after each medical tick increment. The owner's existing hash
 * phase is stable across save/load. No PRNG, float decay or elapsed-time reset.
 * Return true only when a physiological projection may have changed. */
export function advanceAnesthetic(record:MedicalRecord,phase:number):boolean {
  const state=record.anesthetic;if(!state||record.death)return false;
  if(record.tick*10>=state.expiresAtCore){delete record.anesthetic;return true;}
  if(record.tick<=state.bornAt||record.tick%ANESTHETIC_INTERVAL!==phase%ANESTHETIC_INTERVAL)return false;
  const numerator=LOSS_NUMERATOR+state.remainder;
  state.severity-=Math.floor(numerator/LOSS_DENOMINATOR);state.remainder=numerator%LOSS_DENOMINATOR;
  if(state.severity<=0)delete record.anesthetic;
  return true;
}

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,min:number,max:number):value is number=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;
/** Validation uses the frozen medical tick for dead records, never world time.
 * Isolated records bound the unknown cadence to floor/ceil(elapsed/20). World
 * callers supply the owner phase to check the exact inclusive cadence count.
 * Decay/remainder must agree exactly in either case. */
export function validAnesthetic(value:unknown,recordTick:number,allowed:boolean,phase?:number):boolean {
  if(value===undefined)return true;
  if(!allowed||!object(value)||Object.keys(value).some(key=>!['bornAt','expiresAtCore','severity','remainder'].includes(key))||
    !integer(recordTick,0,Number.MAX_SAFE_INTEGER)||!Number.isSafeInteger(recordTick*10)||
    !integer(value.bornAt,0,recordTick)||!integer(value.expiresAtCore,recordTick*10+1,Number.MAX_SAFE_INTEGER)||
    !integer(value.severity,1,ANESTHETIC_UNIT)||!integer(value.remainder,0,LOSS_DENOMINATOR-1)||phase!==undefined&&!integer(phase,0,ANESTHETIC_INTERVAL-1))return false;
  const delay=value.expiresAtCore-value.bornAt*10;
  if(delay<ANESTHETIC_DELAY_MIN_CORE||delay>ANESTHETIC_DELAY_MAX_CORE)return false;
  const steps=((ANESTHETIC_UNIT-value.severity)*LOSS_DENOMINATOR+value.remainder)/LOSS_NUMERATOR;
  if(phase!==undefined)return Number.isSafeInteger(steps)&&steps===Math.floor((recordTick-phase)/ANESTHETIC_INTERVAL)-Math.floor((value.bornAt-phase)/ANESTHETIC_INTERVAL);
  const elapsed=recordTick-value.bornAt;
  return Number.isSafeInteger(steps)&&steps>=Math.floor(elapsed/ANESTHETIC_INTERVAL)&&steps<=Math.ceil(elapsed/ANESTHETIC_INTERVAL);
}
