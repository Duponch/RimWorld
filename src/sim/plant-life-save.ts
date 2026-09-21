import { isPlant } from './plants.ts';
import { PLANT_LIFE_INTERVAL } from './plant-life.ts';
import type { Resource,World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;

export function validPlantLife(plant:Partial<Resource>,version:number,world:Pick<World,'tick'|'climate'>):boolean {
  const life:unknown=plant.plantLife;
  if(life===undefined)return !world.climate||!isPlant(plant as Resource);
  if(version<87||!world.climate||!isPlant(plant as Resource)||!record(life)||!Object.keys(life).every(k=>['since','bornAt','age','darkTicks','leaflessAt','nextCheck'].includes(k)))return false;
  if(!integer(life.since,world.climate.adoptedAt,world.tick)||!integer(life.age,0,world.tick-life.since)||!integer(life.darkTicks,0,life.age)||
    !integer(life.nextCheck,world.tick+1,world.tick+PLANT_LIFE_INTERVAL)||life.nextCheck%PLANT_LIFE_INTERVAL!==(plant.id!+1)%PLANT_LIFE_INTERVAL)return false;
  if(life.age!==Math.max(0,life.nextCheck-PLANT_LIFE_INTERVAL-life.since))return false;
  if(life.bornAt!==undefined&&life.bornAt!==life.since)return false;
  return life.leaflessAt===undefined||(plant.kind==='berries'||plant.species!==undefined)&&integer(life.leaflessAt,life.since,world.tick)&&life.leaflessAt%PLANT_LIFE_INTERVAL===(plant.id!+1)%PLANT_LIFE_INTERVAL;
}
