import { microelectronicsUnlocked } from './research.ts';
import { validCookingOrder } from './player-cooking-save.ts';
import { validBillSettings } from './cooking-bills.ts';
import type { World } from './types.ts';
import { EMP_ADAPTATION_CORE_TICKS,EMP_DAMAGE_AMOUNTS,EMP_MAX_STUN_CORE_TICKS,empStunDuration } from './emp-rules.ts';
import { empStructureSupported } from './emp-state.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));
const durations=EMP_DAMAGE_AMOUNTS.map(empStunDuration);

export function validMechanoidEmpState(value:unknown,version:number,tick:number,stopped=false):boolean {
  if(value===undefined)return true;
  const core=tick*10;
  return version>=208&&integer(core)&&object(value)&&keys(value,['lastAtCore','adaptedUntilCore','stunUntilCore'])
    &&integer(value.lastAtCore,0,core)&&integer(value.adaptedUntilCore)&&integer(value.stunUntilCore)
    &&value.adaptedUntilCore===value.lastAtCore+EMP_ADAPTATION_CORE_TICKS
    &&(durations.includes(value.stunUntilCore-value.lastAtCore)&&!stopped
      ||integer(value.stunUntilCore,value.lastAtCore,Math.min(core,value.lastAtCore+EMP_MAX_STUN_CORE_TICKS)))
    &&Math.max(value.adaptedUntilCore,value.stunUntilCore)>core;
}

/** The larger future horizon belongs only to the EMP mechanical owner.
 * Ordinary human/animal/melee interval readers retain their 45-Core limit. */
export function validMechanoidEmpIntervals(value:unknown,version:number,start:number,tick:number,emp:unknown):boolean {
  if(version<208||!Array.isArray(value)||!value.length||value.length>4096||Object.keys(value).length!==value.length)return false;
  let previous=start-1;
  return value.every(s=>{
    if(!object(s)||!keys(s,['start','end'])||typeof s.start!=='number'||!Number.isFinite(s.start)||typeof s.end!=='number'||!Number.isFinite(s.end)
      ||s.start<start||s.start>tick||s.end<=s.start||s.start<=previous||!Number.isSafeInteger(s.end*10)||s.end>tick+EMP_MAX_STUN_CORE_TICKS/10
      ||s.end>tick+4.5&&(!object(emp)||s.end*10!==emp.stunUntilCore))return false;
    previous=s.end;return true;
  });
}
export function validStructureEmpState(value:unknown,kind:unknown,version:number,tick:number):boolean {
  if(value===undefined)return true;
  const core=tick*10;
  return version>=208&&integer(core)&&empStructureSupported(kind)&&object(value)
    &&keys(value,['sinceCore','untilCore'])&&integer(value.sinceCore,0,core)&&integer(value.untilCore,core+1,core+EMP_MAX_STUN_CORE_TICKS)
    &&value.untilCore-value.sinceCore>=1350;
}

/** Installed devices and minified batteries retain the absolute disable clock.
 * Plans are references and never own an additional transient state. */
export function validEmpStructureTransport(w:World,version:number=w.schemaVersion):boolean {
  for(const s of w.structures)if(Object.hasOwn(s,'emp')&&(s.emp===undefined||!validStructureEmpState(s.emp,s.kind,version,w.tick)))return false;
  const copied=(v:unknown)=>object(v)&&Object.hasOwn(v,'emp');
  const packed=(p:unknown,tick:number)=>!copied(p)&&object(p)&&object(p.building)
    &&(!copied(p.building)||p.building.kind==='battery'&&p.building.emp!==undefined&&validStructureEmpState(p.building.emp,'battery',version,tick));
  for(const p of w.packed??[])if(!packed(p,w.tick))return false;
  for(const j of w.jobs)if(copied(j)||copied(j.furniture)||copied(j.deconstruction))return false;
  for(const records of [w.visitors?.departed??[],w.podRescues?.departed??[]])for(const departure of records)
    for(const p of departure.packed??[])if(!packed(p,departure.tick))return false;
  return true;
}

/** Prospective content gate shared by save and sparse transport. Existing
 * production guards still validate the common gun task/ingredients/claims. */
export function validEmpProductionTransport(w:World,version:number=w.schemaVersion):boolean {
  const allowed=version>=208&&microelectronicsUnlocked(w);
  for(const station of [...w.structures,...(w.packed??[]).map(p=>p.building)])for(const bill of station.bills??[])
    if(bill.recipe==='make-emp-launcher'&&(!allowed||station.kind!=='machining-table'||!validBillSettings(bill,bill.recipe,version)))return false;
  for(const pile of w.piles)if(pile.gunWork?.recipe==='make-emp-launcher'&&!allowed)return false;
  for(const p of w.pawns){
    if(p.cooking?.recipe==='make-emp-launcher'&&!allowed)return false;
    for(const order of p.orders.queue)if(object(order)&&object(order.cooking)&&order.cooking.recipe==='make-emp-launcher'
      &&(!allowed||!validCookingOrder(order,w)))return false;
  }
  return true;
}
