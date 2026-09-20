import type { Resource,World } from './types.ts';
import type { ThermalLayout } from './thermal-topology.ts';
import { isPlant,PLANT_DEFINITIONS } from './plants.ts';
import { annualNaturalLight } from './environment.ts';
import { isRoofed } from './roof-rules.ts';
import { outdoorTemperature } from './temperature.ts';
import { damageResource } from './thing-damage.ts';

/** since starts observation. bornAt exists only when actual sowing is known. */
export interface PlantLife {
  since:number;
  bornAt?:number;
  age:number;
  darkTicks:number;
  leaflessAt?:number;
  nextCheck:number;
}

export const PLANT_LIFE_INTERVAL=200;
export function createPlantLife(world:Pick<World,'tick'>,plant:Pick<Resource,'id'>,born=false):PlantLife {
  return {since:world.tick,...(born?{bornAt:world.tick}:{}),age:0,darkTicks:0,
    nextCheck:world.tick+(plant.id-world.tick%PLANT_LIFE_INTERVAL+PLANT_LIFE_INTERVAL)%PLANT_LIFE_INTERVAL+1};
}

/** Stable individual threshold, not an event draw from a shared gameplay RNG. */
export function plantFrostThreshold(id:number):number {
  let hash=(id^0x31f3a5c1)>>>0;
  hash=Math.imul(hash^(hash>>>16),0x7feb352d);hash=Math.imul(hash^(hash>>>15),0x846ca68b);
  return -18+((hash^(hash>>>16))>>>0)/0x100000000*8;
}
export const plantLeafless=(world:Pick<World,'tick'>,plant:Resource):boolean=>
  plant.plantLife?.leaflessAt!==undefined&&world.tick-plant.plantLife.leaflessAt<6000;

/** The environmental caller supplies whether this cell uses outdoor air.
 * Exposed frost and an equally cold enclosed greenhouse are distinct rules. */
export function applyPlantFrost(world:World,plant:Resource,usesOutside:boolean,temperature:number):boolean {
  const life=plant.plantLife;if(!life||!isPlant(plant))return false;
  if(usesOutside&&temperature<plantFrostThreshold(plant.id)) {
    if(plant.kind!=='berries')return damageResource(world,plant,100000,'frost');
    life.leaflessAt=world.tick;
  } else if(life.leaflessAt!==undefined&&world.tick-life.leaflessAt>=6000)delete life.leaflessAt;
  return false;
}

interface LifeIndex {source:Resource[];buckets:Resource[][]}
const indices=new WeakMap<World,LifeIndex>();

/** One stable phase per plant. No map scan or persistent topology capture per
 * query; root supplies the currently reconciled thermal layout once per tick. */
export function advancePlantLife(world:World,layout:ThermalLayout):void {
  if(!world.climate)return;
  let index=indices.get(world);
  if(!index||index.source!==world.resources) {
    const buckets=Array.from({length:PLANT_LIFE_INTERVAL},()=>[] as Resource[]);
    for(const p of world.resources)if(isPlant(p)&&p.plantLife)buckets[p.plantLife.nextCheck%PLANT_LIFE_INTERVAL]!.push(p);
    index={source:world.resources,buckets};indices.set(world,index);
  }
  const due=index.buckets[world.tick%PLANT_LIFE_INTERVAL]!;
  if(!due.length)return;
  const outside=outdoorTemperature(world),light=annualNaturalLight(world);
  for(const plant of due) {
    const life=plant.plantLife!;
    if(life.nextCheck!==world.tick||!isPlant(plant))continue;
    const elapsed=world.tick-Math.max(life.since,life.nextCheck-PLANT_LIFE_INTERVAL);
    life.nextCheck+=PLANT_LIFE_INTERVAL;life.age+=elapsed;
    const cell=plant.z*world.width+plant.x,outdoors=layout.indices[cell]!<0;
    if(applyPlantFrost(world,plant,outdoors,outside))continue;
    const canSeeSun=!isRoofed(world,cell)&&Math.max(0,(light-.51)/.49)>.001;
    life.darkTicks=canSeeSun?0:life.darkTicks+elapsed;
    const aged=life.age>PLANT_DEFINITIONS[plant.kind].growDays*8*6000;
    if(aged||life.darkTicks>45000)damageResource(world,plant,10,aged?'age':'darkness');
  }
}
