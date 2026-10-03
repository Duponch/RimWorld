import { medicalCamp } from '../scenarios/health.ts';
import { adoptWeather } from '../../src/sim/weather.ts';
import { adoptRainElectrical } from '../../src/sim/rain-electric.ts';
import { BATTERY_ENERGY_SCALE } from '../../src/sim/power-battery.ts';
import { newPowerState } from '../../src/sim/power-rules.ts';
import type { Orientation,Structure,StructureKind,World } from '../../src/sim/types.ts';

/** Prepared precipitation, no electrical contact or fire already exists. The
 * optional size supports the 250² load scene; callers build real supply. */
export function rainElectricCamp(size=32,count=0):World {
  const world=medicalCamp(count,size);adoptWeather(world);
  Object.assign(world.weather!,{current:'rain',previous:'rain',ageCore:4000,durationCore:160000});
  adoptRainElectrical(world);return world;
}
/** Domain fixture with explicit actual activity; not a simulated power grid. */
export function rainElectricBuilding(world:World,kind:StructureKind,x=10,z=10,orientation:Orientation=0):Structure {
  const building:Structure={id:world.nextId++,kind,x,z,orientation,footprint:'standard',material:'steel',power:newPowerState(kind)};
  building.power!.on=true;
  if(kind==='battery')building.battery={stored:101*BATTERY_ENERGY_SCALE};
  world.structures.push(building);return building;
}
/** Unit domain clock only: weather is already sampled, no weather RNG draws. */
export function advanceRainClock(world:World):void {
  world.tick++;world.weather!.lastCoreTick=world.tick*10;
}
