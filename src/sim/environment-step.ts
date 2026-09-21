import { adoptSiteClimate,siteClimateDefinition } from './site-climate.ts';
import { adoptWeather,advanceWeather,weatherRainRate } from './weather.ts';
import { adoptWind,advanceWind } from './wind.ts';
import { advanceTemperature,outdoorTemperature,reconcileTemperature } from './temperature.ts';
import { updatePlantTemperatures } from './thermal-plants.ts';
import { advancePlantLife } from './plant-life.ts';
import { advanceFires,fireDanger,igniteLightning } from './fire.ts';
import { ensureFireState } from './fire-rules.ts';
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
  if(world.wind)advanceWind(world,chop);
}
export function advanceSurfaceTemperature(world:World,layout:ThermalLayout):ThermalLayout {
  advanceTemperature(world,layout);
  const before=world.structures;
  if(world.fires)advanceFires(world,{rainRate:weatherRainRate(world)},layout);
  if(before!==world.structures)layout=reconcileTemperature(world);
  updatePlantTemperatures(world,layout);
  if(world.climate)advancePlantLife(world,layout);
  advanceWildFlora(world);
  return layout;
}
