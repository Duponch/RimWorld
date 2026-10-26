import type {CookingBill} from './cooking-types.ts';
import {PRODUCTION_RECIPES,type ProductionRecipe} from './production-recipes.ts';
import type {BillReservePause289,BillReservePausePolicy289} from './bill-pause-state-289.ts';

export function supportsBillReservePause289(recipe:unknown):boolean {
  return typeof recipe==='string'&&Object.hasOwn(PRODUCTION_RECIPES,recipe)&&!['smelt-weapon','smelt-apparel','cremate-corpse','burn-apparel'].includes(recipe);
}
function data(value:unknown,keys:readonly string[]):value is Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
  const names=Reflect.ownKeys(value);return names.length===keys.length&&names.every(k=>typeof k==='string'&&keys.includes(k))
    &&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(value,k);return !!d&&d.enumerable&&Object.hasOwn(d,'value');});
}
export function validBillReservePausePolicy289(value:unknown):value is BillReservePausePolicy289 {
  try{return data(value,['enabled','resumeAt'])&&typeof value.enabled==='boolean'&&Number.isSafeInteger(value.resumeAt)
    &&(value.resumeAt as number)>=-1&&(value.resumeAt as number)<=9999;}catch{return false;}
}
export function validBillReservePauseState289(value:unknown,version:number,recipe:unknown):value is BillReservePause289 {
  try{return (version===289||(version===290||(version===291||(version===292||(version===293||(version===294||(version===295||version===296)))))))&&supportsBillReservePause289(recipe)&&data(value,['enabled','resumeAt','paused'])
    &&typeof value.enabled==='boolean'&&typeof value.paused==='boolean'&&Number.isSafeInteger(value.resumeAt)
    &&(value.resumeAt as number)>=-1&&(value.resumeAt as number)<=9999;}catch{return false;}
}
export function validBillPauseCommand289(value:unknown,version:number):boolean {
  try{
    if((version!==289&&(version!==290&&(version!==291&&(version!==292&&(version!==293&&(version!==294&&(version!==295&&version!==296)))))))||!value||typeof value!=='object')return false;
    const type=Object.getOwnPropertyDescriptor(value,'type');if(!type||!Object.hasOwn(type,'value'))return false;
    const keys=type.value==='bill-pause-policy'?['type','structureId','billId','policy']:type.value==='bill-pause-resume'?['type','structureId','billId']:undefined;
    if(!keys||!data(value,keys)||!Number.isSafeInteger(value.structureId)||!Number.isSafeInteger(value.billId)||(value.structureId as number)<=0||(value.billId as number)<=0)return false;
    return type.value==='bill-pause-resume'||validBillReservePausePolicy289(value.policy);
  }catch{return false;}
}
/** This reads no stock for manual suspension, or modes without a reserve. The
 * caller commits the returned memory only at an explicit SIM frontier. */
export function nextBillReservePaused289(bill:CookingBill,readCount:()=>number):boolean {
  const state=bill.reservePause;if(!state)return false;
  if(bill.mode!=='until')return false;
  if(bill.suspended)return state.paused;
  let paused=state.paused;
  const count=readCount();
  if(state.enabled&&count>=bill.target)paused=true;
  if(count<=state.resumeAt||!state.enabled)paused=false;
  return paused;
}
export function defaultBillResumeAt289(target:number):number {return Math.min(target-1,Math.max(0,target-5));}
/** Local shared quantity editor adapts the native dialog's target-delta rule. */
export function adjustBillReserveTarget289(bill:CookingBill,oldTarget:number):void {
  const state=bill.reservePause;if(!state||bill.mode!=='until')return;
  const shifted=Math.max(0,Math.min(9999,state.resumeAt+bill.target-oldTarget));
  state.resumeAt=state.enabled?Math.min(shifted,bill.target-1):shifted;
}
