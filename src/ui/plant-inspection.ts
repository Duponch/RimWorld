import { naturalLight } from '../sim/environment';
import { harvestProductLabel, plantGrowth, harvestable, berryYield, plantResting, plantTemperatureFactor, sowingTemperatureAllowed } from '../sim/plants';
import { isRoofed, roofIndex } from '../sim/roof-rules';
import { TemperatureView } from '../sim/temperature';
import type { Cell, Resource, World } from '../sim/types';

export function plantInspection(world:World,plant:Resource):string {
  const temperature=new TemperatureView(world).at(world,plant),factor=plantTemperatureFactor(temperature);
  const constraints:string[]=[];
  if(plantResting(world.tick))constraints.push('Repos nocturne');
  if(isRoofed(world,roofIndex(world,plant))||naturalLight(world.tick)<=.51)constraints.push('Lumière insuffisante');
  if(factor<1)constraints.push(`Température ${temperature.toFixed(1)} °C · Croissance thermique ${Math.round(factor*100)} %`);
  return ` · Croissance ${Math.floor(plantGrowth(world,plant)*100)} % · ${harvestable(world,plant)?`Récolte : environ ${Math.round(berryYield(world,plant))} ${harvestProductLabel(plant)}`:'Pas encore récoltable'} · ${constraints.length?constraints.join(' · '):'Croissance diurne'}`;
}

export function growingTemperatureInspection(world:World,cell:Cell):string {
  return sowingTemperatureAllowed(new TemperatureView(world).at(world,cell))?'':' · Nouveaux semis suspendus : température hors plage (0–58 °C exclus)';
}
