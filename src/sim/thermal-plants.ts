import { isPlant, plantGrowth, plantTemperatureFactor } from './plants.ts';
import { outdoorTemperature } from './temperature.ts';
import type { ThermalLayout } from './thermal-topology.ts';
import type { Resource, World } from './types.ts';

interface Group { plants:Resource[]; factor?:number }
interface Binding { source:Resource[]; layout:ThermalLayout; groups:Map<number,Group> }
const bindings=new WeakMap<World,Binding>();

/** Rates are shared by thermal region. Only a changed factor visits its plants;
 * the ordinary temperate forest keeps the O(1) light integral and no tick writes.
 * Resource producers replace arrays; checkpoints may mutate the same plants. */
export function updatePlantTemperatures(world:World,layout:ThermalLayout):void {
  let binding=bindings.get(world);
  if(!binding||binding.source!==world.resources||binding.layout!==layout) {
    const groups=new Map<number,Group>();
    for(const plant of world.resources)if(isPlant(plant)) {
      const region=Math.max(-1,layout.indices[plant.z*world.width+plant.x]!);
      let group=groups.get(region);if(!group){group={plants:[]};groups.set(region,group);}group.plants.push(plant);
    }
    binding={source:world.resources,layout,groups};bindings.set(world,binding);
  }
  for(const [region,group] of binding.groups) {
    const factor=plantTemperatureFactor(region<0?outdoorTemperature(world):world.thermal!.regions[region]!.temperature);
    if(factor===group.factor)continue;
    for(const plant of group.plants)if((plant.growthThermalFactor??1)!==factor) {
      // Settle past light at its saved factor before adopting the next interval.
      plant.growth=plantGrowth(world,plant);plant.growthTick=world.tick;
      if(factor===1)delete plant.growthThermalFactor;else plant.growthThermalFactor=factor;
    }
    group.factor=factor;
  }
}

export function validPlantThermalFactor(resource:{kind?:unknown;growth?:unknown;growthTick?:unknown;growthThermalFactor?:unknown},version:number):boolean {
  const factor=resource.growthThermalFactor;
  return factor===undefined || version>=39&&(resource.kind==='rice'||resource.kind==='berries'||version>=71&&resource.kind==='cotton')
    &&typeof factor==='number'&&Number.isFinite(factor)&&factor>=0&&factor<=1
    &&typeof resource.growth==='number'&&Number.isFinite(resource.growth)&&resource.growth>=0&&resource.growth<=1
    &&typeof resource.growthTick==='number'&&Number.isSafeInteger(resource.growthTick)&&resource.growthTick>=0;
}
