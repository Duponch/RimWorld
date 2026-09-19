import type { Structure } from './types.ts';

export const POWER_OUTPUT=1000;
export const LAMP_DEMAND=30;
export const CONNECTION_RANGE=6;
/** Switching intent is not yet exposed; newly built appliances want to run.
 * Actual supply is persistent: brownouts do not reset on load. */
export interface PowerState { on:boolean; parentId:number|null }
export const isElectrical=(kind:unknown):boolean=>kind==='wood-generator'||kind==='standing-lamp'||kind==='cooler';
export const newPowerState=(kind:unknown):PowerState=>({on:kind==='wood-generator',parentId:null});
export const isPowerActive=(s:Structure):boolean=>!!s.power?.on&&(s.kind!=='wood-generator'||!!s.fuel?.ticks);
export const powerDemand=(s:Structure):number=>s.kind==='cooler'?(s.cooler?.high?200:20):s.kind==='standing-lamp'?LAMP_DEMAND:0;
export const powerWatts=(s:Structure):number=>!isPowerActive(s)?0:s.kind==='wood-generator'?POWER_OUTPUT:-powerDemand(s);
