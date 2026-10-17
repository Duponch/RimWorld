import {WILD_PLANT_GENERATION_FACTS_256 as FACTS} from './wild-plant-generation-data-256.ts';
import type {PlantLife} from './plant-life.ts';
import type {Resource} from './types.ts';
const own=(v:object,k:string)=>Object.hasOwn(v,k);
/** Observed age is already paused/rebased by the existing owner clock. Keep
 * the integer Core remainder in the immutable offset, not in a second clock. */
export const effectivePlantAgeCore256=(life:Pick<PlantLife,'age'|'initialAgeCore'>):number=>(life.initialAgeCore??0)+life.age*10;
export function initialPlantLifespanCore256(species:unknown):number|undefined {
 const def=Object.values(FACTS).find(d=>d.species===species);return def?Math.trunc(Math.fround(Math.fround(def.growDays*def.lifespanDaysPerGrowDays)*60000)):undefined;
}
export function validInitialPlantAge256(plant:Partial<Resource>,version:number):boolean {
 const life=plant.plantLife;if(!life||typeof life!=='object'||!own(life,'initialAgeCore'))return true;
 if(version<256||!Number.isSafeInteger(life.initialAgeCore)||life.initialAgeCore!<0||own(life,'bornAt'))return false;
 const lifespan=initialPlantLifespanCore256(plant.species);
 return lifespan!==undefined&&['tree','berries','wild-plant'].includes(plant.kind??'')&&life.initialAgeCore!<Math.max(1,lifespan-50);
}
/** Production-only guard. Ordinary/paused save validators deliberately do NOT
 * require since==adoptedAt after a real cross-clock transfer or replanting. */
export function attachInitialPlantAge256(plant:Resource,version:number,initialAgeCore:number,adoptedAt:number):void {
 const life=plant.plantLife;if(version!==256||!life||life.since!==adoptedAt||life.age!==0||life.darkTicks!==0||own(life,'bornAt')||own(life,'initialAgeCore')||own(life,'pausedTicks'))throw Error('Initial plant age requires the actual new map production clock');
 const candidate={...plant,plantLife:{...life,initialAgeCore}};
 if(!validInitialPlantAge256(candidate,version))throw Error('Invalid initial Core plant age');
 life.initialAgeCore=initialAgeCore;
}
