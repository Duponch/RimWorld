import { adoptSiteClimate,siteClimateDefinition } from './site-climate.ts';
import { adoptWeather,advanceWeather,weatherRainRate } from './weather.ts';
import { adoptWind,advanceWind } from './wind.ts';
import { advanceTemperature,outdoorTemperature,reconcileTemperature } from './temperature.ts';
import { updatePlantTemperatures } from './thermal-plants.ts';
import { reconcilePlantLighting } from './plant-lighting.ts';
import { LightEnvironmentCache,type LightReader } from './light-environment.ts';
import { advancePlantLife } from './plant-life.ts';
import { advanceFires,fireDanger,igniteLightning } from './fire.ts';
import { ensureFireState } from './fire-rules.ts';
import { advanceFlashstorm } from './flashstorm.ts';
import type { ThermalLayout } from './thermal-topology.ts';
import type { Cell,World } from './types.ts';
import { advanceWildFlora } from './wild-flora.ts';

/** One explicit adoption, without replaying weather or exposure in old saves. */
export function adoptEnvironment(world:World):boolean {
  if(!adoptSiteClimate(world))return false;
  adoptWeather(world);adoptWind(world);ensureFireState(world);
  return true;
}

/** Weather events mutate the physical world before actors make decisions.
 * Keep the layout current after a fire removes an enclosing structure. */
export function advanceSurfaceWeather(world:World,chop:(cell:Cell)=>void):void {
  if(world.weather)advanceWeather(world,{outsideTemperature:outdoorTemperature(world),rainfall:siteClimateDefinition(world).rainfall,
    fireDanger:()=>fireDanger(world),lightning:(cell,coreTick)=>{igniteLightning(world,cell,coreTick);}});
  advanceFlashstorm(world,(cell,coreTick)=>{
    world.weather!.lightningCount++;world.weather!.lastLightning={...cell,coreTick};
    igniteLightning(world,cell,coreTick);
  });
  if(world.wind)advanceWind(world,chop);
}
const lightCaches=new WeakMap<World,LightEnvironmentCache>();
export function advanceSurfaceTemperature(world:World,layout:ThermalLayout,providedLight?:LightReader):ThermalLayout {
  const light=providedLight??(()=>{let cache=lightCaches.get(world);if(!cache){cache=new LightEnvironmentCache();lightCaches.set(world,cache);}return cache.read(world);});
  advanceTemperature(world,layout);
  const before=world.structures;
  if(world.fires)advanceFires(world,{rainRate:weatherRainRate(world)},layout);
  if(before!==world.structures)layout=reconcileTemperature(world);
  reconcilePlantLighting(world,light);
  updatePlantTemperatures(world,layout);
  if(world.climate)advancePlantLife(world,layout,light);
  advanceWildFlora(world);
  return layout;
}
