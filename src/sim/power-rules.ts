import { solarPowerOutput } from './solar-rules.ts';
import type { Structure,World } from './types.ts';

export const POWER_OUTPUT=1000;
export const LAMP_DEMAND=30;
export const CONNECTION_RANGE=6;
/** switchOn is the physical switch, absent means on. Actual supply persists
 * independently; a brownout cannot rewrite the player's physical switch. */
export interface PowerState { on:boolean; parentId:number|null;switchOn?:boolean }
export const isPowerTrader=(kind:unknown):boolean=>kind==='wood-generator'||kind==='solar-generator'||kind==='standing-lamp'||kind==='cooler'||kind==='electric-stove';
export const isElectrical=(kind:unknown):boolean=>isPowerTrader(kind)||kind==='battery'||kind==='power-conduit'||kind==='power-switch';
export const isFlickable=(kind:unknown):boolean=>kind==='wood-generator'||kind==='standing-lamp'||kind==='cooler'||kind==='electric-stove'||kind==='power-switch';
export const newPowerState=(kind:unknown):PowerState=>({on:kind==='wood-generator'||kind==='solar-generator',parentId:null});
export const isPowerActive=(s:Structure):boolean=>!!s.power?.on&&s.power.switchOn!==false&&(s.kind!=='wood-generator'||!!s.fuel?.ticks);
export const powerDemand=(s:Structure):number=>s.kind==='electric-stove'?350:s.kind==='cooler'?(s.cooler?.high?200:20):s.kind==='standing-lamp'?LAMP_DEMAND:0;
export const powerPotential=(s:Structure,world?:World):number=>s.kind==='wood-generator'?POWER_OUTPUT:s.kind==='solar-generator'?(world?Math.round(solarPowerOutput(world,s)):0):-powerDemand(s);
export const powerWatts=(s:Structure,world?:World):number=>isPowerActive(s)?powerPotential(s,world):0;
