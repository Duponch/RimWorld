import { isPlant, plantGrowth, plantTemperatureFactorFor } from './plants.ts';
import { FLORA_DEFINITIONS } from './biome-flora.ts';
import { isCropKindInVersion } from './crops.ts';
import { outdoorTemperature } from './temperature.ts';
import type { ThermalLayout } from './thermal-topology.ts';
import type { Resource, World } from './types.ts';

interface Group { plants:Resource[]; region:number; factor?:number }
interface Binding { source:Resource[]; layout:ThermalLayout; groups:Map<string,Group> }
const bindings=new WeakMap<World,Binding>();

/** Rates are shared by thermal region. Only a changed factor visits its plants;
 * the ordinary temperate forest keeps the O(1) light integral and no tick writes.
 * Resource producers replace arrays; checkpoints may mutate the same plants. */
export function updatePlantTemperatures(world:World,layout:ThermalLayout):void {
  let binding=bindings.get(world);
  if(!binding||binding.source!==world.resources||binding.layout!==layout) {
    const groups=new Map<string,Group>();
    for(const plant of world.resources)if(isPlant(plant)) {
      const region=Math.max(-1,layout.indices[plant.z*world.width+plant.x]!);
      const maximum=plant.species?FLORA_DEFINITIONS[plant.species].maxGrowthTemperature:58,key=`${region}:${maximum}`;
      let group=groups.get(key);if(!group){group={plants:[],region};groups.set(key,group);}group.plants.push(plant);
    }
    binding={source:world.resources,layout,groups};bindings.set(world,binding);
  }
  for(const group of binding.groups.values()) {
    const temperature=group.region<0?outdoorTemperature(world):world.thermal!.regions[group.region]!.temperature;
    const commonFactor=plantTemperatureFactorFor(group.plants[0]!,temperature);
    if(commonFactor===group.factor)continue;
    for(const plant of group.plants) {
      if((plant.growthThermalFactor??1)===commonFactor)continue;
      // Settle past light at its saved factor before adopting the next interval.
      plant.growth=plantGrowth(world,plant);plant.growthTick=world.tick;
      if(commonFactor===1)delete plant.growthThermalFactor;else plant.growthThermalFactor=commonFactor;
    }
    group.factor=commonFactor;
  }
}

export function validPlantThermalFactor(resource:{kind?:unknown;species?:unknown;growth?:unknown;growthTick?:unknown;growthThermalFactor?:unknown},version:number):boolean {
  const factor=resource.growthThermalFactor;
  return factor===undefined || version>=39&&(resource.kind==='berries'||version>=91&&resource.species!==undefined||isCropKindInVersion(resource.kind,version))
    &&typeof factor==='number'&&Number.isFinite(factor)&&factor>=0&&factor<=1
    &&typeof resource.growth==='number'&&Number.isFinite(resource.growth)&&resource.growth>=0&&resource.growth<=1
    &&typeof resource.growthTick==='number'&&Number.isSafeInteger(resource.growthTick)&&resource.growthTick>=0;
}
