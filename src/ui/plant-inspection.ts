import { calendarTick } from '../sim/calendar';
import { naturalLight } from '../sim/environment';
import { harvestProductLabel, plantGrowth, harvestable, berryYield, plantResting, plantTemperatureFactor, sowingTemperatureAllowed, isPlant, plantFertility, PLANT_DEFINITIONS } from '../sim/plants';
import { isRoofed, roofIndex } from '../sim/roof-rules';
import { TemperatureView } from '../sim/temperature';
import type { Cell, Resource, World } from '../sim/types';

export function plantInspection(world:World,plant:Resource):string {
  const temperature=new TemperatureView(world).at(world,plant),factor=plantTemperatureFactor(temperature);
  const constraints:string[]=[];let soil='';
  if(plantResting(calendarTick(world)))constraints.push('Repos nocturne');
  if(isRoofed(world,roofIndex(world,plant))||naturalLight(calendarTick(world))<=.51)constraints.push('Lumière insuffisante');
  if(factor<1)constraints.push(`Température ${temperature.toFixed(1)} °C · Croissance thermique ${Math.round(factor*100)} %`);
  if(isPlant(plant)) {
    const def=PLANT_DEFINITIONS[plant.kind],fertility=plantFertility(world,plant);
    const growthFactor=fertility<def.minFertility?0:1-def.sensitivity+fertility*def.sensitivity;
    soil=` · Fertilité ${Math.round(fertility*100)} % · Effet sur cette plante ${Math.round(growthFactor*100)} %`;
  }
  return ` · Croissance ${Math.floor(plantGrowth(world,plant)*100)} % · ${harvestable(world,plant)?`Récolte : environ ${Math.round(berryYield(world,plant))} ${harvestProductLabel(plant)}`:'Pas encore récoltable'} · ${constraints.length?constraints.join(' · '):'Croissance diurne'}${soil}`;
}

export function growingTemperatureInspection(world:World,cell:Cell):string {
  return sowingTemperatureAllowed(new TemperatureView(world).at(world,cell))?'':' · Nouveaux semis suspendus : température hors plage (0–58 °C exclus)';
}
