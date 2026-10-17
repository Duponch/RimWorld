/** Prospective clinical state only. No scenario, Pawn, holder, clock or RNG is
 * invented here. Historical absent fields stay absent at every boundary. */
import type {VomitState} from './food-poisoning.ts';
import type {MedicalRecord} from './injury-types.ts';
export interface CryptosleepSickness256 {remainingCore:number;initialCore:number;noiseSeed:number;vomit?:VomitState}
export interface CryptosleepSicknessRandom256 {integer(min:number,maxExclusive:number):number;integerValue():number}
const int=(n:unknown,min:number,max=Number.MAX_SAFE_INTEGER):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype;
function data(v:object,key:string){const d=Object.getOwnPropertyDescriptor(v,key);return d&&Object.hasOwn(d,'value')&&d.enumerable?d:undefined;}
function exact(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[]):boolean {
 return required.every(k=>!!data(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k))&&!!data(v,k));
}
export function validCryptosleepSicknessState256(value:unknown):value is CryptosleepSickness256 {
 if(!plain(value)||!exact(value,['remainingCore','initialCore','noiseSeed'],['vomit'])||!int(value.initialCore,8000,12000)||!int(value.remainingCore,0,12000)||!int(value.noiseSeed,-2147483648,2147483647))return false;
 if(!Object.hasOwn(value,'vomit'))return value.remainingCore>0;
 const v=value.vomit;
 return plain(v)&&exact(v,['remainingCore','cell'])&&int(v.remainingCore,1,899)&&plain(v.cell)&&exact(v.cell,['x','z'])&&int(v.cell.x,0)&&int(v.cell.z,0);
}
/** Header admission precedes reading this new field, including explicit
 * undefined, inherited/accessor properties and concurrent physical episodes. */
export function hasCryptosleepSickness256(record:unknown):boolean {
 return !!record&&typeof record==='object'&&'cryptosleepSickness'in record;
}
export function validCryptosleepSicknessHeader256(record:unknown,version:number,mechanical=false):boolean {
 if(!record||typeof record!=='object')return false;
 const descriptor=Object.getOwnPropertyDescriptor(record,'cryptosleepSickness');
 if(!descriptor)return !('cryptosleepSickness'in record);
 if(version<256||mechanical||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable||!validCryptosleepSicknessState256(descriptor.value))return false;
 if(!descriptor.value.vomit)return true;
 const death=Object.getOwnPropertyDescriptor(record,'death');if(death&&(!Object.hasOwn(death,'value')||death.value!==undefined))return false;
 // Only the new concurrent-owner case uses this check; literal old records
 // continue through their unchanged historical validators.
 for(const key of ['foodPoisoning','flu','immuneDiseases']){
  const d=Object.getOwnPropertyDescriptor(record,key);if(!d)continue;
  if(!Object.hasOwn(d,'value')||!d.enumerable||!plain(d.value))return false;
  const owner=key==='immuneDiseases'?data(d.value,'malaria')?.value:d.value;
  if(owner!==undefined){if(!plain(owner))return false;const v=Object.getOwnPropertyDescriptor(owner,'vomit');if(v&&(!Object.hasOwn(v,'value')||v.value!==undefined))return false;}
 }
 return true;
}
/** Core HediffComp_Disappears.CompPostMake: duration, then Rand.Int. No chance
 * or fixed severity draw is smuggled into the GenStep875 counter. */
export function makeCryptosleepSickness256(random:CryptosleepSicknessRandom256):CryptosleepSickness256 {
 const initialCore=random.integer(8000,12001),noiseSeed=random.integerValue();
 if(!int(initialCore,8000,12000)||!int(noiseSeed,-2147483648,2147483647))throw Error('Invalid actual cryptosleep sickness draws');
 return {remainingCore:initialCore,initialCore,noiseSeed};
}
/** Complete the actual new Hediff's draws even if it merges. Core's merge
 * retains the old initial/noise and only raises remaining to the larger one. */
export function addCryptosleepSickness256(record:MedicalRecord,random:CryptosleepSicknessRandom256,version:number):void {
 if(version!==256||record.death||['scyther','lancer','pikeman'].includes(record.body??'')||!validCryptosleepSicknessHeader256(record,version))throw Error('Invalid prospective flesh sickness owner');
 const made=makeCryptosleepSickness256(random),old=record.cryptosleepSickness;
 if(old)old.remainingCore=Math.max(old.remainingCore,made.remainingCore);else record.cryptosleepSickness=made;
}
/** The caller supplies ONE real physiological interval. Suspension consumes
 * none; expiry retains only an already running physical job until it ends. */
export function advanceCryptosleepSickness256(state:CryptosleepSickness256,deltaCore:number,suspended=false):boolean {
 if(!validCryptosleepSicknessState256(state)||!int(deltaCore,0)||typeof suspended!=='boolean')throw Error('Invalid cryptosleep sickness owner interval');
 if(!suspended)state.remainingCore=Math.max(0,state.remainingCore-deltaCore);
 return state.remainingCore>0||!!state.vomit;
}
export const cryptosleepSick256=(state:CryptosleepSickness256|undefined):boolean=>(state?.remainingCore??0)>0;
/** Job interruption on a real downing/death ends the spatial action, while
 * keeping any remaining illness on this same clinical original. */
export function cancelCryptosleepVomit256(record:MedicalRecord):void {
 const state=record.cryptosleepSickness;if(!state?.vomit)return;delete state.vomit;
 if(!state.remainingCore)delete record.cryptosleepSickness;
}
export const cryptosleepVomitChance256=(state:CryptosleepSickness256|undefined):number=>cryptosleepSick256(state)?600/(.125*60000):0;
export function cryptosleepSicknessModifiers256(state:CryptosleepSickness256|undefined){
 const sick=cryptosleepSick256(state);return {consciousnessFactor:sick?.8:1,movingFactor:sick?.9:1,manipulationFactor:sick?.9:1};
}
