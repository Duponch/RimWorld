import {plantCompletelyIgnoresFertility256} from '../sim/plant-substrate-256';
import {isCavePlant256} from '../sim/cave-flora-256';
import {effectivePlantAgeCore256} from '../sim/initial-plant-age-256';
import { floraDefinition } from '../sim/biome-flora';
import { plantLeafless } from '../sim/plant-life';
import { resourceMaxHp } from '../sim/thing-damage-rules';
import { calendarTick } from '../sim/calendar';
import { annualNaturalLight } from '../sim/environment';
import { isRoofed,roofIndex } from '../sim/roof-rules';
import { LightEnvironmentCache } from '../sim/light-environment';
const lightCaches=new WeakMap<World,LightEnvironmentCache>();
function plantLight(world:World,plant:Resource):number {
  if(!world.structures.some(s=>s.kind==='sun-lamp'))return isRoofed(world,roofIndex(world,plant))?0:annualNaturalLight(world);
  let cache=lightCaches.get(world);if(!cache){cache=new LightEnvironmentCache();lightCaches.set(world,cache);}return cache.read(world).lightAt(plant);
}
import { harvestProductLabel, plantGrowth, harvestable, berryYield, plantResting, plantTemperatureFactorFor,choppable, sowingTemperatureAllowed, isPlant, plantFertility, PLANT_DEFINITIONS } from '../sim/plants';
import { temperatureAt } from '../sim/temperature';
import type { Cell, Resource, World } from '../sim/types';
import { hydroponicBasinAt } from '../sim/hydroponics';
import { isPowerActive } from '../sim/power-rules';

export function plantInspection(world:World,plant:Resource):string {
  const temperature=temperatureAt(world,plant),factor=plantTemperatureFactorFor(plant,temperature);
  const constraints:string[]=[];let soil='';
  if(plant.blight)constraints.push(`Fléau des cultures · gravité ${Math.round(plant.blight.severity*100)} % · croissance arrêtée · contagieux à partir de 28 % · couper sans récolte pour contenir la propagation`);
  const basin=hydroponicBasinAt(world,plant);
  if(basin)constraints.push(isPowerActive(basin)?'Culture hydroponique · pompe alimentée':'Culture hydroponique · sans alimentation : dépérissement progressif, nouveaux semis suspendus');
  if(plantLeafless(world,plant))constraints.push(plant.kind==='healroot'?'Sans feuilles · broutage suspendu · récolte possible si croissance suffisante':'Sans feuilles · broutage suspendu');
  if(plant.damage)constraints.push(`État ${resourceMaxHp(plant)-plant.damage}/${resourceMaxHp(plant)}`);
  if(plantResting(calendarTick(world)))constraints.push('Repos nocturne');
  const cave=isCavePlant256(plant.species,world.schemaVersion);
  if(cave){let cache=lightCaches.get(world);if(!cache){cache=new LightEnvironmentCache();lightCaches.set(world,cache);}const exposure=cache.read(world).lightAtIgnoringCavePlants(plant);constraints.push(exposure>0?'Plante de grotte · dépérit au soleil ou à la lumière artificielle':'Plante de grotte · pousse dans l’obscurité');}
  if(plant.plantLife?.initialAgeCore!==undefined)constraints.push(`Âge : ${(effectivePlantAgeCore256(plant.plantLife)/60000).toFixed(1)} jours`);
  const light=plantLight(world,plant);if(!cave&&light<=.51)constraints.push('Lumière insuffisante');else if(plant.growthLight==='artificial-full')constraints.push('Lumière horticole 100 %');
  if(factor<1)constraints.push(`Température ${temperature.toFixed(1)} °C · Croissance thermique ${Math.round(factor*100)} %`);
  if(isPlant(plant)) {
    const def=floraDefinition(plant)??PLANT_DEFINITIONS[plant.kind as keyof typeof PLANT_DEFINITIONS],fertility=plantFertility(world,plant);
    const growthFactor=plantCompletelyIgnoresFertility256(plant.species,world.schemaVersion)?1:fertility<def.minFertility?0:1-def.sensitivity+fertility*def.sensitivity;
    soil=` · Fertilité ${Math.round(fertility*100)} % · Effet sur cette plante ${Math.round(growthFactor*100)} %`;
  }
  const medicine=plant.kind==='healroot'?' · Racine médicinale cultivée · Plantes 8 pour commencer le semis seulement, sans minimum à la récolte · Travail de base : semis 80 ticks, récolte 40 ticks · Produit : médicament à base de plantes · Coupe sans dose':'';
  return ` · Croissance ${Math.floor(plantGrowth(world,plant)*100)} % · ${plant.blight?'Récolte impossible':harvestable(world,plant)?`Récolte : environ ${Math.round(berryYield(world,plant))} ${harvestProductLabel(plant)}`:plant.kind==='tree'?(choppable(world,plant)?'Bois disponible par coupe':'Arbre trop jeune pour la coupe'):plant.species&&!floraDefinition(plant)?.product?'Végétation de pâturage':'Pas encore récoltable'} · ${constraints.length?constraints.join(' · '):'Croissance diurne'}${soil}${medicine}`;
}

export function growingTemperatureInspection(world:World,cell:Cell):string {
  return sowingTemperatureAllowed(temperatureAt(world,cell))?'':' · Nouveaux semis suspendus : température hors plage (0–58 °C exclus)';
}
