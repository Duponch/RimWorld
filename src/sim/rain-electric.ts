import { footprintCells } from './definitions.ts';
import { flameBurst } from './fire.ts';
import { batteryWattDays } from './power-battery.ts';
import { isPowerActive } from './power-rules.ts';
import { isRoofed } from './roof-rules.ts';
import { weatherRainRate } from './weather.ts';
import type { Structure,World } from './types.ts';

export const RAIN_ELECTRICAL_INTERVAL_CORE=97;
/** Core 1.6.4871 shortCircuitInRain, restricted to the delivered catalogue. */
export const RAIN_ELECTRICAL_KINDS=['mini-turret','battery','heater','electric-stove','electric-tailor-bench','machining-table','fabrication-bench','hi-tech-research-bench','multi-analyzer','sun-lamp','tube-television'] as const;
export type RainElectricalKind=typeof RAIN_ELECTRICAL_KINDS[number];
export interface RainElectricalContact {coreTick:number;structureId:number;kind:RainElectricalKind;x:number;z:number}
export interface RainElectricalState {
  revision:1;adoptedAt:number;lastCoreTick:number;rng:number;discharges:number;lastDischarge?:RainElectricalContact;
}
export const isRainElectricalKind=(value:unknown):value is RainElectricalKind=>
  typeof value==='string'&&(RAIN_ELECTRICAL_KINDS as readonly string[]).includes(value);

/** Eligibility follows selection: covered/inactive buildings still count in N.
 * A battery's rain condition is charge, independent of trader supply. */
export function rainElectricalEligible(w:World,building:Structure):boolean {
  if(!isRainElectricalKind(building.kind)||!w.structures.includes(building)||isRoofed(w,building.z*w.width+building.x))return false;
  return building.kind==='battery'?!!building.battery&&batteryWattDays(building.battery)>100:isPowerActive(building);
}
function random(state:RainElectricalState):number {
  let n=state.rng;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0;
  return state.rng/0x100000000;
}
/** Core Rand.Chance does not draw at zero or one. */
function chance(state:RainElectricalState,value:number):boolean {
  return value<=0?false:value>=1?true:random(state)<value;
}
export function adoptRainElectrical(w:World):void {
  if(w.schemaVersion<181||!w.weather||w.rainElectrical||!Number.isSafeInteger(w.tick*10)||w.tick<0)return;
  w.rainElectrical={revision:1,adoptedAt:w.tick,lastCoreTick:w.tick*10,rng:((w.seed^0x278fd37b)>>>0)||1,discharges:0};
}
/** Confirmed local weather/supply are sampled for this tick's ten Core
 * boundaries. This quantization and array order are explicit adaptations. */
export function advanceRainElectrical(w:World):void {
  const state=w.rainElectrical,now=w.tick*10;
  if(w.schemaVersion<181||!state||!w.weather||!Number.isSafeInteger(now)||now<=state.lastCoreTick)return;
  const first=Math.max(state.lastCoreTick+1,now-9);
  // Enumerate only due Core opportunities, preserving the same order and draws.
  const remainder=first%RAIN_ELECTRICAL_INTERVAL_CORE;
  for(let core=first+(remainder===0?0:RAIN_ELECTRICAL_INTERVAL_CORE-remainder);
    core<=now;core+=RAIN_ELECTRICAL_INTERVAL_CORE){
    if(!chance(state,.02))continue;
    const candidates=w.structures.filter(s=>isRainElectricalKind(s.kind));
    if(!chance(state,.2*candidates.length*weatherRainRate(w)))continue;
    // RandomElement draws even for one element; rejected choices do not reroll.
    const building=candidates[Math.floor(random(state)*candidates.length)]!;
    if(!rainElectricalEligible(w,building))continue;
    const cells=footprintCells(building),xs=cells.map(c=>c.x),zs=cells.map(c=>c.z);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    // CellRect.RandomCell draws x then z, only for non-singleton axes.
    const x=minX+(maxX>minX?Math.floor(random(state)*(maxX-minX+1)):0);
    const z=minZ+(maxZ>minZ?Math.floor(random(state)*(maxZ-minZ+1)):0);
    if(!flameBurst(w,{x,z},1.9,core))continue;
    state.discharges++;
    state.lastDischarge={coreTick:core,structureId:building.id,kind:building.kind as RainElectricalKind,x,z};
    w.events.push({tick:w.tick,type:'need',message:`Décharge électrique sous les précipitations en (${x}, ${z}).`});
    if(w.events.length>80)w.events.splice(0,w.events.length-80);
  }
  state.lastCoreTick=now;
}
