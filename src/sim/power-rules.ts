import { solarPowerOutput } from './solar-rules.ts';
import { SUN_LAMP_DEMAND,sunLampScheduled } from './sun-lamp.ts';
import type { Structure,World } from './types.ts';

export const POWER_OUTPUT=1000;
export const LAMP_DEMAND=30;
export const CONNECTION_RANGE=6;
/** switchOn is the physical switch, absent means on. Actual supply persists
 * independently; a brownout cannot rewrite the player's physical switch. */
export interface PowerState { on:boolean; parentId:number|null;switchOn?:boolean }
export const isPowerTrader=(kind:unknown):boolean=>kind==='mini-turret'||kind==='tube-television'||kind==='wood-generator'||kind==='solar-generator'||kind==='wind-turbine'||kind==='heater'||kind==='standing-lamp'||kind==='sun-lamp'||kind==='cooler'||kind==='electric-stove'||kind==='electric-tailor-bench'||kind==='machining-table'||kind==='hi-tech-research-bench'||kind==='multi-analyzer'||kind==='fabrication-bench'||kind==='autodoor';
export const isElectrical=(kind:unknown):boolean=>isPowerTrader(kind)||kind==='battery'||kind==='power-conduit'||kind==='power-switch';
export const isFlickable=(kind:unknown):boolean=>kind==='mini-turret'||kind==='tube-television'||kind==='machining-table'||kind==='hi-tech-research-bench'||kind==='multi-analyzer'||kind==='fabrication-bench'||kind==='wood-generator'||kind==='standing-lamp'||kind==='sun-lamp'||kind==='cooler'||kind==='heater'||kind==='electric-stove'||kind==='electric-tailor-bench'||kind==='power-switch';
export const newPowerState=(kind:unknown):PowerState=>({on:kind==='wood-generator'||kind==='solar-generator'||kind==='wind-turbine',parentId:null});
export const isPowerActive=(s:Structure):boolean=>!s.breakdown&&!!s.power?.on&&s.power.switchOn!==false&&(s.kind!=='wood-generator'||!!s.fuel?.ticks);
export const powerDemand=(s:Structure):number=>s.kind==='mini-turret'?80:s.kind==='tube-television'?200:s.kind==='electric-stove'||s.kind==='machining-table'?350:s.kind==='hi-tech-research-bench'||s.kind==='fabrication-bench'?250:s.kind==='multi-analyzer'?200:s.kind==='electric-tailor-bench'?120:s.kind==='autodoor'?50:s.kind==='cooler'?(s.cooler?.high?200:20):s.kind==='heater'?(s.heater?.high?175:17.5):s.kind==='standing-lamp'?LAMP_DEMAND:s.kind==='sun-lamp'?SUN_LAMP_DEMAND:0;
export const powerPotential=(s:Structure,world?:World):number=>s.kind==='wood-generator'?POWER_OUTPUT:s.kind==='solar-generator'?(world?Math.round(solarPowerOutput(world,s)):0):s.kind==='wind-turbine'?(s.wind?.cachedWatts??0):-powerDemand(s);
export const powerWatts=(s:Structure,world?:World):number=>isPowerActive(s)&&(s.kind!=='sun-lamp'||!!world&&sunLampScheduled(world))?powerPotential(s,world):0;
