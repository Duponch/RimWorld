import type { World } from './types.ts';
import { TICKS_PER_DAY } from './types.ts';
import { isPlant,plantGrowth } from './plants.ts';
import { createPlantLife } from './plant-life.ts';

/** Civil time at explicit adoption; elapsed jobs and health keep World.tick. */
export interface SiteClimate {
  revision:1;
  profile:'temperate-reference';
  adoptedAt:number;
  calendarOrigin:number;
}

export type ClimateWorld=Pick<World,'tick'|'gameProfile'|'climate'>;
export const TICKS_PER_YEAR=60*TICKS_PER_DAY;
/** Historical colony B: climate read from its saved tile, location reported
 * by the user. This is an observed reference, not an average world tile. */
export const TEMPERATE_CLIMATE=Object.freeze({meanTemperature:16.2,amplitude:seasonalAmplitude(22.21),rainfall:900,
  latitude:22.21,longitude:-18.23});

export function climateTick(world:ClimateWorld,tick=world.tick):number {
  return world.climate?world.climate.calendarOrigin+tick-world.climate.adoptedAt:tick+(world.gameProfile?TICKS_PER_DAY/4:0);
}

/** Scalar site temperatures use a separate yearly phase from civil hour. */
export function seasonalAmplitude(latitude:number):number {
  const distance=Math.abs(Math.sin(latitude*Math.PI/180));
  return distance<=.1?3+10*distance:4+(distance-.1)/.9*24;
}

export function seasonTemperature(latitude:number,mean:number,civilTick:number):number {
  const phase=((civilTick%TICKS_PER_YEAR)+TICKS_PER_YEAR)%TICKS_PER_YEAR/TICKS_PER_YEAR;
  return mean-Math.cos(2*Math.PI*(phase-50/60))*seasonalAmplitude(latitude)*(latitude<0?-1:1);
}

/** Core Auto selects the first warm five-day period, including wraparound. */
export function automaticStartDay(latitude:number,mean:number):number {
  const warm=Array.from({length:12},(_,twelfth)=>{
    let sum=0;for(let i=0;i<120;i++)sum+=seasonTemperature(latitude,mean,(twelfth*5+.5+i/24)*TICKS_PER_DAY);
    return sum/120>=12;
  });
  let first=warm.indexOf(true);
  if(first<0)return latitude>=0?15:45;
  if(first===0&&!warm.every(Boolean))while(warm[(first+11)%12])first=(first+11)%12;
  return first*5;
}
let referenceStartDay:number|undefined;

export function climateOriginAtAdoption(world:Pick<World,'gameProfile'>,adoptedAt:number):number {
  const civil=adoptedAt+(world.gameProfile?TICKS_PER_DAY/4:0);
  referenceStartDay??=automaticStartDay(TEMPERATE_CLIMATE.latitude,TEMPERATE_CLIMATE.meanTemperature);
  return Math.floor(civil/TICKS_PER_YEAR)*TICKS_PER_YEAR+
    referenceStartDay*TICKS_PER_DAY+civil%TICKS_PER_DAY;
}

/** Explicit transition starts a warm observed season without inventing past
 * frost/plant age. Save old growth before changing the civil environment. */
export function adoptSiteClimate(world:World):boolean {
  if(world.climate)return false;
  for(const plant of world.resources)if(isPlant(plant)) {
    plant.growth=plantGrowth(world,plant);plant.growthTick=world.tick;
    plant.plantLife=createPlantLife(world,plant);
  }
  world.climate={revision:1,profile:'temperate-reference',adoptedAt:world.tick,calendarOrigin:climateOriginAtAdoption(world,world.tick)};
  return true;
}

/** Base + annual + daily cycle. Weather and incidents remain separate owners. */
export function seasonalOutdoorTemperature(world:ClimateWorld,tick=world.tick):number {
  // Core caches site temperature for 60 ticks. This profile uses the adopted
  // origin rather than making the result depend on the first caller's timing.
  const sample=world.climate?tick-((tick-world.climate.adoptedAt)%6+6)%6:tick;
  const civil=climateTick(world,sample);
  const base=world.climate?seasonTemperature(TEMPERATE_CLIMATE.latitude,TEMPERATE_CLIMATE.meanTemperature,civil):21;
  return base+7*Math.cos(2*Math.PI*(civil%TICKS_PER_DAY/TICKS_PER_DAY+.32));
}

export function climateDate(world:ClimateWorld):{year:number;day:number;quadrum:number;season:string} {
  const civil=climateTick(world),day=Math.floor(civil/TICKS_PER_DAY)%60;
  return {year:5500+Math.floor(civil/TICKS_PER_YEAR),day:day%15+1,quadrum:Math.floor(day/15),
    season:['Printemps','Été','Automne','Hiver'][Math.floor(day/15)]!};
}
